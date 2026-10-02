// Replicants « coeur » partagés par toutes les parties : tournoi, équipes, match, veto, joueurs, casters,
// planning, compte à rebours, scène de fond, déclencheur de transition, cache des données Valorant.
// Valeurs par défaut et description des formes : shared/defaults.js (source unique, lue aussi par les pages).
// Message : 'valorantData:refresh' → recharge maps et agents depuis valorant-api.com → { maps, agents } (nombres)
const D = require('../shared/defaults.js');

module.exports = function (nodecg, listen) {
	// Profils importés de tracker.gg (forme : extension/tracker.js, normalize)
	const profiles = nodecg.Replicant('playerProfiles', { defaultValue: D.playerProfiles() });

	// Supprime les profils de démo générés par une ancienne version du bundle
	if (Object.values(profiles.value || {}).some((p) => p && p.demo)) {
		profiles.value = Object.fromEntries(Object.entries(profiles.value).filter(([, p]) => !(p && p.demo)));
	}

	for (const name of ['tournament', 'teams', 'match', 'veto', 'casters', 'schedule', 'countdown', 'streamScene', 'transition']) {
		nodecg.Replicant(name, { defaultValue: D[name]() });
	}

	// Fiches joueurs saisies à la main (priment sur tracker.gg). Lecture fusionnée côté pages : KB.player(riotId)
	const playerData = nodecg.Replicant('playerData', { defaultValue: D.playerData() });
	// Migration : anciennes photos (replicant playerPhotos) -> playerData[key].photo
	const oldPhotos = nodecg.Replicant('playerPhotos', { defaultValue: {} });
	const ph = oldPhotos.value || {};
	if (Object.keys(ph).length) {
		const next = { ...(playerData.value || {}) };
		for (const [k, url] of Object.entries(ph)) next[k] = { ...(next[k] || {}), photo: (next[k] && next[k].photo) || url };
		playerData.value = next;
		oldPhotos.value = {};
	}

	// Données Valorant (maps, agents) récupérées sur valorant-api.com et persistées pour fonctionner hors-ligne
	const valorantData = nodecg.Replicant('valorantData', { defaultValue: D.valorantData() });

	const getJson = async (url) => {
		const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!r.ok) throw new Error(`valorant-api.com a répondu ${r.status}`);
		const j = await r.json();
		if (!j || !Array.isArray(j.data)) throw new Error('réponse inattendue de valorant-api.com');
		return j.data;
	};

	async function refreshValorantData() {
		const [maps, agents] = await Promise.all([
			getJson('https://valorant-api.com/v1/maps'),
			getJson('https://valorant-api.com/v1/agents?isPlayableCharacter=true'),
		]);
		const m = {};
		for (const x of maps) {
			if (!x || !x.tacticalDescription) continue; // ignore les maps hors compétitif (TDM, range...)
			m[x.displayName] = {
				uuid: x.uuid,
				name: x.displayName,
				sites: x.tacticalDescription,
				coordinates: x.coordinates,
				splash: x.splash,
				minimap: x.displayIcon,
				listView: x.listViewIcon,
				listViewTall: x.listViewIconTall,
				stylized: x.stylizedBackgroundImage,
				premier: x.premierBackgroundImage,
			};
		}
		const a = {};
		for (const x of agents) {
			if (!x || !x.displayName) continue;
			a[x.displayName] = {
				uuid: x.uuid,
				name: x.displayName,
				role: x.role && x.role.displayName,
				roleIcon: x.role && x.role.displayIcon,
				icon: x.displayIcon,
				bust: x.bustPortrait,
				portrait: x.fullPortrait,
				killfeed: x.killfeedPortrait,
				background: x.background,
				colors: x.backgroundGradientColors,
			};
		}
		const counts = { maps: Object.keys(m).length, agents: Object.keys(a).length };
		// Une réponse partielle ne doit pas vider le cache qui fait marcher les overlays hors-ligne
		if (!counts.maps || !counts.agents) throw new Error(`réponse incomplète de valorant-api.com (${counts.maps} maps, ${counts.agents} agents) : cache conservé`);
		valorantData.value = { maps: m, agents: a, updatedAt: Date.now() };
		nodecg.log.info(`valorant-api : ${counts.maps} maps, ${counts.agents} agents`);
		return counts;
	}
	refreshValorantData().catch((e) => nodecg.log.warn('valorant-api indisponible, on garde les données en cache :', e.message));

	listen('valorantData:refresh', () => refreshValorantData());
};
