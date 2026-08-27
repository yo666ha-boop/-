import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { webkit } from 'playwright';

const cloudSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const slotSource=fs.readFileSync('shogi-v21528/cloud-save-slot-ui21532b.js','utf8');
const coiSource=fs.readFileSync('shogi-v21528/coi-serviceworker.js','utf8');
assert.match(coiSource,/cloud-save-slot-ui21532b\.js\?v=21532b/);

const makeSave=(savedAt=5000,ply=22)=>({version:1,savedAt,ci:1,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});
const first={slotId:'slot_first',slotName:'1局目',revision:4,updatedAt:4000,savedAt:4000,ply:12,payload:makeSave(4000,12)};
const backend=[first];
let putBody=null;

const server=http.createServer((req,res)=>{
  if(req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end('<!doctype html><meta charset="utf-8"><div id="status"></div><div id="cloudSaveActions" class="controls"></div>');
    return;
  }
  res.writeHead(404);res.end('404');
});
await new Promise(r=>server.listen(4198,'127.0.0.1',r));

let browser;
try{
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  await page.route('https://example.test/shogi-save**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(request.method()==='GET'&&url.searchParams.get('mode')==='list'){
      const slots=backend.map(({payload,...slot})=>slot);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots})});
      return;
    }
    if(request.method()==='PUT'){
      putBody=JSON.parse(request.postData()||'{}');
      assert.notEqual(putBody.slotId,'slot_first');
      assert.equal(putBody.slotName,'2局目');
      assert.equal(putBody.baseRevision,0);
      assert.equal(backend.length,1,'first slot must still exist before second insert');
      const record={slotId:putBody.slotId,slotName:putBody.slotName,revision:1,updatedAt:6000,savedAt:5000,ply:22,payload:putBody.payload};
      backend.push(record);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record})});
      return;
    }
    await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected_request'})});
  });

  await page.goto('http://127.0.0.1:4198/',{waitUntil:'domcontentloaded'});
  await page.evaluate(save=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'A'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_webkit_newslot',api:'https://example.test/shogi-save',enabled:true,activeSlotId:'slot_first',activeSlotName:'1局目',multislotReady:true}));
    localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify({slots:{slot_first:{revision:4,lastSyncedSavedAt:4000,pending:false,lastError:'',updatedAt:4000}}}));
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify(save));
  },makeSave(5000,22));

  await page.addScriptTag({content:cloudSource});
  await page.addScriptTag({content:slotSource});
  await page.waitForSelector('#cloudNewSlotBtn',{state:'visible',timeout:5000});
  assert.equal(await page.textContent('#cloudNewSlotBtn'),'新しい保存を作る');

  page.once('dialog',async dialog=>{
    assert.match(dialog.message(),/新しい保存の名前/);
    await dialog.accept('2局目');
  });
  await page.click('#cloudNewSlotBtn');
  await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE?.audit?.().activeSlotName==='2局目'&&!window.AI_SHOGI_CLOUD_SAVE.audit().meta.pending,null,{timeout:5000});

  const listed=await page.evaluate(()=>window.AI_SHOGI_CLOUD_SAVE.listSlots());
  assert.equal(listed.ok,true);
  assert.equal(listed.slots.length,2,'restore list must contain both saves');
  assert.deepEqual(listed.slots.map(x=>x.slotName),['1局目','2局目']);
  assert.ok(putBody,'second slot must be PUT to backend');
  assert.notEqual(putBody.slotId,'slot_first');
  assert.equal(backend[0].slotName,'1局目');
  assert.equal(backend[0].revision,4);
  assert.equal(backend[1].slotName,'2局目');

  const audit=await page.evaluate(()=>window.AI_SHOGI_CLOUD_SAVE.audit());
  assert.equal(audit.activeSlotName,'2局目');
  assert.equal(audit.meta.revision,1);
  assert.equal(audit.meta.pending,false);
  assert.deepEqual(errors,[]);
  console.log('PASS WebKit new cloud save UI: button click preserves first save and restore list grows from 1 to 2',JSON.stringify({names:listed.slots.map(x=>x.slotName),active:audit.activeSlotName,revision:audit.meta.revision}));
} finally {
  if(browser)await browser.close();
  await new Promise(r=>server.close(r));
}
