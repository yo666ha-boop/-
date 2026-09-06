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
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?reloadContext='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    if(!t.start('shinji'))throw new Error('start failed');
    await delay(3500);
  });
  const expected=['r1','qf','sf','final'],rows=[];
  for(let round=0;round<4;round++){
    const before=await page.evaluate(()=>({round:Number(window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.round),context:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().context||null,opponent:window.AI_SHOGI_TOURNAMENT?.audit?.().currentOpponent||''}));
    if(before.round!==round||before.context!==expected[round]||!before.opponent)throw new Error('pre '+round+' '+JSON.stringify(before));
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await boot();
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE?.audit?.().done===true&&window.AI_SHOGI_TOURNAMENT_RELOAD_VISUAL?.audit?.().done===true,{timeout:30000});
    await page.waitForFunction(ctx=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().context===ctx,expected[round],{timeout:1800});
    const after=await page.evaluate(()=>({
      round:Number(window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.round),
      context:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.().context||null,
      opponent:window.AI_SHOGI_TOURNAMENT?.audit?.().currentOpponent||'',
      panelOpen:!!document.getElementById('tournament21540Panel')?.classList.contains('on'),
      history:JSON.parse(localStorage.getItem('aiShogiTournamentDialogue21547')||'{}')
    }));
    if(after.round!==round||after.context!==expected[round]||after.opponent!==before.opponent||after.panelOpen)throw new Error('reload '+round+' '+JSON.stringify(after));
    const sessions=after.history?.sessions||{};
    if(Number(after.history?.version)!==2||Object.keys(sessions).length<1||Object.keys(sessions).length>16)throw new Error('session persistence '+JSON.stringify({version:after.history?.version,count:Object.keys(sessions).length}));
    rows.push({round,context:after.context,opponent:after.opponent,sessionCount:Object.keys(sessions).length});
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
  console.log('PASS_TOURNAMENT21556_RELOAD_CONTEXT_PERSIST '+JSON.stringify({rows,pageErrors:errors}));
}finally{await browser.close()}
