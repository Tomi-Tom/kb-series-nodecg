// Logique serveur du bundle : chaque partie a son fichier
module.exports = function (nodecg) {
	require('./state')(nodecg);     // replicants coeur (tournoi, équipes, match, veto, données Valorant...)
	require('./tracker')(nodecg);   // import des stats tracker.gg
	for (const part of ['player', 'maps', 'scenes', 'live', 'match', 'bracket', 'admin']) {
		try {
			require('./' + part)(nodecg);
		} catch (e) {
			nodecg.log.error(`Extension "${part}" en erreur :`, e.stack || e.message);
		}
	}
	nodecg.log.info('Bundle Valorant Tournament chargé');
};
