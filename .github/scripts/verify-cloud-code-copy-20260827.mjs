import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium, webkit, firefox } from 'playwright';
import fs from 'node:fs/promises';

const CLOUD='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const COPY_CODE='abcdefghijklmnopqrstuvwxyzABCDEFGH';
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

const html=`<!doctype html><html><head><meta charset="utf-8"></head><body><div class="controls"></div><div id="status"></div><div id="fstatus"></div><script>window.AI_SHOGI_SAVE={load(){window.__loadCount=(window.__loadCount||0)+1;return true},data(){try{return JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null')}catch(e){return null}},audit(){const x=this.data();return {currentPly:x?.st?.log?.length||0}}};</script><script src="/shogi-v21528/cloud-save21531.js"></script></body></html>`;
await fs.writeFile('cloud-code-copy-test.html',html);

async function runCopy(name,type,userAgent,viewport){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({userAgent,viewport});
  await context.route(`${CLOUD}/**`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})}));
  await context.route(CLOUD,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})}));
  await context.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedSyncCode=text;}}});
  });
  const page=await context.newPage();
  try{
    await page.goto('http://127.0.0.1:4173/cloud-code-copy-test.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudCodeBtn'));
    const initial=await page.evaluate(()=>({audit:AI_SHOGI_CLOUD_SAVE.audit(),disabled:document.getElementById('cloudCodeBtn').disabled}));
    assert.deepEqual(initial.audit.buttons,{cloud:true,codeCopy:true,pull:true});
    assert.equal(initial.disabled,true);
    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),COPY_CODE),true);
    await page.waitForFunction(()=>document.getElementById('cloudCodeBtn').disabled===false);
    const copied=await page.evaluate(async()=>{const ok=await AI_SHOGI_CLOUD_SAVE.copySyncCode();return {ok,copied:window.__copiedSyncCode,status:document.getElementById('status').textContent,audit:AI_SHOGI_CLOUD_SAVE.audit()};});
    assert.equal(copied.ok,true);
    assert.equal(copied.copied,COPY_CODE);
    assert.ok(copied.status.includes('コピー'));
    assert.equal(copied.audit.configured,true);
    assert.equal(copied.audit.buttons.codeCopy,true);
    console.log('CLOUD_CODE_COPY_ENV '+JSON.stringify({name,buttons:copied.audit.buttons,configured:true,clipboardExact:true,statusNonEmpty:true}));
  } finally {
    await context.close();await browser.close();
  }
}

for(const e of ENVS)await runCopy(...e);

function save(marker,savedAt=Date.now()){
  return {version:1,savedAt,ci:25,st:{b:Array(81).fill(null),h:{1:{},'-1':{}},t:1,log:[{cloudTest:marker}],last:null}};
}
async function seed(ctx,deviceId,localSave=null){
  await ctx.addInitScript(({deviceId,CLOUD,localSave})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'',deviceId,api:CLOUD,enabled:false}));
    localStorage.setItem('aiShogiCloudMetaV1',JSON.stringify({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()}));
    if(localSave)localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(localSave));else localStorage.removeItem('aiShogiGameSaveV1');
  },{deviceId,CLOUD,localSave});
}
async function proxyRealCloud(route){
  const req=route.request();
  const h=req.headers();
  const headers={};
  if(h.authorization)headers.Authorization=h.authorization;
  if(h['content-type'])headers['Content-Type']=h['content-type'];
  try{
    const r=await fetch(CLOUD,{method:req.method(),headers,body:['GET','HEAD'].includes(req.method())?undefined:req.postData(),signal:AbortSignal.timeout(20000)});
    const body=await r.text();
    await route.fulfill({status:r.status,contentType:r.headers.get('content-type')||'application/json',body});
  }catch(e){
    await route.fulfill({status:599,contentType:'application/json',body:JSON.stringify({ok:false,error:'proxy_'+String(e.message||e)})});
  }
}

const RUN=Date.now();
const code=crypto.randomBytes(24).toString('base64url');
const wb=await webkit.launch({headless:true}),cb=await chromium.launch({headless:true});
const ic=await wb.newContext({userAgent:UA.iphone,viewport:{width:390,height:844}}),pc=await cb.newContext({userAgent:UA.chrome,viewport:{width:1440,height:900}});
await ic.route(CLOUD,proxyRealCloud);await pc.route(CLOUD,proxyRealCloud);
await seed(ic,`copygate_iphone_${RUN}`,save('IPHONE-A',RUN));
await seed(pc,`copygate_pc_${RUN}`,null);
const ip=await ic.newPage(),cp=await pc.newPage();
try{
  await ip.goto('http://127.0.0.1:4173/cloud-code-copy-test.html',{waitUntil:'domcontentloaded'});
  await ip.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudPullBtn'));
  assert.equal(await ip.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),code),true);
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>=1&&!m.pending&&m.lastError===''},null,{timeout:30000});
  const iRev=await ip.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);

  await cp.goto('http://127.0.0.1:4173/cloud-code-copy-test.html',{waitUntil:'domcontentloaded'});
  await cp.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudPullBtn'));
  assert.equal(await cp.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),code),true);
  await cp.waitForFunction(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null')?.st?.log?.at(-1)?.cloudTest==='IPHONE-A',null,{timeout:30000});
  const p0=await cp.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta());
  assert.equal(p0.revision,iRev);

  await cp.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));window.dispatchEvent(new Event('ai-shogi-local-save'));},save('PC-B',RUN+1000));
  await cp.waitForFunction(r=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>r&&!m.pending&&m.lastError===''},p0.revision,{timeout:30000});
  const pRev=await cp.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);

  await ip.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));window.dispatchEvent(new Event('ai-shogi-local-save'));},save('IPHONE-A-PENDING',RUN+2000));
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.pending&&m.lastError==='conflict'},null,{timeout:30000});
  const protectedPull=await ip.evaluate(()=>AI_SHOGI_CLOUD_SAVE.pull());
  assert.equal(protectedPull.localPending,true);
  assert.equal(await ip.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).st.log.at(-1).cloudTest),'IPHONE-A-PENDING');

  ip.once('dialog',d=>d.accept());
  await ip.click('#cloudPullBtn');
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta(),x=JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null');return !m.pending&&m.lastError===''&&x?.st?.log?.at(-1)?.cloudTest==='PC-B'},null,{timeout:30000});
  const fin=await ip.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),marker:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).st.log.at(-1).cloudTest,loads:window.__loadCount||0}));
  assert.equal(fin.m.revision,pRev);
  assert.equal(fin.marker,'PC-B');
  assert.ok(fin.loads>=1);
  console.log('CLOUD_CODE_COPY_MIXED '+JSON.stringify({iphoneInitialRevision:iRev,pcRevision:pRev,realBackend:true,conflictProtected:true,explicitDiscardRestored:true,finalMarker:fin.marker,restoreLoads:fin.loads}));
} finally {
  await ic.close();await pc.close();await wb.close();await cb.close();
}

console.log('PASS_CLOUD_CODE_COPY_FOUR_ENV_MIXED');
