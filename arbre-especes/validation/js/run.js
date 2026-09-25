// Applique nei-upgma.js aux 4 jeux (data/*.json) ; écrit js/<jeu>.dist.tsv et js/<jeu>.upgma.nwk
const fs = require("fs"), path = require("path"), NU = require("./nei-upgma.js");
const dir = path.join(__dirname, "..");
for (const ds of ["microbov", "nancycats", "jaguar", "crocrussula"]) {
  const J = JSON.parse(fs.readFileSync(path.join(dir, "data", ds + ".json"), "utf8"));
  const r = NU.analyse(J.pops, J.loci.length);
  // étiquettes P001, P002… (mêmes codes que les fichiers PHYLIP, voir phylip/<jeu>.codes.tsv)
  const code = i => "P" + String(i + 1).padStart(3, "0");
  r.tree = NU.upgma(r.names.map((_, i) => code(i)), r.D);
  let tsv = "\t" + r.names.join("\t") + "\n";
  r.D.forEach((row, i) => { tsv += r.names[i] + "\t" + row.map(x => x.toPrecision(17)).join("\t") + "\n"; });
  fs.writeFileSync(path.join(__dirname, ds + ".dist.tsv"), tsv);
  fs.writeFileSync(path.join(__dirname, ds + ".upgma.nwk"), NU.toNewick(r.tree, 12) + "\n");
  console.log(ds, "populations", r.names.length, "locus gardés", r.keep.length, "exclus", r.excluded.map(i => J.loci[i]).join(",") || "-");
}
