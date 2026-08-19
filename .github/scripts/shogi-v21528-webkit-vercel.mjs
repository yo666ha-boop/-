import { webkit } from 'playwright';
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
page.on('console',m=>console.log('CONSOLE',m.type(),m.text()));
page.on('pageerror',e=>console.log('PAGEERROR',e.stack||e));
page.on('requestfailed',r=>console.log('REQUESTFAILED',r.url(),r.failure()?.errorText||''));
const url='https://ai-shogi-yaneuraou-iphone.vercel.app/shogi-v21528/?proof=quiet-ab-'+Date.now();
await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.AI_SHOGI_YANEURAOU_FUTURE&&document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
const env=await page.evaluate(()=>({coi:crossOriginIsolated,sab:typeof SharedArrayBuffer,ua:navigator.userAgent}));
console.log('QUIET_ENV',JSON.stringify(env));
if(!env.coi||env.sab!=='function')throw new Error('WebKit is not cross-origin isolated');

const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const GAME=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h 2h1i+`.split(/\s+/);
function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';
  for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),pc=b.get(a),cap=b.get(d);if(!pc)throw Error('apply '+m+' missing '+a);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||m.endsWith('+')})}t=t==='b'?'w':'b'}
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}
const positions=[{ply:23,ref:'5g5f'},{ply:33,ref:'3g3f'},{ply:35,ref:'4i3h'}].map(x=>({...x,sfen:sfen(GAME.slice(0,x.ply-1))}));

async function runVariant(name,quiet){
  const rows=[];
  for(let rep=1;rep<=3;rep++){
    const init=await page.evaluate(async quiet=>{
      if(window.__abWorker){try{window.__abWorker.terminate()}catch{};window.__abWorker=null}
      const srcUrl='./future-yaneura-worker21528.js?ab='+Date.now()+'-'+Math.random();
      const r=await fetch(srcUrl,{cache:'no-store'});if(!r.ok)throw Error('worker fetch '+r.status);let src=await r.text();
      src=src.replace("BASE=new URL('./yaneuraou/',self.location.href).href;","BASE='https://ai-shogi-yaneuraou-iphone.vercel.app/shogi-v21528/yaneuraou/';");
      if(quiet){const needle="stage('⑤-4f MultiPV設定開始');await sendUSI('setoption name MultiPV value 1');stage('⑤-4f MultiPV設定完了');";const repl=needle+"\n    stage('AB QuietPV設定開始');await sendUSI('setoption name PvInterval value 100000000');await sendUSI('setoption name OutputFailLHPV value false');stage('AB QuietPV設定完了');";if(!src.includes(needle))throw Error('quiet patch marker missing');src=src.replace(needle,repl)}
      const blob=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));const w=new Worker(blob);let seq=0;const pending=new Map(),stages=[];
      w.onmessage=e=>{const m=e.data||{};if(m.type==='stage'){stages.push(m.text);return}if(m.type==='fatal'){for(const q of pending.values())q.reject(Error(m.text||'fatal'));pending.clear();return}if(m.type==='result'){const q=pending.get(m.id);if(q){pending.delete(m.id);clearTimeout(q.timer);m.ok?q.resolve(m):q.reject(Error(m.error||'worker error'))}}};
      const call=(type,data={})=>new Promise((resolve,reject)=>{const id='ab'+(++seq),timer=setTimeout(()=>{pending.delete(id);reject(Error(type+' timeout '+stages.slice(-8).join(' | ')))},150000);pending.set(id,{resolve,reject,timer});w.postMessage({type,id,...data})});
      window.__abWorker=w;window.__abCall=call;const out=await call('init');return{out,stages};
    },quiet);
    if(init.out?.mobileWebKit!==true||init.out?.threads!==1||init.out?.hashMB!==32)throw Error(name+' profile '+JSON.stringify(init.out));
    if(quiet&&!init.stages.some(x=>x.includes('AB QuietPV設定完了')))throw Error('quiet settings not observed');
    for(const pos of positions){const started=Date.now();const r=await page.evaluate(pos=>window.__abCall('bestmove',{sfen:pos.sfen,ms:4500,multiPV:1}),pos);const row={variant:name,rep,ply:pos.ply,ref:pos.ref,token:r.token,match:r.token===pos.ref,elapsed:Date.now()-started,cp:r.info?.cp,depth:r.info?.depth,nodes:r.info?.nodes};rows.push(row);console.log('QUIET_ROW '+JSON.stringify(row))}
  }
  return rows;
}
const all=[...(await runVariant('baseline',false)),...(await runVariant('quiet',true))];
for(const name of['baseline','quiet']){const a=all.filter(x=>x.variant===name);const summary={variant:name,tests:a.length,matches:a.filter(x=>x.match).length,ply23:a.filter(x=>x.ply===23&&x.match).length,ply33:a.filter(x=>x.ply===33&&x.match).length,ply35:a.filter(x=>x.ply===35&&x.match).length,meanElapsed:Math.round(a.reduce((s,x)=>s+x.elapsed,0)/a.length),meanDepth:+(a.reduce((s,x)=>s+(x.depth||0),0)/a.length).toFixed(2),meanNodes:Math.round(a.reduce((s,x)=>s+(x.nodes||0),0)/a.length)};console.log('QUIET_SUMMARY '+JSON.stringify(summary))}
await page.evaluate(()=>{try{window.__abWorker?.terminate()}catch{}});await browser.close();
