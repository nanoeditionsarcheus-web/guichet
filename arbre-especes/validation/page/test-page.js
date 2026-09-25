// Test de bout en bout de index.html (Chromium/Playwright) :
// 1) l'exemple nancycats donne la matrice de js/nancycats.dist.tsv ;
// 2) des CSV en disposition FLOCK (jaguar, microbov ; un fichier par population) téléversés dans la page
//    donnent la matrice PHYLIP (écart <= 5e-7) et le même arbre (clades identiques).
const {chromium}=require(process.env.PW||'playwright');
const fs=require('fs'),path=require('path'),os=require('os');
const V=path.join(__dirname,'..'),PAGE='file://'+path.join(V,'..','index.html');
function phylip(f){const t=fs.readFileSync(f,'utf8').trim().split(/\s+/);const n=+t[0];const M=[];for(let i=0;i<n;i++)M.push(t.slice(1+i*(n+1)+1,1+(i+1)*(n+1)).map(Number));return M;}
function clades(nd,out){if(!nd.children)return [nd.name];const s=[].concat(clades(nd.children[0],out),clades(nd.children[1],out)).sort();out.add(s.join(','));return s;}
function parseNwk(s){let i=0;function node(){if(s[i]==='('){i++;const c=[node()];while(s[i]===','){i++;c.push(node());}i++;skip();return{children:c};}let n='';while(!/[,():;]/.test(s[i]))n+=s[i++];skip();return{name:n};}function skip(){if(s[i]===':'){i++;while(!/[,();]/.test(s[i]))i++;}}return node();}
(async()=>{
 const br=await chromium.launch(),pg=await br.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto(PAGE);
 const ex=await pg.evaluate(()=>({D:CUR.D,names:CUR.names,excl:CUR.excluded.map(i=>CUR.loci[i])}));
 const ref=fs.readFileSync(path.join(V,'js/nancycats.dist.tsv'),'utf8').trim().split('\n').slice(1).map(l=>l.split('\t').slice(1).map(Number));
 let m=0;ex.D.forEach((r,i)=>r.forEach((v,j)=>m=Math.max(m,Math.abs(v-ref[i][j]))));
 console.log('exemple nancycats : écart max vs JS validé',m,'; locus exclus',ex.excl.join(','));
 for(const ds of ['jaguar','microbov']){
  const J=JSON.parse(fs.readFileSync(path.join(V,'data',ds+'.json'),'utf8'));
  const codes=fs.readFileSync(path.join(V,'phylip',ds+'.codes.tsv'),'utf8').trim().split('\n').slice(1).map(l=>l.split('\t'));
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ae-'));const files=[];
  Object.keys(J.pops).forEach((p,k)=>{const head=['ID'].concat(...J.loci.map(l=>[l,l+'b'])).join(';');
   const rows=J.pops[p].map((g,i)=>[p+'_'+i].concat(...g.map(x=>x?x:[0,0])).join(';'));
   const f=path.join(dir,codes[k][0]+'.csv');fs.writeFileSync(f,[head].concat(rows).join('\n'));files.push(f);});
  await pg.setInputFiles('#upRefs',files);await pg.click('#upLoad');
  await pg.waitForFunction(()=>/chargées/.test(document.getElementById('upStatus').textContent));
  const r=await pg.evaluate(()=>({D:CUR.D,names:CUR.names,nwk:NeiUPGMA.toNewick(CUR.tree,8)}));
  const P=phylip(path.join(V,'phylip',ds+'.gendist.out'));let mx=0;
  r.D.forEach((row,i)=>row.forEach((v,j)=>mx=Math.max(mx,Math.abs(v-P[i][j]))));
  const a=new Set(),b=new Set();clades(parseNwk(r.nwk),a);clades(parseNwk(fs.readFileSync(path.join(V,'phylip',ds+'.upgma.nwk'),'utf8').replace(/\s+/g,'')),b);
  const same=a.size===b.size&&[...a].every(x=>b.has(x));
  console.log(ds+' (CSV téléversés) : écart max vs PHYLIP',mx.toExponential(2),'; mêmes clades que PHYLIP',same);
 }
 await pg.screenshot({path:process.argv[2]||'/tmp/page.png',fullPage:true});
 console.log('erreurs JS',errs);await br.close();
})();
