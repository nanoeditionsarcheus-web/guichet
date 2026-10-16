// Test de la page (Chromium/Playwright). XLSX_JS : chemin de xlsx.full.min.js 0.18.5 (la page le charge en ligne).
// 1) exemple, graine imposée : juvéniles identiques au calcul Python indépendant (attendu-simulation.json) ;
// 2) archive .zip : liste des fichiers, contenu relu (FLOCK) identique à la simulation ;
// 3) sans graine : une nouvelle graine à chaque simulation ;
// 4) tableau des croisements téléversé (.xlsx) et pool téléversé ;
// 5) bout en bout : les fichiers produits, chargés dans la page « Agréger », réunissent les deux fichiers de F2.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const V=__dirname,A=JSON.parse(fs.readFileSync(path.join(V,'attendu-simulation.json'),'utf8')),XL=fs.readFileSync(process.env.XLSX_JS,'utf8'),X=require(process.env.XLSX_JS.replace(/dist\/xlsx\.full\.min\.js$/,''));
let ko=0;const T=fs.mkdtempSync(path.join(os.tmpdir(),'sim-'));
(async()=>{const br=await chromium.launch(),errs=[];
 async function page(u){const pg=await br.newPage({acceptDownloads:true,viewport:{width:1250,height:900}});pg.on('pageerror',e=>errs.push(e.message));
  await pg.route('**/*',r=>{const x=r.request().url();if(x.startsWith('file:'))return r.continue();if(x.includes('xlsx.full'))return r.fulfill({body:XL,contentType:'application/javascript'});return r.abort();});await pg.goto(u);return pg;}
 const pg=await page('file://'+path.join(V,'..','index.html'));await pg.waitForFunction(()=>POOL&&TAB);
 // 1) graines imposées
 for(const g of Object.keys(A.simulations)){await pg.fill('#graine',g);await pg.click('#go');await pg.waitForFunction(g=>RES&&RES.graine===+g,g);
  const R=await pg.evaluate(()=>RES.fichiers.map(f=>f.juveniles.map(j=>[j.id,j.mere,j.pere,j.geno])));const a=A.simulations[g].fichiers.map(f=>f.map(j=>[j.id,j.mere,j.pere,j.geno]));
  const ok=JSON.stringify(R)===JSON.stringify(a);if(!ok)ko++;console.log('graine',g,':',ok?'identique au calcul Python':'DIFFÉRENT');}
 // 2) archive
 await pg.fill('#graine','12345');await pg.click('#go');await pg.waitForFunction(()=>RES&&RES.graine===12345);
 const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#zip')]);const z=path.join(T,dl.suggestedFilename());await dl.saveAs(z);
 const liste=execFileSync('unzip',['-Z1',z]).toString().trim().split('\n');console.log('archive',dl.suggestedFilename(),':',liste.join(', '));
 execFileSync('unzip',['-q','-o',z,'-d',T]);const dos=path.join(T,'juveniles-artificiels-12345');const r=await pg.evaluate(()=>RES.fichiers.map(f=>({nom:'C'+f.colonne+'_'+f.femelle,j:f.juveniles.map(j=>[j.id].concat(...j.geno))})));
 let dz=0;r.forEach(f=>{const ws=X.readFile(path.join(dos,f.nom+'.xls')).Sheets.FLOCK,rows=X.utils.sheet_to_json(ws,{header:1,raw:true});
  if(rows[0][0]!=='SPEC ID'||rows[0][1]!=='AS12'||rows.length-1!==f.j.length)dz++;f.j.forEach((j,i)=>{if(JSON.stringify(rows[i+1])!==JSON.stringify(j))dz++;});});
 const gen=fs.readFileSync(path.join(dos,'genealogie.csv'),'utf8').trim().split(/\r\n/).length-1;
 if(dz||gen!==160)ko++;console.log('fichiers .xls relus : écarts',dz,'; généalogie :',gen,'juvéniles');
 // 3) graine nouvelle à chaque simulation
 await pg.fill('#graine','');const gr=[];for(let i=0;i<3;i++){await pg.click('#go');gr.push(await pg.evaluate(()=>RES.graine));}
 if(new Set(gr).size!==3)ko++;console.log('graines tirées :',gr.join(', '));
 // 4) tableau .xlsx et pool téléversés
 const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['F1','# juvéniles','F2','# juvéniles'],['M1',3,'M1',2],['M2',1,'','']]),'Feuil1');X.writeFile(wb,path.join(T,'tab.xlsx'));
 await pg.setInputFiles('#upT',path.join(T,'tab.xlsx'));await pg.waitForFunction(()=>TAB&&TAB.label.indexOf('tab.xlsx')>=0);console.log('tableau téléversé :',await pg.textContent('#tabInfo'));
 const bad=X.utils.book_new();X.utils.book_append_sheet(bad,X.utils.aoa_to_sheet([['F1','# juvéniles'],['M1','deux']]),'F');X.writeFile(bad,path.join(T,'mauvais.xlsx'));
 await pg.setInputFiles('#upT',path.join(T,'mauvais.xlsx'));await pg.waitForFunction(()=>/Erreur/.test(document.getElementById('tabInfo').textContent));console.log('tableau erroné :',await pg.textContent('#tabInfo'));
 await pg.setInputFiles('#upP',[path.join(dos,'femelles.xls'),path.join(dos,'males.xls')]);await pg.waitForFunction(()=>POOL&&POOL.label==='fichiers téléversés');console.log('pool téléversé :',await pg.textContent('#poolInfo'));
 // 5) bout en bout avec « Agréger »
 const ag=await page('file://'+path.join(V,'..','..','combinaisons','index.html'));await ag.waitForFunction(()=>CUR&&CUR.res);
 await ag.setInputFiles('#upF',r.map(f=>path.join(dos,f.nom+'.xls')));await ag.click('#go');await ag.waitForFunction(()=>CUR.label==='fichiers téléversés'&&CUR.res&&CUR.fichiers.length===4&&CUR.G);
 const G=await ag.evaluate(()=>CUR.G.groupes.map(g=>g.comb.map(i=>CUR.fichiers[i].nom).join('+')+(g.coherent?' (cohérent)':' (non cohérent)')));
 console.log('« Agréger » sur les fichiers produits :',G.join(' | ')||'aucun groupe');
 // Aucune fausse identification : tout génotype de la page « Agréger » identique à une femelle simulée doit être celui
 // de la vraie mère de tous les fichiers de la combinaison (la puissance de la méthode, elle, varie avec le pool).
 await ag.setInputFiles('#upB',path.join(dos,'femelles.xls'));await ag.click('#goB');await ag.waitForFunction(()=>CUR.banqueRes);
 const B=await ag.evaluate(()=>CUR.banqueRes.liste.map(x=>({fichiers:x.combs.map(c=>c.map(i=>CUR.fichiers[i].nom)),trouvees:x.banque.presentes.map(c=>CUR.banqueRes.banque[c.index].nom)})));
 let faux=0;B.forEach(x=>x.trouvees.forEach(m=>x.fichiers.forEach(c=>c.forEach(f=>{if(f.split('_')[1]!==m)faux++;}))));if(faux)ko++;
 console.log('  banque = femelles simulées :',B.map(x=>x.fichiers.map(c=>c.join('+')).join(' ; ')+' → '+(x.trouvees.join(',')||'absent')).join(' | '),'— fausses identifications :',faux);
 if(process.argv[2])await pg.screenshot({path:process.argv[2],fullPage:true});
 console.log('erreurs JS',errs);await br.close();console.log(ko?'ÉCHECS '+ko:'TOUT OK');process.exit(ko?1:0);})();
