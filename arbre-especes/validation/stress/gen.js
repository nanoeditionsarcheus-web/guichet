// 300 matrices de distances aléatoires (3 à 40 taxons) : UPGMA JS -> Newick, comparé ensuite à hclust
const fs=require("fs"),NU=require("../js/nei-upgma.js");let s=12345;const rnd=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};
for(let t=0;t<300;t++){const n=3+Math.floor(rnd()*38);const P=[];for(let i=0;i<n;i++)P.push([rnd(),rnd(),rnd()]);
 const D=P.map(a=>P.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])));const nm=D.map((_,i)=>"T"+i);
 fs.writeFileSync(`stress/m${t}.tsv`,D.map(r=>r.map(x=>x.toPrecision(17)).join("\t")).join("\n"));
 fs.writeFileSync(`stress/m${t}.nwk`,NU.toNewick(NU.upgma(nm,D),14));}
