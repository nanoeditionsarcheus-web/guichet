"""Vérification indépendante (Python, sans le code JS).
1) Les 63 combinaisons de l'exemple (six fichiers, un par femelle) : nombre de génotypes complets, génotype
   s'il est unique, incompatibles, et décision « retenu » avec le plafond par défaut de 10 %.
2) Les groupes de fichiers (plus grande combinaison retenue contenant chaque fichier) : exemple aux plafonds
   de 10 % et de 20 %, et essai à 11 fichiers, un par nid de Grise, Rose et Turquoise (identifiants AAAANN…),
   au plafond de 10 %. Cet essai découpe des fichiers en nids pour la seule vérification.
Règle (P. Duchesne, 9 octobre 2026) : un génotype unique est retenu si le pourcentage d'incompatibles ne
dépasse le plafond ni au total ni dans aucun fichier de la combinaison. Les combinaisons à exactement deux
génotypes complets donnent leurs deux génotypes, avec leurs incompatibles fichier par fichier."""
import json, pathlib, itertools, re
from fractions import Fraction
d = pathlib.Path(__file__).resolve().parents[1]
html = (d / "index.html").read_text(encoding="utf8")
ex = json.loads(re.search(r"var EXAMPLE=(\{.*?\});\n", html, re.S).group(1))
L = len(ex["loci"])
def reconstituer(juv):
    retenus = []
    for l in range(L):
        g = [j[l] for j in juv if j[l]]
        al = sorted({a for x in g for a in x})
        c = [(a, b) for i, a in enumerate(al) for b in al[i:]]
        if not c: retenus.append([None]); continue          # locus sans donnée : inconnu
        nc = {k: sum(1 for x in g if set(x) & set(k)) for k in c}
        m = max(nc.values()); best = [k for k in c if nc[k] == m]
        homo = [k for k in best if k[0] == k[1]]
        retenus.append(homo if len(best) > 1 and homo else best)
    n = 1
    for r in retenus: n *= len(r)
    tous = [[list(g) if g else None for g in c] for c in itertools.product(*retenus)] if n <= 2 else []
    return n, (tous[0] if n == 1 else None), tous
def incompatible(j, g): return any(x and gg and not (set(x) & set(gg)) for x, gg in zip(j, g))
def combinaisons(F, plafond):
    out = []
    for k in range(1, len(F) + 1):
        for comb in itertools.combinations(range(len(F)), k):
            juv = [j for i in comb for j in F[i]["juveniles"]]
            n, g, tous = reconstituer(juv)
            par = lambda geno: [sum(1 for j in F[i]["juveniles"] if incompatible(j, geno)) for i in comb]
            sous = lambda inc: 100 * sum(inc) / len(juv) <= plafond + 1e-9 and all(100 * x / len(F[i]["juveniles"]) <= plafond + 1e-9 for x, i in zip(inc, comb))
            inc = None if g is None else par(g)
            o = {"comb": list(comb), "n": len(juv), "nComplets": n, "geno": g,
                 "incompatibles": None if inc is None else sum(inc), "incParFichier": inc,
                 "retenu": g is not None and sous(inc)}
            if n == 2: o["deux"] = [{"geno": t, "incParFichier": par(t), "sousPlafond": sous(par(t))} for t in tous]
            out.append(o)
    return out
def groupes(res, n):
    choix = []
    for f in range(n):
        r = [o for o in res if o["retenu"] and f in o["comb"]]
        m = max((len(o["comb"]) for o in r), default=0)
        choix.append(sorted(tuple(o["comb"]) for o in r if len(o["comb"]) == m))
    gr = sorted({c for ch in choix for c in ch})
    return [{"comb": list(c), "choisiPar": [f for f in range(n) if c in choix[f]],
             "coherent": all(choix[f] == [c] for f in c)} for c in gr] + \
           [{"sans": [f for f in range(n) if not choix[f]]}]
F = ex["fichiers"]
res = combinaisons(F, 10)
json.dump(res, open(d / "validation/attendu.json", "w"))
print(len(res), "combinaisons ;", sum(1 for o in res if o["geno"]), "génotypes uniques ;", sum(1 for o in res if o["retenu"]), "retenus (plafond 10 %)")
# essai : un fichier par nid
src = d.parent / "reconstitution-femelle/validation"
nids = {}
for nom, chemin in [("Grise", "donnees/exemple-maple-FLOCK.csv"), ("Rose", "jeux/Rose/Rose-FLOCK.csv"), ("Turquoise", "jeux/Turquoise/Turquoise-FLOCK.csv")]:
    for ligne in (src / chemin).read_text(encoding="utf-8-sig").strip().splitlines()[1:]:
        c = ligne.split(";"); a = [int(x or 0) for x in c[1:1 + 2 * L]]
        nids.setdefault(nom + "-" + c[0][:6], []).append([[a[2 * k], a[2 * k + 1]] if a[2 * k] and a[2 * k + 1] else None for k in range(L)])
essai = [{"nom": k, "juveniles": v} for k, v in nids.items()]
G = {"exemple-10": groupes(res, len(F)), "exemple-20": groupes(combinaisons(F, 20), len(F)),
     "essai": {"loci": ex["loci"], "fichiers": essai, "groupes": groupes(combinaisons(essai, 10), len(essai))}}
json.dump(G, open(d / "validation/attendu-groupes.json", "w"))
for k in ("exemple-10", "exemple-20"):
    print(k, [[F[i]["nom"] for i in g["comb"]] for g in G[k][:-1]], "sans :", [F[i]["nom"] for i in G[k][-1]["sans"]])
print("essai", len(essai), "fichiers :")
for g in G["essai"]["groupes"][:-1]:
    print("  ", " + ".join(essai[i]["nom"] for i in g["comb"]), "| choisi par", [essai[i]["nom"] for i in g["choisiPar"]], "cohérent" if g["coherent"] else "NON COHÉRENT")
print("   sans :", [essai[i]["nom"] for i in G["essai"]["groupes"][-1]["sans"]])

# 3) Présence dans la banque de femelles (P. Duchesne, 9 octobre 2026), exemple au plafond de 20 %.
# Deux fichiers de banque d'essai, construits ici à partir des génotypes de l'exemple :
#  - banque-essai-1.csv : Grise identique mais deux locus manquants ; Rose avec un allèle changé à tm64 ;
#  - banque-essai-2.csv : génotype A de Blanche (cas de deux génotypes complets).
# Règle : présent si identique à une femelle à chaque locus où les deux sont connus (au moins un locus) ;
# sinon, femelle la plus proche : la plus faible proportion de locus différents, puis le plus de locus comparés.
res20 = combinaisons(F, 20)
def nom(c): return " + ".join(F[i]["nom"] for i in c)
def seul(nm): return next(o for o in res20 if [F[i]["nom"] for i in o["comb"]] == [nm])
grise, rose, blanche = seul("Grise")["geno"], seul("Rose")["geno"], seul("Blanche")["deux"][0]["geno"]
b1 = [("Essai_Grise_2_manquants", [None, None] + grise[2:]), ("Essai_Rose_tm64_change", rose[:-1] + [[rose[-1][0], 999]])]
b2 = [("Essai_Blanche_A", blanche)]
def ecrire(chemin, lignes):
    with open(chemin, "w", encoding="utf-8") as f:
        f.write("ID;" + "".join(l + ";;" for l in ex["loci"]) + "\n")
        for n, g in lignes: f.write(n + ";" + ";".join(f"{x[0]};{x[1]}" if x else "0;0" for x in g) + "\n")
ecrire(d / "validation/banque-essai-1.csv", b1); ecrire(d / "validation/banque-essai-2.csv", b2)
banque = [{"nom": n, "geno": g} for n, g in b1 + b2]
def presence(g):
    pres, proche = [], None
    for i, f in enumerate(banque):
        c = [(x, y) for x, y in zip(g, f["geno"]) if x and y]
        diff = sum(1 for x, y in c if sorted(x) != sorted(y))
        if c and not diff: pres.append([i, len(c)])
        if c and (proche is None or (Fraction(diff, len(c)), -len(c)) < (Fraction(proche[1], proche[2]), -proche[2])): proche = [i, diff, len(c)]
    return {"present": bool(pres), "presentes": pres, "proche": proche}
liste, vus = [], {}
for o in res20:
    if o["retenu"]:
        k = json.dumps(o["geno"])
        if k not in vus: vus[k] = len(vus) + 1; liste.append({"type": "retenu", "num": vus[k], "combs": [], "geno": o["geno"]})
        liste[vus[k] - 1]["combs"].append(o["comb"])
for o in res20:
    for i, x in enumerate(o.get("deux", [])):
        if x["sousPlafond"]: liste.append({"type": "deux", "lettre": "AB"[i], "combs": [o["comb"]], "geno": x["geno"]})
for x in liste: x["banque"] = presence(x["geno"])
json.dump(liste, open(d / "validation/attendu-banque.json", "w"))
print("banque (plafond 20 %) :")
for x in liste:
    p = x["banque"]
    print("  ", x["type"], x.get("num", x.get("lettre")), " ; ".join(nom(c) for c in x["combs"])[:60], "→",
          ("présent : " + ", ".join(banque[i]["nom"] + f" ({n} locus)" for i, n in p["presentes"])) if p["present"] else
          ("absent ; plus proche : " + banque[p["proche"][0]]["nom"] + f" ({p['proche'][1]} diff. / {p['proche'][2]})" if p["proche"] else "absent"))
