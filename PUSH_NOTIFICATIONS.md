# Notifications push en temps réel pour les buts

## État actuel de la PWA

Le frontend contient déjà le socle navigateur : `public/sw.js` écoute les événements `push`, affiche une notification avec icône, ouvre la page du match au clic et accepte un payload JSON avec `title`, `body`, `url`, `matchId`, `tag`, `renotify` et `actions`.

Le module `src/push.ts` demande l’autorisation, crée une souscription VAPID et l’envoie à `POST /api/push/subscribe`. Cette route backend n’existe pas encore dans le dépôt statique : elle doit être fournie par le serveur applicatif ou par un service de notifications.

> Une notification push ne peut pas être déclenchée de façon fiable par le navigateur seul. Un serveur doit détecter le but, dédupliquer l’événement et envoyer le message au fournisseur Web Push.

## Deux architectures possibles

| Approche | Fonctionnement | Avantages | Limites | Complexité |
|---|---|---|---|---|
| Fournisseur de données avec webhook | Le fournisseur appelle votre endpoint dès qu’un événement arrive ; le serveur vérifie et envoie le push. | Latence faible, moins de polling, architecture événementielle. | Il faut que le fournisseur choisi propose réellement des webhooks et que le plan les autorise. | Moyenne |
| Polling serveur contrôlé | Un worker serveur interroge l’endpoint livescore, détecte les nouveaux événements et envoie le push. | Fonctionne avec une API GET classique, maîtrise totale de la déduplication. | Coût de requêtes et latence liée à l’intervalle. | Moyenne à élevée |

La documentation officielle d’API-Football expose les endpoints `fixtures`, `events`, `lineups` et livescores, avec authentification par clé dans `x-apisports-key` [1]. Dans la documentation consultée, aucun webhook public clairement documenté n’a été identifié. Pour cette API, il faut donc prévoir un worker serveur avec polling, sauf confirmation contraire de leur support ou de votre contrat.

Sportmonks documente une stratégie de polling dédiée aux livescores : initialiser avec `/inplay`, puis interroger `/latest` toutes les dix secondes avec les scores, événements et participants inclus [2]. Cette stratégie est préférable à une interrogation complète de tous les fixtures à chaque cycle.

## Flux recommandé

```text
Utilisateur active les alertes
        ↓
Navigateur demande Notification.permission
        ↓
Service Worker crée une souscription VAPID
        ↓
POST /api/push/subscribe
        ↓
Serveur stocke endpoint + clés p256dh/auth + préférences utilisateur
        ↓
Worker livescore interroge l’API sportive
        ↓
Le worker compare event_id / fixture_id / type / minute
        ↓
Nouvel événement de type goal ?
        ↓
Serveur envoie Web Push avec la clé privée VAPID
        ↓
Service Worker affiche la notification
        ↓
Clic : ouverture de /matches?matchId=...
```

## 1. Générer les clés VAPID

Sur le serveur, installez la bibliothèque Web Push et générez une paire de clés une seule fois :

```bash
pnpm add web-push
pnpm exec web-push generate-vapid-keys
```

Conservez la clé privée uniquement côté serveur. La clé publique peut être exposée au frontend via une variable `VITE_`.

```env
# Frontend — clé publique uniquement
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY

# Backend — ne jamais exposer dans le bundle frontend
VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_VAPID_KEY
VAPID_SUBJECT=mailto:notifications@scorematch.example
SPORTS_API_PROVIDER=sportmonks
SPORTS_API_TOKEN=YOUR_SERVER_SIDE_TOKEN
```

La clé privée ne doit jamais être placée dans `VITE_VAPID_PRIVATE_KEY`, dans `src/`, dans le service worker ou dans GitHub.

## 2. Route d’enregistrement des appareils

La route `POST /api/push/subscribe` doit valider le corps reçu avant stockage. Enregistrez au minimum :

```ts
type StoredSubscription = {
  userId?: string;
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  teamIds: string[];
  matchIds: string[];
  goalAlerts: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Ne stockez pas une souscription sans `endpoint`, `p256dh` et `auth`. Une même souscription doit être mise à jour, pas insérée plusieurs fois. Supprimez une souscription lorsque le fournisseur Web Push retourne `404` ou `410`.

Exemple de route Express avec `web-push` :

```ts
import express from "express";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const router = express.Router();

router.post("/api/push/subscribe", async (req, res) => {
  const subscription = req.body;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "invalid_subscription" });
  }

  await upsertPushSubscription({
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: subscription.keys,
    goalAlerts: true,
    teamIds: [],
    matchIds: [],
    updatedAt: new Date().toISOString(),
  });

  return res.status(201).json({ ok: true });
});
```

## 3. Détecter les buts sans doublons

Un but doit être identifié par une clé stable fournie par le fournisseur. À défaut, construisez une clé déterministe :

```ts
const eventKey = [
  fixtureId,
  event.type,
  event.detail,
  event.time.elapsed,
  event.time.extra ?? "",
  event.player?.id ?? "unknown",
  event.team?.id ?? "unknown",
].join(":");
```

Stockez cette clé avec une durée de rétention couvrant au moins la durée du match et quelques heures supplémentaires. Le worker ne doit envoyer qu’une seule notification pour une même clé, même s’il reçoit deux fois le même événement.

Traitez séparément les corrections de données. Si un fournisseur modifie un événement, mettez à jour l’interface mais ne renvoyez pas systématiquement une seconde notification, sauf si l’événement était explicitement marqué comme annulé puis confirmé.

## 4. Polling recommandé avec Sportmonks

Selon la documentation officielle, initialisez les matchs actifs avec `/inplay`, puis utilisez `/latest` avec `include=scores;events;participants` et une fréquence de dix secondes [2]. N’interrogez pas plus rapidement que la fréquence autorisée par le fournisseur.

```ts
const response = await fetch(
  `https://api.sportmonks.com/v3/football/livescores/latest?api_token=${process.env.SPORTS_API_TOKEN}&include=scores;events;participants`,
);

const payload = await response.json();
for (const fixture of payload.data ?? []) {
  for (const event of fixture.events ?? []) {
    if (event.type !== "goal") continue;
    await notifyGoalOnce(fixture, event);
  }
}
```

Le worker doit fonctionner dans un processus serveur persistant ou dans un système de jobs fiable. Ne faites pas dépendre les buts d’un onglet navigateur ouvert, car les navigateurs suspendent les timers en arrière-plan et l’utilisateur peut fermer la PWA.

## 5. Envoyer la notification

```ts
async function notifyGoalOnce(fixture: Fixture, event: GoalEvent) {
  const eventKey = makeEventKey(fixture.id, event);
  if (await alreadySent(eventKey)) return;
  await markAsSent(eventKey);

  const subscriptions = await findSubscriptionsForFixture(fixture.id);
  const payload = JSON.stringify({
    title: `${fixture.homeName} ${fixture.homeScore}–${fixture.awayScore} ${fixture.awayName}`,
    body: `${event.playerName ?? "But"} · ${event.minute}’`,
    url: `/matches?matchId=${fixture.id}`,
    matchId: String(fixture.id),
    tag: `goal-${fixture.id}`,
    renotify: true,
    actions: [{ action: "open", title: "Voir le match" }],
  });

  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 120 });
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await deleteSubscription(subscription.endpoint);
      } else {
        throw error;
      }
    }
  }));
}
```

Le champ `tag` évite de multiplier les notifications identiques dans l’interface système. Utilisez `renotify: true` uniquement pour un nouvel événement réellement important. La notification doit afficher le score mis à jour, le nom du buteur si disponible et un lien direct vers le match.

## 6. Préférences utilisateur

La conversion doit se faire en deux étapes : l’utilisateur choisit « Recevoir les buts », puis le navigateur demande l’autorisation système. Stockez les préférences par équipe et par match :

```ts
type AlertPreferences = {
  goalAlerts: boolean;
  kickoffAlerts: boolean;
  fullTimeAlerts: boolean;
  teamIds: string[];
  matchIds: string[];
};
```

Ne demandez pas l’autorisation au premier chargement sans contexte. Le bouton doit être associé à un bénéfice : « Recevoir les buts de ce match ». Si l’autorisation est refusée, laissez l’utilisateur consulter l’application et fournissez un lien vers les réglages du navigateur.

## 7. Contraintes navigateur et sécurité

Les notifications Push nécessitent généralement un contexte sécurisé HTTPS, sauf `localhost` en développement. Le service worker doit être servi depuis le même scope que l’application. Les clés VAPID privées et les tokens de l’API sportive doivent rester côté serveur.

Prévoyez une politique de confidentialité qui explique la collecte de l’endpoint push, la durée de conservation, la suppression de l’appareil et le retrait des alertes. Ajoutez une route `DELETE /api/push/subscribe` pour permettre la désinscription.

## 8. Checklist de mise en production

| Contrôle | Condition de réussite |
|---|---|
| HTTPS | L’application publiée est accessible en HTTPS. |
| VAPID | La clé publique est dans le frontend, la clé privée uniquement sur le serveur. |
| Permission | Le navigateur demande l’autorisation après une action explicite. |
| Souscription | `POST /api/push/subscribe` répond 201 et déduplique l’endpoint. |
| Détection | Le worker reçoit scores et événements à une fréquence compatible avec le fournisseur. |
| Déduplication | Une clé d’événement empêche les doublons. |
| Envoi | Le serveur envoie un payload avec score, buteur, minute et URL. |
| Expiration | Les souscriptions 404/410 sont supprimées. |
| Service worker | `push` et `notificationclick` sont testés sur Chrome Android et desktop. |
| Préférences | L’utilisateur peut activer, modifier et désactiver les buts. |
| Hors ligne | Le shell et `/offline.html` se chargent sans réseau. |

## Références

[1]: https://www.api-football.com/documentation-v3 — API-Football v3, documentation officielle des endpoints, authentification et événements.

[2]: https://docs.sportmonks.com/v3/welcome/best-practices.md — Sportmonks, stratégie officielle de polling des livescores et événements.
