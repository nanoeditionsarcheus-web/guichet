// Téléverse dans la page les fichiers .xlsx de P. Duchesne (fichiers-pierre/FLOCK) et compare à Maple.
// Usage : PW=<playwright> XLSX_JS=<xlsx.full.min.js> node page/test-xlsx.js
const {chromium}=require(process.env.PW||'playwright');const fs=require('fs'),path=require('path');
const V=require('path').join(__dirname,'..');
const MAP={'Grise':'maple/resultats_maple.json','Blanche':'jeux/Blanche/resultats_maple.json','Inconnue 1':'jeux/Inc_1/resultats_maple.json','Inconnue 2':'jeux/Inc_2/resultats_maple.json','Rose':'jeux/Rose/resultats_maple.json','Turquoise':'jeux/Turquoise/resultats_maple.json'};
const XL=fs.readFileSync(process.env.XLSX_JS,'utf8');   // xlsx 0.18.5 (même version que la page), fichier dist/xlsx.full.min.js;
(async()=>{const br=await chromium.launch(),pg=await br.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:'))return r.continue();if(u.includes('xlsx.full.min.js'))return r.fulfill({body:XL,contentType:'application/javascript'});return r.abort();});
await pg.goto('file://'+path.join(V,'..','index.html'));
for(const [n,rf] of Object.entries(MAP)){const M=JSON.parse(fs.readFileSync(path.join(V,rf),'utf8'));
 await pg.setInputFiles('#upJuv',path.join(V,'fichiers-pierre/FLOCK',n+'.xlsx'));await pg.click('#upLoad');
 await pg.waitForFunction(n=>document.getElementById('foot').textContent.indexOf(n+'.xlsx')>=0,n);
 const res=await pg.evaluate(()=>({res:CUR.res,loci:CUR.data.loci,n:CUR.data.juveniles.length}));let d=0,c=0;
 res.res.forEach((r,k)=>{const m=M.loci[k];if(r.nTyped!==m.max)d++;const js=new Map(r.candidates.map(x=>[x.geno.join('/'),x.nc]));if(js.size!==m.candidats.length)d++;m.candidats.forEach(x=>{c++;if(js.get(x.geno.join('/'))!==x.nc)d++;});});
 console.log(n.padEnd(11),'juvéniles',res.n,'locus',res.loci.join(' '),'| candidats',c,'écarts',d);}
console.log('erreurs JS',errs);await br.close();})();
