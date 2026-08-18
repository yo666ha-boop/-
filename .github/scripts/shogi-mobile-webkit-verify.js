const { webkit, devices } = require('playwright');

(async()=>{
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?mobilewebkit='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});

  const audit=await page.evaluate(async()=>{
    const top=window.AI_SHOGI_YANEURAOU_TOP5,shared=window.AI_SHOGI_YANEURAOU_FUTURE;
    function initialState(){
      const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
      b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
      return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
    }
    const s=initialState();
    await shared.init();
    const future=await shared.bestMove(s);
    const mama=await top.bestMove(s,4);
    return{
      ua:navigator.userAgent,
      coi:crossOriginIsolated,
      topVersion:top.version,
      mobileMs:top.indices.map(i=>top.profileMs({log:[]},i)),
      mobileEndgameMs:top.indices.map(i=>top.profileMs({log:Array(55).fill('x')},i)),
      future:{move:!!future?.move,ms:future?.info?.ms,threads:future?.info?.threads,hashMB:future?.info?.hashMB,mobileWebKit:future?.info?.mobileWebKit,engine:future?.info?.engine,depth:future?.info?.depth,nodes:future?.info?.nodes},
      mama:{move:!!mama?.move,ms:mama?.info?.ms,threads:mama?.info?.threads,hashMB:mama?.info?.hashMB,mobileWebKit:mama?.info?.mobileWebKit,engine:mama?.info?.engine,selectedRank:mama?.info?.selectedRank,cpLoss:mama?.info?.cpLoss}
    };
  });
  console.log('MOBILE_WEBKIT_AUDIT',JSON.stringify(audit));
  const failures=[];
  if(!/iPhone/i.test(audit.ua||''))failures.push('UA is not iPhone');
  if(!audit.coi)failures.push('crossOriginIsolated=false');
  if(JSON.stringify(audit.mobileMs)!==JSON.stringify([3300,2800,2300,1850,1500]))failures.push('mobile normal budgets '+JSON.stringify(audit.mobileMs));
  if(JSON.stringify(audit.mobileEndgameMs)!==JSON.stringify([5000,4300,3600,3000,2500]))failures.push('mobile endgame budgets '+JSON.stringify(audit.mobileEndgameMs));
  if(!audit.future.move)failures.push('Future no bestmove');
  if(audit.future.ms!==4500)failures.push('Future mobile ms '+audit.future.ms);
  if(audit.future.threads!==1||audit.future.hashMB!==32||audit.future.mobileWebKit!==true)failures.push('Future mobile worker config '+JSON.stringify(audit.future));
  if(!audit.mama.move)failures.push('Mama no bestmove');
  if(audit.mama.ms!==1500)failures.push('Mama mobile ms '+audit.mama.ms);
  if(audit.mama.threads!==1||audit.mama.hashMB!==32||audit.mama.mobileWebKit!==true)failures.push('Mama mobile worker config '+JSON.stringify(audit.mama));
  if(!/YaneuraOu/.test(audit.future.engine||'')||!/YaneuraOu/.test(audit.mama.engine||''))failures.push('engine marker missing');
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS iPhone WebKit proxy: COI + Threads1/Hash32 + mobile budgets + bestmove');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
