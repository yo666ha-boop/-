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
const safeLabel=label=>label.replace(/[^a-z0-9]/gi,'_');

async function seedContext(context,label,{slotName='いまの保存'}={}){
  await context.addInitScript(({label,slotName})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({
      syncKey:'A'.repeat(32),familyCode:'みかみ',codeMode:'family',deviceId:'dev_'+label,
      api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,
      activeSlotId:'slot_current',activeSlotName:slotName,multislotReady:true
    }));
    localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify({slots:{slot_current:{revision:2,lastSyncedSavedAt:2000,pending:false,lastError:'',updatedAt:2000}}}));
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify({version:1,savedAt:2500,ci:2,st:{b:Array(81).fill(null),h:{},log:[{i:1},{i:2}]}}));
    localStorage.setItem('aiShogiFamilyCodeHistoryV1',JSON.stringify([{code:'ぱぱ',lastUsed:1000}]));
  },{label:safeLabel(label),slotName});
}

async function markPending(page){
  await page.evaluate(()=>{
    const m=JSON.parse(localStorage.getItem('aiShogiCloudMetaV2')||'{"slots":{}}');
    m.slots.slot_current={revision:2,lastSyncedSavedAt:2000,pending:true,lastError:'',updatedAt:2500};
    localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify(m));
  });
}

async function runMainScenario(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext(contextOptions);await seedContext(context,label);
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
  await page.waitForTimeout(80);await markPending(page);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'));
  assert.equal(before.familyCode,'みかみ');assert.equal(before.activeSlotName,'いまの保存');
  await page.getByRole('button',{name:/家族コード：みかみ/}).click();
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
  assert.equal(out.cfg.familyCode,'ぱぱ');assert.equal(out.cfg.activeSlotId,'slot_two');assert.equal(out.cfg.activeSlotName,'みっちゃん');assert.equal(out.game.st.log.length,22);assert.equal(out.loaded,1);
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

async function runSafetyScenario(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext(contextOptions);await seedContext(context,label+' safety',{slotName:'同名保存'});
  const page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  const dialogs=[];let phase='rollback';let listCount=0,failedGet=0,currentProbe=0;
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const u=new URL(route.request().url());
    if(u.searchParams.get('mode')==='list'){
      listCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots:[{slotId:'slot_other',slotName:'同名保存',revision:4,updatedAt:4000,savedAt:4000,ply:9}]})});return;
    }
    if(u.searchParams.get('slot')==='slot_current'){
      currentProbe++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})});return;
    }
    if(u.searchParams.get('slot')==='slot_other'){
      failedGet++;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'simulated_network_failure'})});return;
    }
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected'})});
  });
  page.on('dialog',async d=>{
    dialogs.push({type:d.type(),message:d.message(),phase});
    if(d.type()==='prompt'){await d.accept('新規保存');return}
    if(d.type()==='confirm'){if(phase==='newslot')await d.dismiss();else await d.accept();return}
    await d.dismiss();
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('cloudFamilySwitchBtn'));await page.waitForTimeout(80);await markPending(page);
  const before=await page.evaluate(()=>({
    cfg:localStorage.getItem('aiShogiCloudConfigV1'),meta1:localStorage.getItem('aiShogiCloudMetaV1'),meta2:localStorage.getItem('aiShogiCloudMetaV2'),save:localStorage.getItem('aiShogiGameSaveV1')
  }));
  await page.getByRole('button',{name:/家族コード：みかみ/}).click();
  await page.getByRole('button',{name:'現在の家族コードの保存を見る',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="家族コードの保存を選ぶ"]'));
  await page.getByRole('button',{name:/同名保存.*9手/}).click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('元の家族コードと保存先に戻しました'));
  const rolledBack=await page.evaluate(()=>({
    cfg:localStorage.getItem('aiShogiCloudConfigV1'),meta1:localStorage.getItem('aiShogiCloudMetaV1'),meta2:localStorage.getItem('aiShogiCloudMetaV2'),save:localStorage.getItem('aiShogiGameSaveV1'),
    cfgObj:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),game:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),loaded:window.__loaded||0,
    cloudButton:document.getElementById('cloudSaveBtn')?.textContent||'',familyButton:document.getElementById('cloudFamilySwitchBtn')?.textContent||''
  }));
  assert.deepEqual({cfg:rolledBack.cfg,meta1:rolledBack.meta1,meta2:rolledBack.meta2,save:rolledBack.save},before,'failed pull must restore exact cloud config/meta/save snapshot');
  assert.equal(rolledBack.cfgObj.familyCode,'みかみ');assert.equal(rolledBack.cfgObj.activeSlotId,'slot_current');assert.equal(rolledBack.cfgObj.activeSlotName,'同名保存');assert.equal(rolledBack.game.st.log.length,2);
  assert.equal(rolledBack.loaded,1);assert.equal(rolledBack.cloudButton,'同期待ち');assert.match(rolledBack.familyButton,/家族コード：みかみ/);
  const rollbackConfirms=dialogs.filter(x=>x.type==='confirm'&&x.phase==='rollback');assert.equal(rollbackConfirms.length,1,'same-name different slot ID must still require pending confirmation');assert.match(rollbackConfirms[0].message,/未同期/);
  phase='newslot';
  await page.getByRole('button',{name:/家族コード：みかみ/}).click();
  await page.getByRole('button',{name:'現在の家族コードの保存を見る',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="家族コードの保存を選ぶ"]'));
  await page.getByRole('button',{name:'この家族コードで新しい保存を作る',exact:true}).click();
  await page.waitForTimeout(80);
  const afterDismiss=await page.evaluate(()=>({cfg:localStorage.getItem('aiShogiCloudConfigV1'),meta2:localStorage.getItem('aiShogiCloudMetaV2'),save:localStorage.getItem('aiShogiGameSaveV1')}));
  assert.equal(afterDismiss.cfg,before.cfg);assert.equal(afterDismiss.meta2,before.meta2);assert.equal(afterDismiss.save,before.save);
  const newPrompts=dialogs.filter(x=>x.type==='prompt'&&x.phase==='newslot');const newConfirms=dialogs.filter(x=>x.type==='confirm'&&x.phase==='newslot');
  assert.equal(newPrompts.length,1);assert.equal(newConfirms.length,1,'same-family new slot must require pending confirmation');assert.match(newConfirms[0].message,/未同期/);
  assert.ok(listCount>=2);assert.equal(failedGet,1);assert.ok(currentProbe>=1);assert.deepEqual(pageErrors,[]);
  console.log('PASS_PR100_SWITCH_SAFETY',JSON.stringify({label,duplicateNameDifferentSlotWarned:true,failedPullRolledBackExact:true,newSlotWarned:true,listCount,failedGet,loaded:rolledBack.loaded,pageErrors}));
  await context.close();await browser.close();
}

const cases=[
  [webkit,'iPhone WebKit',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true}],
  [chromium,'Fire Silk',{userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true}],
  [chromium,'Desktop Chromium',{viewport:{width:1280,height:800}}],
  [firefox,'Firefox',{viewport:{width:1280,height:800}}],
];
try{
  for(const [browserType,label,opts] of cases){await runMainScenario(browserType,label,opts);await runSafetyScenario(browserType,label,opts)}
  console.log('PASS_PR100_FAMILY_SWITCHER_FOUR_ENV_ALL');
  console.log('PASS_PR100_SWITCH_SAFETY_FOUR_ENV_ALL');
}finally{
  await new Promise(resolve=>server.close(resolve));
}
