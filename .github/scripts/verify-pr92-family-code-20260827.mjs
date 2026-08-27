import assert from 'node:assert/strict';
import { chromium, webkit, firefox } from 'playwright';
import fs from 'node:fs/promises';

const CLOUD='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const FAMILY='みかみ';
const LEGACY='abcdefghijklmnopqrstuvwxyzABCDEFGH';
const UA={
  iphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  fire:'Mozilla/5.0 (Linux; U; en-US; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',
  chrome:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  firefox:'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0'
};
const ENVS=[
  ['DESKTOP_CHROMIUM',chromium,UA.chrome,{width:1440,height:900}],
  ['IPHONE_WEBKIT',webkit,UA.iphone,{width:390,height:844}],
  ['FIRE_SILK',chromium,UA.fire,{width:800,height:1280}],
  ['FIREFOX',firefox,UA.firefox,{width:1440,height:900}]
];

const html=`<!doctype html><html><head><meta charset="utf-8"></head><body><div class="controls"></div><div id="cloudSaveGuide"></div><div id="status"></div><div id="fstatus"></div><script>window.AI_SHOGI_SAVE={load(){window.__loadCount=(window.__loadCount||0)+1;return true},data(){try{return JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null')}catch(e){return null}},audit(){const x=this.data();return {currentPly:x?.st?.log?.length||0}}};</script><script src="/shogi-v21528/cloud-save21531.js"></script></body></html>`;
await fs.writeFile('pr92-family-code-test.html',html);

async function runEnv(name,type,userAgent,viewport){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({userAgent,viewport});
  await context.route(CLOUD,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})}));
  await context.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedFamilyCode=text;}}});
  });
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  try{
    await page.goto('http://127.0.0.1:4173/pr92-family-code-test.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudCodeBtn'));
    const initial=await page.evaluate(()=>({audit:AI_SHOGI_CLOUD_SAVE.audit(),disabled:document.getElementById('cloudCodeBtn').disabled,text:document.getElementById('cloudCodeBtn').textContent}));
    assert.deepEqual(initial.audit.buttons,{cloud:true,codeCopy:true,pull:true});
    assert.equal(initial.disabled,true);
    assert.equal(initial.text,'家族コードをコピー');

    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),FAMILY),true);
    const family=await page.evaluate(()=>{
      const raw=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'null');
      return {raw,api:AI_SHOGI_CLOUD_SAVE.config(),audit:AI_SHOGI_CLOUD_SAVE.audit(),button:document.getElementById('cloudCodeBtn').textContent};
    });
    assert.equal(family.raw.familyCode,FAMILY);
    assert.equal(family.raw.codeMode,'family');
    assert.match(family.raw.syncKey,/^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(family.raw.syncKey,FAMILY);
    assert.equal(family.api.familyCode,FAMILY);
    assert.equal(family.api.codeMode,'family');
    assert.equal(family.audit.codeMode,'family');
    assert.equal(family.audit.familyCodeLength,3);
    assert.equal(family.button,'家族コードをコピー');

    const copied=await page.evaluate(async()=>{window.__copiedFamilyCode='';const ok=await AI_SHOGI_CLOUD_SAVE.copySyncCode();return {ok,copied:window.__copiedFamilyCode,status:document.getElementById('status').textContent};});
    assert.equal(copied.ok,true);assert.equal(copied.copied,FAMILY);assert.ok(copied.status.includes('家族コード'));

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudCodeBtn'));
    const persisted=await page.evaluate(()=>({raw:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'null'),disabled:document.getElementById('cloudCodeBtn').disabled,audit:AI_SHOGI_CLOUD_SAVE.audit()}));
    assert.equal(persisted.raw.familyCode,FAMILY);assert.equal(persisted.disabled,false);assert.equal(persisted.audit.configured,true);

    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),'ｔｅｓｔ'),true);
    const ascii=await page.evaluate(async()=>{const raw=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'));window.__copiedFamilyCode='';await AI_SHOGI_CLOUD_SAVE.copySyncCode();return {raw,copied:window.__copiedFamilyCode};});
    assert.equal(ascii.raw.familyCode,'test');assert.equal(ascii.raw.codeMode,'family');assert.equal(ascii.copied,'test');

    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),LEGACY),true);
    const legacy=await page.evaluate(async()=>{const raw=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'));window.__copiedFamilyCode='';await AI_SHOGI_CLOUD_SAVE.copySyncCode();return {raw,copied:window.__copiedFamilyCode,audit:AI_SHOGI_CLOUD_SAVE.audit()};});
    assert.equal(legacy.raw.syncKey,LEGACY);assert.equal(legacy.raw.familyCode,'');assert.equal(legacy.raw.codeMode,'legacy');assert.equal(legacy.copied,LEGACY);assert.equal(legacy.audit.codeMode,'legacy');

    assert.equal(await page.evaluate(()=>AI_SHOGI_CLOUD_SAVE.enableWithCode('')),false);
    const invalidStatus=await page.evaluate(()=>document.getElementById('status').textContent);
    assert.ok(invalidStatus.includes('家族コード'));
    assert.deepEqual(pageErrors,[]);
    console.log('PR92_FAMILY_ENV '+JSON.stringify({name,hiragana:true,persistedAfterReload:true,asciiShort:true,nfkc:true,legacyCompatible:true,derivedKeyLength:43,pageErrors}));
  } finally {await context.close();await browser.close();}
}
for(const e of ENVS)await runEnv(...e);

function save(marker,savedAt=Date.now()){
  return {version:1,savedAt,ci:25,st:{b:Array(81).fill(null),h:{1:{},'-1':{}},t:1,log:[{cloudTest:marker}],last:null}};
}
async function seed(ctx,deviceId,localSave=null){
  await ctx.addInitScript(({deviceId,CLOUD,localSave})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'',familyCode:'',codeMode:'',deviceId,api:CLOUD,enabled:false}));
    localStorage.setItem('aiShogiCloudMetaV1',JSON.stringify({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()}));
    if(localSave)localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(localSave));else localStorage.removeItem('aiShogiGameSaveV1');
  },{deviceId,CLOUD,localSave});
}
async function proxyRealCloud(route){
  const req=route.request(),h=req.headers(),headers={};
  if(h.authorization)headers.Authorization=h.authorization;
  if(h['content-type'])headers['Content-Type']=h['content-type'];
  try{
    const r=await fetch(CLOUD,{method:req.method(),headers,body:['GET','HEAD'].includes(req.method())?undefined:req.postData(),signal:AbortSignal.timeout(20000)});
    await route.fulfill({status:r.status,contentType:r.headers.get('content-type')||'application/json',body:await r.text()});
  }catch(e){await route.fulfill({status:599,contentType:'application/json',body:JSON.stringify({ok:false,error:'proxy_'+String(e.message||e)})});}
}

const RUN=Date.now();
const familyCode='みかみ検証'+RUN;
const iphoneDevice=`pr92family_iphone_${RUN}`;
const pcDevice=`pr92family_pc_${RUN}`;
const wb=await webkit.launch({headless:true}),cb=await chromium.launch({headless:true});
const ic=await wb.newContext({userAgent:UA.iphone,viewport:{width:390,height:844}}),pc=await cb.newContext({userAgent:UA.chrome,viewport:{width:1440,height:900}});
await ic.route(CLOUD,proxyRealCloud);await pc.route(CLOUD,proxyRealCloud);
await seed(ic,iphoneDevice,save('IPHONE-A',RUN));await seed(pc,pcDevice,null);
const ip=await ic.newPage(),cp=await pc.newPage();
try{
  await ip.goto('http://127.0.0.1:4173/pr92-family-code-test.html',{waitUntil:'domcontentloaded'});
  await ip.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudPullBtn'));
  assert.equal(await ip.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),familyCode),true);
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>=1&&!m.pending&&m.lastError===''},null,{timeout:30000});
  const iState=await ip.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'))}));

  await cp.goto('http://127.0.0.1:4173/pr92-family-code-test.html',{waitUntil:'domcontentloaded'});
  await cp.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudPullBtn'));
  assert.equal(await cp.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),familyCode),true);
  await cp.waitForFunction(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null')?.st?.log?.at(-1)?.cloudTest==='IPHONE-A',null,{timeout:30000});
  const p0=await cp.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'))}));
  assert.equal(p0.m.revision,iState.m.revision);
  assert.equal(p0.cfg.syncKey,iState.cfg.syncKey);
  assert.equal(p0.cfg.familyCode,familyCode);
  assert.equal(iState.cfg.familyCode,familyCode);

  await cp.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));window.dispatchEvent(new Event('ai-shogi-local-save'));},save('PC-B',RUN+1000));
  await cp.waitForFunction(r=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>r&&!m.pending&&m.lastError===''},p0.m.revision,{timeout:30000});
  const pRev=await cp.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);

  await ip.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));window.dispatchEvent(new Event('ai-shogi-local-save'));},save('IPHONE-A-PENDING',RUN+2000));
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.pending&&m.lastError==='conflict'},null,{timeout:30000});
  const protectedPull=await ip.evaluate(()=>AI_SHOGI_CLOUD_SAVE.pull());
  assert.equal(protectedPull.localPending,true);
  assert.equal(await ip.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).st.log.at(-1).cloudTest),'IPHONE-A-PENDING');

  ip.once('dialog',d=>d.accept());
  await ip.click('#cloudPullBtn');
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta(),x=JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null');return !m.pending&&m.lastError===''&&x?.st?.log?.at(-1)?.cloudTest==='PC-B'},null,{timeout:30000});
  const fin=await ip.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),marker:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).st.log.at(-1).cloudTest,loads:window.__loadCount||0,cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'))}));
  assert.equal(fin.marker,'PC-B');assert.ok(fin.loads>=1);assert.equal(fin.cfg.familyCode,familyCode);
  console.log('PR92_FAMILY_MIXED '+JSON.stringify({iphoneInitialRevision:iState.m.revision,pcRevision:pRev,realBackend:true,sameDerivedKey:true,hiraganaFamilyCode:true,conflictProtected:true,explicitDiscardRestored:true,finalMarker:fin.marker,restoreLoads:fin.loads,iphoneDevice,pcDevice}));
} finally {await ic.close();await pc.close();await wb.close();await cb.close();}

console.log('PASS_PR92_FAMILY_CODE_FOUR_ENV_MIXED');
