/* Distance génétique standard de Nei (1972) + UPGMA — sans dépendance.
 *
 * Références :
 *  - Nei M. (1972) Genetic distance between populations. American Naturalist 106 : 283-292.
 *    I = Jxy / sqrt(Jx · Jy), D = −ln(I), où Jx, Jy, Jxy sont les moyennes, sur les locus,
 *    de Σ px², Σ py², Σ px·py (fréquences alléliques).
 *  - Sokal R.R. & Michener C.D. (1958) — UPGMA : on réunit la paire de groupes la plus proche ;
 *    la distance du nouveau groupe aux autres est la moyenne pondérée par le nombre de feuilles ;
 *    le nœud est placé à la hauteur d/2 (arbre ultramétrique).
 *  Validé contre PHYLIP 3.697 (gendist + neighbor, option UPGMA) et adegenet 2.1.10
 *  (dist.genpop, method = 1) + stats::hclust(method = "average").
 *
 * Entrée des génotypes : pour chaque population, une liste d'individus ; chaque individu est une
 * liste (un élément par locus) de [allèle1, allèle2] ou null si le génotype manque.
 */
(function (root) {
  "use strict";

  // Comptes alléliques d'une population : un objet {c: {allèle: compte}, k: total} par locus.
  function alleleCounts(genos, nLoci) {
    var out = [];
    for (var l = 0; l < nLoci; l++) {
      var c = {}, k = 0;
      for (var i = 0; i < genos.length; i++) {
        var g = genos[i][l];
        if (!g) continue;
        for (var a = 0; a < g.length; a++) { c[g[a]] = (c[g[a]] || 0) + 1; k++; }
      }
      out.push({ c: c, k: k });
    }
    return out;
  }

  // Locus utilisables : typés (k > 0) dans toutes les populations. Un locus sans aucune donnée
  // dans une population est exclu pour toutes les paires (même règle que PHYLIP, qui exige des
  // fréquences complètes).
  function usableLoci(counts) {
    var keep = [], excluded = [];
    for (var l = 0; l < counts[0].length; l++) {
      var ok = true;
      for (var p = 0; p < counts.length; p++) if (counts[p][l].k <= 0) { ok = false; break; }
      (ok ? keep : excluded).push(l);
    }
    return { keep: keep, excluded: excluded };
  }

  // Distance standard de Nei (1972) entre deux populations, sur les locus donnés.
  function neiD(cx, cy, loci) {
    var jxy = 0, jx = 0, jy = 0;
    for (var t = 0; t < loci.length; t++) {
      var l = loci[t], X = cx[l], Y = cy[l], a;
      for (a in X.c) { var px = X.c[a] / X.k; jx += px * px; if (Y.c[a]) jxy += px * Y.c[a] / Y.k; }
      for (a in Y.c) { var py = Y.c[a] / Y.k; jy += py * py; }
    }
    // Les moyennes sur les locus ont le même dénominateur : il se simplifie dans le rapport.
    var I = jxy / Math.sqrt(jx * jy);
    return I > 0 ? -Math.log(I) : Infinity;  // I = 0 : aucun allèle partagé, distance infinie
  }

  function neiMatrix(counts, loci) {
    var n = counts.length, D = [];
    for (var i = 0; i < n; i++) { D.push([]); for (var j = 0; j < n; j++) D[i].push(0); }
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) D[i][j] = D[j][i] = neiD(counts[i], counts[j], loci);
    return D;
  }

  // UPGMA. Égalités : la première paire (i < j) dans l'ordre courant des groupes l'emporte ;
  // le nouveau groupe prend la place du premier des deux.
  function upgma(names, D) {
    var cl = names.map(function (nm, i) { return { name: nm, size: 1, h: 0, idx: i }; });
    var d = D.map(function (r) { return r.slice(); });
    while (cl.length > 1) {
      var bi = 0, bj = 1, best = Infinity;
      for (var i = 0; i < cl.length; i++) for (var j = i + 1; j < cl.length; j++)
        if (d[i][j] < best) { best = d[i][j]; bi = i; bj = j; }
      if (!isFinite(best)) throw new Error("distance infinie : des populations ne partagent aucun allèle");
      var A = cl[bi], B = cl[bj], node = { children: [A, B], size: A.size + B.size, h: best / 2 };
      var row = [];
      for (var k = 0; k < cl.length; k++) row.push((d[bi][k] * A.size + d[bj][k] * B.size) / node.size);
      for (k = 0; k < cl.length; k++) { d[bi][k] = row[k]; d[k][bi] = row[k]; }
      d[bi][bi] = 0;
      cl[bi] = node;
      cl.splice(bj, 1); d.splice(bj, 1); for (k = 0; k < d.length; k++) d[k].splice(bj, 1);
    }
    return cl[0];
  }

  function toNewick(node, digits) {
    digits = digits == null ? 10 : digits;
    function rec(nd, parentH) {
      var bl = (parentH - nd.h).toFixed(digits);
      var s = nd.children ? "(" + nd.children.map(function (c) { return rec(c, nd.h); }).join(",") + ")" : nd.name;
      return s + ":" + bl;
    }
    return "(" + node.children.map(function (c) { return rec(c, node.h); }).join(",") + ");";
  }

  // Tout le calcul : populations {nom: génotypes} -> {names, loci gardés/exclus, D, tree}
  function analyse(pops, nLoci) {
    var names = Object.keys(pops);
    var counts = names.map(function (p) { return alleleCounts(pops[p], nLoci); });
    var u = usableLoci(counts);
    if (!u.keep.length) throw new Error("aucun locus typé dans toutes les populations");
    var D = neiMatrix(counts, u.keep);
    return { names: names, keep: u.keep, excluded: u.excluded, D: D, tree: upgma(names, D) };
  }

  var api = { alleleCounts: alleleCounts, usableLoci: usableLoci, neiD: neiD, neiMatrix: neiMatrix,
              upgma: upgma, toNewick: toNewick, analyse: analyse };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NeiUPGMA = api;
})(this);
