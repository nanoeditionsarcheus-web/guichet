// Test de la bibliothèque males.js contre la réimplantation Python indépendante (attendu.json, écrit par verifier.py),
// contre la suite A008284 de l'OEIS, et uniformité du tirage des partitions.
const M=require('./males.js'),S=require('../../simulation-juveniles/validation/simulation.js'),fs=require('fs'),path=require('path');
const A=JSON.parse(fs.readFileSync(path.join(__dirname,'attendu.json'),'utf8')),ex=JSON.parse(fs.readFileSync(path.join(__dirname,'exemple.json'),'utf8'));
let ko=0;const ok=(c,m)=>{if(!c)ko++;console.log((c?'OK    ':'ÉCHEC ')+m);};
// 1) Partitions : table JS = Python ; quelques valeurs publiées (OEIS A008284, ligne n = 10 ; p(20,2) = 10 comme dans la description de la méthode)
const P=M.tablePartitions(40,40);let dp=0;for(const [nk,v] of Object.entries(A.partitions)){const [n,k]=nk.split(',').map(Number);if(P[n][k]!==v)dp++;}
ok(dp===0,'nombre de partitions p(n,k), n ≤ 40 : identique au calcul Python ('+Object.keys(A.partitions).length+' valeurs)');
ok(JSON.stringify(P[10].slice(1,11))==='[1,5,8,9,7,5,3,2,1,1]'&&P[20][2]===10&&P[40].slice(1).reduce((a,b)=>a+b,0)===37338,'OEIS A008284 : ligne n = 10 = 1 5 8 9 7 5 3 2 1 1 ; p(20,2) = 10 ; somme de la ligne 40 = p(40) = 37338');
// 2) Uniformité : 12 juvéniles, 4 mâles (15 partitions), 300 000 tirages ; khi-deux
{const u=S.generateur(4242),Q=M.tablePartitions(12,4),c={};const N=300000;for(let i=0;i<N;i++){const p=M.tirerPartition(12,4,Q,u);if(p.reduce((a,b)=>a+b,0)!==12||p.length!==4)ko++;const k=p.join('+');c[k]=(c[k]||0)+1;}
 const K=Object.keys(c),e=N/Q[12][4],x2=K.reduce((s,k)=>s+(c[k]-e)**2/e,0);
 ok(K.length===15&&x2<29.14,'tirage des partitions de 12 en 4 parts : '+K.length+' partitions distinctes, khi-deux = '+x2.toFixed(2)+' (14 d.l. ; seuil 1 % = 29,14)');}
// 3) Analyses complètes : distributions et décisions identiques à Python
const R=path.join(__dirname,'../../reconstitution-femelle/validation/jeux');
const lire=f=>{const rows=fs.readFileSync(f,'utf8').replace(/^﻿/,'').trim().split(/\r?\n/).map(l=>l.split(';'));const L=(rows[0].length-1)/2|0;
  return rows.slice(1).map(r=>{const g=[];for(let k=0;k<L;k++){const a=+r[1+2*k],b=+r[2+2*k];g.push(a&&b?[a,b]:null);}return g;});};
// Référence de l'exemple (comptes d'allèles des 23 nids) : les génotypes fictifs ont exactement ces comptes
const refNids=M.genotypesDeComptes(ex.reference.comptes);
{let d=0;ex.reference.comptes.forEach((c,l)=>{const m={};refNids.forEach(g=>{if(g[l])g[l].forEach(a=>{m[a]=(m[a]||0)+1;});});if(JSON.stringify(Object.keys(m).sort())!==JSON.stringify(Object.keys(c).sort())||Object.keys(c).some(a=>m[a]!==c[a]))d++;});
 ok(d===0,'référence de l\'exemple : génotypes fictifs aux mêmes comptes d\'allèles que les 23 nids ('+refNids.length+' lignes)');}
for(const c of A.cas){const juv=c.juv||ex.juveniles,fem=c.femelle||ex.femelle,ref=c.nom==='exemple-nids'?refNids:c.reference?[].concat(...c.reference.map(n=>lire(path.join(R,n,n+'-FLOCK.csv')))):undefined;
  const T=M.avancerAnalyse(M.creerAnalyse(juv,fem,{N:c.N,seuil:c.seuil,kmax:c.kmax,graine:c.graine,ref:ref}),1e12);
  const js=T.hyp.map(h=>{const d={};h.dist.forEach((v,t)=>{if(v)d[t]=v;});return {k:h.k,dist:d,ge:h.ge,le:h.le};});
  const py=c.hyp.map(h=>({k:h.k,dist:h.dist,ge:h.ge,le:h.le}));
  ok(T.O.total===c.total&&JSON.stringify(T.O.analyses)===JSON.stringify(c.analyses)&&JSON.stringify(js)===JSON.stringify(py)&&T.basse===c.basse&&T.haute===c.haute&&T.ouvert===c.ouvert,
    c.nom+', graine '+c.graine+' : '+c.hyp.length+' hypothèse(s) × '+c.N+' simulations, distributions et p-valeurs (droite, gauche) identiques ; intervalle « '+M.intervalle(T)+' » (Python '+c.basse+'–'+c.haute+(c.ouvert?' ouvert':'')+')');}
// 3 bis) Simulateur de validation : nids artificiels et intervalles identiques à Python
for(const v of A.validation){const juv=v.nom==='synthetique'?A.cas.find(c=>c.nom==='synthetique').juv:ex.juveniles,fem=v.nom==='synthetique'?A.cas.find(c=>c.nom==='synthetique').femelle:ex.femelle;
  const ref=v.reference==='exemple'?refNids:v.reference?[].concat(...v.reference.map(n=>lire(path.join(R,n,n+'-FLOCK.csv')))):undefined,gerud=v.nids[0].gerud!==null;
  const W=M.creerValidation(juv,fem,{N:v.N,seuil:v.seuil,kmax:v.kmax,kmaxSim:v.kmaxSim,R:v.R,graine:v.graine,ref:ref,erreur:v.erreur||0,gerud:gerud});while(!W.fini)M.avancerValidation(W,250);
  const js=W.nids.map(x=>({k:x.k,r:x.r,graine:x.graine,basse:x.basse,haute:x.haute,ouvert:x.ouvert,dans:x.dans,gerud:x.gerud?(x.gerud.exact?x.gerud.min:'≥'+x.gerud.min):null,gerudVrai:x.gerudVrai?(x.gerudVrai.exact?x.gerudVrai.min:'≥'+x.gerudVrai.min):null,hyp:x.hyp}));
  const py=v.nids.map(x=>({k:x.k,r:x.r,graine:x.graine,basse:x.basse,haute:x.haute,ouvert:x.ouvert,dans:x.dans,gerud:x.gerud,gerudVrai:x.gerudVrai,hyp:x.hyp}));
  ok(JSON.stringify(js)===JSON.stringify(py),'simulateur de validation, '+v.nom+(v.erreur?' (erreurs '+100*v.erreur+' %)':'')+' : '+v.nids.length+' nids artificiels, intervalles'+(gerud?' et nombres minimaux de pères':'')+' identiques — '+W.nids.map(x=>x.k+' → '+x.texte+(gerud?' / '+x.gerud.min+(v.erreur?' (sans erreur '+x.gerudVrai.min+')':''):'')).join(' ; '));}
// 3 ter) Nombre minimal de pères : exemple et 40 petits nids (contrôlés en Python par force brute)
{let d=0;A.gerud.forEach(c=>{const r=M.minPeres(c.juv,c.femelle);if(!r.exact||r.min!==c.min)d++;});
 ok(d===0,'nombre minimal de pères : '+A.gerud.length+' nids, identique à Python (recherche différente ; force brute pour les petits nids) ; exemple : '+A.gerud[0].min);}
// 3 quater) Erreurs de génotypage : voisins, bouts de la suite, fréquences (un million de tirages, taux 2 %)
{const S=require('../../simulation-juveniles/validation/simulation.js'),u=S.generateur(9),al=[124,126,128,132,136,138],c={};const N=1e6;
 for(let i=0;i<N;i++){const a=M.avecErreur(132,al,0.02,u);c[a]=(c[a]||0)+1;}const g={};for(let i=0;i<N;i++){const a=M.avecErreur(124,al,0.02,u);g[a]=(g[a]||0)+1;}
 const p=x=>(x/N*100).toFixed(2);
 ok(Object.keys(c).join()==='128,132,136'&&Math.abs(c[128]/N-0.01)<0.0006&&Math.abs(c[136]/N-0.01)<0.0006&&Object.keys(g).join()==='124,126'&&Math.abs(g[126]/N-0.01)<0.0006&&M.avecErreur(132,al,0,u)===132,
   'erreurs (2 %) : 132 → 128 '+p(c[128])+' %, 136 '+p(c[136])+' % ; 124 (bout) → 126 '+p(g[126])+' % (attendu 1 % chacun) ; taux 0 : aucun tirage');}
// 4) Lots : le résultat ne dépend pas du découpage du calcul
{const o={N:700,seuil:0.05,kmax:6,graine:31};const a=M.avancerAnalyse(M.creerAnalyse(ex.juveniles,ex.femelle,o),1e12),b=M.creerAnalyse(ex.juveniles,ex.femelle,o);while(!b.fini)M.avancerAnalyse(b,137);
 ok(JSON.stringify(a.hyp)===JSON.stringify(b.hyp)&&a.basse===b.basse&&a.haute===b.haute,'calcul par lots de 137 = calcul d\'un trait');}
// 5) Cas particuliers de l'allèle mâle
{const c=x=>({1:5,2:3,5:2,6:2})[x]||0;
 ok(M.alleleMale([1,3],[1,2],c)===3&&M.alleleMale([1,2],[1,2],c)===1&&M.alleleMale([5,6],[5,6],c)===5&&M.alleleMale([3,4],[1,2],c)===null&&M.alleleMale(null,[1,2],c)===null&&M.alleleMale([1,1],[1,1],c)===1&&M.alleleMale([1,7],[1,1],c)===7&&M.alleleMale([2,2],[1,2],c)===2,
   'allèle mâle : cas simple, génotype de la femelle (le plus fréquent ; égalité → le plus petit), incompatible, manquant, femelle homozygote');}
console.log(ko?'ÉCHECS '+ko:'TOUT OK');process.exit(ko?1:0);
