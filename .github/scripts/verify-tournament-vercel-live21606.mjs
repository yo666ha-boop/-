import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const BASE=(process.env.PREVIEW_URL||'https://mitsuki-shogi-fullapp-unified21602.vercel.app').replace(/\/$/,'');
const browser=await firefox.launch({headless:true});

async function prepareMate(page){
  return await page.evaluate(()=>{
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
    return{legal,hasMateMove:legal.includes('5d5b')||legal.includes('5d5b+'),selected:api.char()?.[0]||'',turn:s.t};
  });
}

async function clickMate(page){
  await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const before=[...document.querySelectorAll('#board .sq')];
    before[31]?.click();
    await wait(40);
    const now=[...document.querySelectorAll('#board .sq')];
    const target=now[13];
    if(!target?.classList.contains('legal'))throw new Error('mate destination 5b not legal');
    target.click();
  });
  await page.waitForFunction(()=>document.getElementById('resultBanner')?.classList.contains('result-win'),null,{timeout:10000});
  return await page.evaluate(()=>({
    resultText:document.getElementById('resultBanner')?.textContent||'',
    status:document.getElementById('status')?.textContent||'',
    log:window.AIShogiIOS.state()?.log?.slice?.()||[]
  }));
}

try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  await page.goto(BASE+'/?live21606='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>crossOriginIsolated===true&&document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AIShogiIOS&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10&&window.AI_SHOGI_TOURNAMENT_BOSS?.version==='21583',null,{timeout:120000});
  await page.waitForTimeout(500);
  await page.waitForFunction(()=>document.getElementById('resultBanner')?.dataset?.tourObserve21541==='1'&&document.getElementById('resultBanner')?.dataset?.bossObserve21546==='1',null,{timeout:30000});

  const start=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    if(t.state()?.active)t.exit();
    const ok=t.start('kenshiro');
    const a=t.state()?.active;
    return{ok,cup:a?.cupId||'',round:a?.round,status:a?.status||'',opponent:t.audit().currentOpponent||'',selected:window.AIShogiIOS.char()?.[0]||''};
  });
  assert.equal(start.ok,true,JSON.stringify(start));
  assert.equal(start.cup,'kenshiro',JSON.stringify(start));
  assert.equal(start.round,0,JSON.stringify(start));

  const bracketWins=[];
  for(let round=0;round<4;round++){
    const before=await page.evaluate(()=>({
      round:window.AI_SHOGI_TOURNAMENT.state()?.active?.round,
      status:window.AI_SHOGI_TOURNAMENT.state()?.active?.status,
      opponent:window.AI_SHOGI_TOURNAMENT.audit().currentOpponent||'',
      selected:window.AIShogiIOS.char()?.[0]||''
    }));
    assert.equal(before.round,round,JSON.stringify(before));
    assert.equal(before.status,'active',JSON.stringify(before));
    assert.ok(before.opponent,JSON.stringify(before));
    assert.equal(before.selected,before.opponent,JSON.stringify(before));

    const prep=await prepareMate(page);
    assert.equal(prep.hasMateMove,true,JSON.stringify({round,prep}));
    const mate=await clickMate(page);
    assert.ok(mate.resultText.includes('勝ち'),JSON.stringify({round,mate}));
    assert.ok(mate.status.includes('勝ち'),JSON.stringify({round,mate}));
    assert.equal(mate.log.length,1,JSON.stringify({round,mate}));

    if(round<3){
      await page.waitForFunction(expected=>{
        const a=window.AI_SHOGI_TOURNAMENT?.state?.()?.active;
        return !!a&&a.round===expected&&a.pending==='next'&&a.status==='active'&&document.getElementById('tournament21540Panel')?.classList.contains('on');
      },round+1,{timeout:15000});

      const afterWin=await page.evaluate(()=>{const t=window.AI_SHOGI_TOURNAMENT,a=t.state().active;return{round:a.round,pending:a.pending,status:a.status,nextOpponent:t.audit().currentOpponent||''}});
      bracketWins.push({round,before,mate,afterWin});

      const nextOk=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.next());
      assert.equal(nextOk,true,JSON.stringify({round,afterWin}));
      await page.waitForFunction(expected=>{
        const t=window.AI_SHOGI_TOURNAMENT,a=t?.state?.()?.active;
        return !!a&&a.round===expected&&a.pending===null&&a.status==='active'&&!!t.audit().currentOpponent&&window.AIShogiIOS?.char?.()?.[0]===t.audit().currentOpponent;
      },round+1,{timeout:15000});
    }else{
      await page.waitForFunction(()=>{
        const t=window.AI_SHOGI_TOURNAMENT,a=t?.state?.()?.active,b=window.AI_SHOGI_TOURNAMENT_BOSS?.state?.();
        return !!a&&a.cupId==='kenshiro'&&a.status==='boss_pending'&&b?.status==='pending'&&a.bracket?.rounds?.[4]?.[0]==='__PLAYER__'&&document.getElementById('tournament21540Panel')?.classList.contains('on');
      },null,{timeout:15000});
      const champion=await page.evaluate(()=>{
        const t=window.AI_SHOGI_TOURNAMENT,s=t.state(),a=s.active,b=window.AI_SHOGI_TOURNAMENT_BOSS.state();
        return{
          status:a?.status||'',round:a?.round,champion:a?.bracket?.rounds?.[4]?.[0]||'',
          bossStatus:b?.status||'',boss:b?.boss||'',trophy:Number(s.trophies?.kenshiro||0),
          championships:Number(s.championships?.kenshiro||0),streak:Number(s.streaks?.kenshiro||0),
          panelOpen:document.getElementById('tournament21540Panel')?.classList.contains('on')||false
        };
      });
      bracketWins.push({round,before,mate,champion});
      assert.equal(champion.status,'boss_pending',JSON.stringify(champion));
      assert.equal(champion.champion,'__PLAYER__',JSON.stringify(champion));
      assert.equal(champion.bossStatus,'pending',JSON.stringify(champion));
      assert.equal(champion.boss,'ケンシロウ',JSON.stringify(champion));
      assert.equal(champion.trophy,0,JSON.stringify(champion));
      assert.equal(champion.championships,1,JSON.stringify(champion));
      assert.equal(champion.streak,1,JSON.stringify(champion));
      assert.equal(champion.panelOpen,true,JSON.stringify(champion));
    }
  }

  const bossStart=await page.evaluate(()=>{
    const ok=window.AI_SHOGI_TOURNAMENT_BOSS.challenge();
    const a=window.AI_SHOGI_TOURNAMENT.state().active,b=window.AI_SHOGI_TOURNAMENT_BOSS.state();
    return{ok,status:a?.status||'',bossStatus:b?.status||'',boss:b?.boss||'',selected:window.AIShogiIOS.char()?.[0]||'',panelOpen:document.getElementById('tournament21540Panel')?.classList.contains('on')||false};
  });
  assert.equal(bossStart.ok,true,JSON.stringify(bossStart));
  assert.equal(bossStart.status,'boss_active',JSON.stringify(bossStart));
  assert.equal(bossStart.bossStatus,'active',JSON.stringify(bossStart));
  assert.equal(bossStart.boss,'ケンシロウ',JSON.stringify(bossStart));
  assert.equal(bossStart.selected,'ケンシロウ',JSON.stringify(bossStart));
  assert.equal(bossStart.panelOpen,false,JSON.stringify(bossStart));

  const bossPrep=await prepareMate(page);
  assert.equal(bossPrep.hasMateMove,true,JSON.stringify(bossPrep));
  assert.equal(bossPrep.selected,'ケンシロウ',JSON.stringify(bossPrep));
  const bossMate=await clickMate(page);
  assert.ok(bossMate.resultText.includes('勝ち'),JSON.stringify(bossMate));

  await page.waitForFunction(()=>{
    const t=window.AI_SHOGI_TOURNAMENT,s=t?.state?.(),a=s?.active,b=window.AI_SHOGI_TOURNAMENT_BOSS?.state?.();
    return !!a&&a.cupId==='kenshiro'&&a.status==='champion'&&b?.status==='won'&&Number(s.trophies?.kenshiro||0)>=1&&document.getElementById('tournament21540Panel')?.classList.contains('on');
  },null,{timeout:15000});

  await page.waitForFunction(()=>document.getElementById('tournament21540Panel')?.innerText?.includes('完全制覇'),null,{timeout:10000});

  const final=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT,s=t.state(),a=s.active,b=window.AI_SHOGI_TOURNAMENT_BOSS.audit(),panel=document.getElementById('tournament21540Panel');
    return{
      cup:a?.cupId||'',status:a?.status||'',champion:a?.bracket?.rounds?.[4]?.[0]||'',
      bossStatus:a?.bossChallenge?.status||'',boss:b?.boss||'',bossInBracket:b?.bossInBracket,
      trophy:Number(s.trophies?.kenshiro||0),championships:Number(s.championships?.kenshiro||0),streak:Number(s.streaks?.kenshiro||0),
      panelOpen:panel?.classList.contains('on')||false,panelComplete:panel?.innerText?.includes('完全制覇')||false,
      bracketRounds:panel?.querySelectorAll('.tourBracketRound')?.length||0,roadStages:panel?.querySelectorAll('.tourRoadStage21562')?.length||0,
      roster:document.querySelectorAll('#chars .ch').length,resultText:document.getElementById('resultBanner')?.textContent||''
    };
  });

  assert.equal(final.cup,'kenshiro',JSON.stringify(final));
  assert.equal(final.status,'champion',JSON.stringify(final));
  assert.equal(final.champion,'__PLAYER__',JSON.stringify(final));
  assert.equal(final.bossStatus,'won',JSON.stringify(final));
  assert.equal(final.boss,'ケンシロウ',JSON.stringify(final));
  assert.equal(final.bossInBracket,false,JSON.stringify(final));
  assert.equal(final.trophy,1,JSON.stringify(final));
  assert.equal(final.championships,1,JSON.stringify(final));
  assert.equal(final.streak,1,JSON.stringify(final));
  assert.equal(final.panelOpen,true,JSON.stringify(final));
  assert.equal(final.panelComplete,true,JSON.stringify(final));
  assert.equal(final.bracketRounds,5,JSON.stringify(final));
  assert.equal(final.roadStages,5,JSON.stringify(final));
  assert.equal(final.roster,26,JSON.stringify(final));
  assert.deepEqual(pageErrors,[]);

  console.log('PASS_TOURNAMENT21606_LIVE_REAL_FOUR_WINS_BOSS_CUP '+JSON.stringify({base:BASE,start,bracketWins,bossStart,bossMate,final,pageErrors}));
}finally{
  await browser.close();
}
