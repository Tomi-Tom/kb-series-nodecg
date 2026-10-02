// Panneau « Équipes & Joueurs » : constantes et accès aux données (replicants teams, playerData, playerProfiles).
// Toutes les écritures du panneau passent par ici (writeData, moveTo, setRole, renameKey, deletePlayer…).
// Chargé en premier : les autres fichiers du panneau (board.js, sheet.js, preview.js, main.js) lisent window.KBPlayers.
(function (P) {
	P.POOL = '__pool';   // colonne « Sans équipe »
	P.NO_TEAM = '';
	P.STARTERS = 5;
	// Rôles stockés avec une majuscule initiale ('Duelist', 'IGL'…) comme dans le reste du kit ; lecture insensible à la casse
	P.ROLE_KEYS = Object.keys(KB.ROLES).map((k) => (k === 'igl' ? 'IGL' : k[0].toUpperCase() + k.slice(1)));
	P.TIER_ICON = (n) => `https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiersv2/${n}.png`;
	// Rangs Valorant → n° d'icône tracker (vérifié sur un profil réel : Platinum 1 = 15, Platinum 2 = 16).
	// Noms stockés en anglais comme ceux importés de tracker.gg (cohérence d'affichage).
	P.FAMILIES = [['Iron', 'Fer'], ['Bronze', 'Bronze'], ['Silver', 'Argent'], ['Gold', 'Or'], ['Platinum', 'Platine'], ['Diamond', 'Diamant'], ['Ascendant', 'Ascendant'], ['Immortal', 'Immortel']];
	P.TIERS = [{ n: 0, name: 'Unranked', fr: 'Non classé' }];
	P.FAMILIES.forEach(([en, fr], i) => { for (let d = 1; d <= 3; d++) P.TIERS.push({ n: 3 + i * 3 + d - 1, name: `${en} ${d}`, fr: `${fr} ${d}`, fam: i }); });
	P.TIERS.push({ n: 27, name: 'Radiant', fr: 'Radiant' });
	P.findTier = (txt) => { const t = String(txt || '').trim().toLowerCase(); return P.TIERS.find((x) => x.name.toLowerCase() === t || x.fr.toLowerCase() === t) || null; };
	P.STATS = [['kd', 'K/D'], ['acs', 'ACS'], ['adr', 'ADR'], ['hs', 'HS%'], ['kast', 'KAST'], ['winPct', 'Win%'], ['wins', 'Victoires'], ['losses', 'Défaites'], ['matches', 'Matchs'], ['firstBloods', 'First Bloods'], ['clutches', 'Clutchs'], ['aces', 'Aces']];

	P.photoAssets = nodecg.Replicant('assets:player-photos');
	P.logoAssets = nodecg.Replicant('assets:team-logos');
	// Overlays qui désignent un joueur par son Riot ID : mis à jour quand ce Riot ID change
	P.statsGraphic = nodecg.Replicant('playerStatsGraphic');
	P.duel = nodecg.Replicant('playerDuel');
	P.mapsGraphics = nodecg.Replicant('mapsGraphics');

	// Joueur dont la fiche est ouverte (clé = Riot ID en minuscules), mémorisé dans ce navigateur
	P.sel = null;
	try { P.sel = localStorage.getItem('kbPlayersSel') || null; } catch { /* stockage bloqué */ }
	P.rememberSel = () => { try { localStorage.setItem('kbPlayersSel', P.sel || ''); } catch { /* stockage bloqué */ } };

	/** Message durable dans un encadré .msg.box (texte vide = efface) */
	P.msg = (el, text, kind = '') => KBD.flash(el, text, kind, 0);

	// ---------- Écritures par entrée, avec brouillon local ----------
	// Dans le navigateur, NodeCG n'applique une écriture qu'au retour du serveur : deux écritures rapprochées (K/D tapé
	// puis clic sur un rang, déplacement puis rôle…) partiraient de la même valeur et la seconde effacerait la première.
	// On écrit donc une seule entrée à la fois (une équipe, une fiche), et la dernière valeur écrite est lue à la place
	// de celle du replicant jusqu'à ce que le serveur la renvoie (au plus DRAFT_MS : écrasée entre-temps par un autre poste).
	const DRAFT_MS = 3000;
	function entryWriter(rep) {
		const pending = new Map(); // clé → { v (undefined = supprimée), at }
		const fresh = (p) => Date.now() - p.at < DRAFT_MS;
		const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
		rep.on('change', (val) => { for (const [k, p] of pending) if (!fresh(p) || same(val && val[k], p.v)) pending.delete(k); });
		return {
			read() {
				const v = rep.value || {};
				if (!pending.size) return v;
				const out = { ...v };
				for (const [k, p] of pending) if (fresh(p)) { if (p.v === undefined) delete out[k]; else out[k] = p.v; }
				return out;
			},
			/** Écrit l'entrée `k` (v undefined = la supprime) ; renvoie false si elle était déjà identique */
			write(k, v) {
				const cur = this.read();
				if (same(cur[k], v)) return false;
				pending.set(k, { v: KB.clone(v), at: Date.now() });
				const live = rep.value;
				if (live && typeof live === 'object' && (v !== undefined || Object.prototype.hasOwnProperty.call(live, k))) {
					if (v === undefined) delete live[k]; else live[k] = KB.clone(v);
				} else {
					// Entrée pas encore revenue du serveur (ou replicant vide) : réécriture complète depuis la valeur locale
					const all = { ...cur };
					if (v === undefined) delete all[k]; else all[k] = v;
					rep.value = KB.clone(all);
				}
				return true;
			},
		};
	}
	const teamsW = entryWriter(KB.rep.teams);
	const dataW = entryWriter(KB.rep.playerData);

	// ---------- Lecture ----------
	P.teamsVal = () => teamsW.read();
	P.dataVal = () => dataW.read();
	P.profVal = () => KB.rep.playerProfiles.value || {};
	P.playersOf = (t) => ((t && t.players) || []).filter((p) => p && p.riotId);
	/** Riot ID avec sa casse d'origine (équipe, puis fiche, puis profil) */
	P.riotIdOf = (key) => {
		for (const t of Object.values(P.teamsVal())) { const p = P.playersOf(t).find((x) => KB.key(x.riotId) === key); if (p) return p.riotId; }
		return (P.dataVal()[key] && P.dataVal()[key].riotId) || (P.profVal()[key] && P.profVal()[key].riotId) || key;
	};
	/** Tous les joueurs connus : dans une équipe, saisis à la main ou importés de tracker.gg */
	P.allKeys = () => {
		const s = new Set();
		for (const t of Object.values(P.teamsVal())) for (const p of P.playersOf(t)) s.add(KB.key(p.riotId));
		Object.keys(P.dataVal()).forEach((k) => s.add(k));
		Object.keys(P.profVal()).forEach((k) => s.add(k));
		return s;
	};
	P.ovOf = (key) => (P.dataVal()[key] && P.dataVal()[key].overrides) || {};
	P.hasOverrides = (ov) => !!((ov.rank && ov.rank.name) || (ov.peak && ov.peak.name) || Object.values(ov.stats || {}).some((v) => v !== '' && v != null) || (ov.agents || []).some(Boolean));
	P.isManual = (key) => { const d = P.dataVal()[key] || {}; return P.hasOverrides(d.overrides || {}) || !!d.displayName || !!d.realName; };
	P.roleNorm = (r) => { const l = String(r || '').toLowerCase(); return P.ROLE_KEYS.find((k) => k.toLowerCase() === l) || r || ''; };

	// ---------- Fiches (playerData) ----------
	/** Retire les champs vides d'une fiche (une fiche vide n'écrase rien côté tracker.gg) */
	function cleanEntry(e) {
		const ov = e.overrides || {};
		if (ov.stats) { for (const k of Object.keys(ov.stats)) if (ov.stats[k] === '' || ov.stats[k] == null) delete ov.stats[k]; if (!Object.keys(ov.stats).length) delete ov.stats; }
		if (ov.agents && !ov.agents.some(Boolean)) delete ov.agents;
		if (!ov.rank || !ov.rank.name) delete ov.rank;
		if (!ov.peak || !ov.peak.name) delete ov.peak;
		if (Object.keys(ov).length) e.overrides = ov; else delete e.overrides;
		for (const k of ['displayName', 'realName', 'photo']) if (!e[k]) delete e[k];
		return e;
	}
	/** Modifie la fiche playerData[key] (créée si besoin) */
	P.writeData = (key, fn) => {
		const e = KB.clone(P.dataVal()[key]) || {};
		e.riotId = e.riotId || P.riotIdOf(key);
		e.overrides = e.overrides || {};
		fn(e);
		dataW.write(key, cleanEntry(e));
	};
	P.writeOv = (key, fn) => P.writeData(key, (e) => fn(e.overrides));
	/** Garde une fiche pour un joueur qui quitte toutes les équipes (sinon il disparaîtrait de la liste) */
	P.keepInPool = (keys) => {
		for (const k of keys) if (!P.dataVal()[k] && !P.profVal()[k]) dataW.write(k, { riotId: P.riotIdOf(k) });
	};

	// ---------- Équipes (teams) ----------
	/** Copie de `teams` sans emplacements vides */
	P.teamsCopy = () => {
		const teams = KB.clone(P.teamsVal());
		for (const t of Object.values(teams)) t.players = P.playersOf(t);
		return teams;
	};
	/** Enregistre une copie modifiée de `teams` : seules les équipes changées (ou supprimées) sont écrites. Renvoie true si une l'a été */
	P.saveTeams = (teams) => {
		const cur = P.teamsVal();
		let changed = false;
		for (const id of new Set([...Object.keys(cur), ...Object.keys(teams)])) if (teamsW.write(id, teams[id])) changed = true;
		return changed;
	};
	/** Retire le joueur de toutes les équipes (onlyTeam = d'une seule) ; renvoie l'entrée retirée */
	P.detach = (teams, key, onlyTeam = null) => {
		let found = null;
		for (const t of Object.values(teams)) {
			if (onlyTeam && t.id !== onlyTeam) continue;
			const i = (t.players || []).findIndex((x) => x && KB.key(x.riotId) === key);
			if (i >= 0) { found = t.players[i]; t.players.splice(i, 1); }
		}
		return found;
	};
	const isInTeam = (teams, key) => Object.values(teams).some((t) => t.players.some((p) => KB.key(p.riotId) === key));
	/**
	 * Déplace le joueur de la colonne `from` (équipe ou POOL) vers `to` (équipe ou POOL), à l'index donné.
	 * Un joueur peut appartenir à plusieurs équipes : seule l'équipe source est modifiée.
	 * from = null → simple ajout dans `to` (sans le retirer d'ailleurs).
	 */
	P.moveTo = (key, from, to, index = Infinity) => {
		const teams = P.teamsCopy();
		const rid = P.riotIdOf(key);
		const prev = from && from !== P.POOL && teams[from] ? P.detach(teams, key, from) : null;
		if (to && to !== P.POOL && teams[to]) {
			const arr = teams[to].players;
			const j = arr.findIndex((p) => KB.key(p.riotId) === key);
			const existing = j >= 0 ? arr.splice(j, 1)[0] : null; // déjà dans l'équipe cible : on le repositionne
			const entry = existing || { riotId: (prev && prev.riotId) || rid, role: (prev && prev.role) || '' };
			arr.splice(Math.max(0, Math.min(index, arr.length)), 0, entry);
		}
		if (!isInTeam(teams, key)) P.keepInPool([key]);
		P.saveTeams(teams);
	};
	P.setRole = (key, teamId, role) => {
		const teams = P.teamsCopy();
		for (const t of Object.values(teams)) if (!teamId || t.id === teamId) for (const p of t.players) if (KB.key(p.riotId) === key) p.role = role;
		P.saveTeams(teams);
	};

	/**
	 * Change le Riot ID d'un joueur partout où il est cité : équipes, fiche, agents joués (match), overlays
	 * (stats joueur, duel, MVP). L'ancien profil tracker.gg est retiré : il ne correspond plus à ce Riot ID
	 * (sinon il resterait dans « Sans équipe » comme un joueur fantôme) ; il faut réimporter le nouveau.
	 * Renvoie false si le nouveau Riot ID est déjà celui d'un autre joueur.
	 */
	/** Retire le profil tracker.gg d'un joueur sans réécrire les autres (un import peut arriver au même moment) */
	const deleteProfile = (key) => { const pr = KB.rep.playerProfiles.value; if (pr && pr[key]) delete pr[key]; };
	P.renameKey = (key, nid) => {
		const nkey = KB.key(nid);
		if (nkey !== key && P.allKeys().has(nkey)) return false;
		const same = (id) => !!id && KB.key(id) === key;
		const teams = P.teamsCopy();
		for (const t of Object.values(teams)) for (const p of t.players) if (same(p.riotId)) p.riotId = nid;
		P.saveTeams(teams);
		const e = P.dataVal()[key] || {};
		if (nkey !== key) dataW.write(key, undefined);
		dataW.write(nkey, { ...e, riotId: nid });
		if (nkey !== key) {
			deleteProfile(key);
			const m = KB.rep.match.value;
			for (const mp of (m && m.maps) || []) {
				if (!mp.picks || !mp.picks[key]) continue;
				const picks = { ...mp.picks, [nkey]: mp.picks[key] };
				delete picks[key];
				mp.picks = picks;
			}
		}
		const g = P.statsGraphic.value;
		if (g && same(g.playerId)) g.playerId = nkey;
		const d = P.duel.value;
		if (d && same(d.left)) d.left = nid;
		if (d && same(d.right)) d.right = nid;
		const r = P.mapsGraphics.value && P.mapsGraphics.value.result;
		if (r && same(r.mvp)) r.mvp = nid;
		return nkey;
	};

	/** Supprime le joueur : retiré des équipes, fiche et profil tracker.gg effacés */
	P.deletePlayer = (key) => {
		const teams = P.teamsCopy();
		if (P.detach(teams, key)) P.saveTeams(teams);
		if (P.dataVal()[key]) dataW.write(key, undefined);
		deleteProfile(key);
	};
})(window.KBPlayers ||= {});
