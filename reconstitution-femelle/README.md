# Reconstitution du génotype d'une femelle

Page autonome du guichet. Elle reconstitue, locus par locus, le génotype d'une femelle à partir
des génotypes de ses juvéniles, selon la méthode du **nombre de compatibilités** de Pierre Duchesne.

- Outil : https://nanoeditionsarcheus-web.github.io/guichet/reconstitution-femelle/
- Texte explicatif de la méthode : [`methode.html`](methode.html)
- Validation contre le programme Maple de l'auteur : [`validation/RAPPORT.md`](validation/RAPPORT.md)

Entrée : un fichier en disposition FLOCK (identifiant, puis 2 colonnes par locus), avec tous les
juvéniles ensemble.

Données manquantes : à chaque locus, la femelle est reconstituée avec les juvéniles génotypés à ce locus.
Un locus sans aucun juvénile génotypé reste inconnu (« ? ») et la femelle est reconstituée sur les autres
locus (règle approuvée par P. Duchesne le 4 octobre 2026 ; ce cas n'existe pas dans les jeux validés
contre Maple, dont les résultats sont inchangés).

Construction : `python3 construire.py` produit `index.html` à partir de `gabarit.html`, en y
recopiant tel quel le code validé (`validation/js/reconstitution.js`) et le jeu d'exemple.
