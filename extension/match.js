// Logique serveur : match (configuration du match, écran versus, veto, récap de veto)
// Replicants propres à cette partie (mêmes defaultValue côté client, voir shared/match.js) :
//   - matchGraphics : { versus: { visible }, veto: { visible }, vetoRecap: { visible } }
//                     visibilité des graphics versus.html / veto.html / veto-recap.html
//   - matchVeto     : { format: 'bo1'|'bo3'|'bo5', sequence: [{ action: 'ban'|'pick'|'decider', team: 'A'|'B'|null }] }
//                     déroulé prévu du veto (les étapes jouées sont dans le replicant coeur `veto`)
// Complète au démarrage une valeur matchGraphics persistée d'une version précédente (ex. sans vetoRecap).
const { MATCH_DEFAULTS } = require('../shared/match.js');

const clone = (v) => JSON.parse(JSON.stringify(v));

module.exports = function (nodecg) {
	const gfx = nodecg.Replicant('matchGraphics', { defaultValue: clone(MATCH_DEFAULTS.matchGraphics) });
	// Rétro-compatibilité : complète une valeur persistée d'une version précédente (ex. sans vetoRecap)
	const v = gfx.value || {};
	const missing = Object.keys(MATCH_DEFAULTS.matchGraphics).filter((k) => !v[k] || typeof v[k].visible !== 'boolean');
	if (missing.length) {
		const next = { ...clone(MATCH_DEFAULTS.matchGraphics), ...v };
		for (const k of missing) next[k] = { visible: false };
		gfx.value = next;
	}
	nodecg.Replicant('matchVeto', { defaultValue: clone(MATCH_DEFAULTS.matchVeto) });
};
