import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { webkit } from 'playwright';

const addon=await fs.readFile('shogi-v21528/profile-stats21535.js','utf8');
const sw=await fs.readFile('shogi-v21528/coi-serviceworker.js','utf8');
new Function(addon);
assert.match(sw,/profile-stats21535\.js\?v=21535a/);
assert.match(sw,/ai-shogi-coi-reload-21535a/);

const browser=await webkit.launch();
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent(`<!doctype html><html><body>
    <div id="statsMain">あなた R1500</div><div id="statsSub">0勝 0敗 0分</div>
    <div id="sHand"><b>あなた</b></div><div id="fsHand"><b>あなた</b></div>
  </body></html>`);
  await page.evaluate(()=>{
    const chars=Array.from({length:26},(_,i)=>({name:i===0?'みつき':'相手'+i,rating:1500+i*10}));
    window.__stats={rating:1620,w:5,l:2,d:1,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))};
    window.__stats.chars[0]={w:2,l:1,d:0};
    window.AIShogiIOS={
      stats:()=>window.__stats,
      characters:()=>chars,
      char:()=>['みつき',3000],
    };
    const cfg={enabled:true,familyCode:'みかみ家',syncKey:'x'.repeat(32),activeSlotId:'slot_papa',activeSlotName:'パパ'};
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify(cfg));
    const save={version:1,savedAt:Date.now(),st:{b:Array(81).fill(0),h:{},t:1,log:[{m:1}]}};
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(save));
    window.AI_SHOGI_SAVE={
      load:()=>true,
      restore:()=>true,
      data:()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),
    };
    window.AI_SHOGI_CLOUD_SAVE={
      audit:()=>{const c=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}');return {activeSlotName:c.activeSlotName||'',activeSlotId:c.activeSlotId||''}},
      enableWithCode:async(code,opts={})=>{const c=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}');c.familyCode=code;c.activeSlotId=opts.slotId||'';c.activeSlotName=opts.slotName||'';localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify(c));return true},
      push:async()=>({ok:true}),
    };
    window.AI_SHOGI_PLAYER_NAME={sync:()=>{}};
  });
  await page.addScriptTag({content:addon});
  await page.waitForTimeout(400);

  let audit=await page.evaluate(()=>window.AI_SHOGI_PROFILE_STATS.audit());
  assert.equal(audit.slotName,'パパ');
  assert.equal(audit.rating,1620);
  assert.equal(audit.payloadHasStats,true);
  assert.equal(await page.textContent('#statsMain'),'パパ R1620');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).playerStats.rating),1620);

  await page.evaluate(async()=>{
    await window.AI_SHOGI_CLOUD_SAVE.enableWithCode('みかみ家',{slotId:'slot_micchan',slotName:'みっちゃん',revision:0,savedAt:0});
  });
  await page.waitForTimeout(150);
  audit=await page.evaluate(()=>window.AI_SHOGI_PROFILE_STATS.audit());
  assert.equal(audit.slotName,'みっちゃん');
  assert.equal(audit.rating,1500);
  assert.equal(await page.textContent('#statsMain'),'みっちゃん R1500');

  await page.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'));c.activeSlotId='slot_papa';c.activeSlotName='パパ';localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify(c));
    const save=JSON.parse(localStorage.getItem('aiShogiGameSaveV1'));
    save.playerStats={version:1,rating:1704,w:8,l:3,d:1,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))};
    save.playerStats.chars[0]={w:3,l:2,d:0};
    save.playerProfile={slotId:'slot_papa',slotName:'パパ',familyCode:'みかみ家'};
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(save));
    window.AI_SHOGI_SAVE.load();
  });
  await page.waitForTimeout(120);
  audit=await page.evaluate(()=>window.AI_SHOGI_PROFILE_STATS.audit());
  assert.equal(audit.rating,1704);
  assert.equal(audit.w,8);
  assert.equal(audit.l,3);
  assert.equal(await page.textContent('#statsMain'),'パパ R1704');
  assert.match(await page.textContent('#statsSub'),/^8勝 3敗 1分/);

  await page.evaluate(()=>window.dispatchEvent(new Event('ai-shogi-local-save')));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).playerStats.rating),1704);
  console.log('PASS WebKit per-profile rating migration/new-profile/reset/cloud-restore behavior');
} finally {
  await browser.close();
}

const url='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const origin='https://ai-shogi-yaneuraou-iphone.vercel.app';
const key=('PROFILE_RATING_'+Date.now()+'_'+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,'_');
const headers={Authorization:'Bearer '+key,Origin:origin,'Content-Type':'application/json'};
const slotId='slot_profile_rating';
const payload={version:1,savedAt:Date.now(),st:{b:Array(81).fill(0),h:{},t:1,log:[{m:1}]},playerStats:{version:1,rating:1732,w:9,l:4,d:2,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))},playerProfile:{slotId,slotName:'パパ',familyCode:'テスト家'}};
async function req(method,suffix='',body){const r=await fetch(url+suffix,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});const j=await r.json();return {r,j}}
try{
  let out=await req('PUT','',{slotId,slotName:'パパ',baseRevision:0,deviceId:'dev_profile_rating',payload});
  assert.equal(out.r.status,200,JSON.stringify(out.j));assert.equal(out.j.ok,true);
  out=await req('GET','?slot='+encodeURIComponent(slotId));
  assert.equal(out.r.status,200,JSON.stringify(out.j));assert.equal(out.j.ok,true);
  assert.equal(out.j.record.payload.playerStats.rating,1732);
  assert.equal(out.j.record.payload.playerStats.w,9);
  assert.equal(out.j.record.payload.playerProfile.slotName,'パパ');
  console.log('PASS live Supabase player rating/stats round trip');
} finally {
  await req('DELETE','',{mode:'family'}).catch(()=>{});
}
