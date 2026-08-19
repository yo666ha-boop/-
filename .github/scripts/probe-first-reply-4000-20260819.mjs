import { chromium } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const FIRST_MOVES=[
  '1g1f','2g2f','3g3f','4g4f','5g5f','6g6f','7g7f','8g8f','9g9f',
  '2h1h','2h3h','2h4h','2h5h','2h6h','2h7h',
  '1i1h','9i9h',
  '3i3h','3i4h','7i6h','7i7h',
  '4i3h','4i4h','4i5h','6i5h','6i6h','6i7h',
  '5i4h','5i5h','5i6h'
];

function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';
  for(const m of ms){
    if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}
    else{const a=m.slice(0,2),d=m.slice(2,4),pc=b.get(a),cap=b.get(d);if(!pc)throw Error('bad '+m+' missing '+a);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||m.endsWith('+')})}
    t=t==='b'?'w':'b';
  }
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}

const positions=FIRST_MOVES.map(human=>({human,sfen:sfen([human])}));
if(positions.length!==30||positions.some(x=>!x.sfen.includes(' w ')))throw Error('first move set invalid');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
await page.goto('http://127.0.0.1:4191/shogi-v21528/index.html?firstreply='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
if(!await page.evaluate(()=>crossOriginIsolated))throw Error('COI false');

async function start(){return page.evaluate(async()=>{const w=new Worker('./future-yaneura-worker21528.js?x='+Date.now()+'-'+Math.random());let n=0,P=new Map();w.onmessage=e=>{const m=e.data||{},q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};const call=(type,x={})=>new Promise((r,j)=>{const id=++n,t=setTimeout(()=>{P.delete(id);j(Error(type+' timeout'))},180000);P.set(id,{r,j,t});w.postMessage({type,id,...x})});window.__frw=w;window.__frcall=call;return call('init')})}
async function stop(){await page.evaluate(()=>{try{window.__frw?.terminate()}catch{}window.__frw=null;window.__frcall=null})}
async function search(pos,ms,pv){return page.evaluate(({pos,ms,pv})=>window.__frcall('bestmove',{sfen:pos,ms,multiPV:pv}),{pos,ms,pv})}

let prof=await start();console.log('FR_PROFILE '+JSON.stringify(prof));if(prof.threads!==1||prof.hashMB!==32||!prof.mobileWebKit)throw Error('bad mobile profile');
const refs=[];
for(const p of positions){const t=Date.now(),r=await search(p.sfen,10000,3),cand=(r.candidates||[]).slice(0,3).map(x=>({token:x.token,cp:x.cp,mate:x.mate,depth:x.depth}));refs.push({human:p.human,best:r.token,cand});console.log('FR_REF '+JSON.stringify({human:p.human,best:r.token,elapsed:Date.now()-t,cand}))}
await stop();

const rows=[];
for(const ms of[4000,4500]){
  prof=await start();if(prof.threads!==1||prof.hashMB!==32||!prof.mobileWebKit)throw Error('profile changed');
  for(let i=0;i<positions.length;i++){const p=positions[i],ref=refs[i],t=Date.now(),r=await search(p.sfen,ms,1),top3=ref.cand.map(x=>x.token),row={ms,human:p.human,token:r.token,ref:ref.best,exact:r.token===ref.best,top3:top3.includes(r.token),elapsed:Date.now()-t,depth:r.info?.depth||0,nodes:r.info?.nodes||0,cp:r.info?.cp,mate:r.info?.mate};rows.push(row);console.log('FR_ROW '+JSON.stringify(row))}
  await stop();
}
for(const ms of[4000,4500]){const a=rows.filter(x=>x.ms===ms),bad=a.filter(x=>!x.top3).map(x=>({human:x.human,token:x.token,ref:x.ref}));console.log('FR_SUMMARY '+JSON.stringify({ms,tests:a.length,exact:a.filter(x=>x.exact).length,top3:a.filter(x=>x.top3).length,bad,meanElapsed:Math.round(a.reduce((z,x)=>z+x.elapsed,0)/a.length),meanDepth:+(a.reduce((z,x)=>z+x.depth,0)/a.length).toFixed(2),meanNodes:Math.round(a.reduce((z,x)=>z+x.nodes,0)/a.length)}))}
await browser.close();
