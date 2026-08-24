# Test d’intégration API — ScoreMatch

Date du test : 24 août 2026.

## Résultats

| Vérification | Résultat |
|---|---|
| `GET /health` | PASS — HTTP 200 |
| En-têtes Helmet | PASS |
| CORS restreint à `APP_ORIGIN` | PASS |
| Rate limiting | PASS |
| `GET /api/scores?date=2026-08-24` sans vraie clé | PASS — erreur contrôlée HTTP 502 `scores_provider_unavailable` |
| Normalisation live avec données réelles | NON TESTABLE sans token fournisseur valide |
| `GET /api/transfers` | NON DISPONIBLE — aucune route backend transferts n’est encore implémentée |
| Vue Transferts frontend | Fonctionnelle visuellement avec données de démonstration |
| Build de production | PASS — TypeScript et Vite sans erreur |

## Problème détecté et corrigé

La route `/health` affichait `SPORTS_API_PROVIDER` alors que les routes de scores sélectionnent le fournisseur avec `SCORES_PROVIDER`. Le test avec `SCORES_PROVIDER=api-football` indiquait donc à tort `sportmonks` dans la santé. La route utilise maintenant `SCORES_PROVIDER`, qui est le nom canonique déjà employé par les routes `/api/scores` et `/api/matches/:id`.

## Vérification frontend

La PWA s’ouvre correctement sur Vite. L’état de lancement affiche le logo PNG intégré dans le conteneur SVG, puis l’écran principal présente deux matchs live, des scores, des minutes, des événements et des écussons locaux dans `public/team-logos`. La navigation inférieure ouvre bien la vue Transferts.

La vue Transferts présente cinq lignes de transferts officiels et fonctionne visuellement. Cependant, son contenu est statique dans `src/main.tsx` : aucun appel réseau vers une route de transferts n’a été observé. Le bouton « Actualiser les transferts » déclenche actuellement une notification locale, mais ne lance pas de synchronisation serveur.

Le build de production est PASS. TypeScript et Vite terminent sans erreur. La sortie indique environ 73 kB JavaScript compressé et 8 kB CSS compressé.

## Test backend après correction

Avec `SCORES_PROVIDER=api-football` et une valeur de clé factice, `GET /health` retourne correctement `{ "ok": true, "provider": "api-football" }`. La route `GET /api/scores?date=En%20direct%20%282%29` retourne HTTP 502 et `{ "error": "scores_provider_unavailable" }`, ce qui confirme que l’indisponibilité du fournisseur est gérée explicitement plutôt que de faire planter l’application.

La route `GET /api/transfers` retourne HTTP 404 `not_found`, car aucun adaptateur de transferts n’est encore exposé par le backend.

## Conclusion

L’intégration technique des scores est prête à recevoir une clé réelle et l’interface de démonstration affiche correctement les états de chargement, les matchs live, les événements et les écussons. La récupération de matchs réels n’a pas pu être validée dans cet environnement, car aucune clé fournisseur valide n’est disponible. Les transferts ne sont pas encore connectés à une API : les données visibles dans l’application sont uniquement des données de démonstration.

La prochaine étape fonctionnelle consiste à choisir un fournisseur exposant les transferts, ajouter un adaptateur serveur sécurisé, créer `GET /api/transfers`, puis remplacer `transferRows` par une récupération avec cache et état `loading/error/empty`.
