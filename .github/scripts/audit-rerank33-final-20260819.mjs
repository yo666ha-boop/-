import { webkit, chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.bin':'application/octet-stream','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((q,s)=>{let n=decodeURIComponent(new URL(q.url,'http://x').pathname);if(n.endsWith('/'))n+='index.html';const f=path.resolve(root,'.'+n);if(!f.startsWith(root)||!fs.existsSync(f)){s.writeHead(404);s.end('404');return}for(const [k,v] of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))s.setHeader(k,v);s.setHeader('Content-Type',mime[path.extname(f).toLowerCase()]||'application/octet-stream');fs.createReadStream(f).pipe(s)});
await new Promise((r,j)=>server.listen(4204,'127.0.0.1',e=>e?j(e):r()));

async function auditSFEN(){
  const browser=await webkit.launch({headless:true});
  try{
    const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
    await page.goto('http://127.0.0.1:4204/shogi-v21528/index.html?sfenCandidate='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.AI_SHOGI_WEB_AUDIT?.characters===26,{timeout:120000});
    const out=await page.evaluate(async()=>{
      const api=window.AI_SHOGI_YANEURAOU_FUTURE;if(!api)throw Error('Future API missing');
      const RealWorker=window.Worker,posted=[];
      window.Worker=new Proxy(RealWorker,{construct(Target,args){const w=new Target(...args),raw=w.postMessage.bind(w);w.postMessage=(m,t)=>{try{if(m?.type==='bestmove')posted.push(JSON.parse(JSON.stringify(m)))}catch{};return t===undefined?raw(m):raw(m,t)};return w;}});
      const idx=(x,y)=>y*9+x;
      function initial(){const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};return{b,h:{1:{},'-1':{}},t:1,log:[],last:null}}
      function promoFixture(){const b=Array(81).fill(null);b[idx(4,0)]={k:'K',o:-1};b[idx(4,8)]={k:'K',o:1};b[idx(4,3)]={k:'+P',o:1};b[idx(4,5)]={k:'+R',o:-1};return{b,h:{1:{R:1,P:2},'-1':{B:1,N:2}},t:1,log:Array(12).fill({}),last:null}}
      await api.init();
      async function capture(name,state,expected){const start=posted.length;let result=null,error='';try{result=await api.bestMove(state,{ms:300,multiPV:1})}catch(e){error=String(e?.message||e)}const req=posted.slice(start).find(x=>x?.type==='bestmove');if(!req)throw Error(name+' missing request');if(req.sfen!==expected)throw Error(name+' SFEN mismatch '+req.sfen);return{name,sfen:req.sfen,mapped:!!result?.move,resign:!!result?.resign,declareWin:!!result?.declareWin,error,token:result?.info?.token||''}}
      const rows=[];rows.push(await capture('initial',initial(),'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1'));rows.push(await capture('promoted-hands',promoFixture(),'4k4/9/9/4+P4/9/4+r4/9/9/4K4 b R2Pb2n 13'));
      window.Worker=RealWorker;
      const direct=await new Promise((resolve,reject)=>{const w=new RealWorker(new URL('./future-yaneura-worker21528.js?direct='+Date.now(),location.href).href);let id=0,P=new Map();w.onmessage=e=>{const m=e.data||{},p=P.get(m.id);if(!p||m.type!=='result')return;P.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker error'))};w.onerror=e=>reject(Error(e.message||'worker error'));const call=(type,data={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout'))},90000);P.set(n,{r,j,t});w.postMessage({type,id:n,...data})});(async()=>{try{const init=await call('init'),r=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',ms:350,multiPV:1});w.terminate();resolve({init,token:r.token,info:r.info})}catch(e){try{w.terminate()}catch{}reject(e)}})()});
      return{coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,rows,direct};
    });
    const tok=String(out.direct.token||''),usi=/^(?:[1-9][a-i][1-9][a-i]\+?|[RBGSNLP]\*[1-9][a-i]|resign|win)$/;
    if(!out.coi||out.cards!==26||!usi.test(tok))throw Error('SFEN/USI runtime '+JSON.stringify(out));
    if(out.rows.some(r=>r.error||(!r.mapped&&!r.resign&&!r.declareWin)))throw Error('app mapping '+JSON.stringify(out.rows));
    if(out.direct.init.threads!==1||out.direct.init.hashMB!==32||out.direct.init.mobileWebKit!==true)throw Error('iPhone profile '+JSON.stringify(out.direct.init));
    console.log('PASS_SFEN_USI_RERANK20 '+JSON.stringify({rows:out.rows,direct:{token:tok,threads:out.direct.init.threads,hashMB:out.direct.init.hashMB,mobileWebKit:out.direct.init.mobileWebKit,engine:out.direct.info?.engine}}));
  }finally{await browser.close()}
}

async function auditDesktop(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
    await page.goto('http://127.0.0.1:4204/shogi-v21528/index.html?desktopCandidate='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
    const out=await page.evaluate(async()=>{const w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?desktop='+Date.now());let id=0,P=new Map();w.onmessage=e=>{const m=e.data||{},p=P.get(m.id);if(!p||m.type!=='result')return;P.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker'))};const call=(type,x={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout'))},90000);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});try{const init=await call('init'),started=Date.now(),r=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',ms:700,multiPV:1});return{coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,init,r,elapsed:Date.now()-started}}finally{w.terminate()}});
    if(!out.coi||out.cards!==26)throw Error('desktop page');
    if(out.init.mobileSafe||out.init.mobileWebKit||out.init.fireSilk||out.init.threads!==2||out.init.hashMB!==128)throw Error('desktop profile '+JSON.stringify(out.init));
    if(out.r.info?.adaptive)throw Error('desktop unexpectedly adaptive '+JSON.stringify(out.r.info));
    if(out.r.info?.threads!==2||out.r.info?.hashMB!==128||out.r.info?.mobileSafe)throw Error('desktop info '+JSON.stringify(out.r.info));
    console.log('PASS_DESKTOP_RERANK20 '+JSON.stringify({token:out.r.token,elapsed:out.elapsed,threads:out.r.info.threads,hashMB:out.r.info.hashMB,mobileSafe:out.r.info.mobileSafe,adaptive:!!out.r.info.adaptive,cards:out.cards,coi:out.coi}));
  }finally{await browser.close()}
}

try{await auditSFEN();await auditDesktop()}finally{await new Promise(r=>server.close(()=>r()))}
