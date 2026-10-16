/* Génération de juvéniles artificiels (proposée par P. Duchesne, 16 octobre 2026) — sans dépendance.
 *
 * 1) Fréquences alléliques, locus par locus, calculées sur un pool de génotypes empiriques (chaque génotype
 *    non manquant compte pour deux allèles).
 * 2) Génotype de chaque parent artificiel : à chaque locus, deux allèles tirés indépendamment selon ces
 *    fréquences (équilibre de Hardy-Weinberg).
 * 3) Génotype de chaque juvénile d'un croisement femelle × mâle : à chaque locus, un des deux allèles de la
 *    femelle (probabilité 1/2 chacun) et un des deux allèles du mâle (1/2 chacun) — lois de Mendel.
 *
 * Générateur pseudo-aléatoire : xoshiro128** (Blackman et Vigna, 2018, « Scrambled linear pseudorandom number
 * generators », ACM TOMS 47, 2021), état initialisé à partir d'une graine de 32 bits par splitmix32 (mélangeur
 * de MurmurHash3). Une même graine redonne exactement la même simulation.
 * Ordre des tirages (fixe, pour la reproductibilité) : parents dans l'ordre de première apparition dans le
 * tableau (colonne par colonne, femelle puis mâles de haut en bas), deux tirages par locus ; puis juvéniles,
 * colonne par colonne, croisement par croisement, et pour chaque locus un tirage pour l'allèle maternel puis un
 * pour l'allèle paternel.
 */
(function (root) {
  "use strict";
  var Rec = (typeof module !== "undefined" && module.exports) ? require("../../reconstitution-femelle/validation/js/reconstitution.js") : root.Reconstitution;

  // ---------- générateur ----------
  function rotl(x, k) { return ((x << k) | (x >>> (32 - k))) >>> 0; }
  function splitmix32(graine) {
    var x = graine >>> 0;
    return function () {
      x = (x + 0x9e3779b9) >>> 0;
      var z = x;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
  }
  // xoshiro128** ; « etat » : quatre entiers de 32 bits (non tous nuls). suivant() rend un entier de 32 bits.
  function xoshiro128ss(etat) {
    var s = etat.map(function (v) { return v >>> 0; });
    return function () {
      var r = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0, t = (s[1] << 9) >>> 0;
      s[2] = (s[2] ^ s[0]) >>> 0; s[3] = (s[3] ^ s[1]) >>> 0; s[1] = (s[1] ^ s[2]) >>> 0; s[0] = (s[0] ^ s[3]) >>> 0;
      s[2] = (s[2] ^ t) >>> 0; s[3] = rotl(s[3], 11);
      return r;
    };
  }
  // Uniforme dans [0, 1) à partir d'une graine de 32 bits.
  function generateur(graine) {
    var sm = splitmix32(graine), x = xoshiro128ss([sm(), sm(), sm(), sm()]);
    return function () { return x() / 4294967296; };
  }

  // ---------- fréquences alléliques ----------
  // genotypes : liste de génotypes (un élément par locus, [a, b] ou null). Rend, par locus,
  // { alleles: [triés], comptes: [...], total: 2 × génotypes non manquants }.
  function frequences(genotypes, nLoci) {
    var out = [];
    for (var l = 0; l < nLoci; l++) {
      var c = {}, total = 0;
      genotypes.forEach(function (g) { var x = g[l]; if (!x) return; c[x[0]] = (c[x[0]] || 0) + 1; c[x[1]] = (c[x[1]] || 0) + 1; total += 2; });
      var al = Object.keys(c).map(Number).sort(function (a, b) { return a - b; });
      out.push({ alleles: al, comptes: al.map(function (a) { return c[a]; }), total: total });
    }
    return out;
  }
  // Un allèle tiré selon les fréquences du locus (méthode de l'inverse de la fonction de répartition).
  function tirerAllele(f, u) {
    var cible = u * f.total, cum = 0;
    for (var i = 0; i < f.alleles.length; i++) { cum += f.comptes[i]; if (cible < cum) return f.alleles[i]; }
    return f.alleles[f.alleles.length - 1];
  }

  // ---------- tableau des croisements ----------
  // rows : lignes du classeur. Colonnes par paires : en tête, le nom de la femelle puis « # juvéniles » ; en dessous,
  // une ligne par mâle : nom du mâle, nombre de juvéniles. Rend [{ colonne, femelle, croisements: [{ male, n }] }].
  function lireTableau(rows) {
    var h = rows[0] || [], out = [], lettre = function (j) { var s = ""; j++; while (j > 0) { var r = (j - 1) % 26; s = String.fromCharCode(65 + r) + s; j = Math.floor((j - 1) / 26); } return s; };
    var v = function (x) { return x == null ? "" : String(x).trim(); };
    for (var j = 0; j < h.length; j += 2) {
      var fem = v(h[j]); if (!fem) continue;
      var cr = [];
      for (var r = 1; r < rows.length; r++) {
        var m = v((rows[r] || [])[j]), n = v((rows[r] || [])[j + 1]);
        if (!m && !n) continue;
        if (!m) throw new Error("cellule " + lettre(j) + (r + 1) + " : nombre de juvéniles sans nom de mâle.");
        if (!/^\d+$/.test(n)) throw new Error("cellule " + lettre(j + 1) + (r + 1) + " : le nombre de juvéniles du croisement " + fem + " × " + m + " doit être un entier.");
        if (+n > 0) cr.push({ male: m, n: +n });
      }
      if (cr.length) out.push({ colonne: out.length + 1, femelle: fem, croisements: cr });
    }
    if (!out.length) throw new Error("aucun croisement lu : en tête, le nom de chaque femelle dans une colonne sur deux, puis une ligne par mâle (nom, nombre de juvéniles).");
    return out;
  }

  // ---------- simulation ----------
  // graine : entier de 32 bits, ou générateur déjà créé (les itérations d'une série partagent un même générateur).
  function simuler(freqs, tableau, graine) {
    var u = typeof graine === "function" ? graine : generateur(graine), L = freqs.length, parents = {}, ordre = [];
    function parent(sexe, nom) {
      var cle = sexe + ":" + nom;
      if (!(cle in parents)) {
        var g = [];
        for (var l = 0; l < L; l++) { var a = tirerAllele(freqs[l], u()), b = tirerAllele(freqs[l], u()); g.push(a <= b ? [a, b] : [b, a]); }
        parents[cle] = { sexe: sexe, nom: nom, geno: g }; ordre.push(cle);
      }
      return parents[cle];
    }
    tableau.forEach(function (c) { parent("F", c.femelle); c.croisements.forEach(function (x) { parent("M", x.male); }); });
    var fichiers = tableau.map(function (c) {
      var mere = parents["F:" + c.femelle], juv = [], k = 0;
      c.croisements.forEach(function (x) {
        var pere = parents["M:" + x.male];
        for (var i = 0; i < x.n; i++) {
          var g = [];
          for (var l = 0; l < L; l++) { var m = mere.geno[l][u() < 0.5 ? 0 : 1], p = pere.geno[l][u() < 0.5 ? 0 : 1]; g.push(m <= p ? [m, p] : [p, m]); }
          k++; juv.push({ id: "C" + c.colonne + "-" + (k < 10 ? "0" : "") + k, mere: c.femelle, pere: x.male, geno: g });
        }
      });
      return { colonne: c.colonne, femelle: c.femelle, croisements: c.croisements, juveniles: juv };
    });
    return { graine: typeof graine === "function" ? null : graine >>> 0, parents: ordre.map(function (k) { return parents[k]; }), fichiers: fichiers };
  }

  /* Bilan de nombreuses itérations d'une même simulation (demande de P. Duchesne, 17 octobre 2026).
   * Lignes : chaque fichier du tableau, puis chaque femelle qui a plusieurs fichiers, ses fichiers réunis.
   * À chaque itération, la femelle de chaque ligne est reconstituée par la méthode du nombre de compatibilités
   * (code validé contre le programme Maple de P. Duchesne, règle de l'homozygote comprise) et comparée à la vraie :
   *   juste / faux : un seul génotype candidat, égal ou non à celui de la vraie mère ;
   *   deuxUnJuste / deuxZeroJuste : deux génotypes candidats, dont l'un est celui de la vraie mère, ou aucun ;
   *   nonResolu : trois génotypes candidats ou plus.
   * Pour les génotypes faux, on compte le nombre de locus erronés (1 à L).
   * Une série utilise un seul générateur, initialisé par la graine : la même graine redonne le même bilan. */
  function lignesBilan(tableau) {
    var out = tableau.map(function (c, i) { return { nom: "C" + c.colonne + "_" + c.femelle, femelle: c.femelle, colonnes: [i] }; }), vues = {};
    tableau.forEach(function (c, i) { (vues[c.femelle] = vues[c.femelle] || []).push(i); });
    Object.keys(vues).forEach(function (f) { if (vues[f].length > 1) out.push({ nom: f + " : " + vues[f].map(function (i) { return "C" + tableau[i].colonne; }).join(" + "), femelle: f, colonnes: vues[f] }); });
    return out;
  }
  function creerBilan(freqs, tableau, graine) {
    var L = freqs.length;
    return { freqs: freqs, tableau: tableau, graine: graine >>> 0, u: generateur(graine), fait: 0,
             lignes: lignesBilan(tableau).map(function (l) { var z = []; for (var k = 0; k <= L; k++) z.push(0);
               return { nom: l.nom, femelle: l.femelle, colonnes: l.colonnes, juste: 0, faux: 0, deuxUnJuste: 0, deuxZeroJuste: 0, nonResolu: 0, fauxLocus: z }; }) };
  }
  function egal(a, b) { return a.every(function (g, l) { return g[0] === b[l][0] && g[1] === b[l][1]; }); }
  function avancerBilan(B, n) {
    var L = B.freqs.length;
    for (var it = 0; it < n; it++) {
      var r = simuler(B.freqs, B.tableau, B.u), meres = {};
      r.parents.forEach(function (p) { if (p.sexe === "F") meres[p.nom] = p.geno; });
      B.lignes.forEach(function (ligne) {
        var J = [];
        ligne.colonnes.forEach(function (i) { r.fichiers[i].juveniles.forEach(function (j) { J.push(j.geno); }); });
        var ret = Rec.retenusParLocus(Rec.analyse(J, L)), nc = Rec.nombreComplets(ret), vraie = meres[ligne.femelle];
        if (nc === 1) {
          var g = Rec.genotypesComplets(ret)[0];
          if (egal(g, vraie)) ligne.juste++;
          else { ligne.faux++; ligne.fauxLocus[g.filter(function (x, l) { return x[0] !== vraie[l][0] || x[1] !== vraie[l][1]; }).length]++; }
        } else if (nc === 2) {
          if (Rec.genotypesComplets(ret).some(function (g) { return egal(g, vraie); })) ligne.deuxUnJuste++; else ligne.deuxZeroJuste++;
        } else ligne.nonResolu++;
      });
      B.fait++;
    }
    return B;
  }

  var api = { splitmix32: splitmix32, xoshiro128ss: xoshiro128ss, generateur: generateur, frequences: frequences,
              tirerAllele: tirerAllele, lireTableau: lireTableau, simuler: simuler,
              lignesBilan: lignesBilan, creerBilan: creerBilan, avancerBilan: avancerBilan };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Simulation = api;
})(this);
