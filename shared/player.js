// Helpers partie "player" (graphics + dashboard). Requiert shared/kb.js (KB.player, KB.teamOf, KB.roleLabel…).
// Navigateur : window.KBP ; Node : require('../shared/player.js') (valeurs par défaut des replicants)
(function (root) {
	const P = {};
	// Valeurs par défaut des replicants playerStatsGraphic et playerDuel
	P.STATS_DEFAULT = { playerId: null, visible: false, agentId: null };
	P.DUEL_DEFAULT = { left: null, right: null, visible: false };

	/** Stats comparées dans le duel */
	P.DUEL_STATS = [
		{ key: 'kd', label: 'K/D' },
		{ key: 'acs', label: 'ACS' },
		{ key: 'adr', label: 'ADR' },
		{ key: 'hs', label: 'HS%' },
		{ key: 'kast', label: 'KAST' },
		{ key: 'firstBloods', label: 'First Bloods' },
		{ key: 'winPct', label: 'Win%' },
	];

	/**
	 * Remplit un conteneur de n particules lumineuses qui montent lentement (style `#motes i` dans la page).
	 * Positions et délais calculés, sans hasard : le rendu est le même à chaque chargement.
	 *  spread : écart horizontal entre deux particules (px, modulo 1900) · lag : décalage de phase entre deux particules (s, modulo 12)
	 */
	P.motes = (el, n, { spread = 137, lag = 1.7 } = {}) => {
		el.innerHTML = Array.from({ length: n }, (_, i) => {
			const x = (i * spread) % 1900, d = (i * lag) % 12, t = 12 + (i % 5) * 3, s = 2 + (i % 3);
			return `<i style="left:${x}px;width:${s}px;height:${s}px;animation-duration:${t}s;animation-delay:-${d}s"></i>`;
		}).join('');
	};

	if (typeof module !== 'undefined' && module.exports) module.exports = P;
	else root.KBP = P;
})(typeof window !== 'undefined' ? window : globalThis);
