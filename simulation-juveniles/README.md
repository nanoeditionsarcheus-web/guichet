# Génération de juvéniles artificiels

Page autonome, proposée par Pierre Duchesne (16 octobre 2026), pour mesurer la performance de la reconstitution
des femelles sur des juvéniles dont on connaît les parents. À sa demande, la page n'a pour l'instant aucun lien
avec les autres pages (ni le guichet ni les autres outils ne la mentionnent), et ne montre ni ne télécharge les
génotypes artificiels : seules comptent les statistiques du bilan.

- **Pool** : un ou plusieurs fichiers de génotypes (FLOCK ou allèles collés ; .xls, .xlsx, .csv). Fréquences
  alléliques comptées sur tous les génotypes non manquants (deux allèles par génotype).
- **Tableau des croisements** : colonnes par paires, une paire par fichier (nid) ; en tête, le nom de la
  femelle puis « # juvéniles » ; en dessous, une ligne par mâle (nom, nombre de juvéniles). Un même nom désigne
  toujours le même individu (une femelle peut occuper plusieurs paires, un mâle féconder plusieurs femelles).
- **Parents** : deux allèles tirés indépendamment par locus selon les fréquences du pool (Hardy-Weinberg).
- **Juvéniles** : un allèle de la mère et un du père, probabilité 1/2 chacun (Mendel) ; aucune donnée manquante.
- **Générateur** : xoshiro128** (Blackman et Vigna, 2018), état initialisé par splitmix32 à partir d'une graine
  de 32 bits, nouvelle à chaque simulation sauf si l'usager en impose une ; la graine est affichée et notée.
- **Itérations** (nombre choisi par l'usager) : à chaque itération, nouveaux parents et nouveaux juvéniles pour
  tout le tableau ; puis, pour chaque fichier, et pour chaque femelle à plusieurs fichiers (fichiers réunis),
  reconstitution par le nombre de compatibilités avec la règle de l'homozygote (`reconstitution.js` de
  `../reconstitution-femelle`, validé contre Maple), sans plafond, et comparaison avec la vraie mère.
- **Bilan** (deux tableaux, sans téléchargement) : nombre d'itérations avec un génotype candidat juste, un faux,
  deux dont un juste, deux dont aucun juste, trois ou plus (non résolu) ; pour les génotypes faux, pourcentage
  selon le nombre de locus erronés (1 à L). La graine vaut pour toute la série : même graine, même pool, même
  tableau et même nombre d'itérations, même bilan.

Vérification (`validation/`) :
- `xoshiro128ss_ref.c` : code C de référence des auteurs ; `test-lib.js` le compare à la page (via un exécutable
  compilé, 2,3 millions de valeurs, aucun écart lors de la mise au point) ;
- `verifier.py` : réimplantation indépendante en Python (générateur, fréquences, tableau, simulation,
  reconstitution, bilan) ; `attendu-simulation.json` : 4 graines, juvéniles identiques (`test-lib.js`) ;
  `attendu-bilan.json` : 300 itérations, graine 12345, bilan identique (`test-lib.js` et `test-page.js`) ;
- `test-stat.R` : sur de grands échantillons, fréquences des parents et proportions de Mendel (khi-deux) ;
- `test-page.js` : page (bilan par lots identique au calcul Python, tableaux affichés, graines, refus des
  valeurs invalides, arrêt, téléversements, absence de liens et de téléchargements).

Construction : `python3 construire.py` produit `index.html` (styles et lecture des fichiers repris de
`../combinaisons/gabarit.html`, reconstitution reprise de `../reconstitution-femelle/validation/js/reconstitution.js`) et `validation/exemple.json`.
