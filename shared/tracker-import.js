// Import tracker.gg depuis la régie → window.KBI
// <script src="../shared/tracker-import.js"></script>  (indépendant de kb.js)
//
//   KBI.parseRiotId(input)            → 'Pseudo#TAG' | null   (input = Riot ID ou lien tracker.gg)
//   KBI.hasExtension()                → Promise<boolean>      (extension Chrome compagnon, réponse < 300 ms)
//   KBI.request(input, opts?)         → Promise<{ ok, riotId, via: 'extension'|'manual', message }>
//        opts.onStatus(msg)           : étapes de l'import par l'extension { state, message }
//        opts.playlist                : 'competitive' (défaut)
//        ⚠ à appeler directement dans le gestionnaire de clic (ouverture d'onglet autorisée en mode manuel).
//        Entrée invalide → { ok:false, riotId:null, via:null, message }.
//   KBI.requestMany(list, onProgress) → Promise<result[]>      (list = Riot IDs / liens / { riotId })
//        onProgress({ done, total, current, result?, status? })
//   KBI.trackerUrl(riotId), KBI.apiUrl(riotId), KBI.bookmarklet(origin?) (code javascript: du favori de secours)
(function () {
	const PAGE = 'kb-tracker-page';
	const EXT = 'kb-tracker-ext';
	const KBI = {};
	let seq = 0;
	let extVersion = null;
	let known = null; // null = inconnu, true/false = résultat du dernier ping
	const handlers = new Map();

	KBI.parseRiotId = (input) => {
		if (input == null) return null;
		let s = String(input).trim();
		const m = s.match(/profile\/riot\/([^/?#]+)/i);
		if (m) s = m[1];
		try { s = decodeURIComponent(s); } catch { /* déjà décodé */ }
		s = s.replace(/\s*#\s*/, '#').trim();
		return /^[^#]+#[^#]+$/.test(s) ? s : null;
	};
	KBI.trackerUrl = (riotId) => 'https://tracker.gg/valorant/profile/riot/' + encodeURIComponent(riotId) + '/overview';
	KBI.apiUrl = (riotId) => 'https://api.tracker.gg/api/v2/valorant/standard/profile/riot/' + encodeURIComponent(riotId) + '?source=web';

	/** Code du favori « ⇪ Envoyer à NodeCG » (identique à celui du panneau Stats joueur) */
	KBI.bookmarklet = (origin = location.origin) => {
		const receiver = origin + '/valorant-tournament/tracker-receiver';
		const bm = `(async()=>{const m=location.pathname.match(/profile\\/riot\\/([^/]+)/);if(!m){alert('Ouvre un profil Valorant sur tracker.gg');return}`
			+ `const pl=new URLSearchParams(location.search).get('playlist')||'competitive';`
			+ `const w=window.open('${receiver}','ncg_import','width=460,height=200');let j=null,sent=false;`
			+ `const send=()=>{if(j&&!sent&&w){sent=true;w.postMessage({type:'tracker-json',data:j,playlist:pl},'*')}};`
			+ `addEventListener('message',e=>{if(e.data==='ncg-ready')send()});`
			+ `try{j=await(await fetch('https://api.tracker.gg/api/v2/valorant/standard/profile/riot/'+m[1]+'?source=web',{credentials:'include'})).json()}catch(e){alert('Erreur tracker.gg : '+e.message)}})()`;
		return 'javascript:' + encodeURIComponent(bm);
	};

	window.addEventListener('message', (e) => {
		if (e.source !== window || !e.data || e.data.source !== EXT) return;
		const d = e.data;
		if (d.type === 'hello' || d.type === 'pong') { known = true; extVersion = d.version || extVersion; }
		const h = d.id != null && handlers.get(d.id);
		if (h) h(d);
	});

	const post = (msg) => window.postMessage({ source: PAGE, ...msg }, location.origin);

	KBI.hasExtension = () => new Promise((resolve) => {
		const id = ++seq;
		const t = setTimeout(() => { handlers.delete(id); known = false; resolve(false); }, 280);
		handlers.set(id, (d) => {
			if (d.type !== 'pong') return;
			clearTimeout(t); handlers.delete(id); known = true; extVersion = d.version || extVersion; resolve(true);
		});
		post({ id, type: 'ping' });
	});
	/** Version de l'extension détectée (ou null) */
	KBI.extensionVersion = () => extVersion;

	function viaExtension(riotId, { onStatus, playlist = 'competitive', timeout = 6 * 60 * 1000 } = {}) {
		return new Promise((resolve) => {
			const id = ++seq;
			const t = setTimeout(() => {
				handlers.delete(id);
				resolve({ ok: false, riotId, via: 'extension', message: 'Délai dépassé : aucune réponse de l\'extension (vérifie l\'onglet tracker.gg).' });
			}, timeout);
			handlers.set(id, (d) => {
				if (d.type === 'status') { if (onStatus) try { onStatus({ state: d.state, message: d.message, riotId }); } catch { /* ignore */ } return; }
				if (d.type !== 'result') return;
				clearTimeout(t); handlers.delete(id);
				resolve({ ok: !!d.ok, riotId: d.riotId || riotId, via: 'extension', message: d.message || (d.ok ? '✔ ' + riotId + ' importé' : 'Échec de l\'import') });
			});
			post({ id, type: 'import', riotId, playlist });
		});
	}

	function manual(riotId, win) {
		const url = KBI.trackerUrl(riotId);
		let w = win;
		if (w) { try { w.location.href = url; } catch { w = null; } } else w = window.open(url, '_blank');
		return {
			ok: false, riotId, via: 'manual',
			message: w
				? `Page tracker.gg de ${riotId} ouverte → clique sur le favori « ⇪ Envoyer à NodeCG » pour importer.`
				: `Le navigateur a bloqué l'ouverture : ouvre la page tracker.gg de ${riotId} puis clique sur le favori « ⇪ Envoyer à NodeCG ».`,
		};
	}

	KBI.request = async (input, opts = {}) => {
		const riotId = KBI.parseRiotId(input);
		if (!riotId) return { ok: false, riotId: null, via: null, message: 'Format attendu : Pseudo#TAG ou lien tracker.gg' };
		if (known === false) {
			// Pas d'extension au dernier ping : on ouvre l'onglet tout de suite (dans le clic, anti pop-up)
			const res = manual(riotId);
			KBI.hasExtension(); // re-vérifie en arrière-plan pour la prochaine fois
			return res;
		}
		if (known === true || (await KBI.hasExtension())) return viaExtension(riotId, opts);
		return manual(riotId); // < 300 ms après le clic : toujours dans la fenêtre d'activation utilisateur
	};

	KBI.requestMany = async (list, onProgress) => {
		const ids = (list || []).map((x) => (x && typeof x === 'object' ? x.riotId : x)).map(KBI.parseRiotId).filter(Boolean)
			.filter((id, i, a) => a.findIndex((y) => y.toLowerCase() === id.toLowerCase()) === i);
		const total = ids.length;
		const results = [];
		const progress = (o) => { if (onProgress) try { onProgress({ done: results.length, total, ...o }); } catch { /* ignore */ } };
		if (!total) return results;
		const ext = known === true || (known !== false && (await KBI.hasExtension()));
		if (!ext) {
			// Sans extension : un onglet par joueur (le navigateur peut bloquer les suivants → message dédié)
			for (const id of ids) {
				const r = manual(id);
				results.push(r);
				progress({ current: id, result: r });
			}
			KBI.hasExtension();
			return results;
		}
		for (const id of ids) {
			progress({ current: id });
			const r = await viaExtension(id, { onStatus: (s) => progress({ current: id, status: s }) });
			results.push(r);
			progress({ current: id, result: r });
		}
		return results;
	};

	// Ping initial : la décision extension / manuel est ensuite immédiate au clic
	KBI.ready = KBI.hasExtension();
	window.KBI = KBI;
})();
