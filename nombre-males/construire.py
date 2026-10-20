# Assemble index.html : gabarit.html + code de calcul + exemple. Écrit aussi validation/exemple.json, lu par validation/verifier.py.
# Exemple : le nid 2021-05 (21 juvéniles) de l'exemple Maple de P. Duchesne (Grise, 41 juvéniles de trois nids), et la
# femelle reconstituée à partir des 41 juvéniles par la page « Reconstitution d'une femelle » (un seul génotype candidat).
import json, pathlib
d = pathlib.Path(__file__).parent
V = d.parent / "reconstitution-femelle/validation"
rows = [l.split(";") for l in (V / "donnees/exemple-maple-FLOCK.csv").read_text(encoding="utf8").lstrip("﻿").strip().splitlines()]
L = (len(rows[0]) - 1) // 2
g = lambda r, k: None if not int(r[1+2*k] or 0) or not int(r[2+2*k] or 0) else [int(r[1+2*k]), int(r[2+2*k])]
FEMELLE = [[268, 268], [196, 200], [264, 264], [244, 244], [167, 183], [158, 190], [192, 200], [196, 212], [103, 155], [235, 235], [270, 326]]
nid = [r for r in rows[1:] if r[0].startswith("202105")]   # un seul nid : 2021-05
ex = {"label": "exemple : nid 2021-05 du fichier Grise de P. Duchesne (21 juvéniles)",
      "loci": [rows[0][1+2*k] for k in range(L)], "ids": [r[0] for r in nid],
      "juveniles": [[g(r, k) for k in range(L)] for r in nid], "nomFemelle": "Grise, reconstituée à partir des 41 juvéniles du fichier", "femelle": FEMELLE}
# Référence de l'exemple (demande de P. Duchesne, 20 octobre 2026) : les fréquences alléliques des 23 nids de
# N. Tessier, publiées sous forme de comptes d'allèles seulement (aucun génotype individuel).
ex["reference"] = json.loads((d / "validation/reference-exemple.json").read_text(encoding="utf8"))
assert ex["reference"]["loci"] == ex["loci"]
(d / "validation/exemple.json").write_text(json.dumps(ex, ensure_ascii=False), encoding="utf8")
html = (d / "gabarit.html").read_text(encoding="utf8")
# Styles et lecture des fichiers (FLOCK ou allèles collés, classeurs Excel, dates) repris tels quels de la page « Agréger »
agr = (d.parent / "combinaisons/gabarit.html").read_text(encoding="utf8")
css = agr[agr.index("<style>") + 7:agr.index("</style>")]
lecture = agr[agr.index("function normA(v)"):agr.index("(function init(){")]
html = html.replace("/*__CSS__*/", css).replace("/*__LECTURE__*/", lecture)
for cle, f in [("RECONSTITUTION", "reconstitution-femelle/validation/js/reconstitution.js"),
               ("SIMULATION", "simulation-juveniles/validation/simulation.js"), ("MALES", "nombre-males/validation/males.js")]:
    html = html.replace("/*__" + cle + "__*/", (d.parent / f).read_text(encoding="utf8"))
html = html.replace("/*__EXAMPLE__*/", json.dumps(ex, ensure_ascii=False, separators=(",", ":")))
(d / "index.html").write_text(html, encoding="utf8")
print(len(ex["juveniles"]), "juvéniles,", L, "locus")
