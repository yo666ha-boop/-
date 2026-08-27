import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const cloud=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const family=fs.readFileSync('shogi-v21528/cloud-family-switcher21533.js','utf8');
const saveName=fs.readFileSync('shogi-v21528/cloud-save-name-picker21533.js','utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div class="controls"></div><div id="status"></div><div id="fstatus"></div><script>window.AI_SHOGI_SAVE={load(){window.__loaded=(window.__loaded||0)+1}};</script><script src="/cloud.js"></script><script src="/family.js"></script><script src="/save-name.js"></script></body></html>`;
const server=http.createServer((req,res)=>{res.setHeader('cache-control','no-store');if(req.url==='/cloud.js'){res.setHeader('content-type','application/javascript; charset=utf-8');return res.end(cloud)}if(req.url==='/family.js'){res.setHeader('content-type','application/javascript; charset=utf-8');return res.end(family)}if(req.url==='/save-name.js'){res.setHeader('content-type','application/javascript; charset=utf-8');return res.end(saveName)}res.setHeader('content-type','text/html; charset=utf-8');res.end(html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;

async function runCase(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});const context=await browser.newContext(contextOptions);const page=await context.newPage();
  const dialogs=[],pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});if(d.type()==='confirm')await d.accept();else await d.dismiss()});
  let putBody=null,listCount=0;
  await page.route('**/functions/v1/shogi-save**',async route=>{const req=route.request(),u=new URL(req.url());if(req.method()==='GET'&&u.searchParams.get('mode')==='list'){listCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots:[{slotId:'slot_old',slotName:'いまの保存',revision:2,savedAt:2000,updatedAt:2000,ply:2}]})});return}if(req.method()==='GET'&&u.searchParams.get('slot')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})});return}if(req.method()==='PUT'){putBody=JSON.parse(req.postData()||'{}');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:putBody.slotId,slotName:putBody.slotName,revision:1,payload:putBody.payload}})});return}await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected'})})});
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&window.AI_SHOGI_FAMILY_SWITCHER&&window.AI_SHOGI_SAVE_NAME_PICKER);
  await page.evaluate(()=>{localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'A'.repeat(32),familyCode:'みかみ',codeMode:'family',deviceId:'pr101',api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,activeSlotId:'slot_old',activeSlotName:'いまの保存',multislotReady:true}));localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify({slots:{slot_old:{revision:2,lastSyncedSavedAt:2000,pending:false,lastError:'',updatedAt:2000}}}));localStorage.setItem('aiShogiGameSaveV1',JSON.stringify({version:1,savedAt:2000,ci:2,st:{b:Array(81).fill(null),h:{},log:[{i:1},{i:2}]}}));});
  await page.waitForFunction(()=>document.getElementById('cloudFamilySwitchBtn'));await page.getByRole('button',{name:/家族コード/}).click();await page.getByRole('button',{name:'現在の家族コードの保存を見る'}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="家族コードの保存を選ぶ"]'));
  await page.getByRole('button',{name:'この家族コードで新しい保存を作る'}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="新しい保存名を入力"]'));
  const ui=await page.evaluate(()=>{const d=document.querySelector('[aria-label="新しい保存名を入力"]'),input=d?.querySelector('input'),buttons=[...d?.querySelectorAll('button')||[]];return {version:window.AI_SHOGI_SAVE_NAME_PICKER?.version||'',inputHeight:input?parseFloat(getComputedStyle(input).minHeight):0,buttonHeights:buttons.map(b=>parseFloat(getComputedStyle(b).minHeight)),overflow:document.documentElement.scrollWidth>window.innerWidth}});
  assert.equal(ui.version,'21533b',label+' version');assert.ok(ui.inputHeight>=52,label+' input height');assert.ok(ui.buttonHeights.length>=2&&ui.buttonHeights.every(x=>x>=52),label+' button heights');assert.equal(ui.overflow,false,label+' overflow');
  const input=page.getByRole('textbox',{name:'保存名'});await input.fill('みっちゃん新');await page.getByRole('button',{name:'この名前で保存を作る'}).click();await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('みっちゃん新'));
  const out=await page.evaluate(()=>({cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),status:document.getElementById('status')?.textContent||'',dialog:!!document.getElementById('aiShogiSaveNamePickerDialog'),overflow:document.documentElement.scrollWidth>window.innerWidth}));
  assert.equal(out.cfg.familyCode,'みかみ');assert.equal(out.cfg.activeSlotName,'みっちゃん新');assert.match(out.cfg.activeSlotId,/^slot_[0-9a-f]{24}$/);assert.equal(out.dialog,false);assert.equal(out.overflow,false);assert.ok(putBody&&putBody.slotName==='みっちゃん新');assert.match(String(putBody.slotId),/^slot_[0-9a-f]{24}$/);assert.ok(listCount>=1);assert.equal(dialogs.filter(x=>x.type==='prompt').length,0,label+' native prompt used');assert.deepEqual(pageErrors,[],label+' page errors');
  console.log('PASS_PR101_SAVE_NAME',JSON.stringify({label,inputHeight:ui.inputHeight,buttonHeights:ui.buttonHeights,slot:out.cfg.activeSlotName,noPrompt:true,overflow:false,pageErrors}));await context.close();await browser.close();
}
try{
  await runCase(webkit,'iPhone WebKit',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true});
  await runCase(chromium,'Fire Silk',{userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true});
  await runCase(chromium,'Desktop Chromium',{viewport:{width:1280,height:800}});
  await runCase(firefox,'Firefox',{viewport:{width:1280,height:800}});
  console.log('PASS_PR101_SAVE_NAME_FOUR_ENV_ALL');
}finally{await new Promise(r=>server.close(r))}
