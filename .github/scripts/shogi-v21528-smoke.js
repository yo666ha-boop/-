const { firefox } = require('playwright');
const fs=require('fs');
const vm=require('vm');
(async()=>{
  const staticCtx={window:{}};vm.createContext(staticCtx);
  vm.runInContext(fs.readFileSync('shogi-side-test/future-mitsuki-image21520.js','utf8'),staticCtx);
  const data=staticCtx.window.FUTURE_MITSUKI_IMAGE21520||'';
  const b64=(data.split(',')[1]||'');const buf=Buffer.from(b64,'base64');
  const jpeg={dataPrefix:data.slice(0,30),b64Length:b64.length,bytes:buf.length,soi:buf.length>2&&buf[0]===0xff&&buf[1]===0xd8,eoi:buf.length>2&&buf[buf.length-2]===0xff&&buf[buf.length-1]===0xd9};
  console.log('FUTURE_IMAGE_STATIC',JSON.stringify(jpeg));

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

  let init=null,initError='';
  try{init=await page.evaluate(async()=>{const api=window.AI_SHOGI_YANEURAOU_FUTURE;if(!api)throw new Error('future API missing');await api.init();return api.status();});}
  catch(e){initError=String(e&&e.message||e)}
  console.log('INIT',JSON.stringify(init),'INIT_ERROR',initError);

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
  if(!ui.coi)failures.push('crossOriginIsolated=false');
  if(/v2\.15\.(14|17|20)/.test(ui.badge))failures.push('legacy badge leaked: '+ui.badge);
  if(!jpeg.soi||!jpeg.eoi)failures.push('future embedded JPEG markers invalid '+JSON.stringify(jpeg));
  if(!init||!init.ready)failures.push('engine init failed: '+(initError||JSON.stringify(init)));
  if(init&&init.ready&&(!best||(!best.move&&!best.resign&&!best.declareWin)))failures.push('bestmove failed: '+(bestError||JSON.stringify(best)));
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS v2.15.28 Firefox: 26 chars, images, COI, no legacy badge, readyok, bestmove');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
