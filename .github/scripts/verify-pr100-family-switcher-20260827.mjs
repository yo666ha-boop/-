import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const cloudSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const familySource=fs.readFileSync('shogi-v21528/cloud-family-switcher21533.js','utf8');
const html=`<!doctype html><meta charset="utf-8"><title>family switcher gate</title>
<style>.controls{display:flex;gap:8px;flex-wrap:wrap}.btn{min-height:44px}</style>
<div class="controls"></div><div id="status"></div><div id="fstatus"></div>
<script>window.AI_SHOGI_SAVE={load(){window.__loaded=(window.__loaded||0)+1}};</script>
<script src="/cloud-save21531.js"></script><script src="/cloud-family-switcher21533.js"></script>`;
const server=http.createServer((req,res)=>{
  if(req.url==='/cloud-save21531.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(cloudSource);return}
  if(req.url==='/cloud-family-switcher21533.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(familySource);return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const origin=`http://127.0.0.1:${port}`;
const makeSave=(savedAt,ply)=>({version:1,savedAt,ci:2,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});

async function runScenario(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(({label})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({
      syncKey:'A'.repeat(32),familyCode:'みかみ',codeMode:'family',deviceId:'dev_'+label.replace(/[^a-z0-9]/gi,'_'),
      api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,
      activeSlotId:'slot_current',activeSlotName:'いまの保存',multislotReady:true
    }));
    localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify({slots:{slot_current:{revision:2,lastSyncedSavedAt:2000,pending:false,lastError:'',updatedAt:2000}}}));
    localStorage.setItem('aiShogiFamilyCodeHistoryV1',JSON.stringify([{code:'ぱぱ',lastUsed:1000}]));
  },{label});
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  const slots=[
    {slotId:'slot_one',slotName:'パパ保存',revision:3,updatedAt:3000,savedAt:3000,ply:10},
    {slotId:'slot_two',slotName:'みっちゃん',revision:7,updatedAt:7000,savedAt:7000,ply:22},
  ];
  let listCount=0,getCount=0,currentProbeCount=0;const auths=[];const dialogs=[];
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const req=route.request(),u=new URL(req.url());auths.push(req.headers()['authorization']||'');
    if(u.searchParams.get('mode')==='list'){
      listCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots})});return;
    }
    if(u.searchParams.get('slot')==='slot_current'){
      currentProbeCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})});return;
    }
    if(u.searchParams.get('slot')==='slot_two'){
      getCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:'slot_two',slotName:'みっちゃん',revision:7,payload:makeSave(7000,22)}})});return;
    }
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected'})});
  });
  page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});if(d.type()==='confirm')await d.accept();else await d.dismiss()});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudFamilySwitchBtn'));
  await page.waitForTimeout(80);
  await page.evaluate(()=>{
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify({version:1,savedAt:2500,ci:2,st:{b:Array(81).fill(null),h:{},log:[{i:1},{i:2}]}}));
    const m=JSON.parse(localStorage.getItem('aiShogiCloudMetaV2')||'{"slots":{}}');m.slots.slot_current={revision:2,lastSyncedSavedAt:2000,pending:true,lastError:'',updatedAt:2500};localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify(m));
  });
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'));
  assert.equal(before.familyCode,'みかみ');assert.equal(before.activeSlotName,'いまの保存');
  const switchButton=page.getByRole('button',{name:/家族コード：みかみ/});
  await switchButton.click();
  await page.getByRole('button',{name:'ぱぱ',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="家族コードの保存を選ぶ"]'));
  const inspected=await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'));
  assert.equal(inspected.familyCode,'みかみ','inspection must not switch family before slot selection');
  assert.equal(inspected.activeSlotName,'いまの保存','inspection must not change active slot');
  const target=page.getByRole('button',{name:/みっちゃん.*22手/});
  const minHeight=await target.evaluate(el=>parseFloat(getComputedStyle(el).minHeight));assert.ok(minHeight>=52);
  await target.click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('ぱぱ')&&document.getElementById('status')?.textContent.includes('みっちゃん'));
  const out=await page.evaluate(()=>({
    cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),
    game:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),
    history:JSON.parse(localStorage.getItem('aiShogiFamilyCodeHistoryV1')||'[]'),
    loaded:window.__loaded||0,
    button:document.getElementById('cloudFamilySwitchBtn')?.textContent||'',
    audit:window.AI_SHOGI_FAMILY_SWITCHER?.audit?.(),
    overflow:document.documentElement.scrollWidth>window.innerWidth,
    ua:navigator.userAgent,
  }));
  assert.equal(listCount,1);assert.equal(getCount,1);assert.ok(currentProbeCount>=1);
  assert.equal(out.cfg.familyCode,'ぱぱ');assert.equal(out.cfg.activeSlotName,'みっちゃん');assert.equal(out.game.st.log.length,22);assert.equal(out.loaded,1);
  assert.match(out.button,/家族コード：ぱぱ/);assert.equal(out.audit?.button,true);assert.equal(out.audit?.currentFamilyCode,'ぱぱ');
  assert.ok(out.history.some(x=>(typeof x==='string'?x:x.code)==='みかみ'));assert.ok(out.history.some(x=>(typeof x==='string'?x:x.code)==='ぱぱ'));
  assert.equal(out.overflow,false);assert.deepEqual(pageErrors,[]);
  assert.equal(dialogs.filter(x=>x.type==='prompt').length,0,'family switching existing save must not use prompt');
  assert.equal(dialogs.filter(x=>x.type==='confirm').length,1,'pending local changes must require confirmation');
  assert.match(dialogs.find(x=>x.type==='confirm').message,/未同期/);
  const derivedAuth=auths.find(x=>x.startsWith('Bearer ')&&x!=='Bearer '+'A'.repeat(32));assert.ok(derivedAuth);assert.equal(derivedAuth.slice(7).length,43);
  console.log('PASS_PR100_FAMILY_SWITCHER',JSON.stringify({label,minHeight,listCount,getCount,family:out.cfg.familyCode,active:out.cfg.activeSlotName,ply:out.game.st.log.length,noPrompt:true,pendingConfirm:true,overflow:out.overflow,pageErrors,ua:out.ua}));
  await context.close();await browser.close();
}

try{
  await runScenario(webkit,'iPhone WebKit',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true});
  await runScenario(chromium,'Fire Silk',{userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true});
  await runScenario(chromium,'Desktop Chromium',{viewport:{width:1280,height:800}});
  await runScenario(firefox,'Firefox',{viewport:{width:1280,height:800}});
  console.log('PASS_PR100_FAMILY_SWITCHER_FOUR_ENV_ALL');
}finally{
  await new Promise(resolve=>server.close(resolve));
}
