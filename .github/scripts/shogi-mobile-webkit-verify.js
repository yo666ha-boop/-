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
    const baseKind=k=>String(k||'').replace(/^\+/, '');
    function applyMove(s,m){
      if(!m||!Number.isInteger(m.to))throw new Error('bad move '+JSON.stringify(m));
      const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:{...m}};
      if(m.drop){
        const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop '+m.drop);
        n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};
      }else{
        const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch '+JSON.stringify(m)+' turn='+s.t);
        const cap=n.b[m.to];if(cap&&cap.o===s.t)throw new Error('own capture '+JSON.stringify(m));
        n.b[m.f]=null;
        if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}
        let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};
      }
      n.t=-s.t;n.log.push('mobile-soak');return n;
    }
    function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
    function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}

    const s=initialState();
    await shared.init();
    const future=await shared.bestMove(s);
    const mama=await top.bestMove(s,4);

    let soakState=initialState();
    const plan=[
      {kind:'top',who:4,name:'まま'},
      {kind:'future',ms:500,name:'未来500'},
      {kind:'top',who:1,name:'みっちゃん'},
      {kind:'future',ms:500,name:'未来500'},
      {kind:'top',who:2,name:'あき王'},
      {kind:'future',ms:500,name:'未来500'},
      {kind:'top',who:3,name:'おにまま'},
      {kind:'future',ms:500,name:'未来500'}
    ];
    const soak=[];
    for(const step of plan){
      let r,profile=null;
      if(step.kind==='top'){
        profile=top.profiles[step.who];r=await top.bestMove(soakState,step.who);
      }else r=await shared.bestMove(soakState,{ms:step.ms,multiPV:1});
      if(!r?.move)throw new Error('soak no move '+step.name);
      soak.push({name:step.name,kind:step.kind,move:token(r.move),ms:r?.info?.ms,threads:r?.info?.threads,hashMB:r?.info?.hashMB,mobileWebKit:r?.info?.mobileWebKit,engine:r?.info?.engine,depth:r?.info?.depth,nodes:r?.info?.nodes,selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,maxLoss:profile?.maxLoss});
      soakState=applyMove(soakState,r.move);
    }

    const endState=initialState();endState.log=Array(55).fill('endgame-probe');
    const futureEnd=await shared.bestMove(endState);
    const mamaEnd=await top.bestMove(endState,4);

    return{
      ua:navigator.userAgent,
      coi:crossOriginIsolated,
      topVersion:top.version,
      mobileMs:top.indices.map(i=>top.profileMs({log:[]},i)),
      mobileEndgameMs:top.indices.map(i=>top.profileMs({log:Array(55).fill('x')},i)),
      future:{move:!!future?.move,ms:future?.info?.ms,threads:future?.info?.threads,hashMB:future?.info?.hashMB,mobileWebKit:future?.info?.mobileWebKit,engine:future?.info?.engine,depth:future?.info?.depth,nodes:future?.info?.nodes},
      mama:{move:!!mama?.move,ms:mama?.info?.ms,threads:mama?.info?.threads,hashMB:mama?.info?.hashMB,mobileWebKit:mama?.info?.mobileWebKit,engine:mama?.info?.engine,selectedRank:mama?.info?.selectedRank,cpLoss:mama?.info?.cpLoss},
      futureEnd:{move:!!futureEnd?.move,ms:futureEnd?.info?.ms,threads:futureEnd?.info?.threads,hashMB:futureEnd?.info?.hashMB,mobileWebKit:futureEnd?.info?.mobileWebKit,engine:futureEnd?.info?.engine,depth:futureEnd?.info?.depth,nodes:futureEnd?.info?.nodes},
      mamaEnd:{move:!!mamaEnd?.move,ms:mamaEnd?.info?.ms,threads:mamaEnd?.info?.threads,hashMB:mamaEnd?.info?.hashMB,mobileWebKit:mamaEnd?.info?.mobileWebKit,engine:mamaEnd?.info?.engine,selectedRank:mamaEnd?.info?.selectedRank,cpLoss:mamaEnd?.info?.cpLoss},
      soak,
      soakPly:soakState.log.length
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
  if(!audit.futureEnd.move||audit.futureEnd.ms!==7000)failures.push('Future mobile endgame '+JSON.stringify(audit.futureEnd));
  if(!audit.mamaEnd.move||audit.mamaEnd.ms!==2500)failures.push('Mama mobile endgame '+JSON.stringify(audit.mamaEnd));
  for(const r of [audit.futureEnd,audit.mamaEnd])if(r.threads!==1||r.hashMB!==32||r.mobileWebKit!==true||!/YaneuraOu/.test(r.engine||'')||!(r.nodes>0))failures.push('endgame worker config '+JSON.stringify(r));
  if(audit.soakPly!==8||!Array.isArray(audit.soak)||audit.soak.length!==8)failures.push('soak length '+audit.soakPly+'/'+audit.soak?.length);
  for(const r of audit.soak||[]){
    if(!r.move)failures.push('soak '+r.name+' no move');
    if(r.threads!==1||r.hashMB!==32||r.mobileWebKit!==true)failures.push('soak '+r.name+' worker config '+JSON.stringify(r));
    if(!/YaneuraOu/.test(r.engine||''))failures.push('soak '+r.name+' engine='+r.engine);
    if(!(r.nodes>0))failures.push('soak '+r.name+' nodes='+r.nodes);
    if(r.kind==='top'&&r.cpLoss>(r.maxLoss||0))failures.push('soak '+r.name+' cpLoss '+r.cpLoss+' > '+r.maxLoss);
    if(r.kind==='future'&&r.ms!==500)failures.push('soak '+r.name+' ms='+r.ms);
  }
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS iPhone WebKit proxy: COI + Threads1/Hash32 + normal/endgame budgets + 8-ply shared-worker soak');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
