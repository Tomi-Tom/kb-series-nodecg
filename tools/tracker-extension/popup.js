// Popup de l'extension : état de la file d'import + derniers résultats + lien vers la régie
const $ = (id) => document.getElementById(id);
// Élément DOM avec du texte (jamais de HTML construit à partir des données reçues)
const el = (tag, text, className) => {
	const e = document.createElement(tag);
	if (text != null) e.textContent = String(text);
	if (className) e.className = className;
	return e;
};
const DEFAULT_ORIGIN = 'http://localhost:9090';

$('ver').textContent = 'Version ' + chrome.runtime.getManifest().version + ' · import en 1 clic depuis le panneau Équipes & Joueurs';

let regieOrigin = DEFAULT_ORIGIN;

async function render() {
	const { state } = await chrome.storage.session.get('state').catch(() => ({}));
	const s = state || { running: null, queued: 0, log: [] };
	$('qDot').className = 'dot' + (s.running ? ' busy' : '');
	$('queue').textContent = s.running
		? `Import en cours : ${s.running}${s.queued ? ` (+${s.queued} en attente)` : ''}`
		: 'Aucun import en cours';
	const items = (s.log || []).map((l) => {
		const time = new Date(l.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
		const li = el('li');
		li.append(el('b', l.riotId ?? ''), ' ', el('span', l.ok ? '✔' : '✖', l.ok ? 'ok' : 'err'), ' ',
			el('small', `${(l.ok ? 'Importé' : l.message) ?? ''} · ${time}`));
		return li;
	});
	$('log').replaceChildren(...(items.length ? items : [el('li', 'Aucun import pour l\'instant.', 'empty')]));
}

async function checkNodecg() {
	const { lastOrigin } = await chrome.storage.local.get('lastOrigin').catch(() => ({}));
	regieOrigin = lastOrigin || DEFAULT_ORIGIN;
	const host = regieOrigin.replace(/^https?:\/\//, '');
	try {
		const r = await fetch(regieOrigin + '/valorant-tournament/tracker-status', { cache: 'no-store' });
		const j = await r.json();
		if (!j.ok) throw new Error();
		$('ncgDot').className = 'dot on';
		$('ncg').textContent = 'Régie NodeCG joignable · ' + host;
	} catch {
		$('ncgDot').className = 'dot err';
		$('ncg').textContent = 'Régie injoignable (' + host + ') : NodeCG est lancé ?';
	}
}

$('open').onclick = () => chrome.tabs.create({ url: regieOrigin + '/dashboard/' });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'session' && changes.state) render(); });
render();
checkNodecg();
