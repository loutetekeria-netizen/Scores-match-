# Test d’intégration API — ScoreMatch

Date du dernier test réel : 26 août 2026.

## Résultats actuels

| Vérification | Résultat |
|---|---|
| `GET /health` avec API-Football | **PASS, HTTP 200** |
| Authentification API-Football | **PASS** |
| `GET /api/scores?date=En direct (2)` | **PASS, HTTP 200** |
| Match live réel reçu | **PASS, 1 rencontre reçue** |
| Événement de but réel | **PASS, but à la 24e minute** |
| `GET /api/transfers?team=85` | **PASS, HTTP 200** |
| Données de transferts réelles | **PASS, joueurs, dates, clubs et logos reçus** |
| Clé absente des fichiers suivis par Git | **PASS** |
| Build de production | **PASS** |

## Scores live réels

L’appel à API-Football a renvoyé une rencontre en direct : **Al Shabab contre Al Jahra**, en Premier League du Koweït. Le score normalisé était de **1 à 0 à la 45e minute**, avec un événement de but à la 24e minute pour l’équipe locale.

La réponse est passée par `GET /api/scores`, sans accès direct du navigateur à API-Football. La clé est donc restée côté serveur.

## Transferts réels

La route `GET /api/transfers?team=85` fonctionne avec l’identifiant API-Football du Paris Saint-Germain. La réponse contient notamment l’identifiant du joueur, son nom, la date, le type de mouvement, le club de départ, le club d’arrivée et les logos des clubs.

La route impose un filtre `team` ou `player`. Sans filtre, elle retourne HTTP 400 avec `transfer_filter_required`. Cette contrainte évite une requête trop large et limite la consommation du quota API.

## Sécurité

La clé est stockée dans `/home/ubuntu/Scores-match-/.env`, fichier ignoré par Git. Une recherche dans les fichiers suivis ne trouve aucune occurrence de la clé. Elle n’est pas présente dans le bundle frontend ni dans les fichiers poussés sur GitHub.

Le backend applique Helmet, le CORS limité à `APP_ORIGIN`, une limitation de débit et une validation Zod des paramètres. Les réponses sont normalisées côté serveur avant d’être renvoyées au client.

## Build

Le build TypeScript et Vite termine sans erreur. Le bundle produit reste compatible avec la PWA existante.

## Conclusion

La connexion aux scores live avec des données réelles est validée. La route backend `/api/transfers` est également validée avec des données réelles provenant d’API-Football. Les deux flux passent par le backend ScoreMatch et ne dévoilent pas la clé au navigateur.

Pour la production, la clé doit être ajoutée comme secret dans l’hébergeur utilisé, puis la clé actuellement partagée dans la conversation doit être révoquée et remplacée depuis le tableau de bord API-Football.

## Activation des compétitions et des matchs live

Le catalogue `GET /api/competitions` expose les huit championnats configurés avec leurs identifiants API-Football. La route `/api/scores` accepte maintenant un paramètre `league` validé côté serveur afin de charger les rencontres live d’un championnat précis.

La vue Compétitions charge ce catalogue, rend chaque championnat sélectionnable et affiche un état de chargement, une erreur fournisseur, une liste de matchs live ou un état vide. Sur l’écran principal, les matchs dont le statut est `live` sont triés avant les autres et le compteur live est calculé depuis la réponse API.

## Enrichissement des interfaces clubs, joueurs et compétitions

Les routes `GET /api/teams` et `GET /api/players` utilisent maintenant les réponses API-Football avec une saison configurable. Le forfait utilisé pendant le test refuse les saisons 2025 et 2026 et autorise les saisons 2022 à 2024 ; `API_FOOTBALL_SEASON=2024` est donc la valeur par défaut documentée.

Le test réel `GET /api/teams?league=39` a retourné 20 clubs de Premier League avec leurs écussons API-Football. Le test `GET /api/players?league=39&page=1` a retourné 20 joueurs avec photos, club, position et statistiques disponibles comme apparitions, buts, passes, tirs, passes réussies, minutes et note.

La vue Équipes propose une recherche et affiche les écussons renvoyés par le fournisseur. La vue Joueurs propose une recherche, les photos réelles et les statistiques disponibles. La vue Compétitions affiche les logos API-Sports associés aux huit identifiants de ligue configurés.

La vue Paramètres utilise maintenant des contrôles contrôlés et persiste les alertes de buts, l’actualisation automatique et le mode compact dans le stockage local du navigateur. Elle indique explicitement que cette persistance est locale tant qu’aucun compte authentifié n’est disponible.
