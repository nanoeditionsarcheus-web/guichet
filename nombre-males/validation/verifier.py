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

def erreur(a, alleles, e, u):
    """Voisin de gauche (probabilité e/2) ou de droite (e/2) dans la suite triée des allèles connus ; aucun tirage si e = 0."""
    if not e > 0: return a
    v = u(); gauche = [x for x in alleles if x < a]; droite = [x for x in alleles if x > a]
    if v < e / 2: return max(gauche) if gauche else a
    if v < e: return min(droite) if droite else a
    return a

def possibles(j, f):
    if not j or not f: return None
    s = {y for x, y in (j, j[::-1]) if x in f}
    return frozenset(s) if s else None

def min_peres(juv, fem, kmax=20):
    """Nombre minimal de pères, par une recherche différente de celle de la page : juvéniles dans l'ordre du fichier ;
    pour chaque père et chaque locus, ensemble explicite des génotypes paternels (paires d'allèles) encore possibles."""
    C = [[possibles(g[l], fem[l]) for l in range(len(fem))] for g in juv]
    C = [c for c in C if any(c)]
    if not C: return 0
    def compatibles(cands, S):
        return {p for p in cands if p & S}
    def chercher(t, peres, k):
        if t == len(C): return True
        for i in range(min(len(peres) + 1, k)):
            nouveau = i == len(peres)
            base = [None] * len(fem) if nouveau else peres[i]
            ok, maj = True, []
            for l, S in enumerate(C[t]):
                if S is None: maj.append(base[l]); continue
                cands = base[l]
                if cands is None:
                    univers = set(S) | {a for c in C for a in (c[l] or ())}
                    cands = {frozenset((a, b)) for a in univers for b in univers}
                cands = compatibles(cands, S)
                if not cands: ok = False; break
                maj.append(cands)
            if not ok: continue
            essai = peres + [maj] if nouveau else peres[:i] + [maj] + peres[i + 1:]
            if chercher(t + 1, essai, k): return True
        return False
    for k in range(1, min(kmax, len(C)) + 1):
        if chercher(0, [], k): return k
    return None

def min_peres_brut(juv, fem):
    """Contrôle par force brute (petits nids) : toutes les répartitions des juvéniles en groupes."""
    C = [[possibles(g[l], fem[l]) for l in range(len(fem))] for g in juv]
    C = [c for c in C if any(c)]
    def faisable(groupe):
        for l in range(len(fem)):
            E = [c[l] for c in groupe if c[l]]
            univers = {a for S in E for a in S}
            if E and not any(all(S & {a, b} for S in E) for a in univers for b in univers): return False
        return True
    def partitions(xs):
        if not xs: yield []; return
        premier, reste = xs[0], xs[1:]
        for p in partitions(reste):
            yield [[premier]] + p
            for i in range(len(p)): yield p[:i] + [[premier] + p[i]] + p[i + 1:]
    return min((len(p) for p in partitions(C) if all(faisable(g) for g in p)), default=0)

def nid_artificiel(juv_nat, fem, freqs, k, u, e=0, sans_erreur=None):
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
        g, g0 = [], []
        for l in range(L):
            if not juv_nat[i][l] or not fem[l]: g.append(None); g0.append(None); continue
            a0 = fem[l][0] if u() < 0.5 else fem[l][1]; a = erreur(a0, freqs[l][0], e, u)
            mg = males[pere_de[i]][l]; b0 = mg[0] if u() < 0.5 else mg[1]; b = erreur(b0, freqs[l][0], e, u)
            g.append(sorted([a, b])); g0.append(sorted([a0, b0]))
        nid.append(g)
        if sans_erreur is not None: sans_erreur.append(g0)
    return nid

def validation(juv_nat, fem, N, seuil, kmax, kmax_sim, R, graine, ref=None, e=0, gerud=False):
    u = uniforme(graine); freqs = frequences(ref if ref is not None else juv_nat, len(fem)); nids = []
    for k in range(1, min(kmax_sim, len(juv_nat)) + 1):
        for r in range(R):
            J0 = []; J = nid_artificiel(juv_nat, fem, freqs, k, u, e, J0); g = int(u() * 4294967296)
            a = analyse(J, fem, N, seuil, kmax, g, ref)
            b, h = a["basse"], a["haute"]
            dans = b is not None and h is not None and k >= b and (k <= h or a["ouvert"])
            nids.append(dict(k=k, r=r, graine=g, basse=a["basse"], haute=a["haute"], ouvert=a["ouvert"], dans=dans,
                             gerud=min_peres(J, fem) if gerud else None, gerudVrai=min_peres(J0, fem) if gerud else None,
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
    # Référence de l'exemple : comptes d'allèles des 23 nids ; génotypes fictifs formés ici autrement que dans la page
    # (chaque allèle apparié avec lui-même, puis les restes impairs entre eux) : seuls les comptes importent.
    def genos_de_comptes(comptes):
        cols = []
        for c in comptes:
            g, restes = [], []
            for a, m in sorted(c.items(), key=lambda t: -int(t[0])):
                g += [[int(a), int(a)]] * (m // 2)
                if m % 2: restes.append(int(a))
            g += [sorted(restes[i:i + 2]) for i in range(0, len(restes), 2)]
            cols.append(g)
        n = max(len(c) for c in cols)
        return [[c[i] if i < len(c) else None for c in cols] for i in range(n)]
    ref_nids = genos_de_comptes(ex["reference"]["comptes"])
    # Cas d'essai synthétique : femelle homozygote, hétérozygote, inconnue ; juvéniles manquants, incompatibles ;
    # égalité de fréquence entre les deux allèles de la femelle.
    juv2 = [[[1, 2], [5, 6], [9, 9]], [[1, 1], [5, 6], [9, 10]], [[2, 3], None, [9, 11]], [[3, 4], [6, 7], None],
            [[1, 5], [5, 5], [10, 12]], [[1, 2], [6, 6], [9, 9]], [[1, 6], [5, 8], [11, 12]]]
    fem2 = [[1, 2], [5, 6], None]
    attendu = {"partitions": {f"{n},{k}": p(n, k) for n in range(1, 41) for k in range(1, n + 1)},
               "cas": [dict(nom="exemple", graine=g, N=N, seuil=0.05, kmax=kx, **analyse(juv, fem, N, 0.05, kx, g))
                       for g, N, kx in [(12345, 2000, 10), (2718281828, 500, 3)]] +
                      [dict(nom="exemple-nids", graine=12345, N=2000, seuil=0.05, kmax=10,
                            **analyse(juv, fem, 2000, 0.05, 10, 12345, ref=ref_nids))] +
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
    # Erreurs de génotypage et nombre minimal de pères dans le simulateur
    attendu["validation"].append(dict(nom="erreurs-gerud", reference="exemple", kmaxSim=4, R=3, graine=2024, N=200, seuil=0.05,
                                      kmax=10, erreur=0.02, nids=validation(juv, fem, 200, 0.05, 10, 4, 3, 2024, ref=ref_nids, e=0.02, gerud=True)))
    attendu["validation"].append(dict(nom="gerud-sans-erreur", reference="exemple", kmaxSim=5, R=2, graine=11, N=100, seuil=0.05,
                                      kmax=8, erreur=0, nids=validation(juv, fem, 100, 0.05, 8, 5, 2, 11, ref=ref_nids, gerud=True)))
    # Nombre minimal de pères : le nid de l'exemple, et 40 petits nids tirés au hasard, contrôlés par force brute
    import random
    rnd = random.Random(7); petits = []
    for _ in range(40):
        L = rnd.randint(1, 3); f = [sorted(rnd.sample(range(1, 7), 2)) if rnd.random() < .7 else [rnd.randint(1, 6)] * 2 for _ in range(L)]
        n = rnd.randint(3, 8); kv = rnd.randint(1, 4); P = [[sorted(rnd.choices(range(1, 7), k=2)) for _ in range(L)] for _ in range(kv)]
        J = [[None if rnd.random() < .1 else sorted([rnd.choice(f[l]), rnd.choice(P[rnd.randrange(kv)][l] if rnd.random() < .9 else [rnd.randint(1, 6)])]) for l in range(L)] for _ in range(n)]
        m, mb = min_peres(J, f), min_peres_brut(J, f)
        assert m == mb, (J, f, m, mb)
        petits.append(dict(juv=J, femelle=f, min=m))
    attendu["gerud"] = [dict(nom="exemple", juv=juv, femelle=fem, min=min_peres(juv, fem))] + petits
    print("nombre minimal de pères : exemple", attendu["gerud"][0]["min"], "; 40 petits nids, recherche = force brute :", [p["min"] for p in petits])
    (D / "attendu.json").write_text(json.dumps(attendu), encoding="utf8")
    for c in attendu["cas"]:
        print(c["nom"], c["graine"], "somme observée", c["total"], "locus", len(c["analyses"]), "intervalle", c["basse"], c["haute"],
              "ouvert" if c["ouvert"] else "", [(h["k"], h["ge"], h["le"]) for h in c["hyp"]])
    for v in attendu["validation"]:
        print("validation", v["nom"], [(x["k"], x["basse"], x["haute"], x["ouvert"], x["gerud"]) for x in v["nids"]])
