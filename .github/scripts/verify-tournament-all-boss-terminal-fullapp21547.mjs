import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async dialog=>{await dialog.accept()});
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?allBossTerminal='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  const waitRuntime=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d',{timeout:20000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK?.version==='21547e',{timeout:20000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.__boss21546a===true&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:20000});
  };
  await waitRuntime();

  const report=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,dock=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK;
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    const result=async kind=>{const r=document.getElementById('resultBanner');r.className='resultBanner';void r.offsetWidth;r.className='resultBanner on result-'+kind;r.textContent=kind;await delay(90)};
    const waitBoss=async status=>{for(let i=0;i<40;i++){if(t.state()?.active?.bossChallenge?.status===status)return true;await delay(50)}return false};
    const cardName=card=>(card?.querySelector?.('.chName')?.textContent||card?.querySelector?.('img')?.alt||'').trim();
    const rosterPortrait=name=>{const card=[...document.querySelectorAll('#chars .ch')].find(c=>cardName(c)===name);const img=card?.querySelector('img');return img?.currentSrc||img?.src||''};
    const snap=(cup,label)=>{
      d.render();
      const box=document.getElementById('tourDialogue21547'),da=d.audit?.()||{},img=box?.querySelector('.tourDialoguePortrait img');
      const actual=img?.currentSrc||img?.src||'',expected=rosterPortrait(cup.boss),rect=box?.getBoundingClientRect?.()||{width:0,height:0};
      return{cupId:cup.id,boss:cup.boss,label,context:da.context||null,speaker:da.speaker||null,role:box?.dataset.role||null,text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),portraitMatch:!!expected&&actual===expected,imageComplete:!!img?.complete,imageWidth:Number(img?.naturalWidth)||0,visible:!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0,bossStatus:t.state()?.active?.bossChallenge?.status||null,dock:dock?.audit?.()||null};
    };
    const reachBoss=async cup=>{
      if(t.state()?.active)t.exit();
      if(!t.start(cup.id))throw new Error(cup.id+': start failed');
      await delay(80);
      for(let round=0;round<4;round++){
        await result('win');
        if(round<3){t.next();await delay(60)}
      }
      if(!await waitBoss('pending'))throw new Error(cup.id+': boss pending timeout');
      if(!t.challengeBoss())throw new Error(cup.id+': boss challenge failed');
      if(!await waitBoss('active'))throw new Error(cup.id+': boss active timeout');
      await delay(320);
    };

    const rows=[];
    for(const cup of t.cups()){
      await reachBoss(cup);
      rows.push(snap(cup,'start'));
      await result('draw');
      if(!await waitBoss('draw'))throw new Error(cup.id+': boss draw timeout');
      await delay(320);rows.push(snap(cup,'draw'));
      if(!t.challengeBoss())throw new Error(cup.id+': boss draw retry failed');
      if(!await waitBoss('active'))throw new Error(cup.id+': boss draw retry active timeout');
      await delay(320);rows.push(snap(cup,'retry'));
      await result('loss');
      if(!await waitBoss('lost'))throw new Error(cup.id+': boss lost timeout');
      await delay(320);rows.push(snap(cup,'lost'));
      t.exit();await delay(80);

      await reachBoss(cup);
      await result('win');
      if(!await waitBoss('won'))throw new Error(cup.id+': boss won timeout');
      await delay(320);rows.push(snap(cup,'won'));
      t.exit();await delay(80);
    }
    return{rows,activeAfter:!!t.state()?.active};
  });

  const snapReload=async label=>await page.evaluate(label=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,dock=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK;
    d.render();
    const cup=t.cups().find(c=>c.id==='shinji'),box=document.getElementById('tourDialogue21547'),da=d.audit?.()||{},img=box?.querySelector('.tourDialoguePortrait img');
    const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===cup.boss),ri=card?.querySelector('img');
    const actual=img?.currentSrc||img?.src||'',expected=ri?.currentSrc||ri?.src||'',rect=box?.getBoundingClientRect?.()||{width:0,height:0};
    let history={};try{history=JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')}catch(e){}
    const ids=Array.isArray(history?.byKey?.[cup.id+':'+da.context])?history.byKey[cup.id+':'+da.context].slice():[];
    return{label,context:da.context||null,lineId:box?.dataset.lineId||null,speaker:da.speaker||null,role:box?.dataset.role||null,boss:cup.boss,bossStatus:t.state()?.active?.bossChallenge?.status||null,portraitMatch:!!expected&&actual===expected,visible:!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0,dock:dock?.audit?.()||null,oppName:(document.getElementById('oppName')?.textContent||'').trim(),historyIds:ids};
  },label);
  const reloadSnap=async label=>{
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await waitRuntime();
    await page.waitForTimeout(700);
    return await snapReload(label);
  };
  const waitBossPage=async status=>await page.waitForFunction(s=>window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.bossChallenge?.status===s,status,{timeout:5000});

  const restore={};
  await page.evaluate(()=>{
    localStorage.removeItem('aiShogiTournamentDialogue21547');
    const t=window.AI_SHOGI_TOURNAMENT;if(t.state()?.active)t.exit();
    if(!t.start('shinji'))throw new Error('reload restore start failed');
  });
  await page.waitForTimeout(600);
  restore.introBefore=await snapReload('introBefore');
  restore.introAfter=await reloadSnap('introAfter');

  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    const result=async kind=>{const r=document.getElementById('resultBanner');r.className='resultBanner';void r.offsetWidth;r.className='resultBanner on result-'+kind;r.textContent=kind;await delay(100)};
    for(let round=0;round<4;round++){await result('win');if(round<3){t.next();await delay(70)}}
    for(let i=0;i<40&&t.state()?.active?.bossChallenge?.status!=='pending';i++)await delay(50);
    if(t.state()?.active?.bossChallenge?.status!=='pending')throw new Error('reload restore pending timeout');
    const key='aiShogiTournament21540',s=JSON.parse(localStorage.getItem(key));s.active.bossChallenge.tournamentWonAt=Date.now()-5000;localStorage.setItem(key,JSON.stringify(s));
  });
  await page.waitForTimeout(650);
  restore.pendingBefore=await snapReload('pendingBefore');
  restore.pendingAfter=await reloadSnap('pendingAfter');

  if(!(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss())))throw new Error('reload restore boss challenge failed');
  await waitBossPage('active');await page.waitForTimeout(700);
  restore.activeBefore=await snapReload('activeBefore');
  restore.activeAfter=await reloadSnap('activeAfter');

  await page.evaluate(async()=>{const r=document.getElementById('resultBanner');r.className='resultBanner';void r.offsetWidth;r.className='resultBanner on result-draw';r.textContent='draw';await new Promise(x=>setTimeout(x,120))});
  await waitBossPage('draw');await page.waitForTimeout(650);
  restore.drawBefore=await snapReload('drawBefore');
  restore.drawAfter=await reloadSnap('drawAfter');

  if(!(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss())))throw new Error('reload restore retry failed');
  await waitBossPage('active');await page.waitForTimeout(700);
  restore.retryBefore=await snapReload('retryBefore');
  restore.retryAfter=await reloadSnap('retryAfter');

  const failures=[];
  const expectedContext={start:'boss_start',draw:'boss_draw',retry:'boss_start',lost:'boss_lost',won:'boss_won'};
  if(report.rows.length!==40)failures.push('rows '+report.rows.length);
  for(const x of report.rows){
    if(x.context!==expectedContext[x.label])failures.push(`${x.cupId}/${x.label}: context ${x.context}`);
    if(x.speaker!==x.boss)failures.push(`${x.cupId}/${x.label}: speaker ${x.speaker}`);
    if(x.role!=='杯ボス')failures.push(`${x.cupId}/${x.label}: role ${x.role}`);
    if(!x.text)failures.push(`${x.cupId}/${x.label}: text missing`);
    if(!x.portraitMatch||!x.imageComplete||x.imageWidth<1)failures.push(`${x.cupId}/${x.label}: portrait mismatch`);
    if(!x.visible)failures.push(`${x.cupId}/${x.label}: dialogue hidden`);
    if(['start','retry'].includes(x.label)&&(!x.dock?.bossActive||!x.dock?.docked||!x.dock?.connected))failures.push(`${x.cupId}/${x.label}: battle dock ${JSON.stringify(x.dock)}`);
    if(!['start','retry'].includes(x.label)&&x.dock?.docked)failures.push(`${x.cupId}/${x.label}: battle dock not restored`);
  }
  if(report.activeAfter)failures.push('active state remains after all-boss terminal checks');

  const reloadPairs=[['introBefore','introAfter','intro'],['pendingBefore','pendingAfter','boss_pending'],['activeBefore','activeAfter','boss_start'],['drawBefore','drawAfter','boss_draw'],['retryBefore','retryAfter','boss_start']];
  for(const [beforeKey,afterKey,context] of reloadPairs){
    const before=restore[beforeKey],after=restore[afterKey];
    if(before.context!==context||after.context!==context)failures.push(`${beforeKey}/${afterKey}: context ${before.context}/${after.context}`);
    if(before.speaker!==before.boss||after.speaker!==after.boss)failures.push(`${afterKey}: speaker restore mismatch`);
    if(!before.portraitMatch||!after.portraitMatch||!before.visible||!after.visible)failures.push(`${afterKey}: portrait/visibility restore mismatch`);
    if(!before.lineId||!after.lineId||before.lineId===after.lineId)failures.push(`${afterKey}: anti-repeat did not advance across reload ${before.lineId}/${after.lineId}`);
    if(!after.historyIds.includes(before.lineId)||!after.historyIds.includes(after.lineId))failures.push(`${afterKey}: persisted dialogue history missing ids`);
  }
  for(const key of ['pendingAfter','drawAfter'])if(restore[key].dock?.docked)failures.push(`${key}: dock should be restored to tournament panel`);
  for(const key of ['activeBefore','activeAfter','retryBefore','retryAfter']){
    const x=restore[key];if(!x.dock?.bossActive||!x.dock?.docked||!x.dock?.connected)failures.push(`${key}: active battle dock not restored ${JSON.stringify(x.dock)}`);
    if(!x.oppName.startsWith(x.boss))failures.push(`${key}: boss opponent not restored, oppName=${x.oppName}`);
  }
  if(pageErrors.length)failures.push('page errors '+JSON.stringify(pageErrors));
  await page.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('aiShogiTournament21540')||'null');if(s){s.active=null;localStorage.setItem('aiShogiTournament21540',JSON.stringify(s))}}catch(e){}});
  if(failures.length)throw new Error(failures.join(' | '));

  const bosses=[...new Set(report.rows.map(x=>x.boss))];
  console.log('PASS_TOURNAMENT21547E_ALL_BOSS_TERMINALS '+JSON.stringify({
    bosses:bosses.length,
    bossNames:bosses,
    starts:report.rows.filter(x=>x.label==='start'&&x.context==='boss_start').length,
    draws:report.rows.filter(x=>x.label==='draw'&&x.context==='boss_draw').length,
    retries:report.rows.filter(x=>x.label==='retry'&&x.context==='boss_start').length,
    losses:report.rows.filter(x=>x.label==='lost'&&x.context==='boss_lost').length,
    wins:report.rows.filter(x=>x.label==='won'&&x.context==='boss_won').length,
    portraitMatches:report.rows.filter(x=>x.portraitMatch).length,
    bossRoles:report.rows.filter(x=>x.role==='杯ボス').length,
    visible:report.rows.filter(x=>x.visible).length,
    battleDockActive:report.rows.filter(x=>['start','retry'].includes(x.label)&&x.dock?.docked).length,
    restoredAfterTerminal:report.rows.filter(x=>['draw','lost','won'].includes(x.label)&&!x.dock?.docked).length,
    activeAfter:report.activeAfter,
    pageErrors
  }));
  console.log('PASS_TOURNAMENT21547F_RELOAD_RESTORE '+JSON.stringify({
    contexts:reloadPairs.map(([,afterKey])=>restore[afterKey].context),
    antiRepeatAcrossReload:reloadPairs.filter(([beforeKey,afterKey])=>restore[beforeKey].lineId!==restore[afterKey].lineId).length,
    historyPersisted:reloadPairs.filter(([beforeKey,afterKey])=>restore[afterKey].historyIds.includes(restore[beforeKey].lineId)&&restore[afterKey].historyIds.includes(restore[afterKey].lineId)).length,
    pendingRestored:restore.pendingAfter.bossStatus==='pending'&&!restore.pendingAfter.dock?.docked,
    activeRestored:restore.activeAfter.bossStatus==='active'&&restore.activeAfter.dock?.docked,
    drawRestored:restore.drawAfter.bossStatus==='draw'&&!restore.drawAfter.dock?.docked,
    retryRestored:restore.retryAfter.bossStatus==='active'&&restore.retryAfter.dock?.docked,
    bossOpponentRestored:[restore.activeAfter,restore.retryAfter].every(x=>x.oppName.startsWith(x.boss)),
    pageErrors
  }));
} finally {
  await browser.close();
}
