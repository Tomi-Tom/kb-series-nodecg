// Logique serveur : bracket (phase de groupes + phase finale)
//   bracket          : { qualify, groups: [{ name, teams: [{ id, w, l, rw, rl }] }], playoffs: { quarters: [m×4], semis: [m×2], third: m, final: m } }
//                      m = { a, b, scoreA, scoreB, winner: 'a'|'b'|null, status: 'upcoming'|'live'|'done', label?, time? }
//   bracketGraphics  : { groups: { visible }, bracket: { visible }, highlightLive }
// La propagation des vainqueurs (quarts → demis → finale, perdants des demis → petite finale) est faite ici,
// à chaque changement du replicant, quel que soit l'écrivain (panneau, autre extension, console).
// Messages : 'bracket:reset' → { backup } (sauvegarde avant) ; 'bracket:fillQuarters' → [[a, b] ×4] (affiches des quarts)
const KBB = require('../shared/bracket.js');

const clone = (v) => JSON.parse(JSON.stringify(v));
const valid = (bk) => !!bk && typeof bk === 'object' && Array.isArray(bk.groups) && !!bk.playoffs && typeof bk.playoffs === 'object';

module.exports = function (nodecg, listen, backup) {
	const bracket = nodecg.Replicant('bracket', { defaultValue: KBB.defaultBracket() });
	nodecg.Replicant('bracketGraphics', { defaultValue: clone(KBB.GRAPHICS_DEFAULT) });

	// `busy` : l'écriture faite ici redéclenche 'change' ; on ne repropage pas sa propre écriture
	let busy = false;
	const sync = () => {
		if (busy || !valid(bracket.value)) return;
		try {
			const copy = clone(bracket.value);
			if (KBB.propagate(copy)) {
				busy = true;
				try { bracket.value = copy; } finally { busy = false; }
			}
		} catch (e) {
			// Appelé lors d'une écriture venant d'un panneau : une exception ici arrêterait le serveur
			nodecg.log.warn('Bracket : propagation impossible :', e.message);
		}
	};
	bracket.on('change', sync);

	listen('bracket:reset', () => {
		const file = backup.snapshot('avant-reset-bracket');
		bracket.value = KBB.defaultBracket();
		return { backup: backup.relative(file) };
	});

	// Remplit les quarts depuis le classement des groupes (réinitialise scores/vainqueurs des quarts)
	listen('bracket:fillQuarters', () => {
		if (!valid(bracket.value)) throw new Error('Bracket illisible : réinitialise-le depuis le panneau Bracket');
		const copy = clone(bracket.value);
		const pairs = KBB.quarterPairs(copy);
		const keep = (old, extra) => KBB.emptyMatch({ label: (old && old.label) || '', time: (old && old.time) || '', ...extra });
		const po = copy.playoffs;
		po.quarters = pairs.map(([a, b], i) => keep(po.quarters && po.quarters[i], { a, b }));
		// Nouvelles affiches : la suite de l'arbre repart de zéro (horaires et libellés conservés)
		po.semis = [0, 1].map((i) => keep(po.semis && po.semis[i]));
		po.third = keep(po.third);
		po.final = keep(po.final);
		KBB.propagate(copy);
		bracket.value = copy;
		return pairs;
	});
};
