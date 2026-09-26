// Compare reconstitution.js aux résultats de Maple décodés (maple/resultats_maple.json).
// Entrée du JS : le fichier en format FLOCK (donnees/exemple-maple-FLOCK.csv), produit par flock-convert.
const fs = require("fs"), path = require("path"), R = require("./reconstitution.js");
const V = path.join(__dirname, "..");
const lines = fs.readFileSync(path.join(V, "donnees/exemple-maple-FLOCK.csv"), "utf8").replace(/^﻿/, "").trim().split(/\r?\n/).map(l => l.split(";"));
const nLoci = Math.floor((lines[0].length - 1) / 2);
const al = s => { const n = parseInt(s, 10); return isNaN(n) || n === 0 ? null : n; };
const juv = lines.slice(1).map(r => Array.from({ length: nLoci }, (_, k) => { const a = al(r[1 + 2 * k]), b = al(r[2 + 2 * k]); return a == null || b == null ? null : [a, b]; }));
const M = JSON.parse(fs.readFileSync(path.join(V, "maple/resultats_maple.json"), "utf8"));
const res = R.analyse(juv, nLoci);
let nCand = 0, diffs = 0;
const rep = [];
res.forEach((r, k) => {
  const m = M.loci[k], key = g => g[0] + "/" + g[1];
  const js = new Map(r.candidates.map(c => [key(c.geno), c.nc])), mp = new Map(m.candidats.map(c => [key(c.geno), c.nc]));
  let d = (r.nTyped !== m.max) ? 1 : 0;
  if (js.size !== mp.size) d++;
  for (const [g, n] of mp) { nCand++; if (js.get(g) !== n) d++; }
  diffs += d;
  rep.push({ locus: m.locus, juveniles_types: r.nTyped, max_maple: m.max, candidates: mp.size, ecarts: d,
             meilleures: r.best.map(c => key(c.geno)).join(" "), nc_max: r.maxNC, nc_suivant: r.secondNC,
             alleles_js: r.nAlleles, alleles_maple: M.les_nb_alleles_locus[k] });
});
console.table(rep);
console.log(`juvéniles ${juv.length} (Maple ${M.nb_juveniles}) ; locus ${nLoci} (Maple ${M.nb_locus}) ; candidates comparées ${nCand} ; écarts ${diffs}`);
fs.writeFileSync(path.join(V, "resultats.json"), JSON.stringify(rep, null, 1));
process.exit(diffs ? 1 : 0);
