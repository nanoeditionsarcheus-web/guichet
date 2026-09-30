// Test de bout en bout de la page (Chromium/Playwright) : exemple, fichiers téléversés, femelles connues, renommage.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os');
const V=__dirname,R=path.join(V,'../../reconstitution-femelle/validation');const A=JSON.parse(fs.readFileSync(path.join(V,'attendu.json'),'utf8'));
const lire=()=>({cells:[...document.querySelectorAll('#tc tbody tr')].map(t=>[...t.querySelectorAll('td.cell b')].map(b=>+b.textContent)),
  fem:[...document.querySelectorAll('#tc tbody tr td:first-child')].map(t=>t.textContent),grp:[...document.querySelectorAll('#tc thead th')].slice(1).map(t=>t.firstChild.textContent)});
const attendu=Object.values(A.comptes);
const cmp=(c)=>c.cells.length===attendu.length&&c.cells.every((r,i)=>r.length===attendu[i].length&&r.every((v,j)=>v===attendu[i][j]));
(async()=>{const br=await chromium.launch(),pg=await br.newPage({viewport:{width:1100,height:900}}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.join(V,'..','index.html'));
 let c=await pg.evaluate(lire);console.log('exemple : femelles',c.fem.join(', '),'| groupes',c.grp.join(', '),'| identique au calcul indépendant :',cmp(c));
 await pg.setInputFiles('#upRef',['donnees/exemple-maple-FLOCK.csv','jeux/Rose/Rose-FLOCK.csv','jeux/Turquoise/Turquoise-FLOCK.csv','jeux/Blanche/Blanche-FLOCK.csv'].map(f=>path.join(R,f)));
 await pg.setInputFiles('#upTest',path.join(R,'jeux/Inc_1/Inc_1-FLOCK.csv'));await pg.click('#upLoad');
 await pg.waitForFunction(()=>/téléversés/.test(document.getElementById('foot').textContent));
 c=await pg.evaluate(lire);console.log('téléversés :',await pg.textContent('#upStatus'),'| identique :',cmp(c));
 // femelles connues : fichier FLOCK avec les 3 femelles de référence ; sans groupe de référence, on doit retrouver les mêmes rangées
 const head=fs.readFileSync(path.join(R,'donnees/exemple-maple-FLOCK.csv'),'utf8').replace(/^﻿/,'').split(/\r?\n/)[0];
 const tmp=path.join(os.tmpdir(),'femelles-test.csv');fs.writeFileSync(tmp,[head].concat(Object.entries(A.femelles).map(([n,g])=>['F'+n].concat(g.flat()).join(';'))).join('\n'));
 await pg.setInputFiles('#upRef',[]);await pg.setInputFiles('#upFem',tmp);
 await pg.setInputFiles('#upTest',['donnees/exemple-maple-FLOCK.csv','jeux/Rose/Rose-FLOCK.csv','jeux/Turquoise/Turquoise-FLOCK.csv','jeux/Blanche/Blanche-FLOCK.csv','jeux/Inc_1/Inc_1-FLOCK.csv'].map(f=>path.join(R,f)));
 await pg.click('#upLoad');await pg.waitForFunction(()=>/testé\(s\), 3 femelle/.test(document.getElementById('upStatus').textContent));
 c=await pg.evaluate(lire);console.log('femelles connues seulement :',c.fem.join(', '),'| identique :',cmp(c));
 await pg.click('#upReset');await pg.fill('#noms input[data-f="0"]','Femelle A');await pg.fill('#noms input[data-g="4"]','Nid mystère');
 c=await pg.evaluate(lire);console.log('renommage :',c.fem[0],'/',c.grp[4]);
 if(process.argv[2])await pg.screenshot({path:process.argv[2],fullPage:true});
 console.log('erreurs JS',errs);await br.close();})();
