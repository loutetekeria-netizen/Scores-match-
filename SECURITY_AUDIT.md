# Audit de sécurité ScoreMatch

## Périmètre

Cet audit porte sur le dépôt frontend actuel, le service worker, le module Web Push, la configuration de build, les dépendances et les pratiques de gestion des secrets. Il ne remplace pas un test d’intrusion du backend, car le dépôt actuel ne contient pas encore de serveur, de base de données ou de route API réelle.

## Synthèse

| Gravité | Sujet | État | Action |
|---|---|---|---|
| Critique avant production | Absence de backend sécurisé pour l’API sportive | Ouvert | Ajouter un serveur qui garde les tokens, normalise les données et expose des routes contrôlées. |
| Élevée | Route `/api/push/subscribe` non implémentée | Ouvert | Valider, authentifier, limiter et stocker les souscriptions côté serveur. |
| Élevée | Authentification et autorisation absentes | Ouvert | Ajouter comptes, sessions sécurisées, contrôle d’accès aux favoris et préférences. |
| Élevée | Absence de CSP et d’en-têtes de sécurité configurés | À faire au déploiement | Ajouter CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` et permissions minimales. |
| Moyenne | Service worker et notifications non testés sur appareils réels | À vérifier | Tester Chrome Android, iOS selon support, desktop et réinstallation PWA. |
| Moyenne | Données mockées visibles dans le frontend | Acceptable en prototype | Remplacer par l’API normalisée et afficher la fraîcheur des données. |
| Faible | Dépendances déclarées en `latest` | À améliorer | Pinner les versions et automatiser les mises à jour contrôlées. |

## Points positifs observés

Aucun secret réel n’a été trouvé dans le dépôt lors de la recherche effectuée. Aucun usage de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` ou `document.cookie` n’a été détecté dans le code applicatif. `pnpm audit --audit-level high` ne signale aucune vulnérabilité connue dans l’état actuel de l’installation.

Le frontend utilise principalement des chaînes et des objets React rendus comme texte, ce qui réduit le risque XSS direct. Le service worker ne traite que les requêtes GET du même origin et ne cache pas directement des réponses d’origines externes.

## Risques à corriger avant une vraie mise en production

### 1. Protéger les secrets de l’API sportive

La clé API sportive ne doit jamais apparaître dans `src/`, dans le bundle Vite, dans `VITE_*`, dans le service worker ou dans le navigateur. Le navigateur doit appeler uniquement une API ScoreMatch contrôlée par le serveur. Le serveur ajoute la clé fournisseur, applique un cache, gère les erreurs et masque les détails internes.

Une règle CI doit rechercher les motifs suivants avant chaque push : `api_token=`, `x-apisports-key`, `VAPID_PRIVATE_KEY`, `BEGIN PRIVATE KEY`, `Authorization: Bearer` et des clés VAPID ressemblant à des chaînes base64.

### 2. Sécuriser les souscriptions Push

La route `POST /api/push/subscribe` doit vérifier l’utilisateur connecté, valider la structure du endpoint et des clés, limiter le nombre de souscriptions par utilisateur, dédupliquer l’endpoint et refuser les domaines non conformes. La route de suppression doit exister. Les réponses Web Push `404` et `410` doivent supprimer la souscription expirée.

Le serveur doit appliquer une limitation de débit par utilisateur et IP. Le corps JSON doit avoir une taille maximale stricte. Ne renvoyez pas la souscription complète dans les logs, car l’endpoint et les clés constituent des données sensibles de l’appareil.

### 3. Ajouter authentification et autorisation

Les favoris, équipes suivies, matchs suivis et préférences de notifications doivent être associés à un utilisateur authentifié. Utilisez des cookies de session `HttpOnly`, `Secure`, `SameSite=Lax` ou une architecture équivalente. N’utilisez pas un token persistant dans `localStorage` pour une session sensible.

Chaque lecture ou modification doit vérifier que la ressource appartient à l’utilisateur courant. Ne faites pas confiance à un `userId` envoyé dans le corps de la requête.

### 4. Ajouter les en-têtes de sécurité

Au déploiement, configurez au minimum :

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://YOUR_BACKEND_HOST; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

La CSP doit être ajustée aux domaines réels de l’API et des images. Évitez `*` dans `connect-src` et `img-src` si des domaines précis suffisent.

### 5. Durcir l’intégration des données sportives

Le serveur doit traiter les réponses fournisseur comme des données non fiables. Validez les schémas avec une bibliothèque comme Zod, limitez la taille des payloads et ne rendez jamais du HTML fourni par un partenaire. Utilisez des timeouts, des retries avec backoff et un circuit breaker afin qu’une panne fournisseur ne bloque pas l’application.

Les scores live doivent posséder `sourceUpdatedAt`, `receivedAt` et `staleAfter`. Après dépassement de `staleAfter`, l’interface doit afficher « données potentiellement obsolètes » plutôt que d’afficher le score comme actuel.

### 6. Éviter les doublons et abus de notifications

Un worker peut recevoir plusieurs fois le même événement. Dédupliquez avec une clé stable comprenant l’identifiant de fixture et l’identifiant d’événement. Appliquez aussi les préférences de l’utilisateur avant l’envoi, puis limitez le nombre de notifications par match afin de prévenir le spam en cas d’anomalie fournisseur.

## Contrôles CI recommandés

Ajoutez les contrôles suivants dans une pipeline :

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm audit --audit-level high
git diff --check
```

Complétez avec un scanner de secrets, un scan de dépendances et un test des en-têtes HTTP sur l’environnement de staging. Les builds doivent échouer si un fichier `.env` réel, une clé privée ou un token est ajouté au commit.

## Décision de mise en production

Le frontend actuel est suffisamment propre pour un prototype et un déploiement de démonstration. Il ne doit pas être considéré comme une application de scores complète à 100 % tant que le backend sécurisé, la source de données, la base de données, l’authentification et le worker de notifications ne sont pas installés.

La priorité technique est de créer un backend full-stack. Ce backend devra exposer une API normalisée, protéger les secrets, synchroniser les compétitions, stocker les favoris et souscriptions, puis exécuter le worker de détection des événements live. La couverture de « toutes les compétitions » doit être mesurée par les identifiants et champs réellement retournés par le fournisseur, pas seulement par le nombre marketing de ligues annoncées.
