# Combinaisons de nids

Page autonome du guichet, proposée par Pierre Duchesne. On lui donne plusieurs fichiers de juvéniles
(par exemple un par nid). Pour chaque combinaison de 1, 2, 3… fichiers, elle fusionne les fichiers et
reconstitue la femelle avec le code validé de `../reconstitution-femelle`.

- Sortie : une ligne par combinaison, avec le nombre de juvéniles, le nombre de juvéniles
  incompatibles avec le génotype reconstitué, puis « génotype reconstitué » (avec le génotype et un
  numéro commun aux combinaisons qui donnent ce même génotype) ou « non » (avec le nombre de
  génotypes complets). Un tableau récapitule les génotypes distincts. La liste se télécharge en CSV.
- Taille maximale des combinaisons réglable ; au plus 20 000 combinaisons.
- Vérification : `validation/verifier.py` recalcule de façon indépendante, en Python, les
  63 combinaisons de l'exemple (`validation/attendu.json`). `validation/test-page.js` compare la page
  à ce calcul, puis teste le téléversement de fichiers.

Construction : `python3 construire.py` produit `index.html` à partir de `gabarit.html`, du code de
reconstitution validé et de `validation/combinaisons.js`.
