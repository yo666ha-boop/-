import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

const SOURCE_PATH='shogi-v21528/player-name21534b.js';
const EDGE='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const PORT_A=43123;
const PORT_B=49876;
const COOKIE='mitsukiFireAutoSaveKeyV1';
const HIDDEN_SLOT='fire_device_autosave_v1';

const source=await fs.readFile(SOURCE_PATH,'utf8');
for(const marker of [
  'AI_SHOGI_FIRE_PERSIST',
  'mitsukiFireAutoSaveKeyV1',
  'fire_device_autosave_v1',
  'fireLocalStorageV1',
  'MitsukiShogiFire\\//',
  "out.r.status===409",
  "out.r.status===413",
]) assert.ok(source.includes(marker),'missing Fire persistence marker: '+marker);

const seededSave={
  version:1,
  savedAt:1788192000123,
  reason:'fire-port-a-test',
  ci:3,
  st:{b:Array(81).fill(null),h:{S:{},G:{}},log:[{from:60,to:51,p:'P'}],t:'S'},
  hist:[],repHistory:[],gameCounted:false,lastHumanBefore:null,lastHumanMove:null,reviewTrail:[],speechMood:'normal',lastSpeech:''
};
const seededStats={rating:1666,w:12,l:4,d:1,chars:Array.from({length:26},()=>({w:0,l:0,d:0}))};

function html(seed){
  const pre=seed?`<script>window.MitsukiFireNative={};localStorage.setItem('aiShogiGameSaveV1',${JSON.stringify(JSON.stringify(seededSave))});localStorage.setItem('aiShogiSenseiStatsV27',${JSON.stringify(JSON.stringify(seededStats))});</script>`:`<script>window.MitsukiFireNative={};</script>`;
  return `<!doctype html><meta charset="utf-8"><div id="statsMain">あなた R1500</div><div id="statsSub"></div><div id="status"></div><div id="fstatus"></div><div id="sHand"><b>あなた</b></div><div id="fsHand"><b>あなた</b></div>${pre}<script src="/player.js"></script>`;
}
function server(port){
  const s=http.createServer((req,res)=>{
    if(req.url?.startsWith('/player.js')){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'});res.end(source);return;}
    const seed=new URL(req.url||'/',`http://127.0.0.1:${port}`).searchParams.get('seed')==='1';
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html(seed));
  });
  return new Promise(resolve=>s.listen(port,'127.0.0.1',()=>resolve(s)));
}

const servers=[await server(PORT_A),await server(PORT_B)];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
let remoteRecord=null;
let revision=0;

await context.route(EDGE+'**',async route=>{
  const req=route.request(),origin=req.headers()['origin']||'';
  const cors={
    'access-control-allow-origin':origin,
    'access-control-allow-methods':'GET,PUT,DELETE,OPTIONS',
    'access-control-allow-headers':'Authorization,Content-Type',
    'cache-control':'no-store',
    'content-type':'application/json; charset=utf-8'
  };
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:cors,body:''});return;}
  const url=new URL(req.url());
  if(req.method()==='GET'&&url.searchParams.get('slot')===HIDDEN_SLOT){await route.fulfill({status:200,headers:cors,body:JSON.stringify({ok:true,record:remoteRecord})});return;}
  if(req.method()==='PUT'){
    const body=JSON.parse(req.postData()||'{}');
    assert.equal(body.slotId,HIDDEN_SLOT);
    assert.ok(body.payload?.fireAutoBackup?.deviceId?.startsWith('fire_'));
    revision++;
    remoteRecord={slotId:HIDDEN_SLOT,slotName:body.slotName,revision,payload:body.payload};
    await route.fulfill({status:200,headers:cors,body:JSON.stringify({ok:true,record:remoteRecord})});return;
  }
  if(req.method()==='DELETE'){remoteRecord=null;await route.fulfill({status:200,headers:cors,body:JSON.stringify({ok:true,mode:'slot',slotId:HIDDEN_SLOT,deleted:1})});return;}
  await route.fulfill({status:404,headers:cors,body:JSON.stringify({ok:false,error:'test_route'})});
});

try{
  const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT_A}/?seed=1`,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.AI_SHOGI_FIRE_PERSIST,{timeout:10000});
  const first=await page.evaluate(async()=>({ready:await window.AI_SHOGI_FIRE_PERSIST.ready,push:await window.AI_SHOGI_FIRE_PERSIST.push(),audit:window.AI_SHOGI_FIRE_PERSIST.audit(),cookie:document.cookie}));
  assert.equal(first.push.ok,true,'port A push failed: '+JSON.stringify(first));
  assert.ok(first.cookie.includes(COOKIE+'='),'device cookie was not created');
  assert.equal(remoteRecord?.payload?.savedAt,seededSave.savedAt);
  assert.equal(remoteRecord?.payload?.playerStats?.rating,1666);
  assert.equal(remoteRecord?.payload?.fireLocalStorageV1?.aiShogiSenseiStatsV27,JSON.stringify(seededStats));

  await page.goto(`http://127.0.0.1:${PORT_B}/`,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.AI_SHOGI_FIRE_PERSIST,{timeout:10000});
  const second=await page.evaluate(async()=>{const ready=await window.AI_SHOGI_FIRE_PERSIST.ready;await new Promise(r=>setTimeout(r,100));return{ready,audit:window.AI_SHOGI_FIRE_PERSIST.audit(),cookie:document.cookie,save:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),stats:JSON.parse(localStorage.getItem('aiShogiSenseiStatsV27')||'null')}});
  assert.equal(second.ready.ok,true,'port B hydrate failed: '+JSON.stringify(second));
  assert.equal(second.ready.restored,true,'port B did not restore remote save');
  assert.ok(second.cookie.includes(COOKIE+'='),'device cookie did not cross ports');
  assert.equal(second.save?.savedAt,seededSave.savedAt);
  assert.equal(second.save?.st?.log?.length,1);
  assert.equal(second.stats?.rating,1666);
  assert.equal(second.audit.localPly,1);
  console.log('PASS_FIRE_OTA_BROWSER_PORT_CHANGE '+JSON.stringify({portA:PORT_A,portB:PORT_B,cookieAcrossPorts:true,restoredSavedAt:second.save.savedAt,restoredRating:second.stats.rating}));
} finally {
  await browser.close();
  for(const s of servers)await new Promise(resolve=>s.close(resolve));
}

// Live edge smoke: the deployed cloud service must accept the same secret from two different
// localhost ports, because the Fire APK chooses a fresh loopback port on each launch.
const bytes=crypto.getRandomValues(new Uint8Array(32));
const key=Buffer.from(bytes).toString('base64url');
const slot='fire_ota_ci_'+Date.now();
const livePayload={version:1,savedAt:Date.now(),st:{b:Array(81).fill(null),h:{S:{},G:{}},log:[]}};
const headersFor=origin=>({Authorization:'Bearer '+key,'Content-Type':'application/json',Origin:origin});
try{
  const a=`http://127.0.0.1:${PORT_A}`,b=`http://127.0.0.1:${PORT_B}`;
  const put=await fetch(EDGE,{method:'PUT',headers:headersFor(a),body:JSON.stringify({slotId:slot,slotName:'Fire OTA CI',baseRevision:0,deviceId:'fire_ota_ci',payload:livePayload}),cache:'no-store'});
  const putJson=await put.json();
  assert.equal(put.status,200,JSON.stringify(putJson));
  assert.equal(put.headers.get('access-control-allow-origin'),a);
  const get=await fetch(EDGE+'?slot='+encodeURIComponent(slot),{headers:headersFor(b),cache:'no-store'});
  const getJson=await get.json();
  assert.equal(get.status,200,JSON.stringify(getJson));
  assert.equal(get.headers.get('access-control-allow-origin'),b);
  assert.equal(getJson.record?.payload?.savedAt,livePayload.savedAt);
  console.log('PASS_FIRE_OTA_LIVE_EDGE_PORT_CHANGE '+JSON.stringify({putOrigin:a,getOrigin:b,revision:getJson.record?.revision||0}));
} finally {
  await fetch(EDGE,{method:'DELETE',headers:headersFor(`http://127.0.0.1:${PORT_B}`),body:JSON.stringify({mode:'slot',slotId:slot}),cache:'no-store'}).catch(()=>{});
}
