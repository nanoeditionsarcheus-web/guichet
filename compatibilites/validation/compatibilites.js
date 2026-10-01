/* Tableau des compatibilités (proposé par P. Duchesne, octobre 2026) — sans dépendance.
 *
 * Un juvénile est compatible avec une femelle s'il partage au moins un allèle avec elle à chacun des
 * locus où les deux sont génotypés (un locus manquant chez l'un ou l'autre n'est pas examiné).
 * Cellule (femelle i, groupe j) : nombre de juvéniles du groupe j compatibles avec la femelle i.
 * Rangée « Aucune » (ajoutée à la demande de P. Duchesne) : nombre de juvéniles du groupe j compatibles
 * avec aucune des femelles. Un juvénile peut être compatible avec plusieurs femelles : les rangées ne
 * s'additionnent donc pas forcément à l'effectif du groupe.
 *
 * Génotypes : liste (un élément par locus) de [allèle1, allèle2], ou null si le génotype manque.
 */
(function (root) {
  "use strict";

  // Nombre de locus examinés et nombre de locus incompatibles entre un juvénile et une femelle.
  function comparer(juv, fem) {
    var examines = 0, incompatibles = 0;
    for (var l = 0; l < juv.length; l++) {
      var j = juv[l], f = fem[l];
      if (!j || !f) continue;
      examines++;
      if (j[0] !== f[0] && j[0] !== f[1] && j[1] !== f[0] && j[1] !== f[1]) incompatibles++;
    }
    return { examines: examines, incompatibles: incompatibles };
  }

  // Compatible à tous les locus examinés (un juvénile sans aucun locus examiné n'est pas compté).
  function compatible(juv, fem) {
    var c = comparer(juv, fem);
    return c.examines > 0 && c.incompatibles === 0;
  }

  // femelles : [{nom, geno}] ; groupes : [{nom, juveniles: [geno, …]}]
  // Résultat : { comptes[i][j], aucune[j], effectifs[j] } — effectifs : nombre de juvéniles du groupe.
  function tableau(femelles, groupes) {
    return {
      comptes: femelles.map(function (f) {
        return groupes.map(function (g) {
          return g.juveniles.filter(function (j) { return compatible(j, f.geno); }).length;
        });
      }),
      aucune: groupes.map(function (g) {
        return g.juveniles.filter(function (j) {
          return !femelles.some(function (f) { return compatible(j, f.geno); });
        }).length;
      }),
      effectifs: groupes.map(function (g) { return g.juveniles.length; })
    };
  }

  /* Catégories exclusives : chaque juvénile est classé selon l'ensemble des femelles avec lesquelles il
   * est compatible (« F1 », « F1 + F2 », …, ou « Aucune »). Chaque juvénile compte une seule fois, ce
   * qu'exige le test exact de Fisher. Résultat : { categories: [noms], comptes[c][j] }. */
  function categoriesExclusives(femelles, groupes) {
    var cles = [], index = {}, parGroupe = groupes.map(function (g) {
      var c = {};
      g.juveniles.forEach(function (j) {
        var k = [];
        femelles.forEach(function (f, i) { if (compatible(j, f.geno)) k.push(i); });
        var cle = k.join(",");
        if (!(cle in index)) { index[cle] = cles.length; cles.push(k); }
        c[cle] = (c[cle] || 0) + 1;
      });
      return c;
    });
    // ordre : une femelle seule, puis les combinaisons, « Aucune » à la fin
    var ordre = cles.map(function (k, i) { return i; }).sort(function (a, b) {
      var A = cles[a], B = cles[b];
      if (!A.length || !B.length) return B.length - A.length;
      return A.length - B.length || A[0] - B[0] || (A[1] || 0) - (B[1] || 0);
    });
    return {
      categories: ordre.map(function (i) { return cles[i].length ? cles[i].map(function (f) { return femelles[f].nom; }).join(" + ") : "Aucune"; }),
      comptes: ordre.map(function (i) { var cle = cles[i].join(","); return parGroupe.map(function (c) { return c[cle] || 0; }); })
    };
  }

  /* Test exact de Fisher pour une table à r rangées et 2 colonnes (extension de Freeman et Halton,
   * 1951) : p = somme des probabilités hypergéométriques des tables de mêmes marges dont la
   * probabilité est inférieure ou égale à celle de la table observée (tolérance relative 1e-7,
   * comme fisher.test de R). Les rangées vides sont ignorées. Retourne null si l'énumération
   * dépasse « limite » tables. */
  function fisherRx2(a, b, limite) {
    var rows = [];
    for (var i = 0; i < a.length; i++) if (a[i] + b[i] > 0) rows.push([a[i], b[i]]);
    if (rows.length < 2) return 1;
    var r = rows.map(function (x) { return x[0] + x[1]; }), c1 = 0, N = 0;
    rows.forEach(function (x) { c1 += x[0]; N += x[0] + x[1]; });
    if (c1 === 0 || c1 === N) return 1;
    var lf = [0]; for (var k = 1; k <= N; k++) lf[k] = lf[k - 1] + Math.log(k);
    var cst = r.reduce(function (s, ri) { return s + lf[ri]; }, 0) + lf[c1] + lf[N - c1] - lf[N];
    function terme(i, x) { return -lf[x] - lf[r[i] - x]; }
    var lpObs = cst + rows.reduce(function (s, x, i) { return s + terme(i, x[0]); }, 0);
    var seuil = lpObs + Math.log(1 + 1e-7), p = 0, n = 0, R = rows.length;
    var reste = []; reste[R] = 0; for (i = R - 1; i >= 0; i--) reste[i] = reste[i + 1] + r[i];
    limite = limite || 5e7;
    (function rec(i, restant, lp) {
      if (n > limite) return;
      if (i === R - 1) {
        n++;
        if (restant > r[i]) return;
        var t = lp + terme(i, restant);
        if (t <= seuil) p += Math.exp(t);
        return;
      }
      var lo = Math.max(0, restant - reste[i + 1]), hi = Math.min(r[i], restant);
      for (var x = lo; x <= hi; x++) rec(i + 1, restant - x, lp + terme(i, x));
    })(0, c1, cst);
    return n > limite ? null : Math.min(1, p);
  }

  // p-valeurs de toutes les paires de groupes, sur les catégories exclusives.
  function pvaleursPaires(cat) {
    var G = cat.comptes.length ? cat.comptes[0].length : 0, P = [];
    for (var i = 0; i < G; i++) {
      P.push([]);
      for (var j = 0; j < G; j++) {
        if (i === j) { P[i].push(null); continue; }
        if (j < i) { P[i].push(P[j][i]); continue; }
        P[i].push(fisherRx2(cat.comptes.map(function (r) { return r[i]; }), cat.comptes.map(function (r) { return r[j]; })));
      }
    }
    return P;
  }

  var api = { comparer: comparer, compatible: compatible, tableau: tableau,
              categoriesExclusives: categoriesExclusives, fisherRx2: fisherRx2, pvaleursPaires: pvaleursPaires };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Compatibilites = api;
})(this);
