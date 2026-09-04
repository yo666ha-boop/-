import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const core=await fs.readFile('shogi-v21528/tournament21541.js','utf8');
const ui=await fs.readFile('shogi-v21528/tournament-ui21542.js','utf8');
for(const marker of ['sourceFor(name)','tourFireFit','rosterPortraits','Silk'])assert.ok(ui.includes(marker),'missing UI marker '+marker);

const names=['みつき','みっちゃん','あき王','おにまま','まま','ケンシロウ','ジャギ','しんじ','直江兼続','あやなみ','バット','伊達政宗','あすか','ユリア','玉ちゃん','まり','ぺんぺん','げんどー','前田慶次','シン','みさとさん','サウザー','リン','ラオウ','カヲル','未来からやってきたみつき'];
const ratings=[3000,2850,2700,2600,2500,2100,1450,1550,1700,1800,1600,1750,1900,1680,1380,1950,1250,2050,1820,2000,1880,2180,1500,2250,2400,3400];
const legacy={8:'本多 忠勝',10:'島津 義久',11:'伊達 政宗',13:'服部 半蔵',14:'鬼庭 綾子',18:'黒田 長政',22:'出雲 阿国'};
const characters=names.map((name,i)=>({name,rating:ratings[i],fixed:true,style:'test',feature:'test'}));
const svg=i=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="hsl(${i*13},60%,50%)"/><text x="20" y="25" text-anchor="middle" font-size="12">${i}</text></svg>`)}`;
const cards=names.map((n,i)=>`<button class="ch"><img src="${svg(i)}" alt="${legacy[i]||n}"><span class="chName">${legacy[i]||n}</span></button>`).join('');
const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}.side{width:360px}.btn{padding:6px}</style><body>
<div class="side"><div class="controls"><button class="btn">new</button></div></div><div id="status"></div><div id="resultBanner"></div><div id="chars">${cards}</div><div id="board"></div>
<script>window.__mock={rating:1500,state:{log:[]},selected:[],characters:${JSON.stringify(characters)}};window.AIShogiIOS={characters:()=>window.__mock.characters,stats:()=>({rating:window.__mock.rating,w:0,l:0,d:0}),state:()=>window.__mock.state,select:i=>{window.__mock.selected.push(i);return window.__mock.characters[i]}};</script>
<script src="/core.js"></script><script src="/ui.js"></script></body>`;
const server=http.createServer((req,res)=>{if(req.url==='/core.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(core);return}if(req.url==='/ui.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(ui);return}res.writeHead(200,{'content-type':'text/html'});res.end(html)});
await new Promise(r=>server.listen(43142,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:800},userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 Silk/126.5 like Chrome Safari/537.36'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:43142/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT&&window.AI_SHOGI_TOURNAMENT_UI);
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.start('mitsuki'));
  await page.evaluate(()=>{document.getElementById('tournament21540Panel').classList.add('on');window.AI_SHOGI_TOURNAMENT.render();window.AI_SHOGI_TOURNAMENT_UI.repair()});
  await page.waitForTimeout(150);
  const audit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_UI.audit());
  assert.equal(audit.fire,true);
  assert.equal(audit.fit,true);
  assert.equal(audit.activeFit,true);
  assert.equal(audit.roster,26);
  assert.equal(audit.rosterPortraits,26,'all 26 character image sources must resolve even when visible card names are legacy names');
  assert.deepEqual(audit.missingRoster,[]);
  assert.equal(audit.fallback,0,'no visible tournament entrant may fall back to a text avatar');
  assert.ok(audit.scrollWidth<=audit.clientWidth+3,`Fire bracket overflows horizontally: ${audit.scrollWidth}/${audit.clientWidth}`);
  const visibleRounds=await page.evaluate(()=>[...document.querySelectorAll('.tourBracketRound')].filter(x=>{const r=x.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}).length);
  assert.equal(visibleRounds,5);
  const firstRoundPortraits=await page.locator('.tourBracketRound[data-round="0"] .tourAvatar img').count();
  assert.equal(firstRoundPortraits,15,'all 15 AI entrants in the first round must show a portrait');
  console.log('PASS_TOURNAMENT21542_FIRE_UI '+JSON.stringify({rosterPortraits:audit.rosterPortraits,firstRoundPortraits,fallback:audit.fallback,fit:audit.fit,scroll:[audit.scrollWidth,audit.clientWidth],visibleRounds}));
  await context.close();
} finally {await browser.close();await new Promise(r=>server.close(r))}
