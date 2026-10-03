# Combinaisons de fichiers (une femelle par fichier)

Page autonome du guichet, proposée par Pierre Duchesne. L'unité d'analyse est la femelle : chaque
fichier contient les juvéniles d'une seule femelle (un ou plusieurs nids) et n'est jamais scindé en
nids. Pour chaque combinaison de 1, 2, 3… fichiers, la page fusionne les fichiers et reconstitue la
femelle avec le code validé de `../reconstitution-femelle`, afin de repérer les fichiers qui
pourraient provenir d'une même femelle.

- Sortie : une ligne par combinaison, avec le nombre de juvéniles et le nombre (et le pourcentage) de
  juvéniles incompatibles avec le génotype reconstitué, puis :
  - « génotype reconstitué » : un seul génotype complet et un pourcentage d'incompatibles au plus égal
    au plafond ; le génotype est affiché avec un numéro commun aux combinaisons qui le donnent ;
  - « rejeté » : un seul génotype complet, mais trop d'incompatibles (femelle probablement factice) ;
  - « non » : plusieurs génotypes complets, ou aucun.
  Un tableau récapitule les génotypes retenus. La liste se télécharge en CSV.
- Paramètres : nombre maximal de fichiers par combinaison ; plafond d'incompatibles en %
  (10 % par défaut, valeur arbitraire proposée par P. Duchesne, réglable). Au plus 20 000 combinaisons.
- Exemple : les six fichiers de tortues de P. Duchesne (Blanche, Grise, Rose, Turquoise, Inconnue 1,
  Inconnue 2), versions validées contre ses feuilles Maple.
- Vérification : `validation/verifier.py` recalcule de façon indépendante, en Python, les
  63 combinaisons de l'exemple (`validation/attendu.json`). `validation/test-page.js` compare la page
  à ce calcul, puis teste le téléversement de fichiers.

Construction : `python3 construire.py` produit `index.html` à partir de `gabarit.html`, du code de
reconstitution validé et de `validation/combinaisons.js`.
