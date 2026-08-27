import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const PROD='https://ai-shogi-yaneuraou-iphone.vercel.app';
const localPicker=fs.readFileSync('shogi-v21528/cloud-slot-picker21532.js','utf8');
const localCoi=fs.readFileSync('shogi-v21528/coi-serviceworker.js','utf8');

const pickerRes=await fetch(`${PROD}/shogi-v21528/cloud-slot-picker21532.js?v=21532b`,{cache:'no-store'});
assert.equal(pickerRes.status,200);
const publicPicker=await pickerRes.text();
assert.equal(publicPicker,localPicker);
const coiRes=await fetch(`${PROD}/shogi-v21528/coi-serviceworker.js?v=21532a`,{cache:'no-store'});
assert.equal(coiRes.status,200);
const publicCoi=await coiRes.text();
assert.equal(publicCoi,localCoi);
assert.match(publicCoi,/cloud-slot-picker21532\.js\?v=21532b/);
console.log('PASS_POSTMERGE_PR98_ARTIFACT_IDENTITY');

const save=(savedAt,ply)=>({version:1,savedAt,ci:2,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});

async function runScenario(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(label=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'A'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'postmerge_'+label,api:'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save',enabled:true,activeSlotId:'',activeSlotName:'',multislotReady:true}));
  },label.replace(/[^a-z0-9]/gi,'_'));
  const page=await context.newPage();
  const pageErrors=[]; const requestFailures=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('requestfailed',r=>{const u=r.url();if(!u.includes('google')&&!u.includes('gstatic'))requestFailures.push(`${r.failure()?.errorText||'failed'} ${u}`)});
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
  const url=`${PROD}/?postmerge_pr98=${Date.now()}_${encodeURIComponent(label)}`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  for(let i=0;i<3;i++){
    try{await page.waitForFunction(()=>document.getElementById('cloudPullBtn')?.dataset.mobileSlotPicker==='1',{timeout:12000});break}
    catch(e){if(i===2)throw e;await page.reload({waitUntil:'domcontentloaded',timeout:60000});}
  }
  await page.getByRole('button',{name:'別端末から再開'}).click();
  const picker=page.locator('#aiShogiCloudSlotPicker');await picker.waitFor({state:'visible'});
  const slotButton=picker.getByRole('button',{name:/みっちゃん \/ 22手/});
  const ui=await page.evaluate(()=>{
    const p=document.getElementById('aiShogiCloudSlotPicker');const buttons=p?[...p.querySelectorAll('button[data-slot-id]')]:[];
    const target=buttons.find(b=>b.dataset.slotId==='slot_two');
    const cards=document.querySelectorAll('[data-ci],.char-card,.character-card,.opponent-card').length;
    return {count:buttons.length,targetMinHeight:target?getComputedStyle(target).minHeight:'',overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,coi:self.crossOriginIsolated,cards};
  });
  assert.equal(ui.count,2);assert.equal(ui.targetMinHeight,'52px');assert.equal(ui.overflow,false);assert.equal(promptCount,0);
  await slotButton.click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('みっちゃん'),{timeout:10000});
  const out=await page.evaluate(()=>({cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),game:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),picker:!!document.getElementById('aiShogiCloudSlotPicker')}));
  assert.equal(listCount,1);assert.equal(getCount,1);assert.equal(out.cfg.activeSlotName,'みっちゃん');assert.equal(out.game.st.log.length,22);assert.equal(out.picker,false);assert.deepEqual(pageErrors,[]);
  console.log('PASS_POSTMERGE_PR98_PUBLIC_PICKER',JSON.stringify({label,buttons:ui.count,minHeight:ui.targetMinHeight,active:out.cfg.activeSlotName,ply:out.game.st.log.length,noPrompt:promptCount===0,overflow:ui.overflow,coi:ui.coi,cards:ui.cards,pageErrors,requestFailures}));
  await context.close();await browser.close();
}

await runScenario(webkit,'iPhone WebKit',{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true});
await runScenario(chromium,'Fire Silk',{userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true});
await runScenario(chromium,'Desktop Chromium',{viewport:{width:1280,height:800}});
await runScenario(firefox,'Firefox',{viewport:{width:1280,height:800}});
console.log('PASS_POSTMERGE_PR98_PUBLIC_FINAL_ALL');
