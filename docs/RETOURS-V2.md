# Retours V2 — KB SERIES × Valorant (NodeCG)

> Prompt de mise à jour, rédigé à partir des retours de l'utilisateur après la V1.
> À lire avec `docs/BRIEF.md` (identité visuelle, conventions, règles de fichiers, vérification par captures), qui reste valable.

## Objectif général
Faire passer le kit de "bien" à "prêt pour le direct" :
1. **Plus animé partout** : entrées en cascade plus riches, boucles d'ambiance discrètes en continu (balayages de lumière sur les filets dorés, étoiles qui scintillent/dérivent, halos qui respirent, reflets sur les logos), animations quand une donnée change (score, pick, nom). Toujours élégant, fluide (transform/opacity, pas de reflow), et lisible : rien ne doit bouger pendant qu'on doit lire un chiffre.
2. **Données mieux organisées, toutes modifiables à la main** : chaque info affichée doit pouvoir être saisie/corrigée dans un panneau, même sans tracker.gg.
3. **Joueurs au centre** : un joueur = une fiche (Riot ID, pseudo affiché, nom réel, équipe, rôle, photo "standing", rang, stats, agents favoris), réutilisée par toutes les pages.

## Règles inchangées
- Aucun faux joueur, aucun Riot ID inventé, aucun import tracker.gg fait par l'IA. Seul `Elysira#7w7` existe. L'utilisateur importe lui-même.
- Photo de test fournie : `Medias/standing.png` (copiée en asset `/assets/valorant-tournament/player-photos/standing-test.png` et déjà assignée à Elysira dans `playerData`). C'est une photo de test : prévoir le rendu avec un PNG détouré de ce type (buste/plan taille, fond transparent).
- Textes en français, thème `shared/theme.css`, captures de vérification obligatoires.

## Nouveau socle de données (déjà en place)
- `playerData` (replicant coeur) : `{ [riotId minuscules]: { riotId, displayName, realName, photo, overrides: { rank: {name, icon}, peak: {name, icon}, stats: { kd, acs, adr, hs, kast, winPct, matches, firstBloods, ... : chaînes }, agents: ['Jett', ...] } } }` — la saisie manuelle prime sur tracker.gg.
- `match.maps[i].picks` (optionnel) : `{ [riotId minuscules]: 'NomAgent' }` = agents joués sur chaque map.
- `shared/kb.js` : `KB.player(riotId)` (fiche fusionnée tracker + manuel : name, tag, realName, photo, team, role, rank, peak, stats{display,value,percentile,manual}, agents[{name, icon, portrait, bust, color, matches, winPct, kd}], hasTracker), `KB.roster(team)`, `KB.pickOf(riotId, mapIndex)`, `KB.agentInfo(name)`, `KB.teamOf(riotId)`, `KB.roleLabel(role)`, `KB.key(riotId)`.
- **Toutes les pages doivent lire les joueurs via `KB.player()`** (plus via `KB.profile()` ou `playerPhotos`, qui est migré dans `playerData.photo`).
- Import tracker : `shared/tracker-import.js` → `window.KBI` (fourni par la partie "joueurs") :
  - `KBI.request(input)` : input = Riot ID `Pseudo#TAG` ou lien tracker.gg → `Promise<{ ok, riotId, via: 'extension'|'manual', message }>`. Utilise l'extension Chrome compagnon si elle est installée (import automatique), sinon ouvre la page tracker.gg et invite à cliquer sur le favori.
  - `KBI.hasExtension()` → `Promise<boolean>`.
  - Important : appeler `KBI.request` directement dans le gestionnaire de clic (ouverture d'onglet autorisée).

## Retours page par page

### Planning (`schedule.html`)
- Retirer les logos en haut à droite.

### Pause (`brb.html`)
- Retirer les partenaires.
- La rotation en bas d'écran doit être **personnalisable** depuis le panneau : liste d'éléments (texte libre, prochain match, planning à venir, score de la série…), ajout / suppression / ordre / durée d'affichage, activer/désactiver.

### Transition (`transition.html`)
- Pouvoir **exporter la transition en séquence d'images PNG** (image par image, fond transparent, 1920×1080, 60 i/s) pour l'utiliser comme stinger vidéo/séquence dans OBS ou un logiciel de montage. Bouton dans le panneau + script `tools/`, sortie dans `exports/`.

### Scorebug (`scorebug.html`)
- **Supprimé** (page, panneau, entrées de régie). Les contrôles de score de série restent dans le panneau Live.

### Lower third (`lower-third.html`)
- Pouvoir en **afficher plusieurs à la fois** : un à gauche et un à droite (si 2 : un à gauche, un à droite), chacun avec son propre contenu/style et son propre bouton afficher/masquer.

### Ticker (`ticker.html`)
- Logo KB SERIES en bas à gauche **en 3D qui tourne** (effet pièce/médaille en rotation, avec tranche et reflet).

### Nouvel écran 50/50 (`dual-cam.html`)
- Écran partagé en deux moitiés, deux emplacements caméra transparents (trous) côte à côte, habillage du thème, nom/label optionnel sur chaque moitié (ex. nom d'équipe ou de joueur), bandeau d'info optionnel. Coordonnées exactes des trous affichées dans le panneau.

### Casters (`casters.html`)
- **Supprimé** (pas de casters à distance). Le replicant `casters` peut rester pour les lower thirds.

### Versus (`versus.html`)
- Rosters remplis depuis les fiches joueurs (`KB.roster`) : pseudo, photo si dispo, rôle, rang.
- **Agents pickés** : si des picks sont renseignés pour la map en cours (`match.maps[currentMap].picks`), afficher l'agent pické par chaque joueur (à la place de l'agent le plus joué) ; le reste des pages qui affichent des agents s'adapte pareil.

### Veto (`veto.html` + nouveau `veto-recap.html`)
- Nouvel écran **récapitulatif de fin de veto** : les maps dans l'ordre de jeu (Map 1, 2, 3…), qui a pické chaque map (logo + nom) ou DECIDER, quelle équipe commence de quel côté (attaque/défense), et les bans en rappel discret.

### Intro de map (`map-intro.html`)
- Remplacer les stats de map par les **tabs des équipes** : pour chaque équipe, son roster façon tableau de score Valorant (agent pické sur cette map, pseudo, rang, quelques stats clés), à la place des blocs de stats de map.

### Stats joueur (`player-stats.html`)
- Intégrer la **photo standing** du joueur (photo de test fournie) derrière les 3 agents.
- Données via `KB.player()` (donc stats/rang/agents modifiables à la main).

### Face-à-face (`player-duel.html`)
- Pouvoir mettre la **photo standing** des deux joueurs (grande, de chaque côté).

### Récupération des données joueurs
- Question de l'utilisateur : « Comment tu récupères les datas, tu peux faire pour les récupérer seul à partir d'un pseudo ou d'un lien ? »
- Réponse à implémenter : une **extension Chrome compagnon** (dossier `tools/tracker-extension/`, à charger en "non empaquetée") qui fait l'import en 1 clic depuis la régie à partir d'un pseudo ou d'un lien, sans favori : elle ouvre le profil tracker.gg en arrière-plan dans le navigateur de l'utilisateur (là où tracker.gg accepte les requêtes), récupère le JSON, l'envoie à NodeCG et referme l'onglet. Le favori et le copier-coller restent en secours.

### Organisation des données
- Nouveau panneau **Joueurs** (onglet « 1. Match & Joueurs ») : liste de tous les joueurs par équipe, ajout par pseudo/lien (import auto), fiche éditable complète (pseudo affiché, nom réel, équipe, rôle, photo, rang/peak, stats, agents favoris), indicateur tracker/manuel, bouton « revenir aux données tracker ».
- Panneau Match : éditeur des **agents joués par map** pour chaque joueur des deux équipes.
