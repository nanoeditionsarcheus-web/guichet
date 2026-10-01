// Compare fisherRx2 à fisher.test de R : (1) les 10 paires de l'exemple ; (2) 300 tables aléatoires r × 2.
// Usage : node test-fisher.js   (Rscript doit être disponible ; R 4.3.3 utilisé pour la validation)
const C = require("./compatibilites.js"), fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const A = JSON.parse(fs.readFileSync(path.join(__dirname, "attendu.json"), "utf8"));
const R = path.join(__dirname, "../../reconstitution-femelle/validation/");
const F = { Grise: "maple/donnees_maple.json", Rose: "jeux/Rose/donnees_maple.json", Turquoise: "jeux/Turquoise/donnees_maple.json", Blanche: "jeux/Blanche/donnees_maple.json", "Inconnue 1": "jeux/Inc_1/donnees_maple.json" };
const groupes = A.groupes.map(n => ({ nom: n, juveniles: JSON.parse(fs.readFileSync(R + F[n], "utf8")).juveniles.map(j => j.genos) }));
const femelles = Object.entries(A.femelles).map(([n, g]) => ({ nom: "F" + n, geno: g }));
const cat = C.categoriesExclusives(femelles, groupes), P = C.pvaleursPaires(cat);
// tables aléatoires
let s = 99; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const tables = [];
for (let t = 0; t < 300; t++) { const r = 2 + Math.floor(rnd() * 5), a = [], b = [];
  for (let i = 0; i < r; i++) { a.push(Math.floor(rnd() * rnd() * 30)); b.push(Math.floor(rnd() * rnd() * 30)); }
  if (a.reduce((x, y) => x + y) === 0 || b.reduce((x, y) => x + y) === 0) { t--; continue; } tables.push([a, b]); }
// paires de l'exemple
const paires = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) paires.push([cat.comptes.map(r => r[i]), cat.comptes.map(r => r[j]), A.groupes[i] + " / " + A.groupes[j]]);
const toutes = paires.map(p => [p[0], p[1]]).concat(tables);
const f = path.join(os.tmpdir(), "tables-fisher.json"); fs.writeFileSync(f, JSON.stringify(toutes));
const rOut = cp.execFileSync("Rscript", ["-e", `suppressMessages(library(jsonlite)); T <- fromJSON("${f}", simplifyVector=FALSE);
  cat(sapply(T, function(x){ m <- cbind(unlist(x[[1]]), unlist(x[[2]])); m <- m[rowSums(m)>0,,drop=FALSE]; if (nrow(m)<2) 1 else fisher.test(m, workspace=2e8)$p.value }), sep="\\n")`]).toString().trim().split("\n").map(Number);
let maxRel = 0, maxAbs = 0;
toutes.forEach((t, k) => { const js = C.fisherRx2(t[0], t[1]), r = rOut[k];
  maxAbs = Math.max(maxAbs, Math.abs(js - r)); if (r > 1e-300) maxRel = Math.max(maxRel, Math.abs(js - r) / r); });
paires.forEach((p, k) => console.log(p[2].padEnd(24), "JS", C.fisherRx2(p[0], p[1]).toExponential(6), " R", rOut[k].toExponential(6)));
console.log(`catégories : ${cat.categories.join(" | ")}`);
console.log(`${toutes.length} tables comparées à R : écart absolu max ${maxAbs.toExponential(2)}, écart relatif max ${maxRel.toExponential(2)}`);
process.exit(maxRel < 1e-6 ? 0 : 1);
