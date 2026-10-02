# Extension Chrome « KB SERIES · Import tracker.gg → NodeCG »

Guide d'installation et d'utilisation de l'extension qui importe les stats tracker.gg d'un joueur **en un clic depuis la régie** (panneau **Équipes & Joueurs**), à partir d'un `Pseudo#TAG` ou d'un lien tracker.gg.

## Pourquoi une extension ?

tracker.gg (protégé par Cloudflare) refuse les requêtes venant du serveur de la régie (erreur 403). Il les accepte en revanche depuis **ton** navigateur. L'extension :

1. ouvre le profil tracker.gg du joueur dans un **onglet en arrière-plan** ;
2. récupère les stats (le même contenu que le favori « ⇪ Envoyer à NodeCG ») ;
3. les transmet à la page de la régie, qui les enregistre ;
4. referme l'onglet. La carte du joueur passe en **TRK**.

Si plusieurs imports sont lancés à la suite, ils passent dans une file d'attente : un seul onglet tracker.gg à la fois.

## Installation (une seule fois, environ 1 minute)

1. Ouvre Google Chrome (ou un autre navigateur basé sur Chromium : Edge, Brave…).
2. Va à l'adresse `chrome://extensions` (sur Edge : `edge://extensions`).
3. En haut à droite, active le **Mode développeur**.
4. Clique sur **Charger l'extension non empaquetée**.
5. Sélectionne le dossier `tools/tracker-extension` du projet (quand ce guide est ouvert depuis la régie, le chemin exact est affiché en haut de la page).
6. L'extension « KB SERIES · Import tracker.gg → NodeCG » apparaît dans la liste : vérifie qu'elle est **activée**.
7. Facultatif : icône puzzle de la barre d'outils → épingle, pour garder l'icône de l'extension visible.
8. **Recharge la page de la régie** (F5) : l'extension ne s'installe que dans les pages ouvertes après elle.

En haut du panneau **Équipes & Joueurs** (onglet « 1. Match & Joueurs »), la pastille doit être verte : **Extension tracker.gg détectée** (bouton ⟳ pour re-tester).

> Utilise le même navigateur pour la régie et pour tracker.gg : c'est lui qui fait la requête.

## Utilisation

1. Dans le panneau **Équipes & Joueurs**, tape `Pseudo#TAG` (ou colle le lien tracker.gg du joueur) dans le champ **+ Pseudo#TAG ou lien tracker.gg** en bas d'une colonne, puis Entrée ; ou ouvre la fiche d'un joueur et clique **Importer depuis tracker.gg** (ou **Actualiser depuis tracker.gg**).
2. Un onglet tracker.gg s'ouvre en arrière-plan (sans prendre le focus), puis se referme au bout de quelques secondes.
3. Le panneau affiche « ✔ Pseudo#TAG importé depuis tracker.gg » et la pastille **TRK** de la carte s'allume.
4. L'icône de l'extension ouvre une petite fenêtre : régie joignable ou non, import en cours, derniers imports (réussis ou non, avec la raison), bouton **Ouvrir la régie**.

## Cas particuliers

- **Vérification anti-robot (Cloudflare)** : si tracker.gg affiche « Just a moment… » ou une case à cocher, l'onglet passe au premier plan. Valide la vérification : l'import reprend tout seul (jusqu'à 3 minutes). Sinon, relance l'import une fois la vérification passée.
- **Profil privé** : le joueur doit se connecter une fois sur tracker.gg avec son compte Riot pour rendre ses stats publiques.
- **Profil introuvable** : vérifie l'orthographe exacte du Riot ID (`Pseudo#TAG`, majuscules et espaces compris).
- **Aucune stat de saison** : le joueur n'a pas (encore) joué de partie classée cette saison ; saisis ses stats à la main dans sa fiche.
- **Régie protégée par un mot de passe** (réseau local ou en ligne) : connecte-toi à la régie dans ce même navigateur avant d'importer.
- **« Extension non détectée »** après une mise à jour ou un rechargement de l'extension : recharge la page de la régie (F5).

## Ce que l'extension peut voir

D'après son `manifest.json` (Manifest V3) :

- **Permissions** : `scripting` (lire les stats dans l'onglet tracker.gg qu'elle a ouvert) et `storage` (son état et ses derniers imports).
- **Sites auxquels elle a accès** : `tracker.gg`, `api.tracker.gg`, et **toute adresse sur le port 9090** (en `http` et en `https`, quel que soit le nom de la machine).
- **Pages où elle s'installe** (petit relais entre la page et l'extension, aussi dans les cadres) : toute page sur le port 9090, et toute page dont l'adresse contient `/bundles/valorant-tournament/`, **sur n'importe quel site et n'importe quel port** (c'est ce qui la fait marcher sur une régie en ligne).
- Elle ouvre et ferme elle-même les onglets tracker.gg. Elle n'envoie les stats qu'à la page de la régie qui a demandé l'import.

## Régie sur un autre port

Les panneaux de la régie sont des pages `/bundles/valorant-tournament/…` : l'extension s'y installe quel que soit le port, ce qui devrait suffire à la détection et à l'import. Si elle n'est pas détectée sur un autre port que 9090, remplace `9090` par ce port dans `manifest.json` (sections `host_permissions` et `content_scripts`), puis recharge l'extension (voir ci-dessous).

## Mettre à jour

Après une mise à jour du projet (ou une modification des fichiers de l'extension) : `chrome://extensions` → bouton d'actualisation sur la carte de l'extension, puis F5 sur la régie.

## Secours sans extension

Dans le panneau **Équipes & Joueurs**, carte **Import tracker.gg** :

- **Favori « ⇪ Envoyer à NodeCG »** (section « Favori de secours ») : à glisser une fois dans la barre de favoris ; ensuite, ouvre la page tracker.gg du joueur et clique sur le favori.
- **Plan C : copier-coller le JSON** : ouvre la fiche du joueur, ouvre son lien API, Ctrl+A, Ctrl+C, colle dans la zone, **Importer le JSON**.
- Toutes les données d'une fiche (rang, stats, agents…) peuvent aussi être **saisies à la main**.

Pas à pas détaillé : `docs/REGIE.md` du projet, section « Importer les joueurs depuis tracker.gg ».

## Fichiers

- `manifest.json` : déclaration de l'extension (permissions, sites, pages).
- `content.js` : injecté dans la régie, relaie les demandes du panneau (`window.postMessage`) vers l'extension.
- `background.js` : file d'attente, ouverture de l'onglet tracker.gg, récupération du JSON, renvoi à la page de la régie qui l'envoie à `POST /valorant-tournament/tracker-import`.
- `popup.html` / `popup.js` : petite fenêtre d'état.
- `make-icons.js` : régénère les icônes (`node tools/tracker-extension/make-icons.js`).
