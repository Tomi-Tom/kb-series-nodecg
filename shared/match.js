// Partie "match" : constantes et helpers partagés (serveur + navigateur).
// Navigateur : <script src="../shared/match.js"></script> après kb.js -> window.KBMatch
// Node       : require('../shared/match.js')
(function (root) {
	const VETO_PRESETS = {
		bo1: [
			{ action: 'ban', team: 'A' }, { action: 'ban', team: 'B' }, { action: 'ban', team: 'A' },
			{ action: 'ban', team: 'B' }, { action: 'ban', team: 'A' }, { action: 'ban', team: 'B' },
			{ action: 'decider', team: null },
		],
		bo3: [
			{ action: 'ban', team: 'A' }, { action: 'ban', team: 'B' }, { action: 'pick', team: 'A' }, { action: 'pick', team: 'B' },
			{ action: 'ban', team: 'A' }, { action: 'ban', team: 'B' }, { action: 'decider', team: null },
		],
		bo5: [
			{ action: 'ban', team: 'A' }, { action: 'ban', team: 'B' }, { action: 'pick', team: 'A' }, { action: 'pick', team: 'B' },
			{ action: 'pick', team: 'A' }, { action: 'pick', team: 'B' }, { action: 'decider', team: null },
		],
	};

	const MATCH_DEFAULTS = {
		matchGraphics: { versus: { visible: false }, veto: { visible: false }, vetoRecap: { visible: false } },
		// format = préréglage choisi ; sequence = étapes prévues (modifiables)
		matchVeto: { format: 'bo3', sequence: VETO_PRESETS.bo3 },
	};

	const STAGES = ['Phase de groupes', 'Quart de finale', 'Demi-finale', 'Petite finale', 'Grande finale'];
	const ACTION_FR = { ban: 'Ban', pick: 'Pick', decider: 'Decider' };
	const SIDE_FR = { attack: 'Attaque', defense: 'Défense' };

	/** Une étape pick/decider attend-elle un choix de côté ? */
	const needsSide = (step) => !!step && (step.action === 'pick' || step.action === 'decider') && !!step.map && !step.side;

	/**
	 * État courant du veto : { index, next (étape prévue suivante | null), pendingSide (index d'étape | -1), done, used: Set }
	 */
	function vetoState(veto, sequence) {
		const steps = (veto && veto.steps) || [];
		const seq = sequence || [];
		const used = new Set(steps.map((s) => s.map).filter(Boolean));
		let pendingSide = -1;
		steps.forEach((s, i) => { if (needsSide(s)) pendingSide = i; });
		const next = steps.length < seq.length ? seq[steps.length] : null;
		return { index: steps.length, next, pendingSide, done: !next && pendingSide < 0, used };
	}

	const other = (k) => (k === 'A' ? 'B' : k === 'B' ? 'A' : null);

	/** Équipe qui choisit le côté par défaut : l'adversaire du picker ; pour le decider, l'adversaire de l'auteur de l'étape précédente. */
	function defaultSideTeam(steps, i) {
		const s = steps[i];
		if (!s) return 'A';
		if (s.action === 'pick') return other(s.team) || 'A';
		const prev = steps[i - 1];
		return other(prev && prev.team) || 'A';
	}


	// Replicants de la partie (navigateur), déclarés une seule fois avec leur valeur par défaut
	const clone = (v) => JSON.parse(JSON.stringify(v));
	const reps = {};
	const declare = (name) => (reps[name] ||= root.nodecg.Replicant(name, { defaultValue: clone(MATCH_DEFAULTS[name]) }));
	/** Replicant matchGraphics (visibilité de versus, veto, veto-recap). Ex. KBMatch.gfx().value.veto.visible */
	const gfx = () => declare('matchGraphics');
	/** Replicant matchVeto (déroulé prévu du veto : { format, sequence }) */
	const vetoPlan = () => declare('matchVeto');

	const api = { gfx, vetoPlan, VETO_PRESETS, MATCH_DEFAULTS, STAGES, ACTION_FR, SIDE_FR, needsSide, vetoState, other, defaultSideTeam };
	if (typeof module !== 'undefined' && module.exports) module.exports = api;
	else root.KBMatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
