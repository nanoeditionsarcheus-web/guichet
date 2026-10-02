# Assemble index.html : gabarit.html + code validé (reconstitution, combinaisons) + exemple
import json, pathlib
d = pathlib.Path(__file__).parent
V = d.parent / "reconstitution-femelle/validation"
rec = (V / "js/reconstitution.js").read_text(encoding="utf8")
com = (d / "validation/combinaisons.js").read_text(encoding="utf8")
def lire(csv):
    rows = [l.split(";") for l in (V / csv).read_text(encoding="utf8").lstrip("﻿").strip().splitlines()]
    nl = (len(rows[0]) - 1) // 2
    g = lambda r, k: None if int(r[1+2*k] or 0) == 0 or int(r[2+2*k] or 0) == 0 else [int(r[1+2*k]), int(r[2+2*k])]
    return [rows[0][1+2*k] for k in range(nl)], [(r[0], [g(r, k) for k in range(nl)]) for r in rows[1:]]
loci, grise = lire("donnees/exemple-maple-FLOCK.csv")
_, turq = lire("jeux/Turquoise/Turquoise-FLOCK.csv")
nids = {}
for jid, ge in grise + turq:
    nids.setdefault("nid " + jid[:6], []).append(ge)
ordre = ["nid 201707", "nid 201808", "nid 202105", "nid 201506", "nid 201605", "nid 201905"]
ex = {"label": "exemple de P. Duchesne — nids de tortues des groupes Grise (201707, 201808, 202105) et Turquoise (201506, 201605, 201905)",
      "loci": loci, "fichiers": [{"nom": n, "juveniles": nids[n]} for n in ordre]}
html = (d / "gabarit.html").read_text(encoding="utf8")
html = html.replace("/*__RECONSTITUTION__*/", rec).replace("/*__COMBINAISONS__*/", com).replace("/*__EXAMPLE__*/", json.dumps(ex, ensure_ascii=False, separators=(",", ":")))
(d / "index.html").write_text(html, encoding="utf8")
print({n: len(nids[n]) for n in ordre})
