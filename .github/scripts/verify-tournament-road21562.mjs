import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e?.message||e))); page.on('dialog',async d=>d.accept());
  const url='http://127.0.0.1:8000/shogi-v21528/?road21562='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10&&window.__AI_SHOGI_TOURNAMENT_ROAD_21562,{timeout:60000});
  await page.evaluate(()=>{const t=window.AI_SHOGI_TOURNAMENT;if(t.state()?.active)t.exit();if(!t.start('kenshiro'))throw new Error('start failed');t.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.()});
  await page.waitForFunction(()=>document.querySelectorAll('#tournament21540Panel .tourRoadStage21562').length===5,{timeout:30000});

  const setState=async (patch,expect)=>page.evaluate(async ({p,e})=>{
    const k='aiShogiTournament21540',s=JSON.parse(localStorage.getItem(k)||'null');if(!s?.active)throw new Error('no active');
    Object.assign(s.active,p.active||{});s.active.bossChallenge={...(s.active.bossChallenge||{}),...(p.bossChallenge||{})};localStorage.setItem(k,JSON.stringify(s));
    const snap=()=>{const xs=[...document.querySelectorAll('#tournament21540Panel .tourRoadStage21562')],t=window.AI_SHOGI_TOURNAMENT,a=t?.state?.()?.active,boss=t?.cups?.().find(c=>c.id===a?.cupId)?.boss||'';return {labels:xs.map(x=>x.textContent.trim()),done:xs.filter(x=>x.classList.contains('done')).length,current:xs.findIndex(x=>x.classList.contains('current')),failed:xs.some(x=>x.classList.contains('failed')),bossInBracket:!!boss&&[...document.querySelectorAll('.tourBracketSlot')].some(x=>(x.textContent||'').includes(boss)),boss,roster:document.querySelectorAll('#chars .ch').length,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)}};
    const deadline=Date.now()+10000;
    while(Date.now()<deadline){window.AI_SHOGI_TOURNAMENT?.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();await new Promise(r=>setTimeout(r,50));const row=snap();if(JSON.stringify(row.labels)===JSON.stringify(['1R','QF','SF','F','EX'])&&row.done===e.done&&row.current===e.current&&row.failed===e.failed)return row;}
    return snap();
  },{p:patch,e:expect});
  const cases=[];
  for(const [name,patch,expect] of [
    ['1R',{active:{round:0,status:'active'},bossChallenge:{status:'locked'}},{done:0,current:0,failed:false}],
    ['QF',{active:{round:1,status:'active'},bossChallenge:{status:'locked'}},{done:1,current:1,failed:false}],
    ['SF',{active:{round:2,status:'active'},bossChallenge:{status:'locked'}},{done:2,current:2,failed:false}],
    ['F',{active:{round:3,status:'active'},bossChallenge:{status:'locked'}},{done:3,current:3,failed:false}],
    ['SF_LOST',{active:{round:2,status:'lost'},bossChallenge:{status:'locked'}},{done:2,current:2,failed:true}],
    ['EX',{active:{round:3,status:'champion'},bossChallenge:{status:'pending'}},{done:4,current:4,failed:false}]
  ]){
    const row=await setState(patch,expect); const bad=[];
    if(JSON.stringify(row.labels)!==JSON.stringify(['1R','QF','SF','F','EX']))bad.push('labels');
    for(const k of ['done','current','failed'])if(row[k]!==expect[k])bad.push(k+'='+row[k]);
    if(row.roster!==26||row.bossInBracket||row.overflow!==0)bad.push('mobile invariants '+JSON.stringify(row));
    if(bad.length)throw new Error(name+' '+bad.join(' | ')); cases.push({name,...row});
  }

  // Bracket geometry is verified on a fresh desktop page so responsive state from the
  // 390px ROAD run cannot leak into the connector audit. Match the authoritative 21543
  // bracket test by making the panel visible and refreshing the tournament skin first.
  const desktopErrors=[];
  const desktop=await browser.newPage({viewport:{width:1280,height:844}});
  desktop.on('pageerror',e=>desktopErrors.push(String(e?.message||e))); desktop.on('dialog',async d=>d.accept());
  await desktop.goto('http://127.0.0.1:8000/shogi-v21528/?road21562desktop='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await desktop.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10&&window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.audit&&window.AI_SHOGI_TOURNAMENT_SKIN?.refresh,{timeout:60000});
  await desktop.evaluate(async()=>{const t=window.AI_SHOGI_TOURNAMENT;if(t.state()?.active)t.exit();if(!t.start('kenshiro'))throw new Error('desktop start failed');document.getElementById('tournament21540Panel')?.classList.add('on');t.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();window.AI_SHOGI_TOURNAMENT_SKIN?.refresh?.();await new Promise(r=>setTimeout(r,300));});
  await desktop.waitForFunction(()=>{window.AI_SHOGI_TOURNAMENT?.render?.();window.AI_SHOGI_TOURNAMENT_SKIN?.refresh?.();const a=window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.audit?.();return a?.connectors>=30&&a?.alignmentErrors===0&&a?.pairingErrors===0},{timeout:30000});
  const desktopBracket=await desktop.evaluate(()=>{const t=window.AI_SHOGI_TOURNAMENT,a=t?.state?.()?.active,boss=t?.cups?.().find(c=>c.id===a?.cupId)?.boss||'',audit=window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.audit?.()||{},skin=window.AI_SHOGI_TOURNAMENT_SKIN?.audit?.()||{};return {connectors:Number(audit.connectors||skin.connectors||0),alignmentErrors:Number(audit.alignmentErrors??-1),pairingErrors:Number(audit.pairingErrors??-1),bossInBracket:!!boss&&[...document.querySelectorAll('.tourBracketSlot')].some(x=>(x.textContent||'').includes(boss)),roster:document.querySelectorAll('#chars .ch').length,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)}});
  if(desktopBracket.connectors<30||desktopBracket.alignmentErrors!==0||desktopBracket.pairingErrors!==0||desktopBracket.bossInBracket||desktopBracket.roster!==26||desktopBracket.overflow!==0)throw new Error('desktop bracket invariants '+JSON.stringify(desktopBracket));
  await desktop.close();
  if(errors.length||desktopErrors.length)throw new Error('pageErrors '+JSON.stringify({mobile:errors,desktop:desktopErrors}));
  console.log('PASS_TOURNAMENT21562_ROAD_STAGE_TRANSITIONS '+JSON.stringify({cases,desktopBracket,pageErrors:{mobile:errors,desktop:desktopErrors}}));
}finally{await browser.close()}