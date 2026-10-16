# Génération de juvéniles artificiels

Page autonome du guichet, proposée par Pierre Duchesne (16 octobre 2026), pour éprouver les autres outils
(en particulier « Agréger les juvéniles d'une même femelle ») sur des juvéniles dont on connaît les parents.

- **Pool** : un ou plusieurs fichiers de génotypes (FLOCK ou allèles collés ; .xls, .xlsx, .csv). Fréquences
  alléliques comptées sur tous les génotypes non manquants (deux allèles par génotype).
- **Tableau des croisements** : colonnes par paires, une paire par fichier à produire ; en tête, le nom de la
  femelle puis « # juvéniles » ; en dessous, une ligne par mâle (nom, nombre de juvéniles). Un même nom désigne
  toujours le même individu (une femelle peut occuper plusieurs paires, un mâle féconder plusieurs femelles).
- **Parents** : deux allèles tirés indépendamment par locus selon les fréquences du pool (Hardy-Weinberg).
- **Juvéniles** : un allèle de la mère et un du père, probabilité 1/2 chacun (Mendel) ; aucune donnée manquante.
- **Générateur** : xoshiro128** (Blackman et Vigna, 2018), état initialisé par splitmix32 à partir d'une graine
  de 32 bits, nouvelle à chaque simulation sauf si l'usager en impose une ; la graine est affichée et notée.
- **Sorties** : un .zip avec un fichier de juvéniles par paire de colonnes (.xls par défaut, .xlsx ou .csv,
  disposition FLOCK), les génotypes des femelles et des mâles, la généalogie réelle, les fréquences et une notice.

Vérification (`validation/`) :
- `xoshiro128ss_ref.c` : code C de référence des auteurs ; `test-lib.js` le compare à la page (via un exécutable
  compilé, 2,3 millions de valeurs, aucun écart lors de la mise au point) ;
- `verifier.py` : réimplantation indépendante en Python (générateur, fréquences, tableau, simulation) ;
  `attendu-simulation.json` : 4 graines ; `test-lib.js` et `test-page.js` : juvéniles identiques ;
- `test-stat.R` : sur de grands échantillons, fréquences des parents et proportions de Mendel (khi-deux) ;
- `test-page.js` : page, archive .zip relue, téléversements, et bout en bout avec la page « Agréger » (aucune
  fausse identification de mère).

Construction : `python3 construire.py` produit `index.html` (styles et lecture des fichiers repris de
`../combinaisons/gabarit.html`) et `validation/exemple.json`.
