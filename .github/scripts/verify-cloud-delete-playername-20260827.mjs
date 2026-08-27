import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { webkit } from 'playwright';

const addon=await fs.readFile('shogi-v21528/cloud-family-manager21534.js','utf8');
const namePatch=await fs.readFile('shogi-v21528/player-name21534b.js','utf8');
new Function(addon);
new Function(namePatch);

const browser=await webkit.launch();
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent(`<!doctype html><html><body>
    <div id="sHand"><b>あなた</b></div>
    <div id="fsHand"><b>あなた</b></div>
    <div id="statsMain">あなた R1500</div>
    <div id="status">あなたが先手です。</div>
    <div id="fstatus">あなたの手番です。</div>
    <button id="cloudFamilySwitchBtn">家族コード</button>
  </body></html>`);
  await page.evaluate(()=>{
    window.__testPlayerName='パパ';
    window.AI_SHOGI_CLOUD_SAVE={
      audit:()=>({activeSlotName:window.__testPlayerName,activeSlotId:'slot_test',meta:{pending:false}}),
      config:()=>({familyCode:'テスト家族',api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save'}),
      disable:()=>{},
    };
  });
  await page.addScriptTag({content:addon});
  await page.addScriptTag({content:namePatch});
  await page.waitForTimeout(900);
  assert.equal(await page.textContent('#sHand b'),'パパ');
  assert.equal(await page.textContent('#fsHand b'),'パパ');
  assert.equal(await page.textContent('#statsMain'),'パパ R1500');
  assert.equal(await page.textContent('#status'),'パパが先手です。');
  assert.equal(await page.textContent('#fstatus'),'パパの手番です。');
  assert.equal(await page.evaluate(()=>window.AI_SHOGI_PLAYER_NAME?.name?.()),'パパ');

  // Same player, only the app redraws stats/status back to generic 「あなた」.
  await page.evaluate(()=>{
    document.getElementById('statsMain').textContent='あなた R1512';
    document.getElementById('status').textContent='あなたが先手です。';
  });
  await page.waitForTimeout(800);
  assert.equal(await page.textContent('#statsMain'),'パパ R1512');
  assert.equal(await page.textContent('#status'),'パパが先手です。');

  // Switching the active save also switches the displayed player name.
  await page.evaluate(()=>{
    window.__testPlayerName='まま';
    document.getElementById('statsMain').textContent='あなた R1520';
    document.getElementById('status').textContent='あなたの手番です。';
  });
  await page.waitForTimeout(900);
  assert.equal(await page.textContent('#sHand b'),'まま');
  assert.equal(await page.textContent('#fsHand b'),'まま');
  assert.equal(await page.textContent('#statsMain'),'まま R1520');
  assert.equal(await page.textContent('#status'),'ままの手番です。');
  console.log('PASS WebKit player-name replacement and redraw persistence');
} finally {
  await browser.close();
}

const url='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const origin='https://ai-shogi-yaneuraou-iphone.vercel.app';
const key=('DELETE_SMOKE_'+Date.now()+'_'+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,'_');
const headers={Authorization:'Bearer '+key,Origin:origin,'Content-Type':'application/json'};
const payload={version:1,savedAt:Date.now(),st:{b:Array(81).fill(0),h:{s:[],g:[]},log:[]},ci:{name:'delete-smoke'}};
const slotA='slot_delete_smoke_a';
const slotB='slot_delete_smoke_b';

async function jsonFetch(target,opts={}){
  const r=await fetch(target,{...opts,headers:{...headers,...(opts.headers||{})},cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  return {r,j};
}
async function put(slotId,slotName){
  const {r,j}=await jsonFetch(url,{method:'PUT',body:JSON.stringify({slotId,slotName,baseRevision:0,deviceId:'dev_delete_smoke',payload})});
  assert.equal(r.status,200,JSON.stringify(j));
  assert.equal(j.ok,true);
  return j;
}
async function list(){
  const {r,j}=await jsonFetch(url+'?mode=list');
  assert.equal(r.status,200,JSON.stringify(j));
  assert.equal(j.ok,true);
  return j.slots;
}
async function deleteBody(body){
  return jsonFetch(url,{method:'DELETE',body:JSON.stringify(body)});
}

try{
  await put(slotA,'削除テストA');
  await put(slotB,'削除テストB');
  let slots=await list();
  assert.equal(slots.length,2);
  assert.deepEqual(new Set(slots.map(x=>x.slotId)),new Set([slotA,slotB]));

  let out=await deleteBody({mode:'slot',slotId:slotA});
  assert.equal(out.r.status,200,JSON.stringify(out.j));
  assert.equal(out.j.ok,true);
  assert.equal(out.j.deleted,1);
  slots=await list();
  assert.equal(slots.length,1);
  assert.equal(slots[0].slotId,slotB);

  out=await deleteBody({mode:'family'});
  assert.equal(out.r.status,200,JSON.stringify(out.j));
  assert.equal(out.j.ok,true);
  assert.equal(out.j.deleted,1);
  slots=await list();
  assert.equal(slots.length,0);
  console.log('PASS live Supabase DELETE: individual slot preserves sibling, family delete clears remainder');
} finally {
  await deleteBody({mode:'family'}).catch(()=>{});
}
