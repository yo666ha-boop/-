const { firefox } = require('playwright');
const fs=require('fs');
const vm=require('vm');
(async()=>{
  const staticCtx={window:{}};vm.createContext(staticCtx);
  vm.runInContext(fs.readFileSync('shogi-side-test/future-mitsuki-image21520.js','utf8'),staticCtx);
  const data=staticCtx.window.FUTURE_MITSUKI_IMAGE21520||'';
  const b64=(data.split(',')[1]||'');const buf=Buffer.from(b64,'base64');
  console.log('FUTURE_IMAGE_STATIC',JSON.stringify({dataPrefix:data.slice(0,30),b64Length:b64.length,bytes:buf.length,head:buf.subarray(0,8).toString('hex'),tail:buf.subarray(-8).toString('hex')}));

  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  const browserLogs=[];
  page.on('console',m=>browserLogs.push('console '+m.type()+': '+m.text()));
  page.on('pageerror',e=>browserLogs.push('pageerror: '+e.message));
  const url='http://127.0.0.1:8000/shogi-v21528/?ci='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated))){await page.reload({waitUntil:'domcontentloaded',timeout:60000});}
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForTimeout(5000);
  const ui=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('#chars .ch')];
    const names=cards.map(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim());
    const imageDetails=cards.map((c,i)=>{const img=c.querySelector('img');return{i,name:names[i],complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0,src:(img?.src||'').slice(0,120)}});
    const bad=imageDetails.filter(x=>!x.complete||x.w<1).map(x=>x.name||('#'+x.i));
    return {count:cards.length,names,bad,imageDetails,badge:document.querySelector('.badge')?.textContent||'',coi:crossOriginIsolated,future:names[25],micchan:names[1]};
  });
  console.log('UI',JSON.stringify(ui));

  const opponentChecks={};
  for(const target of ['しんじ','ぺんぺん']){
    await page.evaluate(name=>{
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===name);
      if(!card)throw new Error('card missing '+name);
      card.click();
    },target);
    await page.waitForTimeout(700);
    opponentChecks[target]=await page.evaluate(()=>{
      const img=document.querySelector('#oppPortrait img');
      const fimg=document.querySelector('#foppPortrait img');
      return {ci:typeof ci==='number'?ci:null,name:(document.querySelector('#oppName')?.textContent||'').trim(),rank:(document.querySelector('#oppRank')?.textContent||'').trim(),img:{alt:img?.alt||'',src:img?.src||'',complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0},focus:{alt:fimg?.alt||'',src:fimg?.src||'',complete:!!fimg?.complete,w:fimg?.naturalWidth||0,h:fimg?.naturalHeight||0}};
    });
  }
  console.log('OPPONENT_CHECKS',JSON.stringify(opponentChecks));

  const probes=await page.evaluate(async()=>{
    async function testUrl(url,limit=1){
      return await new Promise(resolve=>{
        const out={url,messages:[],error:null};let w,done=false;
        const finish=()=>{if(done)return;done=true;try{w?.terminate()}catch(e){};resolve(out)};
        try{w=new Worker(url)}catch(e){out.error='construct '+String(e&&e.message||e);finish();return}
        w.onmessage=e=>{out.messages.push(e.data);if(out.messages.length>=limit)finish()};
        w.onerror=e=>{out.error={message:e.message||'',filename:e.filename||'',lineno:e.lineno||0,colno:e.colno||0,type:e.type||''};finish()};
        setTimeout(finish,3000);
      });
    }
    const blob=URL.createObjectURL(new Blob(["self.postMessage({ok:true,type:'blob',coi:globalThis.crossOriginIsolated,sab:typeof SharedArrayBuffer})"],{type:'text/javascript'}));
    const out={};
    out.blob=await testUrl(blob,1);URL.revokeObjectURL(blob);
    out.local=await testUrl(new URL('./worker-local21528.js?probe='+Date.now(),location.href).href,1);
    out.side=await testUrl(new URL('../shogi-side-test/worker-probe21528.js?probe='+Date.now(),location.href).href,1);
    out.future=await testUrl(new URL('./future-yaneura-worker21528.js?probe='+Date.now(),location.href).href,3);
    return out;
  });
  console.log('WORKER_PROBES',JSON.stringify(probes));

  let init=null,initError='',engineState=null;
  try{init=await page.evaluate(async()=>{const api=window.AI_SHOGI_YANEURAOU_FUTURE;if(!api)throw new Error('future API missing');await api.init();return api.status();});}
  catch(e){initError=String(e&&e.message||e);engineState=await page.evaluate(()=>{const a=window.AI_SHOGI_YANEURAOU_FUTURE;return a?{state:a.state,status:a.status?.()}:null}).catch(()=>null)}
  console.log('INIT',JSON.stringify(init),'INIT_ERROR',initError,'ENGINE_STATE',JSON.stringify(engineState));

  let best=null,bestError='';
  if(init&&init.ready){
    try{best=await page.evaluate(async()=>{
      const api=window.AI_SHOGI_YANEURAOU_FUTURE;
      let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
      b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
      return await api.bestMove({b,h:{1:{},'-1':{}},t:1,log:[],last:null});
    });}catch(e){bestError=String(e&&e.message||e)}
  }
  console.log('BEST',JSON.stringify(best),'BEST_ERROR',bestError);
  if(browserLogs.length)console.log('BROWSER_LOGS',browserLogs.join('\n'));

  const failures=[];
  if(ui.count!==26)failures.push('character count '+ui.count);
  if(ui.future!=='未来からやってきたみつき')failures.push('future character missing: '+ui.future);
  if(ui.micchan!=='みっちゃん')failures.push('micchan slot mismatch: '+ui.micchan);
  if(ui.bad.length)failures.push('broken images: '+ui.bad.join(','));
  for(const target of ['しんじ','ぺんぺん']){
    const c=opponentChecks[target];
    if(!c||c.name!==target)failures.push(target+' opponent name mismatch: '+JSON.stringify(c));
    if(!c?.img?.complete||c.img.w<1)failures.push(target+' opponent image broken: '+JSON.stringify(c));
    if(c?.img?.alt!==target)failures.push(target+' opponent alt mismatch: '+JSON.stringify(c));
  }
  if(!ui.coi)failures.push('crossOriginIsolated=false');
  if(/v2\.15\.(14|17|20)/.test(ui.badge))failures.push('legacy badge leaked: '+ui.badge);
  for(const k of ['blob','local'])if(probes[k].error||!probes[k].messages.length)failures.push(k+' worker failed: '+JSON.stringify(probes[k]));
  if(probes.future.error||!probes.future.messages.length)failures.push('future worker probe error: '+JSON.stringify(probes.future));
  if(!init||!init.ready)failures.push('engine init failed: '+(initError||JSON.stringify(init))+' state='+JSON.stringify(engineState));
  if(init&&init.ready&&(!best||(!best.move&&!best.resign&&!best.declareWin)))failures.push('bestmove failed: '+(bestError||JSON.stringify(best)));
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS v2.15.28 Firefox: 26 chars, images, Shinji/Penpen opponent portraits, COI runtime, readyok, bestmove');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
