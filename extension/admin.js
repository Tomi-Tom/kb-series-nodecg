// Remise à zéro des données ("Tout effacer" dans le panneau Régie).
// Une sauvegarde JSON de tous les replicants concernés est écrite dans db/backups/ AVANT d'effacer.
// Message : nodecg.sendMessage('data:clearAll', { teams, players, match, schedule, bracket, overlays, texts })
//   -> ack(null, { backup: 'chemin du fichier' })
// Restauration : nodecg.sendMessage('data:restore', { file }) avec un fichier de db/backups/.
const fs = require('fs');
const path = require('path');

const GROUPS = {
	teams: ['teams'],
	players: ['playerData', 'playerProfiles'],
	match: ['match', 'veto', 'matchVeto'],
	schedule: ['schedule', 'countdown'],
	bracket: ['bracket'],
	texts: ['scenesTexts', 'scenesRotation', 'tournament', 'casters', 'liveTicker'],
	overlays: ['liveLowerThird', 'matchGraphics', 'mapsGraphics', 'playerStatsGraphic', 'playerDuel', 'bracketGraphics', 'streamScene', 'liveDualCam'],
};

module.exports = function (nodecg) {
	const dir = path.join(process.cwd(), 'db', 'backups');
	const rep = (name) => nodecg.Replicant(name);
	const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

	// Valeurs "vides" : on repart des valeurs par défaut définies par chaque partie
	const empty = {
		teams: () => ({}),
		playerData: () => ({}),
		playerProfiles: () => ({}),
		match: () => ({ stage: 'Phase de groupes', format: 'bo3', teamA: null, teamB: null, swap: false, currentMap: 0, maps: [] }),
		veto: () => ({ pool: require('./state').DEFAULT_POOL, steps: [] }),
		matchVeto: () => clone(require('../shared/match.js').MATCH_DEFAULTS.matchVeto),
		schedule: () => [],
		countdown: () => ({ endsAt: null, label: (rep('countdown').value || {}).label || 'Le stream commence dans' }),
		bracket: () => require('../shared/bracket.js').defaultBracket(),
		scenesTexts: () => clone(require('../shared/scenes.js').DEFAULT_TEXTS),
		scenesRotation: () => clone(require('../shared/scenes.js').DEFAULT_ROTATION),
		casters: () => [],
	};

	// Masquer un overlay = mettre tous les "visible" à false (garde le reste des réglages)
	const hideAll = (v) => {
		if (Array.isArray(v)) return v.map(hideAll);
		if (v && typeof v === 'object') {
			const o = {};
			for (const [k, x] of Object.entries(v)) o[k] = k === 'visible' ? false : hideAll(x);
			return o;
		}
		return v;
	};

	nodecg.listenFor('data:clearAll', (opts = {}, ack) => {
		try {
			const names = [...new Set(Object.keys(GROUPS).filter((g) => opts[g]).flatMap((g) => GROUPS[g]))];
			if (!names.length) throw new Error('Rien de sélectionné');

			// 1. Sauvegarde complète
			fs.mkdirSync(dir, { recursive: true });
			const snapshot = {};
			for (const g of Object.values(GROUPS)) for (const n of g) snapshot[n] = clone(rep(n).value);
			const file = path.join(dir, `avant-effacement-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
			fs.writeFileSync(file, JSON.stringify(snapshot, null, 1));

			// 2. Effacement
			for (const n of names) {
				if (GROUPS.overlays.includes(n)) {
					if (n === 'streamScene') rep(n).value = { scene: 'none', via: 'cut', at: Date.now() };
					else if (n === 'playerStatsGraphic') rep(n).value = { playerId: null, visible: false, agentId: null };
					else if (n === 'playerDuel') rep(n).value = { left: null, right: null, visible: false };
					else if (n === 'mapsGraphics') rep(n).value = { intro: { visible: false, index: null }, series: { visible: false }, result: { visible: false, index: null, mvp: null, mvpTeam: null } };
					else if (n === 'liveLowerThird' && opts.texts) {
						const slot = () => ({ visible: false, style: 'standard', kicker: '', title: '', subtitle: '', source: 'custom', casterIndex: 0, duration: 0 });
						rep(n).value = { left: slot(), right: slot() };
					} else if (n === 'liveDualCam' && opts.texts) {
						const lbl = () => ({ mode: 'none', text: '', sub: '', team: 'A', riotId: '' });
						rep(n).value = { ...(rep(n).value || {}), left: lbl(), right: lbl(), infoText: '' };
					} else if (rep(n).value) rep(n).value = hideAll(clone(rep(n).value));
				} else if (n === 'liveTicker') {
					rep(n).value = { ...(rep(n).value || {}), visible: false, messages: [] };
				} else if (n === 'tournament') {
					// garde l'identité du tournoi (nom, dates…) : rien à effacer de dangereux
				} else if (empty[n]) {
					rep(n).value = empty[n]();
				}
			}
			nodecg.log.info(`Données effacées (${names.join(', ')}) — sauvegarde : ${file}`);
			if (ack && !ack.handled) ack(null, { backup: path.relative(process.cwd(), file) });
		} catch (e) {
			if (ack && !ack.handled) ack(e.message);
		}
	});

	// Données de TEST (match, scores, veto, agents joués, planning, bracket, compte à rebours).
	// Ne crée AUCUN joueur : garde les vraies équipes/joueurs, ajoute seulement des équipes adverses vides si besoin.
	nodecg.listenFor('data:testData', (_, ack) => {
		try {
			fs.mkdirSync(dir, { recursive: true });
			const snapshot = {};
			for (const g of Object.values(GROUPS)) for (const n of g) snapshot[n] = clone(rep(n).value);
			const file = path.join(dir, `avant-donnees-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
			fs.writeFileSync(file, JSON.stringify(snapshot, null, 1));

			// Équipes : les 2 premières équipes existantes servent d'équipe A / B ; on complète avec des équipes vides
			const teams = clone(rep('teams').value) || {};
			const filler = [['Nova Rift', 'NVR', '#9b5cff'], ['Cycom Raiders', 'CYR', '#ff9a3c'], ['Bicêtre Blaze', 'BB', '#ff4655'],
				['Pasteur Phantoms', 'PPH', '#3ddc97'], ['Orbit Five', 'OR5', '#5ec4ff'], ['Starfall', 'SF', '#c9b274'],
				['Kremlin Kings', 'KK', '#f5c445'], ['Epitech Eclipse', 'EPX', '#3b8fe6']];
			for (const [name, tag, color] of filler) {
				if (Object.keys(teams).length >= 8) break;
				const id = tag.toLowerCase();
				if (!teams[id] && !Object.values(teams).some((t) => t.name === name)) teams[id] = { id, name, tag, color, logo: '', players: [] };
			}
			const ids = Object.keys(teams);
			const [A, B, t3, t4, t5, t6, t7, t8] = ids;
			rep('teams').value = teams;

			// Agents joués : agent favori tracker de chaque vrai joueur (sinon un agent par rôle)
			const profiles = rep('playerProfiles').value || {};
			const byRole = { duelist: 'Jett', initiator: 'Sova', controller: 'Omen', sentinel: 'Killjoy' };
			const pickFor = (p, shift) => {
				const prof = profiles[String(p.riotId).toLowerCase()];
				const ag = prof && prof.agents && prof.agents[shift % Math.max(1, prof.agents.length)];
				return (ag && ag.name) || byRole[String(p.role || '').toLowerCase()] || 'Sova';
			};
			const picks = (shift) => {
				const o = {};
				for (const id of [A, B]) for (const p of (teams[id] && teams[id].players) || []) if (p.riotId) o[String(p.riotId).toLowerCase()] = pickFor(p, shift);
				return o;
			};

			rep('match').value = {
				stage: 'Demi-finale', format: 'bo3', teamA: A || null, teamB: B || null, swap: false, currentMap: 1,
				maps: [
					{ map: 'Split', pickedBy: 'A', scoreA: 13, scoreB: 9, winner: 'A', status: 'done', picks: picks(0) },
					{ map: 'Ascent', pickedBy: 'B', scoreA: 7, scoreB: 5, winner: null, status: 'live', picks: picks(1) },
					{ map: 'Lotus', pickedBy: 'decider', scoreA: 0, scoreB: 0, winner: null, status: 'upcoming', picks: {} },
				],
			};
			rep('veto').value = {
				pool: ['Abyss', 'Ascent', 'Bind', 'Corrode', 'Lotus', 'Split', 'Sunset'],
				steps: [
					{ action: 'ban', team: 'A', map: 'Bind', side: null, sideTeam: null },
					{ action: 'ban', team: 'B', map: 'Abyss', side: null, sideTeam: null },
					{ action: 'pick', team: 'A', map: 'Split', sideTeam: 'B', side: 'defense' },
					{ action: 'pick', team: 'B', map: 'Ascent', sideTeam: 'A', side: 'attack' },
					{ action: 'ban', team: 'A', map: 'Sunset', side: null, sideTeam: null },
					{ action: 'ban', team: 'B', map: 'Corrode', side: null, sideTeam: null },
					{ action: 'decider', team: null, map: 'Lotus', sideTeam: 'A', side: 'defense' },
				],
			};

			rep('schedule').value = [
				{ time: '10:00', label: 'Quart de finale 1', teamA: A, teamB: t6, status: 'done', scoreA: 2, scoreB: 0 },
				{ time: '10:00', label: 'Quart de finale 2', teamA: t3, teamB: t8, status: 'done', scoreA: 2, scoreB: 1 },
				{ time: '11:30', label: 'Quart de finale 3', teamA: B, teamB: t7, status: 'done', scoreA: 2, scoreB: 1 },
				{ time: '11:30', label: 'Quart de finale 4', teamA: t4, teamB: t5, status: 'done', scoreA: 1, scoreB: 2 },
				{ time: '14:00', label: 'Demi-finale 1', teamA: A, teamB: B, status: 'live', scoreA: 1, scoreB: 0 },
				{ time: '15:30', label: 'Demi-finale 2', teamA: t3, teamB: t5, status: 'upcoming' },
				{ time: '17:00', label: 'Petite finale', teamA: null, teamB: null, status: 'upcoming' },
				{ time: '18:30', label: 'Grande finale', teamA: null, teamB: null, status: 'upcoming' },
			];
			rep('countdown').value = { endsAt: Date.now() + 10 * 60 * 1000, label: (rep('countdown').value || {}).label || 'Le stream commence dans' };

			// Bracket cohérent avec le planning
			const KBB = require('../shared/bracket.js');
			const row = (id, w, l, rw, rl) => ({ id, w, l, rw, rl });
			const m = KBB.emptyMatch;
			const bk = KBB.defaultBracket();
			bk.qualify = 4;
			bk.groups = [
				{ name: 'Groupe A', teams: [row(A, 3, 0, 39, 21), row(t4, 2, 1, 34, 30), row(t7, 1, 2, 29, 35), row(t8, 0, 3, 22, 38)].filter((t) => t.id) },
				{ name: 'Groupe B', teams: [row(t3, 3, 0, 39, 25), row(B, 2, 1, 36, 28), row(t5, 1, 2, 30, 33), row(t6, 0, 3, 20, 39)].filter((t) => t.id) },
			];
			bk.playoffs = {
				quarters: [
					m({ a: A, b: t6, scoreA: 2, scoreB: 0, winner: 'a', status: 'done', time: '10:00' }),
					m({ a: B, b: t7, scoreA: 2, scoreB: 1, winner: 'a', status: 'done', time: '11:30' }),
					m({ a: t3, b: t8, scoreA: 2, scoreB: 1, winner: 'a', status: 'done', time: '10:00' }),
					m({ a: t4, b: t5, scoreA: 1, scoreB: 2, winner: 'b', status: 'done', time: '11:30' }),
				],
				semis: [m({ scoreA: 1, scoreB: 0, status: 'live', time: '14:00' }), m({ time: '15:30' })],
				third: m({ time: '17:00' }),
				final: m({ time: '18:30' }),
			};
			KBB.propagate(bk);
			rep('bracket').value = bk;

			nodecg.log.info(`Données de test chargées — sauvegarde : ${file}`);
			if (ack && !ack.handled) ack(null, { backup: path.relative(process.cwd(), file) });
		} catch (e) {
			if (ack && !ack.handled) ack(e.message);
		}
	});

	// Version du code des overlays : change quand un fichier de graphics/ ou shared/ est modifié.
	// Les pages ouvertes (OBS, stream.html) se rechargent alors toutes seules (voir shared/kb.js).
	const build = nodecg.Replicant('kbBuild', { defaultValue: 0, persistent: false });
	build.value = Date.now();
	let buildT = null;
	for (const sub of ['graphics', 'shared']) {
		try {
			fs.watch(path.join(process.cwd(), sub), { recursive: true }, (ev, name) => {
				if (name && /\.(html|js|css)$/i.test(name)) {
					clearTimeout(buildT);
					buildT = setTimeout(() => { build.value = Date.now(); }, 800);
				}
			});
		} catch (e) { nodecg.log.warn(`Surveillance de ${sub}/ impossible :`, e.message); }
	}

	// ---------- Export / import d'un fichier complet (migration local → serveur en ligne) ----------
	// Contient tous les replicants + les fichiers envoyés dans Assets (logos, photos) encodés en base64.
	const express = require('express');
	const router = express.Router();
	const assetsDir = path.join(process.cwd(), 'assets', 'valorant-tournament');
	const EXTRA = ['playerData', 'playerProfiles', 'mapsTransitionSettings', 'liveLowerThirdPresets', 'matchVeto', 'scenesRotation', 'scenesTexts', 'tournament', 'casters', 'liveTicker', 'liveDualCam', 'bracketGraphics', 'mapsGraphics', 'matchGraphics'];
	const allNames = () => [...new Set([...Object.values(GROUPS).flat(), ...EXTRA])];
	const needLogin = (req, res) => {
		const on = nodecg.config && nodecg.config.login && nodecg.config.login.enabled;
		if (on && !req.user) { res.status(401).json({ ok: false, error: 'Connexion requise' }); return true; }
		return false;
	};
	const walk = (dir) => {
		let out = [];
		try {
			for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
				const p = path.join(dir, e.name);
				if (e.isDirectory()) out = out.concat(walk(p));
				else out.push(p);
			}
		} catch { /* pas d'assets */ }
		return out;
	};
	router.get('/valorant-tournament/data-export', (req, res) => {
		if (needLogin(req, res)) return;
		const replicants = {};
		for (const n of allNames()) replicants[n] = clone(rep(n).value);
		const files = {};
		for (const p of walk(assetsDir)) files[path.relative(assetsDir, p).replace(/\\/g, '/')] = fs.readFileSync(p).toString('base64');
		res.set('Content-Disposition', `attachment; filename="kb-series-donnees-${new Date().toISOString().slice(0, 10)}.json"`);
		res.json({ format: 'kb-series-export', version: 1, at: Date.now(), replicants, files });
	});
	router.post('/valorant-tournament/data-import', express.text({ type: '*/*', limit: '200mb' }), (req, res) => {
		if (needLogin(req, res)) return;
		try {
			const data = JSON.parse(req.body);
			if (!data || data.format !== 'kb-series-export') throw new Error('Fichier non reconnu (export KB SERIES attendu)');
			// Sauvegarde de l'état actuel avant d'écraser
			fs.mkdirSync(dir, { recursive: true });
			const snapshot = {};
			for (const n of allNames()) snapshot[n] = clone(rep(n).value);
			fs.writeFileSync(path.join(dir, `avant-import-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(snapshot, null, 1));
			let nFiles = 0;
			for (const [rel, b64] of Object.entries(data.files || {})) {
				const dest = path.join(assetsDir, rel);
				if (!dest.startsWith(assetsDir)) continue; // sécurité : pas de sortie du dossier
				fs.mkdirSync(path.dirname(dest), { recursive: true });
				fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
				nFiles++;
			}
			let nRep = 0;
			for (const [n, v] of Object.entries(data.replicants || {})) if (v !== undefined && v !== null) { rep(n).value = v; nRep++; }
			nodecg.log.info(`Import de données : ${nRep} replicants, ${nFiles} fichiers`);
			res.json({ ok: true, replicants: nRep, files: nFiles });
		} catch (e) {
			res.status(400).json({ ok: false, error: e.message });
		}
	});
	nodecg.mount(router);

	nodecg.listenFor('data:backups', (_, ack) => {
		let list = [];
		try { list = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse(); } catch { /* aucun */ }
		if (ack && !ack.handled) ack(null, list);
	});

	nodecg.listenFor('data:restore', ({ file } = {}, ack) => {
		try {
			const p = path.join(dir, path.basename(String(file || '')));
			const snap = JSON.parse(fs.readFileSync(p, 'utf8'));
			for (const [n, v] of Object.entries(snap)) if (v !== undefined && v !== null) rep(n).value = v;
			nodecg.log.info(`Sauvegarde restaurée : ${p}`);
			if (ack && !ack.handled) ack(null);
		} catch (e) {
			if (ack && !ack.handled) ack(e.message);
		}
	});
};
