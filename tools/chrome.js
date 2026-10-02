// Trouve un navigateur Chromium installé (Chrome, sinon Edge) pour les outils de capture.
// Pour forcer un chemin : variable d'environnement CHROME_PATH.
const fs = require('fs');
const path = require('path');

function findChrome() {
	const env = process.env;
	const candidates = [
		env.CHROME_PATH,
		...[env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((dir) => [
			path.join(dir, 'Google/Chrome/Application/chrome.exe'),
			path.join(dir, 'Microsoft/Edge/Application/msedge.exe'),
		]),
		'/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	].filter(Boolean);
	const found = candidates.find((p) => fs.existsSync(p));
	if (!found) throw new Error('Chrome ou Edge introuvable. Installe Chrome, ou indique son chemin dans la variable CHROME_PATH.');
	return found;
}

module.exports = { findChrome };
