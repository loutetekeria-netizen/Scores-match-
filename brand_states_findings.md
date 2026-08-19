# Vérification logo et états

Le build de production local a affiché le logo PNG fourni via `/scorematch-logo.svg` dans l’écran de chargement et l’écran d’erreur.

L’URL `/matches` affiche successivement les états `launching`, `loading`, `analyzing`, puis `ready`.

L’URL `/matches?state=error` affiche l’écran d’erreur avec l’icône d’alerte, le message « Impossible de charger les scores » et le bouton « Réessayer ».

Les états de test disponibles sont `?state=loading`, `?state=analyzing`, `?state=error` et `?state=offline`. Le chargement des écussons utilise le CDN API-Sports avec fallback sur les initiales si l’image distante est indisponible.
