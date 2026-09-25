#!/bin/sh
# Rejoue toute la validation. Prérequis (Ubuntu 24.04) :
#   apt-get install phylip r-base-core r-cran-ape r-cran-adegenet r-cran-jsonlite ; Node.js >= 18
#   sources de pegas et hierfstat (jeux jaguar et crocrussula) :
#   git clone --depth 1 https://github.com/emmanuelparadis/pegas  src/pegas
#   git clone --depth 1 https://github.com/jgx65/hierfstat        src/hierfstat
set -e
cd "$(dirname "$0")"
SRC=${1:-src}
Rscript r/01_export_et_reference.R "$SRC"   # génotypes -> JSON ; fréquences -> PHYLIP ; adegenet + hclust
phylip/run_phylip.sh                        # gendist (Nei) + neighbor (UPGMA)
node js/run.js                              # implémentation JavaScript
Rscript r/02_comparaison.R                  # comparaison -> resultats.tsv
node stress/gen.js && Rscript stress/cmp.R 2>/dev/null && rm -f stress/m*.tsv stress/m*.nwk
