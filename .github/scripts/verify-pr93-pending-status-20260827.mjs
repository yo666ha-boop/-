import assert from 'node:assert/strict';
import {chromium,webkit,firefox} from 'playwright';
import fs from 'node:fs/promises';

const CLOUD='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const UA={iphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',fire:'Mozilla/5.0 (Linux; U; en-US; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',chrome:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36',firefox:'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0'};
const ENVS=[['DESKTOP_CHROMIUM',chromium,UA.chrome,{width:1440,height:900}],['IPHONE_WEBKIT',webkit,UA.iphone,{width:390,height:844}],['FIRE_SILK',chromium,UA.fire,{width:800,height:1280}],['FIREFOX',firefox,UA.firefox,{width:1440,height:900}]];
const html='<!doctype html><meta charset="utf-8"><body><div class="controls"></div><div id="status"></div><div id="fstatus"></div><script>window.AI_SHOGI_SAVE={load(){window.__loads=(window.__loads||0)+1;return true},data(){try{return JSON.parse(localStorage.getItem("aiShogiGameSaveV1")||"null")}catch{return null}}}</script><script src="/shogi-v21528/cloud-save21531.js"></script></body>';
await fs.writeFile('pr93-pending-test.html',html);
const save=(mark,t=Date.now())=>({version:1,savedAt:t,ci:25,st:{b:Array(81).fill(null),h:{1:{},'-1':{}},t:1,log:[{cloudTest:mark}],last:null}});

async function runEnv(name,type,userAgent,viewport){
 const browser=await type.launch({headless:true}); const ctx=await browser.newContext({userAgent,viewport});
 let revision=0,remote=null;
 await ctx.route(CLOUD,async route=>{const req=route.request(); if(req.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:remote})}); if(req.method()==='PUT'){const body=req.postDataJSON(); revision++; remote={revision,payload:body.payload,device_id:body.deviceId}; return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:remote})});} return route.fulfill({status:405,body:'{}'});});
 const p=await ctx.newPage(); const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 try{
  await p.goto('http://127.0.0.1:4173/pr93-pending-test.html'); await p.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudSaveBtn'));
  assert.equal(await p.evaluate(()=>AI_SHOGI_CLOUD_SAVE.enableWithCode('ぱぱ')),true);
  assert.equal(await p.evaluate(()=>document.getElementById('cloudSaveBtn').textContent),'クラウド同期 ✓');
  await ctx.setOffline(true);
  await p.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));dispatchEvent(new Event('ai-shogi-local-save'));},save('OFFLINE-'+name));
  await p.waitForFunction(()=>AI_SHOGI_CLOUD_SAVE.meta().pending===true);
  const pending=await p.evaluate(()=>({text:document.getElementById('cloudSaveBtn').textContent,m:AI_SHOGI_CLOUD_SAVE.meta(),version:AI_SHOGI_CLOUD_SAVE.version}));
  assert.equal(pending.text,'同期待ち'); assert.equal(pending.m.pending,true); assert.equal(pending.version,'21531f');
  await ctx.setOffline(false); await p.evaluate(()=>dispatchEvent(new Event('online')));
  await p.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>=1&&!m.pending&&m.lastError===''});
  const synced=await p.evaluate(()=>({text:document.getElementById('cloudSaveBtn').textContent,m:AI_SHOGI_CLOUD_SAVE.meta()}));
  assert.equal(synced.text,'クラウド同期 ✓'); assert.equal(synced.m.pending,false); assert.equal(synced.m.lastError,''); assert.deepEqual(errors,[]);
  console.log('PR93_PENDING_ENV '+JSON.stringify({name,pendingText:pending.text,syncedText:synced.text,revision:synced.m.revision,version:pending.version,errors}));
 } finally {await ctx.close();await browser.close();}
}
for(const e of ENVS)await runEnv(...e);

async function proxy(route){const req=route.request(),h=req.headers(),headers={};if(h.authorization)headers.Authorization=h.authorization;if(h['content-type'])headers['Content-Type']=h['content-type'];try{const r=await fetch(CLOUD,{method:req.method(),headers,body:['GET','HEAD'].includes(req.method())?undefined:req.postData(),signal:AbortSignal.timeout(20000)});await route.fulfill({status:r.status,contentType:r.headers.get('content-type')||'application/json',body:await r.text()});}catch(e){await route.fulfill({status:599,contentType:'application/json',body:JSON.stringify({ok:false,error:String(e)})});}}
async function seed(ctx,deviceId,local){await ctx.addInitScript(({deviceId,CLOUD,local})=>{localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'',familyCode:'',codeMode:'',deviceId,api:CLOUD,enabled:false}));localStorage.setItem('aiShogiCloudMetaV1',JSON.stringify({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()}));if(local)localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(local));},{deviceId,CLOUD,local});}
const run=Date.now(),family='ぱぱ検証'+run,idev='pr93pending_iphone_'+run,pdev='pr93pending_pc_'+run;
const wb=await webkit.launch({headless:true}),cb=await chromium.launch({headless:true}),ic=await wb.newContext({userAgent:UA.iphone,viewport:{width:390,height:844}}),pc=await cb.newContext({userAgent:UA.chrome,viewport:{width:1440,height:900}});
await ic.route(CLOUD,proxy);await pc.route(CLOUD,proxy);await seed(ic,idev,save('IPHONE-A',run));await seed(pc,pdev,null);const ip=await ic.newPage(),cp=await pc.newPage();
try{
 await ip.goto('http://127.0.0.1:4173/pr93-pending-test.html');await ip.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE);assert.equal(await ip.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),family),true);await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>=1&&!m.pending&&m.lastError===''});const ir=await ip.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);
 await cp.goto('http://127.0.0.1:4173/pr93-pending-test.html');await cp.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE);assert.equal(await cp.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),family),true);await cp.waitForFunction(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null')?.st?.log?.at(-1)?.cloudTest==='IPHONE-A');const pr0=await cp.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);
 await cp.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));dispatchEvent(new Event('ai-shogi-local-save'));},save('PC-B',run+1000));await cp.waitForFunction(r=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.revision>r&&!m.pending&&m.lastError==='';},pr0);const pr=await cp.evaluate(()=>AI_SHOGI_CLOUD_SAVE.meta().revision);
 await ip.evaluate(v=>{localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(v));dispatchEvent(new Event('ai-shogi-local-save'));},save('IPHONE-STALE',run+2000));await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta();return m.pending&&m.lastError==='conflict'});assert.equal(await ip.evaluate(()=>document.getElementById('cloudSaveBtn').textContent),'同期エラー');const protectedPull=await ip.evaluate(()=>AI_SHOGI_CLOUD_SAVE.pull());assert.equal(protectedPull.localPending,true);assert.equal(await ip.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiGameSaveV1')).st.log.at(-1).cloudTest),'IPHONE-STALE');
 ip.once('dialog',d=>d.accept());await ip.click('#cloudPullBtn');await ip.waitForFunction(()=>{const m=AI_SHOGI_CLOUD_SAVE.meta(),x=JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null');return !m.pending&&m.lastError===''&&x?.st?.log?.at(-1)?.cloudTest==='PC-B';});assert.equal(await ip.evaluate(()=>document.getElementById('cloudSaveBtn').textContent),'クラウド同期 ✓');
 console.log('PR93_PENDING_MIXED '+JSON.stringify({iphoneRevision:ir,pcRevision:pr,conflictProtected:true,explicitRestore:true,realBackend:true,iphoneDevice:idev,pcDevice:pdev}));
} finally {await ic.close();await pc.close();await wb.close();await cb.close();}
console.log('PASS_PR93_PENDING_STATUS_FOUR_ENV_MIXED');