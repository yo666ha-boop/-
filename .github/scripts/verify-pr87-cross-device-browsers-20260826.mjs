import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { chromium, webkit, firefox } from 'playwright';

const clientSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const PORT=4199,ORIGIN=`http://127.0.0.1:${PORT}`,API=`${ORIGIN}/api/shogi-save`;
const stores=new Map();
const CFG='aiShogiCloudConfigV1',META='aiShogiCloudMetaV1',SAVE='aiShogiGameSaveV1';
function payload(tag,savedAt=Date.now()){return {version:1,savedAt,st:{b:Array(81).fill(null),h:{b:{},w:{}},log:[tag]}}}
function keyFrom(req){const m=String(req.headers.authorization||'').match(/^Bearer\s+([A-Za-z0-9_-]{24,128})$/);return m?m[1]:''}
async function readJson(req){const parts=[];for await(const c of req)parts.push(c);return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')}
const fixture=`<!doctype html><meta charset="utf-8"><div class="controls"></div><div id="status"></div><div id="fstatus"></div><script>window.__loadCount=0;window.AI_SHOGI_SAVE={load(){window.__loadCount++}}</script><script src="/cloud-save21531.js"></script>`;
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
  if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');return res.end(fixture)}
  if(req.url==='/cloud-save21531.js'){res.setHeader('Content-Type','application/javascript');return res.end(clientSource)}
  if(req.url==='/api/shogi-save'){
    const key=keyFrom(req);res.setHeader('Content-Type','application/json');if(!key){res.statusCode=401;return res.end(JSON.stringify({ok:false,error:'invalid_sync_key'}))}
    if(req.method==='GET')return res.end(JSON.stringify({ok:true,record:stores.get(key)||null}));
    if(req.method==='PUT'){
      const body=await readJson(req),current=stores.get(key)||null;
      if((current&&current.revision!==body.baseRevision)||(!current&&body.baseRevision!==0)){res.statusCode=409;return res.end(JSON.stringify({ok:false,error:'revision_conflict',record:current}))}
      const record={revision:body.baseRevision+1,updatedAt:Date.now(),deviceId:body.deviceId,payload:body.payload};stores.set(key,record);return res.end(JSON.stringify({ok:true,record}));
    }
  }
  res.statusCode=404;res.end('not found');
});
await new Promise((resolve,reject)=>server.listen(PORT,'127.0.0.1',e=>e?reject(e):resolve()));

async function seed(ctx,{deviceId,local=null,api=API}){await ctx.addInitScript(({CFG,META,SAVE,deviceId,local,api})=>{localStorage.setItem(CFG,JSON.stringify({syncKey:'',deviceId,api,enabled:false}));localStorage.setItem(META,JSON.stringify({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()}));if(local)localStorage.setItem(SAVE,JSON.stringify(local));else localStorage.removeItem(SAVE)}, {CFG,META,SAVE,deviceId,local,api})}
async function state(page){return page.evaluate(({CFG,META,SAVE})=>({cfg:JSON.parse(localStorage.getItem(CFG)||'null'),meta:JSON.parse(localStorage.getItem(META)||'null'),save:JSON.parse(localStorage.getItem(SAVE)||'null'),version:window.AI_SHOGI_CLOUD_SAVE?.version,backend:window.AI_SHOGI_CLOUD_SAVE?.audit().backend,loadCount:window.__loadCount||0,buttons:{cloud:!!document.getElementById('cloudSaveBtn'),pull:!!document.getElementById('cloudPullBtn')},coi:crossOriginIsolated}),{CFG,META,SAVE})}
async function setLocal(page,p){await page.evaluate(({SAVE,p})=>{localStorage.setItem(SAVE,JSON.stringify(p));window.dispatchEvent(new Event('ai-shogi-local-save'))},{SAVE,p})}
async function waitRemote(code,rev){const end=Date.now()+5000;while(Date.now()<end){const r=stores.get(code);if(r?.revision>=rev)return r;await new Promise(r=>setTimeout(r,50))}throw new Error('remote timeout')}

for(const [name,type] of [['chromium',chromium],['webkit',webkit],['firefox',firefox]]){
  stores.clear();const errors=[];const browser=await type.launch({headless:true});
  try{
    const code=(name[0].toUpperCase()+'S').repeat(16).slice(0,32),newCode=(name[0].toUpperCase()+'N').repeat(16).slice(0,32);
    const a=await browser.newContext(),b=await browser.newContext();await seed(a,{deviceId:`${name}_a`,local:payload(`${name}-A`,1000)});await seed(b,{deviceId:`${name}_b`});
    const pa=await a.newPage(),pb=await b.newPage();for(const p of[pa,pb])p.on('pageerror',e=>errors.push(String(e)));
    await pa.goto(`${ORIGIN}/fixture.html`);await pb.goto(`${ORIGIN}/fixture.html`);await pa.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE?.version==='21531c'&&document.getElementById('cloudSaveBtn'));await pb.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE?.version==='21531c'&&document.getElementById('cloudSaveBtn'));
    let sa=await state(pa),sb=await state(pb);assert.equal(sa.coi,true);assert.equal(sb.coi,true);assert.equal(sa.backend,'supabase-edge-cas-v1');assert.deepEqual(sa.buttons,{cloud:true,pull:true});
    assert.equal(await pa.evaluate(code=>window.AI_SHOGI_CLOUD_SAVE.enableWithCode(code),code),true);let remote=await waitRemote(code,1);assert.equal(remote.payload.st.log[0],`${name}-A`);
    assert.equal(await pb.evaluate(code=>window.AI_SHOGI_CLOUD_SAVE.enableWithCode(code),code),true);await pb.waitForFunction(SAVE=>JSON.parse(localStorage.getItem(SAVE)||'null')?.st?.log?.[0]?.endsWith('-A'),SAVE);sb=await state(pb);assert.equal(sb.meta.revision,1);assert.equal(sb.loadCount,1);
    await setLocal(pb,payload(`${name}-B`,2000));remote=await waitRemote(code,2);assert.equal(remote.payload.st.log[0],`${name}-B`);
    await setLocal(pa,payload(`${name}-A-pending`,3000));const blocked=await pa.evaluate(()=>window.AI_SHOGI_CLOUD_SAVE.pull());assert.equal(blocked.localPending,true);sa=await state(pa);assert.equal(sa.save.st.log[0],`${name}-A-pending`);assert.equal(sa.meta.pending,true);
    await new Promise(r=>setTimeout(r,750));sa=await state(pa);assert.equal(sa.meta.pending,true);assert.ok(['conflict','local_pending'].includes(sa.meta.lastError));
    pa.once('dialog',d=>d.accept());await pa.click('#cloudPullBtn');await pa.waitForFunction(({SAVE,x})=>JSON.parse(localStorage.getItem(SAVE)||'null')?.st?.log?.[0]===x,{SAVE,x:`${name}-B`});sa=await state(pa);assert.equal(sa.meta.revision,2);assert.equal(sa.meta.pending,false);
    assert.equal(await pa.evaluate(code=>window.AI_SHOGI_CLOUD_SAVE.enableWithCode(code),newCode),true);remote=await waitRemote(newCode,1);sa=await state(pa);assert.equal(sa.meta.revision,1);assert.equal(remote.payload.st.log[0],`${name}-B`);
    assert.deepEqual(errors,[]);console.log('PR87_CROSS_DEVICE_BROWSER_ROW '+JSON.stringify({browser:name,coi:true,deviceBRestore:true,conflictProtected:true,explicitDiscardRestore:true,syncKeyReset:true,version:sa.version,backend:sa.backend,errors}));
    await a.close();await b.close();
  }finally{await browser.close()}
}

try{
  const browser=await chromium.launch({headless:true}),ctx=await browser.newContext();
  await seed(ctx,{deviceId:'legacy_dev',local:null,api:'https://ai-shogi-yaneuraou-iphone.vercel.app/api/shogi-save'});const p=await ctx.newPage();await p.goto(`${ORIGIN}/fixture.html`);await p.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE?.version==='21531c');const c=await p.evaluate(()=>window.AI_SHOGI_CLOUD_SAVE.config());assert.equal(c.api,'https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save');await browser.close();console.log('PASS_PR87_LEGACY_API_AUTO_MIGRATION');
}finally{await new Promise(r=>server.close(r))}
console.log('PASS_PR87_CROSS_DEVICE_THREE_BROWSERS');
