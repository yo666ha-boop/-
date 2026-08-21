import { webkit, chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'node:child_process';

const futureSrc=fs.readFileSync('shogi-side-test/future21520.js','utf8');
const workerSrc=fs.readFileSync('shogi-v21528/future-yaneura-worker21528.js','utf8');
if(!futureSrc.includes("master.gain.setValueAtTime(.34*"))throw new Error('piece sound gain is not 0.34');
if(!futureSrc.includes("version:'21529b'"))throw new Error('piece sound version not 21529b');
if(!futureSrc.includes("ci===FUTURE_INDEX&&!engineReady"))throw new Error('Future prewarm trigger missing');
if(!workerSrc.includes("{cache:'force-cache'}"))throw new Error('Suisho5 force-cache missing');
console.log('STATIC '+JSON.stringify({soundGain:0.34,soundVersion:'21529b',prewarm:true,evalCache:'force-cache'}));

// Main workflow installs WebKit only. Install Chromium here so this existing,
// already-triggered job can perform fixed-depth cross-browser diagnostics.
execFileSync('npx',['playwright','install','chromium'],{stdio:'inherit'});

// Diagnostic-only derivative of the exact checked-out production worker.
// Production files are not changed; this adds a one-shot fixed-depth MultiPV1 API.
{
  let s=workerSrc;
  const handler="    if(m.type==='stop'){try{if(engine)await sendUSI('stop')}catch(e){};return}";
  if(!s.includes(handler))throw new Error('diag handler marker missing');
  const diagHandler=`    if(m.type==='rawdepth1'){
      await init();
      for(const c of ['setoption name EvalDir value .','setoption name EvalFile value nn.bin','setoption name FV_SCALE value 24','setoption name USI_Hash value 32','setoption name Threads value 1','setoption name MultiPV value 1'])await sendUSI(c,20000);
      let rp=waitLine(x=>x==='readyok',60000,'diag readyok');await sendUSI('isready',60000);await rp;
      await sendUSI('usinewgame');
      latestInfo={};latestMultiPV={};
      const pos=String(m.sfen||'');const depth=Math.max(1,Number(m.depth)||12);
      await sendUSI('position sfen '+pos);
      const bp=waitLine(x=>x.startsWith('bestmove '),210000,'diag bestmove');
      await sendUSI('go depth '+depth,210000);const best=await bp;
      const token=(best.split(/\\s+/)[1]||'').trim();
      self.postMessage({type:'result',id,ok:true,kind:'rawdepth1',line:best,token,info:{...latestInfo},candidates:collectCandidates(token),profile:{threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB,mobileWebKit:MOBILE_WEBKIT,fireSilk:FIRE_SILK,mobileSafe:MOBILE_SAFE}});return;
    }\n`;
  s=s.replace(handler,diagHandler+handler);
  fs.writeFileSync('shogi-v21528/future-yaneura-worker-depth1diag.js',s);
}

// Keep the original prewarm/sound/runtime gate intact.
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
const before=await page.evaluate(()=>({coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,sound:window.AI_SHOGI_PIECE_SOUND?.audit?.(),soundVersion:window.AI_SHOGI_PIECE_SOUND?.version,engine:window.AI_SHOGI_YANEURAOU_FUTURE?.status?.()}));
console.log('BEFORE '+JSON.stringify(before));
if(!before.coi)throw new Error('crossOriginIsolated=false');
if(before.cards!==26)throw new Error('character count '+before.cards);
if(before.soundVersion!=='21529b')throw new Error('runtime sound version '+before.soundVersion);
if(before.sound?.buttons!==2)throw new Error('sound buttons '+JSON.stringify(before.sound));
const t0=Date.now();
await page.locator('[data-future-mitsuki="1"]').click();
await page.waitForFunction(()=>window.AI_SHOGI_YANEURAOU_FUTURE?.status?.().ready===true,{timeout:90000,polling:100});
const prewarmMs=Date.now()-t0;
const afterReady=await page.evaluate(()=>({engine:window.AI_SHOGI_YANEURAOU_FUTURE.status(),moves:(document.querySelector('#moves')?.textContent||'').trim(),status:(document.querySelector('#status')?.textContent||'').trim(),sound:window.AI_SHOGI_PIECE_SOUND.audit()}));
console.log('PREWARM '+JSON.stringify({prewarmMs,...afterReady}));
if(!afterReady.engine.ready)throw new Error('prewarm did not reach ready');
if(afterReady.moves&&afterReady.moves!=='まだ棋譜はありません')throw new Error('prewarm made a move before player: '+afterReady.moves);
const soundPlay=await page.evaluate(async()=>{const ok=window.AI_SHOGI_PIECE_SOUND.play(1);await new Promise(r=>setTimeout(r,100));return {ok,audit:window.AI_SHOGI_PIECE_SOUND.audit()};});
console.log('SOUND '+JSON.stringify(soundPlay));
if(!soundPlay.ok)throw new Error('piece sound play returned false');
if(soundPlay.audit.context==='none')throw new Error('AudioContext not created');
const quick=await page.evaluate(async()=>{const api=window.AI_SHOGI_YANEURAOU_FUTURE;let b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};const s={b,h:{1:{},'-1':{}},t:1,log:[],last:null};const t=performance.now();const r=await api.bestMove(s,{ms:250,multiPV:1});return {elapsed:Math.round(performance.now()-t),move:!!r.move,resign:!!r.resign,declareWin:!!r.declareWin,depth:r.info?.depth||0,nodes:r.info?.nodes||0,threads:r.info?.threads,hashMB:r.info?.hashMB,mobileWebKit:r.info?.mobileWebKit};});
console.log('READY_SEARCH '+JSON.stringify(quick));
if(quick.elapsed>3000)throw new Error('ready 250ms search still carries startup cost: '+quick.elapsed+'ms');
if(!quick.move&&!quick.resign&&!quick.declareWin)throw new Error('ready search returned no move');
if(quick.threads!==1||quick.hashMB!==32||quick.mobileWebKit!==true)throw new Error('iPhone profile changed '+JSON.stringify(quick));
if(logs.some(x=>x.startsWith('pageerror:')))throw new Error('page errors: '+logs.filter(x=>x.startsWith('pageerror:')).join(' | '));
console.log('PASS '+JSON.stringify({prewarmMs,readySearchMs:quick.elapsed,soundGain:0.34,soundContext:soundPlay.audit.context,threads:quick.threads,hashMB:quick.hashMB}));
await browser.close();

// Reconstruct the exact fresh-collapse positions used by the native diagnostic.
const I='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const M=`4i5h 3c3d 8g8f 8c8d 5i4i 8d8e 7g7f 8e8f 8h2b+ 3a2b 7f7e B*8g 5h6h 8g5d+ 7e7d 7c7d 6h7h 8f8g+ B*4f 6c6d 5g5f 8g7h 5f5e 5d6e 6i5h 8b8i+ 3i4h 7h7i 4i3h 7i7h 5h5i G*5h 2g2f 5h5i 3h2g 5i5h 4h5g 6e4g 1g1f S*3h`.split(/\s+/);
function sfen(ms){const R='abcdefghi',b=new Map(),h={b:{},w:{}},rows0=I.split('/');for(let rr=0;rr<9;rr++){let f=9,pr=false;for(const c of rows0[rr]){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),pc=b.get(a),cap=b.get(d);if(!pc)throw Error('apply '+m);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||m.endsWith('+')})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const q=b.get(''+f+R[r]);if(!q){e++;continue}if(e){x+=e;e=0}x+=(q.pr?'+':'')+(q.side==='b'?q.k:q.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}
const plies=[29,33,35],depths=[12,14],positions=plies.map(p=>sfen(M.slice(0,p-1)));
async function boot(kind){const type=kind==='webkit'?webkit:chromium;const ua=kind==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/139 Safari/537.36';const b=await type.launch({headless:true});const p=await b.newPage({viewport:{width:390,height:844},userAgent:ua});await p.goto('http://127.0.0.1:4188/shogi-v21528/index.html?depth1='+kind+'-'+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});if(!await p.evaluate(()=>crossOriginIsolated))throw Error(kind+' no COI');return{b,p}}
async function fixedSearch(p,pos,depth){return await p.evaluate(async({pos,depth})=>{const w=new Worker('./future-yaneura-worker-depth1diag.js?v='+Date.now()+Math.random());let seq=0,pending=new Map();w.onmessage=e=>{const m=e.data||{},q=pending.get(m.id);if(!q||m.type!=='result')return;pending.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};const call=(type,data={},timeout=240000)=>new Promise((r,j)=>{const id=++seq,t=setTimeout(()=>{pending.delete(id);j(Error(type+' timeout'))},timeout);pending.set(id,{r,j,t});w.postMessage({type,id,...data})});try{await call('init');return await call('rawdepth1',{sfen:pos,depth},240000)}finally{w.terminate()}},{pos,depth})}
const all={};
for(const kind of['webkit','chromium']){const X=await boot(kind);all[kind]=[];for(let i=0;i<positions.length;i++)for(const depth of depths){const r=await fixedSearch(X.p,positions[i],depth);const row={browser:kind,ply:plies[i],depth,token:r.token,cp:r.info?.cp??null,mate:r.info?.mate??null,nodes:r.info?.nodes??null,profile:r.profile||{}};all[kind].push(row);console.log('FUTURE_FIXED_DEPTH_MPV1_ROW '+JSON.stringify(row))}await X.b.close()}
const mismatches=[];for(const ply of plies)for(const depth of depths){const a=all.webkit.find(x=>x.ply===ply&&x.depth===depth),b=all.chromium.find(x=>x.ply===ply&&x.depth===depth);if(a?.token!==b?.token)mismatches.push({ply,depth,webkit:a?.token,chromium:b?.token})}
console.log('FUTURE_FIXED_DEPTH_MPV1_SUMMARY '+JSON.stringify({mismatches,webkit:all.webkit,chromium:all.chromium}));
console.log('PASS_FUTURE_FIXED_DEPTH_MPV1_HARNESS');
