// Réception des messages des panneaux (nodecg.sendMessage) sans jamais faire tomber le serveur.
// NodeCG appelle les handlers sans try/catch : une exception arrêterait la régie en plein direct.
//   const listen = require('./lib/listen')(nodecg);
//   listen('nom:message', async (data) => résultat);   → le panneau reçoit `résultat`, ou l'erreur (texte) si ça lève
// `data` vaut toujours au moins {} (un sendMessage sans données envoie null).
module.exports = (nodecg) => (name, handler) => {
	nodecg.listenFor(name, async (data, ack) => {
		const reply = (...args) => {
			try { if (typeof ack === 'function' && !ack.handled) ack(...args); } catch { /* panneau déconnecté */ }
		};
		try {
			reply(null, await handler(data ?? {}));
		} catch (e) {
			const message = (e && e.message) || String(e);
			// Bug de code (et non refus attendu) : on garde la pile pour le diagnostic
			if (e instanceof TypeError || e instanceof ReferenceError) nodecg.log.error(`Message "${name}" en erreur :`, e.stack);
			else nodecg.log.warn(`Message "${name}" refusé : ${message}`);
			reply(message);
		}
	});
};
