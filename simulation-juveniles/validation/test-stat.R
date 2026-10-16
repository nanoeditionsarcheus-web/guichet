# Tests statistiques (R) sur les 200 répétitions écrites par test-repetitions.js :
# 1) allèles des parents contre les fréquences du pool (khi-deux d'ajustement, 2000 parents par répétition) ;
# 2) génotypes des juvéniles d'un croisement contre les proportions de Mendel (1/4 par combinaison allèle maternel
#    × allèle paternel ; khi-deux d'ajustement, 2000 juvéniles par répétition ; aucun génotype impossible).
# Sous une simulation correcte, les p-valeurs sont uniformes : environ 5 % sous 0,05, et le test de Kolmogorov-
# Smirnov ne rejette pas l'uniformité. Usage : Rscript test-stat.R <dossier>
d <- commandArgs(TRUE)[1]
P <- read.csv(file.path(d, "parents.csv"), colClasses = "integer"); Fq <- read.csv(file.path(d, "frequences.csv"))
C <- read.csv(file.path(d, "croisements.csv"), colClasses = "integer")
SP <- split(P, list(P$rep, P$locus)); FL <- split(Fq, Fq$locus)
p1 <- sapply(SP, function(x) { f <- FL[[as.character(x$locus[1])]]; o <- tabulate(match(x$allele, f$allele), nbins = nrow(f))
  suppressWarnings(chisq.test(o, p = f$compte / sum(f$compte))$p.value) })
SC <- split(C, list(C$rep, C$locus))
p2 <- unlist(lapply(SC, function(x) { m <- c(x$m1[1], x$m2[1]); p <- c(x$p1[1], x$p2[1])
  att <- table(sapply(1:4, function(i) paste(sort(c(m[(i - 1) %/% 2 + 1], p[(i - 1) %% 2 + 1])), collapse = "/"))) / 4
  if (length(att) == 1) return(NULL)
  obs <- table(factor(paste(pmin(x$j1, x$j2), pmax(x$j1, x$j2), sep = "/"), levels = names(att))); stopifnot(sum(obs) == nrow(x))
  chisq.test(as.vector(obs), p = as.vector(att))$p.value }))
for (nm in c("fréquences des parents", "transmission mendélienne")) { p <- if (nm == "fréquences des parents") p1 else p2
  cat(nm, ":", length(p), "tests ; part sous 0,05 :", sprintf("%.3f", mean(p < 0.05)), "; sous 0,01 :", sprintf("%.3f", mean(p < 0.01)),
      "; Kolmogorov-Smirnov (uniformité) p =", sprintf("%.3f", suppressWarnings(ks.test(p, "punif")$p.value)), "\n") }
