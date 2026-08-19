import { webkit } from 'playwright';
import fs from 'fs';

const futureSrc=fs.readFileSync('shogi-side-test/future21520.js','utf8');
const workerSrc=fs.readFileSync('shogi-v21528/future-yaneura-worker21528.js','utf8');
if(!futureSrc.includes("master.gain.setValueAtTime(.34*"))throw new Error('piece sound gain is not 0.34');
if(!futureSrc.includes("version:'21529b'"))throw new Error('piece sound version not 21529b');
if(!futureSrc.includes("ci===FUTURE_INDEX&&!engineReady"))throw new Error('Future prewarm trigger missing');
if(!workerSrc.includes("{cache:'force-cache'}"))throw new Error('Suisho5 force-cache missing');
console.log('STATIC '+JSON.stringify({soundGain:0.34,soundVersion:'21529b',prewarm:true,evalCache:'force-cache'}));

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({
  viewport:{width:390,height:844},
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
});
const logs=[];
page.on('console',m=>logs.push(m.type()+': '+m.text()));
page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto('http://127.0.0.1:4188/shogi-v21528/index.html?prewarm='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForTimeout(2500);
if(!(await page.evaluate(()=>crossOriginIsolated))){
  await page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForTimeout(2500);
}
await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});

const before=await page.evaluate(()=>({
  coi:crossOriginIsolated,
  cards:document.querySelectorAll('#chars .ch').length,
  sound:window.AI_SHOGI_PIECE_SOUND?.audit?.(),
  soundVersion:window.AI_SHOGI_PIECE_SOUND?.version,
  engine:window.AI_SHOGI_YANEURAOU_FUTURE?.status?.()
}));
console.log('BEFORE '+JSON.stringify(before));
if(!before.coi)throw new Error('crossOriginIsolated=false');
if(before.cards!==26)throw new Error('character count '+before.cards);
if(before.soundVersion!=='21529b')throw new Error('runtime sound version '+before.soundVersion);
if(before.sound?.buttons!==2)throw new Error('sound buttons '+JSON.stringify(before.sound));

const t0=Date.now();
await page.locator('[data-future-mitsuki="1"]').click();
await page.waitForFunction(()=>window.AI_SHOGI_YANEURAOU_FUTURE?.status?.().ready===true,{timeout:90000,polling:100});
const prewarmMs=Date.now()-t0;
const afterReady=await page.evaluate(()=>({
  engine:window.AI_SHOGI_YANEURAOU_FUTURE.status(),
  moves:(document.querySelector('#moves')?.textContent||'').trim(),
  status:(document.querySelector('#status')?.textContent||'').trim(),
  sound:window.AI_SHOGI_PIECE_SOUND.audit()
}));
console.log('PREWARM '+JSON.stringify({prewarmMs,...afterReady}));
if(!afterReady.engine.ready)throw new Error('prewarm did not reach ready');
if(afterReady.moves&&afterReady.moves!=='まだ棋譜はありません')throw new Error('prewarm made a move before player: '+afterReady.moves);

const soundPlay=await page.evaluate(async()=>{
  const ok=window.AI_SHOGI_PIECE_SOUND.play(1);
  await new Promise(r=>setTimeout(r,100));
  return {ok,audit:window.AI_SHOGI_PIECE_SOUND.audit()};
});
console.log('SOUND '+JSON.stringify(soundPlay));
if(!soundPlay.ok)throw new Error('piece sound play returned false');
if(soundPlay.audit.context==='none')throw new Error('AudioContext not created');

const quick=await page.evaluate(async()=>{
  const api=window.AI_SHOGI_YANEURAOU_FUTURE;
  let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  const s={b,h:{1:{},'-1':{}},t:1,log:[],last:null};
  const t=performance.now();
  const r=await api.bestMove(s,{ms:250,multiPV:1});
  return {elapsed:Math.round(performance.now()-t),move:!!r.move,resign:!!r.resign,declareWin:!!r.declareWin,depth:r.info?.depth||0,nodes:r.info?.nodes||0,threads:r.info?.threads,hashMB:r.info?.hashMB,mobileWebKit:r.info?.mobileWebKit};
});
console.log('READY_SEARCH '+JSON.stringify(quick));
if(quick.elapsed>3000)throw new Error('ready 250ms search still carries startup cost: '+quick.elapsed+'ms');
if(!quick.move&&!quick.resign&&!quick.declareWin)throw new Error('ready search returned no move');
if(quick.threads!==1||quick.hashMB!==32||quick.mobileWebKit!==true)throw new Error('iPhone profile changed '+JSON.stringify(quick));

if(logs.some(x=>x.startsWith('pageerror:')))throw new Error('page errors: '+logs.filter(x=>x.startsWith('pageerror:')).join(' | '));
console.log('PASS '+JSON.stringify({prewarmMs,readySearchMs:quick.elapsed,soundGain:0.34,soundContext:soundPlay.audit.context,threads:quick.threads,hashMB:quick.hashMB}));
await browser.close();
