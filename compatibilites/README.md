# Tableau des compatibilités

Page autonome du guichet, proposée par Pierre Duchesne. Question posée : des juvéniles issus d'une
femelle inconnue proviennent-ils d'une des femelles déjà reconstituées (la « banque ») ?

- Entrées : des groupes de juvéniles de référence (fichiers FLOCK), un ou plusieurs groupes à
  tester et, facultativement, un fichier de femelles déjà connues. La femelle de chaque groupe de
  référence est reconstituée avec le code validé de `../reconstitution-femelle`, mais seulement
  quand il n'y a qu'un seul génotype complet.
- Sortie : pour chaque femelle (rangée) et chaque groupe (colonne), le nombre de juvéniles
  compatibles avec la femelle à tous les locus, avec l'effectif et le pourcentage. Les noms sont
  modifiables et le tableau peut être téléchargé en CSV. Une dernière rangée, « Aucune », compte
  les juvéniles compatibles avec aucune des femelles.
- Vérification : `validation/verifier.py` recalcule le tableau de l'exemple de façon indépendante,
  en Python (`validation/attendu.json`). `validation/test-page.js` compare la page à ce calcul,
  dans quatre situations : l'exemple, des fichiers téléversés, des femelles connues seules et un
  renommage.

Construction : `python3 construire.py` produit `index.html` à partir de `gabarit.html`, du code de
reconstitution validé et de `validation/compatibilites.js`.
