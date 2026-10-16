// Test de la bibliothèque (node) :
// 1) fréquences, lecture du tableau et simulations identiques, juvénile par juvénile, au calcul Python indépendant
//    (attendu-simulation.json, 4 graines) ;
// 2) cohérence mendélienne : chaque juvénile porte, à chaque locus, un allèle de sa mère et un de son père ;
// 3) générateur contre le code C de référence (si XOSHIRO_REF est fourni). Tests statistiques : test-repetitions.js et test-stat.R.
const S=require('./simulation.js'),fs=require('fs'),path=require('path');
const ex=JSON.parse(fs.readFileSync(path.join(__dirname,'exemple.json'),'utf8')),A=JSON.parse(fs.readFileSync(path.join(__dirname,'attendu-simulation.json'),'utf8'));
const L=ex.loci.length,pool=[].concat(...ex.pool.map(f=>f.genotypes)),F=S.frequences(pool,L);let ko=0;
const fr=JSON.stringify(F.map(f=>[f.alleles,f.comptes,f.total]));if(fr!==JSON.stringify(A.frequences)){ko++;console.log('ÉCHEC fréquences');}
const T=S.lireTableau(ex.lignesTableau);if(JSON.stringify(T)!==JSON.stringify(ex.tableau)){ko++;console.log('ÉCHEC tableau',JSON.stringify(T));}
let nj=0;for(const [g,a] of Object.entries(A.simulations)){const r=S.simuler(F,T,+g);
 const p={};r.parents.forEach(x=>p[x.sexe+':'+x.nom]=x.geno);if(JSON.stringify(Object.keys(p).sort().map(k=>[k,p[k]]))!==JSON.stringify(Object.keys(a.parents).sort().map(k=>[k,a.parents[k]]))){ko++;console.log('ÉCHEC parents, graine',g);}
 r.fichiers.forEach((f,i)=>f.juveniles.forEach((j,k)=>{nj++;const b=a.fichiers[i][k];if(!b||j.id!==b.id||j.mere!==b.mere||j.pere!==b.pere||JSON.stringify(j.geno)!==JSON.stringify(b.geno))ko++;
  j.geno.forEach((x,l)=>{const m=p['F:'+j.mere][l],q=p['M:'+j.pere][l];if(!((m.includes(x[0])&&q.includes(x[1]))||(m.includes(x[1])&&q.includes(x[0]))))ko++;});}));}
console.log('identique au calcul Python :',ko?'NON':'oui','—',nj,'juvéniles,',Object.keys(A.simulations).length,'graines ; cohérence mendélienne vérifiée');
// Générateur contre le code C de référence (XOSHIRO_REF : exécutable compilé de xoshiro128ss_ref.c)
if(process.env.XOSHIRO_REF){const {execFileSync}=require('child_process');let b=0,t=0;
 for(const [g,n] of [['e',1000000],['0',100000],['12345',1000000],['4294967295',100000],['2718281828',100000]]){
  const ref=execFileSync(process.env.XOSHIRO_REF,[g,String(n)],{maxBuffer:1<<28}).toString().trim().split('\n').map(Number);
  let nx;if(g==='e')nx=S.xoshiro128ss([1,2,3,4]);else{const sm=S.splitmix32(+g);nx=S.xoshiro128ss([sm(),sm(),sm(),sm()]);}
  for(let i=0;i<n;i++)if(nx()!==ref[i])b++;t+=n;}
 if(b)ko++;console.log('générateur contre le code C de référence :',t,'valeurs, écarts',b);}
// Bilan : 300 itérations, graine 12345, identique au calcul Python indépendant (attendu-bilan.json)
const AB=JSON.parse(fs.readFileSync(path.join(__dirname,'attendu-bilan.json'),'utf8'));const B=S.avancerBilan(S.creerBilan(F,T,AB.graine),AB.iterations);
const champs=['nom','femelle','colonnes','juste','faux','deuxUnJuste','deuxZeroJuste','nonResolu','fauxLocus'],okB=JSON.stringify(B.lignes.map(l=>champs.map(c=>l[c])))===JSON.stringify(AB.lignes.map(l=>champs.map(c=>l[c])));
if(!okB)ko++;console.log('bilan de',AB.iterations,'itérations :',okB?'identique au calcul Python':'DIFFÉRENT');
const r2=S.simuler(F,T,12345),r3=S.simuler(F,T,12346);console.log('même graine → même simulation :',JSON.stringify(r2)===JSON.stringify(S.simuler(F,T,12345)),'; graine voisine → différente :',JSON.stringify(r2)!==JSON.stringify(r3));
process.exit(ko?1:0);
