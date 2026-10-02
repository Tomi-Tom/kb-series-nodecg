// Rechargement automatique des overlays quand leur code change (fichier modifié dans graphics/ ou shared/).
// Replicants :
//   kbAutoReload (persistant, défaut true) : interrupteur de la régie ; false = les overlays ne se rechargent jamais seuls
//   kbBuild (non persistant) : « version » du code ; les overlays ouverts se rechargent quand elle change (shared/kb.js).
//     0 = rechargement désactivé au démarrage (les pages ne se rechargent pas quand le serveur redémarre).
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/paths');

const WATCHED = ['graphics', 'shared'];
const CODE = /\.(html|js|css)$/i;

module.exports = function (nodecg) {
	const auto = nodecg.Replicant('kbAutoReload', { defaultValue: true });
	const build = nodecg.Replicant('kbBuild', { defaultValue: 0, persistent: false });
	build.value = auto.value !== false ? Date.now() : 0;

	// Signature (date + taille) de chaque fichier surveillé : fs.watch émet aussi des événements parasites
	// (surtout sous Windows) alors que rien n'a changé ; on ne réagit qu'à un vrai changement.
	const known = new Map();
	const signature = (file) => {
		try { const st = fs.statSync(file); return st.isFile() ? `${st.mtimeMs}:${st.size}` : null; } catch { return null; }
	};
	const scan = (dir) => {
		let entries;
		try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const e of entries) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) scan(p);
			else if (CODE.test(e.name)) known.set(p, signature(p));
		}
	};

	let timer = null;
	for (const sub of WATCHED) {
		const dir = path.join(ROOT, sub);
		scan(dir);
		try {
			fs.watch(dir, { recursive: true }, (ev, name) => {
				if (!name || !CODE.test(name)) return;
				const file = path.join(dir, String(name));
				const sig = signature(file);
				if (known.get(file) === sig) return;
				known.set(file, sig);
				if (auto.value === false) return;
				clearTimeout(timer);
				timer = setTimeout(() => { build.value = Date.now(); }, 800);
			}).on('error', (e) => nodecg.log.warn(`Surveillance de ${sub}/ interrompue :`, e.message));
		} catch (e) { nodecg.log.warn(`Surveillance de ${sub}/ impossible :`, e.message); }
	}
};
