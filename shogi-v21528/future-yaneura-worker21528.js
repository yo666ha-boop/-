/* v2.15.28 Future Mitsuki - dedicated YaneuraOu worker */
'use strict';
self.postMessage({type:'stage',text:'⑤-W0 Workerファイル実行開始'});
let BASE='';
try{
  BASE=new URL('./yaneuraou/',self.location.href).href;
  self.postMessage({type:'stage',text:'⑤-W0 Worker URL初期化完了'});
}catch(e){
  self.postMessage({type:'fatal',text:'⑤-W0 Worker URL初期化失敗: '+String(e&&e.message||e)});
  throw e;
}
const JS='yaneuraou.halfkp.noeval.js';
const EVAL='nn.bin';
const BUILD='21528v970d3';
const UA=String(self.navigator&&self.navigator.userAgent||'');
const MOBILE_WEBKIT=/iP(?:hone|ad|od)|Mobile.*AppleWebKit/i.test(UA);
const ENGINE_THREADS=MOBILE_WEBKIT?1:2;
const ENGINE_HASH_MB=MOBILE_WEBKIT?32:128;
const ENGINE_JS_URL=BASE+JS+'?v='+BUILD;
const TOP5_MPV_BY_MS=new Map([
  [4200,3],[6200,3],[2800,3],[4300,3],
  [3400,2],[5100,2],[2300,2],[3600,2],
  [2700,3],[4100,3],[1850,3],[3000,3],
  [2200,3],[3500,3],[1500,3],[2500,3]
]);
let engine=null,ready=false,initPromise=null,waiters=[],latestInfo={},latestMultiPV={};
const stage=text=>self.postMessage({type:'stage',text});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
self.addEventListener('error',ev=>{try{self.postMessage({type:'fatal',text:'Worker内部エラー: '+String(ev.message||'unknown')+' @ '+String(ev.filename||'')+':'+String(ev.lineno||0)+':'+String(ev.colno||0)})}catch(e){}});
function onLine(raw){
  const line=String(raw||'').trim();
  if(line.startsWith('info string WASMDBG '))stage('DBG '+line.slice('info string WASMDBG '.length));
  if(line.startsWith('info ')){
    const d=/\bdepth\s+(\d+)/.exec(line),n=/\bnodes\s+(\d+)/.exec(line),cp=/\bscore\s+cp\s+(-?\d+)/.exec(line),mate=/\bscore\s+mate\s+(-?\d+)/.exec(line),mp=/\bmultipv\s+(\d+)/.exec(line),pv=/\bpv\s+([^\s]+)/.exec(line);
    const rank=mp?Math.max(1,+mp[1]):1;
    const item={line,rank,depth:d?+d[1]:0,nodes:n?+n[1]:0,cp:cp?+cp[1]:undefined,mate:mate?+mate[1]:undefined,token:pv?pv[1]:''};
    if(rank===1)latestInfo={...latestInfo,...item};
    if(item.token)latestMultiPV[rank]=item;
  }
  for(const w of waiters.slice()){
    let hit=false;try{hit=w.pred(line)}catch(e){}
    if(hit){waiters=waiters.filter(x=>x!==w);clearTimeout(w.timer);w.resolve(line)}
  }
}
function waitLine(pred,ms,label){return new Promise((resolve,reject)=>{const w={pred,resolve,reject,timer:null};w.timer=setTimeout(()=>{waiters=waiters.filter(x=>x!==w);reject(new Error(label+' timeout '+ms+'ms'))},ms);waiters.push(w);});}
function directUSI(command){
  if(!engine||typeof engine.ccall!=='function')throw new Error('YaneuraOu ccall bridge unavailable');
  return Number(engine.ccall('usi_command','number',['string'],[String(command)]));
}
async function sendUSI(command,timeout=15000){
  const started=Date.now();let backoff=1,last=NaN;
  while(true){
    last=directUSI(command);
    if(last===0)return;
    if(command==='quit')return;
    if(Date.now()-started>=timeout)throw new Error('usi_command bridge not ready rc='+last+' command='+command);
    await sleep(backoff);backoff=Math.min(64,backoff*2);
  }
}
async function init(){
  if(ready&&engine)return engine;
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    stage('⑤-1 Worker内 Wasm JS読込中');
    try{importScripts(ENGINE_JS_URL)}catch(e){throw new Error('importScripts失敗: '+String(e&&e.message||e))}
    stage('⑤-1 Worker内 Wasm JS読込完了');
    if(typeof self.YaneuraOu_HalfKP_noeval!=='function'&&typeof YaneuraOu_HalfKP_noeval!=='function')throw new Error('YaneuraOu factory not found');
    const factory=self.YaneuraOu_HalfKP_noeval||YaneuraOu_HalfKP_noeval;
    stage('⑤-2 Worker内 Wasm本体起動中');
    engine=await factory({locateFile:p=>BASE+String(p).split('/').pop(),mainScriptUrlOrBlob:ENGINE_JS_URL});
    if(!engine||!engine.FS)throw new Error('YaneuraOu FS not available');
    if(typeof engine.ccall!=='function')throw new Error('YaneuraOu ccall unavailable');
    if(typeof engine.addMessageListener!=='function')throw new Error('YaneuraOu addMessageListener unavailable');
    stage('⑤-2 Worker内 Wasm本体起動完了');
    stage('⑤-3 水匠5 64MB取得中');
    const r=await fetch(BASE+EVAL+'?v='+BUILD,{cache:'no-store'});if(!r.ok)throw new Error('nn.bin '+r.status);
    const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.byteLength<10000000)throw new Error('nn.bin too small '+bytes.byteLength);
    stage('⑤-3 水匠5 '+Math.round(bytes.byteLength/1024/1024)+'MB 読込完了');
    try{engine.FS.unlink('/'+EVAL)}catch(e){}
    engine.FS.writeFile('/'+EVAL,bytes);
    engine.addMessageListener(onLine);
    stage('⑤-4 V9.70 direct USI bridge確認');
    let p=waitLine(x=>x==='usiok',15000,'usiok');await sendUSI('usi');await p;stage('⑤-4 usiok受信');
    stage('⑤-4a EvalDir設定開始');await sendUSI('setoption name EvalDir value .');stage('⑤-4a EvalDir設定完了');
    stage('⑤-4b EvalFile設定開始');await sendUSI('setoption name EvalFile value '+EVAL);stage('⑤-4b EvalFile設定完了');
    stage('⑤-4c FV_SCALE設定開始');await sendUSI('setoption name FV_SCALE value 24');stage('⑤-4c FV_SCALE設定完了');
    stage('⑤-4d USI_Hash設定開始 '+ENGINE_HASH_MB+'MB');await sendUSI('setoption name USI_Hash value '+ENGINE_HASH_MB);stage('⑤-4d USI_Hash設定完了');
    stage('⑤-4e Threads設定開始 '+ENGINE_THREADS);await sendUSI('setoption name Threads value '+ENGINE_THREADS);stage('⑤-4e Threads設定完了');
    stage('⑤-4f MultiPV設定開始');await sendUSI('setoption name MultiPV value 1');stage('⑤-4f MultiPV設定完了');
    stage('⑤-4 設定 Threads='+ENGINE_THREADS+' / Hash='+ENGINE_HASH_MB+'MB'+(MOBILE_WEBKIT?' / iPhone省メモリ':''));
    stage('⑤-5 readyok待ち');p=waitLine(x=>x==='readyok',60000,'readyok');await sendUSI('isready',60000);await p;stage('⑤-5 readyok受信');
    await sendUSI('setoption name USI_Ponder value false');
    await sendUSI('usinewgame');ready=true;stage('⑤成功 V9.70＋水匠5 接続済み');return engine;
  })();
  try{return await initPromise}finally{if(!ready)initPromise=null}
}
async function bestmove(sfen,ms,multiPV=1){
  await init();
  const mp=Math.max(1,Math.min(MOBILE_WEBKIT?3:4,Math.round(Number(multiPV)||1)));
  latestInfo={};latestMultiPV={};
  await sendUSI('setoption name MultiPV value '+mp);
  await sendUSI('position sfen '+sfen);stage('⑥ 思考中 bestmove待ち');
  const p=waitLine(x=>x.startsWith('bestmove '),ms+10000,'bestmove');await sendUSI('go movetime '+ms);const line=await p;stage('⑦ bestmove受信');
  const token=(line.split(/\s+/)[1]||'').trim();
  const candidates=Object.keys(latestMultiPV).map(Number).sort((a,b)=>a-b).map(k=>latestMultiPV[k]).filter(x=>x&&x.token);
  if(!candidates.some(x=>x.rank===1)&&token)candidates.unshift({rank:1,token,...latestInfo});
  await sendUSI('setoption name MultiPV value 1');
  return{token,candidates,info:{...latestInfo,ms,multiPV:mp,candidates:candidates.map(x=>({rank:x.rank,token:x.token,depth:x.depth,nodes:x.nodes,cp:x.cp,mate:x.mate})),engine:'YaneuraOu V9.70 HalfKP＋Suisho5',threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB,mobileWebKit:MOBILE_WEBKIT}};
}
self.onmessage=async ev=>{
  const m=ev.data||{},id=m.id;
  try{
    if(m.type==='init'){await init();self.postMessage({type:'result',id,ok:true,kind:'init',mobileWebKit:MOBILE_WEBKIT,threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB});return}
    if(m.type==='bestmove'){
      const ms=Number(m.ms)||6000;
      const inferred=m.multiPV==null?TOP5_MPV_BY_MS.get(ms):Number(m.multiPV);
      const out=await bestmove(String(m.sfen||''),ms,inferred||1);
      self.postMessage({type:'result',id,ok:true,kind:'bestmove',...out});return;
    }
    if(m.type==='stop'){try{if(engine)await sendUSI('stop')}catch(e){};return}
    if(m.type==='newgame'){try{if(engine){await sendUSI('stop');await sendUSI('setoption name MultiPV value 1');await sendUSI('usinewgame')}}catch(e){};return}
  }catch(e){const msg=String(e&&e.message||e);stage('⑤失敗 '+msg);self.postMessage({type:'result',id,ok:false,error:msg,mobileWebKit:MOBILE_WEBKIT,threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB});}
};
self.postMessage({type:'stage',text:'⑤-W0 Worker待受開始'});
