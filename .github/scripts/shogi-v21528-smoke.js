const { firefox } = require('playwright');
(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  const logs=[];
  page.on('console',m=>logs.push('console '+m.type()+': '+m.text()));
  page.on('pageerror',e=>logs.push('pageerror: '+e.message));
  const url='http://127.0.0.1:8000/shogi-v21528/?ci='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated))){await page.reload({waitUntil:'domcontentloaded',timeout:60000});}
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForTimeout(5000);
  const ui=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('#chars .ch')];
    const names=cards.map(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim());
    const bad=cards.map((c,i)=>({i,name:names[i],img:c.querySelector('img')})).filter(x=>!x.img||!x.img.complete||x.img.naturalWidth<1).map(x=>x.name||('#'+x.i));
    return {count:cards.length,names,bad,badge:document.querySelector('.badge')?.textContent||'',coi:crossOriginIsolated,future:names[25],micchan:names[1]};
  });
  console.log('UI',JSON.stringify(ui));
  if(ui.count!==26)throw new Error('character count '+ui.count);
  if(ui.future!=='未来からやってきたみつき')throw new Error('future character missing: '+ui.future);
  if(ui.micchan!=='みっちゃん')throw new Error('micchan slot mismatch: '+ui.micchan);
  if(ui.bad.length)throw new Error('broken images: '+ui.bad.join(','));
  if(!ui.coi)throw new Error('crossOriginIsolated=false');
  if(/v2\.15\.(17|20)/.test(ui.badge))throw new Error('legacy badge leaked: '+ui.badge);
  const init=await page.evaluate(async()=>{
    const api=window.AI_SHOGI_YANEURAOU_FUTURE;if(!api)throw new Error('future API missing');
    await api.init();return api.status();
  });
  console.log('INIT',JSON.stringify(init));
  if(!init.ready)throw new Error('engine not ready: '+JSON.stringify(init));
  const best=await page.evaluate(async()=>{
    const api=window.AI_SHOGI_YANEURAOU_FUTURE;
    let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
    for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
    b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
    return await api.bestMove({b,h:{1:{},'-1':{}},t:1,log:[],last:null});
  });
  console.log('BEST',JSON.stringify(best));
  if(!best||(!best.move&&!best.resign&&!best.declareWin))throw new Error('bestmove not returned');
  console.log('PASS v2.15.28 Firefox: 26 chars, images, COI, readyok, bestmove');
  await browser.close();
})().catch(async e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
