# KB SERIES × Valorant — NodeCG

Lancer : double-clic sur `start.bat` (ou `npm start`), puis ouvrir http://localhost:9090
Mode dev (redémarre tout seul quand `extension/` change) : `npm run dev`

## Mise en ligne
Voir **docs/DEPLOIEMENT.md** (Railway ou VPS, nom de domaine, mot de passe, transfert des données, clé OBS).

## Dossiers
- `dashboard/` : panneaux de régie · `graphics/` : overlays 1920×1080 (sources navigateur OBS)
- `extension/` : logique serveur (une partie par fichier) · `shared/` : thème (`theme.css`), helpers (`kb.js`), logos
- `Medias/` : références (affiche, logo) · `docs/BRIEF.md` : charte et conventions · `shots/` : captures de contrôle
- `tools/shot.js` : capture d'une page en Chrome headless

## ★ Une seule source OBS
`http://localhost:9090/bundles/valorant-tournament/graphics/stream.html` (1920×1080) contient toutes les couches.
On choisit la scène de fond et on affiche/masque chaque overlay depuis le panneau **Régie** (onglet principal).

## Overlays individuelles — URL : `http://localhost:9090/bundles/valorant-tournament/graphics/<fichier>`
| Fichier | Usage | Panneau |
|---|---|---|
| `starting.html` | Le stream commence bientôt + compte à rebours | Écrans |
| `brb.html` | Pause | Écrans |
| `ending.html` | Fin de stream, résultats du jour | Écrans |
| `schedule.html` | Planning plein écran | Écrans |
| `versus.html` | Présentation du match + rosters | Match & Équipes |
| `veto.html` | Veto des maps | Veto |
| `veto-recap.html` | Récap : ordre des maps, picks, côtés | Veto / Match |
| `transition.html` | Stinger (au-dessus de tout, point de coupe ≈ 800 ms) | Maps & Transitions |
| `map-intro.html` | Intro de map + stats de map par équipe | Maps & Transitions |
| `map-series.html` | Maps de la série | Maps & Transitions |
| `map-result.html` | Résultat de map + MVP | Maps & Transitions |
| `lower-third.html` | 2 lower thirds (gauche + droite, transparent) | Live |
| `ticker.html` | Bandeau défilant bas (transparent) | Live |
| `dual-cam.html` | Écran 50/50 (trous caméra : 40,40 et 980,40 en 900×860) | Live |
| `player-stats.html` | Stats d'un joueur (tracker.gg) | Stats Joueur |
| `player-duel.html` | Duel joueur vs joueur | Stats Joueur |
| `groups.html` | Classement des groupes | Bracket & Groupes |
| `bracket.html` | Arbre de la phase finale | Bracket & Groupes |

## Joueurs
Panneau **Joueurs** (onglet « 1. Match & Joueurs ») : fiche complète par joueur, tout est modifiable à la main (prime sur tracker.gg).
Agents joués par map : panneau **Match & Équipes**.

### Import automatique (extension Chrome)
`chrome://extensions` → mode développeur → « Charger l'extension non empaquetée » → `tools/tracker-extension`. Détails : `tools/tracker-extension/README.md`.

## Stinger en PNG
Panneau Maps & Transitions → « Exporter », ou `node tools/export-stinger.js [--map Ascent]` → `exports/` (60 i/s, transparent, point de coupe image 49).

## Stats joueurs (tracker.gg, sans extension)
tracker.gg bloque les requêtes du serveur (403) : l'import se fait depuis ton navigateur.
1. Une fois : glisser le bouton « ⇪ Envoyer à NodeCG » (panneau Stats Joueur) dans la barre de favoris.
2. Ouvrir le profil tracker.gg du joueur (« Récupérer les stats » l'ouvre pour toi).
3. Cliquer le favori sur la page tracker.gg → le joueur arrive dans NodeCG.
Plan B : copier-coller le JSON de l'API dans le panneau.

## Logos d'équipes
Onglet **Assets** de NodeCG → catégorie « Logos équipes », puis choisir le logo dans le panneau Match & Équipes.
