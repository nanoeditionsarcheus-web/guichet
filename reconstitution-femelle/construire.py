# Assemble index.html : gabarit.html + code validé (validation/js/reconstitution.js) + jeu d'exemple
import json, pathlib
d = pathlib.Path(__file__).parent
lib = (d / "validation/js/reconstitution.js").read_text(encoding="utf8")
rows = [l.split(";") for l in (d / "validation/donnees/exemple-maple-FLOCK.csv").read_text(encoding="utf8").lstrip("﻿").strip().splitlines()]
nl = (len(rows[0]) - 1) // 2
loci = [rows[0][1 + 2 * k] for k in range(nl)]
def g(r, k):
    a, b = int(r[1 + 2 * k] or 0), int(r[2 + 2 * k] or 0)
    return None if a == 0 or b == 0 else [a, b]
example = {"label": "jeu d'exemple fourni par Pierre Duchesne (feuille Maple RECONSTITUTION_FEMELLE_TOUS_LOC)",
           "loci": loci, "juveniles": [{"id": r[0], "genos": [g(r, k) for k in range(nl)]} for r in rows[1:]]}
html = (d / "gabarit.html").read_text(encoding="utf8")
html = html.replace("/*__RECONSTITUTION__*/", lib).replace("/*__EXAMPLE__*/", json.dumps(example, ensure_ascii=False, separators=(",", ":")))
(d / "index.html").write_text(html, encoding="utf8")
