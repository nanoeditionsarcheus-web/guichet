// Test de la page (Chromium/Playwright). XLSX_JS : chemin de xlsx.full.min.js 0.18.5 (la page le charge en ligne).
// 1) exemple, graine 12345, 300 itérations (faites par lots) : bilan identique au calcul Python indépendant (attendu-bilan.json),
//    et tableaux affichés conformes ;
// 2) sans graine : une nouvelle graine à chaque série ; graine et nombre d'itérations invalides refusés ;
// 3) bouton « Arrêter » ; 4) tableau des croisements téléversé (.xlsx), tableau erroné, pool téléversé ;
// 5) la page n'a aucun lien vers les autres pages, ni aucun téléchargement.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os');
const V=__dirname,AB=JSON.parse(fs.readFileSync(path.join(V,'attendu-bilan.json'),'utf8')),XL=fs.readFileSync(process.env.XLSX_JS,'utf8'),X=require(process.env.XLSX_JS.replace(/dist\/xlsx\.full\.min\.js$/,''));
let ko=0;const T=fs.mkdtempSync(path.join(os.tmpdir(),'sim-'));const K=['juste','faux','deuxUnJuste','deuxZeroJuste','nonResolu'];
(async()=>{const br=await chromium.launch(),errs=[];
 const pg=await br.newPage({viewport:{width:1250,height:900}});pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>{const x=r.request().url();if(x.startsWith('file:'))return r.continue();if(x.includes('xlsx.full'))return r.fulfill({body:XL,contentType:'application/javascript'});return r.abort();});
 await pg.goto('file://'+path.join(V,'..','index.html'));await pg.waitForFunction(()=>POOL&&TAB);
 const fini=()=>pg.waitForFunction(()=>RES&&!document.getElementById('go').disabled);
 // 1) bilan
 await pg.fill('#graine',String(AB.graine));await pg.fill('#iter',String(AB.iterations));await pg.click('#go');await fini();
 const R=await pg.evaluate(()=>({graine:RES.graine,fait:RES.fait,lignes:RES.lignes}));
 const ok1=R.graine===AB.graine&&R.fait===AB.iterations&&JSON.stringify(R.lignes)===JSON.stringify(AB.lignes);if(!ok1)ko++;
 console.log('bilan de',AB.iterations,'itérations, graine',AB.graine,':',ok1?'identique au calcul Python':'DIFFÉRENT');
 const tabs=await pg.$$eval('#res table',ts=>ts.map(t=>[...t.querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent))));
 let d=0;AB.lignes.forEach((l,i)=>{const a=tabs[0][i],b=tabs[1][i];if(!a[0].startsWith(l.nom))d++;K.forEach((k,j)=>{if(+a[j+1]!==l[k])d++;});
  if(+b[1]!==l.faux)d++;for(let k=1;k<=11;k++){const e=l.faux?(100*l.fauxLocus[k]/l.faux).toFixed(1).replace('.',','):'—';if(b[k+1]!==e)d++;}
  if(K.reduce((s,k)=>s+l[k],0)!==AB.iterations)d++;});
 if(d||tabs.length!==2)ko++;console.log('tableaux affichés :',tabs.length,'; écarts',d);tabs[0].forEach((r,i)=>console.log('  ',r.join(' | '),'||',tabs[1][i].slice(1).join(' ')));
 // 2) graines
 await pg.fill('#graine','');await pg.fill('#iter','50');const gr=[];for(let i=0;i<3;i++){await pg.click('#go');await fini();gr.push(await pg.evaluate(()=>RES.graine));}
 if(new Set(gr).size!==3)ko++;console.log('graines tirées :',gr.join(', '));
 for(const [g,n] of [['abc','10'],['4294967296','10'],['','0'],['','2.5']]){await pg.evaluate(()=>{RES=null;});await pg.fill('#graine',g);await pg.fill('#iter',n);await pg.click('#go');
  const m=await pg.textContent('#upStatus'),e=await pg.evaluate(()=>RES===null&&document.getElementById('upStatus').classList.contains('err'));if(!e)ko++;console.log('  refusé (graine «'+g+'», itérations «'+n+'») :',m);}
 // 3) arrêt
 await pg.fill('#graine','7');await pg.fill('#iter','1000000');await pg.click('#go');await pg.waitForFunction(()=>RES&&RES.fait>=400);await pg.click('#stop');await fini();
 const st=await pg.evaluate(()=>({fait:RES.fait,s:document.getElementById('upStatus').textContent,t:document.querySelectorAll('#res table').length}));
 if(!(st.fait<1000000&&/Arrêté/.test(st.s)&&st.t===2))ko++;console.log('arrêt :',st.s);
 // 4) tableau .xlsx et pool téléversés
 const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['F1','# juvéniles','F2','# juvéniles'],['M1',3,'M1',2],['M2',1,'','']]),'Feuil1');X.writeFile(wb,path.join(T,'tab.xlsx'));
 await pg.setInputFiles('#upT',path.join(T,'tab.xlsx'));await pg.waitForFunction(()=>TAB&&TAB.label.indexOf('tab.xlsx')>=0);console.log('tableau téléversé :',await pg.textContent('#tabInfo'));
 const bad=X.utils.book_new();X.utils.book_append_sheet(bad,X.utils.aoa_to_sheet([['F1','# juvéniles'],['M1','deux']]),'F');X.writeFile(bad,path.join(T,'mauvais.xlsx'));
 await pg.setInputFiles('#upT',path.join(T,'mauvais.xlsx'));await pg.waitForFunction(()=>/Erreur/.test(document.getElementById('tabInfo').textContent));console.log('tableau erroné :',await pg.textContent('#tabInfo'));
 await pg.setInputFiles('#upT',path.join(T,'tab.xlsx'));await pg.waitForFunction(()=>TAB&&TAB.label.indexOf('tab.xlsx')>=0);
 const pool=X.utils.book_new(),rows=[['SPEC ID','L1','','L2','']];for(let i=0;i<20;i++)rows.push(['J'+i,100+2*(i%3),102+2*(i%4),200,200+2*(i%2)]);
 X.utils.book_append_sheet(pool,X.utils.aoa_to_sheet(rows),'FLOCK');X.writeFile(pool,path.join(T,'pool.xls'),{bookType:'biff8'});
 await pg.setInputFiles('#upP',path.join(T,'pool.xls'));await pg.waitForFunction(()=>POOL&&POOL.label==='fichiers téléversés');console.log('pool téléversé :',await pg.textContent('#poolInfo'));
 await pg.fill('#graine','1');await pg.fill('#iter','100');await pg.click('#go');await fini();
 const p=await pg.evaluate(()=>({n:RES.lignes.map(l=>l.nom),h:[...document.querySelectorAll('#res table')[1].tHead.rows[0].cells].length,s:RES.lignes.map(l=>l.juste+l.faux+l.deuxUnJuste+l.deuxZeroJuste+l.nonResolu)}));
 const ok4=JSON.stringify(p.n)===JSON.stringify(['C1_F1','C2_F2'])&&p.h===4&&p.s.every(x=>x===100);if(!ok4)ko++;console.log('pool de 2 locus, tableau de 2 fichiers :',p.n.join(', '),'; colonnes du 2e tableau :',p.h,ok4?'OK':'ERREUR');
 // 5) aucun lien ni téléchargement
 const ln=await pg.evaluate(()=>({a:[...document.querySelectorAll('a')].filter(a=>a.getAttribute('href')!=='#').map(a=>a.href),dl:document.querySelectorAll('[download]').length}));
 if(ln.a.some(h=>/simulation|combinaisons|reconstitution|compatibilites|flock-convert|\/guichet\/?$/.test(h))||ln.dl)ko++;console.log('liens :',ln.a.length?ln.a.join(' '):'aucun','; téléchargements :',ln.dl);
 if(process.argv[2]){await pg.goto('file://'+path.join(V,'..','index.html'));await pg.waitForFunction(()=>POOL&&TAB);await pg.fill('#graine','12345');await pg.click('#go');await fini();await pg.screenshot({path:process.argv[2],fullPage:true});}
 console.log('erreurs JS',errs);if(errs.length)ko++;await br.close();console.log(ko?'ÉCHECS '+ko:'TOUT OK');process.exit(ko?1:0);})();
