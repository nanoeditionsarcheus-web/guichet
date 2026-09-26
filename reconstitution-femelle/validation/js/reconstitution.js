/* Reconstitution du génotype d'une femelle à partir des génotypes de ses juvéniles
 * (méthode de P. Duchesne : nombre de compatibilités, NC) — sans dépendance.
 *
 * Pour chaque locus :
 *  - juvéniles typés : génotypes présents (un génotype manquant ne compte pas) ;
 *  - candidates : toutes les paires, avec répétition, des allèles observés chez les juvéniles typés ;
 *  - NC(candidate) : nombre de juvéniles typés qui partagent au moins un allèle avec la candidate ;
 *  - on retient la ou les candidates de NC maximal (toutes les égalités sont présentées).
 * Validé contre le programme Maple de P. Duchesne (RECONSTITUTION_FEMELLE_TOUS_LOC.mw).
 *
 * Entrée : liste de juvéniles ; chaque juvénile est une liste (un élément par locus)
 * de [allèle1, allèle2], ou null si le génotype manque.
 */
(function (root) {
  "use strict";

  function compatible(g, cand) {
    return g[0] === cand[0] || g[0] === cand[1] || g[1] === cand[0] || g[1] === cand[1];
  }

  function analyseLocus(genos) {
    var typed = genos.filter(function (g) { return g; });
    var set = {};
    typed.forEach(function (g) { set[g[0]] = 1; set[g[1]] = 1; });
    var alleles = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    var cands = [];
    for (var i = 0; i < alleles.length; i++)
      for (var j = i; j < alleles.length; j++) {
        var c = [alleles[i], alleles[j]], nc = 0, incompat = [];
        for (var k = 0; k < genos.length; k++) {
          if (!genos[k]) continue;
          if (compatible(genos[k], c)) nc++; else incompat.push(k);
        }
        cands.push({ geno: c, nc: nc, incompatibles: incompat });
      }
    // NC décroissant ; à égalité, ordre croissant des allèles
    cands.sort(function (a, b) { return b.nc - a.nc || a.geno[0] - b.geno[0] || a.geno[1] - b.geno[1]; });
    var max = cands.length ? cands[0].nc : 0;
    var best = cands.filter(function (c) { return c.nc === max; });
    var below = cands.filter(function (c) { return c.nc < max; });
    return {
      nTyped: typed.length,          // maximum possible de compatibilités
      nAlleles: alleles.length,      // allèles réellement observés (le code des manquants n'est pas compté)
      alleles: alleles,
      candidates: cands,
      best: best,                    // toutes les candidates de NC maximal
      maxNC: max,
      secondNC: below.length ? below[0].nc : null   // plus haute valeur de NC inférieure au maximum
    };
  }

  function analyse(juveniles, nLoci) {
    var out = [];
    for (var l = 0; l < nLoci; l++)
      out.push(analyseLocus(juveniles.map(function (j) { return j[l]; })));
    return out;
  }

  var api = { compatible: compatible, analyseLocus: analyseLocus, analyse: analyse };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Reconstitution = api;
})(this);
