# Compare JS, PHYLIP et adegenet/hclust : matrices (écart absolu max) ; arbres (clades enracinées,
# longueurs de branches clade par clade). Usage : Rscript r/02_comparaison.R
suppressMessages(library(ape))
lire_phylip <- function(f) {             # sortie de gendist (lignes éventuellement repliées)
  tok <- scan(f, what = "", quiet = TRUE); n <- as.integer(tok[1]); tok <- tok[-1]
  M <- matrix(NA_real_, n, n); nm <- character(n)
  for (i in seq_len(n)) { b <- (i - 1) * (n + 1); nm[i] <- tok[b + 1]; M[i, ] <- as.numeric(tok[b + 1 + seq_len(n)]) }
  dimnames(M) <- list(nm, nm); M
}
lire_tsv <- function(f) as.matrix(read.table(f, sep = "\t", header = TRUE, row.names = 1, check.names = FALSE, quote = ""))
clades <- function(tr) {                 # clade (étiquettes triées) -> longueur de la branche qui y mène
  n <- Ntip(tr); out <- c()
  for (e in seq_len(nrow(tr$edge))) {
    ch <- tr$edge[e, 2]
    tips <- if (ch <= n) tr$tip.label[ch] else extract.clade(tr, ch)$tip.label
    out[paste(sort(tips), collapse = ",")] <- tr$edge.length[e]
  }
  out
}
cmp_arbres <- function(a, b) {
  ca <- clades(a); cb <- clades(b)
  memes <- setequal(names(ca), names(cb))
  ecart <- if (memes) max(abs(ca[names(ca)] - cb[names(ca)])) else NA
  hauteur <- max(node.depth.edgelength(a)) - max(node.depth.edgelength(b))
  list(topologie = memes, ecart_branches = ecart, ecart_racine = abs(hauteur))
}
res <- list()
for (ds in c("microbov", "nancycats", "jaguar", "crocrussula")) {
  code <- read.table(file.path("phylip", paste0(ds, ".codes.tsv")), sep = "\t", header = TRUE, quote = "")
  Dp <- lire_phylip(file.path("phylip", paste0(ds, ".gendist.out")))
  Da <- lire_tsv(file.path("r", paste0(ds, ".adegenet.dist.tsv")))
  Dj <- lire_tsv(file.path("js", paste0(ds, ".dist.tsv")))
  stopifnot(identical(rownames(Dp), code$code), identical(rownames(Da), code$pop), identical(rownames(Dj), code$pop))
  Tp <- read.tree(file.path("phylip", paste0(ds, ".upgma.nwk")))
  Th <- read.tree(file.path("r", paste0(ds, ".hclust.nwk")))
  Tj <- read.tree(file.path("js", paste0(ds, ".upgma.nwk")))
  jp <- cmp_arbres(Tj, Tp); jh <- cmp_arbres(Tj, Th); hp <- cmp_arbres(Th, Tp)
  # égalités exactes dans la matrice (sources possibles d'arbres différents mais équivalents)
  v <- Dj[upper.tri(Dj)]; egal <- sum(duplicated(signif(v, 12)))
  res[[ds]] <- data.frame(jeu = ds, n_pop = nrow(Dj),
    D_JS_vs_PHYLIP = max(abs(unname(Dj) - unname(Dp))),
    D_JS_vs_adegenet = max(abs(unname(Dj) - unname(Da))),
    D_adegenet_vs_PHYLIP = max(abs(unname(Da) - unname(Dp))),
    topo_JS_PHYLIP = jp$topologie, topo_JS_hclust = jh$topologie, topo_hclust_PHYLIP = hp$topologie,
    L_JS_vs_PHYLIP = jp$ecart_branches, L_JS_vs_hclust = jh$ecart_branches, L_hclust_vs_PHYLIP = hp$ecart_branches,
    RF_JS_PHYLIP = dist.topo(unroot(Tj), unroot(Tp)), egalites_D = egal)
}
r <- do.call(rbind, res)
print(t(r))
write.table(r, "resultats.tsv", sep = "\t", row.names = FALSE, quote = FALSE)
# nancycats : effet de l'imputation par la moyenne d'adegenet (tous les locus) par rapport à l'exclusion
Dall <- lire_tsv("r/nancycats.adegenet.tous-locus.dist.tsv"); Dj <- lire_tsv("js/nancycats.dist.tsv")
cd <- read.table("phylip/nancycats.codes.tsv", sep = "\t", header = TRUE)$code
dimnames(Dall) <- list(cd, cd)
Tall <- as.phylo(hclust(as.dist(Dall), "average")); Tj <- read.tree("js/nancycats.upgma.nwk")
cat("\nnancycats, adegenet avec imputation (9 locus) vs JS avec exclusion (8 locus) :\n",
    " écart max des distances =", max(abs(unname(Dall) - unname(Dj))),
    "; même topologie =", cmp_arbres(Tj, Tall)$topologie, "\n")
