// Grands échantillons pour test-stat.R : 200 répétitions (graines 1 à 200) de 2000 parents tirés selon les fréquences
// du pool, et 200 croisements de 2000 juvéniles (graines 100001 à 100200). Usage : node test-repetitions.js <dossier>
// 200 répétitions : 2000 parents (fréquences) et un croisement de 2000 juvéniles (Mendel), graines 1..200
const S=require('./simulation.js'),fs=require('fs');
const ex=JSON.parse(fs.readFileSync(require('path').join(__dirname,'exemple.json'),'utf8'));const L=11,F=S.frequences([].concat(...ex.pool.map(f=>f.genotypes)),L);
const P=['rep,locus,allele'],C=['rep,locus,m1,m2,p1,p2,j1,j2'];
for(let r=1;r<=200;r++){const T=Array.from({length:1000},(_,i)=>({colonne:i+1,femelle:'F'+i,croisements:[{male:'M'+i,n:1}]}));const s=S.simuler(F,T,r);
 s.parents.forEach(p=>p.geno.forEach((g,l)=>{P.push(r+','+l+','+g[0]);P.push(r+','+l+','+g[1]);}));
 const t=S.simuler(F,[{colonne:1,femelle:'F',croisements:[{male:'M',n:2000}]}],100000+r);t.fichiers[0].juveniles.forEach(j=>j.geno.forEach((g,l)=>C.push([r,l,...t.parents[0].geno[l],...t.parents[1].geno[l],...g].join(','))));}
fs.writeFileSync(process.argv[2]+'/parents.csv',P.join('\n'));fs.writeFileSync(process.argv[2]+'/croisements.csv',C.join('\n'));
fs.writeFileSync(process.argv[2]+'/frequences.csv','locus,allele,compte\n'+F.map((f,l)=>f.alleles.map((a,i)=>l+','+a+','+f.comptes[i]).join('\n')).join('\n'));
