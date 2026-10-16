# Assemble index.html : gabarit.html + code de la simulation + exemple (pool et tableau des croisements).
# Écrit aussi validation/exemple.json, lu par validation/verifier.py.
import json, pathlib
d = pathlib.Path(__file__).parent
V = d.parent / "reconstitution-femelle/validation"
def lire(csv):
    rows = [l.split(";") for l in (V / csv).read_text(encoding="utf8").lstrip("﻿").strip().splitlines()]
    nl = (len(rows[0]) - 1) // 2
    g = lambda r, k: None if int(r[1+2*k] or 0) == 0 or int(r[2+2*k] or 0) == 0 else [int(r[1+2*k]), int(r[2+2*k])]
    return [rows[0][1+2*k] for k in range(nl)], [[g(r, k) for k in range(nl)] for r in rows[1:]]
POOL = [("Blanche", "jeux/Blanche/Blanche-FLOCK.csv"), ("Grise", "donnees/exemple-maple-FLOCK.csv"),
        ("Rose", "jeux/Rose/Rose-FLOCK.csv"), ("Turquoise", "jeux/Turquoise/Turquoise-FLOCK.csv"),
        ("Inconnue 1", "jeux/Inc_1/Inc_1-FLOCK.csv"), ("Inconnue 2", "jeux/Inc_2/Inc_2-FLOCK.csv")]
# Tableau des croisements donné en exemple par P. Duchesne (16 octobre 2026), tel qu'il se lit dans son classeur.
TABLEAU = [["F1", "# juvéniles", "F2", "# juvéniles", "F3", "# juvéniles", "F2", "# juvéniles"],
           ["M1", "20", "M1", "10", "M2", "10", "M4", "40"],
           ["M2", "20", "M3", "30", "M3", "10", "", ""],
           ["", "", "", "", "M4", "20", "", ""]]
loci = lire(POOL[0][1])[0]
ex = {"label": "exemple : pool des six fichiers de tortues de P. Duchesne (versions validées contre ses feuilles Maple), tableau des croisements de P. Duchesne",
      "loci": loci, "pool": [{"nom": n, "genotypes": lire(f)[1]} for n, f in POOL], "lignesTableau": TABLEAU,
      "tableau": None}
# Tableau lu comme le fait la page (colonnes par paires), pour verifier.py
t = []
for j in range(0, len(TABLEAU[0]), 2):
    cr = [{"male": r[j], "n": int(r[j+1])} for r in TABLEAU[1:] if r[j] and r[j+1] and int(r[j+1]) > 0]
    if TABLEAU[0][j] and cr: t.append({"colonne": len(t) + 1, "femelle": TABLEAU[0][j], "croisements": cr})
ex["tableau"] = t
(d / "validation/exemple.json").write_text(json.dumps(ex, ensure_ascii=False), encoding="utf8")
lib = (d / "validation/simulation.js").read_text(encoding="utf8")
html = (d / "gabarit.html").read_text(encoding="utf8")
# Styles et lecture des fichiers (FLOCK ou allèles collés, classeurs Excel, dates) repris tels quels de la page « Agréger »
agr = (d.parent / "combinaisons/gabarit.html").read_text(encoding="utf8")
css = agr[agr.index("<style>") + 7:agr.index("</style>")]
lecture = agr[agr.index("function normA(v)"):agr.index("(function init(){")]
html = html.replace("/*__CSS__*/", css).replace("/*__LECTURE__*/", lecture)
html = html.replace("/*__SIMULATION__*/", lib).replace("/*__EXAMPLE__*/", json.dumps({k: v for k, v in ex.items() if k != "tableau"}, ensure_ascii=False, separators=(",", ":")))
(d / "index.html").write_text(html, encoding="utf8")
print({p["nom"]: len(p["genotypes"]) for p in ex["pool"]}, "|", [(c["femelle"], sum(x["n"] for x in c["croisements"])) for c in t])
