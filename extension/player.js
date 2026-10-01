// Logique serveur : player (replicants propres à cette partie)
// - playerStatsGraphic est déclaré dans extension/tracker.js ({ playerId, visible, agentId })
// - playerDuel : face-à-face de 2 joueurs (graphics/player-duel.html)
// (les photos joueurs sont dans playerData[key].photo, replicant coeur)
module.exports = function (nodecg) {
	nodecg.Replicant('playerDuel', { defaultValue: { left: null, right: null, visible: false } });
};
