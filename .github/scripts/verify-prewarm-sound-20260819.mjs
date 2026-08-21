import { webkit } from 'playwright';
import fs from 'fs';

const futureSrc=fs.readFileSync('shogi-side-test/future21520.js','utf8');
const workerSrc=fs.readFileSync('shogi-v21528/future-yaneura-worker21528.js','utf8');
if(!futureSrc.includes("master.gain.setValueAtTime(.34*"))throw new Error('piece sound gain is not 0.34');
if(!futureSrc.includes("version:'21529b'"))throw new Error('piece sound version not 21529b');
if(!futureSrc.includes("ci===FUTURE_INDEX&&!engineReady"))throw new Error('Future prewarm trigger missing');
if(!workerSrc.includes("{cache:'force-cache'}"))throw new Error('Suisho5 force-cache missing');
console.log('STATIC '+JSON.stringify({soundGain:0.34,soundVersion:'21529b',prewarm:true,evalCache:'force-cache'}));

// Diagnostic-only derivative of the exact checked-out production worker.
// It exposes raw USI option/ready lines and one fixed-depth row without touching production files.
{
  let s=workerSrc;
  const decl="let engine=null,ready=false,initPromise=null,waiters=[],latestInfo={},latestMultiPV={};";
  if(!s.includes(decl))throw new Error('diag state declaration marker missing');
  s=s.replace(decl,"let __diagLines=[];"+decl);
  const lineDecl="  const line=String(raw||'').trim();";
  if(!s.includes(lineDecl))throw new Error('diag onLine marker missing');
  s=s.replace(lineDecl,lineDecl+"\n  __diagLines.push(line);if(__diagLines.length>1200)__diagLines.shift();");
  const handler="    if(m.type==='stop'){try{if(engine)await sendUSI('stop')}catch(e){};return}";
  if(!s.includes(handler))throw new Error('diag handler marker missing');
  const diagHandler=`    if(m.type==='diagstate'){
      await init();
      __diagLines=[];
      let p=waitLine(x=>x==='usiok',20000,'diag usiok');await sendUSI('usi');await p;
      const usiLines=__diagLines.slice();
      __diagLines=[];
      for(const c of ['setoption name EvalDir value .','setoption name EvalFile value nn.bin','setoption name FV_SCALE value 24','setoption name USI_Hash value 32','setoption name Threads value 1','setoption name MultiPV value 1'])await sendUSI(c,20000);
      p=waitLine(x=>x==='readyok',60000,'diag readyok');await sendUSI('isready',60000);await p;
      const readyLines=__diagLines.slice();
      __diagLines=[];latestInfo={};latestMultiPV={};
      const pos=String(m.sfen||'');const depth=Math.max(1,Number(m.depth)||12);
      await sendUSI('position sfen '+pos);
      p=waitLine(x=>x.startsWith('bestmove '),180000,'diag bestmove');await sendUSI('go depth '+depth,180000);const best=await p;
      self.postMessage({type:'result',id,ok:true,kind:'diagstate',usiLines,readyLines,bestmove:best,info:{...latestInfo},searchTail:__diagLines.slice(-40),profile:{threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB,mobileWebKit:MOBILE_WEBKIT,fireSilk:FIRE_SILK,mobileSafe:MOBILE_SAFE}});return;
    }
`;
  s=s.replace(handler,diagHandler+handler);
  fs.writeFileSync('shogi-v21528/future-yaneura-worker-state-diag-ci.js',s);
}

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

const rawState=await page.evaluate(async()=>{
  const sfen='lnsgkg1nl/7s1/p3pp1pp/2pp2p2/3+bP4/5B3/P2P1PPPP/4GS1R1/L+r+p2K1NL b gsn2p 29';
  const w=new Worker('./future-yaneura-worker-state-diag-ci.js?v='+Date.now());
  let seq=0,pending=new Map();
  w.onmessage=e=>{const m=e.data||{},p=pending.get(m.id);if(!p||m.type!=='result')return;pending.delete(m.id);clearTimeout(p.t);m.ok?p.r(m):p.j(Error(m.error||'diag worker'))};
  const call=(type,data={},timeout=220000)=>new Promise((r,j)=>{const id=++seq,t=setTimeout(()=>{pending.delete(id);j(Error(type+' timeout'))},timeout);pending.set(id,{r,j,t});w.postMessage({type,id,...data})});
  try{return await call('diagstate',{sfen,depth:12})}finally{w.terminate()}
});
const rawOptions=(rawState.usiLines||[]).filter(x=>x.startsWith('option name '));
const stateSummary={
  idName:(rawState.usiLines||[]).find(x=>x.startsWith('id name '))||'',
  hasEvalFile:rawOptions.some(x=>x.startsWith('option name EvalFile ')),
  evalFileLine:rawOptions.find(x=>x.startsWith('option name EvalFile '))||'',
  fvScaleLine:rawOptions.find(x=>x.startsWith('option name FV_SCALE '))||'',
  readyNoSuch:(rawState.readyLines||[]).filter(x=>/No such option/i.test(x)),
  readyLoading:(rawState.readyLines||[]).filter(x=>/loading eval file/i.test(x)),
  bestmove:rawState.bestmove,
  token:String(rawState.bestmove||'').split(/\s+/)[1]||'',
  cp:rawState.info?.cp??null,mate:rawState.info?.mate??null,depth:rawState.info?.depth??null,nodes:rawState.info?.nodes??null,
  profile:rawState.profile,
  nativeP29D12:{token:'5e5d',cp:-4054,nodes:5234}
};
console.log('PASS_STATE '+JSON.stringify(stateSummary));

if(logs.some(x=>x.startsWith('pageerror:')))throw new Error('page errors: '+logs.filter(x=>x.startsWith('pageerror:')).join(' | '));
console.log('PASS '+JSON.stringify({prewarmMs,readySearchMs:quick.elapsed,soundGain:0.34,soundContext:soundPlay.audit.context,threads:quick.threads,hashMB:quick.hashMB}));
await browser.close();