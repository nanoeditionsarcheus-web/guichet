#!/bin/sh
# PHYLIP 3.697 : gendist (Nei 1972, option A = tous les allèles) puis neighbor (option N = UPGMA)
set -e
BIN=${PHYLIP_BIN:-/usr/lib/phylip/bin}
cd "$(dirname "$0")"
for ds in microbov nancycats jaguar crocrussula; do
  W=$(mktemp -d); cp $ds.gendist.in $W/infile; cd $W
  printf 'A\nY\n' | $BIN/gendist > gendist.log            # A : tous les allèles sont fournis
  mv outfile dist; mv infile gendist.in
  cp dist infile
  printf 'N\nY\n' | $BIN/neighbor > neighbor.log         # N : UPGMA au lieu de Neighbor-Joining
  cd - >/dev/null
  cp $W/dist $ds.gendist.out; cp $W/outtree $ds.upgma.nwk; cp $W/outfile $ds.neighbor.out
  rm -rf $W
done
