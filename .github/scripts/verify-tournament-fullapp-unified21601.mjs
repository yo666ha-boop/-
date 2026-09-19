import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  const url='http://127.0.0.1:8000/shogi-v21528/?unified21601='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.version==='21594'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:60000});
  await page.waitForFunction(()=>crossOriginIsolated===true,null,{timeout:60000});
  await page.waitForTimeout(250);
  await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.version==='21594'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:60000});
  await page.waitForFunction(()=>document.getElementById('board')?.children?.length>0,null,{timeout:30000});
  await page.waitForFunction(()=>document.getElementById('resultBanner')?.dataset?.tourObserve21541==='1',null,{timeout:10000});

  const baseline=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    if(t.state()?.active)t.exit();
    const chars=window.AIShogiIOS.characters();
    const normalIndex=chars.findIndex((c,i)=>i>0&&c?.name);
    window.AIShogiIOS.select(normalIndex);
    t.render();
    return{
      characters:chars.length,
      boardChildren:document.getElementById('board')?.children?.length||0,
      newButton:!!document.getElementById('newBtn'),
      undoButton:!!document.getElementById('undoBtn'),
      focusButton:!!document.getElementById('focusBtn'),
      normalName:window.AIShogiIOS.char()?.[0]||'',
      opponentText:document.getElementById('oppName')?.textContent||'',
      tournamentActive:!!t.state()?.active
    };
  });
  assert.equal(baseline.characters,26);
  assert.ok(baseline.boardChildren>0,JSON.stringify(baseline));
  assert.ok(baseline.newButton&&baseline.undoButton&&baseline.focusButton,JSON.stringify(baseline));
  assert.equal(baseline.tournamentActive,false);

  const started=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const ok=t.start('kenshiro');
    const audit=t.audit();
    return{
      ok,
      active:t.state()?.active||null,
      opponent:audit.currentOpponent||'',
      selected:window.AIShogiIOS.char()?.[0]||'',
      boardChildren:document.getElementById('board')?.children?.length||0,
      boardVisible:!!document.getElementById('board')?.getBoundingClientRect().width,
      resultObserver:document.getElementById('resultBanner')?.dataset?.tourObserve21541||'',
      normalControls:[...document.querySelectorAll('#newBtn,#undoBtn,#focusBtn')].length
    };
  });
  assert.equal(started.ok,true,JSON.stringify(started));
  assert.ok(started.active&&started.active.cupId==='kenshiro',JSON.stringify(started));
  assert.ok(started.opponent,JSON.stringify(started));
  assert.equal(started.selected,started.opponent,JSON.stringify(started));
  assert.ok(started.boardChildren>0&&started.boardVisible,JSON.stringify(started));
  assert.equal(started.resultObserver,'1',JSON.stringify(started));
  assert.equal(started.normalControls,3,JSON.stringify(started));

  await page.evaluate(()=>{
    const rb=document.getElementById('resultBanner');
    rb.className='resultBanner';
    rb.textContent='';
    void rb.offsetWidth;
    rb.className='resultBanner on result-win';
    rb.textContent='win';
  });
  await page.waitForFunction(()=>{
    const a=window.AI_SHOGI_TOURNAMENT?.state?.()?.active;
    const panelOpen=document.getElementById('tournament21540Panel')?.classList.contains('on');
    return !!a&&a.round===1&&a.pending==='next'&&panelOpen;
  },null,{timeout:15000});

  const afterWin=await page.evaluate(()=>{
    const a=window.AI_SHOGI_TOURNAMENT.state().active;
    return{round:a?.round,pending:a?.pending,panelOpen:document.getElementById('tournament21540Panel')?.classList.contains('on')};
  });
  assert.equal(afterWin.round,1);
  assert.equal(afterWin.pending,'next');
  assert.equal(afterWin.panelOpen,true);

  const restored=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const current=t.audit().currentOpponent||'';
    const exited=t.exit();
    const chars=window.AIShogiIOS.characters();
    const i=chars.findIndex(c=>c.name&&c.name!==current);
    window.AIShogiIOS.select(i);
    t.render();
    document.getElementById('newBtn')?.click();
    return{
      exited,
      active:t.state()?.active||null,
      selected:window.AIShogiIOS.char()?.[0]||'',
      boardChildren:document.getElementById('board')?.children?.length||0,
      resultOn:document.getElementById('resultBanner')?.classList.contains('on')||false,
      bodyTournament:document.body.classList.contains('tournament21540Active')
    };
  });
  assert.equal(restored.exited,true,JSON.stringify(restored));
  assert.equal(restored.active,null,JSON.stringify(restored));
  assert.ok(restored.selected,JSON.stringify(restored));
  assert.ok(restored.boardChildren>0,JSON.stringify(restored));
  assert.equal(restored.resultOn,false,JSON.stringify(restored));
  assert.equal(restored.bodyTournament,false,JSON.stringify(restored));
  assert.deepEqual(pageErrors,[]);

  console.log('PASS_TOURNAMENT21601_FULLAPP_UNIFIED_NORMAL_AND_TOURNAMENT '+JSON.stringify({baseline,started:{cupId:started.active.cupId,opponent:started.opponent,selected:started.selected,boardChildren:started.boardChildren},afterWin,restored,pageErrors}));
}finally{
  await browser.close();
}
