/* Combinaisons de fichiers de juvéniles (proposé par P. Duchesne, octobre 2026) — sans dépendance.
 * Pour chaque combinaison de 1, 2, …, k fichiers, on fusionne les juvéniles et on reconstitue la
 * femelle avec le code validé (Reconstitution, chargé avant ce fichier). */
(function (root) {
  "use strict";
  var Rec = (typeof module !== "undefined" && module.exports) ? require("../../reconstitution-femelle/validation/js/reconstitution.js") : root.Reconstitution;

  function binom(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
  function nombre(n, kmax) { var t = 0; for (var k = 1; k <= Math.min(n, kmax); k++) t += binom(n, k); return t; }

  // Toutes les combinaisons de 1 à kmax indices parmi 0…n−1, par taille puis dans l'ordre lexicographique.
  function lister(n, kmax) {
    var out = [];
    for (var k = 1; k <= Math.min(n, kmax); k++) {
      var c = []; for (var i = 0; i < k; i++) c.push(i);
      while (true) {
        out.push(c.slice());
        var p = k - 1; while (p >= 0 && c[p] === n - k + p) p--;
        if (p < 0) break;
        c[p]++; for (var q = p + 1; q < k; q++) c[q] = c[q - 1] + 1;
      }
    }
    return out;
  }

  function reconstituer(fichiers, comb, nLoci) {
    var juv = [];
    comb.forEach(function (j) { juv = juv.concat(fichiers[j].juveniles); });
    var ret = Rec.retenusParLocus(Rec.analyse(juv, nLoci)), nc = Rec.nombreComplets(ret);
    var geno = nc === 1 ? Rec.genotypesComplets(ret)[0] : null, incompat = null;
    if (geno) {   // juvéniles qui ne partagent aucun allèle avec le génotype reconstitué à au moins un locus
      incompat = juv.filter(function (j) {
        return j.some(function (g, l) { return g && !Rec.compatible(g, geno[l]); });
      }).length;
    }
    return { comb: comb, n: juv.length, nComplets: nc, geno: geno, incompatibles: incompat };
  }

  // Numérote les génotypes distincts dans l'ordre de première apparition.
  function numeroter(res) {
    var vus = {}, k = 0;
    res.forEach(function (r) { if (!r.geno) return; var c = Rec.cleComplet(r.geno); if (!(c in vus)) vus[c] = ++k; r.num = vus[c]; });
    return res;
  }
  function distincts(res) {
    var m = {};
    res.forEach(function (r) { if (!r.geno) return; (m[r.num] = m[r.num] || { num: r.num, geno: r.geno, combs: [] }).combs.push(r.comb); });
    return Object.keys(m).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return m[k]; });
  }

  var api = { nombre: nombre, lister: lister, reconstituer: reconstituer, numeroter: numeroter, distincts: distincts };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Combinaisons = api;
})(this);
