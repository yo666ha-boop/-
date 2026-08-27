import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { webkit } from 'playwright';

const cloudSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const html=`<!doctype html><meta charset="utf-8"><title>cloud multislot webkit</title>
<div class="controls"></div><div id="status"></div><div id="fstatus"></div>
<script>window.AI_SHOGI_SAVE={load(){window.__loaded=(window.__loaded||0)+1}};</script>
<script src="/cloud-save21531.js"></script>`;

const server=http.createServer((req,res)=>{
  if(req.url==='/cloud-save21531.js'){
    res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(cloudSource);return;
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const origin=`http://127.0.0.1:${port}`;

const browser=await webkit.launch({headless:true});
const iphone={
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  viewport:{width:390,height:844},screen:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,
};

function makeSave(savedAt,ci,ply){return {version:1,savedAt,ci,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}}}

async function makePage(syncChar){
  const context=await browser.newContext(iphone);
  await context.addInitScript(({syncChar})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({
      syncKey:syncChar.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_webkit',
      api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,
      activeSlotId:'',activeSlotName:'',multislotReady:true
    }));
  },{syncChar});
  const page=await context.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR',e.stack||e));
  page.on('console',m=>console.log('CONSOLE',m.type(),m.text()));
  return {context,page};
}

async function testTwoSlots(){
  const {context,page}=await makePage('W');
  const list=[
    {slotId:'slot_papa',slotName:'パパ',revision:2,updatedAt:2000,savedAt:2000,ply:12},
    {slotId:'slot_micchan',slotName:'みっちゃん',revision:7,updatedAt:7000,savedAt:7000,ply:34},
  ];
  const target=makeSave(7000,7,34);
  let listRequests=0,slotRequests=0,dialogMessage='';
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const u=new URL(route.request().url());
    if(u.searchParams.get('mode')==='list'){
      listRequests++;
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots:list})});return;
    }
    if(u.searchParams.get('slot')==='slot_micchan'){
      slotRequests++;
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:'slot_micchan',slotName:'みっちゃん',revision:7,payload:target}})});return;
    }
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected_test_request'})});
  });
  page.once('dialog',async d=>{
    dialogMessage=d.message();
    assert.equal(d.type(),'prompt');
    assert.match(dialogMessage,/1\. パパ/);
    assert.match(dialogMessage,/2\. みっちゃん/);
    await d.accept('2');
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudPullBtn'));
  await page.getByRole('button',{name:'別端末から再開'}).click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('みっちゃん'));
  const out=await page.evaluate(()=>({
    cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),
    save:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),
    loaded:window.__loaded||0,status:document.getElementById('status')?.textContent||'',ua:navigator.userAgent,
  }));
  assert.equal(out.cfg.activeSlotId,'slot_micchan');
  assert.equal(out.cfg.activeSlotName,'みっちゃん');
  assert.equal(out.save.savedAt,7000);
  assert.equal(out.save.st.log.length,34);
  assert.equal(out.loaded,1);
  assert.equal(listRequests,1);
  assert.equal(slotRequests,1);
  assert.match(out.status,/「みっちゃん」をこの端末へ復元しました/);
  assert.match(out.ua,/iPhone/);
  console.log('PASS_WEBKIT_TWO',JSON.stringify({active:out.cfg.activeSlotName,ply:out.save.st.log.length,listRequests,slotRequests}));
  await context.close();
}

async function testOneSlotStillPrompts(){
  const {context,page}=await makePage('X');
  const list=[{slotId:'slot_mama',slotName:'まま',revision:3,updatedAt:3000,savedAt:3000,ply:8}];
  const target=makeSave(3000,3,8);
  let promptCount=0,dialogMessage='';
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const u=new URL(route.request().url());
    if(u.searchParams.get('mode')==='list'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots:list})});return;
    }
    if(u.searchParams.get('slot')==='slot_mama'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:'slot_mama',slotName:'まま',revision:3,payload:target}})});return;
    }
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected_test_request'})});
  });
  page.once('dialog',async d=>{
    promptCount++;dialogMessage=d.message();
    assert.match(dialogMessage,/1\. まま/);
    assert.match(dialogMessage,/番号を入力してください/);
    await d.accept('1');
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudPullBtn'));
  await page.getByRole('button',{name:'別端末から再開'}).click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('まま'));
  const out=await page.evaluate(()=>({cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),loaded:window.__loaded||0}));
  assert.equal(promptCount,1,'one saved game must still show the selection prompt');
  assert.equal(out.cfg.activeSlotName,'まま');
  assert.equal(out.loaded,1);
  console.log('PASS_WEBKIT_ONE',JSON.stringify({promptCount,active:out.cfg.activeSlotName}));
  await context.close();
}

try{
  await testTwoSlots();
  await testOneSlotStillPrompts();
  console.log('PASS iPhone WebKit multi-slot selection and restore');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
