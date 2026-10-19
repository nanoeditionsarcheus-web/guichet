// Calibration : nids simulés dont on connaît le nombre de mâles (k = 1, 2, 3, 5), méthode appliquée telle quelle.
// Population : fréquences du pool des six fichiers de P. Duchesne (exemple de la page « Génération de juvéniles
// artificiels »). Chaque nid : une femelle et k mâles tirés selon ces fréquences, n juvéniles répartis entre les
// mâles selon une partition tirée uniformément. Deux sources de fréquences pour la méthode :
//  - « nid » : les juvéniles du nid seul (description de la méthode) ;
//  - « référence » : 10 autres nids de la même population (20 juvéniles, 2 mâles chacun) plus le nid analysé.
// On compte, sur R nids, l'estimation obtenue et le pourcentage de nids où l'hypothèse vraie est rejetée
// (attendu : au plus 5 % pour un test au seuil de 0,05). Usage : node calibration.js [n] [R] [N]
const M=require('./males.js'),S=require('../../simulation-juveniles/validation/simulation.js');
const ex=JSON.parse(require('fs').readFileSync(__dirname+'/../../simulation-juveniles/validation/exemple.json','utf8'));
const pool=[].concat(...ex.pool.map(p=>p.genotypes)),L=11,fr=S.frequences(pool,L);
const n=+process.argv[2]||20,R=+process.argv[3]||200,N=+process.argv[4]||1000,KMAX=10;
const parent=u=>fr.map(f=>[S.tirerAllele(f,u()),S.tirerAllele(f,u())].sort((a,b)=>a-b));
const enfant=(f,m,u)=>f.map((g,l)=>{const a=g[u()<.5?0:1],b=m[l][u()<.5?0:1];return a<b?[a,b]:[b,a];});
for(const src of ['nid','référence'])for(const k of [1,2,3,5]){const u=S.generateur(1000*k+7),est={};let rej=0;
  for(let r=0;r<R;r++){const fem=parent(u),mal=[];for(let m=0;m<k;m++)mal.push(parent(u));
    const J=[];M.tirerPartition(n,k,M.tablePartitions(n,k),u).forEach((p,m)=>{for(let i=0;i<p;i++)J.push(enfant(fem,mal[m],u));});
    let ref;if(src==='référence'){ref=J.slice();for(let q=0;q<10;q++){const f2=parent(u),m2=[parent(u),parent(u)];for(let i=0;i<20;i++)ref.push(enfant(f2,m2[i%2],u));}}
    const A=M.avancerAnalyse(M.creerAnalyse(J,fem,{N:N,seuil:0.05,kmax:KMAX,graine:r+1,ref:ref}),1e12);
    const e=A.retenue||'>'+KMAX;est[e]=(est[e]||0)+1;const h=A.hyp.find(h=>h.k===k);if(h&&!h.acceptee)rej++;}
  console.log('fréquences : '+src+' | vrai k = '+k+' | n = '+n+' | estimations '+JSON.stringify(est)+' | hypothèse vraie rejetée : '+(100*rej/R).toFixed(1)+' %');}
