// Vérifie que reechantillonnerTaille (code de la page) reproduit exactement l'étude publiée
// (etudes/reechantillonnage/resultats.json, nid Rose : premier nid de l'étude, même générateur et même graine).
const R = require("./reconstitution.js"), fs = require("fs"), path = require("path");
const etude = JSON.parse(fs.readFileSync(path.join(__dirname, "../../etudes/reechantillonnage/resultats.json"), "utf8"));
const J = JSON.parse(fs.readFileSync(path.join(__dirname, "../jeux/Rose/donnees_maple.json"), "utf8")).juveniles.map(j => j.genos);
let s = etude.graine; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const ref = R.cleComplet(R.genotypesComplets(R.retenusParLocus(R.analyse(J, 11)))[0]);
// Note : l'étude mélange une copie neuve du nid à chaque tirage ; la page mélange la même copie
// d'un tirage à l'autre. Les deux sont des tirages uniformes sans remise ; pour une comparaison
// exacte, on reproduit ici le procédé de l'étude.
let ecarts = 0;
for (const l of etude.nids.Rose.lignes) {
  let u = 0, id = 0;
  for (let r = 0; r < etude.repetitions; r++) {
    const a = J.slice();
    for (let i = 0; i < l.n; i++) { const k = i + Math.floor(rnd() * (a.length - i)); [a[i], a[k]] = [a[k], a[i]]; }
    const ret = R.retenusParLocus(R.analyse(a.slice(0, l.n), 11));
    if (R.nombreComplets(ret) === 1) { u++; if (R.cleComplet(R.genotypesComplets(ret)[0]) === ref) id++; }
  }
  if (u / etude.repetitions !== l.unique || id / etude.repetitions !== l.identique) ecarts++;
}
console.log("reproduction de l'étude (Rose, " + etude.nids.Rose.lignes.length + " tailles) : écarts", ecarts);
// Fonction de la page : même générateur, comparaison statistique (tolérance de 4 points, 2000 tirages)
s = 12345; let maxdiff = 0;
for (const l of etude.nids.Rose.lignes.filter(l => l.n % 10 === 0)) {
  const r = R.reechantillonnerTaille(J, 11, l.n, 2000, ref, rnd);
  maxdiff = Math.max(maxdiff, Math.abs(r.unique - l.unique), Math.abs(r.identique - l.identique));
}
console.log("fonction de la page vs étude : écart maximal", (100 * maxdiff).toFixed(1), "points");
process.exit(ecarts === 0 && maxdiff < 0.04 ? 0 : 1);
