# Performance et notifications — état initial

## Lighthouse local

URL auditée : http://127.0.0.1:5173/matches

Résultats initiaux : Performance 55, Accessibilité 94, Best Practices 96, SEO 91. Les métriques signalées sont FCP 21,9 s, LCP 41,2 s, TBT 70 ms et CLS 0,01.

Le résultat FCP/LCP est très probablement dégradé par l’import Google Fonts externe présent dans `src/styles.css`, particulièrement pénalisant dans un audit sans accès réseau fiable. La première optimisation sera de supprimer cet appel externe et de revenir à une pile système locale.

## Service worker initial

Le service worker `public/sw.js` utilise une stratégie unique : vérifier le cache, sinon faire un fetch puis mettre en cache chaque réponse GET. Il ne distingue pas les navigations HTML, les assets statiques et les futures requêtes API. Le shell est limité à `/`, `/matches`, le manifest et l’icône, sans précache des fichiers hashed générés par Vite. La stratégie offline peut donc dépendre d’un premier chargement réseau réussi et retourner la racine pour certaines requêtes sans distinguer les types de ressources.

## API football

La documentation officielle d’API-Football expose les endpoints `fixtures`, `events`, `lineups`, `statistics` et les livescores. L’authentification se fait par clé dans l’en-tête `x-apisports-key`, et l’API est configurée pour les requêtes GET [1]. La page consultée ne fournit pas de mécanisme webhook clairement exposé dans la documentation extraite ; l’architecture recommandée par défaut doit donc prévoir un polling serveur contrôlé des fixtures/events, avec déduplication des événements.

## Références

[1]: https://www.api-football.com/documentation-v3 — Documentation officielle API-Football v3.

## Audit après optimisation

L’audit sur le serveur de production Vite (`http://127.0.0.1:4173/matches`) donne : Performance 100, Accessibilité 94, Best Practices 96 et SEO 91. Les métriques sont FCP 1,3 s, LCP 1,4 s, TBT 10 ms et CLS 0. Le premier audit sur le serveur Vite HMR était non représentatif et affichait FCP 21,9 s et LCP 41,2 s ; le build de production est la mesure à retenir.

Le service worker de production est enregistré et activé. Les caches observés sont `scorematch-v2-shell` avec `/`, `/matches`, `/offline.html`, le manifest et l’icône, ainsi que `scorematch-v2-runtime` avec les ressources demandées. Le contrôleur est actif sur le scope racine.

La vérification ne simule pas encore une coupure réseau complète dans le navigateur ; elle confirme l’installation, l’activation et le remplissage des caches. Une validation hors ligne complète doit être faite dans Chrome DevTools ou sur un appareil réel.
