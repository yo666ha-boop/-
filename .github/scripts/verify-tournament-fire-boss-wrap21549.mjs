import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const bankSource=await fs.readFile('shogi-v21528/tournament-dialogue-bank21547.js','utf8');
const ratingSource=await fs.readFile('shogi-v21528/rating-progress21536.js','utf8');
const dockAt=ratingSource.indexOf('/* v2.15.47e: keep boss-start dialogue visible');
assert.ok(dockAt>=0,'missing battle dock runtime');
const dockSource=ratingSource.slice(dockAt);
assert.match(dockSource,/body:has\(#tournament21540Panel\.tourFireFit\)/);

const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}.side{width:360px}.side>#tourDialogue21547{display:grid}</style><body><div id="tournament21540Panel" class="tourFireFit"></div><div class="side"><div id="status"></div><div id="tourDialogue21547" class="tourDialogueBattleDock21547" data-battle-dock="1" data-role="杯ボス"><div class="tourDialoguePortrait"><img alt="boss" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%2388a'/%3E%3C/svg%3E"></div><div class="tourDialogueBody"><div class="tourDialogueTop"><span class="tourDialogueStatus"></span><span class="tourDialogueRole">杯ボス</span></div><div class="tourDialogueName"></div><div class="tourDialogueBubble"></div></div></div></div><script src="/bank.js"></script><script src="/dock.js"></script></body>`;
const server=http.createServer((req,res)=>{if(req.url==='/bank.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(bankSource);return}if(req.url==='/dock.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(dockSource);return}res.writeHead(200,{'content-type':'text/html'});res.end(html)});
await new Promise(r=>server.listen(43149,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:800},userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 Silk/126.5 like Chrome Safari/537.36'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:43149/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK&&document.getElementById('tournamentDialogueBattleDock21547Style'));
  const result=await page.evaluate(()=>{
    const bank=window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK;
    const contexts=['boss_advantage','boss_disadvantage','boss_mid','boss_end'];
    const box=document.getElementById('tourDialogue21547');
    const speaker=box.querySelector('.tourDialogueName');
    const status=box.querySelector('.tourDialogueStatus');
    const bubble=box.querySelector('.tourDialogueBubble');
    const img=box.querySelector('img');
    const side=document.querySelector('.side');
    const fill=(s,vars)=>String(s).replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??''));
    let samples=0,maxHeight=0,maxBubbleHeight=0,maxTextLength=0,worst=null,maxDocOverflow=0,maxSideOverflow=0;
    for(const [bossId,voice] of Object.entries(bank.voices)){
      for(const ctx of contexts){
        const event=bank.events[ctx];
        const leads=voice[event.mood]||voice.watch||[];
        for(const lead of leads)for(const line of event.lines||[]){
          const vars={boss:voice.name,cup:voice.name+'杯',winner:'勝者',loser:'敗者',winnerRating:2000,loserRating:2100};
          const text=lead+' '+fill(line,vars);
          speaker.textContent=voice.name;status.textContent=event.label;bubble.textContent=text;
          const r=box.getBoundingClientRect(),br=bubble.getBoundingClientRect();
          const docOverflow=Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth);
          const sideOverflow=Math.max(0,side.scrollWidth-side.clientWidth);
          samples++;maxDocOverflow=Math.max(maxDocOverflow,docOverflow);maxSideOverflow=Math.max(maxSideOverflow,sideOverflow);
          const candidate={bossId,boss:voice.name,context:ctx,status:event.label,text,textLength:text.length,height:Math.round(r.height),bubbleHeight:Math.round(br.height),width:Math.round(r.width),docOverflow,sideOverflow};
          if(r.height>maxHeight||(r.height===maxHeight&&text.length>maxTextLength)){maxHeight=r.height;maxTextLength=text.length;worst=candidate}
          maxBubbleHeight=Math.max(maxBubbleHeight,br.height);
        }
      }
    }
    const ir=img.getBoundingClientRect();
    return{samples,maxHeight:Math.round(maxHeight),maxBubbleHeight:Math.round(maxBubbleHeight),maxTextLength,worst,maxDocOverflow,maxSideOverflow,portrait:[Math.round(ir.width),Math.round(ir.height)],viewportHeight:innerHeight,fireClass:document.getElementById('tournament21540Panel').classList.contains('tourFireFit')};
  });
  assert.equal(result.samples,800);
  assert.equal(result.fireClass,true);
  assert.equal(result.maxDocOverflow,0);
  assert.equal(result.maxSideOverflow,0);
  assert.ok(result.maxHeight<=120,'worst Fire boss dialogue exceeds 120px '+JSON.stringify(result));
  assert.ok(result.maxHeight<=result.viewportHeight*.15,'worst Fire boss dialogue exceeds 15% viewport '+JSON.stringify(result));
  assert.ok(result.portrait[0]<=52&&result.portrait[1]<=52,'Fire portrait lost compact sizing '+JSON.stringify(result));
  console.log('PASS_TOURNAMENT21549_FIRE_BOSS_WRAP '+JSON.stringify(result));
  await context.close();
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
