// Test de la page (Chromium/Playwright) : les 63 combinaisons de l'exemple, comparées à validation/attendu.json
// (calcul Python indépendant) ; les groupes de fichiers (attendu-groupes.json) aux plafonds de 10 % et 20 %,
// puis pour l'essai à 11 fichiers téléversés ; enfin, le téléversement avec un nombre maximal de fichiers réduit.
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os');
const V=__dirname,A=JSON.parse(fs.readFileSync(path.join(V,'attendu.json'),'utf8')),AG=JSON.parse(fs.readFileSync(path.join(V,'attendu-groupes.json'),'utf8'));
const cle=G=>JSON.stringify({g:G.groupes.map(g=>({comb:g.comb,choisiPar:g.choisiPar,coherent:g.coherent})).sort((a,b)=>a.comb.join()<b.comb.join()?-1:1).map(JSON.stringify),sans:G.sans});
const cleA=L=>JSON.stringify({g:L.slice(0,-1).map(g=>({comb:g.comb,choisiPar:g.choisiPar,coherent:g.coherent})).sort((a,b)=>a.comb.join()<b.comb.join()?-1:1).map(JSON.stringify),sans:L[L.length-1].sans});
function ecrire(dir,loci,f,i){const p=path.join(dir,f.nom.replace(/ /g,'-')+'.csv');fs.writeFileSync(p,['ID;'+loci.map(l=>l+';').join(';')+';'].concat(f.juveniles.map((j,k)=>['J'+i+'_'+k].concat(j.map(g=>g?g.join(';'):'0;0')).join(';'))).join('\n'));return p;}
let mauvais=0;
(async()=>{const br=await chromium.launch(),pg=await br.newPage({viewport:{width:1300,height:900}}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.join(V,'..','index.html'));await pg.waitForFunction(()=>CUR&&CUR.res&&CUR.G);
 const R=await pg.evaluate(()=>CUR.res.map(r=>({comb:r.comb,n:r.n,nComplets:r.nComplets,geno:r.geno,incompatibles:r.incompatibles,incParFichier:r.incParFichier,retenu:r.retenu,deux:r.deux?r.deux.map(x=>({geno:x.geno,incParFichier:x.incParFichier,sousPlafond:x.sousPlafond})):undefined})));
 let d=0;A.forEach((a,i)=>{const r=R[i];if(!r||JSON.stringify(r.comb)!==JSON.stringify(a.comb)||r.n!==a.n||r.nComplets!==a.nComplets||JSON.stringify(r.geno)!==JSON.stringify(a.geno)||(r.geno&&(r.incompatibles!==a.incompatibles||JSON.stringify(r.incParFichier)!==JSON.stringify(a.incParFichier)))||r.retenu!==a.retenu||JSON.stringify(r.deux)!==JSON.stringify(a.deux))d++;});
 const nDeux=A.filter(a=>a.deux).length,lignesDeux=await pg.evaluate(()=>document.querySelectorAll('#deux tbody tr').length),jaunes=await pg.evaluate(()=>document.querySelectorAll('#res tr.deux').length);
 if(lignesDeux!==2*nDeux||jaunes!==nDeux)d++;console.log('cas de deux génotypes complets :',nDeux,'; lignes affichées',lignesDeux,'; surlignées en jaune',jaunes);
 console.log('exemple :',R.length,'combinaisons ; écarts avec le calcul indépendant :',d,'(attendu',A.length,')');mauvais+=d;
 for(const p of [10,20]){await pg.fill('#plafond',String(p));await pg.dispatchEvent('#plafond','input');
  const ok=cle(await pg.evaluate(()=>CUR.G))===cleA(AG['exemple-'+p]);if(!ok)mauvais++;
  console.log('groupes, plafond',p,'% :',ok?'identiques':'DIFFÉRENTS','—',await pg.evaluate(()=>CUR.G.groupes.map(g=>g.comb.map(f=>CUR.fichiers[f].nom).join('+')).join(' | ')));}
 // présence dans la banque (plafond 20 %, deux fichiers de banque d'essai) : comparée à attendu-banque.json
 const AB=JSON.parse(fs.readFileSync(path.join(V,'attendu-banque.json'),'utf8'));
 await pg.setInputFiles('#upB',[path.join(V,'banque-essai-1.csv'),path.join(V,'banque-essai-2.csv')]);await pg.click('#goB');
 await pg.waitForFunction(()=>CUR.banqueRes);
 const PB=await pg.evaluate(()=>CUR.banqueRes.liste.map(x=>({type:x.type,num:x.num,lettre:x.lettre,combs:x.combs,geno:x.geno,present:x.banque.present,presentes:x.banque.presentes.map(c=>[c.index,c.compares]),proche:x.banque.proche?[x.banque.proche.index,x.banque.proche.differents,x.banque.proche.compares]:null})));
 let db=PB.length===AB.length?0:1;AB.forEach((a,i)=>{const b=PB[i];if(!b||b.type!==a.type||(a.num&&b.num!==a.num)||(a.lettre&&b.lettre!==a.lettre)||JSON.stringify(b.combs)!==JSON.stringify(a.combs)||JSON.stringify(b.geno)!==JSON.stringify(a.geno)||b.present!==a.banque.present||JSON.stringify(b.presentes)!==JSON.stringify(a.banque.presentes)||JSON.stringify(b.proche)!==JSON.stringify(a.banque.proche))db++;});
 const marques=await pg.evaluate(()=>[...document.querySelectorAll('#banque tbody tr')].map(t=>[...t.querySelectorAll('td.case')].map(c=>c.textContent).join('|')).join(' '));
 console.log('banque :',PB.length,'génotypes examinés ; écarts avec le calcul indépendant :',db,'; cases',marques);mauvais+=db;
 if(process.argv[2])await pg.screenshot({path:process.argv[2],fullPage:true});
 // juvéniles très incomplets : un juvénile à 6 locus manquants est écarté (seuil 5), gardé si le champ est vide
 const J=await pg.evaluate(()=>EXAMPLE.fichiers[1]);const dirM=fs.mkdtempSync(path.join(os.tmpdir(),'manq-'));
 const jm=J.juveniles.concat([J.juveniles[0].map((g,l)=>l<6?null:g)]);
 const pM=ecrire(dirM,await pg.evaluate(()=>EXAMPLE.loci),{nom:'Grise-plus-incomplet',juveniles:jm},9);
 await pg.setInputFiles('#upF',[pM]);await pg.click('#go');await pg.waitForFunction(()=>CUR.label==='fichiers téléversés'&&CUR.res);
 const m1=await pg.evaluate(()=>[CUR.res[0].n,document.getElementById('ecartes').textContent]);
 await pg.fill('#maxManq','');await pg.dispatchEvent('#maxManq','change');await pg.waitForFunction(n=>CUR.res&&CUR.res[0].n===n,jm.length);
 const m2=await pg.evaluate(()=>[CUR.res[0].n,document.getElementById('ecartes').textContent]);
 if(m1[0]!==J.juveniles.length||m2[0]!==jm.length){mauvais++;console.log('ÉCHEC données manquantes',m1,m2);}
 console.log('données manquantes :',m1.join(' — '),'|',m2.join(' — '));await pg.fill('#maxManq','5');
 await pg.fill('#plafond','10');await pg.dispatchEvent('#plafond','input');
 // essai : 11 fichiers téléversés
 const E=AG.essai,dir=fs.mkdtempSync(path.join(os.tmpdir(),'cb-'));
 await pg.fill('#kmax','11');await pg.setInputFiles('#upF',E.fichiers.map((f,i)=>ecrire(dir,E.loci,f,i)));await pg.click('#go');
 await pg.waitForFunction(()=>CUR.label==='fichiers téléversés'&&CUR.fichiers.length===11&&CUR.res&&CUR.res.length===2047&&CUR.G,null,{timeout:120000});
 const ok=cle(await pg.evaluate(()=>CUR.G))===cleA(E.groupes);if(!ok)mauvais++;
 console.log('essai,',E.fichiers.length,'fichiers :',await pg.textContent('#info'),'groupes',ok?'identiques':'DIFFÉRENTS','au calcul indépendant');
 console.log(await pg.evaluate(()=>[...document.querySelectorAll('#grp tbody tr')].map(t=>t.innerText.replace(/\s+/g,' ')).join('\n')));
 if(process.argv[3])await pg.screenshot({path:process.argv[3],fullPage:false});
 // téléversement : 3 fichiers, au plus 2 par combinaison
 const ex=await pg.evaluate(()=>EXAMPLE);const files=ex.fichiers.slice(0,3).map((f,i)=>ecrire(dir,ex.loci,f,i));
 await pg.fill('#kmax','2');await pg.setInputFiles('#upF',files);await pg.click('#go');   // un seul clic : la valeur choisie (2) doit être respectée
 await pg.waitForFunction(()=>CUR.res&&CUR.fichiers.length===3);const nPremier=await pg.evaluate(()=>CUR.res.length);if(nPremier!==6){d++;console.log('ÉCHEC nombre maximal non respecté :',nPremier,'combinaisons');}
 mauvais+=d;
 console.log('téléversés :',await pg.textContent('#info'),'| lignes',await pg.evaluate(()=>CUR.res.length),'|',await pg.textContent('#grpNote'));
 console.log('erreurs JS',errs);await br.close();process.exit(mauvais||errs.length?1:0);})();
