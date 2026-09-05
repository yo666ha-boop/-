import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const bank=await fs.readFile('shogi-v21528/tournament-dialogue-bank21547.js','utf8');
const dialogue=await fs.readFile('shogi-v21528/tournament-dialogue21547.js','utf8');
const characters=[['みつき',3000],['みっちゃん',2850],['あき王',2700],['おにまま',2600],['まま',2500],['ケンシロウ',2100],['ジャギ',1450],['しんじ',1550],['直江兼続',1700],['あやなみ',1800],['バット',1600],['伊達政宗',1750],['あすか',1900],['ユリア',1680],['玉ちゃん',1380],['まり',1950],['ぺんぺん',1250],['げんどー',2050],['前田慶次',1820],['シン',2000],['みさとさん',1880],['サウザー',2180],['リン',1500],['ラオウ',2250],['カヲル',2400],['未来からやってきたみつき',3400]].map(([name,rating],i)=>({name,rating,i}));
const cups={shinji:'しんじ',ayanami:'あやなみ',kenshiro:'ケンシロウ',kaworu:'カヲル',akiou:'あき王',micchan:'みっちゃん',mitsuki:'みつき',future:'未来からやってきたみつき'};
const imageFor=i=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="hsl(${i*37},70%,45%)"/><text x="40" y="45" text-anchor="middle" font-size="16">${i}</text></svg>`);
const cards=characters.map(c=>`<div class="ch"><img src="${imageFor(c.i)}" alt="${c.name}"><span class="chName">${c.name}</span></div>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"></head><body><div id="chars">${cards}</div><div id="evalNumber">—</div><div id="tournament21540Panel" class="on"><div class="tourActive"><div class="tourActiveTitle">大会</div><div class="tourCurrentMatch">優勝後</div></div></div><script>window.__state={log:[],b:Array(81).fill(null),h:{'1':{},'-1':{}}};window.__chars=${JSON.stringify(characters)};window.AIShogiIOS={characters:()=>window.__chars,state:()=>window.__state};</script><script src="/bank.js"></script><script src="/dialogue.js"></script></body></html>`;
const server=http.createServer((req,res)=>{if(req.url==='/bank.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(bank);return}if(req.url==='/dialogue.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(dialogue);return}res.writeHead(200,{'content-type':'text/html'});res.end(html)});
await new Promise(r=>server.listen(43148,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:43148/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK?.audit?.().ok&&window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit);
  const voiceSamples=await page.evaluate(()=>Object.entries(window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK.voices).map(([id,v])=>{const p=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK.pick(id,'boss_pending',{cup:'検証杯',boss:v.name},[],0);return{id,speaker:p?.speaker,text:p?.text,total:p?.total}}));
  assert.equal(voiceSamples.length,8);assert.equal(new Set(voiceSamples.map(x=>x.text)).size,8,'all eight bosses must have distinct voice samples');assert.ok(voiceSamples.every(x=>x.speaker&&x.text&&x.total>=25));
  const portraits=[];
  for(const [cupId,boss] of Object.entries(cups)){
    const result=await page.evaluate(({cupId,boss})=>{
      const active={cupId,round:0,playerSlot:0,status:'boss_pending',pending:null,bracket:{rounds:[['__PLAYER__','まま']],results:{}},bossChallenge:{status:'pending',tournamentWonAt:Date.now()-5000}};
      localStorage.setItem('aiShogiTournament21540',JSON.stringify({version:3,active,trophies:{},history:[]}));
      window.AI_SHOGI_TOURNAMENT_DIALOGUE.render();
      const audit=window.AI_SHOGI_TOURNAMENT_DIALOGUE.audit();
      const sourceCard=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||'').trim()===boss);
      const source=sourceCard?.querySelector('img')?.src||'';
      const rendered=document.querySelector('#tourDialogue21547 .tourDialoguePortrait img')?.src||'';
      const alt=document.querySelector('#tourDialogue21547 .tourDialoguePortrait img')?.alt||'';
      return{cupId,boss,audit,source,rendered,alt};
    },{cupId,boss});
    assert.equal(result.audit.context,'boss_pending',cupId);assert.equal(result.audit.label,'杯ボス挑戦前',cupId);assert.equal(result.audit.role,'杯ボス',cupId);assert.equal(result.audit.speaker,boss,cupId);assert.equal(result.audit.portrait,true,cupId);assert.equal(result.alt,boss,cupId);assert.ok(result.source&&result.rendered,cupId);assert.equal(result.rendered,result.source,`${cupId} must reuse the existing roster portrait`);portraits.push(result);
  }
  assert.equal(portraits.length,8);assert.equal(new Set(portraits.map(x=>x.rendered)).size,8,'each boss must resolve to its own roster portrait');
  console.log('PASS_TOURNAMENT21547D_ALL_BOSS_PORTRAITS '+JSON.stringify({bosses:8,portraitMatches:portraits.length,uniquePortraits:new Set(portraits.map(x=>x.rendered)).size,uniqueVoiceSamples:new Set(voiceSamples.map(x=>x.text)).size,minVariants:Math.min(...voiceSamples.map(x=>x.total))}));
} finally {await browser.close();await new Promise(r=>server.close(r))}
