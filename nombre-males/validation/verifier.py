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
    """Hypothèses 1, 2, … : intervalle [basse, haute] des k que ni la p-valeur à droite (≥ seuil) ni celle à gauche
    (> seuil) ne rejettent ; on s'arrête dès que, la borne inférieure trouvée, la p-valeur à gauche tombe au seuil."""
    O = observer(juv, fem, ref); u = uniforme(graine); hyp = []; basse = haute = None; ouvert = False
    K = min(kmax, O["n"])
    if O["analyses"]:
        for k in range(1, K + 1):
            dist = {}
            for _ in range(N):
                t = simuler(O, fem, k, u); dist[t] = dist.get(t, 0) + 1
            ge = sum(c for t, c in dist.items() if t >= O["total"])
            le = sum(c for t, c in dist.items() if t <= O["total"])
            hyp.append(dict(k=k, dist={str(t): c for t, c in sorted(dist.items())}, ge=ge, le=le))
            droite, gauche = ge / N >= seuil, le / N > seuil
            if droite and basse is None: basse = k
            if basse is not None and not gauche: break
            if droite and gauche: haute = k
            if k == K: ouvert = basse is not None and droite and gauche and K < O["n"]  # pas plus de mâles que de juvéniles
    return dict(total=O["total"], analyses=O["analyses"], hyp=hyp, basse=basse, haute=haute, ouvert=ouvert)

def nid_artificiel(juv_nat, fem, freqs, k, u):
    n, L = len(juv_nat), len(fem)
    males = [[(tirer(freqs[l], u()), tirer(freqs[l], u())) if fem[l] else None for l in range(L)] for _ in range(k)]
    parts = partition(n, k, u)
    perm = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(u() * (i + 1)); perm[i], perm[j] = perm[j], perm[i]
    pere = [m for m, q in enumerate(parts) for _ in range(q)]
    pere_de = [0] * n
    for pos, i in enumerate(perm): pere_de[i] = pere[pos]
    nid = []
    for i in range(n):
        g = []
        for l in range(L):
            if not juv_nat[i][l] or not fem[l]: g.append(None); continue
            a = fem[l][0] if u() < 0.5 else fem[l][1]
            mg = males[pere_de[i]][l]; b = mg[0] if u() < 0.5 else mg[1]
            g.append(sorted([a, b]))
        nid.append(g)
    return nid

def validation(juv_nat, fem, N, seuil, kmax, kmax_sim, R, graine, ref=None):
    u = uniforme(graine); freqs = frequences(ref if ref is not None else juv_nat, len(fem)); nids = []
    for k in range(1, min(kmax_sim, len(juv_nat)) + 1):
        for r in range(R):
            J = nid_artificiel(juv_nat, fem, freqs, k, u); g = int(u() * 4294967296)
            a = analyse(J, fem, N, seuil, kmax, g, ref)
            nids.append(dict(k=k, r=r, graine=g, basse=a["basse"], haute=a["haute"], ouvert=a["ouvert"],
                             hyp=[dict(k=h["k"], ge=h["ge"], le=h["le"]) for h in a["hyp"]]))
    return nids

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
    # Simulateur de validation : exemple sans référence (3 mâles au plus, 2 nids chacun) et avec référence ; cas synthétique
    attendu["validation"] = [dict(nom="exemple", kmaxSim=3, R=2, graine=4321, N=400, seuil=0.05, kmax=8,
                                  nids=validation(juv, fem, 400, 0.05, 8, 3, 2, 4321)),
                             dict(nom="exemple-reference", reference=["Blanche", "Rose", "Turquoise"], kmaxSim=4, R=1, graine=77, N=300,
                                  seuil=0.05, kmax=10, nids=validation(juv, fem, 300, 0.05, 10, 4, 1, 77, ref=ref)),
                             dict(nom="synthetique", kmaxSim=3, R=3, graine=5, N=500, seuil=0.05, kmax=7,
                                  nids=validation(juv2, fem2, 500, 0.05, 7, 3, 3, 5))]
    (D / "attendu.json").write_text(json.dumps(attendu), encoding="utf8")
    for c in attendu["cas"]:
        print(c["nom"], c["graine"], "somme observée", c["total"], "locus", len(c["analyses"]), "intervalle", c["basse"], c["haute"],
              "ouvert" if c["ouvert"] else "", [(h["k"], h["ge"], h["le"]) for h in c["hyp"]])
    for v in attendu["validation"]:
        print("validation", v["nom"], [(x["k"], x["basse"], x["haute"], x["ouvert"]) for x in v["nids"]])
