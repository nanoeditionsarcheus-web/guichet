# Rapport de validation — reconstitution du génotype d'une femelle

**Objet.** Vérifier que le calcul de la page (`js/reconstitution.js`) reproduit le programme Maple
de Pierre Duchesne (`maple/RECONSTITUTION_FEMELLE_TOUS_LOC.mw`). Aucune publication ne décrit la
méthode : la référence est le programme de l'auteur.

**Conclusion.** Sur le jeu d'exemple de la feuille Maple, **les 123 génotypes candidats des 11 locus
ont exactement le même nombre de compatibilités (NC)** que dans Maple, et le nombre de juvéniles
typés par locus (le « max » de Maple) est identique partout. Écarts : 0.

## 1. Référence et données

- Programme : feuille Maple 2020 `RECONSTITUTION_FEMELLE_TOUS_LOC.mw`, fournie par P. Duchesne.
- Données : la matrice `data_6digits` de la feuille : 41 juvéniles (nids de 2017, 2018 et 2021,
  mis ensemble comme le fait le programme), 11 locus, allèles collés sur 6 chiffres, `000000` pour
  un génotype manquant.
- Résultats de référence : les sorties que Maple a calculées et enregistrées dans la feuille
  (`nb_juveniles`, `nb_locus`, `les_nb_alleles_locus`, `compat_tous_loc`).

Maple n'étant pas disponible, ces sorties ont été **décodées** du format interne de Maple dans lequel
la feuille les conserve (`maple/decoder_maple.py`, format documenté en tête du script). Contrôles
du décodage :

- `nb_juveniles` = 41 et `nb_locus` = 11, comme dans les données ;
- chaque allèle de chaque candidat décodé appartient aux allèles observés à ce locus.

## 2. Conversion en format FLOCK

Comme demandé, sans code dédié : la matrice a été collée dans l'outil existant **Mise en forme pour
FLOCK** (`flock-convert`), avec les noms de locus L1 à L11. Le fichier produit
(`donnees/exemple-maple-FLOCK.csv`) a été comparé génotype par génotype à la matrice Maple :
41 juvéniles, 0 écart. C'est ce fichier que lit la page.

## 3. Résultats

| Locus | Juvéniles typés (JS = Maple) | Candidats | Écarts NC | NC max | Génotype(s) de NC max | NC suivant | Allèles (JS / Maple) |
|---|---|---|---|---|---|---|---|
| L1 | 40 | 3 | 0 | 40 | 268/268, 268/272 | 17 | 2 / 3 |
| L2 | 41 | 3 | 0 | 41 | 196/200 | 33 | 2 / 2 |
| L3 | 41 | 6 | 0 | 41 | 256/264, 264/264, 264/268 | 31 | 3 / 3 |
| L4 | 38 | 6 | 0 | 38 | 244/244, 244/248, 244/250 | 29 | 3 / 4 |
| L5 | 40 | 15 | 0 | 40 | 167/183 | 36 | 5 / 6 |
| L6 | 41 | 21 | 0 | 41 | 158/190 | 37 | 6 / 6 |
| L7 | 41 | 15 | 0 | 41 | 192/200 | 37 | 5 / 5 |
| L8 | 38 | 15 | 0 | 38 | 196/212 | 32 | 5 / 6 |
| L9 | 41 | 15 | 0 | 41 | 103/155 | 33 | 5 / 5 |
| L10 | 41 | 3 | 0 | 41 | 231/235, 235/235 | 8 | 2 / 2 |
| L11 | 41 | 21 | 0 | 41 | 270/326 | 31 | 6 / 6 |

**Seule différence, voulue (approuvée par P. Duchesne) : le nombre d'allèles.** La procédure Maple
`nb_allele_un_loc` compte le code des données manquantes (0) comme un allèle dès qu'un locus a au
moins un génotype manquant (L1, L4, L5, L8). La page compte seulement les allèles observés. Le calcul
des compatibilités n'est pas touché : Maple retire bien les génotypes manquants de la liste des
allèles candidats et du maximum.

**Égalités.** L'ordre dans lequel Maple présente des candidats de même NC n'est pas défini. La page
les trie par allèles croissants et les présente tous (consigne de P. Duchesne).

**Génotype à moitié manquant** (un seul allèle égal à 0) : absent de ces données. La page le traite
comme manquant, comme les autres outils du guichet. Maple le garderait et traiterait 0 comme un
allèle.

## 4. Test de la page

`page/test-page.js` (Chromium) :

- l'exemple embarqué donne 123 candidats et 0 écart ;
- le fichier FLOCK téléversé donne 123 candidats et 0 écart ;
- aucune erreur JavaScript.

L'affichage des juvéniles non compatibles a aussi été vérifié en introduisant volontairement des
erreurs dans une copie des données.

## 5. Rejouer

```sh
cd validation/maple && python3 decoder_maple.py RECONSTITUTION_FEMELLE_TOUS_LOC.mw   # -> resultats_maple.json
cd .. && node js/comparer.js                                                          # JS vs Maple
PW=<chemin de playwright> node page/test-page.js                                      # page complète
```

## 6. À venir

P. Duchesne enverra d'autres jeux complets avec leurs résultats Maple. Chacun sera ajouté ici
comme vérification supplémentaire.
