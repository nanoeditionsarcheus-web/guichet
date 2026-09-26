"""Extrait d'une feuille Maple (.mw) les données et les résultats calculés par Maple.

Les résultats affichés par Maple sont enregistrés dans la feuille, encodés en base64 dans le
format interne de Maple. Ce script les décode sans Maple :
  - entiers : '"' (positif), puis un caractère donnant le nombre de chiffres décimaux (c − 33),
    puis des tranches de deux chiffres (c − 43), la plus basse d'abord ; un chiffre isolé
    (nombre impair de chiffres) vaut c − 33, placé en tête (unités) si son caractère est < 43,
    sinon en queue ;
  - noms : 'I' ou '%', longueur (c − 33), texte, 'G' (+ un objet d'attributs pour 'I') ;
  - suites '6', listes '7', ensembles '<' : effectif (c − 34) puis éléments ;
  - égalité '/', affectation '>', appel '-', membre de module '_' ;
  - 'F' : renvoi à un objet déjà lu (numérotés dans l'ordre de lecture) ; un caractère (c − 34)
    jusqu'à 'Z', sinon (numéro + 1) en hexadécimal, chiffre faible d'abord, chiffres
    intermédiaires c − 91 et dernier chiffre c − 107.
Contrôle : chaque allèle décodé doit appartenir aux allèles observés au locus (vérifié).
Usage : python3 decoder_maple.py RECONSTITUTION_FEMELLE_TOUS_LOC.mw
"""
import base64, html, json, re, sys

def lire_objet(b):
    st = {"i": 0, "n": 0, "objs": {}}
    def ch():
        c = b[st["i"]]; st["i"] += 1; return c
    def obj():
        idx = st["n"]; st["n"] += 1
        t = ch()
        if t == "F":
            st["n"] -= 1
            c = ord(ch())
            if c <= 90: k = c - 34
            else:
                v, sh = 0, 1
                while c <= 106: v += (c - 91) * sh; sh *= 16; c = ord(ch())
                k = v + (c - 107) * sh - 1
            return st["objs"][k]
        if t in '"#':
            nd = ord(ch()) - 33; digs = [ord(ch()) for _ in range((nd + 1) // 2)]
            if nd % 2 and digs[0] < 43:
                v, mul = digs[0] - 33, 10
                for c in digs[1:]: v += (c - 43) * mul; mul *= 100
            else:
                v, mul = 0, 1
                for k, c in enumerate(digs):
                    v += (c - 33 if (k == len(digs) - 1 and nd % 2) else c - 43) * mul; mul *= 100
            r = v if t == '"' else -v
        elif t in "I%":
            L = ord(ch()) - 33; nm = b[st["i"]:st["i"] + L]; st["i"] += L
            assert ch() == "G"
            if t == "I": obj()
            r = nm
        elif t in "67<":
            r = [obj() for _ in range(ord(ch()) - 34)]
        elif t in "/>":
            r = [obj(), obj()]
        elif t == "-":
            obj(); r = obj()          # appel de fonction : on garde les arguments
        elif t == "_":
            r = [obj(), obj()]
        else:
            raise ValueError("type inconnu %r" % t)
        st["objs"][idx] = r
        return r
    v = obj(); assert st["i"] == len(b)
    return v

src = open(sys.argv[1], encoding="utf8").read()
# données : data_6digits := [[ID, g1, …], …]
t = html.unescape(re.sub(r"<[^>]+>", "", src[src.index("data_6digits:="):]))
t = t[:t.index("]]") + 2]
rows = [[x.strip() for x in r.split(",")] for r in re.findall(r"\[([^\[\]]+)\]", t)]
juv = [{"id": r[0], "genos": [None if int(x) == 0 else [int(x) // 1000, int(x) % 1000] for x in r[1:]]} for r in rows]
# sorties Maple
outs = [base64.b64decode(re.sub(r"<[^>]+>", "", o).strip()).decode("latin1") for o in re.findall(r"<Output>(.*?)</Output>", src, re.S)]
dec = [lire_objet(o) for o in outs]
res = {}
for d in dec:
    a = d[0][0] if isinstance(d, list) and d and isinstance(d[0], list) and d[0] else None
    if isinstance(a, list) and len(a) == 2 and isinstance(a[0], str):   # affectation nom := valeur
        res[a[0]] = a[1]
loci = [{"locus": l[0], "max": l[1][1], "candidats": [{"geno": c[0], "nc": c[1]} for c in l[2]]} for l in res["compat_tous_loc"]]
# contrôle : allèles décodés ∈ allèles observés
for k, l in enumerate(loci):
    obs = {a for j in juv if j["genos"][k] for a in j["genos"][k]}
    assert all(a in obs for c in l["candidats"] for a in c["geno"]), l["locus"]
json.dump({"juveniles": juv}, open("donnees_maple.json", "w"), indent=0)
json.dump({"nb_juveniles": res["nb_juveniles"], "nb_locus": res["nb_locus"],
           "les_nb_alleles_locus": res["les_nb_alleles_locus"], "loci": loci},
          open("resultats_maple.json", "w"), indent=1)
print(len(juv), "juvéniles ;", res["nb_locus"], "locus ;", sum(len(l["candidats"]) for l in loci), "candidates décodées")
