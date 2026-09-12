import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  const url='http://127.0.0.1:8000/shogi-v21528/?awardPersistence21593='+Date.now();
  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.version==='21592'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,null,{timeout:60000});
  };
  const openAndAudit=async()=>{
    await page.evaluate(()=>{
      window.AI_SHOGI_TOURNAMENT?.render?.();
      document.getElementById('tournament21540Panel')?.classList.add('on');
    });
    await page.waitForFunction(()=>document.querySelectorAll('#tournament21540Panel .tourCup').length===10,{timeout:10000});
    return page.evaluate(()=>{
      const panel=document.getElementById('tournament21540Panel');
      const byId=id=>document.querySelector(`[data-tour-start="${id}"]`)?.closest('.tourCup')||null;
      const text=id=>byId(id)?.innerText||'';
      return {
        kenshiro:text('kenshiro'),
        souther:text('souther'),
        cups:panel?.querySelectorAll('.tourCup').length||0,
        overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
        state:window.AI_SHOGI_TOURNAMENT?.state?.()||null
      };
    });
  };

  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await boot();

  await page.evaluate(()=>{
    localStorage.setItem('aiShogiTournament21540',JSON.stringify({
      version:3,
      active:null,
      trophies:{kenshiro:3},
      championships:{kenshiro:3},
      streaks:{kenshiro:3},
      history:[]
    }));
    window.AI_SHOGI_TOURNAMENT.render();
  });
  const before=await openAndAudit();
  assert.equal(before.cups,10);
  assert.match(before.kenshiro,/🏆 杯獲得 3回/);
  assert.match(before.kenshiro,/優勝 3回/);
  assert.match(before.kenshiro,/🔥 3連覇中/);
  assert.match(before.souther,/優勝 0回/);
  assert.doesNotMatch(before.souther,/🏆 杯獲得/);
  assert.doesNotMatch(before.souther,/連覇中/);
  assert.equal(before.overflow,0);
  assert.equal(before.state?.trophies?.kenshiro,3);
  assert.equal(before.state?.championships?.kenshiro,3);
  assert.equal(before.state?.streaks?.kenshiro,3);

  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  const reloaded=await openAndAudit();
  assert.match(reloaded.kenshiro,/🏆 杯獲得 3回/);
  assert.match(reloaded.kenshiro,/優勝 3回/);
  assert.match(reloaded.kenshiro,/🔥 3連覇中/);
  assert.equal(reloaded.overflow,0);
  assert.equal(reloaded.state?.trophies?.kenshiro,3);
  assert.equal(reloaded.state?.championships?.kenshiro,3);
  assert.equal(reloaded.state?.streaks?.kenshiro,3);

  await page.evaluate(()=>{
    localStorage.setItem('aiShogiTournament21540',JSON.stringify({version:2,active:null,trophies:{kenshiro:2},history:[]}));
  });
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  const migrated=await openAndAudit();
  assert.match(migrated.kenshiro,/🏆 杯獲得 2回/);
  assert.match(migrated.kenshiro,/優勝 2回/);
  assert.doesNotMatch(migrated.kenshiro,/連覇中/);
  assert.equal(migrated.state?.version,3);
  assert.equal(migrated.state?.trophies?.kenshiro,2);
  assert.equal(migrated.state?.championships?.kenshiro,2);
  assert.equal(Number(migrated.state?.streaks?.kenshiro||0),0);
  assert.equal(migrated.overflow,0);

  await page.evaluate(()=>localStorage.removeItem('aiShogiTournament21540'));
  assert.equal(errors.length,0);
  console.log('PASS_TOURNAMENT21593_AWARD_PERSISTENCE_FULLAPP '+JSON.stringify({before:{kenshiro:before.kenshiro,cups:before.cups,overflow:before.overflow},reloaded:{kenshiro:reloaded.kenshiro,overflow:reloaded.overflow},migrated:{kenshiro:migrated.kenshiro,version:migrated.state?.version,overflow:migrated.overflow},pageErrors:errors}));
}finally{
  await browser.close();
}
