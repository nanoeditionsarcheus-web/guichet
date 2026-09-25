# Assemble index.html : gabarit.html + code validé (validation/js/nei-upgma.js) + exemple (nancycats)
import json, pathlib
d = pathlib.Path(__file__).parent
lib = (d / "validation/js/nei-upgma.js").read_text(encoding="utf8")
ex = json.loads((d / "validation/data/nancycats.json").read_text(encoding="utf8"))
example = {"label": "exemple nancycats (colonies de chats urbains ; adegenet 2.1.10, données de D. Pontier)",
           "loci": ex["loci"], "pops": ex["pops"]}
html = (d / "gabarit.html").read_text(encoding="utf8")
html = html.replace("/*__NEI_UPGMA__*/", lib).replace("/*__EXAMPLE__*/", json.dumps(example, separators=(",", ":")))
(d / "index.html").write_text(html, encoding="utf8")
