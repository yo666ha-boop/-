import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
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
    const cardName=c=>(c?.querySelector?.('.chName')?.textContent||c?.querySelector?.('img')?.alt||'').trim();
    const rosterPortrait=name=>{const c=[...document.querySelectorAll('#chars .ch')].find(x=>cardName(x)===name),img=c?.querySelector('img');return img?.currentSrc||img?.src||''};
    const snap=(cup,label)=>{
      d.render();
      const box=document.getElementById('tourDialogue21547'),da=d.audit?.()||{},img=box?.querySelector('.tourDialoguePortrait img');
      const actual=img?.currentSrc||img?.src||'',expected=rosterPortrait(cup.boss),rect=box?.getBoundingClientRect?.()||{width:0,height:0};
      return{cupId:cup.id,boss:cup.boss,label,context:da.context||null,speaker:da.speaker||null,role:box?.dataset.role||null,text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),portraitMatch:!!expected&&actual===expected,imageComplete:!!img?.complete,imageWidth:Number(img?.naturalWidth)||0,visible:!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0,dock:dock?.audit?.()||null};
    };
    const reachBoss=async cup=>{
      if(t.state()?.active)t.exit();
      if(!t.start(cup.id))throw new Error(cup.id+': start failed');
      await delay(80);
      for(let round=0;round<4;round++){await result('win');if(round<3){t.next();await delay(60)}}
      if(!await waitBoss('pending'))throw new Error(cup.id+': pending timeout');
      if(!t.challengeBoss())throw new Error(cup.id+': challenge failed');
      if(!await waitBoss('active'))throw new Error(cup.id+': active timeout');
      await delay(320);
    };
    const initialRestoreAudit=window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.()||null;
    const rows=[];
    for(const cup of t.cups()){
      await reachBoss(cup);rows.push(snap(cup,'start'));
      await result('draw');if(!await waitBoss('draw'))throw new Error(cup.id+': draw timeout');await delay(320);rows.push(snap(cup,'draw'));
      if(!t.challengeBoss())throw new Error(cup.id+': retry failed');if(!await waitBoss('active'))throw new Error(cup.id+': retry active timeout');await delay(320);rows.push(snap(cup,'retry'));
      await result('loss');if(!await waitBoss('lost'))throw new Error(cup.id+': loss timeout');await delay(320);rows.push(snap(cup,'lost'));t.exit();await delay(80);
      await reachBoss(cup);await result('win');if(!await waitBoss('won'))throw new Error(cup.id+': win timeout');await delay(320);rows.push(snap(cup,'won'));t.exit();await delay(80);
    }
    return{rows,activeAfter:!!t.state()?.active,initialRestoreAudit};
  });

  const assetIdentity=src=>{if(!src)return'';if(src.startsWith('data:'))return src;try{const u=new URL(src);return u.origin+u.pathname}catch{return String(src).split('?')[0]}};
  const snapReload=async(label,force=false)=>{
    const x=await page.evaluate(({label,force})=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,dock=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK;
      if(force)d.render();
      const cup=t.cups().find(c=>c.id==='shinji'),box=document.getElementById('tourDialogue21547'),da=d.audit?.()||{},img=box?.querySelector('.tourDialoguePortrait img');
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===cup.boss),ri=card?.querySelector('img');
      const actual=img?.currentSrc||img?.src||'',expected=ri?.currentSrc||ri?.src||'',rect=box?.getBoundingClientRect?.()||{width:0,height:0};
      let h={};try{h=JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')}catch{}
      const ids=Array.isArray(h?.byKey?.[cup.id+':'+da.context])?h.byKey[cup.id+':'+da.context].slice():[];
      return{label,context:da.context||null,lineId:box?.dataset.lineId||null,speaker:da.speaker||null,role:box?.dataset.role||null,boss:cup.boss,bossStatus:t.state()?.active?.bossChallenge?.status||null,actual,expected,visible:!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0,dock:dock?.audit?.()||null,panelOpen:!!document.getElementById('tournament21540Panel')?.classList.contains('on'),oppName:(document.getElementById('oppName')?.textContent||'').trim(),historyIds:ids,historySentinel:Array.isArray(h?.byKey?.__reload21547f__)&&h.byKey.__reload21547f__.includes('sentinel-21547f'),restoreAudit:window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.()||null};
    },{label,force});
    x.actualAsset=assetIdentity(x.actual);x.expectedAsset=assetIdentity(x.expected);x.portraitMatch=!!x.expectedAsset&&x.actualAsset===x.expectedAsset;return x;
  };

  const expectedContext={introAfter:'intro',pendingAfter:'boss_pending',activeAfter:'boss_start',drawAfter:'boss_draw',retryAfter:'boss_start'};
  const stableReload=async label=>{
    const ctx=expectedContext[label],bossActive=label==='activeAfter'||label==='retryAfter',roundActive=label==='introAfter';
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await waitRuntime();
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.version==='21548a',{timeout:10000});
    await page.waitForFunction(()=>document.documentElement.dataset.tournamentRestore21548==='1',{timeout:10000});
    await page.waitForFunction(({ctx,bossActive})=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,dock=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK?.audit?.()||{};
      const cup=t?.cups?.().find(c=>c.id==='shinji'),box=document.getElementById('tourDialogue21547'),da=d?.audit?.()||{},img=box?.querySelector('.tourDialoguePortrait img'),rect=box?.getBoundingClientRect?.()||{width:0,height:0};
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===cup?.boss),ri=card?.querySelector('img');
      const canon=src=>{if(!src)return'';if(src.startsWith('data:'))return src;try{const u=new URL(src,location.href);return u.origin+u.pathname}catch{return String(src).split('?')[0]}};
      const samePortrait=!!ri&&!!img&&canon(img.currentSrc||img.src)===canon(ri.currentSrc||ri.src)&&img.complete&&Number(img.naturalWidth)>0;
      const visible=!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0;
      const panelOpen=!!document.getElementById('tournament21540Panel')?.classList.contains('on');
      const opponent=(document.getElementById('oppName')?.textContent||'').trim();
      const roundOpp=document.getElementById('tourOpponentVoice21549'),roundDocked=box?.classList.contains('tourRoundBattleDock21550')&&roundOpp?.classList.contains('tourRoundBattleDock21550')&&box?.parentElement?.classList?.contains('side')&&roundOpp?.parentElement?.classList?.contains('side');
      const ok=da.context===ctx&&da.speaker===cup?.boss&&samePortrait&&visible&&(bossActive?(dock.bossActive&&dock.docked&&dock.connected&&opponent.startsWith(cup.boss)):(roundActive?(!panelOpen&&roundDocked):(panelOpen&&!dock.docked)));
      const k='__tourReloadStable21547F';
      if(!ok){window[k]=0;return false}
      if(!window[k])window[k]=performance.now();
      return performance.now()-window[k]>=900;
    },{ctx,bossActive,roundActive},{timeout:12000,polling:100});
    return await snapReload(label,false);
  };

  const forceAdvance=async label=>await page.evaluate(label=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,cup=t.cups().find(c=>c.id==='shinji');
    d.render();const before=document.getElementById('tourDialogue21547')?.dataset.lineId||null,context=d.audit?.()?.context||null;
    d.render();const after=document.getElementById('tourDialogue21547')?.dataset.lineId||null;let h={};try{h=JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')}catch{}
    const ids=Array.isArray(h?.byKey?.[cup.id+':'+context])?h.byKey[cup.id+':'+context].slice():[];
    return{label,context,before,after,historyIds:ids,historySentinel:Array.isArray(h?.byKey?.__reload21547f__)&&h.byKey.__reload21547f__.includes('sentinel-21547f')};
  },label);
  const waitBoss=async status=>page.waitForFunction(s=>window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.bossChallenge?.status===s,status,{timeout:5000});

  const restore={},anti={};
  await page.evaluate(()=>{localStorage.setItem('aiShogiTournamentDialogue21547',JSON.stringify({byKey:{__reload21547f__:['sentinel-21547f']}}));const t=window.AI_SHOGI_TOURNAMENT;if(t.state()?.active)t.exit();if(!t.start('shinji'))throw new Error('restore start failed')});
  await page.waitForTimeout(650);restore.introBefore=await snapReload('introBefore',true);restore.introAfter=await stableReload('introAfter');anti.intro=await forceAdvance('intro');

  await page.evaluate(async()=>{const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms)),result=async kind=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-'+kind;b.textContent=kind;await delay(100)};for(let r=0;r<4;r++){await result('win');if(r<3){t.next();await delay(70)}}for(let i=0;i<40&&t.state()?.active?.bossChallenge?.status!=='pending';i++)await delay(50);if(t.state()?.active?.bossChallenge?.status!=='pending')throw new Error('pending timeout');const key='aiShogiTournament21540',s=JSON.parse(localStorage.getItem(key));s.active.bossChallenge.tournamentWonAt=Date.now()-5000;localStorage.setItem(key,JSON.stringify(s))});
  await page.waitForTimeout(650);restore.pendingBefore=await snapReload('pendingBefore',true);restore.pendingAfter=await stableReload('pendingAfter');anti.pending=await forceAdvance('pending');

  if(!(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss())))throw new Error('challenge failed');await waitBoss('active');await page.waitForTimeout(700);restore.activeBefore=await snapReload('activeBefore',true);restore.activeAfter=await stableReload('activeAfter');anti.active=await forceAdvance('active');
  await page.evaluate(async()=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-draw';b.textContent='draw';await new Promise(r=>setTimeout(r,120))});await waitBoss('draw');await page.waitForTimeout(650);restore.drawBefore=await snapReload('drawBefore',true);restore.drawAfter=await stableReload('drawAfter');anti.draw=await forceAdvance('draw');
  if(!(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss())))throw new Error('retry failed');await waitBoss('active');await page.waitForTimeout(700);restore.retryBefore=await snapReload('retryBefore',true);restore.retryAfter=await stableReload('retryAfter');anti.retry=await forceAdvance('retry');

  const failures=[],expectedBase={start:'boss_start',draw:'boss_draw',retry:'boss_start',lost:'boss_lost',won:'boss_won'};
  if(report.rows.length!==40)failures.push('rows '+report.rows.length);
  if(report.initialRestoreAudit?.hadInitialActive!==false||report.initialRestoreAudit?.done!==true)failures.push('fresh restore guard '+JSON.stringify(report.initialRestoreAudit));
  for(const x of report.rows){if(x.context!==expectedBase[x.label])failures.push(`${x.cupId}/${x.label}: context ${x.context}`);if(x.speaker!==x.boss)failures.push(`${x.cupId}/${x.label}: speaker`);if(x.role!=='杯ボス')failures.push(`${x.cupId}/${x.label}: role`);if(!x.text||!x.portraitMatch||!x.imageComplete||x.imageWidth<1||!x.visible)failures.push(`${x.cupId}/${x.label}: portrait/text/visibility`);if(['start','retry'].includes(x.label)&&(!x.dock?.bossActive||!x.dock?.docked||!x.dock?.connected))failures.push(`${x.cupId}/${x.label}: dock`);if(!['start','retry'].includes(x.label)&&x.dock?.docked)failures.push(`${x.cupId}/${x.label}: dock restore`)}
  if(report.activeAfter)failures.push('active remains');

  const pairs=[['introBefore','introAfter','intro'],['pendingBefore','pendingAfter','boss_pending'],['activeBefore','activeAfter','boss_start'],['drawBefore','drawAfter','boss_draw'],['retryBefore','retryAfter','boss_start']];
  for(const [bk,ak,ctx] of pairs){const b=restore[bk],a=restore[ak];if(b.context!==ctx||a.context!==ctx)failures.push(`${ak}: context ${b.context}/${a.context}`);if(b.speaker!==b.boss||a.speaker!==a.boss)failures.push(`${ak}: speaker`);if(!b.portraitMatch||!a.portraitMatch||!a.visible)failures.push(`${ak}: portrait/reload visibility beforeVisible=${b.visible} afterVisible=${a.visible} actual=${a.actualAsset} expected=${a.expectedAsset}`);if(!a.historySentinel)failures.push(`${ak}: history sentinel`);if(a.restoreAudit?.hadInitialActive!==true||a.restoreAudit?.done!==true)failures.push(`${ak}: restore audit`)}
  for(const [k,x] of Object.entries(anti)){if(!x.before||!x.after||x.before===x.after)failures.push(`${k}: anti-repeat ${x.before}/${x.after}`);if(!x.historyIds.includes(x.before)||!x.historyIds.includes(x.after)||!x.historySentinel)failures.push(`${k}: history persistence`)}
  for(const k of ['introAfter','pendingAfter','drawAfter'])if(!restore[k].panelOpen||restore[k].dock?.docked)failures.push(`${k}: panel/dock`);
  for(const k of ['activeBefore','activeAfter','retryBefore','retryAfter']){const x=restore[k];if(!x.dock?.bossActive||!x.dock?.docked||!x.dock?.connected||!x.oppName.startsWith(x.boss))failures.push(`${k}: active boss restore`)}
  if(pageErrors.length)failures.push('pageErrors '+JSON.stringify(pageErrors));
  await page.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('aiShogiTournament21540')||'null');if(s){s.active=null;localStorage.setItem('aiShogiTournament21540',JSON.stringify(s))}}catch{}});
  if(failures.length)throw new Error(failures.join(' | '));

  const bosses=[...new Set(report.rows.map(x=>x.boss))];
  console.log('PASS_TOURNAMENT21547E_ALL_BOSS_TERMINALS '+JSON.stringify({bosses:bosses.length,bossNames:bosses,starts:report.rows.filter(x=>x.label==='start').length,draws:report.rows.filter(x=>x.label==='draw').length,retries:report.rows.filter(x=>x.label==='retry').length,losses:report.rows.filter(x=>x.label==='lost').length,wins:report.rows.filter(x=>x.label==='won').length,portraitMatches:report.rows.filter(x=>x.portraitMatch).length,bossRoles:report.rows.filter(x=>x.role==='杯ボス').length,visible:report.rows.filter(x=>x.visible).length,battleDockActive:report.rows.filter(x=>['start','retry'].includes(x.label)&&x.dock?.docked).length,restoredAfterTerminal:report.rows.filter(x=>['draw','lost','won'].includes(x.label)&&!x.dock?.docked).length,activeAfter:report.activeAfter,pageErrors}));
  console.log('PASS_TOURNAMENT21547F_RELOAD_RESTORE '+JSON.stringify({contexts:pairs.map(([,ak])=>restore[ak].context),stableMs:900,preReloadVisibility:Object.fromEntries(pairs.map(([bk])=>[bk,restore[bk].visible])),freshStartGuard:report.initialRestoreAudit?.hadInitialActive===false&&report.initialRestoreAudit?.done===true,historySentinelPersisted:pairs.filter(([,ak])=>restore[ak].historySentinel).length,antiRepeatAfterRestore:Object.values(anti).filter(x=>x.before&&x.after&&x.before!==x.after).length,pendingRestored:restore.pendingAfter.bossStatus==='pending'&&!restore.pendingAfter.dock?.docked,activeRestored:restore.activeAfter.bossStatus==='active'&&restore.activeAfter.dock?.docked,drawRestored:restore.drawAfter.bossStatus==='draw'&&!restore.drawAfter.dock?.docked,retryRestored:restore.retryAfter.bossStatus==='active'&&restore.retryAfter.dock?.docked,bossOpponentRestored:[restore.activeAfter,restore.retryAfter].every(x=>x.oppName.startsWith(x.boss)),reloadPortraitAssets:pairs.map(([,ak])=>restore[ak].actualAsset),pageErrors}));
} finally {await browser.close()}
