import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  const url='http://127.0.0.1:8000/shogi-v21528/?historyFullapp21567='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8&&window.AI_SHOGI_TOURNAMENT_GAME_UI&&window.__AI_SHOGI_TOURNAMENT_HISTORY_21567,{timeout:60000});

  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    localStorage.removeItem('aiShogiTournament21540');t.render?.();await delay(80);
    for(const id of ['shinji','ayanami','mitsuki','future']){
      if(t.state()?.active)t.exit();await delay(40);
      if(!t.start(id))throw new Error('start failed '+id);
      t.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();await delay(120);
    }
    document.getElementById('tournament21540Panel')?.classList.add('on');
    window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();
  });

  const read=()=>page.waitForFunction(()=>{
    const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();
    if(!a?.history21567||a.historySourceCount21567!==4||a.historyCount21567!==3||a.historyCurrent21567!==1)return false;
    return a;
  },{timeout:20000}).then(h=>h.jsonValue());

  const before=await read();
  assert.deepEqual(before.historyItems21567,['future','mitsuki','ayanami']);
  assert.equal(before.historyOverflow21567,0);assert.equal(before.sideOverflow,0);assert.equal(before.docOverflow,0);
  assert.equal(before.connectors,30);assert.equal(before.roster,26);assert.equal(before.bossInBracket,false);
  const textBefore=await page.locator('#tournament21540Panel .tourAttemptHistory21567').innerText();
  assert.match(textBefore,/最近の挑戦/);assert.match(textBefore,/履歴 4件/);assert.match(textBefore,/未来みつき杯/);assert.match(textBefore,/みつき杯/);assert.match(textBefore,/あやなみ杯/);assert.doesNotMatch(textBefore,/しんじ杯/);assert.match(textBefore,/進行中/);assert.doesNotMatch(textBefore,/勝利|敗北/);

  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.__AI_SHOGI_TOURNAMENT_HISTORY_21567&&window.AI_SHOGI_TOURNAMENT_GAME_UI,{timeout:60000});
  await page.evaluate(()=>{document.getElementById('tournament21540Panel')?.classList.add('on');window.AI_SHOGI_TOURNAMENT?.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.()});
  const reloaded=await read();
  assert.deepEqual(reloaded.historyItems21567,['future','mitsuki','ayanami']);
  assert.equal(reloaded.historyOverflow21567,0);assert.equal(reloaded.sideOverflow,0);assert.equal(reloaded.docOverflow,0);
  assert.equal(reloaded.connectors,30);assert.equal(reloaded.roster,26);assert.equal(reloaded.bossInBracket,false);
  const textReloaded=await page.locator('#tournament21540Panel .tourAttemptHistory21567').innerText();
  assert.match(textReloaded,/履歴 4件/);assert.match(textReloaded,/未来みつき杯/);assert.match(textReloaded,/進行中/);
  assert.equal(errors.length,0);

  console.log('PASS_TOURNAMENT21567_RECENT_ATTEMPT_HISTORY_FULLAPP '+JSON.stringify({before:{source:before.historySourceCount21567,items:before.historyItems21567,current:before.historyCurrent21567,overflow:before.historyOverflow21567},reloaded:{source:reloaded.historySourceCount21567,items:reloaded.historyItems21567,current:reloaded.historyCurrent21567,overflow:reloaded.historyOverflow21567},connectors:reloaded.connectors,roster:reloaded.roster,bossInBracket:reloaded.bossInBracket,pageErrors:errors}));
}finally{await browser.close()}
