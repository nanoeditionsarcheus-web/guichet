// Test de la page (Chromium/Playwright) : les 63 combinaisons de l'exemple, comparées à validation/attendu.json
// (calcul Python indépendant), puis téléversement de fichiers et taille maximale réduite.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os');
const V=__dirname,A=JSON.parse(fs.readFileSync(path.join(V,'attendu.json'),'utf8'));
(async()=>{const br=await chromium.launch(),pg=await br.newPage({viewport:{width:1300,height:900}}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.join(V,'..','index.html'));await pg.waitForFunction(()=>CUR&&CUR.res);
 const R=await pg.evaluate(()=>CUR.res.map(r=>({comb:r.comb,n:r.n,nComplets:r.nComplets,geno:r.geno,incompatibles:r.incompatibles})));
 let d=0;A.forEach((a,i)=>{const r=R[i];if(!r||JSON.stringify(r.comb)!==JSON.stringify(a.comb)||r.n!==a.n||r.nComplets!==a.nComplets||JSON.stringify(r.geno)!==JSON.stringify(a.geno)||(r.geno&&r.incompatibles!==a.incompatibles))d++;});
 console.log('exemple :',R.length,'combinaisons ; écarts avec le calcul indépendant :',d,'(attendu',A.length,')');
 console.log('génotypes distincts :',await pg.evaluate(()=>Combinaisons.distincts(CUR.res).map(x=>x.num+' ('+x.combs.length+' comb.)').join(', ')));
 // téléversement : 3 fichiers FLOCK, taille maximale 2
 const ex=await pg.evaluate(()=>EXAMPLE);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cb-'));const files=[];
 ex.fichiers.slice(0,3).forEach((f,i)=>{const p=path.join(dir,f.nom.replace(' ','-')+'.csv');fs.writeFileSync(p,['ID;'+ex.loci.map(l=>l+';').join('')].concat(f.juveniles.map((j,k)=>['J'+i+'_'+k].concat(j.map(g=>g?g.join(';'):'0;0')).join(';'))).join('\n'));files.push(p);});
 await pg.setInputFiles('#upF',files);await pg.click('#go');
 await pg.waitForFunction(()=>CUR.label==='fichiers téléversés'&&CUR.res);
 console.log('téléversés :',await pg.textContent('#info'),'| lignes',await pg.evaluate(()=>CUR.res.length));
 if(process.argv[2]){await pg.click('#upReset');await pg.waitForFunction(()=>CUR.res&&CUR.res.length===63);await pg.screenshot({path:process.argv[2],fullPage:true});}
 console.log('erreurs JS',errs);await br.close();process.exit(d||errs.length?1:0);})();
