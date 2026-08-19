import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.bin':'application/octet-stream','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((q,s)=>{let n=decodeURIComponent(new URL(q.url,'http://x').pathname);if(n.endsWith('/'))n+='index.html';const f=path.resolve(root,'.'+n);if(!f.startsWith(root)||!fs.existsSync(f)){s.writeHead(404);return s.end('404')}s.setHeader('Cross-Origin-Opener-Policy','same-origin');s.setHeader('Cross-Origin-Embedder-Policy','require-corp');s.setHeader('Cross-Origin-Resource-Policy','same-origin');s.setHeader('Cache-Control','no-store');s.setHeader('Content-Type',mime[path.extname(f).toLowerCase()]||'application/octet-stream');fs.createReadStream(f).pipe(s)});
await new Promise((r,j)=>server.listen(4205,'127.0.0.1',e=>e?j(e):r()));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
  await page.goto('http://127.0.0.1:4205/shogi-v21528/index.html?desktopRetry='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  const out=await page.evaluate(async()=>{
    const w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?desktopRetry='+Date.now());let id=0,P=new Map();
    w.onmessage=e=>{const m=e.data||{},p=P.get(m.id);if(!p||m.type!=='result')return;P.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker'))};
    const call=(type,x={},timeout=180000)=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout '+timeout))},timeout);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});
    try{const startedInit=Date.now(),init=await call('init',{},180000),initElapsed=Date.now()-startedInit,started=Date.now(),r=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',ms:700,multiPV:1},60000);return{coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,init,r,initElapsed,elapsed:Date.now()-started}}finally{w.terminate()}
  });
  if(!out.coi||out.cards!==26)throw Error('desktop page regression '+JSON.stringify(out));
  if(out.init.mobileSafe||out.init.mobileWebKit||out.init.fireSilk||out.init.threads!==2||out.init.hashMB!==128)throw Error('desktop profile '+JSON.stringify(out.init));
  if(out.r.info?.adaptive)throw Error('desktop unexpectedly adaptive '+JSON.stringify(out.r.info));
  if(out.r.info?.threads!==2||out.r.info?.hashMB!==128||out.r.info?.mobileSafe)throw Error('desktop info '+JSON.stringify(out.r.info));
  if(!/^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i]|resign|win)$/.test(out.r.token||''))throw Error('desktop bad USI '+out.r.token);
  console.log('PASS_DESKTOP_RERANK20_RETRY '+JSON.stringify({token:out.r.token,initElapsed:out.initElapsed,elapsed:out.elapsed,threads:out.r.info.threads,hashMB:out.r.info.hashMB,mobileSafe:out.r.info.mobileSafe,mobileWebKit:out.r.info.mobileWebKit,fireSilk:out.r.info.fireSilk,adaptive:!!out.r.info.adaptive,cards:out.cards,coi:out.coi,engine:out.r.info.engine}));
}finally{await browser.close();await new Promise(r=>server.close(()=>r()))}
