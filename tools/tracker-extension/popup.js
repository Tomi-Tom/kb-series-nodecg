// Popup de l'extension : état de la file d'import + derniers résultats + lien vers la régie
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DEFAULT_ORIGIN = 'http://localhost:9090';

$('ver').textContent = 'Version ' + chrome.runtime.getManifest().version + ' · import en 1 clic depuis le panneau Joueurs';

let origin = DEFAULT_ORIGIN;

async function render() {
	const { state } = await chrome.storage.session.get('state').catch(() => ({}));
	const s = state || { running: null, queued: 0, log: [] };
	$('qDot').className = 'dot' + (s.running ? ' busy' : '');
	$('queue').textContent = s.running
		? `Import en cours : ${s.running}${s.queued ? ` (+${s.queued} en attente)` : ''}`
		: 'Aucun import en cours';
	$('log').innerHTML = (s.log || []).length
		? s.log.map((l) => `<li><b>${esc(l.riotId)}</b> <span class="${l.ok ? 'ok' : 'err'}">${l.ok ? '✔' : '✖'}</span>
			<small>${esc(l.ok ? 'Importé' : l.message)} · ${new Date(l.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></li>`).join('')
		: '<li class="empty">Aucun import pour l\'instant.</li>';
}

async function checkNodecg() {
	const { lastOrigin } = await chrome.storage.local.get('lastOrigin').catch(() => ({}));
	origin = lastOrigin || DEFAULT_ORIGIN;
	try {
		const r = await fetch(origin + '/valorant-tournament/tracker-status', { cache: 'no-store' });
		const j = await r.json();
		if (!j.ok) throw new Error();
		$('ncgDot').className = 'dot on';
		$('ncg').textContent = 'Régie NodeCG joignable · ' + origin.replace(/^https?:\/\//, '');
	} catch {
		$('ncgDot').className = 'dot err';
		$('ncg').textContent = 'Régie injoignable (' + origin.replace(/^https?:\/\//, '') + ') : NodeCG est lancé ?';
	}
}

$('open').onclick = () => chrome.tabs.create({ url: origin + '/dashboard/' });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'session' && changes.state) render(); });
render();
checkNodecg();
