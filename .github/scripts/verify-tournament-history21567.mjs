import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const historyPath='shogi-v21528/tournament-history21567.js';
const roadPath='shogi-v21528/tournament-road21562.js';
const historySource=await fs.readFile(historyPath,'utf8');
const roadSource=await fs.readFile(roadPath,'utf8');
assert.ok(historySource.includes('__AI_SHOGI_TOURNAMENT_HISTORY_21567'));
assert.ok(roadSource.includes('tournament-history21567.js?v=21567'),'21562 road must load 21567 history companion');

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:280,height:700}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;max-width:100%;overflow-x:hidden}.side{width:100%;min-width:0}.tourActive,.tourGameHero21559,.tourRoad21562{width:100%;min-width:0}.tourGameHero21559{height:30px}.tourRoad21562{height:12px}</style><div class="side"><div id="tournament21540Panel" class="tourFireFit"><div class="tourActive"><div class="tourGameHero21559"></div><div class="tourRoad21562"></div></div></div></div><script>window.__tourState={active:{cupId:'shinji',startedAt:1000},history:[{cupId:'shinji',startedAt:1000,rating:1500,format:'16-player-live'}]};window.__cups=[{id:'shinji',name:'しんじ杯'},{id:'ayanami',name:'あやなみ杯'},{id:'kenshiro',name:'ケンシロウ杯'},{id:'mitsuki',name:'みつき杯'},{id:'future',name:'未来みつき杯'}];window.AI_SHOGI_TOURNAMENT={state:()=>window.__tourState,cups:()=>window.__cups};window.AI_SHOGI_TOURNAMENT_GAME_UI={version:'21559a',render:()=>true,audit:()=>({connectors:30,roster:26,bossInBracket:false,sideOverflow:0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)})};</script>`);
  await page.addScriptTag({path:historyPath});
  const first=await page.waitForFunction(()=>{const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();return a?.history21567&&a.historyCount21567===1?a:false},{timeout:10000}).then(h=>h.jsonValue());
  assert.equal(first.historySourceCount21567,1);assert.equal(first.historyCurrent21567,1);assert.deepEqual(first.historyItems21567,['shinji']);assert.equal(first.historyOverflow21567,0);assert.equal(first.connectors,30);assert.equal(first.roster,26);assert.equal(first.bossInBracket,false);
  const firstText=await page.locator('.tourAttemptHistory21567').innerText();assert.match(firstText,/最近の挑戦/);assert.match(firstText,/しんじ杯/);assert.match(firstText,/R1500/);assert.match(firstText,/進行中/);

  await page.evaluate(()=>{window.__tourState={active:{cupId:'future',startedAt:5000},history:[{cupId:'future',startedAt:5000,rating:1700,format:'16-player-live'},{cupId:'mitsuki',startedAt:4000,rating:1650,format:'16-player-live'},{cupId:'shinji',startedAt:3000,rating:1600,format:'16-player-live'},{cupId:'ayanami',startedAt:2000,rating:1550,format:'16-player-live'},{cupId:'kenshiro',startedAt:1000,rating:1500,format:'16-player-live'}]};window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  const many=await page.waitForFunction(()=>{const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();return a?.historySourceCount21567===5&&a.historyCount21567===3?a:false},{timeout:10000}).then(h=>h.jsonValue());
  assert.deepEqual(many.historyItems21567,['future','mitsuki','shinji']);assert.equal(many.historyCurrent21567,1);assert.equal(many.historyOverflow21567,0);assert.equal(many.docOverflow,0);assert.equal(many.connectors,30);assert.equal(many.roster,26);assert.equal(many.bossInBracket,false);
  const manyText=await page.locator('.tourAttemptHistory21567').innerText();assert.match(manyText,/履歴 5件/);assert.match(manyText,/未来みつき杯/);assert.match(manyText,/みつき杯/);assert.match(manyText,/しんじ杯/);assert.doesNotMatch(manyText,/あやなみ杯/);assert.doesNotMatch(manyText,/勝利|敗北/);

  await page.setViewportSize({width:320,height:700});
  await page.evaluate(()=>{document.getElementById('tournament21540Panel').classList.remove('tourFireFit');window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  const normal=windowResult(await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_GAME_UI.audit()));
  assert.equal(normal.historyOverflow21567,0);assert.equal(normal.docOverflow,0);assert.equal(errors.length,0);
  console.log('PASS_TOURNAMENT21567_RECENT_ATTEMPT_HISTORY '+JSON.stringify({first:{source:first.historySourceCount21567,items:first.historyItems21567,current:first.historyCurrent21567,overflow:first.historyOverflow21567},recent:{source:many.historySourceCount21567,items:many.historyItems21567,current:many.historyCurrent21567,overflow:many.historyOverflow21567},normal:{overflow:normal.historyOverflow21567,docOverflow:normal.docOverflow},connectors:many.connectors,roster:many.roster,bossInBracket:many.bossInBracket,pageErrors:errors}));
}finally{await browser.close()}

function windowResult(v){return v}
