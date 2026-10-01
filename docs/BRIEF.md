# Brief overlays — KB SERIES × Valorant (NodeCG)

Projet : `D:\valorant-nodecg` (NodeCG 2.8, le dossier racine EST le bundle `valorant-tournament`).
Le serveur tourne déjà en mode dev sur http://localhost:9090. Il redémarre tout seul quand `extension/` ou `package.json` changent.
**Ne lance pas** d'autre serveur et **ne le tue pas**.

## Identité visuelle (OBLIGATOIRE, cohérence entre toutes les pages)
Références : `Medias/Affiche KB SERIES - Octobre 2026 (1).png` (l'affiche) et `Medias/KBS.png` (le logo). Regarde-les.
- Tournoi : **KB SERIES**, édition spéciale **Epitech**, présenté par **CYCOM**. Tournoi Valorant 5v5, 31/10 & 14/11, Campus KB (Le Kremlin-Bicêtre).
- Ambiance : nuit bleu-indigo profonde, étoiles, bleu électrique lumineux, **filets/cadres dorés**, touche de néon orange (rare, pour les gros titres type "INSCRIPTION"), le tout avec le langage Valorant : coupes angulaires (coins coupés, trapèzes, diagonales), typo condensée en capitales.
- Utilise **`shared/theme.css`** (tokens `--kb-*`, classes `.kb-bg`, `.kb-frame`, `.kb-panel`, `.kb-rule`, `.kb-kicker`, `.kb-label`, `.kb-title`, `.kb-neon`, `.kb-pill`, `.kb-trapeze`, `.kb-team-mono`, animations `.kb-anim` + `.kb-in`/`.kb-out`). Lis-le en entier avant de coder. Tu peux ajouter des styles locaux dans ta page, mais réutilise les tokens (couleurs, polices, easing) — pas de nouvelle palette.
- Polices : Anton (`--kb-display`) pour les gros titres/chiffres, Poppins (`--kb-ui`) espacée pour les labels, Barlow Condensed (`--kb-num`) pour les infos compactes.
- Logos dispo dans `shared/img/` (via `KB.img`) : `kbs-logo.png` (logo KB SERIES, fond transparent), `cycom-alpha.png`, `epitech-alpha.png` (transparents), `poster-art.png` (illustration de l'affiche avec le V Valorant, sert de fond), `poster.jpg`.
- Rouge Valorant `--kb-red` : réservé aux défaites, au LIVE, aux bans.
- Couleurs d'équipe : `team.color` (variable CSS `--team-a` / `--team-b` à poser dynamiquement).

### Conventions de mise en page
- Graphics en **1920×1080**, `<html class="kb-graphic">`, fond **transparent** pour les overlays in-game (scorebug, lower third, ticker, casters) ; fond plein `.kb-bg` (art + étoiles + grille) pour les écrans plein écran.
- Marges de sécurité : 64 px minimum sur les bords pour le contenu important.
- Écrans plein écran : logo KB SERIES présent (coin ou centre), `.kb-frame` doré, et une **bande partenaires** discrète (Présenté par CYCOM · EPITECH) sur les scènes d'attente/fin.
- Animations : entrée en cascade (`.kb-anim` + `--i`), lignes `.kb-rule` qui se déploient, sorties rapides. Tout doit pouvoir s'afficher/se masquer proprement à chaud (pas besoin de recharger la page dans OBS).
- Textes de l'interface en **français**.
- Gère les données manquantes avec élégance (équipe sans logo → `KB.teamLogo()` fait un monogramme ; joueur sans profil tracker → stats masquées ou "–", jamais "undefined").
- Échappe toujours les textes injectés (`KB.esc`).

## Code partagé
- `shared/kb.js` → `window.KB` : `KB.watch([...names], render)`, `KB.rep.<name>`, `KB.team(id)`, `KB.sides(match)` (gauche/droite selon `match.swap`), `KB.seriesScore()`, `KB.teamLogo(team, size)`, `KB.map(name)` (images valorant-api : splash, listView, listViewTall, stylized, premier, minimap), `KB.agent(name)`, `KB.profile(riotId)`, `KB.teamMapStats(team, mapName)`, `KB.presence(el)` (show/hide animés), `KB.countUp(el, value)`, `KB.formatCountdown(ms)`, `KB.img`.
- `shared/dashboard.css` : style commun des panneaux de régie (boutons `.primary/.gold/.danger/.show`, `.row`, `.grid2`, `.card`, `.hint`, `.msg`, `.status/.dot`).
- Inclusion dans une page : `<link rel="stylesheet" href="../shared/theme.css">` (ou `dashboard.css`) et `<script src="../shared/kb.js"></script>`. L'objet `nodecg` est injecté automatiquement par NodeCG avant tes scripts.

## Données (replicants coeur, déclarés dans `extension/state.js` et `extension/tracker.js`)
Lis `extension/state.js` (formes exactes + données de démo dans `demo:seed`) et `extension/tracker.js` (`normalize()` = forme d'un profil joueur).
- `tournament` : infos générales.
- `teams` : `{ [id]: { id, name, tag, logo, color, players: [{ riotId, role }] } }`
- `match` : `{ stage, format: bo1|bo3|bo5, teamA, teamB, swap, currentMap, maps: [{ map, pickedBy: 'A'|'B'|'decider', scoreA, scoreB, winner, status: upcoming|live|done }] }`
- `veto` : `{ pool: [...maps], steps: [{ action: ban|pick|decider, team: 'A'|'B'|null, map, side, sideTeam }] }`
- `casters`, `schedule`, `countdown` (`{ endsAt, label }`), `transition` (`{ at, map }`), `valorantData` (`{ maps, agents }`), `playerProfiles` (profils tracker.gg par riotId en minuscules).
- Les replicants **propres à ta partie** (visibilité, options d'affichage…) : déclare-les avec un nom préfixé par ta partie, dans **ton** fichier `extension/<partie>.js` (avec `defaultValue`) ET côté client avec la même `defaultValue`. Ne modifie pas la forme des replicants coeur ; si tu as vraiment besoin d'un champ en plus, ajoute-le de manière optionnelle et rétro-compatible, et signale-le dans ton rapport.
- Données de démo déjà chargées (8 équipes, demi-finale Epitech Eclipse vs Kremlin Kings en BO3, Lotus 13-9 terminée, Haven 7-5 en cours, Ascent decider ; veto complet ; planning ; casters ; profils joueurs de démo). Pour les recharger : `nodecg.sendMessage('demo:seed')`.

## Fichiers : n'édite QUE les tiens
Les pages sont déjà enregistrées dans `package.json` (ne le modifie pas) avec des fichiers placeholder. Remplace tes placeholders, n'écris pas dans les fichiers des autres parties, ni dans `shared/theme.css`, `shared/kb.js`, `extension/state.js`, `extension/tracker.js`, `extension/index.js`. Si tu as besoin d'un helper partagé, mets-le dans ta page ou dans `shared/<partie>.js`.

## Vérification (obligatoire)
- Capture : `node tools/shot.js <url> shots/<partie>-<nom>.png --wait 2500 [--eval "js"]` (Chrome headless, affiche les erreurs console). `--eval` permet par ex. de forcer la visibilité via un replicant.
  URLs : graphics → `http://localhost:9090/bundles/valorant-tournament/graphics/<fichier>.html` ; panneau → `http://localhost:9090/bundles/valorant-tournament/dashboard/<fichier>.html` (ajoute `--w 600 --h 900` pour un panneau).
- Regarde tes captures (outil Read sur le PNG) et itère jusqu'à ce que ce soit propre : rien qui déborde, textes lisibles, hiérarchie claire, cohérent avec l'affiche. Teste aussi au moins un cas "données manquantes" et un nom long.
- Remets l'état de démo comme tu l'as trouvé si tu le modifies (ou relance `demo:seed`).
