// Helpers partie "player" (graphics + dashboard). Requiert shared/kb.js (KB.player, KB.teamOf, KB.roleLabel…).
(function () {
	const P = {};
	P.DUEL_DEFAULT = { left: null, right: null, visible: false };

	// Alias vers le socle commun (shared/kb.js)
	P.roleLabel = (r) => KB.roleLabel(r);
	P.teamOf = (riotId) => KB.teamOf(riotId);

	/** Liste ordonnée des équipes : celles du match en premier */
	P.orderedTeams = () => {
		const teams = Object.values((KB.rep.teams && KB.rep.teams.value) || {});
		const m = KB.rep.match && KB.rep.match.value;
		const prio = [m && m.teamA, m && m.teamB];
		return teams.sort((a, b) => {
			const pa = prio.indexOf(a.id), pb = prio.indexOf(b.id);
			return (pa < 0 ? 9 : pa) - (pb < 0 ? 9 : pb) || String(a.name).localeCompare(String(b.name));
		});
	};

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

	P.trackerUrl = (riotId) => 'https://tracker.gg/valorant/profile/riot/' + encodeURIComponent(riotId) + '/overview';

	/** Ajuste la taille de police d'un élément pour qu'il tienne en largeur */
	P.fit = (el, max, min = 40, width) => {
		const w = width || el.clientWidth || el.parentElement.clientWidth;
		let size = max;
		el.style.fontSize = size + 'px';
		while (el.scrollWidth > w + 1 && size > min) el.style.fontSize = (size -= 4) + 'px';
	};

	window.KBP = P;
})();
