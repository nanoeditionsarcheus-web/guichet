// Estimation du nombre de mâles géniteurs d'un nid (méthode de P. Duchesne, 19 octobre 2026).
// Statistique MD : à chaque locus, l'allèle mâle de chaque juvénile est déduit du génotype de la femelle ; MD est la
// moyenne, sur les locus, du nombre d'allèles mâles distincts. Sous l'hypothèse de k mâles, des échantillons
// artificiels (même femelle, mâles tirés selon les fréquences alléliques des juvéniles, partition des juvéniles
// entre les mâles tirée uniformément parmi les partitions de n en k parts) donnent la distribution de MD ; l'estimation
// est l'intervalle des hypothèses que ni la p-valeur à droite ni celle à gauche ne rejettent (voir creerAnalyse).
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

// Série complète (P. Duchesne, 20 octobre 2026) : hypothèses k = 1, 2, … jusqu'à kmax (≤ n). Pour chacune, N simulations,
// la p-valeur à droite (proportion des valeurs simulées ≥ observée) et à gauche (≤ observée). Borne inférieure : la
// première hypothèse dont la p-valeur à droite atteint le seuil ; on continue tant que la p-valeur à gauche reste
// supérieure au seuil ; borne supérieure : la dernière hypothèse dans ce cas. Si kmax est atteint avant, l'intervalle
// reste ouvert (« kmax ou plus »), sauf si kmax est le nombre de juvéniles : il ne peut y avoir plus de mâles.
function creerAnalyse(juv,femelle,opts){
  var O=observer(juv,femelle,opts.ref),kmax=Math.min(opts.kmax,O.n);
  return {O:O,femelle:femelle,N:opts.N,seuil:opts.seuil,kmax:kmax,graine:opts.graine,u:Sim.generateur(opts.graine),
    P:tablePartitions(O.n,kmax),hyp:[],k:0,fait:0,fini:!O.analyses.length,basse:null,haute:null,ouvert:false};}
function avancerAnalyse(S,lot){var O=S.O,LA=O.analyses.length;
  while(lot>0&&!S.fini){
    if(!S.hyp.length||S.fait===S.N){S.k++;S.fait=0;var d=[];for(var i=0;i<=O.locus.length*O.n;i++)d.push(0);S.hyp.push({k:S.k,dist:d,ge:0,le:0,somme:0});}
    var H=S.hyp[S.hyp.length-1],m=Math.min(lot,S.N-S.fait);
    for(var r=0;r<m;r++){var t=simulerUne(O,S.femelle,S.k,S.P,S.u);H.dist[t]++;H.somme+=t;if(t>=O.total)H.ge++;if(t<=O.total)H.le++;}
    S.fait+=m;lot-=m;
    if(S.fait===S.N){H.p=H.ge/S.N;H.pg=H.le/S.N;H.moyenne=H.somme/S.N/LA;H.droite=H.p>=S.seuil;H.gauche=H.pg>S.seuil;
      H.dans=H.droite&&H.gauche;
      if(H.droite&&S.basse===null)S.basse=H.k;
      if(S.basse!==null&&!H.gauche)S.fini=true;
      else{if(H.dans)S.haute=H.k;if(S.k>=S.kmax){S.fini=true;S.ouvert=S.basse!==null&&H.dans&&S.kmax<O.n;}}}}
  return S;}
// Texte de l'intervalle : « 2 à 4 », « 3 », « 4 à 10 ou plus » (kmax atteint), « plus de 10 », « entre 1 et 2 » (observé entre deux hypothèses),
// « aucune hypothèse compatible » (observé trop petit même pour 1 mâle).
function intervalle(S){if(S.basse===null)return 'plus de '+S.kmax;if(S.haute===null)return S.basse===1?'aucune hypothèse compatible':'entre '+(S.basse-1)+' et '+S.basse;
  if(S.ouvert)return (S.basse===S.haute?S.basse:S.basse+' à '+S.haute)+' ou plus';return S.basse===S.haute?String(S.basse):S.basse+' à '+S.haute;}

// Simulateur de validation (P. Duchesne, 20 octobre 2026) : même femelle, mêmes fréquences (référence, sinon juvéniles
// du nid), même nombre de juvéniles et mêmes données manquantes que le nid naturel ; pour k = 1 … kmaxSim mâles vrais,
// R nids artificiels, chacun analysé par la méthode ci-dessus. Ordre des tirages, nid par nid (k, puis répétition) :
// génotypes des k mâles (locus où la femelle est connue, 2 tirages chacun) ; partition ; permutation des juvéniles ;
// juvéniles (case par case, aux cases non manquantes du nid naturel : allèle de la femelle, allèle du mâle) ; graine de
// l'analyse (un tirage × 2^32).
function nidArtificiel(juvNat,femelle,freqs,k,P,u){
  var n=juvNat.length,L=femelle.length,males=[];
  for(var m=0;m<k;m++){var g=[];for(var l=0;l<L;l++)g.push(femelle[l]?[Sim.tirerAllele(freqs[l],u()),Sim.tirerAllele(freqs[l],u())]:null);males.push(g);}
  var parts=tirerPartition(n,k,P,u),perm=[];for(var i=0;i<n;i++)perm.push(i);
  for(i=n-1;i>0;i--){var j=Math.floor(u()*(i+1)),x=perm[i];perm[i]=perm[j];perm[j]=x;}
  var pere=new Array(n),c=0;parts.forEach(function(p,m){for(var r=0;r<p;r++)pere[perm[c++]]=m;});
  var J=[];for(i=0;i<n;i++){var g2=[];for(l=0;l<L;l++){if(!juvNat[i][l]||!femelle[l]){g2.push(null);continue;}
    var a=u()<0.5?femelle[l][0]:femelle[l][1],mg=males[pere[i]][l],b=u()<0.5?mg[0]:mg[1];g2.push(a<b?[a,b]:[b,a]);}J.push(g2);}
  return J;}
function creerValidation(juvNat,femelle,opts){var K=Math.min(opts.kmaxSim,juvNat.length),file=[];
  for(var k=1;k<=K;k++)for(var r=0;r<opts.R;r++)file.push({k:k,r:r});
  return {juv:juvNat,femelle:femelle,opts:opts,freqs:Sim.frequences(opts.ref||juvNat,femelle.length),u:Sim.generateur(opts.graine),
    P:tablePartitions(juvNat.length,K),file:file,i:0,cour:null,nids:[],fini:!file.length};}
function avancerValidation(V,lot){var o=V.opts;
  while(lot>0&&!V.fini){
    if(!V.cour){var e=V.file[V.i],J=nidArtificiel(V.juv,V.femelle,V.freqs,e.k,V.P,V.u),g=Math.floor(V.u()*4294967296);
      V.cour={k:e.k,r:e.r,graine:g,S:creerAnalyse(J,V.femelle,{N:o.N,seuil:o.seuil,kmax:o.kmax,graine:g,ref:o.ref})};}
    var S=V.cour.S,m=Math.min(lot,S.N);avancerAnalyse(S,m);lot-=m;
    if(S.fini){V.nids.push({k:V.cour.k,r:V.cour.r,graine:V.cour.graine,basse:S.basse,haute:S.haute,ouvert:S.ouvert,kmax:S.kmax,texte:intervalle(S),
      hyp:S.hyp.map(function(h){return {k:h.k,ge:h.ge,le:h.le};})});V.cour=null;V.i++;if(V.i>=V.file.length)V.fini=true;}}
  return V;}

// Fréquences de référence données par leurs seuls comptes d'allèles (comptes[l] = {allèle: nombre}) : génotypes fictifs
// qui ont exactement ces comptes (allèles triés, pris deux à deux), pour servir de référence. Seuls les comptes importent.
function genotypesDeComptes(comptes){var cols=comptes.map(function(c){var t=[];Object.keys(c).map(Number).sort(function(a,b){return a-b;}).forEach(function(a){for(var i=0;i<c[a];i++)t.push(a);});
    var g=[];for(var i=0;i+1<t.length;i+=2)g.push([t[i],t[i+1]]);return g;}),n=Math.max.apply(null,cols.map(function(c){return c.length;})),out=[];
  for(var i=0;i<n;i++)out.push(cols.map(function(c){return c[i]||null;}));return out;}

var api={genotypesDeComptes:genotypesDeComptes,alleleMale:alleleMale,observer:observer,tablePartitions:tablePartitions,tirerPartition:tirerPartition,simulerUne:simulerUne,creerAnalyse:creerAnalyse,avancerAnalyse:avancerAnalyse,intervalle:intervalle,nidArtificiel:nidArtificiel,creerValidation:creerValidation,avancerValidation:avancerValidation};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Males=api;
})(this);
