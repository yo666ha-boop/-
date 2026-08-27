import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { webkit } from 'playwright';

const addon=await fs.readFile('shogi-v21528/rating-progress21536.js','utf8');
const sw=await fs.readFile('shogi-v21528/coi-serviceworker.js','utf8');
const root=await fs.readFile('coi-serviceworker.js','utf8');
new Function(addon);
assert.match(sw,/rating-progress21536\.js\?v=21536b/);
assert.match(sw,/ai-shogi-coi-reload-21536b/);
assert.match(root,/coi-serviceworker\.js\?v=21536b/);

const html='<!doctype html><html><body><div id="statsMain">パパ R1500</div><div id="statsSub">0勝 0敗 0分</div></body></html>';
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;

const browser=await webkit.launch();
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.evaluate(()=>{
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify({version:1,st:{b:Array(81).fill(null),log:[]}}));
    window.__stats={rating:1500,w:0,l:0,d:0,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))};
    window.__profile={key:'みかみ家::slot_papa',slotName:'パパ'};
    window.__saveNowCount=0;
    window.AI_SHOGI_PROFILE_STATS={
      current:()=>window.__stats,
      profile:()=>window.__profile,
      saveNow:()=>{window.__saveNowCount++;return true},
    };
  });
  await page.addScriptTag({content:addon});
  await page.waitForTimeout(250);
  assert.match(await page.textContent('#ratingProgressLine'),/対局結果に応じてレートが増減/);

  await page.evaluate(()=>{window.__stats.rating=1521;window.__stats.w=1;window.dispatchEvent(new Event('ai-shogi-local-save'))});
  await page.waitForTimeout(120);
  let a=await page.evaluate(()=>window.AI_SHOGI_RATING_PROGRESS.audit());
  assert.equal(a.rating,1521);assert.equal(a.total,1);
  assert.equal(a.last.result,'勝ち');assert.equal(a.last.delta,21);assert.equal(a.last.total,1);
  assert.equal(a.line,'前局：勝ち　R1500 → R1521（+21）');
  assert.equal(await page.evaluate(()=>window.__saveNowCount),1);

  await page.evaluate(()=>{window.__stats.rating=1508;window.__stats.l=1;window.dispatchEvent(new Event('ai-shogi-local-save'))});
  await page.waitForTimeout(120);
  a=await page.evaluate(()=>window.AI_SHOGI_RATING_PROGRESS.audit());
  assert.equal(a.last.result,'負け');assert.equal(a.last.delta,-13);assert.equal(a.last.total,2);
  assert.equal(a.line,'前局：負け　R1521 → R1508（-13）');
  assert.equal(await page.evaluate(()=>window.__saveNowCount),2);

  await page.evaluate(()=>{window.__stats.rating=1508;window.__stats.d=1;window.dispatchEvent(new Event('ai-shogi-local-save'))});
  await page.waitForTimeout(120);
  a=await page.evaluate(()=>window.AI_SHOGI_RATING_PROGRESS.audit());
  assert.equal(a.rating,1508);assert.equal(a.total,3);
  assert.equal(a.last.result,'引き分け');assert.equal(a.last.delta,0);assert.equal(a.last.total,3);
  assert.equal(a.line,'前局：引き分け　R1508 → R1508（0）');
  assert.equal(await page.evaluate(()=>window.__saveNowCount),3);

  const remoteSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')));
  assert.equal(remoteSave.ratingProgress.profileKey,'みかみ家::slot_papa');
  assert.equal(remoteSave.ratingProgress.last.result,'引き分け');
  assert.equal(remoteSave.ratingProgress.last.total,3);

  await page.evaluate(()=>{window.__profile={key:'みかみ家::slot_micchan',slotName:'みっちゃん'};window.__stats={rating:1500,w:0,l:0,d:0,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))}});
  await page.waitForTimeout(850);
  a=await page.evaluate(()=>window.AI_SHOGI_RATING_PROGRESS.audit());
  assert.equal(a.slotName,'みっちゃん');assert.equal(a.last,null);assert.match(a.line,/対局結果に応じてレートが増減/);

  await page.evaluate(()=>{window.__profile={key:'みかみ家::slot_papa',slotName:'パパ'};window.__stats={rating:1508,w:1,l:1,d:1,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))}});
  await page.waitForTimeout(850);
  a=await page.evaluate(()=>window.AI_SHOGI_RATING_PROGRESS.audit());
  assert.equal(a.slotName,'パパ');assert.equal(a.last.result,'引き分け');assert.equal(a.last.delta,0);assert.equal(a.line,'前局：引き分け　R1508 → R1508（0）');

  const layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,aria:document.getElementById('ratingProgressLine')?.getAttribute('aria-live')}));
  assert.ok(layout.scrollWidth<=layout.innerWidth,JSON.stringify(layout));assert.equal(layout.aria,'polite');

  const page2=await browser.newPage({viewport:{width:390,height:844}});
  await page2.goto(`http://127.0.0.1:${port}/`);
  await page2.evaluate(save=>{
    localStorage.clear();localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(save));
    window.__stats={rating:1508,w:1,l:1,d:1,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))};
    window.__profile={key:'みかみ家::slot_papa',slotName:'パパ'};
    window.__saveNowCount=0;
    window.AI_SHOGI_PROFILE_STATS={current:()=>window.__stats,profile:()=>window.__profile,saveNow:()=>{window.__saveNowCount++;return true}};
  },remoteSave);
  await page2.addScriptTag({content:addon});
  await page2.waitForTimeout(300);
  const restored=await page2.evaluate(()=>window.AI_SHOGI_RATING_PROGRESS.audit());
  assert.equal(restored.last.result,'引き分け');assert.equal(restored.last.delta,0);assert.equal(restored.last.total,3);
  assert.equal(restored.line,'前局：引き分け　R1508 → R1508（0）');
  assert.equal(restored.cloudLast.result,'引き分け');
  assert.equal(await page2.evaluate(()=>window.__saveNowCount),0);
  assert.ok((await page2.evaluate(()=>document.documentElement.scrollWidth))<=390);

  console.log('PASS rating delta UX win/loss/draw/profile separation + cross-device last-result restore/WebKit');
} finally {
  await browser.close();server.close();
}
