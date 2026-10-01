// Correctifs de dépendances, réappliqués après chaque `npm install` (script postinstall).
// hasha 5 (utilisé par NodeCG pour les assets) plante sous Node 24 quand le worker répond
// pour une tâche déjà résolue : "Cannot read properties of undefined (reading 'resolve')".
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'node_modules', 'hasha', 'index.js');
if (fs.existsSync(file)) {
	let s = fs.readFileSync(file, 'utf8');
	const needle = "const task = tasks.get(message.id);\n\t\ttasks.delete(message.id);";
	if (s.includes(needle) && !s.includes('if (!task) return;')) {
		s = s.replace(needle, needle + '\n\t\tif (!task) return; // patch valorant-tournament (tools/patch-deps.js)');
		fs.writeFileSync(file, s);
		console.log('hasha patché');
	} else console.log('hasha : déjà patché ou version différente');
}
