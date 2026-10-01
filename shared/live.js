// Partie "live" : valeurs par défaut des replicants live* + géométrie de l'écran 50/50.
// Partagé entre extension/live.js (require) et les pages (window.LIVE).
(function (root) {
	const LIVE = {};

	// Un lower third (un "slot" gauche ou droite)
	// style : standard | gold | alert ; source : custom | caster (caster = suit le replicant casters en direct)
	LIVE.slotDefault = () => ({ visible: false, style: 'standard', kicker: '', title: '', subtitle: '', source: 'custom', casterIndex: 0, duration: 0 });

	// Label d'une moitié de l'écran 50/50
	// mode : none | text | team | player ; team : 'A' | 'B' (équipes du match) ou id d'équipe ; riotId : joueur (KB.player)
	LIVE.camLabelDefault = (team) => ({ mode: 'team', text: '', sub: '', team, riotId: '' });

	LIVE.defaults = {
		liveLowerThird: { left: LIVE.slotDefault(), right: LIVE.slotDefault() },
		liveTicker: {
			visible: false,
			partners: true,
			speed: 90, // px / seconde
			messages: [
				'Bienvenue sur la KB SERIES — édition spéciale Epitech',
				'Suivez le tournoi sur #KBSERIES',
				'Finales en présentiel au Campus KB — Le Kremlin-Bicêtre',
			],
		},
		// Écran 50/50 = scène dédiée (pas de "visible") ; info = bandeau match en cours en bas au centre
		liveDualCam: { left: LIVE.camLabelDefault('A'), right: LIVE.camLabelDefault('B'), info: true, infoText: '' },
	};

	/** Migration de l'ancien format { visible, title, ... } → { left, right } */
	LIVE.normalizeLowerThird = (v) => {
		if (!v || typeof v !== 'object') return JSON.parse(JSON.stringify(LIVE.defaults.liveLowerThird));
		if (v.left || v.right) return { left: { ...LIVE.slotDefault(), ...(v.left || {}) }, right: { ...LIVE.slotDefault(), ...(v.right || {}) } };
		const old = {};
		for (const k of Object.keys(LIVE.slotDefault())) if (v[k] !== undefined) old[k] = v[k];
		return { left: { ...LIVE.slotDefault(), ...old }, right: LIVE.slotDefault() };
	};

	LIVE.styles = {
		standard: { label: 'Standard', kicker: 'KB SERIES' },
		gold: { label: 'Annonce dorée', kicker: 'ANNONCE' },
		alert: { label: 'Alerte rouge', kicker: 'ALERTE' },
	};

	// ---------- Presets de lower third ----------
	// liveLowerThirdPresets = [{ id, name, style, kicker, title, subtitle, source, casterIndex, duration }]
	LIVE.presetFields = ['style', 'kicker', 'title', 'subtitle', 'source', 'casterIndex', 'duration'];
	LIVE.defaults.liveLowerThirdPresets = [];
	LIVE.newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	/** Contenu d'un preset (sans id/name) → champs d'un slot */
	LIVE.presetContent = (p) => {
		const o = {};
		for (const k of LIVE.presetFields) o[k] = p[k] !== undefined ? p[k] : LIVE.slotDefault()[k];
		return o;
	};

	/** Presets automatiques (non modifiables) : chaque caster, pause technique, prochain match. KB = window.KB */
	LIVE.autoPresets = (KB) => {
		const out = [];
		((KB.rep.casters.value) || []).forEach((c, i) => out.push({
			id: 'auto:caster:' + i, auto: true, name: 'Caster : ' + (c.name || i + 1),
			style: 'standard', kicker: 'Caster', title: c.name || '', subtitle: c.handle || '', source: 'caster', casterIndex: i, duration: 0,
		}));
		out.push({ id: 'auto:pause', auto: true, name: 'Pause technique', style: 'alert', kicker: '', title: 'Pause technique', subtitle: 'Reprise dans quelques instants', source: 'custom', casterIndex: 0, duration: 0 });
		out.push({ id: 'auto:next', auto: true, name: 'Prochain match', style: 'gold', kicker: 'Prochain match', ...LIVE.nextMatchText(KB), source: 'custom', casterIndex: 0, duration: 0 });
		return out;
	};

	LIVE.nextMatchText = (KB) => {
		const sched = KB.rep.schedule.value || [];
		const m = KB.rep.match.value || {};
		const next = sched.find((x) => x.status === 'upcoming');
		if (next) {
			const a = KB.team(next.teamA), b = KB.team(next.teamB);
			const vs = a || b ? `${a ? a.name : 'À définir'} vs ${b ? b.name : 'À définir'}` : next.label;
			return { title: vs, subtitle: [next.label !== vs ? next.label : '', next.time ? 'à ' + next.time : ''].filter(Boolean).join(' · ') };
		}
		const a = KB.team(m.teamA), b = KB.team(m.teamB);
		return { title: a && b ? `${a.name} vs ${b.name}` : 'Prochain match', subtitle: m.stage || '' };
	};

	/**
	 * Trous caméra de graphics/dual-cam.html, en px sur 1920×1080 (coins coupés haut-gauche / bas-droit, coupe = cut px).
	 * Chaque trou occupe une moitié d'écran (ratio ~1:1 : la webcam est recadrée dans OBS).
	 */
	LIVE.dualFrames = [
		{ x: 40, y: 40, w: 900, h: 860, cut: 30 },
		{ x: 980, y: 40, w: 900, h: 860, cut: 30 },
	];

	if (typeof module !== 'undefined' && module.exports) module.exports = LIVE;
	else root.LIVE = LIVE;
})(this);
