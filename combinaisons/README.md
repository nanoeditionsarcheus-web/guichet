# Agréger les juvéniles d'une même femelle

(Dossier `combinaisons/` ; ancien titre : « Combinaisons de nids ».)

Page autonome du guichet, proposée par Pierre Duchesne. L'unité d'analyse est la femelle : chaque
fichier contient les juvéniles d'une seule femelle (un ou plusieurs nids) et n'est jamais scindé en
nids. Pour chaque combinaison de 1, 2, 3… fichiers, la page fusionne les fichiers et reconstitue la
femelle avec le code validé de `../reconstitution-femelle`, afin de repérer les fichiers qui
pourraient provenir d'une même femelle.

- Sortie : une ligne par combinaison, avec le nombre de juvéniles et le nombre (et le pourcentage) de
  juvéniles incompatibles avec le génotype reconstitué, puis :
  - « génotype reconstitué » : un seul génotype complet et un pourcentage d'incompatibles au plus égal
    au plafond ; le génotype est affiché avec un numéro commun aux combinaisons qui le donnent ;
  - « rejeté » : un seul génotype complet, mais trop d'incompatibles (femelle probablement factice) ;
  - « non » : plusieurs génotypes complets, ou aucun.
  Un tableau récapitule les génotypes retenus. La liste se télécharge en CSV.
- Groupes de fichiers (demande de P. Duchesne, 4 octobre 2026) : pour chaque fichier, la plus grande
  combinaison retenue qui le contient (toutes, en cas d'égalité de taille). Chaque groupe n'est présenté
  qu'une fois, avec ses incompatibles fichier par fichier ; il est « cohérent » si chacun de ses fichiers
  l'a pour seule plus grande combinaison. Un graphe montre les groupes (fichiers = points, membres d'un
  même groupe reliés).
- Mise en garde affichée : un mélange peut rester sous le plafond, par dilution d'un petit fichier
  étranger, ou par une femelle « composite » (un allèle de chaque mère à un locus).
- Locus sans aucun juvénile génotypé dans une combinaison : inconnu (« ? »), femelle reconstituée sur
  les autres locus (règle de `../reconstitution-femelle`).
- Plafond par fichier (P. Duchesne, 9 octobre 2026) : le plafond s'applique aussi au pourcentage
  d'incompatibles de chaque fichier de la combinaison ; les pourcentages sont affichés en vecteur
  (fichier par fichier, dans l'ordre de la combinaison, puis global).
- Cas de deux génotypes complets : surlignés en jaune dans la liste et détaillés dans une section
  (les deux génotypes, leurs incompatibles, locus où ils diffèrent), téléchargeable.
- Le nombre maximal de fichiers par combinaison choisi est respecté au chargement de nouveaux fichiers
  (il n'est réduit que si la limite de 20 000 combinaisons l'exige).
- Présence dans la banque de femelles (P. Duchesne, 9 octobre 2026) : un ou plusieurs fichiers de banque
  (disposition FLOCK, une femelle par ligne). Pour chaque génotype retenu, puis chaque génotype d'un cas
  à deux génotypes complets sous le plafond : présent si identique à une femelle de la banque à chaque
  locus où les deux sont connus ; sinon, femelle la plus proche (plus faible proportion de locus
  différents). Vérifié contre `validation/attendu-banque.json` (banques d'essai `banque-essai-*.csv`,
  construites par `verifier.py` à partir de l'exemple).
- Juvéniles très incomplets (P. Duchesne et N. Tessier) : écartés s'il leur manque plus de 5 locus
  (réglable ; champ vide : aucun écarté). Même réglage dans la reconstitution et les compatibilités.
- Paramètres : nombre maximal de fichiers par combinaison ; plafond d'incompatibles en %
  (10 % par défaut, valeur arbitraire proposée par P. Duchesne, réglable). Au plus 20 000 combinaisons.
- Exemple : les six fichiers de tortues de P. Duchesne (Blanche, Grise, Rose, Turquoise, Inconnue 1,
  Inconnue 2), versions validées contre ses feuilles Maple.
- Vérification : `validation/verifier.py` recalcule de façon indépendante, en Python :
  - les 63 combinaisons de l'exemple (`validation/attendu.json`) ;
  - les groupes (`validation/attendu-groupes.json`) : exemple aux plafonds de 10 % et 20 %, et essai à
    11 fichiers obtenus en séparant par nid (d'après les identifiants) les fichiers Grise, Rose et
    Turquoise, pour la seule vérification.
  `validation/test-page.js` compare la page à ces calculs (essai téléversé compris), puis teste un
  nombre maximal de fichiers réduit.

Construction : `python3 construire.py` produit `index.html` à partir de `gabarit.html`, du code de
reconstitution validé et de `validation/combinaisons.js`.
