// Estimation du nombre de mâles géniteurs d'un nid (méthode de P. Duchesne, 19 octobre 2026).
// Statistique MD : à chaque locus, l'allèle mâle de chaque juvénile est déduit du génotype de la femelle ; MD est la
// moyenne, sur les locus, du nombre d'allèles mâles distincts. Sous l'hypothèse de k mâles, des échantillons
// artificiels (même femelle, mâles tirés selon les fréquences alléliques des juvéniles, partition des juvéniles
// entre les mâles tirée uniformément parmi les partitions de n en k parts) donnent la distribution de MD ; on retient
// la première hypothèse (k = 1, 2, …) dont la proportion de valeurs simulées ≥ MD observée est ≥ au seuil (0,05).
// Générateur pseudo-aléatoire et tirage des allèles : ceux de la page « Génération de juvéniles artificiels ».
(function(root){
"use strict";
var Sim=(typeof module!=="undefined"&&module.exports)?require("../../simulation-juveniles/validation/simulation.js"):root.Simulation;

// Allèle mâle d'un juvénile j=[x,y] (null si manquant) pour une femelle f=[a,b] ; frequence(allèle) départage le cas
// ambigu où le juvénile a le génotype de la femelle hétérozygote (l'allèle le plus fréquent est retenu ; à fréquence
// égale, le plus petit). null = AUCUN : juvénile manquant ou sans allèle de la femelle (incompatible).
function alleleMale(j,f,frequence){
  if(!j)return null;var x=j[0],y=j[1],c=[];
  if(x===f[0]||x===f[1])c.push(y);if((y===f[0]||y===f[1])&&c.indexOf(x)<0)c.push(x);
  if(!c.length)return null;if(c.length===1)return c[0];
  var p=Math.min(c[0],c[1]),q=Math.max(c[0],c[1]),fp=frequence(p),fq=frequence(q);return fq>fp?q:p;}

// Fréquences comptées sur les génotypes des juvéniles (non manquants) ; compte(l, allèle).
function comptes(juv,L){var t=[];for(var l=0;l<L;l++){var m={};juv.forEach(function(g){if(g[l]){m[g[l][0]]=(m[g[l][0]]||0)+1;m[g[l][1]]=(m[g[l][1]]||0)+1;}});t.push(m);}return t;}

// Analyse observée. juv : génotypes (tableaux par locus, null si manquant) ; femelle : génotype par locus (null si inconnu) ;
// ref : génotypes sur lesquels on estime les fréquences alléliques (par défaut, les juvéniles du nid eux-mêmes) ; ces
// fréquences servent à départager les cas ambigus et à tirer les mâles artificiels.
// Locus analysés : femelle connue et au moins un allèle mâle déterminé.
function observer(juv,femelle,ref){
  var L=femelle.length;ref=ref||juv;var C=comptes(ref,L),freqs=Sim.frequences(ref,L),loc=[];
  for(var l=0;l<L;l++){var f=femelle[l],m=juv.map(function(g){return f?alleleMale(g[l],f,function(a){return C[l][a]||0;}):null;});
    var d=[];m.forEach(function(a){if(a!==null&&d.indexOf(a)<0)d.push(a);});d.sort(function(a,b){return a-b;});
    loc.push({locus:l,femelle:f,males:m,distincts:d,utilises:m.filter(function(a){return a!==null;}).length,
      manquants:juv.filter(function(g){return !g[l];}).length,incompatibles:f?juv.filter(function(g,i){return g[l]&&m[i]===null;}).length:0,analyse:!!f&&d.length>0});}
  var A=loc.filter(function(x){return x.analyse;}),tot=A.reduce(function(s,x){return s+x.distincts.length;},0);
  return {n:juv.length,comptes:C,freqs:freqs,locus:loc,analyses:A.map(function(x){return x.locus;}),total:tot,md:A.length?tot/A.length:NaN};}

// Nombre de partitions de n en exactement k parts : p(n,k) = p(n-1,k-1) + p(n-k,k) (OEIS A008284).
function tablePartitions(n,K){var p=[];for(var i=0;i<=n;i++){p.push([]);for(var k=0;k<=K;k++)p[i].push(i===0&&k===0?1:0);}
  for(i=1;i<=n;i++)for(k=1;k<=Math.min(i,K);k++)p[i][k]=p[i-1][k-1]+(i-k>=k?p[i-k][k]:0);return p;}
// Tirage uniforme d'une partition de n en k parts, par la même récurrence : la partition a une part égale à 1
// (probabilité p(n-1,k-1)/p(n,k)), ou toutes ses parts ≥ 2 (on retire 1 à chacune). Parts en ordre non croissant.
function tirerPartition(n,k,P,u){var parts=[],t=0;
  while(k>0){if(k===n){for(var i=0;i<k;i++)parts.push(1+t);break;}if(k===1){parts.push(n+t);break;}
    if(u()*P[n][k]<P[n-1][k-1]){parts.push(1+t);n--;k--;}else{t++;n-=k;}}
  return parts.reverse();}

// Une valeur simulée (somme sur les locus analysés du nombre d'allèles mâles distincts) sous l'hypothèse de k mâles.
// Ordre des tirages : partition ; génotypes des k mâles (locus analysés, 2 tirages chacun) ; permutation des juvéniles
// (Fisher-Yates, de n-1 à 1) ; puis juvénile par juvénile, locus par locus, aux seules cases où l'observé a un allèle
// mâle déterminé : allèle de la femelle (u < 1/2 : premier), allèle du mâle (de même). Les cases AUCUN de l'observé
// (manquants, incompatibles) restent vides dans l'échantillon artificiel.
function simulerUne(O,femelle,k,P,u){
  var n=O.n,A=O.analyses,parts=tirerPartition(n,k,P,u),males=[];
  for(var m=0;m<k;m++)males.push(A.map(function(l){return [Sim.tirerAllele(O.freqs[l],u()),Sim.tirerAllele(O.freqs[l],u())];}));
  var perm=[];for(var i=0;i<n;i++)perm.push(i);for(i=n-1;i>0;i--){var j=Math.floor(u()*(i+1)),x=perm[i];perm[i]=perm[j];perm[j]=x;}
  var pere=new Array(n),c=0;parts.forEach(function(p,m){for(var r=0;r<p;r++)pere[perm[c++]]=m;});
  var vus=A.map(function(){return [];});
  for(i=0;i<n;i++)for(var a=0;a<A.length;a++){var l=A[a],loc=O.locus[l];if(loc.males[i]===null)continue;
    var f=femelle[l],g=[u()<0.5?f[0]:f[1],null],mg=males[pere[i]][a];g[1]=u()<0.5?mg[0]:mg[1];
    var am=alleleMale(g,f,function(z){return O.comptes[l][z]||0;});if(vus[a].indexOf(am)<0)vus[a].push(am);}
  return vus.reduce(function(s,v){return s+v.length;},0);}

// Série complète : hypothèses k = 1, 2, … jusqu'à kmax (≤ n) ; arrêt à la première acceptée (proportion ≥ seuil).
// Chaque hypothèse : N simulations ; distribution des sommes (index = somme), proportion ≥ observé.
function creerAnalyse(juv,femelle,opts){
  var O=observer(juv,femelle,opts.ref),kmax=Math.min(opts.kmax,O.n);
  return {O:O,femelle:femelle,N:opts.N,seuil:opts.seuil,kmax:kmax,graine:opts.graine,u:Sim.generateur(opts.graine),
    P:tablePartitions(O.n,kmax),hyp:[],k:0,fait:0,fini:!O.analyses.length,retenue:null};}
function avancerAnalyse(S,lot){var O=S.O,LA=O.analyses.length;
  while(lot>0&&!S.fini){
    if(!S.hyp.length||S.fait===S.N){S.k++;S.fait=0;var d=[];for(var i=0;i<=O.locus.length*O.n;i++)d.push(0);S.hyp.push({k:S.k,dist:d,ge:0,somme:0});}
    var H=S.hyp[S.hyp.length-1],m=Math.min(lot,S.N-S.fait);
    for(var r=0;r<m;r++){var t=simulerUne(O,S.femelle,S.k,S.P,S.u);H.dist[t]++;H.somme+=t;if(t>=O.total)H.ge++;}
    S.fait+=m;lot-=m;
    if(S.fait===S.N){H.p=H.ge/S.N;H.moyenne=H.somme/S.N/LA;H.acceptee=H.p>=S.seuil;
      if(H.acceptee){S.retenue=H.k;S.fini=true;}else if(S.k>=S.kmax)S.fini=true;}}
  return S;}

var api={alleleMale:alleleMale,observer:observer,tablePartitions:tablePartitions,tirerPartition:tirerPartition,simulerUne:simulerUne,creerAnalyse:creerAnalyse,avancerAnalyse:avancerAnalyse};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Males=api;
})(this);
