# Validation de l'arbre des espèces — étape R
# 1) lit les 4 jeux publiés ; 2) exporte les génotypes (JSON, pour le JS) ;
# 3) calcule les fréquences alléliques (adegenet), les écrit au format PHYLIP gendist ;
# 4) calcule la distance de Nei 1972 (adegenet::dist.genpop, method = 1) et l'arbre UPGMA
#    (stats::hclust, method = "average", converti avec ape::as.phylo).
# Usage : Rscript r/01_export_et_reference.R <dossier des sources pegas/hierfstat>
suppressMessages({library(adegenet); library(ape); library(jsonlite)})
args <- commandArgs(TRUE); SRC <- if (length(args)) args[1] else "src"

# --- lecture : chaque jeu -> data.frame (pop, loc1, loc2, ...) avec "a/b" ou NA ---
lire <- list()
data(microbov); data(nancycats)
g2df <- function(x) { d <- genind2df(x, sep = "/", usepop = TRUE); d }
lire$microbov  <- g2df(microbov)
lire$nancycats <- g2df(nancycats)
load(file.path(SRC, "pegas/pegas/data/jaguar.rda"))
jg <- data.frame(pop = as.character(jaguar$population),
                 lapply(jaguar[, setdiff(names(jaguar), "population")], as.character),
                 check.names = FALSE, stringsAsFactors = FALSE)
lire$jaguar <- jg
load(file.path(SRC, "hierfstat/data/crocrussula.rda"))
cg <- crocrussula$genot
cr <- data.frame(pop = paste0("Pop", cg[[1]]), check.names = FALSE, stringsAsFactors = FALSE)
for (l in names(cg)[-1]) {                # format hierfstat : 2 chiffres par allèle
  v <- cg[[l]]; a <- v %/% 100; b <- v %% 100
  cr[[l]] <- ifelse(is.na(v) | a == 0 | b == 0, NA, paste0(a, "/", b))
}
lire$crocrussula <- cr

# --- nettoyage commun : tout génotype portant un allèle 0 ou manquant -> NA ---
propre <- function(df) {
  for (l in names(df)[-1]) {
    v <- as.character(df[[l]]); v[is.na(v) | v == "" ] <- NA
    bad <- !is.na(v) & sapply(strsplit(ifelse(is.na(v), "0/0", v), "/"), function(p) length(p) != 2 || any(as.numeric(p) == 0))
    v[bad] <- NA; df[[l]] <- v
  }
  df$pop <- as.character(df$pop); df
}

resume <- list()
for (nm in names(lire)) {
  df <- propre(lire[[nm]]); loci <- names(df)[-1]; pops <- unique(df$pop)
  gi <- df2genind(df[, loci, drop = FALSE], sep = "/", pop = df$pop, ploidy = 2, NA.char = NA)
  gp <- genind2genpop(gi, quiet = TRUE)
  # locus sans aucune donnée dans au moins une population : exclu partout (PHYLIP l'exige)
  tot <- sapply(split(seq_len(ncol(gp@tab)), gp@loc.fac), function(j) rowSums(gp@tab[, j, drop = FALSE]))
  exclus <- colnames(tot)[colSums(tot == 0) > 0]
  garde <- setdiff(locNames(gp), exclus)
  gpk <- gp[, loc = garde]
  # JSON pour le JS : génotypes bruts (tous les locus ; le JS applique lui-même la règle d'exclusion)
  js <- list(source = nm, loci = loci, pops = setNames(lapply(pops, function(p) {
    sub <- df[df$pop == p, loci, drop = FALSE]
    lapply(seq_len(nrow(sub)), function(i) lapply(loci, function(l) { v <- sub[i, l]; if (is.na(v)) NULL else as.numeric(strsplit(v, "/")[[1]]) }))
  }), pops))
  write(toJSON(js, auto_unbox = TRUE, null = "null"), file.path("data", paste0(nm, ".json")))
  # fréquences (adegenet) -> fichier d'entrée gendist (option A : tous les allèles)
  X <- makefreq(gpk, missing = "mean", quiet = TRUE)
  X <- X[pops, , drop = FALSE]
  code <- sprintf("P%03d", seq_along(pops))
  nal <- as.integer(table(gpk@loc.fac)[garde])
  lines <- c(sprintf("%d %d", length(pops), length(garde)), paste(nal, collapse = " "))
  for (i in seq_along(pops)) lines <- c(lines, paste0(formatC(code[i], width = -10), paste(sprintf("%.12f", X[i, ]), collapse = " ")))
  writeLines(lines, file.path("phylip", paste0(nm, ".gendist.in")))
  write.table(data.frame(code = code, pop = pops), file.path("phylip", paste0(nm, ".codes.tsv")), sep = "\t", row.names = FALSE, quote = FALSE)
  # référence adegenet
  D <- as.matrix(dist.genpop(gpk, method = 1))[pops, pops]
  write.table(D, file.path("r", paste0(nm, ".adegenet.dist.tsv")), sep = "\t", quote = FALSE, col.names = NA)
  Dc <- D; dimnames(Dc) <- list(code, code)           # étiquettes P001… comme PHYLIP
  tr <- as.phylo(hclust(as.dist(Dc), method = "average"))
  write.tree(tr, file.path("r", paste0(nm, ".hclust.nwk")), digits = 12)
  # variante : adegenet sur TOUS les locus (imputation par la moyenne) pour documenter l'écart
  if (length(exclus)) {
    Dall <- as.matrix(dist.genpop(gp, method = 1))[pops, pops]
    write.table(Dall, file.path("r", paste0(nm, ".adegenet.tous-locus.dist.tsv")), sep = "\t", quote = FALSE, col.names = NA)
  }
  resume[[nm]] <- data.frame(jeu = nm, individus = nrow(df), populations = length(pops), locus = length(loci),
                             locus_exclus = paste(exclus, collapse = ","), alleles = ncol(X))
}
r <- do.call(rbind, resume); print(r, row.names = FALSE)
write.table(r, "r/resume-jeux.tsv", sep = "\t", row.names = FALSE, quote = FALSE)
cat("R", R.version$major, R.version$minor, "adegenet", as.character(packageVersion("adegenet")), "ape", as.character(packageVersion("ape")), "\n", file = "r/versions.txt")
