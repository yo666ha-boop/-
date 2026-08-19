import { webkit, chromium } from 'playwright';
const mode=process.env.PLATFORM||'iphone';
const cfg={
 iphone:{type:webkit,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',hash:32,mobile:true,webkit:true,fire:false},
 fire:{type:chromium,ua:'Mozilla/5.0 (Linux; U; en-US; KFMAWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/124.5.3 like Chrome/124.0 Safari/535.19',hash:48,mobile:true,webkit:false,fire:true},
 desktop:{type:chromium,ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',hash:128,mobile:false,webkit:false,fire:false}
}[mode];if(!cfg)throw Error('bad platform '+mode);
const browser=await cfg.type.launch({headless:true});
try{
 const page=await browser.newPage({userAgent:cfg.ua});
 await page.goto('http://127.0.0.1:4213/shogi-v21528/index.html?postmerge='+mode+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:120000});
 const out=await page.evaluate(async()=>{
   const api=window.AI_SHOGI_YANEURAOU_FUTURE;const t=performance.now();await api.init();const initMs=Math.round(performance.now()-t);
   const status=api.status();const futureCard=document.querySelector('[data-future-mitsuki="1"]');
   const imgs=[...document.querySelectorAll('#chars .ch img')];const badImages=imgs.filter(i=>!i.complete||i.naturalWidth<1).length;
   const promoted={b:Array(81).fill(null),h:{1:{R:1,P:2},'-1':{B:1,N:2}},t:1,log:Array(12).fill({}),last:null};const idx=(x,y)=>y*9+x;promoted.b[idx(4,0)]={k:'K',o:-1};promoted.b[idx(4,8)]={k:'K',o:1};promoted.b[idx(4,3)]={k:'+P',o:1};promoted.b[idx(4,5)]={k:'+R',o:-1};
   const promotedSFEN=api.toSFEN(promoted);
   const direct=await new Promise((resolve,reject)=>{const w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?post='+Date.now());let id=0,P=new Map(),stages=[];w.onmessage=e=>{const m=e.data||{};if(m.type==='stage'){stages.push(m.text);return}const p=P.get(m.id);if(!p||m.type!=='result')return;P.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker'))};w.onerror=e=>reject(Error(e.message||'worker'));const call=(type,x={},timeout=90000)=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>j(Error(type+' timeout '+stages.slice(-10).join(' | '))),timeout);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});(async()=>{try{const a=Date.now(),init=await call('init'),initElapsed=Date.now()-a;const early=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 2',ms:300,multiPV:1});const late=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/pppppp1pp/7p1/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL w - 12',ms:4000,multiPV:1});resolve({init,initElapsed,early,late,stages:stages.slice(-12)})}catch(e){reject(e)}finally{w.terminate()}})()});
   return{coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,badImages,futureCard:!!futureCard,status,initMs,promotedSFEN,sound:window.AI_SHOGI_PIECE_SOUND?.audit?.()||null,direct};
 });
 const valid=/^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i]|resign|win)$/;
 if(!out.coi||out.cards!==26||out.badImages!==0||!out.futureCard||!out.status.ready||!out.status.worker)throw Error('app '+JSON.stringify(out));
 if(out.promotedSFEN!=='4k4/9/9/4+P4/9/4+r4/9/9/4K4 b R2Pb2n 13')throw Error('SFEN '+out.promotedSFEN);
 const d=out.direct;if(d.init.threads!==1||d.init.hashMB!==cfg.hash||d.init.mobileSafe!==cfg.mobile||d.init.mobileWebKit!==cfg.webkit||d.init.fireSilk!==cfg.fire)throw Error('profile '+JSON.stringify(d.init));
 if(!valid.test(d.early.token||'')||!valid.test(d.late.token||''))throw Error('USI '+d.early.token+' '+d.late.token);
 if(d.early.info?.adaptive!==false)throw Error('early adaptive '+JSON.stringify(d.early.info));
 if(cfg.mobile){if(d.late.info?.adaptive!==true||d.late.info?.adaptiveMinMove!==12)throw Error('late adaptive '+JSON.stringify(d.late.info))}else if(d.late.info?.adaptive!==false)throw Error('desktop adaptive '+JSON.stringify(d.late.info));
 if(out.sound?.enabled!==true||out.sound?.buttons!==2)throw Error('sound '+JSON.stringify(out.sound));
 console.log('PASS_POSTMERGE_FUTURE '+JSON.stringify({platform:mode,initMs:out.initMs,directInitMs:d.initElapsed,threads:d.init.threads,hashMB:d.init.hashMB,mobileSafe:d.init.mobileSafe,early:d.early.token,late:d.late.token,lateAdaptive:!!d.late.info?.adaptive,lateReranked:!!d.late.info?.reranked,cards:out.cards,badImages:out.badImages,sfen:true,sound:out.sound,coi:out.coi,engine:d.late.info?.engine}));
}finally{await browser.close()}
