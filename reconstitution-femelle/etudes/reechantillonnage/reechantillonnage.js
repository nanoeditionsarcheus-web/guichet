// Étude de rééchantillonnage : à partir d'un nid, on tire au hasard (sans remise) n juvéniles,
// R fois pour chaque n, et on reconstitue le génotype de la femelle avec le code validé
// (../../validation/js/reconstitution.js). On compte :
//  - la proportion de tirages qui donnent un seul génotype complet ;
//  - la proportion de tirages dont le génotype unique est identique à celui obtenu avec tout le nid ;
//  - le nombre médian de génotypes complets.
// Usage : node reechantillonnage.js [R]   (graine fixe : résultats reproductibles)
const R = require("../../validation/js/reconstitution.js"), fs = require("fs"), path = require("path");
const V = path.join(__dirname, "../../validation");
const NIDS = { Rose: "jeux/Rose/donnees_maple.json", Grise: "maple/donnees_maple.json", Turquoise: "jeux/Turquoise/donnees_maple.json" };
const REP = +process.argv[2] || 1000;
let s = 20260929; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;   // générateur fixe
function tirage(arr, n) { const a = arr.slice(); for (let i = 0; i < n; i++) { const j = i + Math.floor(rnd() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
const cle = comb => comb.map(g => g.join("/")).join(" ");
const out = {};
for (const [nid, f] of Object.entries(NIDS)) {
  const J = JSON.parse(fs.readFileSync(path.join(V, f), "utf8")).juveniles.map(j => j.genos);
  const L = J[0].length;
  const refRet = R.retenusParLocus(R.analyse(J, L));
  const ref = R.nombreComplets(refRet) === 1 ? cle(R.genotypesComplets(refRet)[0]) : null;
  const lignes = [];
  for (let n = 5; n < J.length; n += 5) {
    let unique = 0, identique = 0; const nb = [], locusUnique = Array(L).fill(0);
    for (let r = 0; r < REP; r++) {
      const sub = tirage(J, n), ret = R.retenusParLocus(R.analyse(sub, L)), k = R.nombreComplets(ret);
      nb.push(k); ret.forEach((l, i) => { if (l.length === 1) locusUnique[i]++; });
      if (k === 1) { unique++; if (ref && cle(R.genotypesComplets(ret)[0]) === ref) identique++; }
    }
    nb.sort((a, b) => a - b);
    lignes.push({ n, unique: unique / REP, identique: identique / REP, mediane: nb[Math.floor(REP / 2)], p90: nb[Math.floor(REP * 0.9)],
                  locusUnique: locusUnique.map(x => x / REP) });
  }
  out[nid] = { juveniles: J.length, reference: ref, lignes };
  console.log(`== ${nid} (${J.length} juvéniles) ; génotype du nid complet : ${ref}`);
  lignes.forEach(l => console.log(`n=${String(l.n).padStart(2)}  unique ${(100 * l.unique).toFixed(1).padStart(5)} %  identique au nid complet ${(100 * l.identique).toFixed(1).padStart(5)} %  médiane ${l.mediane}  90e centile ${l.p90}`));
}
fs.writeFileSync(path.join(__dirname, "resultats.json"), JSON.stringify({ repetitions: REP, graine: 20260929, nids: out }, null, 1));
