import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?dialogue21588='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT_VISUAL?.version==='21590a',{timeout:30000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.__boss21546a===true&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,{timeout:30000});
  const audit=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,v=window.AI_SHOGI_TOURNAMENT_VISUAL;
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    const cardName=c=>(c?.querySelector?.('.chName')?.textContent||c?.querySelector?.('img')?.alt||'').trim();
    const portrait=name=>{const c=[...document.querySelectorAll('#chars .ch')].find(x=>cardName(x)===name);const i=c?.querySelector('img');return i?.currentSrc||i?.src||''};
    const visible=e=>{if(!e)return false;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0};
    const rows=[];
    for(const cup of t.cups()){
      if(t.state()?.active)t.exit();
      const started=!!t.start(cup.id);await delay(220);d.render();v.refresh?.();await delay(260);
      const a=t.state()?.active||null;
      const host=document.getElementById('tourDialogue21547'),hostImg=host?.querySelector('.tourDialoguePortrait img'),hostAudit=d.audit?.()||{};
      const hostSrc=hostImg?.currentSrc||hostImg?.src||'',hostExpected=portrait(cup.boss);
      const opponent=document.getElementById('tourOpponentVoice21549'),opponentImg=opponent?.querySelector('.tourDialoguePortrait img'),opponentSpeaker=opponent?.dataset.speaker||'';
      const opponentSrc=opponentImg?.currentSrc||opponentImg?.src||'',opponentExpected=portrait(opponentSpeaker),visual=v.audit?.()||{};
      const first=a?.bracket?.rounds?.[0]||[],playerSlot=Number(a?.playerSlot)||0,paired=first[playerSlot^1]||'';
      const intro=document.querySelector('#tournament21540Panel .tourRoundIntro21590'),introImg=intro?.querySelector('.tourNextOpponentPortrait21592 img');
      rows.push({
        id:cup.id,boss:cup.boss,started,active:a?.cupId||null,entrants:first.length,bossInBracket:first.includes(cup.boss),
        hostSpeaker:hostAudit.speaker||null,hostRole:host?.dataset.role||null,hostText:(host?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),hostPortraitMatch:!!hostExpected&&hostSrc===hostExpected,hostImageWidth:Number(hostImg?.naturalWidth)||0,hostVisible:visible(host),
        paired,opponentSpeaker,opponentRole:opponent?.dataset.role||null,opponentVisualRole:opponent?.dataset.visualRole||null,opponentRoleBadge:(opponent?.querySelector('.tourDialogueRole')?.textContent||'').trim(),opponentText:(opponent?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),opponentPortraitMatch:!!opponentExpected&&opponentSrc===opponentExpected,opponentImageWidth:Number(opponentImg?.naturalWidth)||0,opponentVisible:visible(opponent),
        duplicateOpponentCard:!!document.getElementById('tourOpponentDialogue21592'),visualSpeaker:visual.opponentSpeaker||'',visualRole:visual.opponentRole||'',roundIntro:!!intro,nextOpponent:visual.nextOpponent||intro?.dataset.nextOpponent||'',nextPortrait:!!introImg&&introImg.complete&&Number(introImg.naturalWidth)>0
      });
      t.exit();await delay(60);
    }
    return {rows,activeAfter:!!t.state()?.active,roster:window.AIShogiIOS?.characters?.().length||0,format:t.audit?.().format||null};
  });
  const fail=[];
  if(audit.rows.length!==10)fail.push('cups '+audit.rows.length);
  if(audit.roster!==26)fail.push('roster '+audit.roster);
  if(audit.format!=='16-player-then-boss')fail.push('format '+audit.format);
  for(const x of audit.rows){
    if(!x.started||x.active!==x.id)fail.push(x.id+': start/active');
    if(x.entrants!==16||x.bossInBracket)fail.push(x.id+': bracket');
    // Host identity and portrait remain valid for milestone/boss phases, but must not be visually confused with the current bracket opponent.
    if(x.hostSpeaker!==x.boss||x.hostRole!=='大会主・トーナメント外'||!x.hostText)fail.push(x.id+': host-state');
    if(!x.hostPortraitMatch||x.hostImageWidth<1||x.hostVisible)fail.push(x.id+': host-portrait/visibility');
    // The actual paired participant is the one visible speaker during bracket play.
    if(!x.paired||x.opponentSpeaker!==x.paired||x.opponentSpeaker===x.boss)fail.push(x.id+': paired-opponent');
    if(x.opponentRole!=='対戦相手・トーナメント参加者'||x.opponentVisualRole!=='対戦相手'||x.opponentRoleBadge!=='対戦相手'||!x.opponentText)fail.push(x.id+': opponent-role/dialogue');
    if(!x.opponentPortraitMatch||x.opponentImageWidth<1||!x.opponentVisible)fail.push(x.id+': opponent-portrait/visible');
    if(x.duplicateOpponentCard)fail.push(x.id+': duplicate-opponent-card');
    if(x.visualSpeaker!==x.opponentSpeaker||x.visualRole!=='対戦相手')fail.push(x.id+': visual-audit');
    if(!x.roundIntro||x.nextOpponent!==x.opponentSpeaker||!x.nextPortrait)fail.push(x.id+': next-opponent-intro');
  }
  if(audit.activeAfter)fail.push('active remains');
  if(errors.length)fail.push('page errors '+JSON.stringify(errors));
  if(fail.length)throw new Error(fail.join(' | '));
  const summary={cups:audit.rows.length,roster:audit.roster,format:audit.format,hostPortraitMatches:audit.rows.filter(x=>x.hostPortraitMatch).length,hostHidden:audit.rows.filter(x=>!x.hostVisible).length,opponentPortraitMatches:audit.rows.filter(x=>x.opponentPortraitMatch).length,opponentVisible:audit.rows.filter(x=>x.opponentVisible).length,nextOpponentIntros:audit.rows.filter(x=>x.roundIntro&&x.nextPortrait).length,bossOutside:audit.rows.filter(x=>!x.bossInBracket).length,duplicateOpponentCards:audit.rows.filter(x=>x.duplicateOpponentCard).length,pageErrors:errors};
  console.log('PASS_TOURNAMENT21588_TEN_CUP_VISIBLE_DIALOGUE '+JSON.stringify(summary));
  console.log('PASS_TOURNAMENT21592_TEN_CUP_OPPONENT_DIALOGUE '+JSON.stringify(summary));
}finally{await browser.close()}
