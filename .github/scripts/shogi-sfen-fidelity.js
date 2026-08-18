const fs=require('fs');
const {chromium}=require('playwright');

const MOVES=[
'7g7f','8c8d','2h3h','8d8e','7f7e','8e8f','7e7d','8f8g+','8h5e','8b8e','5e4f','7a6b',
'4i5h','3c3d','5i4i','2b9i+','7d7c+','6b7c','8i7g','8g7g','P*7d','7c6d','6i7h','5a4b',
'7d7c+','8a7c','7h7g','9i7g','7i6h','8e8i+','P*7i','7g6h','5h6h','8i7i','B*5i','L*4d',
'4f6d','6c6d','S*5h','N*3e','3g3f','3e4g','5h4g','4d4g+','N*5e','S*4f','5e4c+','4b4c',
'6h5h','4g5h','3h5h','G*4g','P*4d','4c5d','5h4h','S*5h','4h5h','4g5h'
];
const CHECK=[0,1,2,8,12,16,24,34,44,58];

function initial(){
  const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
}
const baseKind=k=>String(k||'').replace(/^\+/,'');
function idx(sq){return (sq.charCodeAt(1)-97)*9+(9-Number(sq[0]));}
function parse(tok){if(tok[1]==='*')return{drop:tok[0],to:idx(tok.slice(2)),prom:false};return{f:idx(tok.slice(0,2)),to:idx(tok.slice(2,4)),prom:tok.endsWith('+'),drop:null};}
function apply(s,m,label){
  const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h[1]||{})},'-1':{...(s.h[-1]||{})}},t:s.t,log:[...s.log],last:m};
  if(m.drop){const have=n.h[s.t][m.drop]||0;if(have<1)throw Error('no hand '+label+' '+m.drop);n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};}
  else{const p=n.b[m.f];if(!p||p.o!==s.t)throw Error('source mismatch '+label);const cap=n.b[m.to];if(cap&&cap.o===s.t)throw Error('own capture '+label);n.b[m.f]=null;if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1;}let k=p.k;if(m.prom&&!k.startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};}
  n.t=-s.t;n.log.push(label);return n;
}

(async()=>{
  const expected=JSON.parse(fs.readFileSync(process.env.SFEN_EXPECTED||'/tmp/python_sfens.json','utf8'));
  let s=initial();const states={0:structuredClone(s)};
  for(let i=0;i<MOVES.length;i++){s=apply(s,parse(MOVES[i]),MOVES[i]);if(CHECK.includes(i+1))states[i+1]=structuredClone(s);}
  const browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?sfenaudit='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});
  const rows=[];
  for(const ply of CHECK){const app=await page.evaluate(st=>window.AI_SHOGI_YANEURAOU_FUTURE.toSFEN(st),states[ply]);const py=expected[String(ply)];rows.push({ply,app,python:py,match:app===py});}
  await browser.close();console.log('SFEN_FIDELITY',JSON.stringify(rows));
  const bad=rows.filter(r=>!r.match);if(bad.length)throw Error('SFEN mismatch '+JSON.stringify(bad));
  console.log('PASS SFEN fidelity: app toSFEN matches python-shogi at '+CHECK.join(',')+' plies');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});