import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const BASE=(process.env.PREVIEW_URL||'https://mitsuki-shogi-fullapp-unified21602.vercel.app').replace(/\/$/,'');
const EXPECTED_HEAD='98eb60c1849c0fe63a68f9f462298dc3b4365c7f';

async function waitStable(page){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.version==='21594'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:120000});
      await page.waitForTimeout(500);
      const ok=await page.evaluate(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10);
      if(ok)return;
    }catch(e){last=e}
  }
  throw last||new Error('stable live fullapp state not reached');
}

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',d=>d.accept());

  const response=await page.goto(BASE+'/?live21603='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  assert.equal(response?.status(),200);
  assert.equal(response?.headers()['x-shogi-preview-head'],EXPECTED_HEAD);

  await waitStable(page);
  await page.waitForFunction(()=>document.getElementById('resultBanner')?.dataset?.tourObserve21541==='1',null,{timeout:30000});

  const baseline=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    if(t.state()?.active)t.exit();
    const chars=window.AIShogiIOS.characters();
    const i=chars.findIndex((c,n)=>n>0&&c?.name);
    window.AIShogiIOS.select(i);
    t.render?.();
    return{
      coi:crossOriginIsolated,
      chars:chars.length,
      board:document.getElementById('board')?.children?.length||0,
      controls:[...document.querySelectorAll('#newBtn,#undoBtn,#focusBtn')].length,
      cups:t.cups?.().length||0,
      active:t.state()?.active||null,
      selected:window.AIShogiIOS.char()?.[0]||''
    };
  });
  assert.deepEqual({coi:baseline.coi,chars:baseline.chars,board:baseline.board,controls:baseline.controls,cups:baseline.cups},{coi:true,chars:26,board:81,controls:3,cups:10});
  assert.equal(baseline.active,null);

  const started=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const ok=t.start('kenshiro');
    const audit=t.audit();
    return{
      ok,
      cup:t.state()?.active?.cupId||'',
      opponent:audit.currentOpponent||'',
      selected:window.AIShogiIOS.char()?.[0]||'',
      board:document.getElementById('board')?.children?.length||0,
      controls:[...document.querySelectorAll('#newBtn,#undoBtn,#focusBtn')].length
    };
  });
  assert.equal(started.ok,true,JSON.stringify(started));
  assert.equal(started.cup,'kenshiro',JSON.stringify(started));
  assert.ok(started.opponent,JSON.stringify(started));
  assert.equal(started.selected,started.opponent,JSON.stringify(started));
  assert.equal(started.board,81);
  assert.equal(started.controls,3);

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
    const open=document.getElementById('tournament21540Panel')?.classList.contains('on');
    return !!a&&a.round===1&&a.pending==='next'&&open;
  },null,{timeout:20000});

  const advanced=await page.evaluate(()=>{
    const a=window.AI_SHOGI_TOURNAMENT.state().active;
    return{round:a?.round,pending:a?.pending,panelOpen:document.getElementById('tournament21540Panel')?.classList.contains('on')};
  });
  assert.deepEqual(advanced,{round:1,pending:'next',panelOpen:true});

  const restored=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const current=t.audit().currentOpponent||'';
    const exited=t.exit();
    const chars=window.AIShogiIOS.characters();
    const i=chars.findIndex(c=>c.name&&c.name!==current);
    window.AIShogiIOS.select(i);
    t.render?.();
    return{
      exited,
      active:t.state()?.active||null,
      selected:window.AIShogiIOS.char()?.[0]||'',
      board:document.getElementById('board')?.children?.length||0,
      controls:[...document.querySelectorAll('#newBtn,#undoBtn,#focusBtn')].length,
      bodyTournament:document.body.classList.contains('tournament21540Active')
    };
  });
  assert.equal(restored.exited,true,JSON.stringify(restored));
  assert.equal(restored.active,null,JSON.stringify(restored));
  assert.ok(restored.selected,JSON.stringify(restored));
  assert.equal(restored.board,81);
  assert.equal(restored.controls,3);
  assert.equal(restored.bodyTournament,false);
  assert.deepEqual(pageErrors,[]);

  console.log('PASS_TOURNAMENT21603_LIVE_VERCEL_FULLAPP '+JSON.stringify({base:BASE,baseline,started,advanced,restored,pageErrors}));
}finally{
  await browser.close();
}
