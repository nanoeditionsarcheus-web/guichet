"""Vérification indépendante (Python, sans le code JS) de l'estimation du nombre de mâles géniteurs.
Réimplante l'allèle mâle, la statistique MD, le dénombrement et le tirage des partitions, la simulation et le test,
dans le même ordre de tirages que males.js (générateur repris de la vérification Python du simulateur).
Écrit attendu.json, que test-lib.js et test-page.js comparent au code de la page."""
import json, pathlib, sys
from functools import lru_cache
D = pathlib.Path(__file__).parent
sys.path.insert(0, str(D.parent.parent / "simulation-juveniles/validation"))
from verifier import uniforme, frequences, tirer  # noqa: E402

def allele_male(j, f, compte):
    if j is None: return None
    x, y = j
    possibles = set()
    if x in f: possibles.add(y)
    if y in f: possibles.add(x)
    if not possibles: return None
    if len(possibles) == 1: return possibles.pop()
    p, q = sorted(possibles)
    return q if compte.get(q, 0) > compte.get(p, 0) else p

def observer(juv, fem, ref=None):
    L = len(fem); compte = []; ref = juv if ref is None else ref
    for l in range(L):
        c = {}
        for g in ref:
            if g[l]:
                for a in g[l]: c[a] = c.get(a, 0) + 1
        compte.append(c)
    males = [[allele_male(g[l], fem[l], compte[l]) if fem[l] else None for g in juv] for l in range(L)]
    analyses = [l for l in range(L) if fem[l] and any(a is not None for a in males[l])]
    total = sum(len({a for a in males[l] if a is not None}) for l in analyses)
    return dict(n=len(juv), compte=compte, freqs=frequences(ref, L), males=males, analyses=analyses, total=total)

@lru_cache(maxsize=None)
def p(n, k):
    if n == 0 and k == 0: return 1
    if n <= 0 or k <= 0 or k > n: return 0
    return p(n - 1, k - 1) + p(n - k, k)

def partition(n, k, u):
    parts, decal = [], 0
    while k:
        if k == n: parts += [1 + decal] * k; break
        if k == 1: parts.append(n + decal); break
        if u() * p(n, k) < p(n - 1, k - 1): parts.append(1 + decal); n -= 1; k -= 1
        else: decal += 1; n -= k
    return parts[::-1]

def simuler(O, fem, k, u):
    n, A = O["n"], O["analyses"]
    parts = partition(n, k, u)
    males = [[(tirer(O["freqs"][l], u()), tirer(O["freqs"][l], u())) for l in A] for _ in range(k)]
    perm = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(u() * (i + 1)); perm[i], perm[j] = perm[j], perm[i]
    pere = [0] * n; c = 0
    for m, q in enumerate(parts):
        for _ in range(q): pere[perm[c]] = m; c += 1
    vus = [set() for _ in A]
    for i in range(n):
        for a, l in enumerate(A):
            if O["males"][l][i] is None: continue
            f = fem[l]; am = f[0] if u() < 0.5 else f[1]
            mg = males[pere[i]][a]; pm = mg[0] if u() < 0.5 else mg[1]
            vus[a].add(allele_male((am, pm), f, O["compte"][l]))
    return sum(len(v) for v in vus)

def analyse(juv, fem, N, seuil, kmax, graine, ref=None):
    O = observer(juv, fem, ref); u = uniforme(graine); hyp = []; retenue = None
    if O["analyses"]:
        for k in range(1, min(kmax, O["n"]) + 1):
            dist = {}
            for _ in range(N):
                t = simuler(O, fem, k, u); dist[t] = dist.get(t, 0) + 1
            ge = sum(c for t, c in dist.items() if t >= O["total"])
            hyp.append(dict(k=k, dist={str(t): c for t, c in sorted(dist.items())}, ge=ge))
            if ge / N >= seuil: retenue = k; break
    return dict(total=O["total"], analyses=O["analyses"], hyp=hyp, retenue=retenue)

def lire(chemin):
    rows = [l.split(";") for l in pathlib.Path(chemin).read_text(encoding="utf8").lstrip("﻿").strip().splitlines()]
    L = (len(rows[0]) - 1) // 2
    g = lambda r, k: None if not int(r[1+2*k] or 0) or not int(r[2+2*k] or 0) else [int(r[1+2*k]), int(r[2+2*k])]
    return [[g(r, k) for k in range(L)] for r in rows[1:]]

if __name__ == "__main__":
    ex = json.loads((D / "exemple.json").read_text(encoding="utf8"))
    juv, fem = ex["juveniles"], ex["femelle"]
    # Fréquences de référence pour l'essai : les fichiers Blanche, Rose et Turquoise de P. Duchesne (autres nids)
    R = D.parent.parent / "reconstitution-femelle/validation/jeux"
    ref = [g for n in ["Blanche", "Rose", "Turquoise"] for g in lire(R / n / (n + "-FLOCK.csv"))]
    # Cas d'essai synthétique : femelle homozygote, hétérozygote, inconnue ; juvéniles manquants, incompatibles ;
    # égalité de fréquence entre les deux allèles de la femelle.
    juv2 = [[[1, 2], [5, 6], [9, 9]], [[1, 1], [5, 6], [9, 10]], [[2, 3], None, [9, 11]], [[3, 4], [6, 7], None],
            [[1, 5], [5, 5], [10, 12]], [[1, 2], [6, 6], [9, 9]], [[1, 6], [5, 8], [11, 12]]]
    fem2 = [[1, 2], [5, 6], None]
    attendu = {"partitions": {f"{n},{k}": p(n, k) for n in range(1, 41) for k in range(1, n + 1)},
               "cas": [dict(nom="exemple", graine=g, N=N, seuil=0.05, kmax=kx, **analyse(juv, fem, N, 0.05, kx, g))
                       for g, N, kx in [(12345, 2000, 10), (2718281828, 500, 3)]] +
                      [dict(nom="exemple-reference", reference=["Blanche", "Rose", "Turquoise"], graine=99, N=1000, seuil=0.05, kmax=10,
                            **analyse(juv, fem, 1000, 0.05, 10, 99, ref=ref))] +
                      [dict(nom="synthetique", juv=juv2, femelle=fem2, graine=7, N=3000, seuil=0.05, kmax=7,
                            **analyse(juv2, fem2, 3000, 0.05, 7, 7))]}
    (D / "attendu.json").write_text(json.dumps(attendu), encoding="utf8")
    for c in attendu["cas"]:
        print(c["nom"], c["graine"], "somme observée", c["total"], "locus", len(c["analyses"]), "retenue", c["retenue"],
              [(h["k"], h["ge"]) for h in c["hyp"]])
