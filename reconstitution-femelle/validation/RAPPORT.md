# Rapport de validation — reconstitution du génotype d'une femelle

**Objet.** Vérifier que le calcul de la page (`js/reconstitution.js`) reproduit le programme Maple
de Pierre Duchesne (`maple/RECONSTITUTION_FEMELLE_TOUS_LOC.mw`). Aucune publication ne décrit la
méthode : la référence est le programme de l'auteur.

**Conclusion.** Sur **six jeux** fournis par l'auteur (223 juvéniles, 11 locus chacun), **les 636
génotypes candidats ont exactement le même nombre de compatibilités (NC)** que dans Maple, et le
nombre de juvéniles typés par locus (le « max » de Maple) est identique partout. Écarts : 0.
Détail des jeux supplémentaires à la section 6.

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

**Noms des locus.** Les feuilles Maple ne nomment pas les locus ; P. Duchesne a fourni ensuite leurs
noms, dans l'ordre des colonnes. Les fichiers FLOCK ont été refaits avec ces noms (même outil,
contrôle génotype par génotype : 0 écart). Dans ce rapport, L1 à L11 correspondent à :

| L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 | L11 |
|---|---|---|---|---|---|---|---|---|---|---|
| AS12 | As13 | As18 | AsB14 | Tm6 | Tm72 | Tm2 | Tm4 | tm3 | tm5 | tm64 |

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
- les fichiers FLOCK de Inc_1, Inc_2, Rose, Turquoise et Blanche, téléversés, donnent 0 écart ;
- aucune erreur JavaScript.

L'affichage des juvéniles non compatibles a aussi été vérifié en introduisant volontairement des
erreurs dans une copie des données.

## 5. Rejouer

```sh
cd validation/maple && python3 decoder_maple.py RECONSTITUTION_FEMELLE_TOUS_LOC.mw   # -> resultats_maple.json
cd .. && node js/comparer.js                                                          # JS vs Maple
PW=<chemin de playwright> node page/test-page.js                                      # page complète
```

## 6. Jeux supplémentaires

Six feuilles Maple envoyées par P. Duchesne (`jeux/<nom>/RECONS_FEM_<nom>.mw`). Le code Maple de
chacune est identique à celui de la feuille d'origine ; seules les données changent. Chaque jeu a
été traité comme le premier : décodage des sorties Maple, conversion en format FLOCK par l'outil
`flock-convert` (contrôle génotype par génotype : 0 écart), comparaison du JS, test de la page par
téléversement du fichier FLOCK.

| Jeu | Juvéniles | Candidats comparés | Écarts NC | Écarts « max » | Particularités |
|---|---|---|---|---|---|
| Inc_1 | 18 | 72 | 0 | 0 | L5 : 4 candidats à égalité, NC max 10 sur 11 typés ; L10 : un seul candidat |
| Inc_2 | 23 | 80 | 0 | 0 | jeu du modèle de rapport ; NC max inférieur au nombre de typés en L6, L7, L8 |
| Rose | 78 | 141 | 0 | 0 | L6 : 6 candidats à égalité ; NC max inférieur au nombre de typés en L5, L7, L8, L11 |
| Turquoise | 36 | 133 | 0 | 0 | NC max inférieur au nombre de typés en L6, L7, L8 |
| Blanche (feuille recalculée) | 27 | 87 | 0 | 0 | 28 candidats en L6 ; NC max inférieur au nombre de typés en L8, L11 |

Avec le jeu d'exemple, le total est de 636 candidats, tous identiques.

**Inc_2 est le jeu du modèle de rapport** (`Modèle_rapport_reconst_Fem.docx`) : les listes de
candidats et le nombre d'allèles `[3, 3, 4, 3, 3, 5, 4, 6, 2, 1, 4]` sont identiques. Dans la
section « génotypes les plus plausibles » du modèle, deux lignes ne suivent pas la règle du NC
maximal ; ce sont donc des choix faits à la main :
- L2 : le modèle ne donne que 196/196, alors que 192/196, 196/196 et 196/200 ont tous 23 sur 23 ;
- L11 : le modèle donne 274/274 (21/22), alors que 274/326 a 22 sur 22.

La page, elle, présente toutes les égalités de NC maximal.

**Feuilles non utilisées :**
- `Grise` est une copie identique, au bit près, de la feuille d'origine
  (`maple/RECONSTITUTION_FEMELLE_TOUS_LOC.mw`) ; elle n'a pas été dupliquée ici.
- `Blanche`, première version : les résultats enregistrés ne correspondaient pas aux données. Maple
  y annonçait 41 juvéniles pour 27, avec les résultats du jeu d'origine : la feuille avait été
  enregistrée sans relancer le calcul. P. Duchesne a renvoyé la feuille recalculée : mêmes données,
  27 juvéniles annoncés, et c'est elle qui figure dans `jeux/Blanche/` et dans le tableau ci-dessus.

Rejouer un jeu : `node js/comparer.js jeux/<nom>/<nom>-FLOCK.csv jeux/<nom>/resultats_maple.json`.

## 7. Fichiers de génotypes de P. Duchesne (tortues, formats FLOCK et PAPA)

P. Duchesne a fourni les six nids en format FLOCK (`fichiers-pierre/FLOCK/*.xlsx`, nom du locus
au-dessus des deux colonnes) et en format PAPA/PASOS (`fichiers-pierre/PAPA/*.txt`). Les fichiers
.xlsx ont été téléversés dans la page (`page/test-xlsx.js`, avec la même version de la bibliothèque
de lecture Excel que la page), puis les résultats ont été comparés à Maple :

| Fichier | Juvéniles | Écarts avec Maple | Cause |
|---|---|---|---|
| Blanche, Inconnue 2, Rose, Turquoise | 27, 23, 78, 36 | 0 | — |
| Grise | 41 | 7 | données : juvénile 20170704, locus tm64, 326/326 dans les fichiers .xlsx et PAPA, 236/326 dans la feuille Maple |
| Inconnue 1 | 17 | 37 | données : le juvénile 20150217 manque au fichier .xlsx ; il est présent dans le fichier PAPA et dans la feuille Maple |

Les écarts viennent de différences entre les fichiers de données, pas du calcul. Sur des données
identiques, la page et Maple concordent (sections 3 et 6). Les fichiers PAPA ne diffèrent de Maple
que pour Grise (même génotype 20170704, tm64).

## 8. Génotypes complets les plus vraisemblables (règle de P. Duchesne, 29 septembre 2026)

Nouvelle règle, sans équivalent dans le programme Maple : à chaque locus, parmi les candidats de NC
maximal, on retient le candidat unique ; ou seulement l'homozygote s'il y en a un ; ou sinon tous les
candidats. Les génotypes complets sont toutes les combinaisons des génotypes retenus
(`retenusParLocus`, `genotypesComplets` dans `js/reconstitution.js`).

Vérification : `js/test-complets.js` applique la règle à l'exemple fictif donné par P. Duchesne dans
son message. On obtient ses 4 génotypes complets, ni plus ni moins. Sur les six nids :

| Nid | Génotypes retenus par locus | Génotypes complets |
|---|---|---|
| Grise, Rose, Turquoise | 1 partout | 1 |
| Blanche | 2 à Tm6 | 2 |
| Inconnue 1 | 2 à As18, 4 à Tm6, 2 à Tm4 | 16 |
| Inconnue 2 | 2 à As18, Tm6, Tm72 et Tm2 | 16 |

Dans la page, les 16 lignes d'Inconnue 2 ont été vérifiées : toutes distinctes.

## 9. Rééchantillonnage aléatoire dans la page (demande de P. Duchesne, 30 septembre 2026)

Offert seulement si un seul génotype complet est reconstitué avec l'échantillon complet. Paramètres :
nombre d'itérations (1000 par défaut) et intervalle entre les tailles (10 par défaut) ; tailles
intervalle, 2 × intervalle, … sans dépasser la taille de l'échantillon complet. Sorties : % de tirages
donnant un génotype complet unique, % donnant le même génotype que l'échantillon complet, avec le nom
du fichier et le nombre d'itérations en en-tête (fonction `reechantillonnerTaille`).

Vérifications :
- `js/test-reechantillonnage.js` : avec le générateur et la graine de l'étude publiée
  (`etudes/reechantillonnage`), le calcul redonne exactement ses 30 pourcentages pour le nid Rose
  (0 écart). La fonction de la page, avec d'autres tirages (2000 par taille), s'en écarte d'au plus
  1,5 point, ce qui est l'ordre de grandeur attendu du hasard.
- `page/test-reech.js` (Chromium) : pour Rose, la section est offerte, et le tableau est cohérent
  avec l'étude publiée (écart de quelques points au plus, attendu pour des tirages différents) ;
  pour Inconnue 2 (16 génotypes complets), la section n'est pas offerte et la page dit pourquoi.
