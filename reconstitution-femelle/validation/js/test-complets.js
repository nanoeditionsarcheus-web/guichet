// Test de la règle des génotypes complets sur l'exemple fictif de P. Duchesne (message du 29 septembre 2026).
const R = require("./reconstitution.js");
const loc = s => ({ best: s.split(" ").map(g => ({ geno: g.split("/").map(Number) })) });
const res = [loc("264/268"), loc("280/282 264/268"), loc("258/258 258/260 258/262"), loc("262/266 272/276")];
const attendu = [   // liste donnée par P. Duchesne (l'ordre n'importe pas)
  "264/268 280/282 258/258 262/266", "264/268 264/268 258/258 262/266",
  "264/268 280/282 258/258 272/276", "264/268 264/268 258/258 272/276"];
const obtenu = R.genotypesComplets(R.retenusParLocus(res)).map(c => c.map(g => g.join("/")).join(" "));
const ok = obtenu.length === attendu.length && attendu.every(a => obtenu.includes(a));
console.log(obtenu.join("\n"));
console.log("exemple de P. Duchesne :", ok ? "identique (4 génotypes complets)" : "DIFFÉRENT");
process.exit(ok ? 0 : 1);
