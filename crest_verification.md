# Vérification des écussons

## Résultat automatisé

Le mapping `teamLogoIds` contient 12 équipes et chaque identifiant possède un fichier PNG local correspondant dans `public/team-logos`. Toutes les équipes affichées dans les données de matchs ont un mapping : Paris Saint-Germain, Olympique de Marseille, Manchester City, Arsenal, Real Madrid, Bayern Munich, FC Barcelona, Villarreal, Lyon et Lille.

Le contrôle automatisé `check_team_crests.py` retourne `crest mapping check: PASS`.

## Résultat visuel

La planche `crest-sheet.png` confirme visuellement les écussons API-Sports suivants : Liverpool, Arsenal, Chelsea, Manchester City, Lille, Lyon, Olympique de Marseille, Paris Saint-Germain, Bayern Munich, FC Barcelona, Villarreal et Real Madrid.

Dans le navigateur, les cartes de Ligue 1, Premier League, Ligue des champions et Liga affichent les chemins locaux `/team-logos/{id}.png`. Les matchs en direct PSG–OM et Manchester City–Arsenal affichent leurs écussons, de même que les matchs à venir et terminés. Aucun fallback sur initiales n’apparaît dans la page testée.

Les images sont intégrées localement, donc l’affichage des écussons ne dépend pas d’un CDN externe pendant le rendu de la PWA.

## Vue Équipes

Le panneau `Équipes` a été ouvert dans le navigateur. Les neuf équipes listées affichent bien leurs écussons locaux : PSG, Real Madrid, FC Barcelona, Arsenal, Liverpool, Manchester City, Bayern Munich, Olympique de Marseille et Chelsea. Les chemins extraits du DOM correspondent aux identifiants attendus et aucun fallback texte n’est visible.

## Vérification après intégration du client API

Le build de production affiche toujours les vrais écussons locaux dans toutes les cartes : PSG–OM, Manchester City–Arsenal, Lyon–Lille, Real Madrid–Bayern Munich et FC Barcelona–Villarreal. Le branchement du client API conserve le mapping local des écussons lors de la normalisation des réponses distantes.

## Centre du match

Le centre PSG–OM conserve les deux vrais écussons locaux. Les sections Événements du match et Actualité du match affichent correctement leurs états vides, mais aucune donnée live n’est encore injectée en local tant que `VITE_API_BASE_URL` et le backend `/api` ne sont pas configurés avec un fournisseur sportif réel.
