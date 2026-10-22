// Test de la page (Chromium/Playwright). XLSX_JS : chemin de xlsx.full.min.js 0.18.5 (la page le charge en ligne).
// 1) exemple (référence : comptes d'allèles des 23 nids), graine 12345 : identique au calcul Python (attendu.json) ;
// 2) fichiers de référence (Blanche, Rose, Turquoise), graine 99 : identique à Python ;
// 3) femelle lue dans un fichier à allèles collés de deux femelles (choix dans la liste) ; locus inconnu exclu ;
// 4) juvéniles téléversés (.xls) ; valeurs invalides refusées ; bouton « Arrêter » ; aucune erreur JS.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os');
const V=__dirname,A=JSON.parse(fs.readFileSync(path.join(V,'attendu.json'),'utf8')),ex=JSON.parse(fs.readFileSync(path.join(V,'exemple.json'),'utf8'));
const XL=fs.readFileSync(process.env.XLSX_JS,'utf8'),X=require(process.env.XLSX_JS.replace(/dist\/xlsx\.full\.min\.js$/,''));
let ko=0;const ok=(c,m)=>{if(!c)ko++;console.log((c?'OK    ':'ÉCHEC ')+m);};const T=fs.mkdtempSync(path.join(os.tmpdir(),'males-'));
const J=path.join(V,'../../reconstitution-femelle/validation/jeux');
(async()=>{const br=await chromium.launch(),errs=[];const pg=await br.newPage({viewport:{width:1250,height:900}});pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>{const x=r.request().url();if(x.startsWith('file:'))return r.continue();if(x.includes('xlsx.full'))return r.fulfill({body:XL,contentType:'application/javascript'});return r.abort();});
 await pg.goto('file://'+path.join(V,'..','index.html'));await pg.waitForFunction(()=>NID&&FEM);
 const fini=()=>pg.waitForFunction(()=>RES&&!document.getElementById('go').disabled);
 const lancer=async(g,N,k)=>{await pg.fill('#graine',String(g));await pg.fill('#nsim',String(N));await pg.fill('#kmax',String(k));await pg.click('#go');await fini();};
 const comparer=async c=>{const r=await pg.evaluate(()=>({total:RES.O.total,basse:RES.basse,haute:RES.haute,ouvert:RES.ouvert,hyp:RES.hyp.map(h=>{const d={};h.dist.forEach((v,t)=>{if(v)d[t]=v;});return {k:h.k,dist:d,ge:h.ge,le:h.le};})}));
   return r.total===c.total&&r.basse===c.basse&&r.haute===c.haute&&r.ouvert===c.ouvert&&JSON.stringify(r.hyp)===JSON.stringify(c.hyp.map(h=>({k:h.k,dist:h.dist,ge:h.ge,le:h.le})));};
 // 1
 ok(await pg.inputValue('#erreurSim')==='0,5','taux d\'erreurs de génotypage par défaut : 0,5 %');
 const ri=await pg.textContent('#listeR');ok(/23 nids/.test(ri),'référence de l\'exemple : '+ri);
 let c=A.cas.find(x=>x.nom==='exemple-nids');await lancer(c.graine,c.N,c.kmax);ok(await comparer(c),'exemple (référence des 23 nids), graine '+c.graine+' : identique au calcul Python — '+(await pg.textContent('.verdict')));
 const rows=await pg.$$eval('#res table',t=>t[0].querySelectorAll('tbody tr').length);const svg=await pg.$$eval('.histo svg',s=>s.length);
 const av=await pg.evaluate(()=>{const c=document.getElementById('ajoutR').closest('.card'),a=c.querySelector('.avert');return !!a&&!!(a.compareDocumentPosition(document.getElementById('ajoutR'))&Node.DOCUMENT_POSITION_FOLLOWING);});
 ok(av,'avertissement sur les fréquences placé avant le choix des fichiers de référence');
 ok(rows===c.hyp.length&&svg===c.hyp.length,'tableau des hypothèses ('+rows+' lignes) et histogrammes ('+svg+')');
 ok(/Intervalle d'estimation du nombre de mâles géniteurs par NAD : 2 à 4/.test(await pg.textContent('#res'))&&/confiance d'environ 90 %/.test(await pg.textContent('#res')),'intitulé et niveau de confiance : '+await pg.textContent('.verdict'));
 // GERUD dans l'estimation
 await pg.check('#gerud');await lancer(c.graine,c.N,c.kmax);await pg.waitForFunction(()=>RES&&RES.gerud&&!document.getElementById('go').disabled);const vg=await pg.$$eval('.verdict',v=>v.map(x=>x.textContent));
 ok(vg.length===2&&vg[1]==='Nombre minimal estimé de mâles par GERUD : '+A.gerud[0].min,'case GERUD cochée : '+vg.join(' / '));await pg.uncheck('#gerud');
 // simulateur avec erreurs de génotypage et GERUD (référence de l'exemple) : identique à Python
 {const v=A.validation.find(x=>x.nom==='erreurs-gerud');await pg.fill('#nsim',String(v.N));await pg.fill('#kmax',String(v.kmax));await pg.fill('#kmaxSim',String(v.kmaxSim));await pg.fill('#repSim',String(v.R));await pg.fill('#graineSim',String(v.graine));await pg.fill('#erreurSim','2');await pg.check('#gerudSim');
  await pg.click('#goSim');await pg.waitForFunction(()=>SIM&&SIM.fini&&!document.getElementById('goSim').disabled);
  const js=await pg.evaluate(()=>SIM.nids.map(x=>({k:x.k,graine:x.graine,basse:x.basse,haute:x.haute,dans:x.dans,gerud:x.gerud.min,gerudVrai:x.gerudVrai.min})));
  const t=await pg.$$eval('#resSim tbody tr',r=>r.map(x=>[...x.cells].map(c=>c.textContent).join(' : ')));const th=await pg.$$eval('#resSim thead th',r=>r.length);
  ok(JSON.stringify(js)===JSON.stringify(v.nids.map(x=>({k:x.k,graine:x.graine,basse:x.basse,haute:x.haute,dans:x.dans,gerud:x.gerud,gerudVrai:x.gerudVrai})))&&th===5,'simulateur, erreurs 2 % et GERUD = calcul Python ; tableau : '+t.join(' | '));
  if(process.argv[2])await pg.screenshot({path:process.argv[2],fullPage:true});
  await pg.fill('#erreurSim','0');await pg.uncheck('#gerudSim');}
 // 2
 c=A.cas.find(x=>x.nom==='exemple-reference');await pg.setInputFiles('#upR',c.reference.map(n=>path.join(J,n,n+'-FLOCK.csv')));await pg.waitForFunction(()=>REF);
 await lancer(c.graine,c.N,c.kmax);ok(await comparer(c),'fichiers de référence, graine '+c.graine+' : identique au calcul Python — '+(await pg.textContent('.verdict')));
 ok(/fichiers de référence/.test(await pg.textContent('#foot')),'le pied de page indique la source des fréquences');
 await pg.click('#viderR');await pg.waitForFunction(()=>REF&&/23 nids/.test(REF.label));ok(true,'liste vidée : retour à la référence de l\'exemple');
 // 3 femelle à allèles collés, deux femelles ; la seconde est la bonne, avec un locus inconnu
 const col=g=>g?String(g[0]).padStart(3,'0')+String(g[1]).padStart(3,'0'):'0';const f2=ex.femelle.map((g,l)=>l===3?null:g);
 const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Femelle'].concat(ex.loci),['autre'].concat(ex.femelle.map(g=>col([g[0],g[0]]))),['bonne'].concat(f2.map(col))]),'F');X.writeFile(wb,path.join(T,'femelles.xls'),{bookType:'biff8'});
 await pg.setInputFiles('#upF',path.join(T,'femelles.xls'));await pg.waitForFunction(()=>FEM&&FEM.liste.length===2);await pg.selectOption('#choixF','1');
 const fi=await pg.textContent('#femInfo');ok(/bonne/.test(fi)&&/AsB14/.test(fi),'femelle choisie dans un fichier à allèles collés : '+fi);
 await lancer(5,500,3);const an=await pg.evaluate(()=>RES.O.analyses.length);const ex3=await pg.evaluate(()=>[...document.querySelectorAll('#res td[colspan]')].map(t=>t.textContent).join());
 ok(an===10&&/femelle inconnue/.test(ex3),'locus inconnu de la femelle exclu : '+an+' locus analysés');
 // 4 juvéniles téléversés (.xls FLOCK) ; un juvénile très incomplet écarté
 const jr=[['SPEC ID'].concat(...ex.loci.map(l=>[l,'']))];ex.juveniles.forEach((g,i)=>jr.push([ex.ids[i]].concat(...g.map(x=>x||[0,0]))));jr.push(['incomplet'].concat(...ex.loci.map((l,k)=>k<4?[268,268]:[0,0])));
 const wj=X.utils.book_new();X.utils.book_append_sheet(wj,X.utils.aoa_to_sheet(jr),'FLOCK');X.writeFile(wj,path.join(T,'nid.xls'),{bookType:'biff8'});
 await pg.click('#exemple');await pg.waitForFunction(()=>NID.label===EXAMPLE.label&&FEM.label==='exemple');
 await pg.setInputFiles('#upJ',path.join(T,'nid.xls'));await pg.waitForFunction(()=>NID&&NID.label.indexOf('nid.xls')>=0);const ji=await pg.textContent('#juvInfo');ok(/incomplet/.test(ji)&&/21 juvéniles retenus/.test(ji),'juvéniles téléversés : '+ji);
 await pg.waitForFunction(()=>REF===null);c=A.cas[1];await lancer(c.graine,c.N,c.kmax);ok(await comparer(c),'mêmes juvéniles téléversés, sans référence (fréquences du nid), graine '+c.graine+' : identique au calcul Python (aucune hypothèse retenue jusqu\'à '+c.kmax+')');
 // simulateur de validation, mêmes nids artificiels et intervalles que Python
 {const v=A.validation.find(x=>x.nom==='exemple');await pg.fill('#nsim',String(v.N));await pg.fill('#seuil','0,05');await pg.fill('#kmax',String(v.kmax));await pg.fill('#kmaxSim',String(v.kmaxSim));await pg.fill('#repSim',String(v.R));await pg.fill('#graineSim',String(v.graine));
  await pg.click('#goSim');await pg.waitForFunction(()=>SIM&&SIM.fini&&!document.getElementById('goSim').disabled);
  const js=await pg.evaluate(()=>SIM.nids.map(x=>({k:x.k,r:x.r,graine:x.graine,basse:x.basse,haute:x.haute,ouvert:x.ouvert,dans:x.dans,gerud:x.gerud,gerudVrai:x.gerudVrai,hyp:x.hyp})));
  const t=await pg.$$eval('#resSim tbody tr',r=>r.map(x=>[...x.cells].map(c=>c.textContent).join(' : ')));
  ok(JSON.stringify(js)===JSON.stringify(v.nids)&&t.length===v.kmaxSim,'simulateur de la page = calcul Python ; tableau : '+t.join(' | '));}
 ok(/plus de 3/.test(await pg.textContent('.verdict')),'verdict « plus de 3 » : '+await pg.textContent('.verdict'));
 await pg.fill('#erreurSim','abc');await pg.click('#goSim');ok(/erreurs de génotypage/.test(await pg.textContent('#simStatus')),'refusé (taux d\'erreurs « abc ») : '+await pg.textContent('#simStatus'));await pg.fill('#erreurSim','0');
 for(const [id,v] of [['#graine','abc'],['#nsim','50'],['#seuil','1,5'],['#kmax','0']]){await pg.evaluate(()=>{RES=null;});const avant={graine:'',nsim:'1000',seuil:'0,05',kmax:'5'};
   for(const [k,w] of Object.entries(avant))await pg.fill('#'+k,w);await pg.fill(id,v);await pg.click('#go');
   const e=await pg.evaluate(()=>RES===null&&document.getElementById('upStatus').classList.contains('err'));ok(e,'refusé ('+id+' = « '+v+' ») : '+await pg.textContent('#upStatus'));}
 await pg.fill('#graine','8');await pg.fill('#nsim','1000000');await pg.fill('#kmax','10');await pg.click('#go');await pg.waitForFunction(()=>RES&&RES.fait>=3000);await pg.click('#stop');await fini();
 ok(/Arrêté/.test(await pg.textContent('#upStatus'))&&/interrompue/.test(await pg.textContent('.verdict')),'arrêt : '+await pg.textContent('#upStatus'));
 ok(!errs.length,'erreurs JS : '+JSON.stringify(errs));await br.close();console.log(ko?'ÉCHECS '+ko:'TOUT OK');process.exit(ko?1:0);})();
