// Export / import d'un fichier complet de données (ex. migration de la régie locale vers un serveur en ligne).
// Le fichier contient tous les replicants de données + les fichiers envoyés dans Assets (logos, photos) en base64.
// Routes (réservées aux personnes connectées si le mot de passe est activé) :
//   GET  /valorant-tournament/data-export[?files=0]  → téléchargement JSON (?files=0 : sans les logos/photos)
//   POST /valorant-tournament/data-import            → { ok, replicants, files, ignored, backup } | { ok:false, error }
// L'import vérifie TOUT le fichier avant d'écrire, sauvegarde l'état actuel, puis masque tous les overlays.
const fs = require('fs');
const path = require('path');
const express = require('express');
const { ROOT, ASSETS } = require('./lib/paths');
const { requireLogin, sameOrigin } = require('./lib/http');
const { NAMES } = require('./lib/backup');

const FORMAT = 'kb-series-export';
// Au-delà, l'export (en base64, +33 %) dépasserait la limite d'import (200 Mo)
const MAX_ASSETS = 150 * 1024 * 1024;
// Catégories d'assets du bundle et extensions autorisées (package.json → nodecg.assetCategories)
const CATEGORIES = Object.fromEntries(require(path.join(ROOT, 'package.json')).nodecg.assetCategories
	.map((c) => [c.name, c.allowedTypes.map((t) => t.toLowerCase())]));

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const mo = (n) => `${Math.round(n / 1024 / 1024)} Mo`;

// Tous les fichiers sous `dir` (chemins absolus)
async function walk(dir) {
	let entries;
	try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return []; }
	const out = [];
	for (const e of entries) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) out.push(...await walk(p));
		else if (e.isFile()) out.push(p);
	}
	return out;
}

// Chemin relatif d'un asset (« catégorie/fichier ») → chemin absolu sûr.
// null = fichier à ignorer (hors catégorie, type non autorisé, sous-dossier, fichier caché, desktop.ini…) :
// un fichier parasite déposé par Windows ne doit pas faire échouer tout un export ou un import.
function assetPath(rel) {
	const parts = String(rel).split(/[\\/]/);
	if (parts.length !== 2 || !parts[1] || parts[1].startsWith('.')) return null;
	const [category, name] = parts;
	if (!CATEGORIES[category]) return null;
	const ext = path.extname(name).slice(1).toLowerCase();
	if (!CATEGORIES[category].includes(ext)) return null;
	const dest = path.resolve(ASSETS, category, name);
	if (!dest.startsWith(ASSETS + path.sep)) throw new Error(`Fichier refusé : ${rel}`);
	return dest;
}

// Lit et vérifie tout le fichier importé ; rien n'est écrit ici
function parseImport(text) {
	let data;
	try { data = JSON.parse(text); } catch { throw new Error('Fichier illisible (JSON invalide)'); }
	if (!isPlainObject(data) || data.format !== FORMAT) throw new Error('Fichier non reconnu (export KB SERIES attendu)');
	if (data.replicants != null && !isPlainObject(data.replicants)) throw new Error('Fichier abîmé : "replicants" invalide');
	if (data.files != null && !isPlainObject(data.files)) throw new Error('Fichier abîmé : "files" invalide');

	const replicants = {};
	for (const [n, v] of Object.entries(data.replicants || {})) {
		if (!NAMES.includes(n)) throw new Error(`Donnée inconnue dans le fichier : ${n}`);
		if (v == null) continue;
		if (typeof v !== 'object') throw new Error(`Donnée invalide dans le fichier : ${n}`);
		replicants[n] = v;
	}
	const files = [];
	let ignored = 0;
	for (const [rel, b64] of Object.entries(data.files || {})) {
		const dest = assetPath(rel);
		if (!dest) { ignored++; continue; }
		if (typeof b64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new Error(`Fichier abîmé : ${rel}`);
		files.push({ dest, buf: Buffer.from(b64, 'base64') });
	}
	return { replicants, files, ignored };
}

module.exports = function (nodecg, listen, backup) {
	const router = express.Router();
	const auth = requireLogin(nodecg);

	router.get('/valorant-tournament/data-export', auth, async (req, res) => {
		try {
			const withFiles = req.query.files !== '0';
			const files = {};
			if (withFiles) {
				// Seulement les fichiers que l'import acceptera (logos, photos)
				const paths = (await walk(ASSETS)).filter((p) => assetPath(path.relative(ASSETS, p)));
				const sizes = await Promise.all(paths.map((p) => fs.promises.stat(p).then((s) => s.size)));
				const total = sizes.reduce((a, b) => a + b, 0);
				if (total > MAX_ASSETS) {
					return res.status(413).json({ ok: false, error: `Logos et photos trop lourds pour un export (${mo(total)}, limite ${mo(MAX_ASSETS)}). Utilise « Exporter sans les logos / photos » et copie le dossier assets/ à la main.` });
				}
				for (const p of paths) files[path.relative(ASSETS, p).replace(/\\/g, '/')] = (await fs.promises.readFile(p)).toString('base64');
			}
			const replicants = backup.values();
			const suffix = withFiles ? '' : '-sans-fichiers';
			res.set('Content-Disposition', `attachment; filename="kb-series-donnees-${new Date().toISOString().slice(0, 10)}${suffix}.json"`);
			res.json({ format: FORMAT, version: 1, at: Date.now(), replicants, files });
		} catch (e) {
			nodecg.log.error('Export de données impossible :', e.stack || e.message);
			if (!res.headersSent) res.status(500).json({ ok: false, error: 'Export impossible : ' + e.message });
		}
	});

	router.post('/valorant-tournament/data-import', auth, sameOrigin, express.text({ type: '*/*', limit: '200mb' }), (req, res) => {
		let parsed;
		try {
			parsed = parseImport(req.body);
		} catch (e) {
			return res.status(400).json({ ok: false, error: e.message });
		}
		try {
			const saved = backup.snapshot('avant-import');
			for (const { dest, buf } of parsed.files) {
				fs.mkdirSync(path.dirname(dest), { recursive: true });
				fs.writeFileSync(dest, buf);
			}
			const nRep = backup.apply(parsed.replicants);
			nodecg.log.info(`Import de données : ${nRep} replicants, ${parsed.files.length} fichiers, ${parsed.ignored} ignorés (état précédent : ${saved})`);
			res.json({ ok: true, replicants: nRep, files: parsed.files.length, ignored: parsed.ignored, backup: backup.relative(saved) });
		} catch (e) {
			nodecg.log.error('Import de données interrompu :', e.stack || e.message);
			res.status(500).json({ ok: false, error: 'Import interrompu : ' + e.message });
		}
	});

	nodecg.mount(router);
};
