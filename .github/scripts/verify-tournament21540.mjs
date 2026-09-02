import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const SRC='shogi-v21528/tournament21540.js';
const source=await fs.readFile(SRC,'utf8');
for(const marker of ['しんじ杯','あき王杯','みっちゃん杯','みつき杯','未来みつき杯','aiShogiTournament21540','result-win','result-loss','result-draw'])assert.ok(source.includes(marker),'missing marker '+marker);

const characters=[
 ['みつき',3000],['みっちゃん',2850],['あき王',2700],['おにまま',2600],['まま',2500],['ケンシロウ',2100],['ジャギ',1450],['しんじ',1550],['直江兼続',1700],['あやなみ',1800],['バット',1600],['伊達政宗',1750],['あすか',1900],['ユリア',1680],['玉ちゃん',1380],['まり',1950],['ぺんぺん',1250],['げんどー',2050],['前田慶次',1820],['シン',2000],['みさとさん',1880],['サウザー',2180],['リン',1500],['ラオウ',2250],['カヲル',2400],['未来からやってきたみつき',3400]
].map(([name,rating])=>({name,rating,fixed:true,style:'test',feature:'test'}));

const html=`<!doctype html><meta charset="utf-8"><body>
<div class="side"><div class="controls"><button class="btn" id="newBtn">新規対局</button></div></div>
<div id="status"></div><div id="resultBanner" class="resultBanner"></div><div id="chars"></div><div id="board"></div>
<script>
window.__mock={rating:1500,state:{log:[]},selected:[],characters:${JSON.stringify(characters)}};
window.AIShogiIOS={
 characters:()=>window.__mock.characters,
 stats:()=>({rating:window.__mock.rating,w:0,l:0,d:0,chars:[]}),
 state:()=>window.__mock.state,
 select:i=>{window.__mock.selected.push(i);window.__mock.state={log:[]};document.getElementById('resultBanner').className='resultBanner';document.getElementById('resultBanner').textContent='';return window.__mock.characters[i]},
 char:()=>window.__mock.characters[window.__mock.selected.at(-1)||0]
};
</script><script src="/tournament.js"></script></body>`;

const server=http.createServer((req,res)=>{
  if(req.url==='/tournament.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(source);return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);
});
await new Promise(r=>server.listen(43140,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:43140/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.audit?.().charactersReady===true);
  let audit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.audit());
  assert.equal(audit.cups,8);
  assert.equal(audit.recommended,'shinji');
  assert.equal(audit.button,true);
  assert.equal(audit.panel,true);

  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.start('shinji'));
  let state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());
  assert.equal(state.active.cupId,'shinji');
  assert.equal(state.active.round,0);
  let selectedName=await page.evaluate(()=>window.__mock.characters[window.__mock.selected.at(-1)].name);
  assert.equal(selectedName,'ぺんぺん');

  const win=async()=>{
    await page.evaluate(()=>{const r=document.getElementById('resultBanner');r.className='resultBanner on result-win';r.textContent='勝ち';});
    await page.waitForTimeout(80);
  };
  await win();
  state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());
  assert.equal(state.active.round,1);
  assert.equal(state.active.pending,'next');
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.next());
  selectedName=await page.evaluate(()=>window.__mock.characters[window.__mock.selected.at(-1)].name);
  assert.equal(selectedName,'玉ちゃん');

  await win();
  state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());
  assert.equal(state.active.round,2);
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.next());
  selectedName=await page.evaluate(()=>window.__mock.characters[window.__mock.selected.at(-1)].name);
  assert.equal(selectedName,'しんじ');

  await win();
  state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());
  assert.equal(state.active.status,'champion');
  assert.equal(state.trophies.shinji,1);

  await page.evaluate(()=>{window.__mock.rating=2600;window.dispatchEvent(new Event('ai-shogi-profile-stats'));});
  await page.waitForTimeout(80);
  audit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.audit());
  assert.equal(audit.recommended,'akiou');
  console.log('PASS_TOURNAMENT21540 '+JSON.stringify({cups:audit.cups,recommendedAt1500:'shinji',recommendedAt2600:audit.recommended,champion:state.active.cupId,trophy:state.trophies.shinji}));
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
