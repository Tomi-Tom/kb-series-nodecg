# Extension Chrome « KB SERIES · Import tracker.gg → NodeCG »

Importe les stats tracker.gg d'un joueur **en un clic depuis la régie** (panneau **Joueurs**), à partir d'un pseudo `Pseudo#TAG` ou d'un lien tracker.gg. Plus besoin du favori.

## Pourquoi une extension ?

tracker.gg (protégé par Cloudflare) refuse les requêtes venant du serveur NodeCG (erreur 403). Il les accepte en revanche depuis **ton** navigateur. L'extension :

1. ouvre le profil tracker.gg du joueur dans un **onglet en arrière-plan** ;
2. récupère les stats (le même JSON que le favori « ⇪ Envoyer à NodeCG ») ;
3. les envoie à NodeCG ;
4. referme l'onglet. Le joueur apparaît dans la régie.

Plusieurs joueurs (bouton « Importer toute l'équipe ») passent dans une file d'attente, un onglet à la fois.

## Installation (une seule fois, environ 1 minute)

1. Ouvre Google Chrome (ou Edge, Brave… tout navigateur basé sur Chromium).
2. Va à l'adresse `chrome://extensions` (sur Edge : `edge://extensions`).
3. En haut à droite, active le **Mode développeur**.
4. Clique sur **Charger l'extension non empaquetée**.
5. Sélectionne le dossier `tools/tracker-extension` du projet (le chemin exact est affiché en haut de cette page).
6. L'extension « KB SERIES · Import tracker.gg → NodeCG » apparaît dans la liste : vérifie qu'elle est **activée**.
7. Optionnel : clique sur l'icône puzzle de la barre d'outils puis sur l'épingle pour garder l'icône KB visible.
8. **Recharge la page de la régie NodeCG** (F5) : l'extension ne s'injecte que dans les pages ouvertes après son installation.

Dans le panneau **Joueurs** (onglet « 1. Match & Joueurs »), l'encart sous « Ajouter un joueur » doit maintenant afficher un point vert **Extension détectée** (bouton ⟳ pour re-tester).

> Utilise le même navigateur pour la régie et pour tracker.gg : c'est lui qui fait la requête.

## Tester

1. Dans le panneau **Joueurs**, sélectionne un joueur (ex. `Elysira#7w7`) puis clique sur **Importer depuis tracker.gg**, ou ajoute un joueur avec son pseudo / lien.
2. Un onglet tracker.gg s'ouvre en arrière-plan (sans prendre le focus) puis se referme au bout de quelques secondes.
3. Le message « ✔ … importé depuis tracker.gg » s'affiche dans le panneau, la pastille **TRK** passe au vert et la date d'import se met à jour.
4. L'icône de l'extension affiche l'état de la file et les derniers imports (réussis ou non, avec la raison).

## Cas particuliers

- **Vérification anti-robot (Cloudflare)** : si tracker.gg affiche « Just a moment… » ou une case à cocher, l'onglet passe au premier plan. Valide la vérification : l'import reprend tout seul (jusqu'à 3 minutes). Sinon l'onglet reste ouvert, relance l'import une fois la vérification passée.
- **Profil privé** : le joueur doit se connecter une fois sur tracker.gg avec son compte Riot pour rendre ses stats publiques.
- **Profil introuvable** : vérifie l'orthographe exacte du Riot ID (`Pseudo#TAG`, espaces compris).
- **Aucune stat de saison** : le joueur n'a pas (encore) joué de partie classée cette saison ; saisis ses stats à la main dans la fiche.
- **« Extension rechargée »** : après une mise à jour ou un rechargement de l'extension, recharge la page de la régie (F5).

## Régie sur un autre PC / autre port

- L'extension fonctionne avec une régie ouverte sur **n'importe quelle adresse au port 9090** (`http://localhost:9090`, `http://127.0.0.1:9090`, `http://192.168.x.x:9090`…). Elle n'a accès qu'aux pages sur le port 9090 et à tracker.gg.
- Si NodeCG tourne sur un autre port, remplace `9090` par ce port dans `manifest.json` (sections `host_permissions` et `content_scripts`), puis clique sur le bouton ⟳ de l'extension dans `chrome://extensions`.

## Mettre à jour

Après une modification des fichiers de l'extension : `chrome://extensions` → bouton ⟳ (Actualiser) sur la carte de l'extension, puis F5 sur la régie.

## Secours sans extension

- **Favori « ⇪ Envoyer à NodeCG »** (panneau Joueurs, section « Favori de secours ») : ouvre la page tracker.gg du joueur puis clique sur le favori.
- **Copier-coller du JSON** (même section) : ouvre le lien API du joueur, Ctrl+A, Ctrl+C, colle dans le panneau.
- Toutes les données d'une fiche (rang, stats, agents…) peuvent aussi être **saisies à la main**.

## Fichiers

- `manifest.json` : déclaration (Manifest V3), permissions `scripting` + `storage`, accès à tracker.gg et au port 9090.
- `content.js` : injecté dans la régie, relaie les demandes du panneau (`window.postMessage`) vers l'extension.
- `background.js` : file d'attente, ouverture de l'onglet tracker.gg, récupération du JSON, envoi à NodeCG (`POST /valorant-tournament/tracker-import`).
- `popup.html` / `popup.js` : petite fenêtre d'état.
- `make-icons.js` : régénère les icônes (`node tools/tracker-extension/make-icons.js`).
