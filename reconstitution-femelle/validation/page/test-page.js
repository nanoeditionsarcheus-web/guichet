// Test de bout en bout de index.html (Chromium/Playwright) : l'exemple embarqué et le fichier FLOCK
// téléversé doivent redonner exactement les résultats de Maple (maple/resultats_maple.json).
const {chromium}=require(process.env.PW||'playwright');
const fs=require('fs'),path=require('path');
const V=path.join(__dirname,'..'),PAGE='file://'+path.join(V,'..','index.html');
const M=JSON.parse(fs.readFileSync(path.join(V,'maple/resultats_maple.json'),'utf8'));
function compare(res){let d=0,n=0;res.forEach((r,k)=>{const m=M.loci[k];if(r.nTyped!==m.max)d++;
  const js=new Map(r.candidates.map(c=>[c.geno.join('/'),c.nc]));if(js.size!==m.candidats.length)d++;
  m.candidats.forEach(c=>{n++;if(js.get(c.geno.join('/'))!==c.nc)d++;});});return {n,d};}
(async()=>{
 const br=await chromium.launch(),pg=await br.newPage({viewport:{width:1100,height:900}}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto(PAGE);
 let c=compare(await pg.evaluate(()=>CUR.res));console.log('exemple embarqué : candidates',c.n,'écarts',c.d);
 await pg.setInputFiles('#upJuv',path.join(V,'donnees/exemple-maple-FLOCK.csv'));await pg.click('#upLoad');
 await pg.waitForFunction(()=>/chargés/.test(document.getElementById('upStatus').textContent));
 console.log(await pg.textContent('#upStatus'));
 c=compare(await pg.evaluate(()=>CUR.res));console.log('fichier téléversé : candidates',c.n,'écarts',c.d);
 if(process.argv[2]){await pg.screenshot({path:process.argv[2],fullPage:true});}
 console.log('erreurs JS',errs);await br.close();
})();
