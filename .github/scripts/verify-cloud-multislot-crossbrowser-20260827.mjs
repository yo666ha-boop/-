import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, firefox } from 'playwright';

const cloudSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const html=`<!doctype html><meta charset="utf-8"><title>cloud multislot crossbrowser</title>
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
const {port}=server.address();const origin=`http://127.0.0.1:${port}`;
const save=(savedAt,ply)=>({version:1,savedAt,ci:2,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});

async function runScenario(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(({key,label})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({
      syncKey:key.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_'+label.replace(/[^a-z0-9]/gi,'_'),
      api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,
      activeSlotId:'',activeSlotName:'',multislotReady:true
    }));
  },{key:label[0].toUpperCase(),label});
  const page=await context.newPage();
  const slots=[
    {slotId:'slot_one',slotName:'パパ',revision:1,updatedAt:1000,savedAt:1000,ply:10},
    {slotId:'slot_two',slotName:'みっちゃん',revision:5,updatedAt:5000,savedAt:5000,ply:22},
  ];
  let listCount=0,getCount=0,promptCount=0;
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const u=new URL(route.request().url());
    if(u.searchParams.get('mode')==='list'){
      listCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots})});return;
    }
    if(u.searchParams.get('slot')==='slot_two'){
      getCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:'slot_two',slotName:'みっちゃん',revision:5,payload:save(5000,22)}})});return;
    }
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected'})});
  });
  page.once('dialog',async d=>{
    promptCount++;
    assert.equal(d.type(),'prompt');
    assert.match(d.message(),/1\. パパ/);
    assert.match(d.message(),/2\. みっちゃん/);
    await d.accept('2');
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudPullBtn'));
  await page.getByRole('button',{name:'別端末から再開'}).click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('みっちゃん'));
  const out=await page.evaluate(()=>({
    cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),
    game:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),
    loaded:window.__loaded||0,ua:navigator.userAgent,
  }));
  assert.equal(promptCount,1);
  assert.equal(listCount,1);
  assert.equal(getCount,1);
  assert.equal(out.cfg.activeSlotName,'みっちゃん');
  assert.equal(out.game.st.log.length,22);
  assert.equal(out.loaded,1);
  console.log('PASS_BROWSER',JSON.stringify({label,active:out.cfg.activeSlotName,ply:out.game.st.log.length,ua:out.ua}));
  await context.close();await browser.close();
}

try{
  await runScenario(chromium,'Chromium',{viewport:{width:1280,height:800}});
  await runScenario(chromium,'Silk',{
    userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',
    viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true,
  });
  await runScenario(firefox,'Firefox',{viewport:{width:1280,height:800}});
  console.log('PASS Chromium + Fire/Silk + Firefox multi-slot selection and restore');
}finally{
  await new Promise(resolve=>server.close(resolve));
}
