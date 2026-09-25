# Arbre des espèces

Regroupe des lignées de référence d'après leurs génotypes microsatellites. La page calcule la

**→ [Ouvrir la page](https://nanoeditionsarcheus-web.github.io/guichet/arbre-especes/)** — hébergée dans le dépôt du portail `guichet`.
**distance génétique standard de Nei (1972)** entre les lignées, puis construit l'arbre par
**UPGMA**. Une page HTML autonome : tout le calcul se fait dans le navigateur.

## Utilisation

Téléversez une matrice par espèce ou lignée (au moins deux). Disposition FLOCK : identifiant,
puis 2 colonnes par locus. Formats : .xls, .xlsx, .csv. La page affiche :

- l'arbre (SVG) ;
- la matrice des distances ;
- les locus utilisés et exclus.

L'arbre peut être téléchargé en Newick et la matrice en CSV. À l'ouverture, la page montre un
exemple publié : `nancycats`, tiré du paquet R adegenet.

## Méthode et validation

- Fréquences alléliques calculées locus par locus, sur les génotypes présents.
- D = −ln( J_xy / √(J_x·J_y) ), où les J sont des moyennes sur les locus (Nei 1972, sans
  correction pour la taille d'échantillon).
- Un locus sans aucun génotype dans une lignée est exclu pour toutes les lignées.
- UPGMA (Sokal et Michener 1958).

Le calcul a été validé **avant publication** contre PHYLIP 3.697 (`gendist` + `neighbor`
UPGMA) et adegenet 2.1.10 (`dist.genpop`) + `hclust`, sur quatre jeux publiés. Voir
[`validation/RAPPORT.md`](validation/RAPPORT.md) : jeux, commandes exactes, résultats et écarts.

## Construction

`index.html` est produit par `python3 construire.py` à partir de `gabarit.html`. Le script y
recopie tel quel le code validé (`validation/js/nei-upgma.js`) et l'exemple. Le test de bout en
bout de la page est `validation/page/test-page.js` (Playwright).

## Écriture

Page écrite par **Claude** (Anthropic), dans le cadre d'un échange avec Éleine Leblanc, pour le
guichet de génétique des populations de Pierre Duchesne et Nathalie Tessier.
