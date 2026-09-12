import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?allBossTerminal='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});

  const waitRuntime=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK?.version==='21547e',{timeout:30000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.__boss21546a===true&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,{timeout:30000});
  };
  await waitRuntime();

  const terminalReport=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,dock=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK;
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    const result=async kind=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-'+kind;b.textContent=kind;await delay(100)};
    const waitBoss=async status=>{for(let i=0;i<60;i++){if(t.state()?.active?.bossChallenge?.status===status)return true;await delay(50)}return false};
    const cardName=c=>(c?.querySelector('.chName')?.textContent||c?.querySelector('img')?.alt||'').trim();
    const portrait=name=>{const c=[...document.querySelectorAll('#chars .ch')].find(x=>cardName(x)===name),i=c?.querySelector('img');return i?.currentSrc||i?.src||''};
    const canon=src=>{if(!src)return'';try{const u=new URL(src,location.href);return u.origin+u.pathname}catch{return String(src).split('?')[0]}};
    const snap=(cup,label)=>{d.render();const box=document.getElementById('tourDialogue21547'),a=d.audit?.()||{},img=box?.querySelector('.tourDialoguePortrait img'),r=box?.getBoundingClientRect?.()||{};return{cupId:cup.id,boss:cup.boss,label,context:a.context||'',speaker:a.speaker||'',role:box?.dataset.role||'',text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),portraitMatch:canon(img?.currentSrc||img?.src)===canon(portrait(cup.boss)),imageComplete:!!img?.complete&&Number(img?.naturalWidth)>0,visible:!!box&&getComputedStyle(box).display!=='none'&&r.width>0&&r.height>0,dock:dock?.audit?.()||{}}};
    const reachBoss=async cup=>{if(t.state()?.active)t.exit();if(!t.start(cup.id))throw new Error(cup.id+': start failed');await delay(100);for(let round=0;round<4;round++){await result('win');if(round<3){t.next();await delay(80)}}if(!await waitBoss('pending'))throw new Error(cup.id+': pending timeout');if(!t.challengeBoss())throw new Error(cup.id+': challenge failed');if(!await waitBoss('active'))throw new Error(cup.id+': active timeout');await delay(300)};
    const rows=[];
    for(const cup of t.cups()){
      await reachBoss(cup);rows.push(snap(cup,'start'));
      await result('draw');if(!await waitBoss('draw'))throw new Error(cup.id+': draw timeout');await delay(250);rows.push(snap(cup,'draw'));
      if(!t.challengeBoss())throw new Error(cup.id+': retry failed');if(!await waitBoss('active'))throw new Error(cup.id+': retry active timeout');await delay(250);rows.push(snap(cup,'retry'));
      await result('loss');if(!await waitBoss('lost'))throw new Error(cup.id+': loss timeout');await delay(250);rows.push(snap(cup,'lost'));t.exit();await delay(80);
      await reachBoss(cup);await result('win');if(!await waitBoss('won'))throw new Error(cup.id+': win timeout');await delay(250);rows.push(snap(cup,'won'));t.exit();await delay(80);
    }
    return{rows,activeAfter:!!t.state()?.active};
  });

  const expected={start:'boss_start',draw:'boss_draw',retry:'boss_start',lost:'boss_lost',won:'boss_won'};
  const failures=[];
  if(terminalReport.rows.length!==50)failures.push('terminal rows '+terminalReport.rows.length);
  for(const x of terminalReport.rows){
    if(x.context!==expected[x.label])failures.push(`${x.cupId}/${x.label}: context ${x.context}`);
    if(x.speaker!==x.boss||x.role!=='杯ボス')failures.push(`${x.cupId}/${x.label}: boss identity`);
    if(!x.text||!x.portraitMatch||!x.imageComplete||!x.visible)failures.push(`${x.cupId}/${x.label}: portrait/text/visibility`);
    if(['start','retry'].includes(x.label)&&(!x.dock?.bossActive||!x.dock?.docked||!x.dock?.connected))failures.push(`${x.cupId}/${x.label}: boss dock`);
    if(!['start','retry'].includes(x.label)&&x.dock?.docked)failures.push(`${x.cupId}/${x.label}: dock restore`);
  }
  if(terminalReport.activeAfter)failures.push('terminal active remains');

  const setSentinel=async()=>page.evaluate(()=>{let h={};try{h=JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')}catch{};h.byKey=h.byKey||{};h.byKey.__reload21547f__=['sentinel-21547f'];localStorage.setItem('aiShogiTournamentDialogue21547',JSON.stringify(h))});
  const reloadState=async(expectedContext,mode)=>{
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await waitRuntime();
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.version==='21548a'&&document.documentElement.dataset.tournamentRestore21548==='1',{timeout:20000});
    return await page.waitForFunction(({expectedContext,mode})=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,dock=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK?.audit?.()||{},cup=t.cups().find(c=>c.id==='kenshiro');
      d.render();
      const host=document.getElementById('tourDialogue21547'),hr=host?.getBoundingClientRect?.()||{},hi=host?.querySelector('.tourDialoguePortrait img'),ha=d.audit?.()||{};
      const cardByName=name=>[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===name);
      const canon=src=>{if(!src)return'';try{const u=new URL(src,location.href);return u.origin+u.pathname}catch{return String(src).split('?')[0]}};
      const bossImg=cardByName(cup.boss)?.querySelector('img');
      const hostPortrait=!!hi&&!!bossImg&&hi.complete&&hi.naturalWidth>0&&canon(hi.currentSrc||hi.src)===canon(bossImg.currentSrc||bossImg.src);
      const hostVisible=!!host&&getComputedStyle(host).display!=='none'&&hr.width>0&&hr.height>0;
      let opponentVisible=false,opponentPortrait=false,opponentSpeaker='';
      const opp=document.getElementById('tourOpponentVoice21549'),or=opp?.getBoundingClientRect?.()||{},oi=opp?.querySelector('img');
      if(opp){opponentVisible=getComputedStyle(opp).display!=='none'&&or.width>0&&or.height>0;opponentSpeaker=opp.dataset.speaker||'';const rc=cardByName(opponentSpeaker)?.querySelector('img');opponentPortrait=!!oi&&!!rc&&oi.complete&&oi.naturalWidth>0&&canon(oi.currentSrc||oi.src)===canon(rc.currentSrc||rc.src)}
      const roundDocked=host?.classList.contains('tourRoundBattleDock21550')&&opp?.classList.contains('tourRoundBattleDock21550')&&host?.parentElement?.classList.contains('side')&&opp?.parentElement?.classList.contains('side');
      const bossOk=mode==='boss'?hostVisible&&dock.bossActive&&dock.docked&&dock.connected:true;
      const roundOk=mode==='round'?!hostVisible&&opponentVisible&&opponentPortrait&&!!opponentSpeaker&&roundDocked:true;
      let h={};try{h=JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')}catch{}
      const sentinel=Array.isArray(h?.byKey?.__reload21547f__)&&h.byKey.__reload21547f__.includes('sentinel-21547f');
      const ok=ha.context===expectedContext&&ha.speaker===cup.boss&&hostPortrait&&sentinel&&bossOk&&roundOk;
      if(!ok)return false;
      return{context:ha.context,speaker:ha.speaker,hostVisible,hostPortrait,opponentVisible,opponentPortrait,opponentSpeaker,roundDocked,bossDocked:!!dock.docked,sentinel,restoreAudit:window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.()||{}};
    },{expectedContext,mode},{timeout:20000,polling:100}).then(x=>x.jsonValue());
  };
  const waitBoss=async status=>page.waitForFunction(s=>window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.bossChallenge?.status===s,status,{timeout:6000});
  const result=async kind=>page.evaluate(async kind=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-'+kind;b.textContent=kind;await new Promise(r=>setTimeout(r,120))},kind);

  const restore={};
  await page.evaluate(()=>{const t=window.AI_SHOGI_TOURNAMENT;if(t.state()?.active)t.exit();localStorage.removeItem('aiShogiTournamentDialogue21547');if(!t.start('kenshiro'))throw new Error('restore start failed')});
  await page.waitForTimeout(500);await setSentinel();restore.intro=await reloadState('intro','round');

  await page.evaluate(async()=>{const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));const result=async()=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-win';b.textContent='win';await delay(120)};for(let r=0;r<4;r++){await result();if(r<3){t.next();await delay(80)}}});
  await waitBoss('pending');await setSentinel();restore.pending=await reloadState('boss_pending','pending');

  if(!(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss())))throw new Error('challenge failed');await waitBoss('active');await page.waitForTimeout(350);await setSentinel();restore.active=await reloadState('boss_start','boss');
  await result('draw');await waitBoss('draw');await page.waitForTimeout(350);await setSentinel();restore.draw=await reloadState('boss_draw','pending');
  if(!(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss())))throw new Error('retry failed');await waitBoss('active');await page.waitForTimeout(350);await setSentinel();restore.retry=await reloadState('boss_start','boss');

  for(const [name,x] of Object.entries(restore)){
    if(x.restoreAudit?.hadInitialActive!==true||x.restoreAudit?.done!==true)failures.push(name+': restore audit '+JSON.stringify(x.restoreAudit));
    if(!x.sentinel||!x.hostPortrait)failures.push(name+': sentinel/portrait');
  }
  if(restore.intro.hostVisible||!restore.intro.opponentVisible||!restore.intro.opponentPortrait||!restore.intro.roundDocked)failures.push('intro opponent-only restore '+JSON.stringify(restore.intro));
  if(!restore.active.hostVisible||!restore.active.bossDocked||!restore.retry.hostVisible||!restore.retry.bossDocked)failures.push('boss active reload dock');
  if(pageErrors.length)failures.push('pageErrors '+JSON.stringify(pageErrors));
  if(failures.length)throw new Error(failures.join(' | '));

  const counts=label=>terminalReport.rows.filter(x=>x.label===label).length;
  console.log('PASS_TOURNAMENT21547E_ALL_BOSS_TERMINALS '+JSON.stringify({bosses:10,starts:counts('start'),draws:counts('draw'),retries:counts('retry'),losses:counts('lost'),wins:counts('won'),portraitMatches:terminalReport.rows.filter(x=>x.portraitMatch).length,bossRoles:terminalReport.rows.filter(x=>x.role==='杯ボス').length,visible:terminalReport.rows.filter(x=>x.visible).length,pageErrors}));
  console.log('PASS_TOURNAMENT21547F_RELOAD_RESTORE '+JSON.stringify({introOpponentOnly:true,restore,pageErrors}));
}finally{
  await browser.close();
}
