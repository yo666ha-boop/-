const { firefox } = require('playwright');
(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  const url='http://127.0.0.1:8000/shogi-v21528/?top5='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5,{timeout:10000});

  const audit=await page.evaluate(()=>{
    const api=window.AI_SHOGI_YANEURAOU_TOP5;
    const chars=window.AIShogiIOS.characters().slice(0,5);
    const dummy={log:[]};
    return {indices:api.indices,names:api.names,ratings:api.ratings,sharedWorker:api.sharedWorker,engine:api.engine,profiles:api.profiles,normalMs:api.indices.map(i=>api.profileMs(dummy,i)),chars,coi:crossOriginIsolated};
  });
  console.log('TOP5_AUDIT',JSON.stringify(audit));
  const expectedNames=['みつき','みっちゃん','あき王','おにまま','まま'];
  const expectedRatings=[3000,2850,2700,2600,2500];
  const expectedNormalMs=[5200,4200,3400,2700,2200];
  const failures=[];
  if(JSON.stringify(audit.indices)!==JSON.stringify([0,1,2,3,4]))failures.push('indices '+JSON.stringify(audit.indices));
  if(JSON.stringify(audit.names)!==JSON.stringify(expectedNames))failures.push('names '+JSON.stringify(audit.names));
  if(JSON.stringify(audit.ratings)!==JSON.stringify(expectedRatings))failures.push('ratings '+JSON.stringify(audit.ratings));
  if(JSON.stringify(audit.normalMs)!==JSON.stringify(expectedNormalMs))failures.push('normalMs '+JSON.stringify(audit.normalMs));
  if(!audit.sharedWorker)failures.push('sharedWorker=false');
  if(!/YaneuraOu/.test(audit.engine||''))failures.push('engine '+audit.engine);
  if(!audit.coi)failures.push('crossOriginIsolated=false');
  for(const c of audit.chars)if(!String(c.feature||'').includes('やねうら王＋水匠5'))failures.push(c.name+' feature missing engine marker');

  const cards=await page.locator('#chars .ch').all();
  for(let i=0;i<5;i++){
    await cards[i].click();
    await page.waitForTimeout(120);
    const op=await page.locator('#oppName').textContent();
    if(!String(op||'').startsWith(expectedNames[i]))failures.push('opponent '+i+' '+op);
  }

  let engineResult=null,engineError='';
  try{
    engineResult=await page.evaluate(async()=>{
      const api=window.AI_SHOGI_YANEURAOU_TOP5;
      await api.init();
      let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
      b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
      return await api.bestMove({b,h:{1:{},'-1':{}},t:1,log:[],last:null},4);
    });
  }catch(e){engineError=String(e&&e.message||e)}
  console.log('TOP5_ENGINE',JSON.stringify(engineResult),'ERROR',engineError);
  if(!engineResult||(!engineResult.move&&!engineResult.resign&&!engineResult.declareWin))failures.push('shared engine bestmove failed '+(engineError||JSON.stringify(engineResult)));
  if(engineResult?.info?.engine&&!String(engineResult.info.engine).includes('YaneuraOu'))failures.push('unexpected engine '+engineResult.info.engine);
  if(engineResult?.info?.ms!==2200)failures.push('R2500 movetime '+engineResult?.info?.ms);

  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS top5 ladder: R3000>R2850>R2700>R2600>R2500 with shared YaneuraOu HalfKP + Suisho5');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
