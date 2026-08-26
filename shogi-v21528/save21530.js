/* AI将棋先生 v2.15.28 - 対局保存/再開 v1（端末内） */
(function installGameSave21530(){
  const SAVE_KEY='aiShogiGameSaveV1';
  const SAVE_VERSION=1;
  const isState=s=>!!(s&&Array.isArray(s.b)&&s.b.length===81&&s.h&&Array.isArray(s.log)&&(s.t===S||s.t===G));
  const copyState=s=>s&&isState(s)?clone(s):null;
  const savedAtText=t=>{try{return new Date(t).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return''}};

  function readRaw(){
    try{
      const x=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
      if(!x||x.version!==SAVE_VERSION||!isState(x.st))return null;
      return x;
    }catch(e){return null}
  }
  function snapshot(reason='auto'){
    const result=document.getElementById('resultBanner');
    const status=document.getElementById('status');
    return {
      version:SAVE_VERSION,
      savedAt:Date.now(),
      reason,
      ci:Number.isInteger(ci)?ci:0,
      st:copyState(st),
      hist:Array.isArray(hist)?hist.filter(isState).map(copyState):[],
      repHistory:Array.isArray(repHistory)?repHistory.map(x=>x?{...x}:x):[],
      gameCounted:!!gameCounted,
      lastHumanBefore:copyState(lastHumanBefore),
      lastHumanMove:lastHumanMove?{...lastHumanMove}:null,
      reviewTrail:Array.isArray(reviewTrail)?reviewTrail.map(x=>({ply:x.ply,before:copyState(x.before),move:x.move?{...x.move}:null,moveText:x.moveText||''})).filter(x=>x.before&&x.move):[],
      speechMood:typeof speechMood==='string'?speechMood:'normal',
      lastSpeech:typeof lastSpeech==='string'?lastSpeech:'',
      statusText:status?status.textContent:'',
      result:result?{className:result.className,textContent:result.textContent}:null
    };
  }
  function updateSaveUI(flash=false){
    const x=readRaw(),resume=document.getElementById('resumeGameBtn');
    if(resume){
      resume.disabled=!x;
      resume.textContent=x?'続きから再開':'保存なし';
      resume.title=x?('最終保存 '+savedAtText(x.savedAt)+' / '+(x.st.log?.length||0)+'手'):'保存された対局はありません';
    }
    if(flash){
      document.querySelectorAll('[data-game-save-btn="1"]').forEach(b=>{const old=b.textContent;b.textContent='保存済み ✓';setTimeout(()=>{if(b.isConnected)b.textContent=old},1100)});
    }
    return x;
  }
  function saveGame(reason='manual',flash=true){
    try{
      if(!isState(st))return false;
      const allowEmpty=reason==='manual'||reason==='undo';
      if(!allowEmpty&&(!st.log||st.log.length===0))return false;
      const x=snapshot(reason);
      localStorage.setItem(SAVE_KEY,JSON.stringify(x));
      updateSaveUI(flash);
      return true;
    }catch(e){
      console.error('game save failed',e);
      return false;
    }
  }
  function restoreGame(opts={}){
    const x=readRaw();if(!x)return false;
    if(!opts.force&&st&&Array.isArray(st.log)&&st.log.length>0){
      if(!confirm('現在の対局を、保存してある対局に置き換えて再開しますか？'))return false;
    }
    try{
      ci=Math.max(0,Math.min(C.length-1,Number.isInteger(x.ci)?x.ci:0));
      st=copyState(x.st);
      hist=Array.isArray(x.hist)?x.hist.filter(isState).map(copyState):[];
      repHistory=Array.isArray(x.repHistory)&&x.repHistory.length?x.repHistory.map(v=>v?{...v}:v):[repEntry(st)];
      gameCounted=!!x.gameCounted;
      lastHumanBefore=copyState(x.lastHumanBefore);
      lastHumanMove=x.lastHumanMove?{...x.lastHumanMove}:null;
      reviewTrail=Array.isArray(x.reviewTrail)?x.reviewTrail.filter(v=>v&&isState(v.before)&&v.move).map(v=>({ply:v.ply,before:copyState(v.before),move:{...v.move},moveText:v.moveText||''})):[];
      reviewResults=[];reviewRunning=false;analysisRunning=false;thinking=false;sel=null;drop=null;
      speechMood=x.speechMood||'normal';lastSpeech=x.lastSpeech||'';
      resetTeacher();
      const rb=document.getElementById('resultBanner');
      if(rb){if(x.result&&x.gameCounted){rb.className=x.result.className||'resultBanner';rb.textContent=x.result.textContent||''}else clearResult()}
      render();renderStats();renderOpponent(true);
      const when=savedAtText(x.savedAt);
      if(gameCounted){setStatus(x.statusText||('保存した対局を開きました。最終保存 '+when));}
      else if(st.t===S){setStatus('保存した対局を再開しました。あなたの手番です。最終保存 '+when);}
      else{setStatus('保存した対局を再開しました。相手の手番から続けます。最終保存 '+when);setTimeout(()=>{if(st.t===G&&!thinking&&!gameCounted)aiMove()},350)}
      updateSaveUI(false);
      return true;
    }catch(e){
      console.error('game restore failed',e);
      setStatus('保存データを再開できませんでした。現在の対局はそのままです。');
      return false;
    }
  }
  function clearGameSave(){
    try{localStorage.removeItem(SAVE_KEY);updateSaveUI(false);return true}catch(e){return false}
  }
  function installSaveUI(){
    const controls=document.querySelector('.controls');
    if(controls&&!document.getElementById('saveGameBtn')){
      const save=document.createElement('button');save.className='btn';save.id='saveGameBtn';save.dataset.gameSaveBtn='1';save.type='button';save.textContent='対局保存';save.onclick=()=>{if(saveGame('manual',true))setStatus('この対局を保存しました。別の画面を開いても、この端末なら続きから再開できます。')};
      const resume=document.createElement('button');resume.className='btn';resume.id='resumeGameBtn';resume.type='button';resume.textContent='保存なし';resume.onclick=()=>restoreGame();
      controls.append(save,resume);
    }
    const focusBar=document.getElementById('fundoBtn')?.parentElement;
    if(focusBar&&!document.getElementById('fsaveGameBtn')){
      const save=document.createElement('button');save.className='btn';save.id='fsaveGameBtn';save.dataset.gameSaveBtn='1';save.type='button';save.textContent='保存';save.onclick=()=>{if(saveGame('manual',true))setStatus('対局を保存しました。')};focusBar.appendChild(save);
    }
    updateSaveUI(false);
  }

  const pushSaveBase=push;
  push=function(m,mark){const r=pushSaveBase(m,mark);saveGame('auto',false);return r};
  const finishSaveBase=finishIfEnded;
  finishIfEnded=function(){const ended=finishSaveBase();if(ended)saveGame('end',false);return ended};
  const undoSaveBase=undo;
  undo=function(){const before=st&&st.log?st.log.length:0,r=undoSaveBase();if(st&&st.log&&st.log.length!==before)saveGame('undo',false);return r};

  setTimeout(()=>{
    installSaveUI();
    const ub=document.getElementById('undoBtn'),fu=document.getElementById('fundoBtn');if(ub)ub.onclick=undo;if(fu)fu.onclick=undo;
    const x=readRaw();
    if(x&&st&&Array.isArray(st.log)&&st.log.length===0){const resume=document.getElementById('resumeGameBtn');if(resume)resume.textContent='続きから再開 ('+(x.st.log?.length||0)+'手)'}
  },0);
  window.addEventListener('pagehide',()=>saveGame('pagehide',false),{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveGame('hidden',false)});

  window.AI_SHOGI_SAVE={
    version:'21530a',key:SAVE_KEY,save:()=>saveGame('manual',true),load:()=>restoreGame({force:true}),restore:restoreGame,clear:clearGameSave,
    data:()=>readRaw(),exportData:()=>{const x=readRaw();return x?JSON.parse(JSON.stringify(x)):null},
    audit:()=>{const x=readRaw();return{ok:true,hasSave:!!x,savedPly:x?.st?.log?.length||0,currentPly:st?.log?.length||0,savedCharacter:x?.ci??null,currentCharacter:ci,saveButtons:document.querySelectorAll('[data-game-save-btn="1"]').length,resumeButton:!!document.getElementById('resumeGameBtn')}}
  };
})();
