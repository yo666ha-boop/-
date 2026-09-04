import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const core=await fs.readFile('shogi-v21528/tournament21541.js','utf8');
const ui=await fs.readFile('shogi-v21528/tournament-ui21542.js','utf8');
const bracketUI=await fs.readFile('shogi-v21528/tournament-ui21543.js','utf8');
assert.ok(bracketUI.includes('pairingErrors'));
assert.ok(bracketUI.includes('tourBracketLines'));

const names=['みつき','みっちゃん','あき王','おにまま','まま','ケンシロウ','ジャギ','しんじ','直江兼続','あやなみ','バット','伊達政宗','あすか','ユリア','玉ちゃん','まり','ぺんぺん','げんどー','前田慶次','シン','みさとさん','サウザー','リン','ラオウ','カヲル','未来からやってきたみつき'];
const ratings=[3000,2850,2700,2600,2500,2100,1450,1550,1700,1800,1600,1750,1900,1680,1380,1950,1250,2050,1820,2000,1880,2180,1500,2250,2400,3400];
const characters=names.map((name,i)=>({name,rating:ratings[i],fixed:true}));
const svg=i=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="white"/><text x="20" y="25" text-anchor="middle">${i}</text></svg>`)}`;
const cards=names.map((n,i)=>`<button class="ch"><img src="${svg(i)}" alt="${n}"><span class="chName">${n}</span></button>`).join('');
const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}.side{width:380px}.btn{padding:6px}</style><body>
<div class="side"><div class="controls"><button class="btn">new</button></div></div><div id="status"></div><div id="resultBanner"></div><div id="chars">${cards}</div>
<script>window.__mock={rating:1500,state:{log:[]},selected:[],characters:${JSON.stringify(characters)}};window.AIShogiIOS={characters:()=>window.__mock.characters,stats:()=>({rating:window.__mock.rating,w:0,l:0,d:0}),state:()=>window.__mock.state,select:i=>{window.__mock.selected.push(i);return window.__mock.characters[i]}};</script>
<script src="/core.js"></script><script src="/ui.js"></script></body>`;
const server=http.createServer((req,res)=>{if(req.url==='/core.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(core);return}if(req.url==='/ui.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(ui);return}if(req.url?.startsWith('/tournament-ui21543.js')){res.writeHead(200,{'content-type':'application/javascript'});res.end(bracketUI);return}res.writeHead(200,{'content-type':'text/html'});res.end(html)});
await new Promise(r=>server.listen(43143,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:43143/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT&&window.AI_SHOGI_TOURNAMENT_UI&&window.AI_SHOGI_TOURNAMENT_BRACKET_UI);
  await page.evaluate(()=>{window.AI_SHOGI_TOURNAMENT.start('mitsuki');document.getElementById('tournament21540Panel').classList.add('on');window.AI_SHOGI_TOURNAMENT.render()});

  async function resultWin(){
    await page.evaluate(()=>{const b=document.getElementById('resultBanner');b.className='';void b.offsetWidth;b.className='on result-win'});
    await page.waitForTimeout(120);
  }
  async function assertRound(round,wins,losses){
    const q=`.tourBracketRound[data-round="${round}"]`;
    const got=await page.evaluate(q=>{const root=document.querySelector(q);return{win:[...root.querySelectorAll('.tourMatchState')].filter(x=>x.textContent==='勝利').length,loss:[...root.querySelectorAll('.tourMatchState')].filter(x=>x.textContent==='敗退').length}},q);
    assert.deepEqual(got,{win:wins,loss:losses},`round ${round} states`);
    const audit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_BRACKET_UI.audit());
    assert.equal(audit.pairingErrors,0,'every advanced name must come from its source pair');
    assert.equal(audit.invalidWins,0,'no stale blanket win labels');
    assert.ok(audit.connectors>=30,'all bracket source-to-next paths are drawn');
  }
  async function verifyMapping(round){
    const ok=await page.evaluate(round=>{
      const rs=[...document.querySelectorAll('.tourBracketRound')];const src=[...rs[round].querySelectorAll('.tourBracketSlot')],dst=[...rs[round+1].querySelectorAll('.tourBracketSlot')];
      const name=x=>(x.querySelector('.tourSlotName')?.textContent||'').replace(/[👑🏆]/gu,'').trim();
      return dst.every((d,i)=>{const n=name(d);if(!n||n==='—')return true;return [name(src[i*2]),name(src[i*2+1])].includes(n)});
    },round);
    assert.equal(ok,true,`round ${round} pairwise mapping`);
  }

  await resultWin();await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT.state().active?.pending==='next');await assertRound(0,8,8);await verifyMapping(0);
  for(let r=1;r<=3;r++){
    await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.next());await page.waitForTimeout(60);await resultWin();
    if(r<3)await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT.state().active?.pending==='next');
    await assertRound(r,2**(3-r),2**(3-r));await verifyMapping(r);
  }
  const state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state().active);
  assert.equal(state.status,'champion');assert.equal(state.bracket.rounds[4][0],'__PLAYER__');
  const audit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_BRACKET_UI.audit());
  console.log('PASS_TOURNAMENT21543_BRACKET_UI '+JSON.stringify({connectors:audit.connectors,pairingErrors:audit.pairingErrors,invalidWins:audit.invalidWins,champion:state.bracket.rounds[4][0]}));
  await page.close();
} finally {await browser.close();await new Promise(r=>server.close(r))}
