// Logique serveur : maps (replicants propres à cette partie)
// - mapsGraphics : visibilité / options des graphics map-intro, map-series, map-result
//     intro.index / result.index : index dans match.maps (null = match.currentMap)
//     result.mvp : riotId du MVP ou nom saisi librement (ou null) ; result.mvpTeam : 'A'|'B'|null (équipe du MVP en saisie libre, défaut = vainqueur)
// - mapsTransitionSettings : réglages du stinger (durées, volets, logo, map, préréglages perso) — cf. shared/maps.js
// - mapsExport : état de l'export PNG du stinger { running, done, total, map, path, error, at }
// Message 'maps:exportStinger' { map } : lance tools/export-stinger.js (séquence PNG transparente 60 i/s dans exports/)
// Le stinger (graphics/transition.html) écoute le replicant coeur `transition` ({ at, map }).
const path = require('path');
const { spawn } = require('child_process');

module.exports = function (nodecg) {
	nodecg.Replicant('mapsGraphics', {
		defaultValue: {
			intro: { visible: false, index: null },
			series: { visible: false },
			result: { visible: false, index: null, mvp: null, mvpTeam: null },
		},
	});
	// Réglages du stinger — description de chaque champ dans shared/maps.js (KBM.TRANSITION_DEFAULT / SCHEMA).
	// Rétro-compatible : un ancien objet { coverIn, holdLogo, holdMap, revealOut } est complété par les défauts côté client.
	nodecg.Replicant('mapsTransitionSettings', {
		defaultValue: {
			coverIn: 600, holdLogo: 360, holdMap: 2500, revealOut: 540, stagger: 60, speed: 1,
			direction: 'ltr', angle: 20, easing: 'smooth', panels: 3, palette: 'theme', slashes: true,
			logoSize: 440, logoAnim: 'pop', logoFlare: true,
			mapName: true, mapSplash: true, mapNumber: true, mapPick: false, mapZoom: 0.14, mapTitle: 'center',
			presets: [],
		},
	});
	const exp = nodecg.Replicant('mapsExport', { defaultValue: { running: false, done: 0, total: 0, map: null, path: null, error: null, at: 0 } });
	// Un export ne survit pas à un redémarrage du serveur
	if (exp.value.running) exp.value = { ...exp.value, running: false, error: 'Export interrompu (redémarrage du serveur)' };

	let child = null;
	nodecg.listenFor('maps:exportStinger', (data, ack) => {
		const reply = (err, res) => { if (ack && !ack.handled) ack(err, res); };
		if (child) return reply(new Error('Un export est déjà en cours'));
		const map = data && data.map ? String(data.map).replace(/[^\w '-]/g, '').slice(0, 40) : null;
		const root = path.resolve(__dirname, '..');
		const port = (nodecg.config && nodecg.config.port) || 9090;
		const args = [path.join(root, 'tools', 'export-stinger.js'), '--host', `http://localhost:${port}`];
		if (map) args.push('--map', map);
		exp.value = { running: true, done: 0, total: 0, map, path: null, error: null, at: Date.now() };
		child = spawn(process.execPath, args, { cwd: root, windowsHide: true });
		let buf = '';
		const onLine = (line) => {
			let m;
			if ((m = line.match(/^PROGRESS (\d+)\/(\d+)/))) exp.value = { ...exp.value, done: +m[1], total: +m[2] };
			else if ((m = line.match(/^DONE (.+)$/))) exp.value = { ...exp.value, path: m[1].trim() };
			else if ((m = line.match(/^ERROR (.+)$/))) exp.value = { ...exp.value, error: m[1].trim() };
		};
		child.stdout.on('data', (d) => { buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop(); lines.forEach(onLine); });
		child.stderr.on('data', (d) => nodecg.log.warn('[export-stinger]', String(d).trim()));
		child.on('close', (code) => {
			if (buf) onLine(buf);
			child = null;
			const ok = code === 0 && exp.value.path;
			exp.value = { ...exp.value, running: false, error: ok ? null : exp.value.error || `Échec de l'export (code ${code})` };
			nodecg.log.info(ok ? `Stinger exporté : ${exp.value.path}` : `Export du stinger échoué : ${exp.value.error}`);
		});
		child.on('error', (e) => { child = null; exp.value = { ...exp.value, running: false, error: e.message }; });
		reply(null, { started: true });
	});
};
