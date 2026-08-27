import assert from 'node:assert/strict';
import {chromium,webkit,firefox} from 'playwright';

const BASE=process.env.BASE_URL||'http://127.0.0.1:4173/shogi-v21528/index.html';
const CLOUD='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const CODE='abcdefghijklmnopqrstuvwxyzABCDEFGH';
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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function runEnv(name,type,userAgent,viewport){
  const browser=await type.launch({headless:true});
  const ctx=await browser.newContext({userAgent,viewport});
  await ctx.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedSyncCode=text;}}});
  });
  await ctx.route(CLOUD,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'validation_offline'})}));
  const page=await ctx.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  try{
    await page.goto(BASE+'?pr90='+name+'-'+RUN,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.crossOriginIsolated&&document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_SAVE&&window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('saveResumeHub'),null,{timeout:150000});
    await page.waitForFunction(()=>{
      const local=document.getElementById('localSaveActions'),cloud=document.getElementById('cloudSaveActions');
      return local&&cloud&&['saveGameBtn','resumeGameBtn'].every(id=>document.getElementById(id)?.parentElement===local)&&['cloudSaveBtn','cloudCodeBtn','cloudPullBtn'].every(id=>document.getElementById(id)?.parentElement===cloud);
    },null,{timeout:15000});
    await sleep(250);

    const initial=await page.evaluate(()=>{
      const hub=document.getElementById('saveResumeHub'),r=hub.getBoundingClientRect(),opponent=document.getElementById('opponentCard');
      return {
        titles:[...hub.querySelectorAll('.saveResumeTitle')].map(x=>x.textContent.trim()),
        localButtons:[...document.querySelectorAll('#localSaveActions .btn')].map(x=>x.textContent.trim()),
        cloudButtons:[...document.querySelectorAll('#cloudSaveActions .btn')].map(x=>x.textContent.trim()),
        localState:document.getElementById('localSaveState')?.textContent||'',
        cloudGuide:document.getElementById('cloudSaveGuide')?.textContent||'',
        hubBeforeOpponent:!!(hub.compareDocumentPosition(opponent)&Node.DOCUMENT_POSITION_FOLLOWING),
        hubInsideViewport:r.left>=-1&&r.right<=innerWidth+1,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        audit:AI_SHOGI_SAVE.audit(),
        cards:document.querySelectorAll('#chars .ch').length,
        focusSave:!!document.getElementById('fsaveGameBtn')
      };
    });
    console.log('PR90_INITIAL '+JSON.stringify({name,...initial}));
    assert.deepEqual(initial.titles,['この端末の対局','別の端末で続ける']);
    assert.deepEqual(initial.localButtons,['この端末に保存','再開できる保存なし']);
    assert.deepEqual(initial.cloudButtons,['クラウド同期','同期コードをコピー','別端末から再開']);
    assert.ok(initial.localState.includes('まだ保存されていません'));
    assert.ok(initial.cloudGuide.includes('未設定'));
    assert.equal(initial.hubBeforeOpponent,true);
    assert.equal(initial.hubInsideViewport,true);
    assert.equal(initial.overflow,false);
    assert.equal(initial.audit.hub,true);
    assert.equal(initial.audit.cloudGrouped,true);
    assert.equal(initial.cards,26);
    assert.equal(initial.focusSave,true);

    assert.equal(await page.evaluate(()=>AI_SHOGI_SAVE.save()),true);
    await page.waitForFunction(()=>AI_SHOGI_SAVE.audit().hasSave&&!document.getElementById('resumeGameBtn').disabled&&document.getElementById('localSaveState').textContent.includes('保存済み'));
    await sleep(1250);
    const saved=await page.evaluate(()=>({
      audit:AI_SHOGI_SAVE.audit(),
      resumeText:document.getElementById('resumeGameBtn').textContent.trim(),
      saveText:document.getElementById('saveGameBtn').textContent.trim(),
      localState:document.getElementById('localSaveState').textContent,
      savedAt:AI_SHOGI_SAVE.data()?.savedAt||0
    }));
    assert.equal(saved.audit.hasSave,true);
    assert.equal(saved.audit.savedPly,0);
    assert.equal(saved.resumeText,'保存した対局を再開');
    assert.equal(saved.saveText,'この端末に保存');
    assert.ok(saved.localState.includes('保存済み：'));
    assert.ok(saved.localState.includes('0手'));
    assert.ok(saved.savedAt>0);

    await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
    assert.equal(await page.evaluate(code=>AI_SHOGI_CLOUD_SAVE.enableWithCode(code),CODE),true);
    await page.waitForFunction(()=>{const a=AI_SHOGI_CLOUD_SAVE.audit(),m=a.meta||{};return a.configured&&m.pending===true},null,{timeout:10000});
    await page.waitForFunction(()=>document.getElementById('cloudSaveGuide').textContent.includes('送信待ち'),null,{timeout:10000});
    assert.equal(await page.evaluate(()=>AI_SHOGI_CLOUD_SAVE.copySyncCode()),true);
    const cloud=await page.evaluate(()=>({
      copied:window.__copiedSyncCode,
      guide:document.getElementById('cloudSaveGuide').textContent,
      grouped:['cloudSaveBtn','cloudCodeBtn','cloudPullBtn'].every(id=>document.getElementById(id)?.parentElement?.id==='cloudSaveActions'),
      codeDisabled:document.getElementById('cloudCodeBtn').disabled,
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      pageWidth:document.documentElement.scrollWidth,
      viewport:innerWidth,
      online:navigator.onLine
    }));
    assert.equal(cloud.copied,CODE);
    assert.ok(cloud.guide.includes('送信待ち'));
    assert.equal(cloud.grouped,true);
    assert.equal(cloud.codeDisabled,false);
    assert.equal(cloud.overflow,false);
    assert.equal(cloud.online,false);

    assert.equal(await page.evaluate(()=>AI_SHOGI_SAVE.restore()),true);
    assert.deepEqual(pageErrors,[]);
    console.log('PR90_ENV '+JSON.stringify({name,viewport,hub:true,localSave:true,resume:true,cloudGrouped:true,cloudOfflinePendingGuide:true,clipboardExact:true,overflow:false,pageErrors}));
  }finally{
    await ctx.close();await browser.close();
  }
}

for(const env of ENVS)await runEnv(...env);
console.log('PASS_PR90_SAVE_RESUME_UI_FOUR_ENV');
