// Correctifs de dépendances, réappliqués après chaque `npm install` (script postinstall).
// hasha 5 (utilisé par NodeCG pour les assets) plante sous Node 24 quand le worker répond
// pour une tâche déjà résolue : "Cannot read properties of undefined (reading 'resolve')".
// Ne fait jamais échouer l'installation : au pire, un avertissement bien visible.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', 'hasha');
const file = path.join(dir, 'index.js');
const MARK = 'if (!task) return;';
// Ancre : lecture puis suppression de la tâche dans le gestionnaire de messages du worker
const ANCHOR = /^([ \t]*)(const task = tasks\.get\(message\.id\);\s*tasks\.delete\(message\.id\);)/m;

if (fs.existsSync(file)) {
	let s = fs.readFileSync(file, 'utf8');
	if (s.includes(MARK)) {
		console.log('hasha : déjà patché');
	} else if (ANCHOR.test(s)) {
		s = s.replace(ANCHOR, (m, indent, code) => `${indent}${code}\n${indent}${MARK} // patch valorant-tournament (tools/patch-deps.js)`);
		fs.writeFileSync(file, s);
		console.log('hasha : patch appliqué');
	} else {
		let version = '?';
		try { version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version; } catch { /* illisible */ }
		console.warn('\n**********************************************************************');
		console.warn(`* ATTENTION : correctif hasha NON appliqué (version ${version} inattendue).`);
		console.warn('* L\'envoi de fichiers dans Assets peut planter sous Node 24.');
		console.warn('* Vérifie tools/patch-deps.js (ancre introuvable dans node_modules/hasha/index.js).');
		console.warn('**********************************************************************\n');
	}
}
