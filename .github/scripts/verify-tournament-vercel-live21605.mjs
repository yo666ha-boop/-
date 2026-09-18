import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const BASE=(process.env.PREVIEW_URL||'https://mitsuki-shogi-fullapp-unified21602.vercel.app').replace(/\/$/,'');
const browser=await firefox.launch({headless:true});

try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  await page.goto(BASE+'/?live21605='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:120000});
  await page.waitForTimeout(500);
  await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:120000});
  await page.waitForFunction(()=>document.getElementById('resultBanner')?.dataset?.tourObserve21541==='1',null,{timeout:30000});

  const prepared=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    if(t.state()?.active)t.exit();
    if(!t.start('kenshiro'))throw new Error('cup start failed');

    const api=window.AIShogiIOS;
    const s=api.state();
    s.b=Array(81).fill(null);
    s.h={1:{},'-1':{}};
    s.t=1;
    s.log=[];
    s.last=null;

    const idx=(x,y)=>y*9+x;
    s.b[idx(8,8)]={k:'K',o:1};
    s.b[idx(4,0)]={k:'K',o:-1};
    s.b[idx(3,0)]={k:'L',o:-1};
    s.b[idx(5,0)]={k:'L',o:-1};
    s.b[idx(3,1)]={k:'P',o:-1};
    s.b[idx(5,1)]={k:'P',o:-1};
    s.b[idx(3,2)]={k:'G',o:1};
    s.b[idx(4,3)]={k:'R',o:1};

    const legal=api.legal();
    return{
      cup:t.state()?.active?.cupId||'',
      round:t.state()?.active?.round,
      opponent:t.audit().currentOpponent||'',
      selected:api.char()?.[0]||'',
      legal,
      hasMateMove:legal.includes('5d5b')||legal.includes('5d5b+'),
      board:Array.isArray(s.b)?s.b.length:0,
      turn:s.t,
      log:s.log.length
    };
  });

  assert.equal(prepared.cup,'kenshiro',JSON.stringify(prepared));
  assert.equal(prepared.round,0,JSON.stringify(prepared));
  assert.ok(prepared.opponent,JSON.stringify(prepared));
  assert.equal(prepared.selected,prepared.opponent,JSON.stringify(prepared));
  assert.equal(prepared.board,81,JSON.stringify(prepared));
  assert.equal(prepared.turn,1,JSON.stringify(prepared));
  assert.equal(prepared.log,0,JSON.stringify(prepared));
  assert.equal(prepared.hasMateMove,true,JSON.stringify(prepared));

  const clicked=await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const squares=[...document.querySelectorAll('#board .sq')];
    squares[31]?.click();
    await wait(40);
    const now=[...document.querySelectorAll('#board .sq')];
    const target=now[13];
    const legal=target?.classList.contains('legal')||false;
    if(!legal)throw new Error('mate destination 5b is not legal after render');
    target.click();
    await wait(80);

    const s=window.AIShogiIOS.state();
    return{
      log:s?.log?.slice?.()||[],
      logLength:s?.log?.length||0,
      turn:s?.t,
      resultClass:document.getElementById('resultBanner')?.className||'',
      resultText:document.getElementById('resultBanner')?.textContent||'',
      status:document.getElementById('status')?.textContent||''
    };
  });

  assert.equal(clicked.logLength,1,JSON.stringify(clicked));
  assert.ok(clicked.resultClass.includes('result-win'),JSON.stringify(clicked));
  assert.ok(clicked.resultText.includes('勝ち'),JSON.stringify(clicked));
  assert.ok(clicked.status.includes('勝ち'),JSON.stringify(clicked));

  await page.waitForFunction(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const a=t?.state?.()?.active;
    const open=document.getElementById('tournament21540Panel')?.classList.contains('on');
    return !!a&&a.cupId==='kenshiro'&&a.round===1&&a.pending==='next'&&open;
  },null,{timeout:20000});

  await page.waitForFunction(()=>{
    const panel=document.getElementById('tournament21540Panel');
    return !!panel?.classList.contains('on')&&(panel.querySelectorAll('.tourBracketRound').length===5)&&(panel.querySelectorAll('.tourRoadStage21562').length===5);
  },null,{timeout:15000});

  const advanced=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const a=t.state().active;
    const panel=document.getElementById('tournament21540Panel');
    return{
      cup:a?.cupId||'',
      round:a?.round,
      pending:a?.pending??null,
      opponent:t.audit().currentOpponent||'',
      panelOpen:panel?.classList.contains('on')||false,
      resultClass:document.getElementById('resultBanner')?.className||'',
      resultText:document.getElementById('resultBanner')?.textContent||'',
      bracketVisible:!!panel?.querySelector('.tourBracket'),
      bracketRounds:panel?.querySelectorAll('.tourBracketRound')?.length||0,
      roadStages:panel?.querySelectorAll('.tourRoadStage21562')?.length||0,
      roster:document.querySelectorAll('#chars .ch').length
    };
  });

  assert.equal(advanced.cup,'kenshiro',JSON.stringify(advanced));
  assert.equal(advanced.round,1,JSON.stringify(advanced));
  assert.equal(advanced.pending,'next',JSON.stringify(advanced));
  assert.equal(advanced.panelOpen,true,JSON.stringify(advanced));
  assert.equal(advanced.bracketVisible,true,JSON.stringify(advanced));
  assert.equal(advanced.bracketRounds,5,JSON.stringify(advanced));
  assert.equal(advanced.roadStages,5,JSON.stringify(advanced));
  assert.equal(advanced.roster,26,JSON.stringify(advanced));
  assert.deepEqual(pageErrors,[]);

  console.log('PASS_TOURNAMENT21605_LIVE_REAL_MATE_TO_QF '+JSON.stringify({base:BASE,prepared,clicked,advanced,pageErrors}));
}finally{
  await browser.close();
}
