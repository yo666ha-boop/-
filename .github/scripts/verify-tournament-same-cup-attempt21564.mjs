import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const paths={
  core:'shogi-v21528/tournament21541.js',
  field:'shogi-v21528/tournament-field21545.js',
  boss:'shogi-v21528/tournament-boss21546.js',
  ui:'shogi-v21528/tournament-ui21542.js',
  bracket:'shogi-v21528/tournament-ui21543.js',
  skin:'shogi-v21528/tournament-skin21544.js',
  game:'shogi-v21528/tournament-game-ui21559.js'
};
const files=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[k,await fs.readFile(p,'utf8')])));
const chars=[['みつき',3000],['みっちゃん',2850],['あき王',2700],['おにまま',2600],['まま',2500],['ケンシロウ',2100],['ジャギ',1450],['しんじ',1550],['直江兼続',1700],['あやなみ',1800],['バット',1600],['伊達政宗',1750],['あすか',1900],['ユリア',1680],['玉ちゃん',1380],['まり',1950],['ぺんぺん',1250],['げんどー',2050],['前田慶次',1820],['シン',2000],['みさとさん',1880],['サウザー',2180],['リン',1500],['ラオウ',2250],['カヲル',2400],['未来からやってきたみつき',3400]].map(([name,rating],i)=>({name,rating,i}));
const cards=chars.map(c=>`<button class="ch"><span class="chName">${c.name}</span></button>`).join('');
const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}.side{width:100%;min-width:0}</style><div class="side"><div class="controls"></div></div><div id="status"></div><div id="resultBanner"></div><div id="chars">${cards}</div><div id="board"></div><script>window.__mock={characters:${JSON.stringify(chars)},state:{log:[]},rating:1500};window.AIShogiIOS={characters:()=>__mock.characters,stats:()=>({rating:__mock.rating,w:0,l:0,d:0}),state:()=>__mock.state,select:()=>true};</script><script src="/core.js"></script><script src="/field.js"></script><script src="/boss.js"></script><script src="/ui.js"></script><script src="/skin.js"></script><script src="/game.js"></script>`;
const server=http.createServer((req,res)=>{const map={'/core.js':files.core,'/field.js':files.field,'/boss.js':files.boss,'/ui.js':files.ui,'/skin.js':files.skin,'/game.js':files.game,'/tournament-ui21543.js':files.bracket};const key=req.url?.split('?')[0];res.writeHead(200,{'content-type':map[key]?'text/javascript':'text/html'});res.end(map[key]||html)});
await new Promise(r=>server.listen(43164,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:43164/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.cups?.().length===8&&window.AI_SHOGI_TOURNAMENT_GAME_UI?.version==='21559a',{timeout:15000});
  await page.evaluate(()=>{window.AI_SHOGI_TOURNAMENT.start('shinji');document.getElementById('tournament21540Panel')?.classList.add('on');window.AI_SHOGI_TOURNAMENT.render();window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.().attemptCount===1,{timeout:10000});
  const first=await page.evaluate(()=>({audit:window.AI_SHOGI_TOURNAMENT_GAME_UI.audit(),history:window.AI_SHOGI_TOURNAMENT.state().history.filter(x=>x?.cupId==='shinji').length}));
  assert.equal(first.audit.attemptCount,1);assert.equal(first.history,1);assert.equal(first.audit.connectors,30);assert.equal(first.audit.docOverflow,0);

  await page.evaluate(()=>{window.AI_SHOGI_TOURNAMENT.start('shinji');document.getElementById('tournament21540Panel')?.classList.add('on');window.AI_SHOGI_TOURNAMENT.render();window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.().attemptCount===2,{timeout:10000});
  const second=await page.evaluate(()=>({audit:window.AI_SHOGI_TOURNAMENT_GAME_UI.audit(),history:window.AI_SHOGI_TOURNAMENT.state().history.filter(x=>x?.cupId==='shinji').length}));
  assert.equal(second.audit.attemptCount,2);assert.equal(second.history,2);assert.equal(second.audit.matchupCard,true);assert.equal(second.audit.bossInBracket,false);assert.equal(second.audit.connectors,30);assert.equal(second.audit.roster,26);assert.equal(second.audit.docOverflow,0);

  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>{const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();return window.AI_SHOGI_TOURNAMENT?.state?.()?.active?.cupId==='shinji'&&a?.attemptCount===2&&a?.resumeChip===true&&a?.matchupCard===true&&a?.docOverflow===0},{timeout:15000});
  const reloadState=await page.evaluate(()=>({audit:window.AI_SHOGI_TOURNAMENT_GAME_UI.audit(),history:window.AI_SHOGI_TOURNAMENT.state().history.filter(x=>x?.cupId==='shinji').length,activeCup:window.AI_SHOGI_TOURNAMENT.state().active?.cupId}));
  assert.equal(reloadState.activeCup,'shinji');assert.equal(reloadState.audit.attemptCount,2);assert.equal(reloadState.history,2);assert.equal(reloadState.audit.resumeChip,true);assert.equal(reloadState.audit.matchupCard,true);assert.equal(reloadState.audit.bossInBracket,false);assert.equal(reloadState.audit.docOverflow,0);

  await page.evaluate(()=>{document.getElementById('tournament21540Panel')?.classList.add('on');window.AI_SHOGI_TOURNAMENT.render();window.AI_SHOGI_TOURNAMENT_GAME_UI.render()});
  await page.waitForFunction(()=>{const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();return a?.attemptCount===2&&a?.resumeChip===true&&a?.matchupCard===true&&a?.connectors===30&&a?.roster===26&&a?.docOverflow===0},{timeout:10000});
  const reloaded=await page.evaluate(()=>({audit:window.AI_SHOGI_TOURNAMENT_GAME_UI.audit(),history:window.AI_SHOGI_TOURNAMENT.state().history.filter(x=>x?.cupId==='shinji').length,activeCup:window.AI_SHOGI_TOURNAMENT.state().active?.cupId}));
  assert.equal(reloaded.activeCup,'shinji');assert.equal(reloaded.audit.attemptCount,2);assert.equal(reloaded.history,2);assert.equal(reloaded.audit.resumeChip,true);assert.equal(reloaded.audit.matchupCard,true);assert.equal(reloaded.audit.bossInBracket,false);assert.equal(reloaded.audit.connectors,30);assert.equal(reloaded.audit.roster,26);assert.equal(reloaded.audit.docOverflow,0);assert.deepEqual(errors,[]);

  console.log('PASS_TOURNAMENT21564_SAME_CUP_ATTEMPT_INCREMENT '+JSON.stringify({first:{attemptCount:first.audit.attemptCount,history:first.history},second:{attemptCount:second.audit.attemptCount,history:second.history,connectors:second.audit.connectors,roster:second.audit.roster,overflow:second.audit.docOverflow},pageErrors:errors}));
  console.log('PASS_TOURNAMENT21565_SECOND_ATTEMPT_RELOAD_PERSIST '+JSON.stringify({reloadState:{cupId:reloadState.activeCup,attemptCount:reloadState.audit.attemptCount,history:reloadState.history,resumeChip:reloadState.audit.resumeChip,matchupCard:reloadState.audit.matchupCard,overflow:reloadState.audit.docOverflow},rendered:{connectors:reloaded.audit.connectors,roster:reloaded.audit.roster,overflow:reloaded.audit.docOverflow},pageErrors:errors}));
}finally{await browser.close();await new Promise(r=>server.close(r))}
