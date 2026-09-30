"""Vérification indépendante (Python, sans le code JS) du tableau des compatibilités sur l'exemple
de P. Duchesne : F = Grise, Rose, Turquoise ; J = Grise, Rose, Turquoise, Blanche ; testé = Inconnue 1.
Les femelles sont reprises de la reconstitution validée (un seul génotype complet par nid)."""
import json, pathlib, sys
V = pathlib.Path(__file__).resolve().parents[2] / "reconstitution-femelle/validation"
F = {"Grise": "maple/donnees_maple.json", "Rose": "jeux/Rose/donnees_maple.json", "Turquoise": "jeux/Turquoise/donnees_maple.json",
     "Blanche": "jeux/Blanche/donnees_maple.json", "Inconnue 1": "jeux/Inc_1/donnees_maple.json"}
J = {n: [j["genos"] for j in json.loads((V / f).read_text())["juveniles"]] for n, f in F.items()}
def femelle(juv):   # reconstitution : NC maximal ; homozygote prioritaire ; doit être unique
    out = []
    for l in range(len(juv[0])):
        g = [x for x in (j[l] for j in juv) if x]
        al = sorted({a for x in g for a in x})
        c = [(a, b) for i, a in enumerate(al) for b in al[i:]]
        nc = {k: sum(1 for x in g if set(x) & set(k)) for k in c}
        m = max(nc.values()); best = [k for k in c if nc[k] == m]
        homo = [k for k in best if k[0] == k[1]]
        keep = homo if len(best) > 1 and homo else best
        if len(keep) != 1: return None
        out.append(keep[0])
    return out
fem = {n: femelle(J[n]) for n in ["Grise", "Rose", "Turquoise"]}
def compat(j, f):
    ex = [(a, b) for a, b in zip(j, f) if a and b]
    return len(ex) > 0 and all(set(a) & set(b) for a, b in ex)
groupes = ["Grise", "Rose", "Turquoise", "Blanche", "Inconnue 1"]
tab = {fn: [sum(1 for j in J[g] if compat(j, f)) for g in groupes] for fn, f in fem.items()}
aucune = [sum(1 for j in J[g] if not any(compat(j, f) for f in fem.values())) for g in groupes]
res = {"aucune": aucune, "groupes": groupes, "effectifs": [len(J[g]) for g in groupes], "femelles": {k: [list(x) for x in v] for k, v in fem.items()}, "comptes": tab}
json.dump(res, open(pathlib.Path(__file__).parent / "attendu.json", "w"), indent=1, ensure_ascii=False)
print("groupes :", groupes, "effectifs :", res["effectifs"])
for fn, row in tab.items(): print(f"{fn:10}", row)
print(f"{'Aucune':10}", aucune)
