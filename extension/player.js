// Logique serveur : player (replicants propres à cette partie, défauts dans shared/player.js)
// - playerStatsGraphic : { playerId, visible, agentId } — carte de stats d'un joueur (graphics/player-stats.html)
// - playerDuel : { left, right, visible } — face-à-face de 2 joueurs (graphics/player-duel.html)
// (les photos joueurs sont dans playerData[key].photo, replicant coeur)
const KBP = require('../shared/player.js');

const clone = (v) => JSON.parse(JSON.stringify(v));

module.exports = function (nodecg) {
	nodecg.Replicant('playerStatsGraphic', { defaultValue: clone(KBP.STATS_DEFAULT) });
	nodecg.Replicant('playerDuel', { defaultValue: clone(KBP.DUEL_DEFAULT) });
};
