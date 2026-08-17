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
const BUILD='21528w8';
const UA=String(self.navigator&&self.navigator.userAgent||'');
const MOBILE_WEBKIT=/iP(?:hone|ad|od)|Mobile.*AppleWebKit/i.test(UA);
const ENGINE_THREADS=MOBILE_WEBKIT?1:2;
const ENGINE_HASH_MB=MOBILE_WEBKIT?32:128;
const ENGINE_JS_URL=BASE+JS+'?v='+BUILD;
let engine=null,ready=false,initPromise=null,waiters=[],latestInfo={};
const stage=text=>self.postMessage({type:'stage',text});
self.addEventListener('error',ev=>{try{self.postMessage({type:'fatal',text:'Worker内部エラー: '+String(ev.message||'unknown')+' @ '+String(ev.filename||'')+':'+String(ev.lineno||0)+':'+String(ev.colno||0)})}catch(e){}});
function onLine(raw){
  const line=String(raw||'').trim();
  if(line.startsWith('info ')){
    const d=/\bdepth\s+(\d+)/.exec(line),n=/\bnodes\s+(\d+)/.exec(line),cp=/\bscore\s+cp\s+(-?\d+)/.exec(line),mate=/\bscore\s+mate\s+(-?\d+)/.exec(line);
    latestInfo={...latestInfo,line,depth:d?+d[1]:latestInfo.depth||0,nodes:n?+n[1]:latestInfo.nodes||0,cp:cp?+cp[1]:latestInfo.cp,mate:mate?+mate[1]:latestInfo.mate};
  }
  for(const w of waiters.slice()){
    let hit=false;try{hit=w.pred(line)}catch(e){}
    if(hit){waiters=waiters.filter(x=>x!==w);clearTimeout(w.timer);w.resolve(line)}
  }
}
function waitLine(pred,ms,label){return new Promise((resolve,reject)=>{const w={pred,resolve,reject,timer:null};w.timer=setTimeout(()=>{waiters=waiters.filter(x=>x!==w);reject(new Error(label+' timeout '+ms+'ms'))},ms);waiters.push(w);});}
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
    engine=await factory({
      locateFile:p=>BASE+String(p).split('/').pop(),
      mainScriptUrlOrBlob:ENGINE_JS_URL
    });
    if(!engine||!engine.FS)throw new Error('YaneuraOu FS not available');
    stage('⑤-2 Worker内 Wasm本体起動完了');
    stage('⑤-3 水匠5 64MB取得中');
    const r=await fetch(BASE+EVAL+'?v='+BUILD,{cache:'no-store'});if(!r.ok)throw new Error('nn.bin '+r.status);
    const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.byteLength<10000000)throw new Error('nn.bin too small '+bytes.byteLength);
    stage('⑤-3 水匠5 '+Math.round(bytes.byteLength/1024/1024)+'MB 読込完了');
    try{engine.FS.unlink('/'+EVAL)}catch(e){}
    engine.FS.writeFile('/'+EVAL,bytes);
    engine.addMessageListener(onLine);
    stage('⑤-4 usiok待ち');let p=waitLine(x=>x==='usiok',15000,'usiok');engine.postMessage('usi');await p;stage('⑤-4 usiok受信');
    engine.postMessage('setoption name EvalDir value .');
    engine.postMessage('setoption name EvalFile value '+EVAL);
    engine.postMessage('setoption name FV_SCALE value 24');
    // YaneuraOu WASM defaults USI_Hash to 1024MB. That is too large for iPhone/WebKit.
    // Set hash before isready, because YaneuraOu allocates hash and search threads on isready.
    engine.postMessage('setoption name USI_Hash value '+ENGINE_HASH_MB);
    engine.postMessage('setoption name Threads value '+ENGINE_THREADS);
    stage('⑤-4 設定 Threads='+ENGINE_THREADS+' / Hash='+ENGINE_HASH_MB+'MB'+(MOBILE_WEBKIT?' / iPhone省メモリ':''));
    stage('⑤-5 readyok待ち');p=waitLine(x=>x==='readyok',60000,'readyok');engine.postMessage('isready');await p;stage('⑤-5 readyok受信');
    engine.postMessage('setoption name USI_Ponder value false');
    engine.postMessage('usinewgame');ready=true;stage('⑤成功 やねうら王＋水匠5 接続済み');return engine;
  })();
  try{return await initPromise}finally{if(!ready)initPromise=null}
}
async function bestmove(sfen,ms){
  const e=await init();latestInfo={};e.postMessage('position sfen '+sfen);stage('⑥ 思考中 bestmove待ち');
  const p=waitLine(x=>x.startsWith('bestmove '),ms+10000,'bestmove');e.postMessage('go movetime '+ms);const line=await p;stage('⑦ bestmove受信');
  return{token:(line.split(/\s+/)[1]||'').trim(),info:{...latestInfo,ms,engine:'YaneuraOu HalfKP＋Suisho5',threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB,mobileWebKit:MOBILE_WEBKIT}};
}
self.onmessage=async ev=>{
  const m=ev.data||{},id=m.id;
  try{
    if(m.type==='init'){await init();self.postMessage({type:'result',id,ok:true,kind:'init',mobileWebKit:MOBILE_WEBKIT,threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB});return}
    if(m.type==='bestmove'){const out=await bestmove(String(m.sfen||''),Number(m.ms)||6000);self.postMessage({type:'result',id,ok:true,kind:'bestmove',...out});return}
    if(m.type==='stop'){try{engine?.postMessage('stop')}catch(e){};return}
    if(m.type==='newgame'){try{engine?.postMessage('stop');engine?.postMessage('usinewgame')}catch(e){};return}
  }catch(e){self.postMessage({type:'result',id,ok:false,error:String(e&&e.message||e),mobileWebKit:MOBILE_WEBKIT,threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB});}
};
self.postMessage({type:'stage',text:'⑤-W0 Worker待受開始'});
