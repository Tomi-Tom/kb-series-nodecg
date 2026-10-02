// Panneau « Équipes & Joueurs » : tableau des équipes (une colonne par équipe + « Sans équipe »).
// Cartes joueur, formulaire d'équipe (création, modification, suppression), ajout d'un joueur par Riot ID,
// déplacement par glisser-déposer ou par le menu « Déplacer… » (alternative au clavier).
(function (P) {
	const $ = KB.$;
	const esc = KB.esc;
	const board = $('#board');
	const boardMsg = $('#boardMsg');
	const addDrafts = {};      // texte des champs « + Ajouter » par colonne
	P.editTeam = null;         // { id: teamId | 'new', d: { name, tag, color, logo } }
	P.dragKey = null;
	let dragFrom = null;

	function thumbHtml(p) {
		if (p.photo) return `<div class="thumb"><img src="${esc(p.photo)}" alt=""></div>`;
		const a = p.agents && p.agents[0];
		if (a && a.icon) return `<div class="thumb"><img class="agent" src="${esc(a.icon)}" alt=""></div>`;
		return `<div class="thumb">${esc(String(p.name || '?').slice(0, 1).toUpperCase())}</div>`;
	}
	function moveOptions(curCol) {
		return '<option value="">Déplacer…</option>'
			+ (curCol !== P.POOL ? `<option value="${P.POOL}">→ Sans équipe</option>` : '')
			+ KB.orderedTeams().filter((t) => t.id !== curCol).map((t) => `<option value="${esc(t.id)}">→ ${esc(t.name)}</option>`).join('');
	}
	P.roleOptions = (cur) => {
		const c = P.roleNorm(cur);
		const extra = c && !P.ROLE_KEYS.includes(c) ? [c] : [];
		return '<option value="">— Rôle —</option>' + [...P.ROLE_KEYS, ...extra].map((r) => `<option value="${esc(r)}" ${r === c ? 'selected' : ''}>${esc(KB.roleLabel(r))}</option>`).join('');
	};
	function cardHtml(key, colId, role) {
		const p = KB.player(P.riotIdOf(key));
		const prof = P.profVal()[key];
		const man = P.isManual(key);
		const date = prof && prof.fetchedAt ? new Date(prof.fetchedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
		const sub = P.inFlight.has(key) ? 'Import en cours…' : [p.rank && p.rank.name, p.realName].filter(Boolean).join(' · ') || (prof ? 'Importé' : 'Pas encore importé');
		return `<div class="pcard${key === P.sel ? ' sel' : ''}" draggable="true" tabindex="0" data-key="${esc(key)}" title="Glisser pour déplacer · clic (ou Entrée) pour ouvrir la fiche">
			<div class="l1">${thumbHtml(p)}
				<div class="info"><div class="nm">${esc(p.name)} <span>#${esc(p.tag)}</span></div><div class="sub">${esc(sub)}</div></div>
				${p.rank && p.rank.icon ? `<img class="rk" src="${esc(p.rank.icon)}" alt="" title="${esc(p.rank.name)}">` : ''}
				<div class="pills"><span class="pill ${prof ? 'trk' : 'off'}" title="${prof ? 'Importé de tracker.gg le ' + esc(date) : 'Pas de données tracker.gg'}">TRK</span><span class="pill ${man ? 'man' : 'off'}" title="${man ? 'Données saisies à la main' : 'Aucune donnée manuelle'}">MAN</span></div>
			</div>
			<div class="l2">
				${colId !== P.POOL ? `<select data-role="${esc(key)}" title="Rôle" aria-label="Rôle de ${esc(p.name)}">${P.roleOptions(role)}</select>` : ''}
				<select class="move" data-move="${esc(key)}" title="Déplacer vers une autre équipe" aria-label="Déplacer ${esc(p.name)}">${moveOptions(colId)}</select>
			</div>
		</div>`;
	}
	function teamFormHtml(id) {
		const d = P.editTeam.d;
		const assets = P.logoAssets.value || [];
		const isAsset = assets.some((a) => a.url === d.logo);
		const prev = d.logo ? `<img src="${esc(d.logo)}" alt="">` : KB.teamLogo({ name: d.name, tag: d.tag, color: d.color }, 34);
		return `<div class="tform" data-form="${esc(id)}">
			<div class="r"><input data-tf="name" value="${esc(d.name)}" placeholder="Nom de l'équipe" aria-label="Nom de l'équipe"><input data-tf="tag" value="${esc(d.tag)}" maxlength="6" placeholder="TAG" aria-label="Tag (abréviation)"><input type="color" data-tf="color" value="${esc(d.color || KB.TEAM_COLORS.A)}" title="Couleur" aria-label="Couleur de l'équipe"></div>
			<div class="lg"><div class="lgp">${prev}</div>
				<div><select data-tf="logoAsset" aria-label="Logo (assets)"><option value="">${assets.length ? 'Logo : aucun / URL' : 'Aucun logo dans les assets'}</option>${assets.map((a) => `<option value="${esc(a.url)}" ${a.url === d.logo ? 'selected' : ''}>${esc(a.base || a.name)}</option>`).join('')}</select>
				<input data-tf="logo" value="${esc(isAsset ? '' : d.logo)}" placeholder="ou URL du logo (vide = monogramme)" aria-label="URL du logo"></div></div>
			<div class="btns"><button class="primary" data-tsave>${id === 'new' ? 'Créer l\'équipe' : 'Enregistrer'}</button><button data-tcancel>Annuler</button><span class="sp"></span>
				${id !== 'new' ? '<button class="danger" data-tdel>Supprimer</button>' : ''}</div>
		</div>`;
	}
	function colHtml(t) {
		const isPool = !t;
		const colId = isPool ? P.POOL : t.id;
		let keys;
		const roles = {};
		if (isPool) {
			const inTeam = new Set();
			for (const tt of Object.values(P.teamsVal())) for (const p of P.playersOf(tt)) inTeam.add(KB.key(p.riotId));
			keys = [...P.allKeys()].filter((k) => !inTeam.has(k)).sort((a, b) => a.localeCompare(b));
		} else {
			const ps = P.playersOf(t);
			keys = ps.map((p) => KB.key(p.riotId));
			ps.forEach((p) => { roles[KB.key(p.riotId)] = p.role; });
		}
		const m = KB.rep.match.value || {};
		const side = !isPool && (t.id === m.teamA ? 'A' : t.id === m.teamB ? 'B' : '');
		const n = keys.length;
		const head = isPool
			? `<div class="thead"><div class="tinfo"><div class="tname">Sans équipe</div><div class="tsub">Vivier · ${n} joueur${n > 1 ? 's' : ''} à placer</div></div></div>`
			: `<div class="thead" data-edit="${esc(t.id)}" tabindex="0" role="button" title="Modifier l'équipe" aria-label="Modifier l'équipe ${esc(t.name)}">${KB.teamLogo(t, 34)}
				<div class="tinfo"><div class="tname">${esc(t.name)}</div><div class="tsub">${esc(t.tag || '—')}${side ? ` · <b>Match ${side}</b>` : ''}${n > P.STARTERS ? ` · ${n - P.STARTERS} rempl.` : ''}</div></div>
				<span class="count ${n >= P.STARTERS ? 'full' : 'low'}" title="${n >= P.STARTERS ? 'Équipe complète' : 'Moins de 5 titulaires'}">${Math.min(n, P.STARTERS)}/${P.STARTERS}</span><span class="edit-ico">✎</span></div>`;
		let body = '';
		keys.forEach((k, i) => {
			if (!isPool && i === P.STARTERS) body += '<div class="subsep">Remplaçants</div>';
			body += cardHtml(k, colId, roles[k]);
		});
		if (!isPool) for (let i = n; i < P.STARTERS; i++) body += `<div class="slot">Titulaire ${i + 1} · libre</div>`;
		if (isPool && !n) body += '<div class="pool-empty">Tous les joueurs sont dans une équipe.</div>';
		const form = P.editTeam && !isPool && P.editTeam.id === t.id ? teamFormHtml(t.id) : '';
		return `<div class="tcol${isPool ? ' pool' : ''}" data-col="${esc(colId)}"${isPool ? '' : ` style="--c:${esc(KB.teamColor(t))}"`}>
			${head}${form}
			<div class="tbody">${body}</div>
			<div class="tadd"><input data-addin="${esc(colId)}" value="${esc(addDrafts[colId] || '')}" placeholder="+ Pseudo#TAG ou lien tracker.gg" aria-label="Ajouter un joueur${isPool ? '' : ' à ' + esc(t.name)} (Pseudo#TAG ou lien tracker.gg)"><button data-addbtn="${esc(colId)}" title="Ajouter${isPool ? '' : ' à cette équipe'} et importer depuis tracker.gg">+</button></div>
		</div>`;
	}
	function renderBoard() {
		const cols = [colHtml(null), ...KB.orderedTeams().map(colHtml)];
		cols.push(P.editTeam && P.editTeam.id === 'new'
			? `<div class="tcol" style="--c:${esc(P.editTeam.d.color)}"><div class="thead"><div class="tinfo"><div class="tname">Nouvelle équipe</div><div class="tsub">Nom, tag, couleur, logo</div></div></div>${teamFormHtml('new')}</div>`
			: '<button class="newcol" id="newTeam">+ Nouvelle équipe</button>');
		board.innerHTML = cols.join('');
	}
	// Pas de rendu pendant une saisie dans le tableau ni pendant un glisser-déposer : il est rejoué ensuite
	P.renderBoard = KBD.deferWhileEditing(board, renderBoard, { busy: () => !!P.dragKey });

	// --- Équipes : création / édition / suppression
	const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
	const blurActive = () => { if (document.activeElement) document.activeElement.blur(); };
	function openTeamForm(id) {
		const t = id !== 'new' && KB.team(id);
		const color = KB.TEAM_COLORS.A;
		P.editTeam = { id, d: t ? { name: t.name || '', tag: t.tag || '', color: t.color || color, logo: t.logo || '' } : { name: '', tag: '', color, logo: '' } };
		blurActive();
		P.renderBoard();
		const f = document.querySelector(`[data-form="${CSS.escape(id)}"] [data-tf="name"]`);
		if (f) f.focus();
	}
	function closeTeamForm() {
		P.editTeam = null;
		blurActive();
		P.renderBoard();
	}
	function saveTeam() {
		const d = P.editTeam.d;
		const name = d.name.trim();
		if (!name) return P.msg(boardMsg, 'Le nom de l\'équipe est obligatoire.', 'err');
		const teams = P.teamsCopy();
		let id = P.editTeam.id;
		if (id === 'new') {
			const base = slug(d.tag) || slug(name) || 'team';
			id = base; let k = 2;
			while (teams[id]) id = base + '-' + k++;
			teams[id] = { id, name, tag: d.tag.trim(), color: d.color, logo: d.logo.trim(), players: [] };
		} else {
			teams[id] = { ...teams[id], name, tag: d.tag.trim(), color: d.color, logo: d.logo.trim() };
		}
		P.editTeam = null;
		blurActive();
		if (!P.saveTeams(teams)) P.renderBoard(); // rien de changé : pas de retour du serveur pour refermer le formulaire
		P.msg(boardMsg, `Équipe « ${name} » enregistrée.`, 'ok');
	}
	function deleteTeam(id) {
		const teams = P.teamsCopy();
		const t = teams[id];
		if (!t) return;
		P.keepInPool(t.players.map((p) => KB.key(p.riotId)));
		delete teams[id];
		P.editTeam = null;
		P.saveTeams(teams);
		const m = KB.rep.match.value;
		if (m && m.teamA === id) m.teamA = null;
		if (m && m.teamB === id) m.teamB = null;
		P.msg(boardMsg, `Équipe « ${t.name} » supprimée : ses ${t.players.length} joueur(s) sont dans « Sans équipe ».`, 'ok');
	}

	// --- Ajout d'un joueur dans une colonne
	function addToColumn(colId) {
		const input = document.querySelector(`[data-addin="${CSS.escape(colId)}"]`);
		const raw = input ? input.value : addDrafts[colId];
		const riotId = KBI.parseRiotId(raw);
		if (!riotId) return P.msg(boardMsg, 'Format attendu : Pseudo#TAG ou lien tracker.gg', 'err');
		const key = KB.key(riotId);
		const cur = KB.teamOf(riotId);
		const inThis = colId !== P.POOL && P.playersOf(KB.team(colId)).some((p) => KB.key(p.riotId) === key);
		addDrafts[colId] = '';
		if (input) { input.value = ''; input.blur(); }
		if (!P.dataVal()[key] && !P.profVal()[key]) P.writeData(key, (e) => { e.riotId = riotId; });
		if (colId !== P.POOL && !inThis) P.moveTo(key, null, colId); // ajout : ne le retire pas d'une autre équipe
		P.sel = key;
		P.rememberSel();
		const t = KB.team(colId);
		const where = colId === P.POOL ? '« Sans équipe »' : `« ${t ? t.name : colId} »`;
		P.msg(boardMsg, inThis ? `${riotId} est déjà dans ${where} : import relancé.` : colId === P.POOL && cur ? `${riotId} est déjà dans « ${cur.team.name} » : import relancé.` : `${riotId} ajouté dans ${where}.`, 'ok');
		P.runImport(key, riotId, boardMsg); // dans le clic / Entrée : ouverture d'onglet autorisée
	}

	// --- Événements du tableau
	function toggleTeamForm(id) {
		if (P.editTeam && P.editTeam.id === id) closeTeamForm(); else openTeamForm(id);
	}
	function openCard(key, fromKeyboard) {
		P.select(key);
		$('#sheetWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
		if (fromKeyboard) $('#fDisplay').focus({ preventScroll: true });
	}
	board.addEventListener('click', (e) => {
		if (e.target.closest('#newTeam')) { openTeamForm('new'); return; }
		const addBtn = e.target.closest('[data-addbtn]');
		if (addBtn) { addToColumn(addBtn.dataset.addbtn); return; }
		if (e.target.closest('[data-tsave]')) { saveTeam(); return; }
		if (e.target.closest('[data-tcancel]')) { closeTeamForm(); return; }
		const del = e.target.closest('[data-tdel]');
		if (del) { KBD.arm(del, () => deleteTeam(P.editTeam.id), { label: 'Confirmer la suppression' }); return; }
		const head = e.target.closest('[data-edit]');
		if (head) { toggleTeamForm(head.dataset.edit); return; }
		if (e.target.closest('select, input, button')) return;
		const card = e.target.closest('.pcard');
		if (card) openCard(card.dataset.key, false);
	});
	board.addEventListener('input', (e) => {
		const t = e.target;
		if (t.dataset.addin) addDrafts[t.dataset.addin] = t.value;
		if (t.dataset.tf && P.editTeam) {
			const form = t.closest('.tform');
			if (t.dataset.tf === 'logoAsset') { P.editTeam.d.logo = t.value; const u = form.querySelector('[data-tf="logo"]'); if (u) u.value = ''; }
			else P.editTeam.d[t.dataset.tf] = t.value;
			if (t.dataset.tf === 'logo' && t.value) { const s = form.querySelector('[data-tf="logoAsset"]'); if (s) s.value = ''; }
			const lp = form.querySelector('.lgp');
			const d = P.editTeam.d;
			if (lp) lp.innerHTML = d.logo ? `<img src="${esc(d.logo)}" alt="">` : KB.teamLogo({ name: d.name, tag: d.tag, color: d.color }, 34);
		}
	});
	board.addEventListener('change', (e) => {
		const t = e.target;
		if (t.dataset.role) { P.setRole(t.dataset.role, t.closest('[data-col]').dataset.col, t.value); t.blur(); }
		if (t.dataset.move) {
			const to = t.value;
			if (!to) return;
			t.blur();
			P.moveTo(t.dataset.move, t.closest('[data-col]').dataset.col, to);
			const team = KB.team(to);
			P.msg(boardMsg, `${P.riotIdOf(t.dataset.move)} → ${to === P.POOL ? 'Sans équipe' : team ? team.name : to}`, 'ok');
		}
	});
	board.addEventListener('keydown', (e) => {
		const t = e.target;
		if (e.key === 'Escape' && P.editTeam && t.dataset.tf) { closeTeamForm(); return; }
		// En-têtes d'équipe et cartes joueur : Entrée ou Espace = clic
		if ((e.key === 'Enter' || e.key === ' ') && (t.matches('[data-edit]') || t.matches('.pcard'))) {
			e.preventDefault();
			if (t.dataset.edit) toggleTeamForm(t.dataset.edit); else openCard(t.dataset.key, true);
			return;
		}
		if (e.key !== 'Enter') return;
		if (t.dataset.addin) { e.preventDefault(); addToColumn(t.dataset.addin); }
		else if (t.dataset.tf) { e.preventDefault(); saveTeam(); }
	});

	// --- Glisser-déposer
	const clearDrop = () => { document.querySelectorAll('.drop-line').forEach((x) => x.remove()); document.querySelectorAll('.drop-on').forEach((x) => x.classList.remove('drop-on')); };
	/** Index d'insertion dans la colonne (hors carte déplacée) selon la position verticale */
	function dropIndex(col, y) {
		const cards = [...col.querySelectorAll('.tbody .pcard')].filter((c) => c.dataset.key !== P.dragKey);
		let i = cards.findIndex((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
		if (i < 0) i = cards.length;
		return { i, cards };
	}
	board.addEventListener('dragstart', (e) => {
		const c = e.target.closest && e.target.closest('.pcard');
		if (!c) return;
		P.dragKey = c.dataset.key;
		dragFrom = c.closest('[data-col]').dataset.col;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', P.riotIdOf(P.dragKey));
		requestAnimationFrame(() => c.classList.add('dragging'));
	});
	board.addEventListener('dragover', (e) => {
		const col = e.target.closest('[data-col]');
		if (!col || !P.dragKey) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		clearDrop();
		col.classList.add('drop-on');
		if (col.dataset.col === P.POOL) return; // ordre alphabétique dans le vivier
		const { i, cards } = dropIndex(col, e.clientY);
		const line = document.createElement('div');
		line.className = 'drop-line';
		if (cards[i]) cards[i].before(line); else {
			const body = col.querySelector('.tbody');
			const slot = body.querySelector('.slot');
			if (slot) slot.before(line); else body.appendChild(line);
		}
	});
	board.addEventListener('dragleave', (e) => { if (!board.contains(e.relatedTarget)) clearDrop(); });
	board.addEventListener('drop', (e) => {
		const col = e.target.closest('[data-col]');
		if (!col || !P.dragKey) return;
		e.preventDefault();
		const key = P.dragKey;
		const { i } = dropIndex(col, e.clientY);
		const to = col.dataset.col;
		const from = dragFrom;
		P.dragKey = null;
		clearDrop();
		P.moveTo(key, from, to, i);
		const team = KB.team(to);
		if (from !== to) P.msg(boardMsg, `${P.riotIdOf(key)} → ${to === P.POOL ? 'Sans équipe' : team ? team.name : to}`, 'ok');
	});
	board.addEventListener('dragend', () => {
		P.dragKey = null;
		clearDrop();
		document.querySelectorAll('.dragging').forEach((x) => x.classList.remove('dragging'));
		P.renderBoard(); // rendu retenu pendant le glisser
	});
})(window.KBPlayers ||= {});
