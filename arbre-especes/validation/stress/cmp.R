suppressMessages(library(ape)); source(textConnection(paste(readLines("r/02_comparaison.R")[grep("^clades <-",readLines("r/02_comparaison.R")):grep("^res <- list",readLines("r/02_comparaison.R"))-1], collapse="\n")))
ok<-0; mx<-0
for(t in 0:299){D<-as.matrix(read.table(sprintf("stress/m%d.tsv",t))); n<-nrow(D); dimnames(D)<-list(paste0("T",0:(n-1)),paste0("T",0:(n-1)))
 c<-cmp_arbres(read.tree(sprintf("stress/m%d.nwk",t)), as.phylo(hclust(as.dist(D),"average"))); if(c$topologie){ok<-ok+1; mx<-max(mx,c$ecart_branches)}}
cat("matrices aléatoires : topologie identique", ok, "/ 300 ; écart max des longueurs de branches", mx, "\n")
