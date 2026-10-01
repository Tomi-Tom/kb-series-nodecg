# Mettre la régie NodeCG en ligne (avec ton nom de domaine)

## Pourquoi pas Vercel
Vercel n'exécute que des fonctions courtes : pas de serveur allumé en permanence, pas de WebSockets
(indispensables pour que la régie et les overlays se synchronisent en direct), pas de disque pour la base
et les logos. NodeCG ne peut donc pas y tourner. Il faut un hébergeur qui garde un serveur Node allumé.

## Option A — Railway (le plus simple, ~5 $/mois)
1. Crée un compte sur https://railway.app (plan Hobby).
2. Mets le projet en ligne :
   - **avec GitHub** : pousse le dossier `D:\valorant-nodecg` dans un dépôt **privé**, puis Railway → *New Project* → *Deploy from GitHub repo* ;
   - **ou sans GitHub** : installe la CLI (`npm i -g @railway/cli`), puis dans le dossier : `railway login`, `railway init`, `railway up`.
   Railway détecte le `Dockerfile` tout seul.
3. Dans le service → **Volumes** → *Add Volume*, point de montage : **`/data`** (base, sauvegardes, logos, photos).
4. **Variables** (onglet *Variables*) :
   | Nom | Valeur |
   |---|---|
   | `NODECG_BASE_URL` | `regie.tondomaine.fr` (sans https://) |
   | `NODECG_USER` | `regie` |
   | `NODECG_PASSWORD` | ton mot de passe |
   | `NODECG_SESSION_SECRET` | longue chaîne aléatoire |
   (`PORT` est fourni automatiquement par Railway.)
5. **Settings → Networking → Custom Domain** : `regie.tondomaine.fr`. Railway affiche un enregistrement **CNAME** :
   ajoute-le chez ton registrar (OVH, Gandi, Cloudflare…). Le HTTPS est automatique.
6. Ouvre `https://regie.tondomaine.fr` → connexion avec l'identifiant / mot de passe.

## Option B — Serveur perso (VPS ~4-6 €/mois : Hetzner, OVH, Scaleway…)
1. VPS Ubuntu, installe Docker (`curl -fsSL https://get.docker.com | sh`).
2. Copie le dossier du projet sur le serveur (sans `node_modules`, `db`, `assets`).
3. Chez ton registrar : enregistrement **A** `regie.tondomaine.fr` → IP du VPS.
4. Sur le serveur : `cp .env.example .env`, remplis-le, puis `docker compose up -d --build`.
   Caddy obtient le certificat HTTPS tout seul.

## Après la mise en ligne
1. **Transférer tes données** : sur ta régie locale, panneau **Régie → Données → « Exporter mes données »**
   (équipes, joueurs, réglages, logos et photos dans un seul fichier), puis sur la régie en ligne
   **« Importer un fichier »**. Une sauvegarde est faite avant l'import.
2. **OBS** (sur le PC de stream) : les overlays sont protégés par le mot de passe, OBS utilise une **clé** :
   régie en ligne → icône ⚙ *Settings* en haut à droite → copie la **clé (key)**, puis la source navigateur :
   `https://regie.tondomaine.fr/bundles/valorant-tournament/graphics/stream.html?key=TA_CLE`
3. **Extension Chrome** (import tracker.gg) : recharge-la dans `chrome://extensions` (version 1.1.0) ;
   elle fonctionne sur le domaine tant que tu es connecté à la régie dans le même Chrome.
4. **Export PNG du stinger** : à faire depuis la version locale (il a besoin de Chrome sur la machine).

## En local, rien ne change
`start.bat` : pas de mot de passe, http://localhost:9090. La config est dans `cfg/nodecg.js`
(lit les variables d'environnement ci-dessus seulement si elles existent).
