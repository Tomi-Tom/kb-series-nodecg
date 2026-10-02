# La régie, panneau par panneau

Pour le régisseur : à quoi sert chaque panneau, section par section, dans l'ordre des onglets ; puis l'import des joueurs depuis tracker.gg, pas à pas.

La régie s'ouvre sur http://localhost:9090. Les onglets sont en haut : **MAIN WORKSPACE**, **1. MATCH & JOUEURS**, **2. ÉCRANS & TOURNOI**, **3. DONNÉES**. En haut à droite, **ASSETS** sert à envoyer les logos et les photos (voir [Équipes & Joueurs](#équipes--joueurs)).

## Le vocabulaire commun
| À l'écran | Signification |
|---|---|
| **AFFICHER** | L'overlay est masqué. Un clic l'affiche à l'antenne. |
| **● À L'ANTENNE** | L'overlay est à l'antenne. Un clic le masque. La pastille devant son nom est allumée. |
| Bouton grisé | L'overlay n'a rien à montrer (ex. **Stats joueur** sans joueur choisi). |
| **Tout masquer** | Masque les overlays du panneau (ou de la section). N'efface aucune donnée. |
| Confirmation en 2 clics | Tout bouton qui efface ou remplace des données change de texte au 1er clic (ex. « Supprimer ? », « Effacer tout le veto ? »). Reclique dans les secondes qui suivent pour confirmer ; sinon il revient à son état normal et rien ne se passe. |
| « Modifications non appliquées » / « Modifications non enregistrées » | Tu as modifié un formulaire (lower third, ticker, casters) sans l'envoyer à l'antenne. Clique **Mettre à jour** ou **Enregistrer**. Tant qu'un champ est modifié, ce qui vient d'un autre panneau ne l'écrase pas. |

Les autres champs (textes des écrans, scores, réglages de la transition…) s'enregistrent tout seuls dès que tu les changes.

### Un seul plein écran à la fois
Case **Un seul plein écran à la fois (masque les autres automatiquement)**, dans la Régie, cochée par défaut : afficher un overlay plein écran (versus, veto, maps, joueurs, groupes, bracket) masque les autres plein écran. Les lower thirds et le ticker ne sont pas concernés. Ce choix est mémorisé dans ce navigateur et vaut pour tous les panneaux.

---

## MAIN WORKSPACE

### Régie · tout afficher / masquer
Le panneau du direct. Il ne touche jamais aux données.
- **Match en cours** : équipes, score de la série, phase, format, map en cours et son score.
- **Transition** : **1. Type** (**Logo seul** ou **Logo + map**, avec le menu de la map), **2. Vers** (ce qui se passe quand l'écran est couvert : rien, **Tout masquer · retour au jeu**, une scène de fond ou un overlay plein écran), puis **▶ LANCER LA TRANSITION**. La ligne en dessous rappelle la durée et le point de coupe (réglables dans Maps & Transitions).
- **Sans transition** : **Tout masquer · retour au jeu** masque tous les overlays et repasse sur le jeu. Les boutons de scène de fond (**Jeu (aucune)**, **Bientôt**, **Pause**, **Fin**, **Planning**, **50/50 caméras**) changent le fond de `stream.html` ; une scène autre que **Jeu** masque d'abord les overlays plein écran. **Passage** : **Fondu** ou **Coupe sèche**.
- **Overlays** : chaque overlay avec son bouton **AFFICHER** / **● À L'ANTENNE**, rangés par groupe (En jeu, Match, Maps, Joueurs, Tournoi), et la case **Un seul plein écran à la fois**.
- **Lower thirds rapides** : gauche et droite ; menu **Preset…**, style, titre, sous-titre, **Mettre à jour** (ou Entrée dans un champ), **AFFICHER**. C'est le même lower third que dans le panneau Live : les deux restent synchronisés.
- **URLs pour OBS** (à déplier) : bouton **Copier** pour chaque overlay. Seule `stream.html` (★ STREAM) est nécessaire.

### Live · score de série, lower thirds, ticker, 50/50
- **Score de la série** : **+1** / **−1** map gagnée pour chaque équipe (dans l'ordre gauche → droite de l'écran). **+1** termine la map en cours au profit de l'équipe et passe à la map suivante. **⇄ Inverser gauche / droite** échange les côtés à l'écran.
- **Lower thirds (gauche / droite)** : pour chaque côté, **AFFICHER**, les presets en 1 clic (casters, « Pause technique », « Prochain match », puis les tiens), **Charger un preset dans les champs (sans l'afficher)**, **Style** (Standard, Annonce dorée, Alerte rouge), **Masquer après (s, 0 = manuel)**, **Surtitre**, **Titre**, **Sous-titre**, **Mettre à jour (sans masquer)**, et **Enregistrer comme preset**. **Masquer les 2 lower thirds** masque les lower thirds gauche et droite (pas le ticker).
- **Mes presets de lower third** : **◀ G** / **D ▶** affichent le preset à gauche ou à droite ; ↑ ↓ pour l'ordre ; **Renommer** ; ✕ supprime (2 clics).
- **Ticker défilant (bas d'écran)** : **AFFICHER** agit tout de suite. Messages (un par ligne), vitesse, case **Partenaires CYCOM / EPITECH** : à envoyer avec **Enregistrer le ticker**.
- **Écran 50/50 (dual-cam)** : coordonnées des trous caméra ; pour chaque moitié, un label (**Aucun**, **Texte libre**, **Équipe**, **Joueur**), un titre et un sous-titre ; le bandeau du match en bas. Appliqué en direct. La scène s'affiche avec le bouton **50/50 caméras** de la Régie.
- **Casters (presets des lower thirds)** : **+ Ajouter un caster**, ✕ pour retirer, puis **Enregistrer**. Chaque caster devient un preset de lower third.

### Maps & Transitions
- **Aperçu** : joue la transition dans le panneau seulement (rien ne part à l'antenne) : ▶, ⏸, curseur, case **relance auto**. Le menu sous l'aperçu choisit la map montrée (aperçu, antenne et export).
- **Transition à l'antenne** : **▶ Transition logo** et **▶ Transition + map** jouent la transition à l'antenne, sans rien changer d'autre. Le texte en dessous donne le point de coupe.
- **Réglages de la transition (enregistrés automatiquement)** : chaque changement part **aussitôt à l'antenne**. **Préréglages** (Rapide, Normal, Long sur la map, Coupure nette, Cinématique, Explosif) et les tiens (**Enregistrer mes réglages**, ✕ en 2 clics) ; **Durées** ; **Volets** ; **Logo** ; **Map**.
- **Revenir aux réglages par défaut** : 2 clics, appliqué à l'antenne aussitôt (tes préréglages perso sont gardés).
- **Exporter en séquence PNG** : **Exporter (logo)** / **Exporter + map choisie** → dossier `exports/` (voir [OBS.md](OBS.md#la-transition-stinger)).
- **Écrans maps** : **Intro de map** (menu **Map**, par défaut « Auto — map courante »), **Maps de la série**, **Résultat de map** (map, **MVP** parmi les joueurs de l'équipe gagnante, ou nom libre + équipe + **OK**), chacun avec **AFFICHER**. **Tout masquer** masque ces trois écrans.

---

## 1. MATCH & JOUEURS

### Équipes & Joueurs
- **Tableau** : une colonne par équipe, plus **Sans équipe** (les joueurs à placer). Les 5 premiers d'une équipe sont titulaires, les suivants remplaçants.
  - **+ Nouvelle équipe** : nom, TAG, couleur, logo, puis **Créer l'équipe**.
  - Clic (ou Entrée) sur l'en-tête d'une équipe : modifier nom, TAG, couleur, logo, **Enregistrer** ; **Supprimer** demande 2 clics (ses joueurs passent dans « Sans équipe »).
  - Champ **+ Pseudo#TAG ou lien tracker.gg** en bas d'une colonne, puis **+** ou Entrée : ajoute le joueur dans cette colonne et lance son import tracker.gg.
  - Glisser une carte d'une colonne à l'autre, ou menu **Déplacer…** ; menu de rôle sur chaque carte.
  - Pastilles : **TRK** allumée = profil importé de tracker.gg ; **MAN** allumée = données saisies à la main.
- **Logos** : envoie le fichier dans **ASSETS** → catégorie « Logos équipes », puis choisis-le dans le menu logo du formulaire de l'équipe (ou colle une URL ; vide = monogramme).
- **Fiche joueur** (clic ou Entrée sur une carte) :
  - **Importer depuis tracker.gg** (ou **Actualiser depuis tracker.gg**) et **Ouvrir tracker.gg ↗** ;
  - **Identité** : pseudo affiché, nom réel, Riot ID, équipe, rôle. Changer le Riot ID met tout à jour (équipes, overlays, agents joués) ; il faut ensuite réimporter le profil ;
  - **Photo** : choisis-la dans le menu (photos envoyées dans **ASSETS** → « Photos joueurs (PNG détouré conseillé) ») ou colle une URL ; ✕ la retire ;
  - **Rang** et **Peak** : icône officielle ou texte libre ; **Auto** revient à la valeur tracker.gg ;
  - **Stats** (12 valeurs) et **Agents favoris** (3) : en gris, la valeur tracker.gg ; ce que tu tapes la remplace ;
  - **↺ Revenir aux données tracker** (efface rang, stats et agents saisis à la main) et **Supprimer le joueur** (fiche, profil et place en équipe) : 2 clics chacun.
- **Aperçu · ce que verront les overlays** : la fiche telle que les overlays l'affichent ; cadre doré = valeur saisie à la main.
- **Import tracker.gg** : état de l'extension Chrome, favori de secours, copier-coller du JSON (voir [plus bas](#importer-les-joueurs-depuis-trackergg)).

### Match (maps, scores, agents)
- **Barre du haut** : **Versus**, **Veto des maps** et **Récap du veto**, chacun avec **AFFICHER** / **● À L'ANTENNE**.
- **Match** : **Phase** (liste, ou « Autre (libre)… »), **Format** (BO1, BO3, BO5), **Équipe A**, **Équipe B**, **⇄ Inverser gauche / droite** (côtés à l'écran).
- **Tableau des maps** : map, pick, **Score A**, **Score B**, vainqueur, statut (À venir, En cours, Terminée). **Définir en cours** fait de cette map la map courante ; **Terminer** la passe en « Terminée » avec le vainqueur selon le score (refusé en cas d'égalité) ; ✕ supprime la map (2 clics).
- **+ Ajouter une map** ; **Remplir depuis le veto** crée la liste des maps à partir des picks et du decider du veto (2 clics si des scores existent déjà ; les scores des maps gardées sont conservés) ; **Réinitialiser le match** remet scores, vainqueurs et statuts à zéro, revient à la map 1 et annule l'inversion gauche / droite (2 clics).
- **Agents joués par map** : choisis la map, puis l'agent de chaque joueur. **Copier depuis la map précédente** ; **Effacer** (2 clics).
- **Équipes du match** : rappel des 5 titulaires de chaque équipe. Les équipes se gèrent dans **Équipes & Joueurs**.

### Veto des maps
- **Écrans** : **Veto des maps**, **Versus**, **Récap du veto** avec **AFFICHER** / **● À L'ANTENNE**.
- **Bandeau d'étape** : qui doit bannir ou choisir, ou quelle équipe choisit son côté.
- **Grille des maps** : un clic sur une map joue l'étape en cours (ban, pick ou decider). Après un pick ou le decider, choisis l'équipe qui prend son côté, puis **… en ATTAQUE** ou **… en DÉFENSE**.
- **↶ Annuler la dernière étape** (annule d'abord le choix du côté, puis l'étape) ; **Réinitialiser le veto** efface toutes les étapes (2 clics).
- **Déroulé** : étapes jouées et à venir.
- **Format du veto & pool de maps** (à déplier) : **Préréglage** (BO1, BO3, BO5) puis **Appliquer** (2 clics si un veto est en cours) ; modifier les étapes, **+ Étape** ; cocher les maps du pool.

Le veto ne remplit pas tout seul la liste des maps du match : une fois fini, clique **Remplir depuis le veto** dans le panneau Match.

### Stats Joueur · fiche et duel
- **Stats joueur** : **Équipe** (ou « Sans équipe ») puis **Joueur**, et l'agent mis en avant. **AFFICHER** (grisé tant qu'aucun joueur n'est choisi).
- **Duel (face-à-face)** : un joueur à gauche, un à droite. **Équipes du match** propose un joueur de chaque équipe du match (de même rôle si possible) ; **⇄** inverse les côtés. **AFFICHER**.
- **Profils manquants** : joueurs d'équipe sans profil tracker.gg, à importer dans **Équipes & Joueurs**.
- **Profils importés** : un clic sur un profil le choisit pour l'overlay **Stats joueur** ; ✕ (2 clics) supprime seulement le profil tracker.gg (la fiche et la place en équipe sont gardées).

---

## 2. ÉCRANS & TOURNOI

### Écrans (attente, pause, fin, planning)
- **À l'antenne : …** (en haut) : scène de fond actuellement diffusée. Elle se change dans la Régie.
- **Compte à rebours** : **Texte au-dessus (écran d'attente)** ; **Lancer (minutes)** ou **Jusqu'à cette heure** ; **−1 min**, **+1 min**, **+5 min**, **+10 min** ; **Réinitialiser** l'arrête ; **Message à zéro**. Le même compte à rebours sert à l'écran d'attente et à la pause.
- **Écran d'attente (starting)**, **Pause (brb)**, **Fin de stream (ending)** : textes de chaque écran (enregistrés en tapant).
- **Rotation en bas de la pause** : éléments affichés à tour de rôle (texte libre, prochain match, planning à venir, score de la série, infos tournoi) : case pour activer, durée, ↑ ↓, ✕ (2 clics), **+ Ajouter**, **Rotation par défaut** (2 clics).
- **Planning** : sur-titre et titre de l'écran ; un bloc par match (heure, libellé, deux équipes, statut, score en maps gagnées) ; **+ Ajouter un match**, **Trier par heure**, ✕ (2 clics). Les matchs « Terminé » apparaissent dans les résultats de l'écran de fin.
- **Infos tournoi** : nom, présenté par, édition, sous-titre, dates, hashtag, lieu, repris par les écrans.
- **Aperçus** : liens qui ouvrent chaque écran dans un nouvel onglet.

### Bracket & Groupes
- **Affichage** : **Groupes** et **Bracket** avec **AFFICHER** / **● À L'ANTENNE** ; case **Mettre en avant le match en cours (LIVE)**.
- **Actions** : **Remplir les quarts depuis les groupes** (2 clics si des quarts sont déjà joués) ; **Réinitialiser** vide groupes et phase finale (2 clics, sauvegarde automatique avant).
- **Phase de groupes** : nombre de qualifiés par groupe (en or) ; pour chaque groupe, équipes, victoires, défaites, rounds gagnés et perdus. Classement et différence se calculent seuls. **+ Équipe**, **+ Ajouter un groupe**, ✕ sur un groupe (2 clics).
- **Phase finale** : pour chaque match, libellé, heure, statut, équipes, scores, bouton **V** (vainqueur). Les vainqueurs avancent seuls ; les perdants des demi-finales vont en petite finale.

Le bracket, le planning et le match en cours sont indépendants : un score saisi dans **Match** n'est pas recopié dans le planning ni dans le bracket.

---

## 3. DONNÉES

### Données · sauvegarde, import, réglages
- **1. Sauvegarder / transférer** : **⬇ Exporter mes données** (un fichier avec tout, logos et photos compris), **⬇ Exporter sans les logos / photos**, **⬆ Importer un fichier…** (remplace les données actuelles ; sauvegarde avant ; overlays masqués après).
- **2. Sauvegardes automatiques** : les 50 dernières, avec date et raison ; **Restaurer** (2 clics) ; **↻ Actualiser la liste**.
- **3. Tester** : **Charger des données de test** (2 clics) remplit match, scores, veto, agents, planning, bracket et compte à rebours pour répéter. Aucun joueur créé ; tes équipes sont gardées (des équipes adverses vides sont ajoutées s'il en faut 8).
- **4. Réinitialiser** : coche les catégories à effacer, puis **Réinitialiser la sélection** (2 clics, sauvegarde avant).
- **5. Réglages** : **Recharger automatiquement les overlays quand leur code change** (à couper pendant le direct) ; **↻ Mettre à jour les maps et agents Valorant**.

Tout le détail : [DONNEES.md](DONNEES.md).

---

## Importer les joueurs depuis tracker.gg
tracker.gg refuse les demandes venant du serveur de la régie : l'import passe par **ton** navigateur. Tout se fait dans le panneau **Équipes & Joueurs**. Le joueur doit avoir un profil tracker.gg public avec des parties classées cette saison.

### Méthode 1 : l'extension Chrome (recommandée, tout automatique)
Une seule fois :
1. Dans Chrome, ouvre `chrome://extensions`, active le **Mode développeur** (en haut à droite).
2. **Charger l'extension non empaquetée** → choisis le dossier `tools/tracker-extension` du projet.
3. Recharge la régie (F5). En haut du panneau **Équipes & Joueurs**, la pastille passe au vert : **Extension tracker.gg détectée** (bouton ⟳ pour re-tester).

Le lien **Guide d'installation** du panneau ouvre le [guide complet de l'extension](../tools/tracker-extension/README.md).

Ensuite, pour chaque joueur :
1. Tape `Pseudo#TAG` (ou colle le lien de son profil tracker.gg) dans **+ Pseudo#TAG ou lien tracker.gg** en bas de la colonne de son équipe, puis Entrée ;
   ou, sur sa fiche, clique **Importer depuis tracker.gg** / **Actualiser depuis tracker.gg**.
2. Un onglet tracker.gg s'ouvre en arrière-plan puis se referme. La carte passe en **TRK**.

### Méthode 2 : le favori « ⇪ Envoyer à NodeCG »
Une seule fois :
1. Panneau **Équipes & Joueurs** → carte **Import tracker.gg** → déplie **Favori de secours « ⇪ Envoyer à NodeCG » (sans extension)**.
2. Affiche la barre de favoris de Chrome (Ctrl+Maj+B) et fais-y glisser le bouton **⇪ Envoyer à NodeCG**.

Le favori contient l'adresse de la régie où tu l'as pris : si la régie change d'adresse (autre PC, régie en ligne), refais cette étape.

Ensuite, pour chaque joueur :
1. Ouvre sa page tracker.gg : **+** de la colonne (ou Entrée dans le champ), **Importer depuis tracker.gg** ou **Ouvrir tracker.gg ↗** sur sa fiche.
2. Sur la page tracker.gg du joueur, clique sur le favori **⇪ Envoyer à NodeCG**. Une petite fenêtre de la régie s'ouvre et confirme ; la carte passe en **TRK**.

### Méthode 3 : copier-coller du JSON
1. Ouvre la fiche du joueur (clic sur sa carte).
2. Carte **Import tracker.gg** → déplie **Plan C : copier-coller le JSON**.
3. Clique sur **le lien API de Pseudo#TAG** : une page de texte s'ouvre.
4. Sur cette page, Ctrl+A puis Ctrl+C.
5. Reviens dans la régie, colle dans la zone de texte, puis **Importer le JSON**.

Si tracker.gg affiche une vérification anti-robot ou une erreur : voir [DEPANNAGE.md](DEPANNAGE.md#import-trackergg).
Sans profil tracker.gg, tout peut aussi se saisir à la main dans la fiche du joueur.
