# Rapport de validation — distance de Nei (1972) et UPGMA

**Objet.** Vérifier que l'implémentation JavaScript prévue pour la page « Arbre des espèces »
(`js/nei-upgma.js`) calcule la même distance génétique et le même arbre que des logiciels
publiés, avant toute publication de la page.

**Conclusion.** Sur les 4 jeux de données, l'implémentation JavaScript donne la **même matrice
de distances** et le **même arbre** que PHYLIP et qu'adegenet + R :

- les **topologies enracinées sont identiques** (mêmes clades, 4 jeux sur 4) ;
- les écarts qui restent viennent **uniquement de l'arrondi des sorties de PHYLIP** (6 décimales
  pour les distances, 5 pour les longueurs de branches) ;
- face à adegenet et R, qui calculent en double précision, les écarts sont de l'ordre de 10⁻¹⁵.

Une différence de **traitement des données manquantes** entre logiciels est documentée
(section 5). Elle ne concerne qu'un cas, un locus sans aucune donnée dans une population, et
elle a guidé le choix de la règle retenue.

---

## 1. Logiciels de référence

| Logiciel | Version | Rôle |
|---|---|---|
| PHYLIP — `gendist` | 3.697 (paquet Ubuntu `phylip 1:3.697+dfsg-4build1`) | distance de Nei à partir des fréquences alléliques |
| PHYLIP — `neighbor` | 3.697 | arbre UPGMA (option `N`) |
| R | 4.3.3 | — |
| adegenet | 2.1.10 | fréquences (`genind2genpop`, `makefreq`) et distance (`dist.genpop`, `method = 1`) |
| stats (R) | 4.3.3 | UPGMA : `hclust(method = "average")` |
| ape | 5.7.1 | conversion et comparaison des arbres (`as.phylo`, `read.tree`, `dist.topo`) |
| Node.js | 22 | exécution de `js/nei-upgma.js` (le même code que celui de la page) |

poppr n'a pas pu être installé (dépôt CRAN inaccessible depuis l'environnement de travail).
Il n'était pas nécessaire : adegenet et PHYLIP suffisent comme références indépendantes.

## 2. Jeux de données (microsatellites, plusieurs populations, tous publiés et ouverts)

| Jeu | Espèce | Individus | Populations | Locus | Allèles | Source |
|---|---|---|---|---|---|---|
| `microbov` | bovins (15 races) | 704 | 15 | 30 | 373 | paquet adegenet 2.1.10 ; Laloë D., Jombart T., Dufour A.-B., Moazami-Goudarzi K. (2007) *Genetics Selection Evolution* 39 : 545-567 |
| `nancycats` | chat (*Felis catus*), 17 colonies urbaines | 237 | 17 | 9 (8 utilisés, voir §5) | 99 | paquet adegenet 2.1.10 ; données de D. Pontier (UMR CNRS 5558, Lyon 1) ; Devillard S., Jombart T., Pontier D. (article cité dans adegenet) |
| `jaguar` | jaguar (*Panthera onca*), forêt atlantique | 59 | 4 | 13 | 94 | paquet pegas 1.4-0.2 (dépôt github.com/emmanuelparadis/pegas) ; Haag T. *et al.* (2010) *Molecular Ecology* 19(22) : 4906-4921 |
| `crocrussula` | musaraigne (*Crocidura russula*) | 140 | 15 | 8 | 99 | paquet hierfstat 0.5-11 (dépôt github.com/jgx65/hierfstat) ; Favre L. *et al.* (1997) *Proc. R. Soc. B* 264 : 127-132 ; Goudet J., Perrin N., Waser P. (2002) *Molecular Ecology* 11 : 1103-1114 |

Règle commune de lecture : un génotype dont un allèle vaut 0 ou manque (p. ex. `0/170` dans
`jaguar`) est traité comme manquant. C'est la même règle que dans flock-guichet.

## 3. Quelle distance de Nei ?

La distance utilisée est la **distance standard de Nei (1972)**, sans correction pour la taille
d'échantillon :

  I = J_xy / √(J_x · J_y), et D = −ln I,

où J_x = moyenne sur les locus de Σ p_x², J_y = moyenne de Σ p_y² et J_xy = moyenne de Σ p_x·p_y.

- **PHYLIP `gendist`** : option `N` (« Nei genetic distance »), celle qui est active par défaut.
  C'est la distance de 1972.
- **adegenet `dist.genpop(method = 1)`** : « Nei 1972 ». Le code additionne les produits sur
  les locus au lieu d'en faire la moyenne. Le nombre de locus se simplifie dans le rapport, donc
  le résultat est identique.
- **Variante non utilisée** : la distance non biaisée de Nei (1978), corrigée pour la taille
  d'échantillon. Ni `gendist` ni `dist.genpop` ne la proposent. Il ne faut donc pas comparer
  nos résultats à un logiciel réglé sur Nei 1978.
- **Piège de format dans `gendist`** : par défaut, il attend toutes les fréquences d'un locus
  **sauf la dernière**. Nous fournissons tous les allèles, ce qui exige l'option `A`. Sans
  elle, `gendist` s'arrête avec le message « frequencies add up to more than 1 » (vérifié).

UPGMA (Sokal et Michener 1958) : on réunit la paire de groupes la plus proche ; la distance du
nouveau groupe aux autres est la moyenne pondérée par le nombre de feuilles ; le nœud est placé
à la hauteur D/2. `neighbor` (option `N`) et `hclust(method = "average")` appliquent tous deux
cette définition.

## 4. Commandes exactes

Tout se rejoue avec `validation/executer_tout.sh`. Étape par étape :

```sh
# 0. Installation (Ubuntu 24.04)
apt-get install phylip r-base-core r-cran-ape r-cran-adegenet r-cran-jsonlite
git clone --depth 1 https://github.com/emmanuelparadis/pegas src/pegas     # commit 57725d9
git clone --depth 1 https://github.com/jgx65/hierfstat        src/hierfstat # commit fbc8b8c

# 1. R : génotypes -> data/<jeu>.json (pour le JS) ; fréquences adegenet -> phylip/<jeu>.gendist.in ;
#    références adegenet (r/<jeu>.adegenet.dist.tsv) et hclust (r/<jeu>.hclust.nwk)
Rscript r/01_export_et_reference.R src

# 2. PHYLIP, pour chaque jeu (voir phylip/run_phylip.sh) :
cp <jeu>.gendist.in infile ; printf 'A\nY\n' | gendist     # A = tous les allèles fournis ; N (Nei) par défaut
mv outfile infile          ; printf 'N\nY\n' | neighbor    # N = UPGMA au lieu de Neighbor-Joining

# 3. JavaScript : lit data/<jeu>.json (génotypes bruts) et calcule lui-même fréquences, D et arbre
node js/run.js

# 4. Comparaison -> resultats.tsv
Rscript r/02_comparaison.R
```

Le code JavaScript part des **génotypes bruts**. Il ne réutilise pas les fréquences calculées
par R : le calcul des fréquences est donc aussi validé.

Pour faciliter la comparaison, les populations sont étiquetées P001, P002, etc. dans PHYLIP
(10 caractères au plus). La correspondance est dans `phylip/<jeu>.codes.tsv`.

## 5. Résultats

Écarts absolus maximaux sur toutes les paires de populations (distances) et sur toutes les
branches (arbres). Les topologies sont comparées comme **clades enracinées**. La distance de
Robinson-Foulds (arbres non enracinés) est aussi calculée par `ape::dist.topo`.

| Jeu | Pop. | D : JS vs PHYLIP | D : JS vs adegenet | Topologie JS = PHYLIP = hclust | Branches : JS vs PHYLIP | Branches : JS vs hclust | RF |
|---|---|---|---|---|---|---|---|
| microbov | 15 | 4,9 × 10⁻⁷ | 1,0 × 10⁻¹⁵ | oui | 4,7 × 10⁻⁶ | 5 × 10⁻¹³ | 0 |
| nancycats | 17 | 5,0 × 10⁻⁷ | 9,4 × 10⁻¹⁶ | oui | 5,0 × 10⁻⁶ | 5 × 10⁻¹³ | 0 |
| jaguar | 4 | 4,6 × 10⁻⁷ | 4,4 × 10⁻¹⁶ | oui | 3,8 × 10⁻⁶ | 3 × 10⁻¹³ | 0 |
| crocrussula | 15 | 4,8 × 10⁻⁷ | 4,0 × 10⁻¹⁵ | oui | 4,9 × 10⁻⁶ | 4 × 10⁻¹³ | 0 |

**Explication des écarts.**

- **Face à PHYLIP**, tous les écarts sont sous 5 × 10⁻⁷ pour les distances et sous 5 × 10⁻⁶
  pour les branches. Ce sont exactement les demi-unités de la dernière décimale imprimée par
  `gendist` (6 décimales) et par `neighbor` (5 décimales). adegenet présente le même écart face
  à PHYLIP. PHYLIP arrondit, les calculs concordent.
- **Face à adegenet et hclust**, les écarts de ~10⁻¹⁵ viennent de l'arithmétique en virgule
  flottante. Les écarts de ~10⁻¹³ viennent de l'écriture des arbres avec 12 décimales.
- **Égalités** : aucune paire de distances exactement égale dans ces jeux. Avec des égalités,
  deux logiciels peuvent choisir des fusions différentes mais équivalentes. Le JS prend alors
  la première paire dans l'ordre d'entrée.

**Test complémentaire de l'UPGMA** (`stress/`) : 300 matrices de distances aléatoires, de 3 à
40 taxons. Arbre JS et `hclust(average)` : **topologie identique 300 fois sur 300**, écart
maximal des branches 5 × 10⁻¹⁵.

### Données manquantes : la seule différence réelle entre logiciels

Dans `nancycats`, la colonie P17 n'a **aucun génotype** au locus fca45. Les trois outils ne
traitent pas ce cas de la même manière :

| Outil | Traitement d'un locus vide dans une population |
|---|---|
| PHYLIP `gendist` | impossible : les fréquences doivent être complètes |
| adegenet `dist.genpop` | remplace les fréquences manquantes par la **moyenne des autres populations** (`makefreq(missing = "mean")`) |
| JS (page) | **exclut le locus pour toutes les paires**, et la page le signale |

Pour la comparaison, fca45 a été retiré pour les trois outils (8 locus). Il faut savoir que le
choix a de l'effet. Si on laisse adegenet imputer fca45, les distances changent jusqu'à
**0,096** et **la topologie de l'arbre change**. La règle d'exclusion est donc un vrai choix de
méthode, reproductible avec PHYLIP. C'est pourquoi la page nomme toujours les locus exclus.

Les individus à qui il manque seulement certains locus ne posent aucun problème : les
fréquences sont calculées, locus par locus, sur les individus typés. Les trois outils font de
même.

## 6. Remarque sur flock-guichet

`flock-guichet/index.html` contient encore une ancienne fonction `neiD` (reste de la v1.2, non
affichée). Elle diffère de la version validée sur deux points :

1. un locus vide dans une population est exclu **paire par paire**, pas pour tout l'arbre ;
2. une distance infinie est ramenée arbitrairement à 3.

Le code de la page `arbre-especes` est celui de `js/nei-upgma.js`, validé ici.

## 7. Fichiers

- `js/nei-upgma.js` — l'implémentation, recopiée telle quelle dans la page ;
- `r/01_export_et_reference.R`, `r/02_comparaison.R`, `phylip/run_phylip.sh`, `js/run.js`,
  `stress/` — scripts ;
- `phylip/*.gendist.out`, `phylip/*.upgma.nwk`, `r/*.tsv`, `r/*.nwk`, `js/*.tsv`, `js/*.nwk` —
  sorties brutes de chaque logiciel ;
- `resultats.tsv` — le tableau de la section 5.
