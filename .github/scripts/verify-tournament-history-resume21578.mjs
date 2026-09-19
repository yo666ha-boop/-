import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.setContent(`<!doctype html><meta charset="utf-8"><div id="tournament21540Panel" class="on"><div class="tourActive"><div class="tourGameHero21559"></div><div class="tourActions"><button data-tour-current>current</button><button data-tour-next>next</button><button data-tour-replay>replay</button></div></div></div><script>
  window.__counts={current:0,next:0,replay:0};window.__starts=[];
  document.querySelector('[data-tour-current]').onclick=()=>window.__counts.current++;
  document.querySelector('[data-tour-next]').onclick=()=>window.__counts.next++;
  document.querySelector('[data-tour-replay]').onclick=()=>window.__counts.replay++;
  window.__tourState={active:{cupId:'future',startedAt:5000,status:'active',round:0},history:[{cupId:'future',startedAt:5000,rating:1700},{cupId:'mitsuki',startedAt:4000,rating:1650}]};
  window.__cups=[{id:'future',name:'未来みつき杯'},{id:'mitsuki',name:'みつき杯'}];
  window.AI_SHOGI_TOURNAMENT={state:()=>JSON.parse(JSON.stringify(window.__tourState)),cups:()=>window.__cups,start:(cupId,retry)=>{window.__starts.push({cupId,retry});const old=window.__tourState.active,newStartedAt=Number(old?.startedAt||0)+1;window.__tourState.active={cupId,startedAt:newStartedAt,status:'active',round:0};window.__tourState.history.unshift({cupId,startedAt:newStartedAt,rating:1700});window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();return true}};
  window.AI_SHOGI_TOURNAMENT_GAME_UI={render:()=>true,audit:()=>({connectors:30,roster:26,bossInBracket:false,sideOverflow:0,docOverflow:0})};
</script>`);
  await page.addScriptTag({path:'shogi-v21528/tournament-history21567.js'});
  const read=()=>page.waitForFunction(()=>{const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();return a?.historyResumeUi21578&&a?.historyRetryUi21579?a:false},{timeout:10000}).then(h=>h.jsonValue());
  const beforeState=await page.evaluate(()=>JSON.stringify(window.__tourState));
  let a=await read();
  assert.equal(a.historyResumable21578,1);assert.deepEqual(a.historyResumeLabels21578,['続きへ']);assert.equal(a.historyRetryable21579,0);
  let current=page.locator('.tourAttemptHistoryItem21567.current');
  assert.equal(await current.getAttribute('role'),'button');assert.equal(await current.getAttribute('tabindex'),'0');assert.equal(await current.getAttribute('aria-label'),'未来みつき杯 1回目 進行中 続きへ');
  await current.click();assert.deepEqual(await page.evaluate(()=>window.__counts),{current:1,next:0,replay:0});
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__tourState)),beforeState);

  await page.evaluate(()=>{window.__tourState.active.pending='next';window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  a=await read();assert.deepEqual(a.historyResumeLabels21578,['次の対局へ']);
  current=page.locator('.tourAttemptHistoryItem21567.current');await current.press('Enter');assert.deepEqual(await page.evaluate(()=>window.__counts),{current:1,next:1,replay:0});

  await page.evaluate(()=>{delete window.__tourState.active.pending;window.__tourState.active.status='draw';window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  a=await read();assert.deepEqual(a.historyResumeLabels21578,['指し直しへ']);
  current=page.locator('.tourAttemptHistoryItem21567.current');await current.press(' ');assert.deepEqual(await page.evaluate(()=>window.__counts),{current:1,next:1,replay:1});

  await page.evaluate(()=>{window.__tourState.active.status='lost';window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  a=await read();assert.equal(a.historyResumable21578,0);assert.deepEqual(a.historyResumeLabels21578,[]);assert.equal(a.historyRetryable21579,1);assert.deepEqual(a.historyRetryLabels21579,['再挑戦']);assert.equal(a.historyStateLabels21579[0],'敗退');
  current=page.locator('.tourAttemptHistoryItem21567.current');assert.equal(await current.getAttribute('role'),'button');assert.equal(await current.getAttribute('tabindex'),'0');assert.equal(await current.getAttribute('data-retryable'),'1');assert.match(await current.getAttribute('aria-label'),/敗退 同じ杯に再挑戦$/);
  const completedBefore=await page.evaluate(()=>({startedAt:window.__tourState.active.startedAt,history:window.__tourState.history.length,old:JSON.stringify(window.__tourState.history[0])}));
  await current.press('Enter');
  a=await read();
  const retried=await page.evaluate(()=>({active:window.__tourState.active,history:window.__tourState.history,starts:window.__starts}));
  assert.deepEqual(retried.starts,[{cupId:'future',retry:true}]);assert.equal(retried.active.cupId,'future');assert.equal(retried.active.status,'active');assert.equal(retried.active.round,0);assert.notEqual(retried.active.startedAt,completedBefore.startedAt);assert.equal(retried.history.length,completedBefore.history+1);assert.equal(JSON.stringify(retried.history[1]),completedBefore.old);assert.equal(a.historyRetryable21579,0);assert.equal(a.historyResumable21578,1);assert.equal(a.historyCurrent21567,1);
  assert.equal(a.connectors,30);assert.equal(a.roster,26);assert.equal(a.bossInBracket,false);assert.equal(a.historyOverflow21567,0);assert.equal(errors.length,0);
  console.log('PASS_TOURNAMENT21578_HISTORY_RESUME_AFFORDANCE '+JSON.stringify({labels:['続きへ','次の対局へ','指し直しへ'],counts:await page.evaluate(()=>window.__counts),connectors:a.connectors,roster:a.roster,bossInBracket:a.bossInBracket,pageErrors:errors}));
  console.log('PASS_TOURNAMENT21579_COMPLETED_HISTORY_RETRY '+JSON.stringify({completedBefore,retried:{active:retried.active,historyCount:retried.history.length,starts:retried.starts},historyRetryableAfter:a.historyRetryable21579,historyResumableAfter:a.historyResumable21578,connectors:a.connectors,roster:a.roster,bossInBracket:a.bossInBracket,pageErrors:errors}));
}finally{await browser.close()}
