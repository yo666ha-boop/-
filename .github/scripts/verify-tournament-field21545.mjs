import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const core=await fs.readFile('shogi-v21528/tournament21541.js','utf8');
const field=await fs.readFile('shogi-v21528/tournament-field21545.js','utf8');
assert.match(field,/version:'21545a'/);
assert.match(field,/minimumNeeded/);
assert.match(field,/ceiling/);

const names=['みつき','みっちゃん','あき王','おにまま','まま','ケンシロウ','ジャギ','しんじ','直江兼続','あやなみ','バット','伊達政宗','あすか','ユリア','玉ちゃん','まり','ぺんぺん','げんどー','前田慶次','シン','みさとさん','サウザー','リン','ラオウ','カヲル','未来からやってきたみつき'];
const ratings=[3000,2850,2700,2600,2500,2100,1450,1550,1700,1800,1600,1750,1900,1680,1380,1950,1250,2050,1820,2000,1880,2180,1500,2250,2400,3400];
const characters=names.map((name,i)=>({name,rating:ratings[i],fixed:true,style:'test',feature:'test'}));
const snapshot=JSON.stringify(characters);
const img='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="20" height="20"%3E%3Crect width="20" height="20" fill="%23999"/%3E%3C/svg%3E';
const cards=characters.map(c=>`<div class="ch"><img src="${img}" alt="${c.name}"><span class="chName">${c.name}</span></div>`).join('');
const html=`<!doctype html><meta charset="utf-8"><body>
<div class="side"><div class="controls"><button class="btn">new</button></div></div><div id="status"></div><div id="resultBanner"></div><div id="chars">${cards}</div><div id="board"></div>
<script>window.__mock={rating:2600,state:{log:[]},selected:[],characters:${JSON.stringify(characters)}};window.AIShogiIOS={characters:()=>window.__mock.characters,stats:()=>({rating:window.__mock.rating,w:0,l:0,d:0}),state:()=>window.__mock.state,select:i=>{window.__mock.selected.push(i);window.__mock.state={log:[]};return window.__mock.characters[i]}};</script>
<script src="/core.js"></script><script src="/field.js"></script></body>`;
const server=http.createServer((req,res)=>{if(req.url==='/core.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(core);return}if(req.url==='/field.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(field);return}res.writeHead(200,{'content-type':'text/html'});res.end(html)});
await new Promise(r=>server.listen(43145,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:43145/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT&&window.AI_SHOGI_TOURNAMENT_FIELD_RULE?.audit?.().ok===true);

  const rules=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_FIELD_RULE.cups());
  assert.equal(rules.length,8);
  for(const r of rules){
    assert.equal(r.selected.length,14,`${r.cupId}: exactly 14 non-boss entrants`);
    assert.equal(new Set(r.selected).size,14,`${r.cupId}: entrants unique`);
    assert.ok(!r.selected.includes(r.boss),`${r.cupId}: boss stays separate seed`);
    if(r.bossRating>=2100){
      assert.deepEqual(r.overBoss,[],`${r.cupId}: no character above boss rating`);
      assert.ok(r.selectedMax<=r.bossRating,`${r.cupId}: selected max ${r.selectedMax} <= boss ${r.bossRating}`);
    }
  }

  const shinji=rules.find(r=>r.cupId==='shinji'),ayanami=rules.find(r=>r.cupId==='ayanami'),akiou=rules.find(r=>r.cupId==='akiou');
  assert.equal(shinji.ceiling,2000,'low cup expands only enough to make 14 entrants');
  assert.equal(ayanami.ceiling,2000,'ayanami cup expands only enough to make 14 entrants');
  assert.equal(akiou.ceiling,2700);
  assert.ok(!akiou.selected.includes('未来からやってきたみつき'));
  assert.ok(!akiou.selected.includes('みつき'));
  assert.ok(!akiou.selected.includes('みっちゃん'));

  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.start('akiou'));
  let state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());
  const first=state.active.bracket.rounds[0];
  assert.equal(first.length,16);assert.equal(first[0],'__PLAYER__');assert.equal(first[15],'あき王');assert.equal(new Set(first).size,16);
  const firstAI=first.slice(1,15),firstRatings=firstAI.map(n=>ratings[names.indexOf(n)]);
  assert.ok(Math.max(...firstRatings)<=2700,'Akiou field may not contain a stronger character');
  assert.ok(!firstAI.includes('未来からやってきたみつき'));assert.ok(!firstAI.includes('みつき'));assert.ok(!firstAI.includes('みっちゃん'));
  let audit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.audit());
  assert.equal(audit.runningAI,7);assert.equal(audit.resolvedAI,0);assert.equal(audit.bossSeeded,true);
  const afterCount=await page.evaluate(()=>window.AIShogiIOS.characters().length);assert.equal(afterCount,26,'character API returns full roster after cup construction');
  const opponent=first[1],selectedIndex=await page.evaluate(()=>window.__mock.selected.at(-1));assert.equal(selectedIndex,names.indexOf(opponent),'opponent selection keeps canonical 26-character index');

  await page.evaluate(()=>{window.__mock.rating=1500;window.AI_SHOGI_TOURNAMENT.start('shinji')});
  state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());
  const shinjiAI=state.active.bracket.rounds[0].slice(1,15),shinjiRatings=shinjiAI.map(n=>ratings[names.indexOf(n)]);
  assert.equal(shinjiAI.length,14);assert.equal(new Set(shinjiAI).size,14);assert.ok(Math.max(...shinjiRatings)<=2000);assert.ok(Math.max(...shinjiRatings)>1550,'low cup must expand only because 16-player field needs more characters');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__mock.characters)),snapshot,'field rules must not mutate character ratings or roster');

  console.log('PASS_TOURNAMENT21545_FIELD_RULE '+JSON.stringify({cups:8,akiouCeiling:akiou.ceiling,akiouSelectedMax:akiou.selectedMax,akiouFuture:false,akiouMitsuki:false,akiouMicchan:false,shinjiCeiling:shinji.ceiling,ayanamiCeiling:ayanami.ceiling,highCupOverBoss:0,rosterAfter:afterCount}));
  await page.close();
} finally {await browser.close();await new Promise(r=>server.close(r))}
