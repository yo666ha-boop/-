import assert from 'node:assert/strict';
import { chromium, webkit, firefox } from 'playwright';

const APP='https://ai-shogi-yaneuraou-iphone.vercel.app/shogi-v21528/index.html';
const CLOUD='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const FAMILY='みかみ';
const RUN=Date.now();
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

async function runEnv(name,type,userAgent,viewport){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({userAgent,viewport});
  await context.route(CLOUD,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})}));
  await context.addInitScript(()=>{
    localStorage.removeItem('aiShogiCloudConfigV1');localStorage.removeItem('aiShogiCloudMetaV1');localStorage.removeItem('aiShogiGameSaveV1');
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedFamilyCode=text;}}});
  });
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  try{
    await page.goto(APP+'?pr92final='+name+'-'+RUN,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.crossOriginIsolated&&document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_SAVE&&window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('saveResumeHub'),null,{timeout:150000});
    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),FAMILY),true);
    await page.waitForTimeout(100);
    const state=await page.evaluate(async()=>{
      window.__copiedFamilyCode='';const copied=await AI_SHOGI_CLOUD_SAVE.copySyncCode();
      const raw=JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'null');
      return {
        coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,unique:new Set([...document.querySelectorAll('#chars .ch')].map(x=>x.dataset.i)).size,
        cloudVersion:AI_SHOGI_CLOUD_SAVE.version,raw,audit:AI_SHOGI_CLOUD_SAVE.audit(),copied,copiedText:window.__copiedFamilyCode,
        codeText:document.getElementById('cloudCodeBtn')?.textContent||'',guide:document.getElementById('cloudSaveGuide')?.textContent||'',
        grouped:['cloudSaveBtn','cloudCodeBtn','cloudPullBtn'].every(id=>document.getElementById(id)?.parentElement?.id==='cloudSaveActions'),
        overflow:document.documentElement.scrollWidth>innerWidth+1
      };
    });
    assert.equal(state.coi,true);assert.equal(state.cards,26);assert.equal(state.unique,26);assert.equal(state.cloudVersion,'21531e');
    assert.equal(state.raw.familyCode,FAMILY);assert.equal(state.raw.codeMode,'family');assert.match(state.raw.syncKey,/^[A-Za-z0-9_-]{43}$/);
    assert.equal(state.audit.configured,true);assert.equal(state.audit.codeMode,'family');assert.equal(state.audit.familyCodeLength,3);
    assert.equal(state.copied,true);assert.equal(state.copiedText,FAMILY);assert.equal(state.codeText,'家族コードをコピー');assert.ok(state.guide.includes('家族コード'));
    assert.equal(state.grouped,true);assert.equal(state.overflow,false);assert.deepEqual(pageErrors,[]);
    console.log('PR92_PUBLIC_ENV '+JSON.stringify({name,viewport,coi:true,cards:26,unique:26,cloudVersion:'21531e',hiragana:true,clipboardExact:true,guideFamilyCode:true,grouped:true,overflow:false,pageErrors}));
  } finally {await context.close();await browser.close();}
}
for(const e of ENVS)await runEnv(...e);

function save(marker,savedAt=Date.now()){
  return {version:1,savedAt,reason:'test',ci:0,st:{b:Array(81).fill(null),h:{1:{},'-1':{}},t:1,log:[{cloudTest:marker}],last:null},hist:[],repHistory:[],gameCounted:false,lastHumanBefore:null,lastHumanMove:null,reviewTrail:[],speechMood:'normal',lastSpeech:'',statusText:'',result:null};
}
async function proxyRealCloud(route){
  const req=route.request(),h=req.headers(),headers={};if(h.authorization)headers.Authorization=h.authorization;if(h['content-type'])headers['Content-Type']=h['content-type'];
  try{const r=await fetch(CLOUD,{method:req.method(),headers,body:['GET','HEAD'].includes(req.method())?undefined:req.postData(),signal:AbortSignal.timeout(20000)});await route.fulfill({status:r.status,contentType:r.headers.get('content-type')||'application/json',body:await r.text()});}
  catch(e){await route.fulfill({status:599,contentType:'application/json',body:JSON.stringify({ok:false,error:'proxy_'+String(e.message||e)})});}
}
async function seed(ctx,deviceId,localSave=null){
  await ctx.addInitScript(({deviceId,CLOUD,localSave})=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'',familyCode:'',codeMode:'',deviceId,api:CLOUD,enabled:false}));
    localStorage.setItem('aiShogiCloudMetaV1',JSON.stringify({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()}));
    if(localSave)localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(localSave));else localStorage.removeItem('aiShogiGameSaveV1');
  },{deviceId,CLOUD,localSave});
}
const familyCode='みかみ本番検証'+RUN,iphoneDevice=`pr92final_iphone_${RUN}`,pcDevice=`pr92final_pc_${RUN}`;
const wb=await webkit.launch({headless:true}),cb=await chromium.launch({headless:true});
const ic=await wb.newContext({userAgent:UA.iphone,viewport:{width:390,height:844}}),pc=await cb.newContext({userAgent:UA.chrome,viewport:{width:1440,height:900}});
await ic.route(CLOUD,proxyRealCloud);await pc.route(CLOUD,proxyRealCloud);await seed(ic,iphoneDevice,save('IPHONE-A',RUN));await seed(pc,pcDevice,null);
const ip=await ic.newPage(),cp=await pc.newPage();
try{
  await ip.goto(APP+'?mixed=i-'+RUN,{waitUntil:'domcontentloaded',timeout:120000});
  await ip.waitForFunction(()=>window.crossOriginIsolated&&window.AI_SHOGI_CLOUD_SAVE&&window.AI_SHOGI_SAVE&&document.querySelectorAll('#chars .ch').length===26,null,{timeout:150000});
  assert.equal(await ip.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),familyCode),true);
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>=1&&!m.pending&&m.lastError===''},null,{timeout:30000});
  const iState=await ip.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'))}));

  await cp.goto(APP+'?mixed=p-'+RUN,{waitUntil:'domcontentloaded',timeout:120000});
  await cp.waitForFunction(()=>window.crossOriginIsolated&&window.AI_SHOGI_CLOUD_SAVE&&window.AI_SHOGI_SAVE&&document.querySelectorAll('#chars .ch').length===26,null,{timeout:150000});
  assert.equal(await cp.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),familyCode),true);
  await cp.waitForFunction(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null')?.st?.log?.at(-1)?.cloudTest==='IPHONE-A',null,{timeout:30000});
  const p0=await cp.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'))}));
  assert.equal(p0.cfg.syncKey,iState.cfg.syncKey);assert.equal(p0.cfg.familyCode,familyCode);
  await cp.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));window.dispatchEvent(new Event('ai-shogi-local-save'));},save('PC-B',RUN+1000));
  await cp.waitForFunction(r=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>r&&!m.pending&&m.lastError===''},p0.m.revision,{timeout:30000});
  const pRev=await cp.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);
  await ip.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));window.dispatchEvent(new Event('ai-shogi-local-save'));},save('IPHONE-PENDING',RUN+2000));
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.pending&&m.lastError==='conflict'},null,{timeout:30000});
  const protectedPull=await ip.evaluate(()=>AI_SHOGI_CLOUD_SAVE.pull());assert.equal(protectedPull.localPending,true);
  ip.once('dialog',d=>d.accept());await ip.click('#cloudPullBtn');
  await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta(),x=JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null');return !m.pending&&m.lastError===''&&x?.st?.log?.at(-1)?.cloudTest==='PC-B'},null,{timeout:30000});
  const fin=await ip.evaluate(()=>({m:AI_SHOGI_CLOUD_SAVE.meta(),marker:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).st.log.at(-1).cloudTest,cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1'))}));
  console.log('PR92_PUBLIC_MIXED '+JSON.stringify({iphoneInitialRevision:iState.m.revision,pcRevision:pRev,iphoneFinalRevision:fin.m.revision,realBackend:true,sameDerivedKey:p0.cfg.syncKey===iState.cfg.syncKey,hiraganaFamilyCode:fin.cfg.familyCode===familyCode,conflictProtected:true,explicitDiscardRestored:fin.marker==='PC-B',pending:fin.m.pending,lastError:fin.m.lastError,iphoneDevice,pcDevice}));
} finally {await ic.close();await pc.close();await wb.close();await cb.close();}
console.log('PASS_POSTMERGE_PR92_PUBLIC_FAMILY_CODE_ALL');
