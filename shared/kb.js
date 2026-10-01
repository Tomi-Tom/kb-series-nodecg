// Helpers partagés graphics + dashboard. Import : <script src="../shared/kb.js"></script> (après le script nodecg injecté)
// Expose window.KB
(function () {
	const KB = {};

	KB.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
	KB.$ = (sel, root = document) => root.querySelector(sel);
	KB.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
	KB.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	// Assets du bundle (logos de l'affiche) — chemins valides depuis graphics/ et dashboard/
	KB.img = {
		kbs: '../shared/img/kbs-logo.png',
		cycom: '../shared/img/cycom-alpha.png',
		epitech: '../shared/img/epitech-alpha.png',
		posterArt: '../shared/img/poster-art.png',
		poster: '../shared/img/poster.jpg',
	};

	// Replicants coeur (déclarés dans extension/state.js et extension/tracker.js)
	KB.rep = {};
	for (const name of ['tournament', 'teams', 'match', 'veto', 'casters', 'schedule', 'countdown', 'transition', 'valorantData', 'playerProfiles', 'playerData']) {
		Object.defineProperty(KB.rep, name, { get() { return (this['_' + name] ||= nodecg.Replicant(name)); } });
	}

	/** Attend des replicants puis appelle render à chaque changement de l'un d'eux (render groupé par frame). */
	KB.watch = (names, render) => {
		const reps = names.map((n) => (typeof n === 'string' ? KB.rep[n] || nodecg.Replicant(n) : n));
		let queued = false;
		const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(); }); };
		NodeCG.waitForReplicants(...reps).then(() => { reps.forEach((r) => r.on('change', schedule)); schedule(); });
		return reps;
	};

	// ---------- Équipes / match ----------
	KB.team = (id) => (id && KB.rep.teams.value && KB.rep.teams.value[id]) || null;

	/** Équipes gauche/droite en tenant compte de match.swap. Renvoie { left, right, leftKey: 'A'|'B', rightKey } */
	KB.sides = (match = KB.rep.match.value) => {
		const A = KB.team(match && match.teamA), B = KB.team(match && match.teamB);
		return match && match.swap
			? { left: B, right: A, leftKey: 'B', rightKey: 'A' }
			: { left: A, right: B, leftKey: 'A', rightKey: 'B' };
	};

	/** Score de la série { A, B } calculé depuis match.maps[].winner */
	KB.seriesScore = (match = KB.rep.match.value) => {
		const s = { A: 0, B: 0 };
		for (const m of (match && match.maps) || []) if (m.winner === 'A' || m.winner === 'B') s[m.winner]++;
		return s;
	};
	KB.winsNeeded = (format) => ({ bo1: 1, bo3: 2, bo5: 3 }[format] || 1);
	KB.formatLabel = (format) => ({ bo1: 'BO1', bo3: 'BO3', bo5: 'BO5' }[format] || String(format || '').toUpperCase());

	/** HTML du logo d'équipe (img) ou monogramme si pas de logo. size en px */
	KB.teamLogo = (team, size = 80) => {
		if (!team) return `<div class="kb-team-mono" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px">?</div>`;
		if (team.logo) return `<img class="kb-team-logo" src="${KB.esc(team.logo)}" style="width:${size}px;height:${size}px" alt="">`;
		const mono = (team.tag || team.name || '?').slice(0, 3).toUpperCase();
		return `<div class="kb-team-mono" style="--c:${KB.esc(team.color || '#3b8fe6')};width:${size}px;height:${size}px;font-size:${size * 0.32}px">${KB.esc(mono)}</div>`;
	};

	// ---------- Données Valorant ----------
	KB.map = (name) => (name && KB.rep.valorantData.value && KB.rep.valorantData.value.maps[name]) || null;
	KB.agent = (name) => (name && KB.rep.valorantData.value && KB.rep.valorantData.value.agents[name]) || null;
	KB.mapNames = () => Object.keys((KB.rep.valorantData.value && KB.rep.valorantData.value.maps) || {}).sort();

	/** Profil tracker d'un joueur à partir de son Riot ID */
	KB.profile = (riotId) => (riotId && KB.rep.playerProfiles.value && KB.rep.playerProfiles.value[String(riotId).toLowerCase()]) || null;

	/**
	 * Stats agrégées d'une équipe sur une map, à partir des profils tracker de ses joueurs.
	 * Renvoie null si aucune donnée. { matches, winPct, attackWinPct, defenseWinPct, kd, acs, players: [{name, matches, winPct, topAgent}] }
	 * NB : ce sont les stats ranked individuelles des joueurs (pas des matchs joués ensemble).
	 */
	KB.teamMapStats = (team, mapName) => {
		if (!team) return null;
		const rows = [];
		for (const p of team.players || []) {
			const prof = KB.profile(p.riotId);
			const m = prof && prof.maps && prof.maps.find((x) => x.name === mapName);
			if (m) rows.push({ prof, m });
		}
		if (!rows.length) return null;
		const tot = rows.reduce((a, r) => a + (r.m.matchesValue || 0), 0) || 1;
		const wavg = (key) => {
			let sum = 0, w = 0;
			for (const r of rows) { const v = parseFloat(r.m[key]); if (!isNaN(v)) { sum += v * (r.m.matchesValue || 0); w += r.m.matchesValue || 0; } }
			return w ? sum / w : null;
		};
		return {
			matches: rows.reduce((a, r) => a + (r.m.matchesValue || 0), 0),
			winPct: wavg('winValue'),
			attackWinPct: wavg('attackWinPct'),
			defenseWinPct: wavg('defenseWinPct'),
			kd: wavg('kd'),
			acs: wavg('acs'),
			players: rows.map((r) => ({ name: r.prof.name, matches: r.m.matches, winPct: r.m.winPct, topAgent: r.m.topAgent })),
			weight: tot,
		};
	};

	// ---------- Joueurs (vue fusionnée tracker + saisie manuelle) ----------
	KB.key = (riotId) => (riotId ? String(riotId).trim().toLowerCase() : '');

	const ROLES = {
		duelist: 'Duelliste', initiator: 'Initiateur', controller: 'Contrôleur', sentinel: 'Sentinelle',
		flex: 'Flex', igl: 'IGL', sub: 'Remplaçant', coach: 'Coach',
	};
	KB.roleLabel = (r) => (r ? ROLES[String(r).toLowerCase()] || String(r) : '');

	/** Détail d'un agent depuis valorantData (+ couleur principale) ou null */
	KB.agentInfo = (name) => {
		const a = KB.agent(name);
		if (!a) return null;
		const c = a.colors && a.colors[0];
		return { ...a, color: c ? '#' + c.slice(0, 6) : null };
	};

	/** Équipe + rôle d'un joueur d'après son riotId */
	KB.teamOf = (riotId) => {
		const k = KB.key(riotId);
		if (!k) return null;
		for (const t of Object.values(KB.rep.teams.value || {})) {
			const p = (t.players || []).find((x) => x && KB.key(x.riotId) === k);
			if (p) return { team: t, role: p.role || '' };
		}
		return null;
	};

	/**
	 * Joueur fusionné : profil tracker.gg (playerProfiles) + saisie manuelle (playerData) qui prime.
	 * { key, riotId, name, tag, realName, photo, team, role, rank, peak, level, stats, agents, hasTracker, manual, profile }
	 *  - stats[k] = { display, value, percentile, manual }  (mêmes clés que tracker : kd, acs, adr, hs, kast, winPct, wins, losses, matches, firstBloods, clutches, aces...)
	 *  - agents = [{ name, icon, portrait, bust, role, color, matches, winPct, kd }] (manuel prioritaire)
	 */
	KB.player = (riotId) => {
		const key = KB.key(riotId);
		if (!key) return null;
		const prof = KB.profile(key);
		const data = (KB.rep.playerData.value || {})[key] || {};
		const ov = data.overrides || {};
		const rid = data.riotId || (prof && prof.riotId) || String(riotId);
		const [n, t] = rid.split('#');
		const tm = KB.teamOf(rid);

		const stats = {};
		for (const [k, v] of Object.entries((prof && prof.stats) || {})) stats[k] = { ...v, manual: false };
		for (const [k, v] of Object.entries(ov.stats || {})) {
			if (v === '' || v == null) continue;
			const num = parseFloat(String(v).replace(',', '.'));
			stats[k] = { display: String(v), value: isNaN(num) ? null : num, percentile: null, manual: true };
		}

		let agents;
		if (ov.agents && ov.agents.filter(Boolean).length) {
			agents = ov.agents.filter(Boolean).map((name) => {
				const tr = prof && (prof.agents || []).find((a) => a.name === name);
				const info = KB.agentInfo(name) || {};
				return { ...(tr || {}), ...info, name, color: (tr && tr.color) || info.color, manual: true };
			});
		} else {
			agents = ((prof && prof.agents) || []).map((a) => ({ ...(KB.agentInfo(a.name) || {}), ...a }));
		}

		return {
			key, riotId: rid,
			name: data.displayName || (prof && prof.name) || n,
			tag: (prof && prof.tag) || t || '',
			realName: data.realName || '',
			photo: data.photo || null,
			team: tm ? tm.team : null,
			role: tm ? tm.role : '',
			rank: ov.rank && ov.rank.name ? ov.rank : (prof && prof.rank) || null,
			peak: ov.peak && ov.peak.name ? ov.peak : (prof && prof.peak) || null,
			level: prof && prof.level,
			season: prof && prof.season,
			stats, agents, maps: (prof && prof.maps) || [],
			hasTracker: !!prof,
			manual: !!(Object.keys(ov.stats || {}).length || (ov.agents || []).length || ov.rank || ov.peak),
			profile: prof || null,
		};
	};

	/** Roster fusionné d'une équipe (titulaires = 5 premiers) */
	KB.roster = (team) => ((team && team.players) || []).filter((p) => p && p.riotId).map((p) => KB.player(p.riotId));

	/** Agent joué par un joueur sur une map du match (index par défaut = map courante) → agentInfo ou null */
	KB.pickOf = (riotId, mapIndex) => {
		const m = KB.rep.match.value || {};
		const i = mapIndex == null ? m.currentMap : mapIndex;
		const picks = (m.maps && m.maps[i] && m.maps[i].picks) || {};
		const name = picks[KB.key(riotId)];
		return name ? KB.agentInfo(name) || { name } : null;
	};

	// ---------- Animation ----------
	/**
	 * Gère l'entrée/sortie d'un conteneur avec les classes .kb-in / .kb-out (voir theme.css).
	 * show() relance les animations, hide() joue la sortie. outMs = durée de la sortie.
	 */
	KB.presence = (el, outMs = 450) => {
		let visible = false;
		return {
			get visible() { return visible; },
			show() {
				el.classList.remove('kb-out');
				el.classList.remove('kb-in');
				void el.offsetWidth;
				el.classList.add('kb-in');
				el.style.visibility = 'visible';
				visible = true;
			},
			async hide() {
				if (!visible) return;
				visible = false;
				el.classList.add('kb-out');
				await KB.sleep(outMs);
				if (!visible) { el.classList.remove('kb-in', 'kb-out'); el.style.visibility = 'hidden'; }
			},
		};
	};

	/** Compteur animé : anime le texte d'un élément de 0 vers sa valeur (garde décimales et suffixe %) */
	KB.countUp = (el, target, { delay = 300, duration = 1000 } = {}) => {
		const str = String(target ?? '');
		const n = parseFloat(str);
		if (isNaN(n)) { el.textContent = str || '–'; return; }
		const dec = (str.split('.')[1] || '').replace(/\D/g, '').length;
		const suffix = str.replace(/^-?[\d.,]+/, '');
		const t0 = performance.now() + delay;
		el.textContent = (0).toFixed(dec) + suffix;
		const step = (t) => {
			const k = Math.min(1, Math.max(0, (t - t0) / duration));
			el.textContent = (n * (1 - Math.pow(1 - k, 3))).toFixed(dec) + suffix;
			if (k < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	};

	/** Formate un compte à rebours mm:ss (ou h:mm:ss) */
	KB.formatCountdown = (ms) => {
		const s = Math.max(0, Math.ceil(ms / 1000));
		const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
		const pad = (x) => String(x).padStart(2, '0');
		return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
	};

	// Rechargement automatique des overlays quand leur code change (replicant kbBuild, extension/admin.js).
	// Uniquement pour les graphics : les panneaux ne se rechargent pas (saisie en cours).
	if (/\/graphics\//.test(location.pathname) && !/[?&](export|preview)=/.test(location.search)) {
		const build = nodecg.Replicant('kbBuild', { defaultValue: 0, persistent: false });
		let first = null;
		build.on('change', (v) => {
			if (first === null) { first = v; return; }
			if (v && v !== first) setTimeout(() => location.reload(), 300 + Math.random() * 700);
		});
	}

	window.KB = KB;
})();
