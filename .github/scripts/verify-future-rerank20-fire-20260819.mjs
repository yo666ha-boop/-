import { chromium } from 'playwright';

const sfens=[
  'lnsgkgsnl/1r5b1/ppppppppp/9/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL w - 2',
  'lnsgkgsnl/7b1/pppppp1pp/9/9/6P2/PPPPPP1PP/1B5R1/LNSGKGSNL w Pp 10',
  'lnsgkgsnl/7b1/pppppp1pp/9/9/4P4/PPPP1P1PP/1B5R1/LNSGKGSNL w Pp 12'
];
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (Linux; U; Android 9; en-US; KFKAWI Build/PS7312) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4 like Chrome/130.0 Safari/537.36'});
  await page.goto('http://127.0.0.1:4203/shogi-v21528/index.html?fireCandidate='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  const out=await page.evaluate(async(sfens)=>{
    const w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?fireCandidate='+Date.now());let id=0,P=new Map();
    w.onmessage=e=>{const m=e.data||{},q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};
    const call=(type,x={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout'))},150000);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});
    try{
      const init=await call('init'),rows=[];
      for(const sfen of sfens){const started=Date.now(),r=await call('bestmove',{sfen,ms:4000,multiPV:1});rows.push({token:r.token,elapsed:Date.now()-started,info:r.info})}
      return{coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,init,rows};
    }finally{w.terminate()}
  },sfens);
  console.log('FIRE_CANDIDATE '+JSON.stringify(out));
  if(!out.coi||out.cards!==26)throw Error('page regression');
  if(out.init.threads!==1||out.init.hashMB!==48||!out.init.fireSilk||!out.init.mobileSafe)throw Error('Fire engine profile regression '+JSON.stringify(out.init));
  for(const r of out.rows){if(!/^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i]|resign|win)$/.test(r.token||''))throw Error('bad USI '+r.token);if(!r.info?.adaptive)throw Error('adaptive path not used');if(r.info?.threads!==1||r.info?.hashMB!==48||!r.info?.fireSilk||!r.info?.mobileSafe)throw Error('row profile regression');if(r.elapsed>20000)throw Error('Fire candidate too slow '+r.elapsed)}
  console.log('PASS_FIRE_RERANK20 '+JSON.stringify({rows:out.rows.map(r=>({token:r.token,elapsed:r.elapsed,reranked:r.info?.reranked,gapCp:r.info?.gapCp,totalTargetNodes:r.info?.totalTargetNodes})),threads:out.init.threads,hashMB:out.init.hashMB,fireSilk:out.init.fireSilk,mobileSafe:out.init.mobileSafe}));
}finally{await browser.close()}
