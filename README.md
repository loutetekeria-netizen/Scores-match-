# ScoreMatch

ScoreMatch est une Progressive Web App mobile-first dédiée aux scores de football en direct. L’interface actuelle met l’accent sur la lecture immédiate du score, le statut du match, les événements récents, les favoris, les filtres par statut, la recherche d’équipe, le calendrier, le thème sombre et le fonctionnement hors ligne du shell applicatif.

> **État actuel :** l’interface et les états UX sont fonctionnels avec des données mockées. La connexion à une API sportive réelle, la base de données des utilisateurs, le stockage des favoris côté serveur et le worker de notifications push doivent encore être déployés côté backend.

## Fonctionnalités disponibles

| Fonctionnalité | État | Détails |
|---|---|---|
| Liste des matchs | Fonctionnelle | Matchs regroupés par compétition avec score, statut et événement récent. |
| Filtres | Fonctionnelle | Tous, en direct, à venir et terminés. |
| Recherche | Fonctionnelle | Recherche locale par nom d’équipe ou compétition. |
| Favoris | Prototype fonctionnel | Favoris conservés dans l’état React de la session ; persistance serveur à ajouter. |
| Calendrier | Prototype fonctionnel | Sélection de date côté interface ; source de matchs réelle à brancher. |
| Onboarding | Fonctionnel visuellement | Sélection d’équipes favorites avec données locales. |
| Thème sombre | Fonctionnelle | Tokens et composants adaptés au thème sombre. |
| Service worker | Fonctionnel | Cache shell, repli hors ligne, cache runtime et gestion Push. |
| Notifications Push | Socle frontend | Souscription VAPID et réception service worker ; route backend encore nécessaire. |
| API de scores | Non connectée | Les cartes affichent actuellement des fixtures mockées. |
| Authentification | Non implémentée | À fournir avec le backend avant la synchronisation multi-appareils. |

## Stack technique

Le projet utilise React 19, TypeScript, Vite, Lucide React et une feuille CSS mobile-first. Le build est entièrement statique ; aucun secret ne doit être placé dans le frontend. Les dépendances sont déclarées dans `package.json` et verrouillées par `pnpm-lock.yaml`.

| Outil | Rôle |
|---|---|
| React | Composants et état de l’interface. |
| TypeScript | Typage statique et réduction des erreurs de contrat. |
| Vite | Développement local et build de production. |
| Lucide React | Icônes vectorielles cohérentes. |
| Service Worker | Cache hors ligne et réception des notifications Push. |
| Web Push / VAPID | À installer côté serveur pour l’envoi des alertes. |
| API sportive | À choisir et connecter côté serveur pour fixtures, compétitions et événements. |

## Prérequis

Installez Node.js 20 ou une version LTS plus récente ainsi que pnpm. Le projet a été validé avec Node.js 22 et pnpm 11.

```bash
node --version
pnpm --version
```

## Installation et démarrage

```bash
git clone https://github.com/loutetekeria-netizen/Scores-match-.git
cd Scores-match-
pnpm install
pnpm dev
```

Ouvrez ensuite `http://localhost:5173/matches`. Pour vérifier le build de production :

```bash
pnpm run build
pnpm run preview
```

Les scripts disponibles sont les suivants :

| Commande | Usage |
|---|---|
| `pnpm dev` | Serveur Vite de développement avec HMR. |
| `pnpm run build` | Vérification TypeScript puis build production. |
| `pnpm run preview` | Servir le dossier `dist` comme production locale. |
| `pnpm run lint` | Vérification TypeScript sans générer le bundle. |
| `pnpm audit` | Recherche des vulnérabilités connues dans les dépendances. |

## Comprendre le fonctionnement du projet

Le point d’entrée HTML est `index.html`. Il charge `src/main.tsx`, qui monte l’application React et enregistre `public/sw.js` au chargement de la page. `src/main.tsx` contient actuellement les modèles mockés, les filtres, les favoris de session, les modales et les composants d’interface. `src/styles.css` contient le design system et les adaptations responsive.

Le service worker précache le shell applicatif, utilise le réseau en priorité pour les navigations HTML, rafraîchit les assets statiques en arrière-plan et renvoie `/offline.html` lorsque la navigation échoue. Les futures requêtes `/api/` sont traitées par une stratégie réseau-first afin de ne pas présenter un ancien score sans indication.

Le module `src/push.ts` demande l’autorisation de notification, crée une souscription VAPID et l’envoie à `POST /api/push/subscribe`. Cette route doit être créée dans un backend sécurisé et doit associer l’appareil aux équipes ou matchs suivis.

## Ajouter toutes les compétitions réellement disponibles

Il n’existe pas de source gratuite et universelle garantissant toutes les compétitions, tous les matchs, tous les événements et toutes les fréquences de mise à jour. Il faut choisir un fournisseur, vérifier sa couverture exacte par saison et respecter son contrat.

API-Football annonce une couverture de 1 239 ligues et coupes sur sa page publique de couverture [1]. Sportmonks annonce plus de 2 200 ligues et propose des données de fixtures, scores, événements, compositions, statistiques et classements, avec une couverture qui dépend du nombre de ligues choisi dans l’abonnement [2]. Ces chiffres sont des déclarations de couverture des fournisseurs et ne garantissent pas que chaque champ soit disponible pour chaque compétition.

Pour intégrer les compétitions proprement, le backend doit :

1. synchroniser périodiquement la liste des pays, compétitions, saisons et équipes ;
2. conserver les identifiants du fournisseur au lieu de déduire les identités depuis les noms ;
3. stocker une table normalisée `competitions`, avec pays, type, logo, fuseau et statut de couverture ;
4. importer les fixtures par saison et date dans une base de données ;
5. synchroniser les matchs actifs avec une fréquence conforme au contrat API ;
6. dédupliquer les événements à partir d’un identifiant stable ou d’une clé déterministe ;
7. afficher une date de dernière synchronisation et un état « données potentiellement obsolètes » ;
8. ne jamais appeler l’API sportive directement depuis le navigateur avec une clé secrète ;
9. mettre en cache les compétitions et fixtures froides, mais traiter les scores live par réseau prioritaire ;
10. afficher uniquement les compétitions réellement couvertes dans la réponse API.

### Architecture recommandée des données

```text
Provider sportif
      ↓
Worker de synchronisation
      ↓
Normalisation + déduplication
      ↓
Base de données
      ↓
API ScoreMatch sécurisée
      ↓
React PWA + cache offline
      ↓
Service Worker Push
```

Un modèle minimal peut contenir `competitions`, `seasons`, `teams`, `fixtures`, `match_events`, `users`, `favorites` et `push_subscriptions`. Les scores et événements ne doivent jamais être modifiés par le client ; le serveur est l’autorité de vérité.

## Configuration des notifications Push

Copiez `.env.example` vers `.env.local` pour le développement frontend, mais ne mettez jamais la clé privée VAPID ou le token de l’API sportive dans une variable `VITE_`. La procédure complète est documentée dans [`PUSH_NOTIFICATIONS.md`](./PUSH_NOTIFICATIONS.md).

```bash
cp .env.example .env.local
```

Le frontend est prêt à utiliser `VITE_VAPID_PUBLIC_KEY`. Le backend doit fournir les routes de souscription, de désinscription et d’envoi. Pour une API GET sans webhook documenté, un worker persistant interroge les livescores, détecte un nouvel événement `goal`, le déduplique, puis envoie une notification Web Push.

## Déploiement

Le projet statique peut être déployé sur une plateforme qui sert les fichiers avec HTTPS et qui autorise le service worker à la racine. Les notifications Push exigent un contexte sécurisé en production. Pour les données live et les notifications, ajoutez un backend hébergé séparément ou migrez vers une structure full-stack avec une base de données, des variables secrètes, une tâche récurrente et une route Push.

## Performance

L’audit Lighthouse du build de production local a donné Performance 100, Accessibilité 94, Best Practices 96 et SEO 91, avec FCP 1,3 s, LCP 1,4 s, TBT 0 ms et CLS 0. Les résultats complets, ainsi que la distinction entre audit HMR et audit production, sont conservés dans [`perf_push_findings.md`](./perf_push_findings.md).

## Sécurité

L’audit initial est documenté dans [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md). Le point critique avant production est l’absence actuelle de backend : il ne faut donc pas connecter une clé API sportive au frontend. Avant mise en production, ajoutez une validation serveur des souscriptions Push, une authentification, une limitation de débit, une politique CSP, des logs sans secrets, la suppression des souscriptions expirées et une vérification des dépendances en CI.

## Références

[1]: https://www.api-football.com/coverage — Couverture publique API-Football.

[2]: https://www.sportmonks.com/football-api/coverage/ — Couverture publique Sportmonks et fonctionnalités par compétition.

## API réelle et centre du match

Le client `src/scoresApi.ts` appelle le backend via `VITE_API_BASE_URL`. Sans cette variable, la PWA conserve les données de démonstration. Lorsque l’URL est définie, elle appelle `GET /api/scores?date=...` et actualise les scores toutes les 15 secondes, puis appelle `GET /api/matches/:id` à l’ouverture d’une rencontre pour afficher les événements réels et les actualités retournées par le backend.

Un adaptateur Sportmonks et un serveur Express sont maintenant présents dans `server/`. Ils exposent `/health`, `/api/scores` et `/api/matches/:id`. Configurez le serveur ainsi :

```bash
cp .env.example .env
# renseigner SPORTMONKS_API_TOKEN côté serveur
pnpm install --ignore-scripts
pnpm server:dev
```

Lancez le frontend séparément avec `pnpm dev`, puis définissez `VITE_API_BASE_URL=http://localhost:4310` dans l’environnement Vite. Le backend normalise les participants, scores, statuts et événements du fournisseur. Le type `news` est prévu dans le contrat normalisé ; Sportmonks ne fournit pas automatiquement un flux éditorial universel, donc les actualités restent vides tant qu’un flux de nouvelles autorisé n’est pas connecté.

Le token sportif doit rester exclusivement côté serveur. En production, utilisez HTTPS, une base de données pour mettre en cache les fixtures et les événements, un worker persistant pour les livescores et une file de traitement pour les notifications. Le frontend ne doit jamais appeler Sportmonks directement.
