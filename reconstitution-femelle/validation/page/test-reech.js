// Test de la section « Rééchantillonnage aléatoire » de la page (Chromium/Playwright) :
// - Rose (un seul génotype complet) : section offerte, tailles 10, 20, …, 70 ; résultats proches de l'étude publiée ;
// - Inconnue 2 (16 génotypes complets) : section non offerte.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path');
const V=path.join(__dirname,'..');const etude=JSON.parse(fs.readFileSync(path.join(V,'../etudes/reechantillonnage/resultats.json'),'utf8'));
(async()=>{const br=await chromium.launch(),pg=await br.newPage({viewport:{width:1000,height:900}}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.join(V,'..','index.html'));
 await pg.setInputFiles('#upJuv',path.join(V,'jeux/Rose/Rose-FLOCK.csv'));await pg.click('#upLoad');
 await pg.waitForFunction(()=>/Rose/.test(document.getElementById('foot').textContent));
 console.log('Rose : section offerte',await pg.evaluate(()=>!document.getElementById('reechOn').hidden));
 await pg.fill('#reechIt','2000');await pg.click('#reechGo');
 await pg.waitForSelector('#reechRes table',{timeout:120000});
 const rows=await pg.evaluate(()=>[...document.querySelectorAll('#reechRes tbody tr')].map(t=>[...t.children].map(c=>c.textContent)));
 let md=0;rows.forEach(r=>{const n=+r[0],l=etude.nids.Rose.lignes.find(x=>x.n===n);const u=parseFloat(r[1].replace(',','.')),id=parseFloat(r[2].replace(',','.'));
   if(l)md=Math.max(md,Math.abs(u-100*l.unique),Math.abs(id-100*l.identique));console.log('  ',r.join(' | '));});
 console.log('  écart maximal avec l\'étude publiée :',md.toFixed(1),'points ; en-tête :',await pg.textContent('.reech-h'));
 if(process.argv[2])await pg.locator('.card.reech').screenshot({path:process.argv[2]});
 await pg.setInputFiles('#upJuv',path.join(V,'jeux/Inc_2/Inc_2-FLOCK.csv'));await pg.click('#upLoad');
 await pg.waitForFunction(()=>/Inc_2/.test(document.getElementById('foot').textContent));
 console.log('Inconnue 2 : section offerte',await pg.evaluate(()=>!document.getElementById('reechOn').hidden),'—',await pg.textContent('#reechOff'));
 console.log('erreurs JS',errs);await br.close();process.exit(md<4&&!errs.length?0:1);})();
