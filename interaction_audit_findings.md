# Audit des écussons et interactions

Les écussons sont maintenant servis localement depuis `public/team-logos/{teamId}.png`. Les images visibles correspondent aux identifiants API-Sports des équipes présentes dans les données de démonstration, sans génération graphique. Le texte alternatif contient le nom de l’équipe et un fallback sur les initiales est conservé si un fichier est indisponible.

L’inventaire initial a montré que les boutons suivants étaient auparavant sans comportement : les flèches du sélecteur de dates, les flèches du calendrier, les numéros du calendrier, les boutons secondaires du Drawer et les boutons d’options de compétition.

Les flèches de dates modifient maintenant la date active. Le calendrier permet de changer de mois et de sélectionner un jour. Les actions secondaires du Drawer produisent un retour utilisateur explicite. Les options de compétition produisent également un retour utilisateur au lieu d’être silencieuses.

La page de production affiche les chemins locaux des écussons : `/team-logos/85.png`, `/team-logos/81.png`, `/team-logos/50.png`, `/team-logos/42.png`, `/team-logos/541.png`, `/team-logos/157.png`, `/team-logos/529.png`, `/team-logos/533.png`, `/team-logos/80.png` et `/team-logos/79.png`.

## Tests navigateur

Le bouton calendrier du header ouvre effectivement la modale de sélection. La modale expose maintenant les boutons « Mois précédent », « Mois suivant », les 31 boutons de jours avec libellés accessibles, ainsi que « Annuler » et « Confirmer la date ».

Le hamburger est conditionné par le breakpoint mobile ; dans le viewport de test desktop, il est masqué par CSS. Le code conserve son ouverture du Drawer sur mobile via `setDrawerOpen(true)`. Les boutons du header, les flèches de date, les onglets, la recherche, les cartes et les favoris possèdent des handlers explicites.

## Validation finale

Après la dernière correction, le bouton hamburger est visible avec le libellé accessible « Ouvrir le menu » dans le viewport de production testé. L’onglet « Aujourd’hui » est actif par défaut et matérialisé par le soulignement du bandeau vert. Les écussons sont servis depuis `public/team-logos` et apparaissent dans les cartes.

Le build final passe avec `pnpm run lint`, `pnpm run build` et `git diff --check`.
