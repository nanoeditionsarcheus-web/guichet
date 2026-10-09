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

  // Incompatibles avec un génotype complet, fichier par fichier (dans l'ordre de la combinaison) : juvéniles
  // qui ne partagent aucun allèle avec le génotype à au moins un locus génotypé chez les deux.
  function incompatibles(fichiers, comb, geno) {
    var inc = function (j) { return j.some(function (g, l) { return g && geno[l] && !Rec.compatible(g, geno[l]); }); };
    return comb.map(function (f) { return fichiers[f].juveniles.filter(inc).length; });
  }
  function somme(t) { return t.reduce(function (a, b) { return a + b; }, 0); }

  function reconstituer(fichiers, comb, nLoci) {
    var juv = [];
    comb.forEach(function (j) { juv = juv.concat(fichiers[j].juveniles); });
    var ret = Rec.retenusParLocus(Rec.analyse(juv, nLoci)), nc = Rec.nombreComplets(ret);
    var geno = nc === 1 ? Rec.genotypesComplets(ret)[0] : null, parFichier = geno ? incompatibles(fichiers, comb, geno) : null;
    var r = { comb: comb, n: juv.length, nParFichier: comb.map(function (f) { return fichiers[f].juveniles.length; }), nComplets: nc,
              geno: geno, incompatibles: parFichier ? somme(parFichier) : null, incParFichier: parFichier };
    // Cas de deux génotypes complets (demande de P. Duchesne, 9 octobre 2026) : les deux, avec leurs incompatibles.
    if (nc === 2) r.deux = Rec.genotypesComplets(ret).map(function (g) {
      var p = incompatibles(fichiers, comb, g); return { geno: g, incParFichier: p, incompatibles: somme(p) };
    });
    return r;
  }

  /* Plafond d'incompatibles (demande de P. Duchesne, 3 octobre 2026) : un génotype reconstitué n'est
   * retenu que si le pourcentage de juvéniles de la combinaison incompatibles avec lui ne dépasse pas
   * « plafond » (en %). Au-delà, la femelle est jugée factice : « rejeté ». Puis on numérote les
   * génotypes retenus distincts dans l'ordre de première apparition. */
  /* Plafond par fichier (demande de P. Duchesne, 9 octobre 2026) : le même plafond s'applique aussi à chaque
   * fichier de la combinaison (pourcentage de ses juvéniles incompatibles avec le génotype de la combinaison).
   * Un génotype est rejeté si le pourcentage global ou celui d'un fichier dépasse le plafond. */
  function pourcentages(x, r, plafond) {
    x.pctIncompat = 100 * x.incompatibles / r.n;
    x.pctParFichier = x.incParFichier.map(function (v, k) { return 100 * v / r.nParFichier[k]; });
    x.sousPlafond = x.pctIncompat <= plafond + 1e-9 && x.pctParFichier.every(function (p) { return p <= plafond + 1e-9; });
  }
  function numeroter(res, plafond) {
    var vus = {}, k = 0;
    res.forEach(function (r) {
      r.pctIncompat = null; r.pctParFichier = null;
      if (r.geno) pourcentages(r, r, plafond);
      if (r.deux) r.deux.forEach(function (x) { pourcentages(x, r, plafond); });
      r.retenu = !!r.geno && r.sousPlafond;
      r.num = null;
      if (!r.retenu) return;
      var c = Rec.cleComplet(r.geno); if (!(c in vus)) vus[c] = ++k; r.num = vus[c];
    });
    return res;
  }
  function distincts(res) {
    var m = {};
    res.forEach(function (r) { if (!r.retenu) return; (m[r.num] = m[r.num] || { num: r.num, geno: r.geno, combs: [] }).combs.push(r.comb); });
    return Object.keys(m).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return m[k]; });
  }

  /* Groupes de fichiers (demande de P. Duchesne, 4 octobre 2026) : pour chaque fichier, la ou les plus
   * grandes combinaisons retenues qui le contiennent (plusieurs en cas d'égalité de taille). Chaque
   * combinaison ainsi choisie n'est présentée qu'une fois, avec les fichiers qui l'ont choisie. Un groupe
   * est « cohérent » si chacun de ses fichiers a ce groupe, et lui seul, pour plus grande combinaison.
   * res : résultat de numeroter ; n : nombre de fichiers. */
  function groupes(res, n) {
    var parFichier = [], liste = [], index = {};
    for (var f = 0; f < n; f++) {
      var max = 0, best = [];
      res.forEach(function (r) {
        if (!r.retenu || r.comb.indexOf(f) < 0) return;
        if (r.comb.length > max) { max = r.comb.length; best = [r]; }
        else if (r.comb.length === max) best.push(r);
      });
      parFichier.push(best.map(function (r) {
        var cle = r.comb.join(",");
        if (!(cle in index)) {
          index[cle] = liste.length;
          liste.push({ comb: r.comb, num: r.num, geno: r.geno, n: r.n, incompatibles: r.incompatibles, incParFichier: r.incParFichier, pctIncompat: r.pctIncompat, pctParFichier: r.pctParFichier, choisiPar: [] });
        }
        liste[index[cle]].choisiPar.push(f);
        return index[cle];
      }));
    }
    liste.forEach(function (g, i) {
      g.coherent = g.comb.every(function (f) { return parFichier[f].length === 1 && parFichier[f][0] === i; });
    });
    return { groupes: liste, parFichier: parFichier,
             sans: parFichier.map(function (p, f) { return p.length ? null : f; }).filter(function (f) { return f !== null; }) };
  }

  /* Présence dans la banque de femelles (demande de P. Duchesne, 9 octobre 2026). Un génotype est « présent »
   * s'il est identique à celui d'une femelle de la banque à chaque locus où les deux sont connus (au moins un
   * locus comparé). On donne aussi, s'il n'est pas présent, la femelle la plus proche : la plus faible
   * proportion de locus différents parmi les locus comparés, puis le plus de locus comparés. banque : [{nom, source, geno}]. */
  function memeGeno(a, b) { return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]); }
  function comparerFemelle(geno, f) {
    var compares = 0, differents = 0;
    geno.forEach(function (g, l) { var h = f.geno[l]; if (!g || !h) return; compares++; if (!memeGeno(g, h)) differents++; });
    return { compares: compares, differents: differents };
  }
  function presenceBanque(geno, banque) {
    var presentes = [], proche = null;
    banque.forEach(function (f, i) {
      var c = comparerFemelle(geno, f); c.index = i;
      if (c.compares > 0 && c.differents === 0) presentes.push(c);
      // la plus proche : la plus faible proportion de locus différents (différents × comparés croisés, sans division), puis le plus de locus comparés
      if (c.compares > 0 && (!proche || c.differents * proche.compares < proche.differents * c.compares ||
          (c.differents * proche.compares === proche.differents * c.compares && c.compares > proche.compares))) proche = c;
    });
    return { present: presentes.length > 0, presentes: presentes, proche: proche };
  }
  // Liste examinée : d'abord les génotypes retenus distincts, puis, pour chaque combinaison à deux génotypes
  // complets, ceux qui respectent le plafond (global et par fichier).
  function listeBanque(res, banque) {
    var out = [];
    distincts(res).forEach(function (x) { out.push({ type: "retenu", num: x.num, combs: x.combs, geno: x.geno, banque: presenceBanque(x.geno, banque) }); });
    res.forEach(function (r) {
      if (!r.deux) return;
      r.deux.forEach(function (x, i) { if (x.sousPlafond) out.push({ type: "deux", lettre: i === 0 ? "A" : "B", combs: [r.comb], geno: x.geno, banque: presenceBanque(x.geno, banque) }); });
    });
    return out;
  }

  var api = { nombre: nombre, comparerFemelle: comparerFemelle, presenceBanque: presenceBanque, listeBanque: listeBanque, lister: lister, reconstituer: reconstituer, incompatibles: incompatibles, numeroter: numeroter, distincts: distincts, groupes: groupes };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Combinaisons = api;
})(this);
