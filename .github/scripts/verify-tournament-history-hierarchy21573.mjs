import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const historyPath='shogi-v21528/tournament-history21567.js';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:280,height:700}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;max-width:100%;overflow-x:hidden}.side,.tourActive{width:100%;min-width:0}.tourGameHero21559{height:30px}.tourRoad21562{height:12px}</style><div class="side"><div id="tournament21540Panel" class="tourFireFit"><div class="tourActive"><div class="tourGameHero21559"></div><div class="tourRoad21562"></div></div></div></div><script>window.__tourState={active:{cupId:'shinji',startedAt:6000},history:[{cupId:'shinji',startedAt:6000,rating:1720},{cupId:'ayanami',startedAt:5000,rating:1700},{cupId:'shinji',startedAt:4000,rating:1650},{cupId:'shinji',startedAt:3000,rating:1600},{cupId:'mitsuki',startedAt:2000,rating:1550}]};window.__cups=[{id:'shinji',name:'しんじ杯'},{id:'ayanami',name:'あやなみ杯'},{id:'mitsuki',name:'未来からやってきたみつき杯'}];window.AI_SHOGI_TOURNAMENT={state:()=>window.__tourState,cups:()=>window.__cups};window.AI_SHOGI_TOURNAMENT_GAME_UI={render:()=>true,audit:()=>({connectors:30,roster:26,bossInBracket:false,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)})};</script>`);
  await page.addScriptTag({path:historyPath});
  const result=await page.waitForFunction(()=>{const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();if(!a?.historyHierarchyUi21573||a.historyCount21567!==3)return false;const px=s=>parseFloat(getComputedStyle(document.querySelector(s)).fontSize)||0,panel=document.getElementById('tournament21540Panel'),box=document.querySelector('.tourAttemptHistory21567');return{...a,head:px('.tourAttemptHistoryHead21567'),count:px('.tourAttemptHistoryCount21567'),cup:px('.tourAttemptHistoryCup21567'),ordinal:px('.tourAttemptHistoryOrdinal21568'),meta:px('.tourAttemptHistoryMeta21567'),panelOverflow:Math.max(0,panel.scrollWidth-panel.clientWidth),boxOverflow:Math.max(0,box.scrollWidth-box.clientWidth)}}).then(h=>h.jsonValue());
  assert.ok(result.head>=8);assert.ok(result.count>=8);assert.ok(result.cup>=8);assert.ok(result.meta>=8);assert.ok(result.ordinal>=7);
  assert.equal(result.historyCount21567,3);assert.deepEqual(result.historyAttemptOrdinals21568,[3,1,2]);assert.equal(result.historyCurrent21567,1);
  assert.equal(result.panelOverflow,0);assert.equal(result.boxOverflow,0);assert.equal(result.docOverflow,0);
  assert.equal(result.connectors,30);assert.equal(result.roster,26);assert.equal(result.bossInBracket,false);assert.equal(errors.length,0);
  console.log('PASS_TOURNAMENT21573_NARROW_HISTORY_HIERARCHY '+JSON.stringify({viewport:280,fonts:{head:result.head,count:result.count,cup:result.cup,ordinal:result.ordinal,meta:result.meta},historyCount:result.historyCount21567,ordinals:result.historyAttemptOrdinals21568,panelOverflow:result.panelOverflow,boxOverflow:result.boxOverflow,docOverflow:result.docOverflow,connectors:result.connectors,roster:result.roster,bossInBracket:result.bossInBracket,pageErrors:errors}));
}finally{await browser.close()}
