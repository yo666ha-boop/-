/* v2.15.21 Mitsuki -> real YaneuraOu.wasm bridge. Inject this inside the main app IIFE after strong2155.js. */
const AI_SHOGI_LOCAL_AIMOVE_21521 = aiMove;
const AI_SHOGI_YANEURA_AUDIT_21521 = {
  requested: true,
  engine: 'YaneuraOu.wasm 0.1.2',
  cdn: 'jsDelivr',
  characterIndex: 0,
  characterName: C[0]?.[0] || 'みつき',
  ready: false,
  fallback: false,
  lastError: '',
  lastBestmove: '',
  lastSfen: '',
  crossOriginIsolated: !!window.crossOriginIsolated,
  threads: 0,
  hashMB: 64
};
window.AI_SHOGI_YANEURA_AUDIT_21521 = AI_SHOGI_YANEURA_AUDIT_21521;

let yaneuraInstance21521 = null;
let yaneuraReadyPromise21521 = null;
let yaneuraBusy21521 = false;

function sfenPiece21521(p){
  const base = p.k[0] === '+' ? p.k.slice(1) : p.k;
  let t = base;
  if (p.o !== S) t = t.toLowerCase();
  return (p.k[0] === '+' ? '+' : '') + t;
}
function stateToSfen21521(s){
  const rows=[];
  for(let y=0;y<9;y++){
    let row='', empty=0;
    for(let x=0;x<9;x++){
      const p=s.b[idx(x,y)];
      if(!p){empty++;continue;}
      if(empty){row+=String(empty);empty=0;}
      row+=sfenPiece21521(p);
    }
    if(empty)row+=String(empty);
    rows.push(row);
  }
  const order=['R','B','G','S','N','L','P'];
  let hand='';
  for(const side of [S,G]){
    for(const k of order){
      const n=Number(s.h?.[side]?.[k]||0);
      if(!n)continue;
      if(n>1)hand+=String(n);
      hand+=side===S?k:k.toLowerCase();
    }
  }
  if(!hand)hand='-';
  const turn=s.t===S?'b':'w';
  return rows.join('/')+' '+turn+' '+hand+' '+Math.max(1,(s.log?.length||0)+1);
}
function yaneuraWait21521(engine, command, prefix, timeoutMs=12000){
  return new Promise((resolve,reject)=>{
    let timer=null;
    const listener=(line)=>{
      line=String(line||'');
      if(!line.startsWith(prefix))return;
      if(timer)clearTimeout(timer);
      try{engine.removeMessageListener?.(listener)}catch(e){}
      resolve(line);
    };
    engine.addMessageListener(listener);
    timer=setTimeout(()=>{
      try{engine.removeMessageListener?.(listener)}catch(e){}
      reject(new Error('YaneuraOu timeout: '+prefix));
    },timeoutMs);
    engine.postMessage(command);
  });
}
async function ensureYaneura21521(){
  if(yaneuraInstance21521)return yaneuraInstance21521;
  if(yaneuraReadyPromise21521)return yaneuraReadyPromise21521;
  yaneuraReadyPromise21521=(async()=>{
    AI_SHOGI_YANEURA_AUDIT_21521.crossOriginIsolated=!!window.crossOriginIsolated;
    if(!window.crossOriginIsolated)throw new Error('crossOriginIsolated=false');
    if(typeof window.YaneuraOu!=='function')throw new Error('YaneuraOu loader not found');
    const yn=await window.YaneuraOu();
    await yaneuraWait21521(yn,'usi','usiok',15000);
    const threads=Math.max(1,Math.min(2,Number(navigator.hardwareConcurrency||1)));
    yn.postMessage('setoption name USI_Ponder value false');
    yn.postMessage('setoption name USI_OwnBook value false');
    yn.postMessage('setoption name USI_Hash value 64');
    yn.postMessage('setoption name PvInterval value 0');
    yn.postMessage('setoption name Threads value '+threads);
    await yaneuraWait21521(yn,'isready','readyok',30000);
    yaneuraInstance21521=yn;
    AI_SHOGI_YANEURA_AUDIT_21521.ready=true;
    AI_SHOGI_YANEURA_AUDIT_21521.fallback=false;
    AI_SHOGI_YANEURA_AUDIT_21521.threads=threads;
    return yn;
  })().catch(err=>{
    AI_SHOGI_YANEURA_AUDIT_21521.ready=false;
    AI_SHOGI_YANEURA_AUDIT_21521.fallback=true;
    AI_SHOGI_YANEURA_AUDIT_21521.lastError=String(err?.message||err);
    yaneuraReadyPromise21521=null;
    throw err;
  });
  return yaneuraReadyPromise21521;
}
async function yaneuraBestmove21521(s){
  if(yaneuraBusy21521)throw new Error('YaneuraOu busy');
  yaneuraBusy21521=true;
  try{
    const yn=await ensureYaneura21521();
    const sfen=stateToSfen21521(s);
    AI_SHOGI_YANEURA_AUDIT_21521.lastSfen=sfen;
    yn.postMessage('position sfen '+sfen);
    const line=await yaneuraWait21521(yn,'go movetime 2200','bestmove',10000);
    const best=String(line).trim().split(/\s+/)[1]||'';
    AI_SHOGI_YANEURA_AUDIT_21521.lastBestmove=best;
    return best;
  }finally{yaneuraBusy21521=false;}
}
function finishYaneuraMove21521(startKey,startCi,bestUsi,started){
  if(posKey(st)!==startKey||ci!==startCi){thinking=false;return;}
  let best=legal(st).find(m=>usi(m)===bestUsi);
  let source='やねうら王Wasm';
  if(!best){
    const res=chooseAI(st,startCi);
    best=res.move;
    lastAIInfo=res.info||{};
    source='内蔵AIフォールバック';
    AI_SHOGI_YANEURA_AUDIT_21521.fallback=true;
  }else{
    lastAIInfo={depth:0,nodes:0,qnodes:0,ms:Math.round(performance.now()-started),score:0,yaneuraou:true,engine:'YaneuraOu.wasm'};
  }
  if(best)push(best,'△');
  thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);
  if(finishIfEnded())return;
  setStatus('あなたの手番です。 '+source+' / '+(lastAIInfo.ms||0)+'ms');
}

aiMove=function(){
  if(ci!==0)return AI_SHOGI_LOCAL_AIMOVE_21521();
  if(st.t!=G||thinking||gameCounted)return;
  if(finishIfEnded())return;
  thinking=true;showSpeech('think',true);setStatus(C[ci][0]+'がやねうら王で考えています…');
  const startKey=posKey(st),startCi=ci,started=performance.now();
  setTimeout(async()=>{
    try{
      const bestUsi=await yaneuraBestmove21521(clone(st));
      finishYaneuraMove21521(startKey,startCi,bestUsi,started);
    }catch(err){
      AI_SHOGI_YANEURA_AUDIT_21521.fallback=true;
      AI_SHOGI_YANEURA_AUDIT_21521.lastError=String(err?.message||err);
      if(posKey(st)!==startKey||ci!==startCi){thinking=false;return;}
      const res=chooseAI(st,startCi),best=res.move;lastAIInfo=res.info||{};
      if(best)push(best,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);
      if(finishIfEnded())return;
      setStatus('あなたの手番です。やねうら王起動失敗のため内蔵MAX AIで継続');
    }
  },80);
};
window.AI_SHOGI_ENGINE = Object.assign({},window.AI_SHOGI_ENGINE||{}, {
  mitsukiRealYaneuraOu:true,
  yaneuraOuWasmVersion:'0.1.2',
  yaneuraOuBridge:'2.15.21'
});
