// Logique partagée du bracket (serveur + navigateur). Navigateur : window.KBB ; Node : require('../shared/bracket.js')
(function (root) {
	const B = {};

	B.emptyMatch = (extra = {}) => ({ a: null, b: null, scoreA: 0, scoreB: 0, winner: null, status: 'upcoming', label: '', time: '', ...extra });

	B.defaultBracket = () => ({
		qualify: 2, // nombre de qualifiés par groupe (mis en évidence en or)
		groups: [
			{ name: 'Groupe A', teams: [] },
			{ name: 'Groupe B', teams: [] },
		],
		playoffs: {
			quarters: [0, 1, 2, 3].map(() => B.emptyMatch()),
			semis: [0, 1].map(() => B.emptyMatch()),
			third: B.emptyMatch(),
			final: B.emptyMatch(),
		},
	});

	B.ROUND_LABELS = { quarters: 'Quart de finale', semis: 'Demi-finale', third: 'Petite finale', final: 'Grande finale' };
	B.shortLabel = (round, i) => ({ quarters: 'QF' + (i + 1), semis: 'DF' + (i + 1), third: 'Petite finale', final: 'Grande finale' }[round]);

	const num = (x) => (Number.isFinite(+x) ? +x : 0);

	/** Classement d'un groupe : V desc, diff de rounds desc, rounds gagnés desc. Ne modifie pas l'entrée. */
	B.standings = (group) => (((group && group.teams) || []).filter((t) => t && t.id))
		.map((t, i) => ({ ...t, w: num(t.w), l: num(t.l), rw: num(t.rw), rl: num(t.rl), diff: num(t.rw) - num(t.rl), _i: i }))
		.sort((x, y) => y.w - x.w || x.l - y.l || y.diff - x.diff || y.rw - x.rw || x._i - y._i);

	B.winnerId = (m) => (m && m.winner === 'a' ? m.a : m && m.winner === 'b' ? m.b : null);
	B.loserId = (m) => (m && m.winner === 'a' ? m.b : m && m.winner === 'b' ? m.a : null);

	/**
	 * Fait avancer les équipes : quarts → demis, demis → finale, perdants des demis → petite finale.
	 * Mute `bk` en place et renvoie true si quelque chose a changé.
	 * Un emplacement déjà rempli par une équipe du match source est vidé si ce match n'a plus de vainqueur.
	 */
	B.propagate = (bk) => {
		let any = false;
		for (let i = 0; i < 4 && B.propagateOnce(bk); i++) any = true;
		return any;
	};
	B.propagateOnce = (bk) => {
		const p = bk && bk.playoffs;
		if (!p) return false;
		let changed = false;
		const fix = (m) => {
			if (!m) return;
			if (m.status === 'done' && !m.winner && num(m.scoreA) !== num(m.scoreB)) { m.winner = num(m.scoreA) > num(m.scoreB) ? 'a' : 'b'; changed = true; }
		};
		[...(p.quarters || []), ...(p.semis || []), p.third, p.final].forEach(fix);
		const feed = (src, dst, slot, pick) => {
			if (!src || !dst) return;
			const v = pick(src);
			const prev = dst[slot];
			if (v) { if (prev !== v) dst[slot] = v; }
			else if (prev && (prev === src.a || prev === src.b)) dst[slot] = null;
			if (dst[slot] !== prev) {
				changed = true;
				// L'affiche a changé : l'ancien résultat de ce match n'a plus de sens
				if (dst.winner) { dst.winner = null; if (dst.status === 'done') dst.status = 'upcoming'; }
			}
		};
		const q = p.quarters || [], s = p.semis || [];
		feed(q[0], s[0], 'a', B.winnerId); feed(q[1], s[0], 'b', B.winnerId);
		feed(q[2], s[1], 'a', B.winnerId); feed(q[3], s[1], 'b', B.winnerId);
		feed(s[0], p.final, 'a', B.winnerId); feed(s[1], p.final, 'b', B.winnerId);
		feed(s[0], p.third, 'a', B.loserId); feed(s[1], p.third, 'b', B.loserId);
		return changed;
	};

	/**
	 * Affiches des quarts depuis les groupes (croisement : le 1er d'un groupe affronte un équipe mal classée de l'autre,
	 * et les deux 1ers ne peuvent se croiser qu'en finale). Renvoie 4 paires [a, b] (ids ou null).
	 * - 2 groupes : 1A-4B, 2B-3A | 1B-4A, 2A-3B (on prend les 4 premiers de chaque groupe)
	 * - 4 groupes : 1A-2B, 1C-2D | 1B-2A, 1D-2C
	 * - sinon : têtes de série globales 1-8, 4-5 | 2-7, 3-6
	 */
	B.quarterPairs = (bk) => {
		const g = ((bk && bk.groups) || []).map((x) => B.standings(x).map((t) => t.id));
		const at = (gi, r) => (g[gi] && g[gi][r]) || null;
		if (g.length === 2) return [[at(0, 0), at(1, 3)], [at(1, 1), at(0, 2)], [at(1, 0), at(0, 3)], [at(0, 1), at(1, 2)]];
		if (g.length === 4) return [[at(0, 0), at(1, 1)], [at(2, 0), at(3, 1)], [at(1, 0), at(0, 1)], [at(3, 0), at(2, 1)]];
		// Têtes de série : rangs entrelacés entre groupes
		const seeds = [];
		const depth = Math.max(0, ...g.map((x) => x.length));
		for (let r = 0; r < depth && seeds.length < 8; r++) for (const x of g) if (x[r] && seeds.length < 8) seeds.push(x[r]);
		const sd = (i) => seeds[i] || null;
		return [[sd(0), sd(7)], [sd(3), sd(4)], [sd(1), sd(6)], [sd(2), sd(5)]];
	};

	/** Données de démo cohérentes avec les 8 équipes de `demo:seed` et le planning de démo. */
	B.demoBracket = () => {
		const row = (id, w, l, rw, rl) => ({ id, w, l, rw, rl });
		const bk = B.defaultBracket();
		bk.qualify = 4; // 2 groupes de 4 : tout le monde va en quarts, les groupes servent au placement
		bk.groups = [
			{ name: 'Groupe A', teams: [row('epx', 3, 0, 39, 21), row('cyr', 2, 1, 34, 30), row('or5', 1, 2, 29, 35), row('sf', 0, 3, 22, 38)] },
			{ name: 'Groupe B', teams: [row('nvr', 3, 0, 39, 25), row('kk', 2, 1, 36, 28), row('bb', 1, 2, 30, 33), row('pph', 0, 3, 20, 39)] },
		];
		const m = B.emptyMatch;
		bk.playoffs = {
			quarters: [
				m({ a: 'epx', b: 'pph', scoreA: 2, scoreB: 0, winner: 'a', status: 'done', time: '10:00' }),
				m({ a: 'kk', b: 'or5', scoreA: 2, scoreB: 1, winner: 'a', status: 'done', time: '11:30' }),
				m({ a: 'nvr', b: 'sf', scoreA: 2, scoreB: 1, winner: 'a', status: 'done', time: '10:00' }),
				m({ a: 'cyr', b: 'bb', scoreA: 2, scoreB: 1, winner: 'a', status: 'done', time: '11:30' }),
			],
			semis: [
				m({ scoreA: 1, scoreB: 0, status: 'live', time: '14:00' }),
				m({ time: '15:30' }),
			],
			third: m({ time: '17:00' }),
			final: m({ time: '18:30' }),
		};
		// Quarts terminés, DF1 EPX-KK en cours (1-0), DF2 NVR-CYR à venir (cohérent avec le planning de démo)
		B.propagate(bk);
		return bk;
	};

	if (typeof module !== 'undefined' && module.exports) module.exports = B;
	else root.KBB = B;
})(typeof window !== 'undefined' ? window : globalThis);
