// État partagé du tournoi : déclaration de TOUS les replicants "coeur" avec leurs valeurs par défaut.
// Les graphics et panneaux lisent/écrivent ces replicants ; voir docs/DATA.md pour le détail des formes.

// Pool de maps compétitif actuel (modifiable depuis le panneau Match)
const DEFAULT_POOL = ['Abyss', 'Ascent', 'Bind', 'Corrode', 'Haven', 'Lotus', 'Sunset'];

module.exports = function (nodecg) {
	// Infos générales du tournoi (reprises de l'affiche)
	const profiles = nodecg.Replicant('playerProfiles', { defaultValue: {} });

	// Supprime les profils de démo générés par une ancienne version de demo:seed
	if (Object.values(profiles.value || {}).some((p) => p.demo)) {
		profiles.value = Object.fromEntries(Object.entries(profiles.value).filter(([, p]) => !p.demo));
	}

	nodecg.Replicant('tournament', {
		defaultValue: {
			name: 'KB SERIES',
			edition: 'Édition spéciale Epitech',
			presentedBy: 'CYCOM',
			subtitle: 'Tournoi Valorant 5v5',
			dates: '31/10 & 14/11',
			location: 'Campus KB · Le Kremlin-Bicêtre',
			hashtag: '#KBSERIES',
			socials: '',
		},
	});

	// Équipes : { [id]: { id, name, tag, logo, color, players: [{ riotId, role }] } }
	//   - logo : URL (asset NodeCG "team-logos" ou lien externe), peut être vide
	//   - players[].riotId : "Pseudo#TAG", clé en minuscules dans playerProfiles
	nodecg.Replicant('teams', { defaultValue: {} });

	// Match en cours
	nodecg.Replicant('match', {
		defaultValue: {
			stage: 'Phase de groupes',          // libellé libre : "Quart de finale", "Grande finale"...
			format: 'bo3',                     // bo1 | bo3 | bo5
			teamA: null,                       // id d'équipe (clé de `teams`)
			teamB: null,
			swap: false,                       // inverse gauche/droite à l'écran
			currentMap: 0,                     // index dans maps[]
			maps: [
				// { map: 'Ascent', pickedBy: 'A'|'B'|'decider'|null, scoreA: 0, scoreB: 0, winner: null|'A'|'B', status: 'upcoming'|'live'|'done' }
			],
		},
	});

	// Veto des maps : liste d'étapes jouées dans l'ordre
	nodecg.Replicant('veto', {
		defaultValue: {
			pool: DEFAULT_POOL,
			steps: [
				// { action: 'ban'|'pick'|'decider', team: 'A'|'B'|null, map: null|'Ascent', side: null|'attack'|'defense', sideTeam: null|'A'|'B' }
			],
		},
	});

	// Données joueurs saisies à la main (priment sur tracker.gg). Clé = riotId en minuscules.
	// { [key]: { riotId, displayName, realName, photo, overrides: { rank: {name, icon}|null, peak: {name, icon}|null,
	//            stats: { kd: '1.10', acs: '230', adr, hs, kast, winPct, matches, firstBloods, ... (chaînes affichées) },
	//            agents: ['Jett', 'Raze', 'Omen'] /* agents favoris, remplace le top tracker */ } } }
	// Agents joués pendant le match : match.maps[i].picks = { [key]: 'Jett' } (champ optionnel)
	// Lecture fusionnée côté pages : KB.player(riotId) (shared/kb.js)
	const playerData = nodecg.Replicant('playerData', { defaultValue: {} });
	// Migration : anciennes photos (replicant playerPhotos) -> playerData[key].photo
	const oldPhotos = nodecg.Replicant('playerPhotos', { defaultValue: {} });
	const ph = oldPhotos.value || {};
	if (Object.keys(ph).length) {
		const next = { ...(playerData.value || {}) };
		for (const [k, url] of Object.entries(ph)) next[k] = { ...(next[k] || {}), photo: (next[k] && next[k].photo) || url };
		playerData.value = next;
		oldPhotos.value = {};
	}

	// Casters / présentateurs
	nodecg.Replicant('casters', { defaultValue: [{ name: 'Caster 1', handle: '' }, { name: 'Caster 2', handle: '' }] });

	// Planning de la journée : [{ time: '10:00', label: 'Groupe A', teamA: id|null, teamB: id|null, status: 'upcoming'|'live'|'done', scoreA, scoreB }]
	nodecg.Replicant('schedule', { defaultValue: [] });

	// Compte à rebours partagé (écrans d'attente / pause) : endsAt = timestamp ms, ou null
	nodecg.Replicant('countdown', { defaultValue: { endsAt: null, label: 'Le stream commence dans' } });

	// Page maîtresse graphics/stream.html : scène de fond affichée (une seule source OBS pour tout)
	// scene : 'none' (jeu) | 'starting' | 'brb' | 'ending' | 'schedule' | 'dual-cam' ; via : 'cut' | 'fade' | 'stinger'
	nodecg.Replicant('streamScene', { defaultValue: { scene: 'none', via: 'cut', at: 0 } });

	// Déclencheur de transition plein écran (stinger) : on écrit { at: Date.now(), map: 'Ascent'|null }
	nodecg.Replicant('transition', { defaultValue: { at: 0, map: null } });

	// Données Valorant (maps, agents) récupérées sur valorant-api.com et persistées pour fonctionner hors-ligne
	const valorantData = nodecg.Replicant('valorantData', { defaultValue: { maps: {}, agents: {}, updatedAt: 0 } });

	async function refreshValorantData() {
		try {
			const [maps, agents] = await Promise.all([
				fetch('https://valorant-api.com/v1/maps').then((r) => r.json()),
				fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true').then((r) => r.json()),
			]);
			const m = {};
			for (const x of maps.data) {
				if (!x.tacticalDescription) continue; // ignore les maps hors compétitif (TDM, range...)
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
			for (const x of agents.data) {
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
			valorantData.value = { maps: m, agents: a, updatedAt: Date.now() };
			nodecg.log.info(`valorant-api : ${Object.keys(m).length} maps, ${Object.keys(a).length} agents`);
		} catch (e) {
			nodecg.log.warn('valorant-api indisponible, on garde les données en cache :', e.message);
		}
	}
	refreshValorantData();

	// Données de démo pour tester les overlays : nodecg.sendMessage('demo:seed') depuis un panneau
	nodecg.listenFor('demo:seed', (_, ack) => {
		const names = [
			['Epitech Eclipse', 'EPX', '#3b8fe6'], ['Kremlin Kings', 'KK', '#f5c445'], ['Nova Rift', 'NVR', '#9b5cff'],
			['Cycom Raiders', 'CYR', '#ff9a3c'], ['Bicêtre Blaze', 'BB', '#ff4655'], ['Pasteur Phantoms', 'PPH', '#3ddc97'],
			['Orbit Five', 'OR5', '#5ec4ff'], ['Starfall', 'SF', '#c9b274'],
		];
		// Seul vrai joueur fourni : Elysira#7w7 (dans Epitech Eclipse). Aucun faux joueur ni faux profil n'est créé.
		const teams = {};
		names.forEach(([name, tag, color]) => {
			const id = tag.toLowerCase();
			const players = id === 'epx' ? [{ riotId: 'Elysira#7w7', role: 'Initiator' }] : [];
			teams[id] = { id, name, tag, color, logo: '', players };
		});
		// Nettoie d'anciens profils de démo éventuels
		profiles.value = Object.fromEntries(Object.entries(profiles.value || {}).filter(([, p]) => !p.demo));
		nodecg.Replicant('teams').value = teams;
		nodecg.Replicant('match').value = {
			stage: 'Demi-finale', format: 'bo3', teamA: 'epx', teamB: 'kk', swap: false, currentMap: 1,
			maps: [
				{ map: 'Lotus', pickedBy: 'A', scoreA: 13, scoreB: 9, winner: 'A', status: 'done' },
				{ map: 'Haven', pickedBy: 'B', scoreA: 7, scoreB: 5, winner: null, status: 'live' },
				{ map: 'Ascent', pickedBy: 'decider', scoreA: 0, scoreB: 0, winner: null, status: 'upcoming' },
			],
		};
		nodecg.Replicant('veto').value = {
			pool: DEFAULT_POOL,
			steps: [
				{ action: 'ban', team: 'A', map: 'Bind' }, { action: 'ban', team: 'B', map: 'Abyss' },
				{ action: 'pick', team: 'A', map: 'Lotus', sideTeam: 'B', side: 'defense' }, { action: 'pick', team: 'B', map: 'Haven', sideTeam: 'A', side: 'attack' },
				{ action: 'ban', team: 'A', map: 'Sunset' }, { action: 'ban', team: 'B', map: 'Corrode' },
				{ action: 'decider', team: null, map: 'Ascent', sideTeam: 'A', side: 'defense' },
			],
		};
		nodecg.Replicant('casters').value = [{ name: 'Tom', handle: '@tom_cast' }, { name: 'Léa', handle: '@lea_valo' }];
		nodecg.Replicant('schedule').value = [
			{ time: '10:00', label: 'Quart de finale 1', teamA: 'epx', teamB: 'pph', status: 'done', scoreA: 2, scoreB: 0 },
			{ time: '11:30', label: 'Quart de finale 2', teamA: 'kk', teamB: 'or5', status: 'done', scoreA: 2, scoreB: 1 },
			{ time: '14:00', label: 'Demi-finale 1', teamA: 'epx', teamB: 'kk', status: 'live', scoreA: 1, scoreB: 0 },
			{ time: '15:30', label: 'Demi-finale 2', teamA: 'nvr', teamB: 'cyr', status: 'upcoming' },
			{ time: '17:00', label: 'Petite finale', teamA: null, teamB: null, status: 'upcoming' },
			{ time: '18:30', label: 'Grande finale', teamA: null, teamB: null, status: 'upcoming' },
		];
		nodecg.Replicant('countdown').value = { endsAt: Date.now() + 10 * 60 * 1000, label: 'Le stream commence dans' };
		nodecg.log.info('Données de démo chargées');
		if (ack && !ack.handled) ack(null);
	});
	nodecg.listenFor('valorantData:refresh', (_, ack) => refreshValorantData().then(() => ack && !ack.handled && ack(null)));
};

module.exports.DEFAULT_POOL = DEFAULT_POOL;
