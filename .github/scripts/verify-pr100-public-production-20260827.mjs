import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const PUBLIC='https://ai-shogi-yaneuraou-iphone.vercel.app/';
const API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const MAIN_SHA='8193182868cd51a45e201717719f2ee12f964ef5';
const makeSave=(savedAt,ply)=>({version:1,savedAt,ci:2,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});

function initialState(){
  const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  return {b,h:{1:{},'-1':{}},t:1,log:[],last:null};
}

async function runCase(browserType,label,contextOptions={}){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({...contextOptions,serviceWorkers:'block'});
  const page=await context.newPage();
  const pageErrors=[],consoleErrors=[],dialogs=[],requests=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('dialog',async d=>{
    dialogs.push({type:d.type(),message:d.message()});
    if(d.type()==='confirm')await d.accept();else await d.dismiss();
  });

  const slots=[
    {slotId:'slot_public_one',slotName:'パパ保存',revision:3,updatedAt:3000,savedAt:3000,ply:10},
    {slotId:'slot_public_two',slotName:'みっちゃん',revision:7,updatedAt:7000,savedAt:7000,ply:22},
  ];
  await page.route('**/functions/v1/shogi-save**',async route=>{
    const req=route.request(),u=new URL(req.url());
    requests.push({method:req.method(),url:req.url(),auth:req.headers()['authorization']||''});
    if(req.method()==='GET'&&u.searchParams.get('mode')==='list'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,slots})});return;
    }
    if(req.method()==='GET'&&u.searchParams.get('slot')==='slot_current'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})});return;
    }
    if(req.method()==='GET'&&u.searchParams.get('slot')==='slot_public_two'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:'slot_public_two',slotName:'みっちゃん',revision:7,payload:makeSave(7000,22)}})});return;
    }
    if(req.method()==='PUT'){
      const body=JSON.parse(req.postData()||'{}');
      const rev=Number(body.baseRevision||0)+1;
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:{slotId:body.slotId||'slot_current',slotName:body.slotName||'保存',revision:rev,payload:body.payload||makeSave(7100,22)}})});return;
    }
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'unexpected_public_gate_request'})});
  });

  const url=PUBLIC+'?pr100-public='+encodeURIComponent(label)+'-'+Date.now();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  assert.equal(response?.status(),200,label+' public root status');
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForFunction(()=>window.AI_SHOGI_FAMILY_SWITCHER?.version==='21533a'&&window.AI_SHOGI_CLOUD_SAVE?.version==='21532a'&&!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE&&!!window.AI_SHOGI_GAME_SAVE,{timeout:120000});

  const staticAudit=await page.evaluate(async mainSha=>{
    const [rootText,familyText]=await Promise.all([
      fetch('/coi-serviceworker.js?public-audit='+mainSha,{cache:'no-store'}).then(r=>r.text()),
      fetch('/shogi-v21528/cloud-family-switcher21533.js?v=21533a&public-audit='+mainSha,{cache:'no-store'}).then(r=>r.text()),
    ]);
    const top=window.AI_SHOGI_YANEURAOU_TOP5;
    const sound=window.AI_SHOGI_PIECE_SOUND?.audit?.()||null;
    const save=window.AI_SHOGI_GAME_SAVE;
    return {
      coi:crossOriginIsolated,
      cards:document.querySelectorAll('#chars .ch').length,
      rootShim:!!window.__AI_SHOGI_ROOT_COI_SHIM_21533A,
      rootHas21533a:rootText.includes('coi-serviceworker.js?v=21533a')&&rootText.includes('__AI_SHOGI_ROOT_COI_SHIM_21533A'),
      familyArtifact:familyText.includes("version:'21533a'")&&familyText.includes('failed pull')===false&&familyText.includes('元の家族コードと保存先に戻しました'),
      familyVersion:window.AI_SHOGI_FAMILY_SWITCHER?.version||'',
      cloud:window.AI_SHOGI_CLOUD_SAVE?.audit?.()||null,
      top5:{version:top.version,names:top.names,ratings:top.ratings,sharedWorker:top.sharedWorker,engine:top.engine,openingMode:top.openingMode},
      save:{version:save.version,saveBtn:!!document.getElementById('saveGameBtn21530'),resumeBtn:!!document.getElementById('resumeGameBtn21530')},
      sound,
      overflow:document.documentElement.scrollWidth>window.innerWidth,
      badge:document.querySelector('.badge')?.textContent||'',
      ua:navigator.userAgent,
    };
  },MAIN_SHA);
  assert.equal(staticAudit.coi,true,label+' COI');
  assert.equal(staticAudit.cards,26,label+' cards');
  assert.equal(staticAudit.rootShim,true,label+' root shim guard');
  assert.equal(staticAudit.rootHas21533a,true,label+' public root 21533a');
  assert.equal(staticAudit.familyArtifact,true,label+' public family artifact');
  assert.equal(staticAudit.familyVersion,'21533a');
  assert.equal(staticAudit.cloud?.backend,'supabase-edge-cas-multislot-v2');
  assert.equal(staticAudit.top5.version,'2.15.32-tune5');
  assert.deepEqual(staticAudit.top5.names,['みつき','みっちゃん','あき王','おにまま','まま']);
  assert.deepEqual(staticAudit.top5.ratings,[3000,2850,2700,2600,2500]);
  assert.equal(staticAudit.top5.sharedWorker,true);
  assert.match(staticAudit.top5.engine,/YaneuraOu/);
  assert.equal(staticAudit.top5.openingMode,'engine-from-move-1');
  assert.equal(staticAudit.save.version,'2.15.30');
  assert.equal(staticAudit.save.saveBtn,true);assert.equal(staticAudit.save.resumeBtn,true);
  assert.equal(staticAudit.sound?.enabled,true,label+' sound enabled');
  assert.ok(Number(staticAudit.sound?.buttons||0)>=2,label+' sound buttons');
  assert.equal(staticAudit.overflow,false,label+' initial overflow');

  const saveRoundTrip=await page.evaluate(()=>{
    const api=window.AI_SHOGI_GAME_SAVE;
    const before=api.snapshot(),saved=api.saveSilent(),has=api.hasSave(),loaded=api.load(),after=api.snapshot();
    return {saved,has,loaded,beforeCi:before.ci,afterCi:after.ci,beforeLog:before.st.log.length,afterLog:after.st.log.length};
  });
  assert.equal(saveRoundTrip.saved,true);assert.equal(saveRoundTrip.has,true);assert.equal(saveRoundTrip.loaded,true);
  assert.equal(saveRoundTrip.beforeCi,saveRoundTrip.afterCi);assert.equal(saveRoundTrip.beforeLog,saveRoundTrip.afterLog);

  const engineAudit=await page.evaluate(async state=>{
    const future=window.AI_SHOGI_YANEURAOU_FUTURE;
    await future.init();
    const fs=future.status();
    const fm=await future.bestMove(state,{ms:300,multiPV:1});
    const top=window.AI_SHOGI_YANEURAOU_TOP5;
    await top.init();
    const tm=await top.bestMove(state,4);
    return {futureStatus:fs,futureMove:fm,topMove:tm};
  },initialState());
  assert.equal(engineAudit.futureStatus?.ready,true,label+' Future ready');
  assert.equal(engineAudit.futureStatus?.worker,true,label+' Future worker');
  assert.ok(engineAudit.futureMove?.move||engineAudit.futureMove?.resign||engineAudit.futureMove?.declareWin,label+' Future bestmove');
  assert.match(engineAudit.futureMove?.info?.engine||'',/YaneuraOu/);
  assert.ok(engineAudit.topMove?.move||engineAudit.topMove?.resign||engineAudit.topMove?.declareWin,label+' TOP5 bestmove');
  assert.match(engineAudit.topMove?.info?.engine||'',/YaneuraOu/);
  assert.equal(engineAudit.topMove?.info?.personality,'stable');

  await page.evaluate(api=>{
    localStorage.setItem('aiShogiCloudConfigV1',JSON.stringify({syncKey:'A'.repeat(32),familyCode:'みかみ',codeMode:'family',deviceId:'public_gate',api,enabled:true,activeSlotId:'slot_current',activeSlotName:'いまの保存',multislotReady:true}));
    localStorage.setItem('aiShogiCloudMetaV2',JSON.stringify({slots:{slot_current:{revision:2,lastSyncedSavedAt:2000,pending:true,lastError:'',updatedAt:2500}}}));
    localStorage.setItem('aiShogiGameSaveV1',JSON.stringify({version:1,savedAt:2500,ci:2,st:{b:Array(81).fill(null),h:{},log:[{i:1},{i:2}]}}));
    localStorage.setItem('aiShogiFamilyCodeHistoryV1',JSON.stringify([{code:'ぱぱ',lastUsed:1000}]));
  },API);
  await page.waitForFunction(()=>document.getElementById('cloudFamilySwitchBtn')?.textContent.includes('みかみ'),{timeout:10000});
  await page.getByRole('button',{name:/家族コード：みかみ/}).click();
  await page.getByRole('button',{name:'ぱぱ',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="家族コードの保存を選ぶ"]'),{timeout:30000});
  const inspected=await page.evaluate(()=>JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'));
  assert.equal(inspected.familyCode,'みかみ',label+' list inspection changed family early');
  assert.equal(inspected.activeSlotId,'slot_current',label+' list inspection changed slot early');
  const target=page.getByRole('button',{name:/みっちゃん.*22手/});
  const minHeight=await target.evaluate(el=>parseFloat(getComputedStyle(el).minHeight));
  assert.ok(minHeight>=52,label+' target height '+minHeight);
  await target.click();
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('ぱぱ')&&document.getElementById('status')?.textContent.includes('みっちゃん'),{timeout:30000});
  const switched=await page.evaluate(()=>({
    cfg:JSON.parse(localStorage.getItem('aiShogiCloudConfigV1')||'{}'),
    game:JSON.parse(localStorage.getItem('aiShogiGameSaveV1')||'null'),
    button:document.getElementById('cloudFamilySwitchBtn')?.textContent||'',
    status:document.getElementById('status')?.textContent||'',
    overflow:document.documentElement.scrollWidth>window.innerWidth,
  }));
  assert.equal(switched.cfg.familyCode,'ぱぱ');assert.equal(switched.cfg.activeSlotId,'slot_public_two');assert.equal(switched.cfg.activeSlotName,'みっちゃん');
  assert.equal(switched.game?.st?.log?.length,22);assert.match(switched.button,/家族コード：ぱぱ/);assert.equal(switched.overflow,false);
  assert.equal(dialogs.filter(x=>x.type==='prompt').length,0,label+' unexpected numeric/text prompt on existing switch');
  const confirms=dialogs.filter(x=>x.type==='confirm');assert.equal(confirms.length,1,label+' pending confirm count');assert.match(confirms[0].message,/未同期/);
  const listReq=requests.find(x=>x.method==='GET'&&x.url.includes('mode=list'));
  const getReq=requests.find(x=>x.method==='GET'&&x.url.includes('slot=slot_public_two'));
  assert.ok(listReq,label+' list request missing');assert.ok(getReq,label+' target get missing');
  assert.ok(listReq.auth.startsWith('Bearer ')&&listReq.auth!=='Bearer '+'A'.repeat(32),label+' family key not derived');
  assert.equal(listReq.auth.slice(7).length,43,label+' derived key length');
  assert.deepEqual(pageErrors,[],label+' page errors '+pageErrors.join(' | '));
  assert.equal(consoleErrors.some(x=>x.includes('save/cloud patch inject failed')),false,label+' inject console error '+consoleErrors.join(' | '));

  console.log('PASS_PR100_PUBLIC',JSON.stringify({label,mainSha:MAIN_SHA,coi:staticAudit.coi,cards:staticAudit.cards,root21533a:staticAudit.rootHas21533a,family:switched.cfg.familyCode,active:switched.cfg.activeSlotName,ply:switched.game.st.log.length,minHeight,pendingConfirm:true,noPrompt:true,overflow:switched.overflow,futureReady:engineAudit.futureStatus.ready,top5Engine:engineAudit.topMove?.info?.engine||'',sound:staticAudit.sound,pageErrors,injectError:false,ua:staticAudit.ua}));
  await context.close();await browser.close();
}

const cases=[
  [webkit,'iPhone WebKit',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true}],
  [chromium,'Fire Silk',{userAgent:'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.0.0 Safari/537.36',viewport:{width:800,height:1280},screen:{width:800,height:1280},isMobile:true,hasTouch:true}],
  [chromium,'Desktop Chromium',{viewport:{width:1280,height:800}}],
  [firefox,'Firefox',{viewport:{width:1280,height:800}}],
];
for(const c of cases)await runCase(...c);
console.log('PASS_PR100_PUBLIC_FOUR_ENV_ALL');
