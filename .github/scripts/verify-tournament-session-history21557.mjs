import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:30000});
  };
  const startAndRead=async cupId=>{
    await page.evaluate(async cupId=>{
      const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
      if(t.state()?.active)t.exit();
      if(!t.start(cupId))throw new Error('start failed '+cupId);
      await delay(250);
      window.AI_SHOGI_TOURNAMENT_DIALOGUE?.render?.();
    },cupId);
    return await page.evaluate(()=>({
      cupId:window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.cupId||'',
      startedAt:Number(window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.startedAt)||0,
      context:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().context||'',
      lineId:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().lineId||'',
      speaker:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().speaker||'',
      role:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().role||'',
      portrait:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().portrait===true,
      history:JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')
    }));
  };

  await page.goto('http://127.0.0.1:8000/shogi-v21528/?sessionHistory='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  await page.evaluate(()=>{
    localStorage.removeItem('aiShogiTournamentDialogue21547');
    window.AI_SHOGI_TOURNAMENT?.exit?.();
  });

  const cups=['shinji','ayanami','kenshiro','kaworu','akiou','micchan','mitsuki','future'];
  const runs=[];
  for(let i=0;i<18;i++){
    const cupId=cups[i%cups.length];
    const row=await startAndRead(cupId);
    if(row.cupId!==cupId||row.context!=='intro'||!row.lineId||!row.speaker||row.role!=='大会主・トーナメント外'||!row.portrait){
      throw new Error('bad intro '+i+' '+JSON.stringify(row));
    }
    const h=row.history||{},sessions=h.sessions||{},count=Object.keys(sessions).length;
    if(Number(h.version)!==2||count<1||count>16)throw new Error('session count '+i+' '+JSON.stringify({version:h.version,count,keys:Object.keys(sessions)}));
    runs.push({i,cupId,startedAt:row.startedAt,lineId:row.lineId,sessionCount:count});
  }

  const finalHistory=await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}'));
  const sessionEntries=Object.entries(finalHistory.sessions||{}).sort((a,b)=>Number(b[1]?.updatedAt||0)-Number(a[1]?.updatedAt||0));
  if(sessionEntries.length!==16)throw new Error('expected 16 sessions '+JSON.stringify(sessionEntries.map(([k,v])=>({k,updatedAt:v?.updatedAt}))));
  const retainedStarts=new Set(sessionEntries.map(([,v])=>Number(v?.startedAt)||0));
  if(retainedStarts.has(runs[0].startedAt)||retainedStarts.has(runs[1].startedAt))throw new Error('oldest sessions not evicted');
  for(const r of runs.slice(2))if(!retainedStarts.has(r.startedAt))throw new Error('recent session missing '+JSON.stringify(r));

  const sameCup=await startAndRead('shinji');
  const previousShinji=[...runs].reverse().find(x=>x.cupId==='shinji');
  if(previousShinji&&sameCup.lineId===previousShinji.lineId)throw new Error('same-cup anti-repeat failed '+JSON.stringify({previousShinji,sameCup}));
  const shinjiIntro=finalHistory.byKey?.['shinji:intro']||[];
  const ayanamiIntro=finalHistory.byKey?.['ayanami:intro']||[];
  if(!Array.isArray(shinjiIntro)||!Array.isArray(ayanamiIntro)||shinjiIntro.length<1||ayanamiIntro.length<1)throw new Error('per-cup intro history missing');
  if(shinjiIntro===ayanamiIntro)throw new Error('history object alias');
  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));

  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21557_SESSION_HISTORY_LIMIT '+JSON.stringify({
    totalStarts:runs.length+1,
    retainedSessions:sessionEntries.length,
    evicted:runs.slice(0,2).map(x=>({cupId:x.cupId,startedAt:x.startedAt})),
    newest:runs.slice(-3).map(x=>({cupId:x.cupId,startedAt:x.startedAt,lineId:x.lineId})),
    sameCupRestart:{previousLineId:previousShinji?.lineId||null,newLineId:sameCup.lineId},
    perCupHistory:{shinji:shinjiIntro.length,ayanami:ayanamiIntro.length},
    pageErrors:errors
  }));
}finally{
  await browser.close();
}
