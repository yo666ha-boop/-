import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,{timeout:30000});
  };
  const transientNavigation=e=>String(e?.stack||e?.message||e||'').includes('Execution context was destroyed');
  const startAndRead=async cupId=>{
    for(let attempt=1;attempt<=3;attempt++){
      try{
        await boot();
        await page.evaluate(async cupId=>{
          const t=window.AI_SHOGI_TOURNAMENT;
          const active=t.state()?.active;
          if(active?.cupId!==cupId){
            if(active)t.exit();
            if(!t.start(cupId))throw new Error('start failed '+cupId);
          }
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
      }catch(error){
        if(!transientNavigation(error)||attempt===3)throw error;
        await page.waitForLoadState('domcontentloaded',{timeout:60000}).catch(()=>{});
      }
    }
  };

  await page.goto('http://127.0.0.1:8000/shogi-v21528/?sessionHistory='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  await page.evaluate(()=>{
    localStorage.removeItem('aiShogiTournamentDialogue21547');
    window.AI_SHOGI_TOURNAMENT?.exit?.();
  });

  const cups=['kenshiro','souther','raoh','kaworu','akiou','micchan','mitsuki','future'];
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

  const sameCup=await startAndRead('kenshiro');
  const previousSameCup=[...runs].reverse().find(x=>x.cupId==='kenshiro');
  if(previousSameCup&&sameCup.lineId===previousSameCup.lineId)throw new Error('same-cup anti-repeat failed '+JSON.stringify({previousSameCup,sameCup}));
  const firstIntro=finalHistory.byKey?.['kenshiro:intro']||[];
  const secondIntro=finalHistory.byKey?.['souther:intro']||[];
  if(!Array.isArray(firstIntro)||!Array.isArray(secondIntro)||firstIntro.length<1||secondIntro.length<1)throw new Error('per-cup intro history missing');
  if(firstIntro===secondIntro)throw new Error('history object alias');
  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));

  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21557_SESSION_HISTORY_LIMIT '+JSON.stringify({
    totalStarts:runs.length+1,
    retainedSessions:sessionEntries.length,
    evicted:runs.slice(0,2).map(x=>({cupId:x.cupId,startedAt:x.startedAt})),
    newest:runs.slice(-3).map(x=>({cupId:x.cupId,startedAt:x.startedAt,lineId:x.lineId})),
    sameCupRestart:{previousLineId:previousSameCup?.lineId||null,newLineId:sameCup.lineId},
    perCupHistory:{kenshiro:firstIntro.length,souther:secondIntro.length},
    pageErrors:errors
  }));
}finally{
  await browser.close();
}
