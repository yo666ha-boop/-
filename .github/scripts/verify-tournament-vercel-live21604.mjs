import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const BASE=(process.env.PREVIEW_URL||'https://mitsuki-shogi-fullapp-unified21602.vercel.app').replace(/\/$/,'');
const browser=await firefox.launch({headless:true});

try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  await page.goto(BASE+'/?live21604='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:120000});
  await page.waitForTimeout(500);
  await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:120000});

  const started=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    if(t.state()?.active)t.exit();
    const ok=t.start('kenshiro');
    const s=window.AIShogiIOS.state();
    return{
      ok,
      cup:t.state()?.active?.cupId||'',
      round:t.state()?.active?.round,
      opponent:t.audit().currentOpponent||'',
      selected:window.AIShogiIOS.char()?.[0]||'',
      turn:s?.t,
      log:s?.log?.length||0,
      board:Array.isArray(s?.b)?s.b.length:0
    };
  });
  assert.equal(started.ok,true,JSON.stringify(started));
  assert.equal(started.cup,'kenshiro',JSON.stringify(started));
  assert.equal(started.round,0,JSON.stringify(started));
  assert.ok(started.opponent,JSON.stringify(started));
  assert.equal(started.selected,started.opponent,JSON.stringify(started));
  assert.equal(started.turn,1,JSON.stringify(started));
  assert.equal(started.log,0,JSON.stringify(started));
  assert.equal(started.board,81,JSON.stringify(started));

  const humanMove=await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const api=window.AIShogiIOS;
    const before=api.state();
    const squares=[...document.querySelectorAll('#board .sq')];

    let from=-1,to=-1;
    for(let i=0;i<before.b.length;i++){
      const p=before.b[i];
      if(!p||Number(p.o)!==1)continue;
      squares[i]?.click();
      await wait(15);
      const currentSquares=[...document.querySelectorAll('#board .sq')];
      const legal=currentSquares.filter(q=>q.classList.contains('legal'));
      if(legal.length){
        from=i;
        to=currentSquares.indexOf(legal[0]);
        legal[0].click();
        break;
      }
    }
    if(from<0||to<0)throw new Error('no clickable human legal move found');

    await wait(50);
    const after=api.state();
    return{
      from,
      to,
      log:after?.log?.length||0,
      turn:after?.t,
      status:document.getElementById('status')?.textContent||''
    };
  });
  assert.ok(humanMove.from>=0&&humanMove.to>=0,JSON.stringify(humanMove));
  assert.equal(humanMove.log,1,JSON.stringify(humanMove));
  assert.equal(humanMove.turn,-1,JSON.stringify(humanMove));

  await page.waitForFunction(()=>{
    const s=window.AIShogiIOS?.state?.();
    return Array.isArray(s?.log)&&s.log.length>=2&&Number(s.t)===1;
  },null,{timeout:45000});

  const afterReply=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const s=window.AIShogiIOS.state();
    const a=t.state()?.active;
    return{
      cup:a?.cupId||'',
      round:a?.round,
      pending:a?.pending??null,
      opponent:t.audit().currentOpponent||'',
      selected:window.AIShogiIOS.char()?.[0]||'',
      log:s?.log?.slice?.()||[],
      logLength:s?.log?.length||0,
      turn:s?.t,
      board:Array.isArray(s?.b)?s.b.length:0,
      resultOn:document.getElementById('resultBanner')?.classList.contains('on')||false,
      status:document.getElementById('status')?.textContent||''
    };
  });

  assert.equal(afterReply.cup,'kenshiro',JSON.stringify(afterReply));
  assert.equal(afterReply.round,0,JSON.stringify(afterReply));
  assert.equal(afterReply.pending,null,JSON.stringify(afterReply));
  assert.equal(afterReply.opponent,started.opponent,JSON.stringify({started,afterReply}));
  assert.equal(afterReply.selected,started.opponent,JSON.stringify({started,afterReply}));
  assert.ok(afterReply.logLength>=2,JSON.stringify(afterReply));
  assert.equal(afterReply.turn,1,JSON.stringify(afterReply));
  assert.equal(afterReply.board,81,JSON.stringify(afterReply));
  assert.equal(afterReply.resultOn,false,JSON.stringify(afterReply));
  assert.deepEqual(pageErrors,[]);

  console.log('PASS_TOURNAMENT21604_LIVE_REAL_MOVE_AND_AI_REPLY '+JSON.stringify({base:BASE,started,humanMove,afterReply,pageErrors}));
}finally{
  await browser.close();
}
