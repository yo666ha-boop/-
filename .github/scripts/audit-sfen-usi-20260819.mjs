import { webkit } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.bin':'application/octet-stream','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((q,s)=>{
  let n=decodeURIComponent(new URL(q.url,'http://x').pathname);if(n.endsWith('/'))n+='index.html';
  const f=path.resolve(root,'.'+n);
  if(!f.startsWith(root)||!fs.existsSync(f)){s.writeHead(404);s.end('404');return;}
  s.setHeader('Cross-Origin-Opener-Policy','same-origin');
  s.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  s.setHeader('Cross-Origin-Resource-Policy','same-origin');
  s.setHeader('Cache-Control','no-store');
  s.setHeader('Content-Type',mime[path.extname(f).toLowerCase()]||'application/octet-stream');
  fs.createReadStream(f).pipe(s);
});
await new Promise((r,j)=>server.listen(4197,'127.0.0.1',e=>e?j(e):r()));

const browser=await webkit.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
  await page.goto('http://127.0.0.1:4197/shogi-v21528/index.html?sfenusi='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.AI_SHOGI_WEB_AUDIT?.characters===26,{timeout:120000});
  const out=await page.evaluate(async()=>{
    const api=window.AI_SHOGI_YANEURAOU_FUTURE;if(!api)throw Error('Future API missing');
    const before=api.status?.()||{};if(before.worker)throw Error('worker already started before capture');
    const RealWorker=window.Worker,posted=[];
    window.Worker=new Proxy(RealWorker,{construct(Target,args){const w=new Target(...args);const raw=w.postMessage.bind(w);w.postMessage=(m,t)=>{try{if(m?.type==='bestmove')posted.push(JSON.parse(JSON.stringify(m)))}catch{};return t===undefined?raw(m):raw(m,t)};return w;}});
    const idx=(x,y)=>y*9+x;
    function initial(){
      const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1};}
      b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
      return {b,h:{1:{},'-1':{}},t:1,log:[],last:null};
    }
    function promoFixture(){
      const b=Array(81).fill(null);b[idx(4,0)]={k:'K',o:-1};b[idx(4,8)]={k:'K',o:1};b[idx(4,3)]={k:'+P',o:1};b[idx(4,5)]={k:'+R',o:-1};
      return {b,h:{1:{R:1,P:2},'-1':{B:1,N:2}},t:1,log:Array(12).fill({}),last:null};
    }
    await api.init();
    async function capture(name,state,expected){
      const start=posted.length;let result=null,error='';
      try{result=await api.bestMove(state,{ms:300,multiPV:1});}catch(e){error=String(e?.message||e);}
      const req=posted.slice(start).find(x=>x?.type==='bestmove');
      if(!req)throw Error(name+' did not post bestmove request');
      if(req.sfen!==expected)throw Error(name+' SFEN mismatch expected='+expected+' actual='+req.sfen);
      return {name,sfen:req.sfen,token:result?.token||result?.info?.token||'',mapped:!!result?.move,resign:!!result?.resign,declareWin:!!result?.declareWin,error};
    }
    const rows=[];
    rows.push(await capture('initial',initial(),'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1'));
    rows.push(await capture('promoted-hands',promoFixture(),'4k4/9/9/4+P4/9/4+r4/9/9/4K4 b R2Pb2n 13'));
    window.Worker=RealWorker;
    const direct=await new Promise((resolve,reject)=>{
      const w=new RealWorker(new URL('./future-yaneura-worker21528.js?usi='+Date.now(),location.href).href);let id=0;const pending=new Map();
      w.onmessage=e=>{const m=e.data||{},p=pending.get(m.id);if(!p||m.type!=='result')return;pending.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker error'));};
      w.onerror=e=>reject(Error(e.message||'worker error'));
      const call=(type,data={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>j(Error(type+' timeout')),90000);pending.set(n,{r,j,t});w.postMessage({type,id:n,...data});});
      (async()=>{try{const init=await call('init');const r=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',ms:350,multiPV:1});w.terminate();resolve({init,token:r.token,info:r.info});}catch(e){try{w.terminate()}catch{}reject(e);}})();
    });
    const tok=String(direct.token||'');const usi=/^(?:[1-9][a-i][1-9][a-i]\+?|[RBGSNLP]\*[1-9][a-i]|resign|win)$/;
    if(!usi.test(tok))throw Error('non-USI token '+tok);
    return {coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,rows,direct:{token:tok,threads:direct.info?.threads,hashMB:direct.info?.hashMB,mobileWebKit:direct.info?.mobileWebKit,engine:direct.info?.engine}};
  });
  if(!out.coi||out.cards!==26)throw Error('runtime '+JSON.stringify(out));
  if(out.direct.threads!==1||out.direct.hashMB!==32||out.direct.mobileWebKit!==true)throw Error('profile '+JSON.stringify(out.direct));
  console.log('PASS_SFEN_USI '+JSON.stringify(out));
}finally{
  await browser.close();
  await new Promise(r=>server.close(()=>r()));
}
