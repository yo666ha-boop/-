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
  const settleReload=async()=>{
    await boot();
    await page.waitForTimeout(1200);
    await page.waitForLoadState('domcontentloaded',{timeout:60000});
    await boot();
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.().done===true,{timeout:30000});
  };

  await page.goto('http://127.0.0.1:8000/shogi-v21528/?reloadContext='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    if(!t.start('kenshiro'))throw new Error('start failed');
    await delay(3500);
  });

  const expected=['r1','qf','sf','final'],rows=[];
  for(let round=0;round<4;round++){
    const before=await page.evaluate(()=>{
      const t=window.AI_SHOGI_TOURNAMENT,a=t?.state?.()?.active||null;
      return{
        round:Number(a?.round),playerSlot:Number(a?.playerSlot),cupId:a?.cupId||'',status:a?.status||'',pending:a?.pending??null,
        context:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().context||null,
        opponent:t?.audit?.().currentOpponent||''
      };
    });
    if(before.round!==round||!before.opponent||before.status!=='active'||before.pending)throw new Error('pre '+round+' '+JSON.stringify(before));
    if(![expected[round],'upset','opponent','intro'].includes(before.context))throw new Error('pre context '+round+' '+JSON.stringify(before));

    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await settleReload();
    await page.waitForFunction(expectedState=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,a=t?.state?.()?.active;
      try{d?.render?.();window.AI_SHOGI_TOURNAMENT_VISUAL?.refresh?.()}catch(e){}
      const host=document.getElementById('tourDialogue21547'),opp=document.getElementById('tourOpponentVoice21549'),oi=opp?.querySelector('img'),panel=document.getElementById('tournament21540Panel');
      const hr=host?.getBoundingClientRect?.()||{},or=opp?.getBoundingClientRect?.()||{};
      return Number(a?.round)===expectedState.round&&Number(a?.playerSlot)===expectedState.playerSlot&&a?.cupId===expectedState.cupId&&a?.status==='active'&&!a?.pending&&
        t?.audit?.().currentOpponent===expectedState.opponent&&!panel?.classList.contains('on')&&
        String(document.getElementById('oppName')?.textContent||'').trim().startsWith(expectedState.opponent)&&
        opp?.dataset.speaker===expectedState.opponent&&opp?.dataset.role==='対戦相手・トーナメント参加者'&&
        host?.classList.contains('tourRoundBattleDock21550')&&opp?.classList.contains('tourRoundBattleDock21550')&&
        host?.parentElement?.classList?.contains('side')&&opp?.parentElement?.classList?.contains('side')&&
        Math.round(hr.height||0)===0&&Math.round(or.height||0)>0&&!!oi?.src&&!!oi.complete&&oi.naturalWidth>0;
    },before,{timeout:30000});

    const after=await page.evaluate(()=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,a=t?.state?.()?.active||null;
      d?.render?.();window.AI_SHOGI_TOURNAMENT_VISUAL?.refresh?.();
      const host=document.getElementById('tourDialogue21547'),opp=document.getElementById('tourOpponentVoice21549'),hi=host?.querySelector('img'),oi=opp?.querySelector('img'),hr=host?.getBoundingClientRect?.()||{},or=opp?.getBoundingClientRect?.()||{},side=document.querySelector('.side');
      return{
        round:Number(a?.round),playerSlot:Number(a?.playerSlot),cupId:a?.cupId||'',status:a?.status||'',pending:a?.pending??null,
        context:d?.audit?.().context||null,opponent:t?.audit?.().currentOpponent||'',
        oppName:String(document.getElementById('oppName')?.textContent||'').trim(),
        panelOpen:!!document.getElementById('tournament21540Panel')?.classList.contains('on'),
        hostSpeaker:host?.dataset.speaker||'',oppSpeaker:opp?.dataset.speaker||'',oppRole:opp?.dataset.role||'',
        hostDocked:host?.classList.contains('tourRoundBattleDock21550')===true,oppDocked:opp?.classList.contains('tourRoundBattleDock21550')===true,
        hostParent:host?.parentElement?.classList?.contains('side')?'side':'other',oppParent:opp?.parentElement?.classList?.contains('side')?'side':'other',
        hostImage:!!hi?.src&&!!hi.complete&&hi.naturalWidth>0,oppImage:!!oi?.src&&!!oi.complete&&oi.naturalWidth>0,
        hostHeight:Math.round(hr.height||0),oppHeight:Math.round(or.height||0),
        oppText:(opp?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),
        sideOverflow:side?Math.max(0,side.scrollWidth-side.clientWidth):0,
        docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
        restore:window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.()||null,
        history:JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')
      };
    });

    const f=[];
    if(after.round!==before.round||after.playerSlot!==before.playerSlot||after.cupId!==before.cupId||after.status!=='active'||after.pending)f.push('state changed');
    if(after.opponent!==before.opponent||!after.oppName.startsWith(before.opponent))f.push('opponent changed');
    if(after.panelOpen)f.push('panel reopened');
    if(!after.restore?.done||after.restore?.bossStatus==='active')f.push('restore '+JSON.stringify(after.restore));
    if(after.oppSpeaker!==before.opponent||after.oppRole!=='対戦相手・トーナメント参加者'||!after.oppText)f.push('opponent card');
    if(!after.hostDocked||!after.oppDocked||after.hostParent!=='side'||after.oppParent!=='side')f.push('dock');
    if(!after.hostImage||!after.oppImage||after.hostHeight!==0||after.oppHeight<1||after.oppHeight>115)f.push('portrait/height');
    if(after.sideOverflow!==0||after.docOverflow!==0)f.push('overflow');
    if(f.length)throw new Error('reload '+round+' '+f.join(' | ')+' '+JSON.stringify(after));

    const sessions=after.history?.sessions||{};
    if(Number(after.history?.version)!==2||Object.keys(sessions).length<1||Object.keys(sessions).length>16)throw new Error('session persistence '+JSON.stringify({version:after.history?.version,count:Object.keys(sessions).length}));
    rows.push({round,context:after.context,opponent:after.opponent,hostHidden:after.hostHeight===0,oppHeight:after.oppHeight,sideOverflow:after.sideOverflow,docOverflow:after.docOverflow,sessionCount:Object.keys(sessions).length});

    if(round<3){
      await page.evaluate(async()=>{
        const delay=ms=>new Promise(r=>setTimeout(r,ms)),b=document.getElementById('resultBanner');
        b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-win';b.textContent='win';await delay(260);
        if(!window.AI_SHOGI_TOURNAMENT.next())throw new Error('next failed');
        await delay(3200);
      });
    }
  }

  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21556_RELOAD_CONTEXT_PERSIST '+JSON.stringify({speaker:'opponent',hostHiddenDuringRound:true,rows,pageErrors:errors}));
}finally{await browser.close()}
