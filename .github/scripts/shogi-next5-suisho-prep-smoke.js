const { firefox } = require('playwright');
(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  const url='http://127.0.0.1:8000/shogi-v21528/?next5prep='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:15000});

  await page.addScriptTag({url:'http://127.0.0.1:8000/shogi-side-test/next5-yaneura-prep21533.js?v='+Date.now()});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_NEXT5_PREP,{timeout:10000});

  const audit=await page.evaluate(()=>{
    const prep=window.AI_SHOGI_YANEURAOU_NEXT5_PREP,top5=window.AI_SHOGI_YANEURAOU_TOP5;
    return{
      prepVersion:prep.version,
      enabled:prep.enabled,
      liveOverride:prep.liveOverride,
      targets:prep.targets,
      roster:prep.verifyRoster(),
      profiles:prep.profiles,
      top5Version:top5.version,
      top5Indices:top5.indices,
      top5MaxLoss:top5.indices.map(i=>top5.profiles[i].maxLoss),
      coi:crossOriginIsolated
    };
  });
  console.log('NEXT5_PREP_AUDIT',JSON.stringify(audit));
  const failures=[];
  const expectedTargets=[24,23,21,5,17];
  if(audit.prepVersion!=='2.15.33-prep2')failures.push('prep version '+audit.prepVersion);
  if(audit.enabled!==false||audit.liveOverride!==false)failures.push('prep unexpectedly live');
  if(JSON.stringify(audit.targets)!==JSON.stringify(expectedTargets))failures.push('targets '+JSON.stringify(audit.targets));
  if(!audit.roster?.ok)failures.push('roster '+JSON.stringify(audit.roster));
  if(audit.top5Version!=='2.15.32-tune5')failures.push('top5 version '+audit.top5Version);
  if(JSON.stringify(audit.top5Indices)!==JSON.stringify([0,1,2,3,4]))failures.push('top5 indices '+JSON.stringify(audit.top5Indices));
  if(JSON.stringify(audit.top5MaxLoss)!==JSON.stringify([0,35,28,45,40]))failures.push('top5 maxLoss changed '+JSON.stringify(audit.top5MaxLoss));
  if(!audit.coi)failures.push('crossOriginIsolated=false');

  const probes=await page.evaluate(async()=>{
    const api=window.AI_SHOGI_YANEURAOU_NEXT5_PREP;
    const makeInitial=()=>{
      let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
      b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
      return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
    };
    const out=[];
    for(const who of api.targets){
      const p=api.profiles[who];
      const r=await api.probe(makeInitial(),who,{ms:p.desktopMs,multiPV:4});
      out.push({who:r.who,name:r.name,rating:r.rating,ms:r.ms,multiPV:r.multiPV,elapsed:r.elapsed,bestToken:r.bestToken,engine:r.info?.engine||'',candidates:r.candidates});
    }
    return out;
  });
  console.log('NEXT5_ENGINE_PROBES',JSON.stringify(probes));
  for(const p of probes){
    if(!p.bestToken)failures.push(p.name+' bestToken missing');
    if(!/YaneuraOu/.test(p.engine))failures.push(p.name+' engine '+p.engine);
    if(!Array.isArray(p.candidates)||p.candidates.length<2)failures.push(p.name+' candidates '+JSON.stringify(p.candidates));
    if(p.multiPV!==4)failures.push(p.name+' multiPV '+p.multiPV);
  }

  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS next5 Suisho5 bridge prep; live override remains OFF and top5 tune5 is unchanged');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
