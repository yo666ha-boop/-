import assert from 'node:assert/strict';
import {chromium,webkit,firefox} from 'playwright';

const BASE='https://ai-shogi-yaneuraou-iphone.vercel.app/shogi-v21528/index.html';
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
    localStorage.removeItem('aiShogiGameSaveV1');
    localStorage.removeItem('aiShogiCloudConfigV1');
    localStorage.removeItem('aiShogiCloudMetaV1');
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedSyncCode=text;}}});
  });
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  try{
    await page.goto(BASE+'?pr90public='+name+'-'+RUN,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.crossOriginIsolated&&document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_SAVE&&window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('saveResumeHub'),null,{timeout:150000});
    await page.waitForFunction(()=>{
      const local=document.getElementById('localSaveActions'),cloud=document.getElementById('cloudSaveActions');
      return local&&cloud&&['saveGameBtn','resumeGameBtn'].every(id=>document.getElementById(id)?.parentElement===local)&&['cloudSaveBtn','cloudCodeBtn','cloudPullBtn'].every(id=>document.getElementById(id)?.parentElement===cloud);
    },null,{timeout:15000});
    await sleep(300);
    const initial=await page.evaluate(()=>{
      const hub=document.getElementById('saveResumeHub'),r=hub.getBoundingClientRect(),opp=document.getElementById('opponentCard');
      return {titles:[...hub.querySelectorAll('.saveResumeTitle')].map(x=>x.textContent.trim()),localButtons:[...document.querySelectorAll('#localSaveActions .btn')].map(x=>x.textContent.trim()),cloudButtons:[...document.querySelectorAll('#cloudSaveActions .btn')].map(x=>x.textContent.trim()),localState:document.getElementById('localSaveState')?.textContent||'',cloudGuide:document.getElementById('cloudSaveGuide')?.textContent||'',beforeOpponent:!!(hub.compareDocumentPosition(opp)&Node.DOCUMENT_POSITION_FOLLOWING),inside:r.left>=-1&&r.right<=innerWidth+1,overflow:document.documentElement.scrollWidth>innerWidth+1,cards:document.querySelectorAll('#chars .ch').length,unique:new Set([...document.querySelectorAll('#chars .ch')].map(x=>(x.querySelector('.chName')?.textContent||x.querySelector('img')?.alt||'').trim())).size,audit:AI_SHOGI_SAVE.audit(),cloudVersion:AI_SHOGI_CLOUD_SAVE.version};
    });
    assert.deepEqual(initial.titles,['この端末の対局','別の端末で続ける']);
    assert.deepEqual(initial.localButtons,['この端末に保存','再開できる保存なし']);
    assert.deepEqual(initial.cloudButtons,['クラウド同期','同期コードをコピー','別端末から再開']);
    assert.ok(initial.localState.includes('まだ保存されていません'));
    assert.ok(initial.cloudGuide.includes('未設定'));
    assert.equal(initial.beforeOpponent,true);assert.equal(initial.inside,true);assert.equal(initial.overflow,false);
    assert.equal(initial.cards,26);assert.equal(initial.unique,26);assert.equal(initial.audit.hub,true);assert.equal(initial.audit.cloudGrouped,true);assert.equal(initial.cloudVersion,'21531d');

    assert.equal(await page.evaluate(()=>AI_SHOGI_SAVE.save()),true);
    await page.waitForFunction(()=>AI_SHOGI_SAVE.audit().hasSave&&!document.getElementById('resumeGameBtn').disabled&&document.getElementById('localSaveState').textContent.includes('保存済み'));
    await sleep(1200);
    const saved=await page.evaluate(()=>({resume:document.getElementById('resumeGameBtn').textContent.trim(),state:document.getElementById('localSaveState').textContent,savedAt:AI_SHOGI_SAVE.data()?.savedAt||0,overflow:document.documentElement.scrollWidth>innerWidth+1}));
    assert.equal(saved.resume,'保存した対局を再開');assert.ok(saved.state.includes('保存済み：'));assert.ok(saved.state.includes('0手'));assert.ok(saved.savedAt>0);assert.equal(saved.overflow,false);

    await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),CODE),true);
    await page.waitForFunction(()=>AI_SHOGI_CLOUD_SAVE.audit().configured&&AI_SHOGI_CLOUD_SAVE.meta().pending===true,null,{timeout:10000});
    await page.waitForFunction(()=>document.getElementById('cloudSaveGuide').textContent.includes('送信待ち'),null,{timeout:10000});
    assert.equal(await page.evaluate(()=>AI_SHOGI_CLOUD_SAVE.copySyncCode()),true);
    const cloud=await page.evaluate(()=>({copied:window.__copiedSyncCode,guide:document.getElementById('cloudSaveGuide').textContent,grouped:['cloudSaveBtn','cloudCodeBtn','cloudPullBtn'].every(id=>document.getElementById(id)?.parentElement?.id==='cloudSaveActions'),overflow:document.documentElement.scrollWidth>innerWidth+1}));
    assert.equal(cloud.copied,CODE);assert.ok(cloud.guide.includes('送信待ち'));assert.equal(cloud.grouped,true);assert.equal(cloud.overflow,false);
    assert.equal(await page.evaluate(()=>AI_SHOGI_SAVE.restore()),true);
    assert.deepEqual(errors,[]);
    console.log('PR90_PUBLIC_ENV '+JSON.stringify({name,viewport,saveHub:true,save:true,resume:true,cloudGrouped:true,offlinePendingGuide:true,clipboardExact:true,cards:26,overflow:false,pageErrors:errors}));
  } finally {await ctx.close();await browser.close();}
}

for(const e of ENVS)await runEnv(...e);
console.log('PASS_POSTMERGE_PR90_SAVE_RESUME_UI_PUBLIC_FOUR_ENV');
