import { chromium } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const GAME=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h 2h1i+`.split(/\s+/);

function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){
    let f=9,pr=false;
    for(const c of row){
      if(c==='+'){pr=true;continue}
      if(/\d/.test(c)){f-=+c;continue}
      const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--;
    }
    rr++;
  }
  let t='b';
  for(const m of ms){
    if(/^[PLNSGBR]\*/.test(m)){
      const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false});
    }else{
      const a=m.slice(0,2),d=m.slice(2,4),pc=b.get(a),cap=b.get(d);if(!pc)throw Error('bad '+m);
      if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||m.endsWith('+')});
    }
    t=t==='b'?'w':'b';
  }
  const rows=[];
  for(let r=0;r<9;r++){
    let x='',e=0;
    for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}
    if(e)x+=e;rows.push(x);
  }
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}

const positions=[
  {ply:19,ref:'4h5i'},
  {ply:23,ref:'5g5f'},
  {ply:33,ref:'3g3f'},
  {ply:35,ref:'4i3h'},
].map(x=>({...x,sfen:sfen(GAME.slice(0,x.ply-1))}));

const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
await page.goto('http://127.0.0.1:4186/index.html',{waitUntil:'domcontentloaded',timeout:120000});
const env=await page.evaluate(()=>({coi:crossOriginIsolated,sab:typeof SharedArrayBuffer,ua:navigator.userAgent}));
console.log('O3_ENV '+JSON.stringify(env));
if(!env.coi||env.sab!=='function')throw Error('COI/SAB missing');

async function newWorker(variant){
  return page.evaluate(async variant=>{
    if(window.__o3w){try{window.__o3w.terminate()}catch{}}
    const w=new Worker('/'+variant+'/worker.js?x='+Date.now()+'-'+Math.random());
    let seq=0;const pending=new Map(),stages=[];
    w.onmessage=e=>{
      const m=e.data||{};
      if(m.type==='stage'){stages.push(m.text);return}
      if(m.type==='fatal'){for(const q of pending.values())q.j(Error(m.text||'fatal'));pending.clear();return}
      if(m.type==='result'){
        const q=pending.get(m.id);if(!q)return;pending.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker error'));
      }
    };
    const call=(type,data={})=>new Promise((r,j)=>{const id='o'+(++seq),t=setTimeout(()=>{pending.delete(id);j(Error(type+' timeout '+stages.slice(-8).join(' | ')))},150000);pending.set(id,{r,j,t});w.postMessage({type,id,...data})});
    window.__o3w=w;window.__o3call=call;
    const out=await call('init');return{out,stages};
  },variant);
}

const rows=[];
for(const variant of['baseline','o3']){
  for(let rep=1;rep<=3;rep++){
    const init=await newWorker(variant);
    if(init.out?.threads!==1||init.out?.hashMB!==32||init.out?.mobileWebKit!==true)throw Error(variant+' bad profile '+JSON.stringify(init.out));
    for(const pos of positions){
      const started=Date.now();
      const r=await page.evaluate(pos=>window.__o3call('bestmove',{sfen:pos.sfen,ms:4500,multiPV:1}),pos);
      const row={variant,rep,ply:pos.ply,ref:pos.ref,token:r.token,match:r.token===pos.ref,elapsed:Date.now()-started,cp:r.info?.cp,depth:r.info?.depth,nodes:r.info?.nodes};
      rows.push(row);console.log('O3_ROW '+JSON.stringify(row));
    }
  }
}

for(const variant of['baseline','o3']){
  const a=rows.filter(x=>x.variant===variant);
  const byPly={};for(const ply of[19,23,33,35])byPly[ply]=a.filter(x=>x.ply===ply&&x.match).length;
  const s={variant,tests:a.length,matches:a.filter(x=>x.match).length,byPly,meanElapsed:Math.round(a.reduce((z,x)=>z+x.elapsed,0)/a.length),meanDepth:+(a.reduce((z,x)=>z+(x.depth||0),0)/a.length).toFixed(2),meanNodes:Math.round(a.reduce((z,x)=>z+(x.nodes||0),0)/a.length)};
  console.log('O3_SUMMARY '+JSON.stringify(s));
}
await page.evaluate(()=>{try{window.__o3w?.terminate()}catch{}});
await browser.close();
