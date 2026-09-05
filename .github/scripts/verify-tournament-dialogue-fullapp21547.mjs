import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async dialog=>{await dialog.accept()});
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?dialogueFullapp='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d',{timeout:20000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.__boss21546a===true&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:20000});

  const audit=await page.evaluate(()=>{
    const api=window.AIShogiIOS;let s=null,stateError='';
    try{s=api?.state?.()||null}catch(e){stateError=String(e?.message||e)}
    const scripts=[...document.scripts].map(x=>x.src).filter(Boolean);
    const dialogueSrc=scripts.find(x=>x.includes('/tournament-dialogue21547.js'))||'';
    const bankSrc=scripts.find(x=>x.includes('/tournament-dialogue-bank21547.js'))||'';
    return{
      dialogueVersion:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version||null,
      loaderD:!!window.__AI_SHOGI_TOURNAMENT_LOADER_21547D,
      dialogueSrc,
      bankSrc,
      dialogueCacheD:/[?&]v=21547d(?:&|$)/.test(dialogueSrc),
      bankCacheD:/[?&]v=21547d(?:&|$)/.test(bankSrc),
      aiApi:!!api,
      stateFunction:typeof api?.state==='function',
      charactersFunction:typeof api?.characters==='function',
      board:Array.isArray(s?.b),
      boardLength:Array.isArray(s?.b)?s.b.length:0,
      hands:!!s?.h&&typeof s.h==='object',
      handS:!!s?.h?.[1]&&typeof s.h[1]==='object',
      handG:!!s?.h?.[-1]&&typeof s.h[-1]==='object',
      turn:[1,-1].includes(Number(s?.t)),
      log:Array.isArray(s?.log),
      rosterCount:Array.isArray(api?.characters?.())?api.characters().length:0,
      tournamentFormat:window.AI_SHOGI_TOURNAMENT?.audit?.().format||null,
      bossLayer:!!window.AI_SHOGI_TOURNAMENT?.__boss21546a,
      stateError
    };
  });

  const failures=[];
  if(audit.dialogueVersion!=='21547d')failures.push('dialogue version '+audit.dialogueVersion);
  if(!audit.loaderD)failures.push('21547d loader flag missing');
  if(!audit.dialogueCacheD)failures.push('dialogue cache key is not 21547d: '+audit.dialogueSrc);
  if(!audit.bankCacheD)failures.push('bank cache key is not 21547d: '+audit.bankSrc);
  if(!audit.aiApi||!audit.stateFunction||!audit.charactersFunction)failures.push('AIShogiIOS API missing');
  if(!audit.board||audit.boardLength!==81||!audit.hands||!audit.handS||!audit.handG||!audit.turn||!audit.log)failures.push('live state shape incompatible: '+JSON.stringify(audit));
  if(audit.rosterCount!==26)failures.push('rosterCount '+audit.rosterCount);
  if(audit.tournamentFormat!=='16-player-then-boss'||!audit.bossLayer)failures.push('boss-after-bracket layer missing: '+JSON.stringify(audit));
  if(failures.length)throw new Error(failures.join(' | '));

  console.log('PASS_TOURNAMENT21547D_FULLAPP_API '+JSON.stringify({...audit,pageErrors:errors}));

  const live=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE;
    const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const cardName=card=>(card?.querySelector?.('.chName')?.textContent||card?.querySelector?.('img')?.alt||'').trim();
    const rosterPortrait=name=>{
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>cardName(c)===name);
      const img=card?.querySelector('img');return img?.currentSrc||img?.src||'';
    };
    const results=[];
    for(const cup of t.cups()){
      if(t.state()?.active)t.exit();
      const started=!!t.start(cup.id);
      await delay(220);
      const panel=document.getElementById('tournament21540Panel');
      if(panel&&!panel.classList.contains('on'))document.getElementById('tournament21540Btn')?.click();
      await delay(80);
      d.render();
      await delay(100);
      const box=document.getElementById('tourDialogue21547'),img=box?.querySelector('.tourDialoguePortrait img');
      const state=t.state()?.active||null,dialogue=d.audit?.()||{};
      const expectedSrc=rosterPortrait(cup.boss),actualSrc=img?.currentSrc||img?.src||'';
      const rect=box?.getBoundingClientRect?.()||{width:0,height:0};
      const row0=state?.bracket?.rounds?.[0]||[];
      results.push({
        cupId:cup.id,boss:cup.boss,started,
        activeCup:state?.cupId||null,entrantCount:row0.length,bossInBracket:row0.includes(cup.boss),
        context:dialogue.context||null,speaker:dialogue.speaker||null,role:box?.dataset.role||null,
        lineId:box?.dataset.lineId||null,label:(box?.querySelector('.tourDialogueStatus')?.textContent||'').trim(),
        text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),
        portrait:!!actualSrc,portraitMatch:!!expectedSrc&&actualSrc===expectedSrc,
        imageComplete:!!img?.complete,imageWidth:Number(img?.naturalWidth)||0,imageHeight:Number(img?.naturalHeight)||0,
        visible:!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0,
        width:Math.round(rect.width),height:Math.round(rect.height),
        panelOpen:!!panel?.classList.contains('on'),dialogueAuditOk:!!dialogue.ok
      });
      t.exit();
      await delay(60);
    }
    return{cups:results,activeAfter:!!t.state()?.active};
  });

  const liveFailures=[];
  if(live.cups.length!==8)liveFailures.push('live cups '+live.cups.length);
  for(const x of live.cups){
    if(!x.started)liveFailures.push(x.cupId+': start failed');
    if(x.activeCup!==x.cupId)liveFailures.push(x.cupId+': active cup '+x.activeCup);
    if(x.entrantCount!==16)liveFailures.push(x.cupId+': entrants '+x.entrantCount);
    if(x.bossInBracket)liveFailures.push(x.cupId+': boss leaked into bracket');
    if(x.speaker!==x.boss)liveFailures.push(x.cupId+': speaker '+x.speaker);
    if(x.role!=='大会主・トーナメント外')liveFailures.push(x.cupId+': role '+x.role);
    if(!x.lineId||!x.label||!x.text)liveFailures.push(x.cupId+': dialogue text missing');
    if(!x.portrait||!x.portraitMatch||!x.imageComplete||x.imageWidth<1||x.imageHeight<1)liveFailures.push(x.cupId+': real portrait mismatch/load failure');
    if(!x.panelOpen||!x.visible||x.width<1||x.height<1)liveFailures.push(x.cupId+': dialogue not visibly rendered');
    if(!x.dialogueAuditOk)liveFailures.push(x.cupId+': dialogue audit false');
  }
  if(live.activeAfter)liveFailures.push('tournament state not cleaned after live checks');
  if(errors.length)liveFailures.push('page errors '+JSON.stringify(errors));
  if(liveFailures.length)throw new Error(liveFailures.join(' | '));

  console.log('PASS_TOURNAMENT21547D_FULLAPP_VISIBLE_DIALOGUE '+JSON.stringify({
    cups:live.cups.length,
    visible:live.cups.filter(x=>x.visible).length,
    portraitMatches:live.cups.filter(x=>x.portraitMatch).length,
    outsideBracket:live.cups.filter(x=>!x.bossInBracket).length,
    hostRoles:live.cups.filter(x=>x.role==='大会主・トーナメント外').length,
    speakers:live.cups.map(x=>x.speaker),
    contexts:live.cups.map(x=>x.context),
    minImageWidth:Math.min(...live.cups.map(x=>x.imageWidth)),
    minBoxHeight:Math.min(...live.cups.map(x=>x.height)),
    pageErrors:errors
  }));

  const transitions=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE;
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    const snap=label=>{
      d.render();
      const a=t.state()?.active||null,da=d.audit?.()||{},box=document.getElementById('tourDialogue21547');
      return {label,context:da.context||null,speaker:da.speaker||null,role:box?.dataset.role||null,status:a?.status||null,round:Number(a?.round??-1),pending:a?.pending||null,bossStatus:a?.bossChallenge?.status||null,text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),portrait:!!box?.querySelector('.tourDialoguePortrait img')?.src};
    };
    const result=async kind=>{const r=document.getElementById('resultBanner');r.className='resultBanner';void r.offsetWidth;r.className='resultBanner on result-'+kind;r.textContent=kind;await delay(220)};
    const waitBoss=async status=>{for(let i=0;i<30;i++){if(t.state()?.active?.bossChallenge?.status===status)return true;await delay(80)}return false};
    if(t.state()?.active)t.exit();
    t.start('shinji');await delay(180);
    const seen=[snap('intro')];
    await delay(3300);seen.push(snap('round1'));
    for(let round=0;round<4;round++){
      await result('win');seen.push(snap('win'+(round+1)));
      if(round<3){t.next();await delay(120);seen.push(snap('next'+(round+1)))}
    }
    seen.push(snap('champion'));
    await delay(3400);seen.push(snap('bossPending'));
    const pendingSnapshot=localStorage.getItem('aiShogiTournament21540');
    t.challengeBoss();await delay(180);seen.push(snap('bossStart'));
    const evalNode=document.getElementById('evalNumber');
    if(evalNode){evalNode.textContent='+900';await delay(700);seen.push(snap('bossAdvantage'));evalNode.textContent='-900';await delay(700);seen.push(snap('bossDisadvantage'));evalNode.textContent='—'}
    await result('draw');await waitBoss('draw');seen.push(snap('bossDraw'));
    t.challengeBoss();await waitBoss('active');await result('loss');await waitBoss('lost');seen.push(snap('bossLoss'));
    localStorage.setItem('aiShogiTournament21540',pendingSnapshot);t.render();await delay(120);seen.push(snap('restoredPending'));
    t.challengeBoss();await waitBoss('active');await result('win');await waitBoss('won');seen.push(snap('bossWin'));
    const final=t.state();
    t.exit();await delay(80);
    return{seen,finalStatus:final?.active?.status||null,trophy:Number(final?.trophies?.shinji)||0,activeAfter:!!t.state()?.active};
  });

  const transitionFailures=[];
  const by=Object.fromEntries(transitions.seen.map(x=>[x.label,x]));
  const expect=(label,ctx)=>{const x=by[label];if(!x)transitionFailures.push(label+': missing');else if(x.context!==ctx)transitionFailures.push(label+': context '+x.context+' expected '+ctx);else if(!x.text||!x.portrait)transitionFailures.push(label+': visible dialogue missing')};
  expect('intro','intro');expect('round1','r1');
  expect('win1','round_win');expect('win2','round_win');expect('win3','round_win');
  for(const n of [1,2,3]){
    const x=by['next'+n];
    if(!x||!['opponent','qf','sf','final','upset'].includes(x.context))transitionFailures.push('next'+n+': context '+x?.context);
    else if(!x.text||!x.portrait)transitionFailures.push('next'+n+': visible dialogue missing');
  }
  expect('champion','tournament_champion');expect('bossPending','boss_pending');expect('bossStart','boss_start');
  if(by.bossAdvantage&&by.bossAdvantage.context!=='boss_advantage')transitionFailures.push('bossAdvantage: '+by.bossAdvantage.context);
  if(by.bossDisadvantage&&by.bossDisadvantage.context!=='boss_disadvantage')transitionFailures.push('bossDisadvantage: '+by.bossDisadvantage.context);
  expect('bossDraw','boss_draw');expect('bossLoss','boss_lost');expect('restoredPending','boss_pending');expect('bossWin','boss_won');
  if(transitions.finalStatus!=='champion')transitionFailures.push('finalStatus '+transitions.finalStatus);
  if(transitions.trophy!==1)transitionFailures.push('trophy '+transitions.trophy);
  if(transitions.activeAfter)transitionFailures.push('active state remains after transition cleanup');
  if(errors.length)transitionFailures.push('page errors '+JSON.stringify(errors));
  if(transitionFailures.length)throw new Error(transitionFailures.join(' | '));
  console.log('PASS_TOURNAMENT21547D_FULLAPP_TRANSITIONS '+JSON.stringify({contexts:transitions.seen.map(x=>x.context),upsetObserved:transitions.seen.filter(x=>x.context==='upset').length,finalStatus:transitions.finalStatus,trophy:transitions.trophy,activeAfter:transitions.activeAfter,pageErrors:errors}));

} finally {
  await browser.close();
}
