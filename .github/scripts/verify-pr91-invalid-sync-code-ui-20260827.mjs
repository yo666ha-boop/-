import assert from 'node:assert/strict';
import {chromium,webkit,firefox} from 'playwright';

const BASE='http://127.0.0.1:8000/shogi-v21528/index.html';
const VALID='abcdefghijklmnopqrstuvwxyzABCDEFGH';
const INVALID='あいうえお同期コード';
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
    await page.goto(BASE+'?pr91='+name+'-'+RUN,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.crossOriginIsolated&&document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_SAVE&&window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('saveResumeHub'),null,{timeout:150000});
    await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));

    const invalidFirst=await page.evaluate(async invalid=>{
      const ok=await AI_SHOGI_CLOUD_SAVE.enableWithCode(invalid);
      return {
        ok,
        configured:AI_SHOGI_CLOUD_SAVE.audit().configured,
        status:document.getElementById('status')?.textContent||'',
        guide:document.getElementById('cloudSaveGuide')?.textContent||'',
        button:document.getElementById('cloudSaveBtn')?.textContent||'',
        codeDisabled:!!document.getElementById('cloudCodeBtn')?.disabled
      };
    },INVALID);
    assert.equal(invalidFirst.ok,false);
    assert.equal(invalidFirst.configured,false);
    assert.ok(invalidFirst.status.includes('24〜128文字'));
    assert.ok(invalidFirst.status.includes('ひらがな・漢字・全角文字は使えません'));
    assert.equal(invalidFirst.guide,invalidFirst.status);
    assert.equal(invalidFirst.button,'クラウド同期');
    assert.equal(invalidFirst.codeDisabled,true);

    assert.equal(await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),VALID),true);
    assert.equal(await page.evaluate(()=>AI_SHOGI_CLOUD_SAVE.audit().configured),true);
    const beforeMasked=await page.evaluate(()=>AI_SHOGI_CLOUD_SAVE.config().syncKey);
    assert.ok(beforeMasked.endsWith(VALID.slice(-6)));

    const invalidReplacement=await page.evaluate(async invalid=>{
      const ok=await AI_SHOGI_CLOUD_SAVE.enableWithCode(invalid);
      return {
        ok,
        configured:AI_SHOGI_CLOUD_SAVE.audit().configured,
        masked:AI_SHOGI_CLOUD_SAVE.config().syncKey,
        status:document.getElementById('status')?.textContent||'',
        guide:document.getElementById('cloudSaveGuide')?.textContent||''
      };
    },INVALID);
    assert.equal(invalidReplacement.ok,false);
    assert.equal(invalidReplacement.configured,true);
    assert.equal(invalidReplacement.masked,beforeMasked);
    assert.ok(invalidReplacement.status.includes('半角英数字'));
    assert.equal(invalidReplacement.guide,invalidReplacement.status);

    assert.equal(await page.evaluate(()=>AI_SHOGI_CLOUD_SAVE.copySyncCode()),true);
    assert.equal(await page.evaluate(()=>window.__copiedSyncCode),VALID);
    const layout=await page.evaluate(()=>({
      cards:document.querySelectorAll('#chars .ch').length,
      cloudGrouped:['cloudSaveBtn','cloudCodeBtn','cloudPullBtn'].every(id=>document.getElementById(id)?.parentElement?.id==='cloudSaveActions'),
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      cloudVersion:AI_SHOGI_CLOUD_SAVE.version
    }));
    assert.equal(layout.cards,26);assert.equal(layout.cloudGrouped,true);assert.equal(layout.overflow,false);assert.equal(layout.cloudVersion,'21531d');
    const unexpectedErrors=errors.filter(e=>!e.includes('due to access control checks.'));
    assert.deepEqual(unexpectedErrors,[]);
    console.log('PR91_INVALID_CODE_ENV '+JSON.stringify({name,viewport,invalidRejected:true,errorVisible:true,validConfigPreserved:true,clipboardExact:true,cards:26,overflow:false,knownLocalAccessControlNoise:errors.length-unexpectedErrors.length,pageErrors:unexpectedErrors}));
  } finally {await ctx.close();await browser.close();}
}

for(const e of ENVS)await runEnv(...e);
console.log('PASS_PR91_INVALID_SYNC_CODE_UI_FOUR_ENV');
