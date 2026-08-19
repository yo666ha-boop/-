import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; U; en-US; KFMAWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4195/shogi-v21528/index.html?fireaudit='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  const staticCheck=await page.evaluate(async()=>{const t=await (await fetch('../shogi-side-test/future21520.js?x='+Date.now(),{cache:'no-store'})).text();return{has4000:t.includes('endgame?7000:4000'),has4500:t.includes('endgame?7000:4500'),coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length};});
  if(!staticCheck.has4000||staticCheck.has4500||!staticCheck.coi||staticCheck.cards!==26)throw Error('static '+JSON.stringify(staticCheck));
  const result=await page.evaluate(async()=>{
    const w=new Worker('./future-yaneura-worker21528.js?v=21528v970d5');let seq=0;const pending=new Map();
    w.onmessage=e=>{const m=e.data||{},p=pending.get(m.id);if(!p||m.type!=='result')return;pending.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker error'));};
    const call=(type,x={})=>new Promise((r,j)=>{const id=++seq,t=setTimeout(()=>{pending.delete(id);j(Error(type+' timeout'));},120000);pending.set(id,{r,j,t});w.postMessage({type,id,...x});});
    const init=await call('init');const sfen='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';const rows=[];
    for(const ms of [300,700,1200]){const t=performance.now();const r=await call('bestmove',{sfen,ms,multiPV:1}).catch(e=>({error:String(e)}));rows.push({ms,elapsed:Math.round(performance.now()-t),ok:!r?.error,error:r?.error||'',info:r?.info||null,token:r?.token||''});}
    w.terminate();return{init,rows};
  });
  if(!result.init?.ok)throw Error('engine init '+JSON.stringify(result.init));
  for(const r of result.rows){if(!r.ok||!r.token)throw Error('search '+JSON.stringify(r));if(r.info?.threads!==1||r.info?.hashMB!==48||r.info?.fireSilk!==true||r.info?.mobileSafe!==true)throw Error('profile '+JSON.stringify(r.info));}
  console.log('PASS_FIRE '+JSON.stringify({staticCheck,result}));
} finally {
  await browser.close();
}
