/* Tableau des compatibilités (proposé par P. Duchesne, octobre 2026) — sans dépendance.
 *
 * Un juvénile est compatible avec une femelle s'il partage au moins un allèle avec elle à chacun des
 * locus où les deux sont génotypés (un locus manquant chez l'un ou l'autre n'est pas examiné).
 * Cellule (femelle i, groupe j) : nombre de juvéniles du groupe j compatibles avec la femelle i.
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
  // Résultat : { comptes[i][j], effectifs[j] } — effectifs : nombre de juvéniles du groupe.
  function tableau(femelles, groupes) {
    return {
      comptes: femelles.map(function (f) {
        return groupes.map(function (g) {
          return g.juveniles.filter(function (j) { return compatible(j, f.geno); }).length;
        });
      }),
      effectifs: groupes.map(function (g) { return g.juveniles.length; })
    };
  }

  var api = { comparer: comparer, compatible: compatible, tableau: tableau };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Compatibilites = api;
})(this);
