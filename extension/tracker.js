// Import des stats joueur depuis tracker.gg
//
// tracker.gg bloque les requêtes serveur (Cloudflare, 403). On récupère donc le JSON
// depuis le navigateur de l'utilisateur (favori "bookmarklet" sur la page du profil,
// ou copier-coller), puis on l'envoie ici pour le normaliser et le stocker.
const fs = require('fs');
const path = require('path');
const express = require('express');

const API = 'https://api.tracker.gg/api/v2/valorant/standard/profile/riot/';
const VAPI = 'https://media.valorant-api.com';

// "https://tracker.gg/valorant/profile/riot/Elysira%237w7/overview" ou "Elysira#7w7" -> "Elysira#7w7"
function parseRiotId(input) {
	if (!input) return null;
	let s = String(input).trim();
	const m = s.match(/profile\/riot\/([^/?#]+)/i);
	if (m) s = m[1];
	try { s = decodeURIComponent(s); } catch { /* déjà décodé */ }
	return /^.+#.+$/.test(s) ? s : null;
}

const dv = (stat) => (stat ? stat.displayValue : null);
const num = (stat) => (stat && typeof stat.value === 'number' ? stat.value : null);
const pct = (stat) => (stat && typeof stat.percentile === 'number' ? stat.percentile : null);
const uuidFrom = (url) => (url && url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [null])[0];

function normalize(raw, playlist = 'competitive') {
	const d = raw && raw.data;
	if (!d || !Array.isArray(d.segments)) {
		const msg = raw && raw.errors && raw.errors[0] && raw.errors[0].message;
		throw new Error(msg || 'JSON tracker.gg invalide (pas de "data.segments")');
	}
	const info = d.platformInfo || {};
	const riotId = info.platformUserHandle || info.platformUserIdentifier;
	const [name, tag] = String(riotId).split('#');
	const segs = d.segments;
	const inPlaylist = (s) => !s.attributes || !s.attributes.playlist || s.attributes.playlist === playlist;

	const season = segs.find((s) => s.type === 'season' && s.attributes.playlist === playlist)
		|| segs.find((s) => s.type === 'season');
	if (!season) throw new Error(`Aucune stat de saison trouvée (profil privé ou aucune partie en ${playlist} ?)`);
	const st = season.stats;
	const peakSeg = segs.find((s) => s.type === 'peak-rating' && inPlaylist(s));
	const peakStat = peakSeg && (peakSeg.stats.peakRating || Object.values(peakSeg.stats)[0]);

	const statKeys = {
		matches: 'matchesPlayed', wins: 'matchesWon', losses: 'matchesLost', winPct: 'matchesWinPct',
		kd: 'kDRatio', kda: 'kDARatio', acs: 'scorePerRound', adr: 'damagePerRound', hs: 'headshotsPercentage',
		kast: 'kAST', kills: 'kills', deaths: 'deaths', assists: 'assists', killsPerRound: 'killsPerRound',
		firstBloods: 'firstBloods', firstDeaths: 'firstDeaths', clutches: 'clutches', aces: 'aces', mvps: 'mVPs',
		mostKills: 'mostKillsInMatch', timePlayed: 'timePlayed', trn: 'trnPerformanceScore',
	};
	const stats = {};
	for (const [k, key] of Object.entries(statKeys)) {
		stats[k] = { display: dv(st[key]), value: num(st[key]), percentile: pct(st[key]) };
	}

	const agents = segs
		.filter((s) => s.type === 'agent' && inPlaylist(s))
		.sort((a, b) => (num(b.stats.timePlayed) || 0) - (num(a.stats.timePlayed) || 0))
		.map((s) => {
			const id = s.attributes.key;
			return {
				id,
				name: s.metadata.name,
				role: s.metadata.role,
				color: s.metadata.color,
				icon: s.metadata.imageUrl,
				portrait: `${VAPI}/agents/${id}/fullportrait.png`,
				bust: `${VAPI}/agents/${id}/bustportrait.png`,
				matches: dv(s.stats.matchesPlayed),
				winPct: dv(s.stats.matchesWinPct),
				kd: dv(s.stats.kDRatio),
				adr: dv(s.stats.damagePerRound),
				acs: dv(s.stats.scorePerRound),
				timePlayed: dv(s.stats.timePlayed),
			};
		});

	const maps = segs
		.filter((s) => s.type === 'map' && inPlaylist(s))
		.sort((a, b) => (num(b.stats.matchesPlayed) || 0) - (num(a.stats.matchesPlayed) || 0))
		.map((s) => {
			const key = s.attributes.key;
			const top = segs.find((t) => t.type === 'map-top-agent' && inPlaylist(t) && t.attributes.mapKey === key);
			return {
				key,
				name: s.metadata.name,
				image: s.metadata.imageUrl,
				matches: dv(s.stats.matchesPlayed),
				matchesValue: num(s.stats.matchesPlayed),
				wins: num(s.stats.matchesWon),
				losses: num(s.stats.matchesLost),
				winPct: dv(s.stats.matchesWinPct),
				winValue: num(s.stats.matchesWinPct),
				roundsWinPct: dv(s.stats.roundsWinPct),
				attackWinPct: dv(s.stats.attackRoundsWinPct),
				defenseWinPct: dv(s.stats.defenseRoundsWinPct),
				kd: dv(s.stats.kDRatio),
				acs: dv(s.stats.scorePerRound),
				adr: dv(s.stats.damagePerRound),
				hs: dv(s.stats.headshotsPercentage),
				topAgent: top ? {
					name: top.metadata.name,
					icon: top.metadata.imageUrl,
					color: top.metadata.color,
					matches: dv(top.stats.matchesPlayed),
					winPct: dv(top.stats.matchesWinPct),
				} : null,
			};
		});

	const weapons = segs
		.filter((s) => s.type === 'weapon' && inPlaylist(s))
		.sort((a, b) => (num(b.stats.kills) || 0) - (num(a.stats.kills) || 0))
		.slice(0, 5)
		.map((s) => ({
			name: s.metadata.name,
			image: s.metadata.imageUrl,
			kills: dv(s.stats.kills),
			hs: dv(s.stats.headshotsPercentage),
		}));

	const cardId = uuidFrom(info.avatarUrl);
	return {
		id: String(riotId).toLowerCase(),
		riotId,
		name,
		tag,
		level: d.metadata && d.metadata.accountLevel,
		privacy: d.metadata && d.metadata.privacy,
		card: cardId ? {
			small: `${VAPI}/playercards/${cardId}/smallart.png`,
			wide: `${VAPI}/playercards/${cardId}/wideart.png`,
			large: `${VAPI}/playercards/${cardId}/largeart.png`,
		} : null,
		avatar: info.avatarUrl,
		playlist,
		season: season.metadata && season.metadata.name,
		rank: st.rank ? { name: (st.rank.metadata && st.rank.metadata.tierName) || st.rank.displayValue, icon: st.rank.metadata && st.rank.metadata.iconUrl } : null,
		peak: peakStat ? { name: (peakStat.metadata && peakStat.metadata.tierName) || peakStat.displayValue, icon: peakStat.metadata && peakStat.metadata.iconUrl, act: peakStat.metadata && peakStat.metadata.actName } : null,
		stats,
		agents,
		maps,
		weapons,
		trackerUrl: `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(riotId)}/overview`,
		fetchedAt: Date.now(),
	};
}

module.exports = function (nodecg) {
	const profiles = nodecg.Replicant('playerProfiles', { defaultValue: {} });
	nodecg.Replicant('playerStatsGraphic', { defaultValue: { playerId: null, visible: false } });

	function store(raw, playlist) {
		const p = normalize(raw, playlist);
		// Garde le JSON brut pour pouvoir re-normaliser plus tard sans ré-importer
		try {
			const dir = path.join(process.cwd(), 'db', 'tracker');
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, p.id.replace(/[^a-z0-9_-]/gi, '_') + '.json'), JSON.stringify(raw));
		} catch (e) { nodecg.log.warn('Sauvegarde JSON brut impossible :', e.message); }
		profiles.value = { ...profiles.value, [p.id]: p };
		nodecg.log.info(`Stats importées : ${p.riotId} (${p.stats.matches.display} matchs)`);
		return p;
	}

	// Import depuis le dashboard (copier-coller du JSON)
	nodecg.listenFor('tracker:importJson', (payload, ack) => {
		try {
			const p = store(typeof payload.json === 'string' ? JSON.parse(payload.json) : payload.json, payload.playlist);
			if (ack && !ack.handled) ack(null, p.id);
		} catch (e) {
			if (ack && !ack.handled) ack(e.message);
		}
	});

	// Tentative de récupération côté serveur (souvent bloquée par Cloudflare, mais on essaie)
	nodecg.listenFor('tracker:fetch', async (payload, ack) => {
		const riotId = parseRiotId(payload.input);
		try {
			if (!riotId) throw new Error('Riot ID ou lien tracker.gg invalide (format attendu : Pseudo#TAG)');
			const res = await fetch(API + encodeURIComponent(riotId), {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
					Accept: 'application/json',
				},
			});
			// Erreur "BLOCKED:" reconnue par le panneau : il ouvre alors la page tracker.gg pour l'import via le favori
			if (res.status === 403 || res.status === 429) throw new Error(`BLOCKED:${riotId}`);
			const json = await res.json();
			const p = store(json, payload.playlist);
			if (ack && !ack.handled) ack(null, p.id);
		} catch (e) {
			if (ack && !ack.handled) ack(e.message);
		}
	});

	// Endpoint appelé par le favori depuis la page tracker.gg (cross-origin -> CORS + Private Network Access)
	const router = express.Router();
	router.use('/valorant-tournament/tracker-import', (req, res, next) => {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
		res.set('Access-Control-Allow-Headers', 'Content-Type');
		res.set('Access-Control-Allow-Private-Network', 'true');
		if (req.method === 'OPTIONS') return res.sendStatus(204);
		next();
	});
	// Envoyé en text/plain : le body-parser JSON global de NodeCG limite la taille à 100 ko
	router.post('/valorant-tournament/tracker-import', express.text({ type: '*/*', limit: '20mb' }), (req, res) => {
		// Serveur en ligne avec mot de passe (cfg/nodecg.js) : import réservé aux personnes connectées à la régie
		const loginOn = nodecg.config && nodecg.config.login && nodecg.config.login.enabled;
		if (loginOn && !req.user) return res.status(401).json({ ok: false, error: 'Connecte-toi à la régie NodeCG (même navigateur) puis réessaie.' });
		try {
			const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
			const p = store(body, req.query.playlist || 'competitive');
			res.json({ ok: true, id: p.id, riotId: p.riotId });
		} catch (e) {
			res.status(400).json({ ok: false, error: e.message });
		}
	});
	// Petite fenêtre ouverte par le favori : reçoit le JSON par postMessage puis le POST en same-origin
	// (évite le blocage "Local Network Access" de Chrome sur les requêtes https -> localhost)
	router.get('/valorant-tournament/tracker-receiver', (req, res) => {
		res.type('html').send(RECEIVER_HTML);
	});

	// --- Extension Chrome compagnon (tools/tracker-extension) ---
	const EXT_DIR = path.join(__dirname, '..', 'tools', 'tracker-extension');
	// État de la régie, lu par la popup de l'extension (cross-origin -> CORS)
	router.get('/valorant-tournament/tracker-status', (req, res) => {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Private-Network', 'true');
		let version = null;
		try { version = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8')).version; } catch { /* absent */ }
		res.json({ ok: true, bundle: 'valorant-tournament', profiles: Object.keys(profiles.value || {}).length, extension: { dir: EXT_DIR, version } });
	});
	// Guide d'installation (README de l'extension) lisible depuis le panneau Joueurs
	router.get('/valorant-tournament/tracker-extension', (req, res) => {
		let md = '';
		try { md = fs.readFileSync(path.join(EXT_DIR, 'README.md'), 'utf8'); } catch { md = '# README introuvable\n\nDossier attendu : ' + EXT_DIR; }
		res.type('html').send(readmeHtml(md, EXT_DIR));
	});
	nodecg.mount(router);
};

const RECEIVER_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>NodeCG · Import tracker.gg</title>
<style>body{margin:0;height:100vh;display:grid;place-items:center;background:#0f1923;color:#ece8e1;font:600 16px system-ui,sans-serif;text-align:center}
b{color:#ff4655}.ok{color:#3ddc97}.err{color:#ff4655}</style></head><body><div id="s">En attente des données de <b>tracker.gg</b>…</div>
<script>
const s = document.getElementById('s');
let done = false;
const ping = setInterval(() => { if (window.opener) window.opener.postMessage('ncg-ready', '*'); }, 250);
window.addEventListener('message', async (e) => {
  if (done || !e.data || e.data.type !== 'tracker-json') return;
  done = true; clearInterval(ping);
  s.textContent = 'Import en cours…';
  try {
    const r = await fetch('tracker-import?playlist=' + encodeURIComponent(e.data.playlist || 'competitive'), {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(e.data.data),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    s.innerHTML = '<span class="ok">✔ ' + j.riotId + ' importé dans NodeCG</span>';
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    s.innerHTML = '<span class="err">✖ ' + err.message + '</span>';
  }
});
setTimeout(() => { if (!done) s.innerHTML = '<span class="err">Rien reçu. Lance le favori depuis une page de profil tracker.gg.</span>'; }, 15000);
</script></body></html>`;

// Mini rendu Markdown (titres, listes, code, gras, liens) pour le README de l'extension
function readmeHtml(md, dir) {
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
	const inline = (s) => esc(s)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
	const out = [];
	let list = null, code = null;
	const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
	for (const line of md.split(/\r?\n/)) {
		if (code !== null) {
			if (/^```/.test(line)) { out.push(`<pre>${esc(code.join('\n'))}</pre>`); code = null; } else code.push(line);
			continue;
		}
		if (/^```/.test(line)) { closeList(); code = []; continue; }
		let m;
		if ((m = line.match(/^(#{1,3})\s+(.*)/))) { closeList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
		if ((m = line.match(/^\s*(\d+)\.\s+(.*)/)) || (m = line.match(/^\s*[-*]\s+(.*)/))) {
			const type = /^\s*\d+\./.test(line) ? 'ol' : 'ul';
			if (list !== type) { closeList(); out.push(`<${type}>`); list = type; }
			out.push(`<li>${inline(m[m.length - 1])}</li>`);
			continue;
		}
		if (/^>\s?/.test(line)) { closeList(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
		if (!line.trim()) { closeList(); continue; }
		closeList();
		out.push(`<p>${inline(line)}</p>`);
	}
	closeList();
	return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Extension tracker.gg · installation</title>
<style>body{margin:0 auto;max-width:760px;padding:24px 20px 60px;background:#0a0f2e;color:#f3f1ea;font:15px/1.6 'Segoe UI',system-ui,sans-serif}
h1{font-size:22px;color:#c9b274;letter-spacing:.04em}h2{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#c9b274;margin-top:28px;border-bottom:1px solid #2a3480;padding-bottom:4px}h3{font-size:14px;color:#8e9ac8}
code,pre{font-family:Consolas,monospace;background:#111845;border:1px solid #2a3480;border-radius:4px}code{padding:1px 5px}pre{padding:10px;overflow:auto}
a{color:#3b8fe6}blockquote{margin:8px 0;padding:6px 12px;border-left:3px solid #c9b274;background:rgba(201,178,116,.08)}li{margin:4px 0}
.dir{padding:10px 12px;border:1px dashed #c9b274;border-radius:6px;font-family:Consolas,monospace;user-select:all}</style></head>
<body><p class="dir" title="Dossier à sélectionner dans « Charger l'extension non empaquetée »">${esc(dir)}</p>${out.join('\n')}</body></html>`;
}

module.exports.normalize = normalize;
module.exports.parseRiotId = parseRiotId;
