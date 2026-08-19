import { chromium } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const GAME=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f`.split(/\s+/);

function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';
  for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),pc=b.get(a),cap=b.get(d);if(!pc)throw Error('bad '+m);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||m.endsWith('+')})}t=t==='b'?'w':'b'}
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}

const positions=[1,3,5,7,9,11,13,15].map(ply=>({ply,sfen:sfen(GAME.slice(0,ply-1))}));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
await page.goto('http://127.0.0.1:4189/shogi-v21528/index.html?openingprobe='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
if(!await page.evaluate(()=>crossOriginIsolated))throw Error('COI false');

async function startWorker(){
  return page.evaluate(async()=>{
    const w=new Worker('./future-yaneura-worker21528.js?probe='+Date.now()+'-'+Math.random());let seq=0;const P=new Map(),stages=[];
    w.onmessage=e=>{const m=e.data||{};if(m.type==='stage'){stages.push(m.text);return}const q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};
    const call=(type,x={})=>new Promise((r,j)=>{const id=++seq,t=setTimeout(()=>j(Error(type+' timeout '+stages.slice(-6).join(' | '))),180000);P.set(id,{r,j,t});w.postMessage({type,id,...x})});
    window.__otw=w;window.__otcall=call;const init=await call('init');return init;
  });
}
async function stopWorker(){await page.evaluate(()=>{try{window.__otw?.terminate()}catch{}window.__otw=null;window.__otcall=null})}
async function search(pos,ms,multiPV){return page.evaluate(({pos,ms,multiPV})=>window.__otcall('bestmove',{sfen:pos,ms,multiPV}),{pos,ms,multiPV})}

const init=await startWorker();
console.log('OPEN_PROFILE '+JSON.stringify(init));
if(init.threads!==1||init.hashMB!==32||!init.mobileWebKit)throw Error('profile '+JSON.stringify(init));
const refs=[];
for(const p of positions){const t=Date.now(),r=await search(p.sfen,12000,3),elapsed=Date.now()-t;const cand=(r.candidates||[]).slice(0,3).map(x=>({rank:x.rank,token:x.token,cp:x.cp,mate:x.mate,depth:x.depth,nodes:x.nodes}));refs.push({ply:p.ply,best:r.token,cand});console.log('OPEN_REF '+JSON.stringify({ply:p.ply,best:r.token,elapsed,cand}))}
await stopWorker();

const rows=[];
for(const ms of[3000,3500,4500])for(let rep=1;rep<=2;rep++){
  const prof=await startWorker();if(prof.threads!==1||prof.hashMB!==32)throw Error('bad profile');
  for(let i=0;i<positions.length;i++){
    const p=positions[i],ref=refs[i],t=Date.now(),r=await search(p.sfen,ms,1),elapsed=Date.now()-t,top3=ref.cand.map(x=>x.token);
    const row={ms,rep,ply:p.ply,token:r.token,ref:ref.best,exact:r.token===ref.best,top3:top3.includes(r.token),elapsed,depth:r.info?.depth||0,nodes:r.info?.nodes||0,cp:r.info?.cp,mate:r.info?.mate};rows.push(row);console.log('OPEN_ROW '+JSON.stringify(row));
  }
  await stopWorker();
}

for(const ms of[3000,3500,4500]){
  const a=rows.filter(x=>x.ms===ms),byPly={};for(const p of positions)byPly[p.ply]={exact:a.filter(x=>x.ply===p.ply&&x.exact).length,top3:a.filter(x=>x.ply===p.ply&&x.top3).length,tokens:a.filter(x=>x.ply===p.ply).map(x=>x.token)};
  const s={ms,tests:a.length,exact:a.filter(x=>x.exact).length,top3:a.filter(x=>x.top3).length,meanElapsed:Math.round(a.reduce((z,x)=>z+x.elapsed,0)/a.length),meanDepth:+(a.reduce((z,x)=>z+x.depth,0)/a.length).toFixed(2),meanNodes:Math.round(a.reduce((z,x)=>z+x.nodes,0)/a.length),byPly};console.log('OPEN_SUMMARY '+JSON.stringify(s));
}
await browser.close();
