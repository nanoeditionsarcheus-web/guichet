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
    u = uniforme(graine); L = len(freqs); parents = {}
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
    n = sum(len(f) for f in out["simulations"]["1"]["fichiers"])
    print(len(freqs), "locus ;", sum(len(f[0]) for f in freqs), "allèles ;", len(tableau), "colonnes ;", n, "juvéniles par simulation ;", len(out["simulations"]), "graines")
