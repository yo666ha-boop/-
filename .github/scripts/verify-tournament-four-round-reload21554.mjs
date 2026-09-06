import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:30000});
  };
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?roundReload='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();

  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    if(!t.start('shinji'))throw new Error('start failed');
    await delay(3500);
  });

  const rounds=[];
  for(let expectedRound=0;expectedRound<4;expectedRound++){
    const before=await page.evaluate(()=>{
      const t=window.AI_SHOGI_TOURNAMENT,a=t.state()?.active||null;
      return{round:Number(a?.round),playerSlot:Number(a?.playerSlot),opponent:t.audit?.().currentOpponent||'',cupId:a?.cupId||'',status:a?.status||'',pending:a?.pending??null};
    });
    if(before.round!==expectedRound||!before.opponent||before.status!=='active'||before.pending)throw new Error('bad pre-reload round '+JSON.stringify(before));

    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await boot();
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.().done===true,{timeout:30000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_RELOAD_VISUAL?.audit?.().done===true,{timeout:30000});
    await page.waitForFunction(expected=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,a=t?.state?.()?.active;
      try{d?.render?.()}catch(e){}
      const panel=document.getElementById('tournament21540Panel'),host=document.getElementById('tourDialogue21547'),opp=document.getElementById('tourOpponentVoice21549');
      return Number(a?.round)===expected.round&&Number(a?.playerSlot)===expected.playerSlot&&t?.audit?.().currentOpponent===expected.opponent&&
        !panel?.classList.contains('on')&&String(document.getElementById('oppName')?.textContent||'').trim().startsWith(expected.opponent)&&
        host?.classList.contains('tourRoundBattleDock21550')&&opp?.classList.contains('tourRoundBattleDock21550')&&
        host?.parentElement?.classList?.contains('side')&&opp?.parentElement?.classList?.contains('side')&&opp?.dataset.speaker===expected.opponent;
    },before,{timeout:30000});

    const after=await page.evaluate(()=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,a=t.state()?.active||null;
      d.render();
      const panel=document.getElementById('tournament21540Panel'),host=document.getElementById('tourDialogue21547'),opp=document.getElementById('tourOpponentVoice21549'),hi=host?.querySelector('img'),oi=opp?.querySelector('img'),hr=host?.getBoundingClientRect?.()||{},or=opp?.getBoundingClientRect?.()||{},side=document.querySelector('.side');
      return{
        round:Number(a?.round),playerSlot:Number(a?.playerSlot),opponent:t.audit?.().currentOpponent||'',oppName:String(document.getElementById('oppName')?.textContent||'').trim(),
        panelOpen:!!panel?.classList.contains('on'),restore:tournamentRestore=window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.()||null,visual:window.AI_SHOGI_TOURNAMENT_RELOAD_VISUAL?.audit?.()||null,
        hostSpeaker:host?.dataset.speaker||'',oppSpeaker:opp?.dataset.speaker||'',hostRole:host?.dataset.role||'',oppRole:opp?.dataset.role||'',
        hostDocked:host?.classList.contains('tourRoundBattleDock21550')===true,oppDocked:opp?.classList.contains('tourRoundBattleDock21550')===true,
        hostParent:host?.parentElement?.classList?.contains('side')?'side':'other',oppParent:opp?.parentElement?.classList?.contains('side')?'side':'other',
        hostImage:!!hi?.src&&!!hi.complete&&hi.naturalWidth>0,oppImage:!!oi?.src&&!!oi.complete&&oi.naturalWidth>0,
        hostHeight:Math.round(hr.height||0),oppHeight:Math.round(or.height||0),
        sideOverflow:side?Math.max(0,side.scrollWidth-side.clientWidth):0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
        oppText:(opp?.querySelector('.tourDialogueBubble')?.textContent||'').trim()
      };
    });

    const f=[];
    if(after.round!==before.round||after.playerSlot!==before.playerSlot||after.opponent!==before.opponent)f.push('state changed');
    if(!after.oppName.startsWith(before.opponent))f.push('selected opponent '+after.oppName);
    if(after.panelOpen)f.push('panel reopened');
    if(!after.restore?.done||after.restore?.bossStatus==='active')f.push('restore audit '+JSON.stringify(after.restore));
    if(!after.visual?.done||after.visual?.initialRoundActive!==true)f.push('visual audit '+JSON.stringify(after.visual));
    if(!after.hostDocked||!after.oppDocked||after.hostParent!=='side'||after.oppParent!=='side')f.push('dock '+JSON.stringify(after));
    if(after.oppSpeaker!==before.opponent||after.oppRole!=='対戦相手・トーナメント参加者')f.push('opponent card '+JSON.stringify(after));
    if(!after.hostImage||!after.oppImage||after.hostHeight<1||after.oppHeight<1||after.hostHeight>115||after.oppHeight>115)f.push('portrait/height '+JSON.stringify(after));
    if(after.sideOverflow!==0||after.docOverflow!==0||!after.oppText)f.push('overflow/text '+JSON.stringify(after));
    if(f.length)throw new Error('round '+expectedRound+' '+f.join(' | '));
    rounds.push({before,after});

    if(expectedRound<3){
      await page.evaluate(async()=>{
        const delay=ms=>new Promise(r=>setTimeout(r,ms)),b=document.getElementById('resultBanner');
        b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-win';b.textContent='win';await delay(260);
        if(!window.AI_SHOGI_TOURNAMENT.next())throw new Error('next failed');
        await delay(350);
      });
    }
  }

  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21554_FOUR_ROUND_RELOAD_RESTORE '+JSON.stringify({
    rounds:rounds.map(x=>({round:x.after.round,opponent:x.after.opponent,panelOpen:x.after.panelOpen,hostHeight:x.after.hostHeight,oppHeight:x.after.oppHeight,sideOverflow:x.after.sideOverflow,docOverflow:x.after.docOverflow,restoreVersion:x.after.restore?.version||null,visualVersion:x.after.visual?.version||null})),
    pageErrors:errors
  }));
}finally{
  await browser.close();
}
