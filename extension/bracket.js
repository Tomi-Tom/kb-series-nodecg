// Logique serveur : bracket (phase de groupes + phase finale)
//   bracket          : { qualify, groups: [{ name, teams: [{ id, w, l, rw, rl }] }], playoffs: { quarters: [m×4], semis: [m×2], third: m, final: m } }
//                      m = { a, b, scoreA, scoreB, winner: 'a'|'b'|null, status: 'upcoming'|'live'|'done', label?, time? }
//   bracketGraphics  : { groups: { visible }, bracket: { visible }, highlightLive }
// La propagation des vainqueurs (quarts → demis → finale, perdants des demis → petite finale) est faite ici,
// à chaque changement du replicant, quel que soit l'écrivain (panneau, autre extension, console).
const KBB = require('../shared/bracket.js');

module.exports = function (nodecg) {
	const bracket = nodecg.Replicant('bracket', { defaultValue: KBB.defaultBracket() });
	nodecg.Replicant('bracketGraphics', { defaultValue: { groups: { visible: false }, bracket: { visible: false }, highlightLive: true } });

	let busy = false;
	const sync = () => {
		if (busy || !bracket.value) return;
		const copy = JSON.parse(JSON.stringify(bracket.value));
		if (KBB.propagate(copy)) {
			busy = true;
			try { bracket.value = copy; } finally { busy = false; }
		}
	};
	bracket.on('change', sync);

	nodecg.listenFor('bracket:demo', (_, ack) => {
		bracket.value = KBB.demoBracket();
		nodecg.log.info('Bracket de démo chargé');
		if (ack && !ack.handled) ack(null);
	});

	nodecg.listenFor('bracket:reset', (_, ack) => {
		bracket.value = KBB.defaultBracket();
		if (ack && !ack.handled) ack(null);
	});

	// Remplit les quarts depuis le classement des groupes (réinitialise scores/vainqueurs des quarts)
	nodecg.listenFor('bracket:fillQuarters', (_, ack) => {
		const copy = JSON.parse(JSON.stringify(bracket.value));
		const pairs = KBB.quarterPairs(copy);
		const keep = (old, extra) => KBB.emptyMatch({ label: (old && old.label) || '', time: (old && old.time) || '', ...extra });
		const po = copy.playoffs;
		po.quarters = pairs.map(([a, b], i) => keep(po.quarters[i], { a, b }));
		// Nouvelles affiches : la suite de l'arbre repart de zéro (horaires et libellés conservés)
		po.semis = [0, 1].map((i) => keep(po.semis && po.semis[i]));
		po.third = keep(po.third);
		po.final = keep(po.final);
		KBB.propagate(copy);
		bracket.value = copy;
		if (ack && !ack.handled) ack(null, pairs);
	});
};
