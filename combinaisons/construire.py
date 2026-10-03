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
FICHIERS = [("Blanche", "jeux/Blanche/Blanche-FLOCK.csv"), ("Grise", "donnees/exemple-maple-FLOCK.csv"),
            ("Rose", "jeux/Rose/Rose-FLOCK.csv"), ("Turquoise", "jeux/Turquoise/Turquoise-FLOCK.csv"),
            ("Inconnue 1", "jeux/Inc_1/Inc_1-FLOCK.csv"), ("Inconnue 2", "jeux/Inc_2/Inc_2-FLOCK.csv")]
loci = lire(FICHIERS[0][1])[0]
ex = {"label": "exemple de P. Duchesne — les six fichiers de tortues (un fichier par femelle), versions validées contre ses feuilles Maple",
      "loci": loci, "fichiers": [{"nom": n, "juveniles": [g for _, g in lire(f)[1]]} for n, f in FICHIERS]}
html = (d / "gabarit.html").read_text(encoding="utf8")
html = html.replace("/*__RECONSTITUTION__*/", rec).replace("/*__COMBINAISONS__*/", com).replace("/*__EXAMPLE__*/", json.dumps(ex, ensure_ascii=False, separators=(",", ":")))
(d / "index.html").write_text(html, encoding="utf8")
print({f["nom"]: len(f["juveniles"]) for f in ex["fichiers"]})
