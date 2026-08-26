import assert from 'node:assert/strict';
import { webkit } from 'playwright';
const BASE='https://yo666ha-boop.github.io/-/shogi-v21528';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const VIEW={width:390,height:844};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitStable(p){await p.waitForFunction(()=>crossOriginIsolated&&document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_DIALOGUE_AUDIT?.version==='2.15.10'&&window.AI_SHOGI_HANA_IMAGE_AUDIT?.ok===true&&window.AI_SHOGI_SAVE?.version==='21530a'&&window.AI_SHOGI_CLOUD_SAVE?.version==='21531c',null,{timeout:150000});await sleep(1200)}
const browser=await webkit.launch({headless:true});
try{
  for(let attempt=1;attempt<=3;attempt++){
    const ctx=await browser.newContext({userAgent:UA,viewport:VIEW});
    const p=await ctx.newPage();
    const pageErrors=[],failed=[],consoleErrors=[],nav=[];
    p.on('framenavigated',f=>{if(f===p.mainFrame())nav.push(f.url())});
    p.on('pageerror',e=>pageErrors.push({url:p.url(),message:String(e.message||e),stack:String(e.stack||'')}));
    p.on('requestfailed',r=>failed.push({url:r.url(),error:String(r.failure()?.errorText||'')}));
    p.on('console',m=>{if(m.type()==='error')consoleErrors.push({url:p.url(),text:m.text(),location:m.location()})});
    await p.goto(`${BASE}/index.html?diagStartupAssets=${attempt}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:120000});
    await waitStable(p);
    const state=await p.evaluate(()=>{
      const cards=[...document.querySelectorAll('#chars .ch')];
      const hana=[8,11,18].map(i=>{const c=cards[i],img=c?.querySelector('img');return {i,name:(c?.querySelector('.chName')?.textContent||img?.alt||'').trim(),src:String(img?.src||'').slice(0,40),complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0}});
      const counts=window.AI_SHOGI_DIALOGUE_AUDIT?.counts||{};
      const dialogueNames=Object.keys(counts),allDialogueMoods=dialogueNames.length===8&&dialogueNames.every(n=>Object.values(counts[n]||{}).every(v=>Number(v)>0));
      return {url:location.href,coi:crossOriginIsolated,cards:cards.length,hanaAudit:window.AI_SHOGI_HANA_IMAGE_AUDIT,dialogueAudit:{version:window.AI_SHOGI_DIALOGUE_AUDIT?.version,recentAvoid:window.AI_SHOGI_DIALOGUE_AUDIT?.recentAvoid,names:dialogueNames,allDialogueMoods},hana,webAudit:window.AI_SHOGI_WEB_AUDIT||null};
    });
    assert.equal(state.coi,true);assert.equal(state.cards,26);assert.equal(state.hanaAudit.ok,true);assert.deepEqual([...state.hanaAudit.loaded].sort((a,b)=>a-b),[8,11,18]);assert.equal(state.dialogueAudit.version,'2.15.10');assert.equal(state.dialogueAudit.recentAvoid,4);assert.equal(state.dialogueAudit.allDialogueMoods,true);
    assert.deepEqual(state.hana.map(x=>x.name),['直江兼続','伊達政宗','前田慶次']);assert.ok(state.hana.every(x=>x.complete&&x.w>0&&x.h>0&&x.src.startsWith('data:image/webp;base64,')));
    for(const i of [8,11,18]){await p.locator('#chars .ch').nth(i).click();await p.waitForTimeout(100);const portrait=await p.evaluate(()=>({name:(document.getElementById('oppName')?.textContent||'').trim(),img:(()=>{const x=document.querySelector('#oppPortrait img');return {w:x?.naturalWidth||0,h:x?.naturalHeight||0,src:String(x?.src||'').slice(0,40)}})()}));assert.ok(portrait.img.w>0&&portrait.img.h>0&&portrait.img.src.startsWith('data:image/webp;base64,'));}
    console.log('PR87_IPHONE_STARTUP_ASSET_ROW '+JSON.stringify({attempt,state,navigations:nav,pageErrors,failed:failed.filter(x=>!/Load request cancelled|NS_BINDING_ABORTED|ERR_ABORTED/i.test(x.error)),consoleErrors}));
    await ctx.close();
  }
}finally{await browser.close()}
console.log('PASS_PR87_IPHONE_STARTUP_ASSET_RECOVERY_3X');
