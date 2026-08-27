import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const cloudSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const pickerSource=fs.readFileSync('shogi-v21528/cloud-slot-picker21532.js','utf8');
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PR98 slot picker</title>
<style>html,body{margin:0;max-width:100%;overflow-x:hidden}.controls{padding:8px}</style>
<div class="controls"></div><div id="status"></div><div id="fstatus"></div>
<script>window.AI_SHOGI_SAVE={load(){window.__loaded=(window.__loaded||0)+1}};</script>
<script src="/cloud-save21531.js"></script><script src="/cloud-slot-picker21532.js"></script>`;
const server=http.createServer((req,res)=>{
  if(req.url==='/cloud-save21531.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(cloudSource);return;}
  if(req.url==='/cloud-slot-picker21532.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(pickerSource);return;}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const origin=`http://127.0.0.1:${port}`;
const save=(savedAt,ply)=>({version:1,savedAt,ci:2,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});

async function runScenario(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(label=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'A'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_'+label,api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,activeSlotId:'',activeSlotName:'',multislotReady:true}));
  },label.replace(/[^a-z0-9]/gi,'_'));
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const slots=[
    {slotId:'slot_one',slotName:'パパ',revision:1,updatedAt:1000,savedAt:1000,ply:10},
    {slotId:'slot_two',slotName:'みっちゃん',revision:5,updatedAt:5000,savedAt:5000,ply:22},
  ];
  let listCount=0,getCount=0,promptCount=0;
  page.on('dialog',async d=>{if(d.type()==='prompt'){promptCount++;await d.dismiss();}});
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const u=new URL(route.request().url());
    if(u.searchParams.get('mode')==='list'){listCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots})});return;}
    if(u.searchParams.get('slot')==='slot_two'){getCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:'slot_two',slotName:'みっちゃん',revision:5,payload:save(5000,22)}})});return;}
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected'})});
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('cloudPullBtn')?.dataset.mobileSlotPicker==='1');
  await page.getByRole('button',{name:'別端末から再開'}).click();
  const picker=page.locator('#aiShogiCloudSlotPicker');await picker.waitFor({state:'visible'});
  const slotButton=picker.getByRole('button',{name:/みっちゃん \/ 22手/});
  const ui=await page.evaluate(()=>{
    const p=document.getElementById('aiShogiCloudSlotPicker');const buttons=p?[...p.querySelectorAll('button[data-slot-id]')]:[];
    const target=buttons.find(b=>b.dataset.slotId==='slot_two');
    return {count:buttons.length,targetMinHeight:target?getComputedStyle(target).minHeight:'',overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};
  });
  assert.equal(ui.count,2);assert.equal(ui.targetMinHeight,'52px');assert.equal(ui.overflow,false);assert.equal(promptCount,0);
  await slotButton.click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('みっちゃん'));
  const out=await page.evaluate(()=>({cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),game:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),loaded:window.__loaded||0,picker:!!document.getElementById('aiShogiCloudSlotPicker')}));
  assert.equal(listCount,1);assert.equal(getCount,1);assert.equal(out.cfg.activeSlotName,'みっちゃん');assert.equal(out.game.st.log.length,22);assert.equal(out.loaded,1);assert.equal(out.picker,false);assert.deepEqual(errors,[]);
  console.log('PASS_PR98_PICKER',JSON.stringify({label,buttons:ui.count,minHeight:ui.targetMinHeight,active:out.cfg.activeSlotName,ply:out.game.st.log.length,noPrompt:promptCount===0,overflow:ui.overflow,errors}));
  await context.close();await browser.close();
}

try{
  await runScenario(webkit,'iPhone WebKit',{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true});
  await runScenario(chromium,'Fire Silk',{userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true});
  await runScenario(chromium,'Desktop Chromium',{viewport:{width:1280,height:800}});
  await runScenario(firefox,'Firefox',{viewport:{width:1280,height:800}});
  console.log('PASS_PR98_SLOT_PICKER_FOUR_ENV_ALL');
}finally{await new Promise(resolve=>server.close(resolve));}
