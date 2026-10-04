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

  /* Génotypes complets les plus vraisemblables (règle de P. Duchesne) — pour chaque locus, parmi les
   * candidats de NC maximal :
   *  - un seul candidat : le retenir ;
   *  - présence d'un homozygote : ne retenir que l'homozygote (s'il y avait plusieurs homozygotes à
   *    égalité, cas qui ne s'est pas présenté, tous seraient retenus) ;
   *  - sinon (plusieurs candidats, aucun homozygote) : les retenir tous.
   * Les génotypes complets sont toutes les combinaisons des candidats retenus, locus par locus.
   * Locus sans aucun juvénile génotypé (règle approuvée par P. Duchesne, 4 octobre 2026) : le locus
   * reste inconnu (génotype null) et la femelle est reconstituée sur les autres locus. Un locus génotypé
   * chez une partie seulement des juvéniles est reconstitué avec ceux-là, comme toujours. */
  function retenusParLocus(res) {
    return res.map(function (r) {
      if (!r.best.length) return [{ geno: null, nc: 0, incompatibles: [], inconnu: true }];
      var homo = r.best.filter(function (c) { return c.geno[0] === c.geno[1]; });
      return (r.best.length > 1 && homo.length) ? homo : r.best;
    });
  }
  function nombreComplets(retenus) {
    return retenus.reduce(function (p, l) { return p * l.length; }, 1);
  }
  // Énumère les combinaisons (au plus « limite ») ; chaque combinaison est une liste de génotypes, un par locus.
  function genotypesComplets(retenus, limite) {
    var out = [], idx = retenus.map(function () { return 0; }), n = nombreComplets(retenus);
    if (!retenus.length || !n) return out;
    limite = limite == null ? Infinity : limite;
    while (out.length < Math.min(n, limite)) {
      out.push(idx.map(function (i, l) { return retenus[l][i].geno; }));
      for (var l = retenus.length - 1; l >= 0; l--) {   // incrément « odomètre » : le dernier locus varie le plus vite
        if (++idx[l] < retenus[l].length) break;
        idx[l] = 0;
      }
    }
    return out;
  }

  /* Rééchantillonnage aléatoire (proposé par P. Duchesne, 30 septembre 2026). Pour une taille n,
   * on tire n juvéniles au hasard, sans remise (mélange de Fisher-Yates partiel), on reconstitue la
   * femelle et on note si l'on obtient un seul génotype complet, et s'il est identique à « reference »
   * (chaîne produite par cleComplet sur l'échantillon complet). « rnd » : générateur uniforme [0, 1). */
  function cleComplet(comb) { return comb.map(function (g) { return g ? g[0] + "/" + g[1] : "?"; }).join(" "); }
  function reechantillonnerTaille(juveniles, nLoci, n, iterations, reference, rnd) {
    var unique = 0, identique = 0, a = juveniles.slice();
    for (var it = 0; it < iterations; it++) {
      for (var i = 0; i < n; i++) { var j = i + Math.floor(rnd() * (a.length - i)), t = a[i]; a[i] = a[j]; a[j] = t; }
      var ret = retenusParLocus(analyse(a.slice(0, n), nLoci));
      if (nombreComplets(ret) === 1) {
        unique++;
        if (cleComplet(genotypesComplets(ret)[0]) === reference) identique++;
      }
    }
    return { taille: n, unique: unique / iterations, identique: identique / iterations };
  }

  var api = { compatible: compatible, analyseLocus: analyseLocus, analyse: analyse,
              retenusParLocus: retenusParLocus, nombreComplets: nombreComplets, genotypesComplets: genotypesComplets,
              cleComplet: cleComplet, reechantillonnerTaille: reechantillonnerTaille };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Reconstitution = api;
})(this);
