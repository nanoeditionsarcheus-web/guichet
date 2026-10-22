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
// sansErreur (facultatif) : tableau qui reçoit le même nid sans les erreurs de génotypage (mêmes tirages).
function nidArtificiel(juvNat,femelle,freqs,k,P,u,e,sansErreur){
  var n=juvNat.length,L=femelle.length,males=[];
  for(var m=0;m<k;m++){var g=[];for(var l=0;l<L;l++)g.push(femelle[l]?[Sim.tirerAllele(freqs[l],u()),Sim.tirerAllele(freqs[l],u())]:null);males.push(g);}
  var parts=tirerPartition(n,k,P,u),perm=[];for(var i=0;i<n;i++)perm.push(i);
  for(i=n-1;i>0;i--){var j=Math.floor(u()*(i+1)),x=perm[i];perm[i]=perm[j];perm[j]=x;}
  var pere=new Array(n),c=0;parts.forEach(function(p,m){for(var r=0;r<p;r++)pere[perm[c++]]=m;});
  var J=[];for(i=0;i<n;i++){var g2=[],g0=[];for(l=0;l<L;l++){if(!juvNat[i][l]||!femelle[l]){g2.push(null);g0.push(null);continue;}
    var a0=u()<0.5?femelle[l][0]:femelle[l][1],a=avecErreur(a0,freqs[l].alleles,e,u);
    var mg=males[pere[i]][l],b0=u()<0.5?mg[0]:mg[1],b=avecErreur(b0,freqs[l].alleles,e,u);g2.push(a<b?[a,b]:[b,a]);g0.push(a0<b0?[a0,b0]:[b0,a0]);}
    J.push(g2);if(sansErreur)sansErreur.push(g0);}
  return J;}
// ---------- Nombre minimal de pères (la quantité que calcule GERUD : Jones 2001, 2005) ----------
// Allèles paternels possibles d'un juvénile à un locus, d'après la femelle : un seul, ou deux quand le juvénile a le
// génotype de la femelle hétérozygote (sans choisir : chacun est possible). null : juvénile manquant, femelle inconnue
// ou juvénile incompatible (aucun allèle de la femelle) ; le locus n'impose alors aucune contrainte à ce juvénile.
function paternels(j,f){if(!j||!f)return null;var x=j[0],y=j[1],c=[];
  if(x===f[0]||x===f[1])c.push(y);if((y===f[0]||y===f[1])&&c.indexOf(x)<0)c.push(x);return c.length?c.sort(function(a,b){return a-b;}):null;}
// Génotypes encore possibles d'un père à un locus : paires [a, b] ; b = 0 : second allèle quelconque ; null : aucune
// contrainte. affiner() garde ceux qui transmettent un allèle de S (allèles paternels possibles d'un nouveau juvénile).
function affiner(G,S){if(G===null)return S.map(function(s){return [s,0];});var out=[],vu={};
  function aj(a,b){var c=a*1000003+b;if(!vu[c]){vu[c]=1;out.push([a,b]);}}
  for(var i=0;i<G.length;i++){var a=G[i][0],b=G[i][1];
    if(S.indexOf(a)>=0||(b!==0&&S.indexOf(b)>=0))aj(a,b);else if(b===0)for(var j=0;j<S.length;j++){var t=S[j];if(a<t)aj(a,t);else aj(t,a);}}
  return out;}
// Plus petit nombre de pères tel que les juvéniles se répartissent entre eux, chaque père transmettant, à chaque locus,
// un allèle possible de chacun de ses juvéniles avec deux allèles au plus. Recherche exhaustive pour k = borne
// inférieure, k + 1, … (borne : à chaque locus, allèles paternels certains / 2). À chaque pas, on place le juvénile qui
// a le moins de pères possibles (pères déjà ouverts, ou un nouveau tant qu'il en reste) ; s'il n'en a aucun, on recule.
// Placer un juvénile ne change qu'un père : seules ses possibilités sont recalculées. Au-delà de « budget » pas pour un
// k (simulateur seulement), la recherche s'arrête : le résultat est alors une borne (au moins k pères).
// Plafond de la recherche dans le simulateur (pas par nombre de pères essayé) : il garde le simulateur rapide et
// reproductible ; dans l'estimation du nid, la recherche n'a pas de plafond (elle se fait en arrière-plan).
var BUDGET_SIMULATEUR=200000;
function minPeres(juv,femelle,opts){opts=opts||{};var kmax=opts.kmax||20,budget=opts.budget||Infinity,L=femelle.length;
  var C=juv.map(function(g){return femelle.map(function(f,l){return paternels(g[l],f);});}).filter(function(c){return c.some(function(x){return x;});});
  var n=C.length;if(!n)return {min:0,exact:true,n:0,pas:0};
  var bi=1;for(var l=0;l<L;l++){var s={};C.forEach(function(c){if(c[l]&&c[l].length===1)s[c[l][0]]=1;});bi=Math.max(bi,Math.ceil(Object.keys(s).length/2));}
  function placer(g,c){var r=[];for(var l=0;l<L;l++){if(!c[l]){r.push(g[l]);continue;}var a=affiner(g[l],c[l]);if(!a.length)return null;r.push(a);}return r;}
  // Coupe : à chaque locus, les allèles paternels certains des juvéniles restants qu'aucun père ouvert ne porte déjà
  // doivent trouver place : un par père ouvert dont le second allèle est encore libre, deux par père encore disponible.
  function assez(groupes,reste){for(var l=0;l<L;l++){var connus={},libres=0,nouveaux={},nn=0;
      for(var g=0;g<groupes.length;g++){var G=groupes[g][l];if(G===null){libres+=2;continue;}var lib=false;
        for(var t=0;t<G.length;t++){connus[G[t][0]]=1;if(G[t][1]===0)lib=true;else connus[G[t][1]]=1;}if(lib)libres++;}
      for(var q=0;q<reste.length;q++){var S=C[reste[q]][l];if(S&&S.length===1&&!connus[S[0]]&&!nouveaux[S[0]]){nouveaux[S[0]]=1;nn++;}}
      if(nn>libres+2*(K-groupes.length))return false;}
    return true;}
  var K;
  var vide=femelle.map(function(){return null;}),NEUF=C.map(function(c){return placer(vide,c);}),pasTotal=0;
  for(var k=bi;k<=Math.min(kmax,n);k++){var pas=0,trop=false;K=k;if(opts.suivi)opts.suivi(k,pasTotal);
    // P[q] : pour le juvénile reste[q], son état chez chaque père ouvert (null : impossible)
    var rec=function(groupes,reste,P){if(!reste.length)return true;if(++pas>budget){trop=true;return false;}
      if(!assez(groupes,reste))return false;
      var best=-1,nb=Infinity;for(var q=0;q<reste.length;q++){var m=(groupes.length<k?1:0);for(var g=0;g<P[q].length;g++)if(P[q][g])m++;
        if(m<nb){nb=m;best=q;if(m<=1)break;}}
      if(nb===0)return false;
      var i=reste[best],choix=[];for(g=0;g<groupes.length;g++)if(P[best][g])choix.push(g);if(groupes.length<k)choix.push(groupes.length);
      for(var x=0;x<choix.length;x++){g=choix[x];var neuf=g===groupes.length,etat=neuf?NEUF[i]:P[best][g],ng=groupes.slice();ng[g]=etat;
        var r2=[],P2=[];for(q=0;q<reste.length;q++){if(q===best)continue;var j=reste[q],v=P[q].slice();v[g]=neuf||v[g]?placer(etat,C[j]):null;r2.push(j);P2.push(v);}
        if(rec(ng,r2,P2))return true;if(trop)return false;}
      return false;};
    var ok=rec([],C.map(function(_,i){return i;}),C.map(function(){return [];}));pasTotal+=pas;
    if(ok)return {min:k,exact:true,n:n,pas:pasTotal};if(trop)return {min:k,exact:false,n:n,pas:pasTotal};}
  return {min:Math.min(kmax,n)+1,exact:false,n:n,pas:pasTotal};}

function creerValidation(juvNat,femelle,opts){var K=Math.min(opts.kmaxSim,juvNat.length),file=[];
  for(var k=1;k<=K;k++)for(var r=0;r<opts.R;r++)file.push({k:k,r:r});
  return {juv:juvNat,femelle:femelle,opts:opts,freqs:Sim.frequences(opts.ref||juvNat,femelle.length),u:Sim.generateur(opts.graine),
    P:tablePartitions(juvNat.length,K),file:file,i:0,cour:null,nids:[],fini:!file.length};}
function avancerValidation(V,lot){var o=V.opts;
  while(lot>0&&!V.fini){
    if(!V.cour){var e=V.file[V.i],J0=[],J=nidArtificiel(V.juv,V.femelle,V.freqs,e.k,V.P,V.u,o.erreur||0,J0),g=Math.floor(V.u()*4294967296),G=null,G0=null;
      // GERUD sur le nid artificiel, et « vrai minimum » : le même calcul sur le même nid sans erreurs de génotypage
      if(o.gerud){var bg={budget:o.budgetGerud||BUDGET_SIMULATEUR};G=minPeres(J,V.femelle,bg);G0=o.erreur>0?minPeres(J0,V.femelle,bg):G;}
      V.cour={k:e.k,r:e.r,graine:g,S:creerAnalyse(J,V.femelle,{N:o.N,seuil:o.seuil,kmax:o.kmax,graine:g,ref:o.ref}),gerud:G,gerudVrai:G0};}
    var S=V.cour.S,m=Math.min(lot,S.N);avancerAnalyse(S,m);lot-=m;
    if(S.fini){V.nids.push({k:V.cour.k,r:V.cour.r,graine:V.cour.graine,basse:S.basse,haute:S.haute,ouvert:S.ouvert,kmax:S.kmax,texte:intervalle(S),
      dans:contient(S,V.cour.k),gerud:V.cour.gerud,gerudVrai:V.cour.gerudVrai,
      hyp:S.hyp.map(function(h){return {k:h.k,ge:h.ge,le:h.le};})});V.cour=null;V.i++;if(V.i>=V.file.length)V.fini=true;}}
  return V;}

// Fréquences de référence données par leurs seuls comptes d'allèles (comptes[l] = {allèle: nombre}) : génotypes fictifs
// qui ont exactement ces comptes (allèles triés, pris deux à deux), pour servir de référence. Seuls les comptes importent.
function genotypesDeComptes(comptes){var cols=comptes.map(function(c){var t=[];Object.keys(c).map(Number).sort(function(a,b){return a-b;}).forEach(function(a){for(var i=0;i<c[a];i++)t.push(a);});
    var g=[];for(var i=0;i+1<t.length;i+=2)g.push([t[i],t[i+1]]);return g;}),n=Math.max.apply(null,cols.map(function(c){return c.length;})),out=[];
  for(var i=0;i<n;i++)out.push(cols.map(function(c){return c[i]||null;}));return out;}

var api={BUDGET_SIMULATEUR:BUDGET_SIMULATEUR,genotypesDeComptes:genotypesDeComptes,alleleMale:alleleMale,observer:observer,tablePartitions:tablePartitions,tirerPartition:tirerPartition,simulerUne:simulerUne,creerAnalyse:creerAnalyse,avancerAnalyse:avancerAnalyse,intervalle:intervalle,contient:contient,avecErreur:avecErreur,paternels:paternels,affiner:affiner,minPeres:minPeres,nidArtificiel:nidArtificiel,creerValidation:creerValidation,avancerValidation:avancerValidation};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Males=api;
})(this);
