"""Vérification indépendante (Python, sans le code JS) de la génération de juvéniles artificiels.
Réimplante le générateur (splitmix32 + xoshiro128**), les fréquences alléliques, la lecture du tableau des
croisements et la simulation, dans le même ordre de tirages ; écrit attendu-simulation.json pour quelques
graines, que test-lib.js compare au code de la page, juvénile par juvénile."""
import json, pathlib, sys
M32 = 0xFFFFFFFF
def splitmix32(x):
    def suivant():
        nonlocal x
        x = (x + 0x9E3779B9) & M32; z = x
        z = ((z ^ (z >> 16)) * 0x85EBCA6B) & M32
        z = ((z ^ (z >> 13)) * 0xC2B2AE35) & M32
        return z ^ (z >> 16)
    return suivant
def xoshiro(s):
    s = list(s)
    rotl = lambda v, k: ((v << k) | (v >> (32 - k))) & M32
    def suivant():
        r = (rotl((s[1] * 5) & M32, 7) * 9) & M32; t = (s[1] << 9) & M32
        s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = rotl(s[3], 11)
        return r
    return suivant
def uniforme(graine):
    sm = splitmix32(graine); x = xoshiro([sm(), sm(), sm(), sm()])
    return lambda: x() / 4294967296
def frequences(genos, L):
    out = []
    for l in range(L):
        c = {}
        for g in genos:
            if g[l]:
                for a in g[l]: c[a] = c.get(a, 0) + 1
        al = sorted(c); out.append((al, [c[a] for a in al], sum(c.values())))
    return out
def tirer(f, u):
    al, co, tot = f; cible, cum = u * tot, 0
    for a, c in zip(al, co):
        cum += c
        if cible < cum: return a
    return al[-1]
def simuler(freqs, tableau, graine):
    u = graine if callable(graine) else uniforme(graine); L = len(freqs); parents = {}
    def parent(cle):
        if cle not in parents:
            g = []
            for l in range(L):
                a, b = tirer(freqs[l], u()), tirer(freqs[l], u()); g.append(sorted([a, b]))
            parents[cle] = g
        return parents[cle]
    for fem, cr in tableau:
        parent("F:" + fem)
        for m, n in cr: parent("M:" + m)
    fichiers = []
    for col, (fem, cr) in enumerate(tableau, 1):
        mere, juv = parents["F:" + fem], []
        for m, n in cr:
            pere = parents["M:" + m]
            for _ in range(n):
                g = []
                for l in range(L):
                    a = mere[l][0 if u() < 0.5 else 1]; b = pere[l][0 if u() < 0.5 else 1]; g.append(sorted([a, b]))
                juv.append({"id": f"C{col}-{len(juv) + 1:02d}", "mere": fem, "pere": m, "geno": g})
        fichiers.append(juv)
    return {"parents": parents, "fichiers": fichiers}
# Reconstitution (méthode du nombre de compatibilités, règle de l'homozygote), réimplantée ici sans le code JS :
# rend le nombre de génotypes candidats et, s'il y en a au plus deux, la liste de ces génotypes.
def reconstituer(J, L):
    import itertools
    retenus = []
    for l in range(L):
        g = [j[l] for j in J if j[l]]
        al = sorted({a for x in g for a in x})
        c = [(a, b) for i, a in enumerate(al) for b in al[i:]]
        if not c: retenus.append([None]); continue
        nc = {k: sum(1 for x in g if set(x) & set(k)) for k in c}
        m = max(nc.values()); best = [k for k in c if nc[k] == m]
        homo = [k for k in best if k[0] == k[1]]
        retenus.append(homo if len(best) > 1 and homo else best)
    n = 1
    for r in retenus: n *= len(r)
    return n, ([[list(x) for x in comb] for comb in itertools.product(*retenus)] if n <= 2 else [])
# Bilan de N itérations sur un même générateur (P. Duchesne, 17 octobre 2026)
def bilan(freqs, tableau, graine, N):
    u = uniforme(graine); L = len(freqs)
    lignes = [{"nom": f"C{i + 1}_{fem}", "femelle": fem, "colonnes": [i]} for i, (fem, cr) in enumerate(tableau)]
    vues = {}
    for i, (fem, cr) in enumerate(tableau): vues.setdefault(fem, []).append(i)
    for fem, cols in vues.items():
        if len(cols) > 1: lignes.append({"nom": fem + " : " + " + ".join(f"C{i + 1}" for i in cols), "femelle": fem, "colonnes": cols})
    for l in lignes: l.update(juste=0, faux=0, deuxUnJuste=0, deuxZeroJuste=0, nonResolu=0, fauxLocus=[0] * (L + 1))
    for _ in range(N):
        r = simuler(freqs, tableau, u)
        for l in lignes:
            J = [j["geno"] for i in l["colonnes"] for j in r["fichiers"][i]]
            vraie = r["parents"]["F:" + l["femelle"]]; n, tous = reconstituer(J, L)
            if n == 1:
                if tous[0] == vraie: l["juste"] += 1
                else: l["faux"] += 1; l["fauxLocus"][sum(1 for a, b in zip(tous[0], vraie) if a != b)] += 1
            elif n == 2:
                if vraie in tous: l["deuxUnJuste"] += 1
                else: l["deuxZeroJuste"] += 1
            else: l["nonResolu"] += 1
    return lignes
if __name__ == "__main__":
    d = pathlib.Path(__file__).resolve().parents[1]
    ex = json.loads((d / "validation/exemple.json").read_text(encoding="utf8"))
    L = len(ex["loci"]); pool = [g for f in ex["pool"] for g in f["genotypes"]]
    freqs = frequences(pool, L)
    tableau = [(c["femelle"], [(x["male"], x["n"]) for x in c["croisements"]]) for c in ex["tableau"]]
    out = {"frequences": [[al, co, tot] for al, co, tot in freqs], "simulations": {}}
    for graine in (1, 12345, 2718281828, 4294967295):
        out["simulations"][str(graine)] = simuler(freqs, tableau, graine)
    json.dump(out, open(d / "validation/attendu-simulation.json", "w"))
    B = {"graine": 12345, "iterations": 300, "lignes": bilan(freqs, tableau, 12345, 300)}
    json.dump(B, open(d / "validation/attendu-bilan.json", "w"))
    for l in B["lignes"]: print("  ", l["nom"].ljust(14), l["juste"], l["faux"], l["deuxUnJuste"], l["deuxZeroJuste"], l["nonResolu"], "| faux par nombre de locus :", l["fauxLocus"][1:])
    n = sum(len(f) for f in out["simulations"]["1"]["fichiers"])
    print(len(freqs), "locus ;", sum(len(f[0]) for f in freqs), "allèles ;", len(tableau), "colonnes ;", n, "juvéniles par simulation ;", len(out["simulations"]), "graines")
