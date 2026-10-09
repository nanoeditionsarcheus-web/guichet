// Test des fichiers CSV de génotypes (Chromium/Playwright), dans les trois formats offerts :
// allèles collés (268268), deux colonnes (disposition FLOCK), barre oblique (268/268).
// 1) Reconstitution : génotypes complets. 2) Agréger : génotypes distincts, rechargés dans le tableau des
// compatibilités comme « femelles déjà connues » (mêmes comptes que les femelles reconstituées par le tableau).
// 3) Compatibilités : génotypes des femelles, rechargés de même (tableau identique).
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path'),os=require('os');
const G=path.join(__dirname,'..','..'),T=fs.mkdtempSync(path.join(os.tmpdir(),'export-'));let mauvais=0;
const ko=m=>{mauvais++;console.log('ÉCHEC',m);};
const lire=p=>fs.readFileSync(p,'utf8').replace(/^﻿/,'').trim().split(/\r\n/).map(l=>l.split(';'));
async function page(br,dossier){const pg=await br.newPage({acceptDownloads:true}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());await pg.goto('file://'+path.join(G,dossier,'index.html'));pg.errs=errs;return pg;}
async function telecharger(pg,bouton,fmt,nom){await pg.selectOption('#fmtGeno',fmt);const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click(bouton)]);const p=path.join(T,nom);await dl.saveAs(p);return p;}
const attendu=(g,fmt)=>fmt==='flock'?(g?[String(g[0]),String(g[1])]:['0','0']):fmt==='colles'?[g?String(g[0]).padStart(3,'0')+String(g[1]).padStart(3,'0'):'000000']:[g?g[0]+'/'+g[1]:'?'];
(async()=>{const br=await chromium.launch();
 // 1) reconstitution
 const rc=await page(br,'reconstitution-femelle');await rc.waitForFunction(()=>CUR&&CUR.res);
 const comp=await rc.evaluate(()=>({loci:CUR.data.loci,c:Reconstitution.genotypesComplets(Reconstitution.retenusParLocus(CUR.res))}));
 for(const fmt of ['colles','flock','barre']){const R=lire(await telecharger(rc,'#dlCompl',fmt,'complets-'+fmt+'.csv'));
  const h=['#'].concat(...comp.loci.map(l=>fmt==='flock'?[l,'']:[l]));if(JSON.stringify(R[0])!==JSON.stringify(h))ko('reconstitution en-tête '+fmt);
  if(R.length-1!==comp.c.length)ko('reconstitution lignes '+fmt);
  comp.c.forEach((c,i)=>{if(JSON.stringify(R[i+1])!==JSON.stringify([String(i+1)].concat(...c.map(g=>attendu(g,fmt)))))ko('reconstitution '+fmt+' ligne '+(i+1));});
  console.log('reconstitution, '+fmt+' :',R.length-1,'génotype(s) ;',R[1].slice(0,4).join(';'),'…');}
 await rc.selectOption('#fmtGeno','colles');const z=await rc.evaluate(()=>[genoCells([97,167]),genoCells(null)].join(' | '));if(z!=='097167 | 000000')ko('zéros '+z);
 console.log('  zéros initiaux :',z,'(attendu 097167 | 000000)');
 // 2) agréger : génotypes distincts → femelles connues du tableau des compatibilités
 const cb=await page(br,'combinaisons');await cb.waitForFunction(()=>CUR&&CUR.res&&CUR.G);
 for(const fmt of ['colles','barre']){const R=lire(await telecharger(cb,'#dlD',fmt,'distincts-'+fmt+'.csv'));console.log('agréger, '+fmt+' :',R.slice(1).map(r=>r.slice(0,3).join(';')).join(' / '));}
 const fD=await telecharger(cb,'#dlD','flock','distincts-flock.csv');
 for(const [b,n] of [['#dl','liste'],['#dlG','groupes']])for(const fmt of ['colles','flock','barre']){const R=lire(await telecharger(cb,b,fmt,n+'-'+fmt+'.csv'));if(R.length<3)ko(n+' '+fmt);}
 // 3) compatibilités : femelles reconstituées de l'exemple, puis rechargement
 const tc=await page(br,'compatibilites');await tc.waitForFunction(()=>CUR&&CUR.t);
 const ex=await tc.evaluate(()=>({loci:CUR.loci,refs:CUR.references.concat(CUR.testes).map(g=>({nom:g.nom,juveniles:g.juveniles})),fem:CUR.femelles.map(f=>f.nom),comptes:CUR.t.comptes}));
 const fF=await telecharger(tc,'#dlFem','flock','femelles-flock.csv');
 const ecrire=(g)=>{const p=path.join(T,g.nom.replace(/ /g,'-')+'.csv');fs.writeFileSync(p,['ID;'+ex.loci.map(l=>l+';').join(';')+';'].concat(g.juveniles.map((j,k)=>['J'+k].concat(j.map(x=>x?x.join(';'):'0;0')).join(';'))).join('\n'));return p;};
 const groupes=ex.refs.map(ecrire);
 async function recharger(fichierFem,premier){await tc.setInputFiles('#upRef',[]);await tc.setInputFiles('#upTest',groupes);await tc.setInputFiles('#upFem',fichierFem);await tc.click('#upLoad');
  await tc.waitForFunction(premier=>CUR&&CUR.t&&document.getElementById('upStatus').textContent.indexOf('rreur')<0&&CUR.femelles.length&&CUR.references.length===0&&CUR.femelles[0].nom===premier,premier,{timeout:20000});
  return tc.evaluate(()=>({fem:CUR.femelles.map(f=>f.nom),comptes:CUR.t.comptes,status:document.getElementById('upStatus').textContent}));}
 const a=await recharger(fF,'FGrise');
 if(JSON.stringify(a.fem)!==JSON.stringify(ex.fem)||JSON.stringify(a.comptes)!==JSON.stringify(ex.comptes))ko('femelles rechargées : '+JSON.stringify(a));
 console.log('compatibilités, femelles rechargées :',a.fem.join(', '),'— tableau',JSON.stringify(a.comptes)===JSON.stringify(ex.comptes)?'identique':'DIFFÉRENT');
 const b=await recharger(fD,'femelle1_Grise');const iG=ex.fem.indexOf('FGrise'),iR=ex.fem.indexOf('FRose');
 const ok=JSON.stringify(b.comptes[0])===JSON.stringify(ex.comptes[iG])&&JSON.stringify(b.comptes[1])===JSON.stringify(ex.comptes[iR]);if(!ok)ko('distincts rechargés '+JSON.stringify(b));
 console.log('agréger → compatibilités :',b.fem.join(', '),'— comptes',ok?'identiques à FGrise et FRose':'DIFFÉRENTS');
 // nommage : un groupe « F1_Grise » donne la femelle « F1_Grise » (pas « FF1_Grise »), « Grise » donne « FGrise »
 const noms=await tc.evaluate(()=>{const d=JSON.parse(JSON.stringify(EXAMPLE));d.references[0].nom='F1_Grise';return preparer(d).femelles.map(f=>f.nom).join(', ');});
 if(noms.indexOf('F1_Grise')!==0||noms.indexOf('FF1')>=0)ko('nommage '+noms);console.log('nommage :',noms);
 // juvéniles très incomplets (plus de 5 locus manquants) : écartés dans la reconstitution et les compatibilités
 const L=ex.loci,base=ex.refs[0];const inc={nom:'Avec-incomplet',juveniles:base.juveniles.concat([base.juveniles[0].map((g,l)=>l<6?null:g)])};
 const pInc=ecrire(inc);
 await rc.setInputFiles('#upJuv',pInc);await rc.click('#upLoad');await rc.waitForFunction(()=>document.getElementById('foot').textContent.indexOf('Avec-incomplet')>=0);
 const r1=await rc.evaluate(()=>[CUR.data.juveniles.length,document.getElementById('ecartes').textContent]);
 await rc.fill('#maxManq','');await rc.dispatchEvent('#maxManq','change');const r2=await rc.evaluate(()=>CUR.data.juveniles.length);
 if(r1[0]!==base.juveniles.length||r2!==inc.juveniles.length)ko('reconstitution, données manquantes '+r1+' '+r2);
 console.log('reconstitution, données manquantes :',r1.join(' — '),'| champ vide :',r2);
 await tc.setInputFiles('#upRef',[pInc]);await tc.setInputFiles('#upTest',[groupes[1]]);await tc.setInputFiles('#upFem',[]);await tc.click('#upLoad');
 await tc.waitForFunction(()=>CUR&&CUR.references.length===1&&CUR.references[0].nom==='Avec-incomplet');
 const t1=await tc.evaluate(()=>[CUR.references[0].juveniles.length,document.getElementById('ecartes').textContent]);
 await tc.fill('#maxManq','');await tc.dispatchEvent('#maxManq','change');const t2=await tc.evaluate(()=>CUR.references[0].juveniles.length);
 if(t1[0]!==base.juveniles.length||t2!==inc.juveniles.length)ko('compatibilités, données manquantes '+t1+' '+t2);
 console.log('compatibilités, données manquantes :',t1.join(' — '),'| champ vide :',t2);
 const err=[...rc.errs,...cb.errs,...tc.errs];console.log('erreurs JS',err);if(err.length)mauvais++;
 await br.close();console.log(mauvais?'ÉCHECS : '+mauvais:'TOUT OK');process.exit(mauvais?1:0);})();
