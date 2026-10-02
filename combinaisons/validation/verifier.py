"""Vérification indépendante (Python, sans le code JS) des 63 combinaisons de l'exemple :
pour chaque combinaison de nids, nombre de génotypes complets et génotype s'il est unique."""
import json, pathlib, itertools, re
d = pathlib.Path(__file__).resolve().parents[1]
html = (d / "index.html").read_text(encoding="utf8")
ex = json.loads(re.search(r"var EXAMPLE=(\{.*?\});\n", html, re.S).group(1))
F, L = ex["fichiers"], len(ex["loci"])
def reconstituer(juv):
    retenus = []
    for l in range(L):
        g = [j[l] for j in juv if j[l]]
        al = sorted({a for x in g for a in x})
        c = [(a, b) for i, a in enumerate(al) for b in al[i:]]
        if not c: return 0, None
        nc = {k: sum(1 for x in g if set(x) & set(k)) for k in c}
        m = max(nc.values()); best = [k for k in c if nc[k] == m]
        homo = [k for k in best if k[0] == k[1]]
        retenus.append(homo if len(best) > 1 and homo else best)
    n = 1
    for r in retenus: n *= len(r)
    return n, ([list(r[0]) for r in retenus] if n == 1 else None)
out = []
for k in range(1, len(F) + 1):
    for comb in itertools.combinations(range(len(F)), k):
        juv = [j for i in comb for j in F[i]["juveniles"]]
        n, g = reconstituer(juv)
        inc = None if g is None else sum(1 for j in juv if any(x and not (set(x) & set(gg)) for x, gg in zip(j, g)))
        out.append({"comb": list(comb), "n": len(juv), "nComplets": n, "geno": g, "incompatibles": inc})
json.dump(out, open(d / "validation/attendu.json", "w"))
print(len(out), "combinaisons ;", sum(1 for o in out if o["geno"]), "génotypes reconstitués")
