import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const BASE='https://yo666ha-boop.github.io/-/shogi-v21528';
const UA='Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0';
const VIEW={width:1440,height:900};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function startState(){let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let i=0;i<9;i++){b[i]={k:back[i],o:-1};b[72+i]={k:back[8-i],o:1};b[18+i]={k:'P',o:-1};b[54+i]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};return {b,h:{1:{},'-1':{}},t:1,log:[],last:null}}
async function waitApp(page,timeout=150000){const end=Date.now()+timeout;let last=null;while(Date.now()<end){try{last=await page.evaluate(()=>({coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,future:window.AI_SHOGI_YANEURAOU_FUTURE?.strengthTune,save:window.AI_SHOGI_SAVE?.version,cloud:window.AI_SHOGI_CLOUD_SAVE?.version,cloudBtn:!!document.getElementById('cloudSaveBtn')}));if(last.coi&&last.cards===26&&last.future==='fullsearch-20260825'&&last.save==='21530a'&&last.cloud==='21531c'&&last.cloudBtn)return last}catch{}await sleep(400)}throw new Error('waitApp timeout '+JSON.stringify(last))}
async function open(page,label){await page.goto(`${BASE}/index.html?diagpr87ff=${label}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:120000});return waitApp(page)}
async function realReplyAndSave(page){await page.locator('#chars .ch').nth(25).click();await page.selectOption('#sideSelect2157','sente');await page.click('#newBtn');await page.waitForTimeout(120);const before=(await page.locator('#moves').textContent()||'').trim();await page.locator('#board').locator(':scope > *').nth(56).click();await page.waitForTimeout(40);await page.locator('#board').locator(':scope > *').nth(47).click();await page.waitForFunction(b=>{const t=(document.getElementById('moves')?.textContent||'').trim();return t&&t!==b},before,{timeout:10000});const human=(await page.locator('#moves').textContent()||'').trim();await page.waitForFunction(h=>{const t=(document.getElementById('moves')?.textContent||'').trim(),s=(document.getElementById('status')?.textContent||'');return t!==h&&!/考えています/.test(s)},human,{timeout:120000});await page.waitForFunction(()=>window.AI_SHOGI_SAVE?.audit().savedPly>=2,null,{timeout:10000});return page.evaluate(()=>({audit:window.AI_SHOGI_SAVE.audit(),data:window.AI_SHOGI_SAVE.data()}))}

const browser=await firefox.launch({headless:true});
const ctx=await browser.newContext({userAgent:UA,viewport:VIEW});
const page=await ctx.newPage();
let phase='boot';
const pageErrors=[],requestFailed=[],consoleErrors=[],consoleDetailPromises=[];
page.on('pageerror',e=>pageErrors.push({phase,url:page.url(),message:String(e.message||e),stack:String(e.stack||'')}));
page.on('requestfailed',r=>requestFailed.push({phase,url:r.url(),failure:r.failure()}));
page.on('console',m=>{if(m.type()!=='error')return;const base={phase,url:page.url(),text:m.text(),location:m.location()};consoleErrors.push(base);consoleDetailPromises.push((async()=>{const args=[];for(const h of m.args()){try{args.push(await h.evaluate(v=>{if(v instanceof Error)return {type:'Error',name:v.name,message:v.message,stack:v.stack,string:String(v)};let json=null;try{json=JSON.parse(JSON.stringify(v))}catch{}return {type:typeof v,string:String(v),json}}))}catch(e){args.push({handleError:String(e)})}}return {...base,args}})())});
try{
  phase='open'; const first=await open(page,'OPEN');
  phase='engine-init-search'; const eng=await page.evaluate(async st=>{const a=window.AI_SHOGI_YANEURAOU_FUTURE,t0=performance.now();await a.init();const r=await a.bestMove(st,{ms:300,multiPV:1,adaptive:false});return {elapsed:Math.round(performance.now()-t0),status:a.status(),info:r?.info||{},ok:!!(r?.move||r?.resign||r?.declareWin)}},startState());
  assert.equal(eng.status.ready,true);assert.equal(eng.status.worker,true);assert.equal(eng.info.hashMB,128);assert.equal(eng.info.threads,1);assert.equal(eng.ok,true);
  phase='sound-disable'; assert.equal(await page.evaluate(()=>{window.AI_SHOGI_PIECE_SOUND.setEnabled(false);return window.AI_SHOGI_PIECE_SOUND.enabled}),false);
  phase='reload-sound-off'; await page.reload({waitUntil:'domcontentloaded',timeout:120000});await waitApp(page);assert.equal(await page.evaluate(()=>window.AI_SHOGI_PIECE_SOUND.enabled),false);
  phase='sound-enable'; await page.evaluate(()=>window.AI_SHOGI_PIECE_SOUND.setEnabled(true));
  phase='future-real-reply'; const saved=await realReplyAndSave(page);const ply=saved.audit.savedPly;assert.ok(ply>=2);assert.equal(saved.audit.savedPly,saved.audit.currentPly);assert.equal(saved.data.ci,25);
  phase='reload-save-restore'; await page.reload({waitUntil:'domcontentloaded',timeout:120000});await waitApp(page);assert.equal((await page.evaluate(()=>window.AI_SHOGI_SAVE.audit())).savedPly,ply);
  phase='explicit-local-load'; assert.equal(await page.evaluate(()=>window.AI_SHOGI_SAVE.load()),true);
  phase='settle'; await sleep(2000);
  const details=await Promise.all(consoleDetailPromises);
  console.log('DIAG_PR87_FIREFOX_STATE '+JSON.stringify({first,eng,ply,audit:await page.evaluate(()=>window.AI_SHOGI_SAVE.audit())}));
  console.log('DIAG_PR87_FIREFOX_PAGEERRORS '+JSON.stringify(pageErrors));
  console.log('DIAG_PR87_FIREFOX_REQUESTFAILED '+JSON.stringify(requestFailed));
  console.log('DIAG_PR87_FIREFOX_CONSOLE_ERRORS '+JSON.stringify(consoleErrors));
  console.log('DIAG_PR87_FIREFOX_CONSOLE_DETAILS '+JSON.stringify(details));
  console.log('PASS_DIAG_PR87_FIREFOX_FLOW_COMPLETED');
} finally {await ctx.close();await browser.close()}
