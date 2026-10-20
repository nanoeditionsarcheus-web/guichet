# Nombre de mâles géniteurs

Page proposée par Pierre Duchesne (19 et 20 octobre 2026) : estimer le nombre de mâles qui ont contribué aux juvéniles
d'un nid, ou d'une collection de nids d'une même femelle, à partir du génotype de la femelle (génotypé ou reconstitué)
et des génotypes des juvéniles.

- **Allèle mâle** : à chaque locus, l'allèle du juvénile qui ne vient pas de la femelle ; si le juvénile a le
  génotype de la femelle hétérozygote, le plus fréquent des deux (égalité : le plus petit) ; « aucun » si le
  juvénile est manquant ou ne porte aucun allèle de la femelle.
- **MD** : moyenne, sur les locus analysés (femelle connue, au moins un allèle mâle), du nombre d'allèles mâles
  distincts.
- **Hypothèses k = 1, 2, …** : N échantillons artificiels par hypothèse. Chaque échantillon a k mâles tirés selon
  les fréquences alléliques, une partition des n juvéniles en k parts tirée uniformément (récurrence
  p(n,k) = p(n−1,k−1) + p(n−k,k), OEIS A008284) et des juvéniles attribués au hasard aux mâles. Les juvéniles sont
  mendéliens. Les cases sans allèle mâle dans le nid restent vides. L'estimation est un intervalle. La borne inférieure
  est la première hypothèse dont la p-valeur à droite (proportion de MD simulées ≥ observée) atteint le seuil (0,05).
  On continue tant que la p-valeur à gauche (≤ observée) reste supérieure au seuil, et la borne supérieure est la
  dernière hypothèse dans ce cas. Si le nombre maximal examiné est atteint avant, l'intervalle est noté « ou plus ».
- **Simulateur** (section 5) : avec la même femelle, les mêmes fréquences et le même nombre de juvéniles (mêmes
  données manquantes), R nids artificiels de 1, 2, … mâles sont analysés par la méthode. Le résultat est un tableau
  « nombre réel de mâles / intervalle des estimations ».
- **Fréquences alléliques** : sur des fichiers de référence (nombreux nids de la population) si l'usager en
  fournit, sinon sur les juvéniles du nid (description de la méthode). La page avertit, avant le choix des fichiers,
  qu'il vaut mieux fournir une référence. Voir la calibration ci-dessous.
- **Générateur** : xoshiro128** de `../simulation-juveniles/validation/simulation.js` ; graine affichée.

Vérification (`validation/`) :
- `verifier.py` : réimplantation indépendante en Python (allèle mâle, MD, partitions, simulation, intervalle,
  simulateur de validation), dans le même ordre de tirages. `attendu.json` contient quatre cas d'analyse et trois
  séries de nids artificiels. Les cas couvrent l'exemple, des fichiers de référence et un
  cas synthétique avec femelle homozygote, locus inconnu, juvéniles manquants et incompatibles, et égalité de
  fréquences.
- `test-lib.js` : distributions, p-valeurs (droite et gauche), intervalles et nids artificiels identiques à Python ; p(n,k) identique à Python et à l'OEIS ; tirage
  uniforme des partitions (khi-deux) ; calcul par lots identique.
- `test-page.js` : page (mêmes résultats que Python, y compris le simulateur ; avertissement placé avant le choix
  des fichiers de référence ; référence, femelle à allèles collés choisie dans une liste,
  locus inconnu, téléversements, refus des valeurs invalides, arrêt).
- `calibration.js` : nids simulés de 20 juvéniles dont on connaît le nombre de mâles (200 nids par cas,
  1000 simulations par hypothèse, au plus 10 mâles examinés). Avec les fréquences estimées sur le seul nid,
  l'hypothèse vraie est rejetée à droite bien plus souvent que 5 % dès 2 mâles (51 % pour 2 mâles, 71 % pour 3). Le
  vrai nombre n'est alors dans l'intervalle que dans 49 % (2 mâles) à 11 % (5 mâles) des nids. Avec des fréquences de
  référence (10 autres nids), le rejet à droite est de 3 à 8,5 % et le vrai nombre est dans l'intervalle dans 90 à
  94,5 % des nids. L'intervalle s'élargit avec le nombre de mâles (voir `calibration.txt`, produit par
  `node calibration.js 20 200 1000 nid` et `… référence`).

Construction : `python3 construire.py` produit `index.html` (styles et lecture des fichiers repris de
`../combinaisons/gabarit.html`) et `validation/exemple.json` (nid 2021-05 de l'exemple Maple Grise ; femelle Grise
reconstituée par la page « Reconstitution d'une femelle »).
