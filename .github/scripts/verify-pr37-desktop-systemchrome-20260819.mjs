import { chromium } from 'playwright';
import fs from 'fs';
const exe=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);if(!exe)throw Error('system Chrome/Chromium not found');
const browser=await chromium.launch({headless:true,executablePath:exe});
try{
 const page=await browser.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
 await page.goto('http://127.0.0.1:4212/shogi-v21528/index.html?desktopFast='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
 const out=await page.evaluate(async()=>new Promise((resolve,reject)=>{const stages=[],w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?desktopFast='+Date.now());let id=0,P=new Map();w.onmessage=e=>{const m=e.data||{};if(m.type==='stage'){stages.push(m.text);return}const p=P.get(m.id);if(!p||m.type!=='result')return;P.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'worker'))};w.onerror=e=>reject(Error(e.message||'worker'));const call=(type,x={},timeout=90000)=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout stages='+stages.slice(-12).join(' | ')))},timeout);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});(async()=>{try{const t=Date.now(),init=await call('init',{},90000),initElapsed=Date.now()-t,s=Date.now(),r=await call('bestmove',{sfen:'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',ms:700,multiPV:1},60000);resolve({coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,init,initElapsed,r,elapsed:Date.now()-s,stages:stages.slice(-16)})}catch(e){reject(e)}finally{w.terminate()}})()}));
 console.log('PR37_DESKTOP_SYSTEM_CHROME '+JSON.stringify({exe,...out}));
 if(!out.coi||out.cards!==26||out.init.threads!==1||out.init.hashMB!==128||out.init.mobileSafe||out.init.mobileWebKit||out.init.fireSilk)throw Error('profile '+JSON.stringify(out));
 if(out.r.info?.threads!==1||out.r.info?.hashMB!==128||out.r.info?.mobileSafe||out.r.info?.adaptive)throw Error('search profile '+JSON.stringify(out.r.info));
 if(!/^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i]|resign|win)$/.test(out.r.token||''))throw Error('bad USI '+out.r.token);
 console.log('PASS_PR37_DESKTOP_SYSTEM_CHROME '+JSON.stringify({exe,token:out.r.token,initMs:out.initElapsed,elapsed:out.elapsed,threads:out.r.info.threads,hashMB:out.r.info.hashMB,mobileSafe:out.r.info.mobileSafe,adaptive:!!out.r.info.adaptive,cards:out.cards,coi:out.coi,engine:out.r.info.engine,stages:out.stages}));
}finally{await browser.close()}
