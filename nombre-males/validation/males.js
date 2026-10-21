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

// Le vrai nombre k est-il dans l'intervalle ? (intervalle ouvert : toute valeur ≥ borne inférieure)
function contient(S,k){return S.basse!==null&&S.haute!==null&&k>=S.basse&&(k<=S.haute||S.ouvert);}

// Simulateur de validation (P. Duchesne, 20 octobre 2026) : même femelle, mêmes fréquences (référence, sinon juvéniles
// du nid), même nombre de juvéniles et mêmes données manquantes que le nid naturel ; pour k = 1 … kmaxSim mâles vrais,
// R nids artificiels, chacun analysé par la méthode ci-dessus. Ordre des tirages, nid par nid (k, puis répétition) :
// génotypes des k mâles (locus où la femelle est connue, 2 tirages chacun) ; partition ; permutation des juvéniles ;
// juvéniles (case par case, aux cases non manquantes du nid naturel : allèle de la femelle, allèle du mâle) ; graine de
// l'analyse (un tirage × 2^32).
// Erreur de génotypage (P. Duchesne, 21 octobre 2026), taux e (0 à 1) : un allèle transmis est remplacé, avec une
// probabilité e/2, par son voisin de gauche et, avec une probabilité e/2, par son voisin de droite dans la suite triée
// des allèles connus au locus (fichiers de référence, sinon juvéniles du nid) ; un allèle au bout de la suite n'a qu'un
// voisin (erreur e/2). Un tirage par allèle transmis, seulement si e > 0.
function avecErreur(a,alleles,e,u){if(!(e>0))return a;var v=u(),g=null,d=null;
  for(var i=0;i<alleles.length;i++){if(alleles[i]<a)g=alleles[i];else if(alleles[i]>a&&d===null)d=alleles[i];}
  if(v<e/2)return g===null?a:g;if(v<e)return d===null?a:d;return a;}
function nidArtificiel(juvNat,femelle,freqs,k,P,u,e){
  var n=juvNat.length,L=femelle.length,males=[];
  for(var m=0;m<k;m++){var g=[];for(var l=0;l<L;l++)g.push(femelle[l]?[Sim.tirerAllele(freqs[l],u()),Sim.tirerAllele(freqs[l],u())]:null);males.push(g);}
  var parts=tirerPartition(n,k,P,u),perm=[];for(var i=0;i<n;i++)perm.push(i);
  for(i=n-1;i>0;i--){var j=Math.floor(u()*(i+1)),x=perm[i];perm[i]=perm[j];perm[j]=x;}
  var pere=new Array(n),c=0;parts.forEach(function(p,m){for(var r=0;r<p;r++)pere[perm[c++]]=m;});
  var J=[];for(i=0;i<n;i++){var g2=[];for(l=0;l<L;l++){if(!juvNat[i][l]||!femelle[l]){g2.push(null);continue;}
    var a=u()<0.5?femelle[l][0]:femelle[l][1];a=avecErreur(a,freqs[l].alleles,e,u);
    var mg=males[pere[i]][l],b=u()<0.5?mg[0]:mg[1];b=avecErreur(b,freqs[l].alleles,e,u);g2.push(a<b?[a,b]:[b,a]);}J.push(g2);}
  return J;}
// ---------- Nombre minimal de pères (la quantité que calcule GERUD : Jones 2001, 2005) ----------
// Allèles paternels possibles d'un juvénile à un locus, d'après la femelle : un seul, ou deux quand le juvénile a le
// génotype de la femelle hétérozygote (sans choisir : chacun est possible). null : juvénile manquant, femelle inconnue
// ou juvénile incompatible (aucun allèle de la femelle) ; le locus n'impose alors aucune contrainte à ce juvénile.
function paternels(j,f){if(!j||!f)return null;var x=j[0],y=j[1],c=[];
  if(x===f[0]||x===f[1])c.push(y);if((y===f[0]||y===f[1])&&c.indexOf(x)<0)c.push(x);return c.length?c.sort(function(a,b){return a-b;}):null;}
// Un père (deux allèles au plus) peut-il expliquer ces ensembles d'allèles possibles ? (au moins un allèle de chacun)
function couvrable(E){if(!E.length)return true;var A=E[0];
  for(var i=0;i<A.length;i++){var a=A[i],reste=E.filter(function(S){return S.indexOf(a)<0;});if(!reste.length)return true;
    for(var j=0;j<reste[0].length;j++){var b=reste[0][j];if(reste.every(function(S){return S.indexOf(b)>=0;}))return true;}}
  return false;}
// Plus petit nombre de pères tel que les juvéniles se répartissent entre eux, chaque père expliquant, à chaque locus, ses
// juvéniles avec deux allèles au plus. Recherche exhaustive, k = borne inférieure, k + 1, … ; à k donné, chaque juvénile
// est placé chez un père déjà ouvert ou chez un nouveau père (symétries écartées). Juvéniles rangés pour que les conflits
// apparaissent tôt. Si la recherche dépasse « budget » essais pour un k, le résultat est une borne (≥ k).
function minPeres(juv,femelle,opts){opts=opts||{};var kmax=opts.kmax||20,budget=opts.budget||1e6,L=femelle.length;
  var C=juv.map(function(g){return femelle.map(function(f,l){return paternels(g[l],f);});}).filter(function(c){return c.some(function(x){return x;});});
  var n=C.length;if(!n)return {min:0,exact:true,n:0};
  // borne inférieure : à chaque locus, allèles paternels certains (juvéniles à un seul allèle possible) / 2
  var bi=1;for(var l=0;l<L;l++){var s={};C.forEach(function(c){if(c[l]&&c[l].length===1)s[c[l][0]]=1;});bi=Math.max(bi,Math.ceil(Object.keys(s).length/2));}
  // ordre : à chaque pas, le juvénile qui apporte le plus d'allèles certains encore non vus (égalité : premier dans le fichier)
  var ordre=[],vus=L?femelle.map(function(){return {};}):[],pris=new Array(n).fill(false);
  for(var t=0;t<n;t++){var best=-1,bs=-1;for(var i=0;i<n;i++){if(pris[i])continue;var sc=0;C[i].forEach(function(x,l){if(x&&x.length===1&&!vus[l][x[0]])sc++;});if(sc>bs){bs=sc;best=i;}}
    pris[best]=true;ordre.push(C[best]);C[best].forEach(function(x,l){if(x&&x.length===1)vus[l][x[0]]=1;});}
  for(var k=bi;k<=Math.min(kmax,n);k++){var essais=0,trop=false,grp=[];
    var place=function(t){if(t===n)return true;if(++essais>budget){trop=true;return false;}var c=ordre[t];
      for(var g=0;g<=grp.length&&g<k;g++){var neuf=g===grp.length;if(neuf)grp.push(femelle.map(function(){return [];}));var ok=true;
        for(var l=0;l<L&&ok;l++)if(c[l]){grp[g][l].push(c[l]);if(!couvrable(grp[g][l]))ok=false;grp[g][l].pop();}
        if(ok){for(l=0;l<L;l++)if(c[l])grp[g][l].push(c[l]);if(place(t+1))return true;for(l=0;l<L;l++)if(c[l])grp[g][l].pop();}
        if(neuf)grp.pop();if(trop)return false;}
      return false;};
    if(place(0))return {min:k,exact:true,n:n};if(trop)return {min:k,exact:false,n:n};}
  return {min:Math.min(kmax,n)+1,exact:false,n:n};}

function creerValidation(juvNat,femelle,opts){var K=Math.min(opts.kmaxSim,juvNat.length),file=[];
  for(var k=1;k<=K;k++)for(var r=0;r<opts.R;r++)file.push({k:k,r:r});
  return {juv:juvNat,femelle:femelle,opts:opts,freqs:Sim.frequences(opts.ref||juvNat,femelle.length),u:Sim.generateur(opts.graine),
    P:tablePartitions(juvNat.length,K),file:file,i:0,cour:null,nids:[],fini:!file.length};}
function avancerValidation(V,lot){var o=V.opts;
  while(lot>0&&!V.fini){
    if(!V.cour){var e=V.file[V.i],J=nidArtificiel(V.juv,V.femelle,V.freqs,e.k,V.P,V.u,o.erreur||0),g=Math.floor(V.u()*4294967296);
      V.cour={k:e.k,r:e.r,graine:g,S:creerAnalyse(J,V.femelle,{N:o.N,seuil:o.seuil,kmax:o.kmax,graine:g,ref:o.ref}),gerud:o.gerud?minPeres(J,V.femelle):null};}
    var S=V.cour.S,m=Math.min(lot,S.N);avancerAnalyse(S,m);lot-=m;
    if(S.fini){V.nids.push({k:V.cour.k,r:V.cour.r,graine:V.cour.graine,basse:S.basse,haute:S.haute,ouvert:S.ouvert,kmax:S.kmax,texte:intervalle(S),
      dans:contient(S,V.cour.k),gerud:V.cour.gerud,
      hyp:S.hyp.map(function(h){return {k:h.k,ge:h.ge,le:h.le};})});V.cour=null;V.i++;if(V.i>=V.file.length)V.fini=true;}}
  return V;}

// Fréquences de référence données par leurs seuls comptes d'allèles (comptes[l] = {allèle: nombre}) : génotypes fictifs
// qui ont exactement ces comptes (allèles triés, pris deux à deux), pour servir de référence. Seuls les comptes importent.
function genotypesDeComptes(comptes){var cols=comptes.map(function(c){var t=[];Object.keys(c).map(Number).sort(function(a,b){return a-b;}).forEach(function(a){for(var i=0;i<c[a];i++)t.push(a);});
    var g=[];for(var i=0;i+1<t.length;i+=2)g.push([t[i],t[i+1]]);return g;}),n=Math.max.apply(null,cols.map(function(c){return c.length;})),out=[];
  for(var i=0;i<n;i++)out.push(cols.map(function(c){return c[i]||null;}));return out;}

var api={genotypesDeComptes:genotypesDeComptes,alleleMale:alleleMale,observer:observer,tablePartitions:tablePartitions,tirerPartition:tirerPartition,simulerUne:simulerUne,creerAnalyse:creerAnalyse,avancerAnalyse:avancerAnalyse,intervalle:intervalle,contient:contient,avecErreur:avecErreur,paternels:paternels,couvrable:couvrable,minPeres:minPeres,nidArtificiel:nidArtificiel,creerValidation:creerValidation,avancerValidation:avancerValidation};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Males=api;
})(this);
