# Vérification du sélecteur d’équipes

La grille d’onboarding a été réduite pour afficher des écussons plus compacts tout en conservant une cible tactile confortable. Le catalogue local contient maintenant 40 équipes issues des huit compétitions ciblées. La recherche filtre le catalogue complet, affiche le nombre de résultats, supporte la sélection multiple et présente un état explicite lorsqu’aucune équipe ne correspond.

Les écussons déjà disponibles localement sont conservés ; les équipes supplémentaires utilisent le fallback textuel tant que leurs images réelles ne sont pas synchronisées depuis le fournisseur sportif. Aucun écusson n’est généré.

## Test navigateur

Le build de production a affiché 40 équipes disponibles. Après saisie de « Borussia Dortmund », le compteur est passé à 1 et la carte Borussia Dortmund est apparue, bien qu’elle ne soit pas visible dans la première rangée. La grille reste compacte et défilable sur mobile. La sélection multiple reste gérée par `aria-pressed` et l’état visuel `selected`.
