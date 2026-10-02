// Panneau « Équipes & Joueurs » : fiche du joueur sélectionné.
// Identité (pseudo, nom réel, Riot ID, équipe, rôle), photo, rangs, stats et agents saisis à la main
// (ils priment sur tracker.gg), import depuis tracker.gg, « Revenir aux données tracker » et suppression (2 clics).
(function (P) {
	const $ = KB.$;
	const esc = KB.esc;
	const sheet = $('#sheet');
	const sheetMsg = $('#sheetMsg');
	const tiers = $('#tiers');
	let pickKind = 'rank';

	P.select = (key) => {
		P.sel = key;
		P.rememberSel();
		tiers.hidden = true;
		P.msg(sheetMsg, '');
		P.renderAll();
	};
	$('#backTop').onclick = (e) => { e.preventDefault(); $('#top').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
	/** N'écrase jamais un champ en cours de saisie */
	const setVal = (el, v) => { if (document.activeElement !== el) el.value = v == null ? '' : v; };

	$('#stats').innerHTML = P.STATS.map(([k, l]) => `<div><label class="flabel" for="st-${k}">${esc(l)}</label><input id="st-${k}" data-stat="${k}" inputmode="decimal"></div>`).join('');
	$('#agents').innerHTML = [0, 1, 2].map((i) => `<div><label class="flabel" for="ag-${i}">Agent ${i + 1}</label><div class="agent-sel"><span class="ph" data-aimg="${i}"></span><select id="ag-${i}" data-agent="${i}"></select></div></div>`).join('');

	function rankBoxHtml(kind, eff, ov) {
		const manual = !!(ov && ov.name);
		return `<div class="rank-field${manual ? ' ov' : ''}">
			${eff && eff.icon ? `<img src="${esc(eff.icon)}" alt="">` : '<span class="noicon">–</span>'}
			<div class="rn">${esc((eff && eff.name) || 'Aucun')}<small>${manual ? 'Saisi à la main' : eff ? 'tracker.gg' : 'Pas de donnée'}</small></div>
			<button data-pick="${kind}">Choisir…</button>
			${manual ? `<button data-auto="${kind}" title="Revenir à la valeur tracker.gg">Auto</button>` : ''}
		</div>
		<input id="rt-${kind}" data-ranktext="${kind}" placeholder="ou texte libre (ex. Immortal 2)" aria-label="${kind === 'rank' ? 'Rang actuel' : 'Peak'} en texte libre" value="${esc(manual && !P.findTier(ov.name) ? ov.name : '')}">`;
	}
	function renderTiers(curName) {
		const btn = (t) => `<button class="tier${t.name === curName ? ' cur' : ''}" data-tier="${t.n}" title="${esc(t.fr)} (${esc(t.name)})"><img src="${P.TIER_ICON(t.n)}" alt="${esc(t.name)}"></button>`;
		tiers.innerHTML = `<div class="flabel">Choisir le ${pickKind === 'rank' ? 'rang actuel' : 'peak'}</div>`
			+ P.FAMILIES.map(([, fr], i) => `<div class="fam"><span class="fl">${esc(fr)}</span>${P.TIERS.filter((t) => t.fam === i).map(btn).join('')}</div>`).join('')
			+ `<div class="fam"><span class="fl">Radiant</span>${btn(P.TIERS[P.TIERS.length - 1])}</div>`
			+ `<div class="fam"><span class="fl">Non classé</span>${btn(P.TIERS[0])}</div>`;
	}

	function renderSheet() {
		const has = !!P.sel && P.allKeys().has(P.sel);
		sheet.hidden = !has;
		$('#noSel').hidden = has;
		if (!has) return;
		const key = P.sel;
		const rid = P.riotIdOf(key);
		const p = KB.player(rid);
		const d = P.dataVal()[key] || {};
		const ov = d.overrides || {};
		const prof = P.profVal()[key];

		$('#photoPrev').innerHTML = d.photo ? `<img src="${esc(d.photo)}" alt="">` : '<span>Aucune photo</span>';
		$('#hName').innerHTML = `${esc(p.name)} <span>#${esc(p.tag)}</span>`;
		const tAll = KB.orderedTeams().filter((t) => P.playersOf(t).some((x) => KB.key(x.riotId) === key));
		$('#hSub').textContent = KB.joinDot(tAll.length ? tAll.map((t) => t.name).join(' + ') : 'Sans équipe', KB.roleLabel(p.role), p.realName);
		$('#hTracker').innerHTML = prof
			? `<span class="c-ok">● tracker.gg</span> importé le ${esc(new Date(prof.fetchedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}${prof.season ? ' · ' + esc(prof.season) : ''}${prof.stats && prof.stats.matches && prof.stats.matches.display ? ' · ' + esc(prof.stats.matches.display) + ' matchs' : ''}`
			: '<span class="c-gold">● Pas encore importé de tracker.gg</span> · tout peut être saisi à la main';
		const busy = P.inFlight.has(key);
		$('#importOne').disabled = busy;
		$('#importOne').textContent = busy ? 'Import en cours…' : prof ? 'Actualiser depuis tracker.gg' : 'Importer depuis tracker.gg';

		setVal($('#fDisplay'), d.displayName || '');
		$('#fDisplay').placeholder = (prof && prof.name) || rid.split('#')[0];
		$('#fDisplay').classList.toggle('ov', !!d.displayName);
		setVal($('#fReal'), d.realName || '');
		setVal($('#fRiot'), rid);
		const m = KB.rep.match.value || {};
		const teamId = p.team ? p.team.id : P.NO_TEAM;
		KBD.fillSelect('#fTeam', KBD.teamOptions(teamId, {
			empty: 'Sans équipe', teams: KB.orderedTeams(),
			label: (t) => `${t.name}${t.id === m.teamA || t.id === m.teamB ? ' · match' : ''} (${P.playersOf(t).length})`,
		}), teamId);
		KBD.fillSelect('#fRole', P.roleOptions(p.role), P.roleNorm(p.role));
		$('#fRole').disabled = !p.team;
		$('#fRole').title = p.team ? '' : 'Place d\'abord le joueur dans une équipe';

		const assets = P.photoAssets.value || [];
		const isAsset = !!d.photo && assets.some((a) => a.url === d.photo);
		const ps = $('#fPhotoAsset');
		if (KBD.fillSelect(ps, `<option value="">${assets.length ? '— Choisir une photo —' : 'Aucune photo dans les assets'}</option>`
			+ assets.map((a) => `<option value="${esc(a.url)}">${esc(a.base || a.name)}</option>`).join(''), isAsset ? d.photo : '')) ps.classList.toggle('ov', isAsset);
		setVal($('#fPhotoUrl'), d.photo && !isAsset ? d.photo : '');
		$('#photoClear').disabled = !d.photo;

		const ae = document.activeElement;
		if (!(ae && ae.dataset && ae.dataset.ranktext === 'rank')) $('#rankBox').innerHTML = rankBoxHtml('rank', p.rank, ov.rank);
		if (!(ae && ae.dataset && ae.dataset.ranktext === 'peak')) $('#peakBox').innerHTML = rankBoxHtml('peak', p.peak, ov.peak);
		if (!tiers.hidden) renderTiers(((pickKind === 'rank' ? p.rank : p.peak) || {}).name);

		for (const inp of document.querySelectorAll('[data-stat]')) {
			const k = inp.dataset.stat;
			const tr = prof && prof.stats && prof.stats[k];
			const v = ov.stats && ov.stats[k];
			setVal(inp, v || '');
			inp.placeholder = (tr && tr.display) || '–';
			inp.classList.toggle('ov', v !== undefined && v !== '');
			inp.title = tr && tr.display ? 'tracker.gg : ' + tr.display : 'Pas de valeur tracker.gg';
		}

		const names = Object.keys((KB.rep.valorantData.value && KB.rep.valorantData.value.agents) || {}).sort((a, b) => a.localeCompare(b));
		const trTop = ((prof && prof.agents) || []).map((a) => a.name);
		for (const s of document.querySelectorAll('[data-agent]')) {
			const i = +s.dataset.agent;
			const cur = (ov.agents || [])[i] || '';
			const opts = !cur || names.includes(cur) ? names : [cur, ...names];
			KBD.fillSelect(s, `<option value="">Auto${trTop[i] ? ' · ' + esc(trTop[i]) : ''}</option>` + opts.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join(''), cur);
			s.classList.toggle('ov', !!cur);
			const shown = cur || trTop[i];
			const info = shown && KB.agentInfo(shown);
			const slot = document.querySelector(`[data-aimg="${i}"]`);
			slot.outerHTML = info && info.icon ? `<img data-aimg="${i}" src="${esc(info.icon)}" alt="" title="${esc(shown)}">` : `<span class="ph" data-aimg="${i}"></span>`;
		}
		$('#resetTracker').disabled = !P.hasOverrides(ov);
	}
	// Les champs sont protégés un par un (setVal, fillSelect) : le rendu n'attend que la fin d'un clic dans la fiche
	const safeSheet = KBD.deferWhileEditing(sheet, renderSheet, { fields: false });
	let shownKey = null;
	P.renderSheet = () => {
		// Autre joueur : un bouton armé sur le précédent ne doit pas agir sur celui-ci en un seul clic
		if (P.sel !== shownKey) { KBD.disarm('#resetTracker'); KBD.disarm('#delPlayer'); shownKey = P.sel; }
		safeSheet();
	};

	// --- Identité
	for (const id of ['#fDisplay', '#fReal']) $(id).onchange = (e) => { if (P.sel) P.writeData(P.sel, (d) => { d[e.target.dataset.field] = e.target.value.trim(); }); };
	$('#fRiot').onchange = (e) => {
		if (!P.sel) return;
		const key = P.sel;
		const nid = KBI.parseRiotId(e.target.value);
		if (!nid) { P.msg(sheetMsg, 'Riot ID invalide (format Pseudo#TAG).', 'err'); e.target.value = P.riotIdOf(key); return; }
		if (nid === P.riotIdOf(key)) return;
		const nkey = P.renameKey(key, nid);
		if (!nkey) { P.msg(sheetMsg, `${nid} existe déjà dans la liste.`, 'err'); e.target.value = P.riotIdOf(key); return; }
		P.select(nkey);
		P.msg(sheetMsg, nkey !== key ? `Riot ID changé en ${nid}. Pense à (ré)importer ses stats tracker.gg.` : 'Riot ID mis à jour.', 'ok');
	};
	$('#fTeam').onchange = (e) => { if (!P.sel) return; const p = KB.player(P.riotIdOf(P.sel)); P.moveTo(P.sel, p.team ? p.team.id : P.POOL, e.target.value || P.POOL); };
	$('#fRole').onchange = (e) => { if (!P.sel) return; const p = KB.player(P.riotIdOf(P.sel)); P.setRole(P.sel, p.team ? p.team.id : null, e.target.value); };

	// --- Photo
	$('#fPhotoAsset').onchange = (e) => { if (P.sel && e.target.value) P.writeData(P.sel, (d) => { d.photo = e.target.value; }); };
	$('#fPhotoUrl').onchange = (e) => { if (P.sel && e.target.value.trim()) P.writeData(P.sel, (d) => { d.photo = e.target.value.trim(); }); };
	$('#photoClear').onclick = () => { if (P.sel) P.writeData(P.sel, (d) => { d.photo = ''; }); };

	// --- Rangs, stats, agents
	sheet.addEventListener('change', (e) => {
		const t = e.target;
		if (!P.sel || !t.dataset) return;
		if (t.dataset.stat) P.writeOv(P.sel, (ov) => { ov.stats = ov.stats || {}; ov.stats[t.dataset.stat] = t.value.trim(); });
		if (t.dataset.agent != null) P.writeOv(P.sel, (ov) => { const a = [0, 1, 2].map((i) => (ov.agents || [])[i] || ''); a[+t.dataset.agent] = t.value; ov.agents = a; });
		if (t.dataset.ranktext) {
			const txt = t.value.trim();
			const tier = P.findTier(txt);
			P.writeOv(P.sel, (ov) => { ov[t.dataset.ranktext] = txt ? { name: tier ? tier.name : txt, icon: tier ? P.TIER_ICON(tier.n) : null } : null; });
		}
	});
	// Les menus ne sont pas mis à jour tant qu'ils ont le focus (KBD.fillSelect) : rattrapage à la sortie
	sheet.addEventListener('focusout', (e) => { if (e.target.matches('select')) setTimeout(P.renderSheet, 0); });
	sheet.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });
	sheet.addEventListener('click', (e) => {
		const pick = e.target.closest('[data-pick]');
		if (pick) {
			const same = !tiers.hidden && pickKind === pick.dataset.pick;
			pickKind = pick.dataset.pick;
			tiers.hidden = same;
			if (!same) { const p = KB.player(P.riotIdOf(P.sel)); renderTiers(((pickKind === 'rank' ? p.rank : p.peak) || {}).name); }
			return;
		}
		const auto = e.target.closest('[data-auto]');
		if (auto && P.sel) { P.writeOv(P.sel, (ov) => { ov[auto.dataset.auto] = null; }); return; }
		const tier = e.target.closest('[data-tier]');
		if (tier && P.sel) {
			const t = P.TIERS.find((x) => x.n === +tier.dataset.tier);
			P.writeOv(P.sel, (ov) => { ov[pickKind] = { name: t.name, icon: P.TIER_ICON(t.n) }; });
			tiers.hidden = true;
		}
	});

	// --- Import, actions dangereuses (2 clics)
	$('#importOne').onclick = () => { if (P.sel) P.runImport(P.sel, P.riotIdOf(P.sel), sheetMsg); };
	$('#openTracker').onclick = () => { if (P.sel) window.open(KBI.trackerUrl(P.riotIdOf(P.sel)), '_blank'); };
	KBD.confirm('#resetTracker', () => {
		if (!P.sel) return;
		P.writeData(P.sel, (d) => { d.overrides = {}; });
		P.msg(sheetMsg, 'Données manuelles effacées : la fiche reprend les valeurs tracker.gg.', 'ok');
	}, { label: 'Confirmer : effacer rang, stats, agents manuels' });
	KBD.confirm('#delPlayer', () => {
		if (!P.sel) return;
		const rid = P.riotIdOf(P.sel);
		P.deletePlayer(P.sel);
		P.select(null);
		P.msg('#boardMsg', `${rid} supprimé.`, 'ok');
	}, { label: 'Confirmer : supprimer fiche + profil + équipe' });
})(window.KBPlayers ||= {});
