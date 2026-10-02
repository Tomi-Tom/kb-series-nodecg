// Formulaire des lower thirds (gauche / droite), le même pour les panneaux Régie et Live → window.KBLT
// <script src="../shared/lt-form.js"></script>  (après kb.js, live.js, dash.js et overlays.js)
//
//   KBLT.mount(container, { compact }) → { applyPreset(side, preset) }
//     compact : style + titre + sous-titre (Régie) ; sinon formulaire complet + presets en 1 clic + « Enregistrer comme preset » (Live)
// Le formulaire suit l'antenne tant qu'il n'a ni focus ni modification locale (KBD.bindDirty) : deux panneaux ouverts
// en même temps ne renvoient jamais un vieux texte à l'antenne. Écrit liveLowerThird (contenu ; visibilité via KBO)
// et liveLowerThirdPresets (version complète).
(function () {
	const KBLT = {};
	const SIDES = { left: 'Gauche', right: 'Droite' };
	const ovId = (side) => 'lower-third-' + side;
	const styleOptions = () => Object.entries(LIVE.styles).map(([k, s]) => `<option value="${k}">${KB.esc(s.label)}</option>`).join('');

	// Version compacte : tout tient sur trois lignes
	const compactCard = (side, name, id) => `<div class="ltc" data-side="${side}">
		<div data-f="form">
			<div class="ltc-head"><span class="dot" data-f="dot"></span><b>${name.toUpperCase()}</b>
				<label class="vh" for="${id}-load">Charger un preset dans les champs</label><select id="${id}-load" data-f="load"></select>
				<label class="vh" for="${id}-style">Style</label><select id="${id}-style" class="ltc-style" data-f="style">${styleOptions()}</select></div>
			<div class="ltc-fields">
				<label class="vh" for="${id}-title">Titre</label><input id="${id}-title" data-f="title" placeholder="Titre">
				<label class="vh" for="${id}-subtitle">Sous-titre</label><input id="${id}-subtitle" data-f="subtitle" placeholder="Sous-titre">
			</div>
		</div>
		<div class="ltc-btns"><span class="ltc-state" data-f="state"></span>
			<button type="button" class="primary" data-a="update" title="Entrée dans un champ = Mettre à jour">Mettre à jour</button><button type="button" data-a="toggle"></button></div>
	</div>`;

	// Version complète (Live)
	const fullCard = (side, name, id) => `<div class="card" data-side="${side}">
		<div class="ovrow"><span class="dot" data-f="dot"></span><span class="name"><span class="side-title">${name}</span> <small data-f="state"></small></span><button type="button" data-a="toggle"></button></div>
		<div class="hint">Afficher un preset en 1 clic</div>
		<div class="presets" data-f="presets"></div>
		<div data-f="form">
			<label for="${id}-load">Charger un preset dans les champs (sans l'afficher)</label><select id="${id}-load" data-f="load"></select>
			<div class="grid2">
				<div><label for="${id}-style">Style</label><select id="${id}-style" data-f="style">${styleOptions()}</select></div>
				<div><label for="${id}-duration">Masquer après (s, 0 = manuel)</label><input id="${id}-duration" data-f="duration" type="number" min="0" step="1" value="0"></div>
			</div>
			<label for="${id}-kicker">Surtitre (vide = auto)</label><input id="${id}-kicker" data-f="kicker" placeholder="ex. CASTER, ANNONCE…">
			<label for="${id}-title">Titre</label><input id="${id}-title" data-f="title" placeholder="ex. Pause technique">
			<label for="${id}-subtitle">Sous-titre</label><input id="${id}-subtitle" data-f="subtitle" placeholder="ex. Reprise dans quelques instants">
		</div>
		<div class="hint" data-f="src"></div>
		<div class="row"><button type="button" class="primary" data-a="update" title="Entrée dans un champ = Mettre à jour">Mettre à jour (sans masquer)</button></div>
		<div class="row"><label class="vh" for="${id}-pname">Nom du preset</label><input id="${id}-pname" data-f="pname" placeholder="Nom du preset"><button type="button" class="shrink" data-a="save">Enregistrer comme preset</button></div>
		<div class="msg" data-f="msg"></div>
	</div>`;

	KBLT.mount = (container, { compact = false } = {}) => {
		const root = typeof container === 'string' ? document.querySelector(container) : container;
		const lt = nodecg.Replicant('liveLowerThird', { defaultValue: LIVE.defaults.liveLowerThird });
		const ltp = nodecg.Replicant('liveLowerThirdPresets', { defaultValue: LIVE.defaults.liveLowerThirdPresets });
		const prefix = compact ? 'ltc' : 'ltf';
		root.innerHTML = Object.entries(SIDES).map(([side, name]) => (compact ? compactCard : fullCard)(side, name, `${prefix}-${side}`)).join('');

		const card = (side) => root.querySelector(`[data-side="${side}"]`);
		const field = (side, f) => card(side).querySelector(`[data-f="${f}"]`);
		const btn = (side, a) => card(side).querySelector(`[data-a="${a}"]`);
		const ltVal = () => LIVE.normalizeLowerThird(lt.value);
		const presets = () => (Array.isArray(ltp.value) ? ltp.value : []);
		const allPresets = () => [...LIVE.autoPresets(KB), ...presets()];
		const casterText = (i) => { const c = (KB.rep.casters.value || [])[i] || {}; return { title: c.name || 'Caster', subtitle: c.handle || '' }; };

		// Champs visibles du formulaire ; les autres (surtitre et durée en version compacte, source caster) sont repris
		// de la dernière valeur chargée : un preset caster reste lié au caster tant qu'on ne retouche pas le titre / sous-titre
		const FIELDS = compact ? ['style', 'title', 'subtitle'] : ['style', 'kicker', 'title', 'subtitle', 'duration'];
		const keep = { left: {}, right: {} };
		function read(side) {
			const o = { ...keep[side] };
			for (const f of FIELDS) {
				const v = field(side, f).value;
				o[f] = f === 'duration' ? Math.max(0, +v || 0) : f === 'style' ? v : v.trim();
			}
			return o;
		}
		function fill(side, s) {
			const c = s.source === 'caster' ? { ...s, ...casterText(+s.casterIndex || 0) } : s;
			keep[side] = { kicker: s.kicker || '', duration: +s.duration || 0, source: s.source === 'caster' ? 'caster' : 'custom', casterIndex: +s.casterIndex || 0 };
			for (const f of FIELDS) field(side, f).value = f === 'duration' ? +c.duration || 0 : f === 'style' ? c.style || 'standard' : c[f] || '';
		}
		// Ce qui se voit à l'écran (texte du caster résolu) : sert à comparer le formulaire et l'antenne
		const view = (s) => {
			const t = s.source === 'caster' ? casterText(+s.casterIndex || 0) : s;
			return JSON.stringify([s.style || 'standard', s.kicker || '', (t.title || '').trim(), (t.subtitle || '').trim(), +s.duration || 0]);
		};
		const content = (obj) => { const o = {}; for (const k of LIVE.presetFields) o[k] = obj[k]; return o; };

		// Écrit champ par champ : une visibilité changée au même moment par un autre panneau n'est pas écrasée
		function write(side, obj) {
			const v = lt.value;
			if (v && v[side] && typeof v[side] === 'object') {
				for (const [k, x] of Object.entries(obj)) if (v[side][k] !== x) v[side][k] = x;
			} else {
				const n = ltVal();
				Object.assign(n[side], obj);
				lt.value = n;
			}
		}
		const apply = (side) => write(side, content(read(side)));
		const show = (side) => { apply(side); KBO.show(ovId(side)); };
		const applyPreset = (side, p) => {
			fill(side, p);
			write(side, LIVE.presetContent(p));
			KBO.show(ovId(side));
			forms[side].sync();
		};

		function state(side, dirty) {
			const on = KBO.isVisible(ovId(side));
			field(side, 'dot').classList.toggle('on', on);
			const st = field(side, 'state');
			st.textContent = dirty ? 'Modifications non appliquées' : on ? 'À l\'antenne' : 'Masqué';
			st.classList.toggle('lt-dirty', dirty);
			btn(side, 'update').disabled = !dirty;
			const t = btn(side, 'toggle');
			t.textContent = on ? '● À L\'ANTENNE' : 'AFFICHER';
			t.classList.toggle('onair', on);
			t.title = on ? 'Cliquer pour masquer' : 'Applique les champs et affiche';
		}

		const forms = {};
		for (const side of Object.keys(SIDES)) {
			forms[side] = KBD.bindDirty(field(side, 'form'), {
				read: () => read(side),
				fill: (v) => fill(side, v),
				live: () => (lt.value ? ltVal()[side] : undefined),
				same: (a, b) => view(a) === view(b),
				onState: (dirty) => state(side, dirty),
			});
			btn(side, 'toggle').addEventListener('click', () => (KBO.isVisible(ovId(side)) ? KBO.hide(ovId(side)) : show(side)));
			btn(side, 'update').addEventListener('click', () => apply(side));
			for (const f of FIELDS) {
				const el = field(side, f);
				if (f === 'title' || f === 'subtitle') el.addEventListener('input', () => { keep[side] = { ...keep[side], source: 'custom', casterIndex: 0 }; });
				if (el.tagName === 'INPUT') el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(side); } });
			}
			const load = field(side, 'load');
			load.addEventListener('change', () => {
				const p = allPresets().find((x) => x.id === load.value);
				load.value = '';
				if (p) { fill(side, p); forms[side].sync(); }
			});
			// Menu non réécrit tant qu'il a le focus (KBD.fillSelect) : rattrapage à la sortie
			load.addEventListener('blur', () => render());
			if (compact) continue;
			field(side, 'presets').addEventListener('click', (e) => {
				const b = e.target.closest('button[data-pid]');
				const p = b && allPresets().find((x) => x.id === b.dataset.pid);
				if (p) applyPreset(side, p);
			});
			btn(side, 'save').addEventListener('click', () => {
				const name = field(side, 'pname').value.trim() || field(side, 'title').value.trim();
				if (!name) return KBD.flash(field(side, 'msg'), 'Donne un nom au preset', 'err', 3500);
				const list = presets().map((p) => ({ ...p }));
				const ex = list.find((p) => p.name.toLowerCase() === name.toLowerCase());
				if (ex) Object.assign(ex, content(read(side))); else list.push({ id: LIVE.newId(), name, ...content(read(side)) });
				ltp.value = list;
				field(side, 'pname').value = '';
				KBD.flash(field(side, 'msg'), ex ? `Preset « ${name} » mis à jour` : `Preset « ${name} » enregistré`, 'ok', 3500);
			});
		}

		function render() {
			const auto = LIVE.autoPresets(KB), mine = presets();
			const opt = (p) => `<option value="${KB.esc(p.id)}">${KB.esc(p.name)}</option>`;
			const loadHtml = `<option value="">${compact ? 'Preset…' : '— choisir —'}</option><optgroup label="Automatiques">${auto.map(opt).join('')}</optgroup>`
				+ (mine.length ? `<optgroup label="Mes presets">${mine.map(opt).join('')}</optgroup>` : '');
			const live = ltVal();
			for (const side of Object.keys(SIDES)) {
				KBD.fillSelect(field(side, 'load'), loadHtml, '');
				if (!compact) {
					const box = field(side, 'presets');
					const html = [...auto, ...mine].map((p) => `<button type="button"${p.auto ? '' : ' class="gold"'} data-pid="${KB.esc(p.id)}" title="${KB.esc([p.title, p.subtitle].filter(Boolean).join(' — '))}">${KB.esc(p.name)}</button>`).join('');
					if (box._html !== html) { box.innerHTML = html; box._html = html; }
					const s = live[side];
					const c = s.source === 'caster' ? (KB.rep.casters.value || [])[s.casterIndex] : null;
					field(side, 'src').textContent = s.source === 'caster' ? `À l'antenne : caster « ${c ? c.name : '?'} » (suit l'éditeur des casters)` : '';
				}
				forms[side].sync();
			}
		}
		KB.watch(['casters', 'schedule', 'match', 'teams', lt, ltp], render);

		return { applyPreset };
	};

	window.KBLT = KBLT;
})();
