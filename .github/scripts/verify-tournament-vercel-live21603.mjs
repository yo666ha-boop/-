import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const BASE=(process.env.PREVIEW_URL||'https://mitsuki-shogi-fullapp-unified21602.vercel.app').replace(/\/$/,'');
const EXPECTED_HEAD='7c4873ead72af2276351a2b0c27cfc0ab4f7df37';

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

  const tournamentButton=page.locator('#tournament21540Btn');
  const tournamentLabelReady=await page.waitForFunction(()=>{
    const text=document.getElementById('tournament21540Btn')?.textContent||'';
    return text.includes('大会表を開く');
  },null,{timeout:3000}).then(()=>true).catch(()=>false);
  const tournamentStartDiag=await page.evaluate(()=>({
    label:document.getElementById('tournament21540Btn')?.textContent?.trim()||'',
    activeStatus:window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.status||'',
    apiVersion:window.AI_SHOGI_TOURNAMENT?.version||'',
    core21540:!!window.__AI_SHOGI_TOURNAMENT_21540,
    core21541:!!window.__AI_SHOGI_TOURNAMENT_21541,
    observer21540:document.getElementById('resultBanner')?.dataset?.tourObserve21540||'',
    observer21541:document.getElementById('resultBanner')?.dataset?.tourObserve21541||'',
    scripts:[...document.scripts].map(s=>s.src).filter(src=>/tournament/i.test(src))
  }));
  assert.equal(tournamentLabelReady,true,JSON.stringify(tournamentStartDiag));
  assert.match(tournamentStartDiag.label,/大会表を開く/,JSON.stringify(tournamentStartDiag));
  await tournamentButton.click();
  await page.waitForFunction(()=>document.getElementById('tournament21540Panel')?.classList.contains('on'),null,{timeout:10000});
  const panelActions=await page.evaluate(()=>{
    const panel=document.getElementById('tournament21540Panel'),actions=panel?.querySelector('.tourActions'),bracket=panel?.querySelector('.tourBracketWrap'),current=actions?.querySelector('[data-tour-current="1"]'),close=document.getElementById('tourClose21540'),top=document.getElementById('tournament21540Btn'),swipe=panel?.querySelector('.tourBracketSwipeHint');
    const ar=actions?.getBoundingClientRect()||{top:0},br=bracket?.getBoundingClientRect()||{top:0},cr=current?.getBoundingClientRect()||{height:0},xr=close?.getBoundingClientRect()||{height:0},tr=top?.getBoundingClientRect()||{height:0};
    return{
      current:[...document.querySelectorAll('[data-tour-current="1"]')].map(x=>x.textContent?.trim()||''),
      actions:actions?.textContent?.trim()||'',
      actionsBeforeBracket:!!actions&&!!bracket&&ar.top<br.top,
      currentPrimary:!!current?.classList.contains('primary'),
      currentHeight:Math.round(cr.height),
      closeHeight:Math.round(xr.height),
      topButtonHeight:Math.round(tr.height),
      swipeText:swipe?.textContent?.trim()||'',
      swipeVisible:!!swipe&&getComputedStyle(swipe).display!=='none',
      overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)
    };
  });
  assert.equal(panelActions.actionsBeforeBracket,true,JSON.stringify(panelActions));
  assert.equal(panelActions.currentPrimary,true,JSON.stringify(panelActions));
  assert.ok(panelActions.currentHeight>=44,JSON.stringify(panelActions));
  assert.ok(panelActions.closeHeight>=40,JSON.stringify(panelActions));
  assert.ok(panelActions.topButtonHeight>=44,JSON.stringify(panelActions));
  assert.equal(panelActions.swipeVisible,true,JSON.stringify(panelActions));
  assert.match(panelActions.swipeText,/横にスワイプ/,JSON.stringify(panelActions));
  assert.equal(panelActions.overflow,0,JSON.stringify(panelActions));
  await page.setViewportSize({width:900,height:844});
  await page.waitForFunction(()=>{const x=document.querySelector('#tournament21540Panel .tourBracketSwipeHint');return !!x&&getComputedStyle(x).display==='none'},null,{timeout:5000});
  const wideSwipeVisible=await page.evaluate(()=>{const x=document.querySelector('#tournament21540Panel .tourBracketSwipeHint');return !!x&&getComputedStyle(x).display!=='none'});
  assert.equal(wideSwipeVisible,false,'wide viewport must hide swipe hint');
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>{const x=document.querySelector('#tournament21540Panel .tourBracketSwipeHint');return !!x&&getComputedStyle(x).display!=='none'},null,{timeout:5000});
  const closeButton=page.locator('#tourClose21540');
  assert.equal((await closeButton.textContent())?.trim(),'閉じる',JSON.stringify(panelActions));
  await closeButton.click();
  await page.waitForFunction(()=>!document.getElementById('tournament21540Panel')?.classList.contains('on'),null,{timeout:10000});

  const boardRoundTrip=await page.evaluate(()=>({
    panelOpen:document.getElementById('tournament21540Panel')?.classList.contains('on'),
    active:window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.status||'',
    buttonText:document.getElementById('tournament21540Btn')?.textContent?.trim()||''
  }));
  assert.equal(boardRoundTrip.panelOpen,false,JSON.stringify(boardRoundTrip));
  assert.equal(boardRoundTrip.active,'active',JSON.stringify(boardRoundTrip));
  assert.match(boardRoundTrip.buttonText,/大会表を開く/,JSON.stringify(boardRoundTrip));

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
    const a=window.AI_SHOGI_TOURNAMENT.state().active,panel=document.getElementById('tournament21540Panel'),actions=panel?.querySelector('.tourActions'),bracket=panel?.querySelector('.tourBracketWrap'),next=actions?.querySelector('[data-tour-next="1"]'),ar=actions?.getBoundingClientRect()||{top:0},br=bracket?.getBoundingClientRect()||{top:0},nr=next?.getBoundingClientRect()||{height:0};
    return{round:a?.round,pending:a?.pending,panelOpen:panel?.classList.contains('on')||false,actionsBeforeBracket:!!actions&&!!bracket&&ar.top<br.top,nextHeight:Math.round(nr.height),overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
  });
  assert.equal(advanced.round,1,JSON.stringify(advanced));
  assert.equal(advanced.pending,'next',JSON.stringify(advanced));
  assert.equal(advanced.panelOpen,true,JSON.stringify(advanced));
  assert.equal(advanced.actionsBeforeBracket,true,JSON.stringify(advanced));
  assert.ok(advanced.nextHeight>=44,JSON.stringify(advanced));
  assert.equal(advanced.overflow,0,JSON.stringify(advanced));

  const nextButton=page.locator('[data-tour-next="1"]');
  assert.equal((await nextButton.textContent())?.trim(),'次の対局へ');
  await nextButton.click();
  await page.waitForFunction(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const a=t?.state?.()?.active;
    return !!a&&a.round===1&&a.pending===null&&!document.getElementById('tournament21540Panel')?.classList.contains('on')&&window.AIShogiIOS?.char?.()?.[0]===t.audit?.().currentOpponent;
  },null,{timeout:20000});

  const nextRound=await page.evaluate(()=>({
    round:window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.round,
    pending:window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.pending??null,
    panelOpen:document.getElementById('tournament21540Panel')?.classList.contains('on'),
    selected:window.AIShogiIOS?.char?.()?.[0]||'',
    opponent:window.AI_SHOGI_TOURNAMENT?.audit?.().currentOpponent||''
  }));
  assert.equal(nextRound.round,1,JSON.stringify(nextRound));
  assert.equal(nextRound.pending,null,JSON.stringify(nextRound));
  assert.equal(nextRound.panelOpen,false,JSON.stringify(nextRound));
  assert.ok(nextRound.opponent,JSON.stringify(nextRound));
  assert.equal(nextRound.selected,nextRound.opponent,JSON.stringify(nextRound));

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

  console.log('PASS_TOURNAMENT21603_LIVE_VERCEL_FULLAPP '+JSON.stringify({base:BASE,baseline,started,tournamentStartDiag,panelActions,boardRoundTrip,advanced,nextRound,restored,pageErrors}));
}finally{
  await browser.close();
}
