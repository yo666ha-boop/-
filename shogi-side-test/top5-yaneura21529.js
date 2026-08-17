/* AI将棋先生 v2.15.29 tune3: 上位5人を初手から共通やねうら王＋水匠5で思考＋棋風/戦法バイアス + 対局セーブ */
(function installTop5Yaneura21529(){
  if(window.AI_SHOGI_YANEURAOU_TOP5)return;
  const TOP5=[0,1,2,3,4];
  const TOP5_SET=new Set(TOP5);
  const shared=window.AI_SHOGI_YANEURAOU_FUTURE;
  if(!shared||typeof shared.init!=='function'||typeof shared.bestMove!=='function'){
    setTimeout(installTop5Yaneura21529,120);return;
  }

  const NAMES=TOP5.map(i=>C[i]?.[0]||('CHAR'+i));
  const RATINGS=TOP5.map(i=>C[i]?.[1]||0);
  const PROFILES={
    0:{label:'R3000・最善重視',personality:'master',multiPV:1,maxLoss:0,openingBonus:0,desktop:{normal:5200,endgame:7600},mobile:{normal:3300,endgame:5000}},
    1:{label:'R2850・攻め重視',personality:'aggressive',multiPV:3,maxLoss:35,openingBonus:16,desktop:{normal:4200,endgame:6200},mobile:{normal:2800,endgame:4300}},
    2:{label:'R2700・本格万能',personality:'balanced',multiPV:3,maxLoss:28,openingBonus:18,desktop:{normal:3400,endgame:5100},mobile:{normal:2300,endgame:3600}},
    3:{label:'R2600・受け重視',personality:'defensive',multiPV:3,maxLoss:45,openingBonus:14,desktop:{normal:2700,endgame:4100},mobile:{normal:1850,endgame:3000}},
    4:{label:'R2500・安定重視',personality:'stable',multiPV:3,maxLoss:65,openingBonus:14,desktop:{normal:2200,endgame:3500},mobile:{normal:1500,endgame:2500}}
  };

  for(const i of TOP5){
    if(CHAR_META[i]){
      const base=String(CHAR_META[i].feature||'').replace(/\s*\/\s*やねうら王＋水匠5 共通Worker(?:・初手から)?/g,'');
      CHAR_META[i]={...CHAR_META[i],feature:base+' / やねうら王＋水匠5 共通Worker・初手から'};
    }
  }

  function isMobile(){return /iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent)}
  function profileMs(s,who){const p=PROFILES[who]||PROFILES[4],mode=isMobile()?'mobile':'desktop',phase=(s.log?.length||0)>=55?'endgame':'normal';return p[mode][phase]}
  function openingTokens(s,who){
    try{
      if(typeof bookCandidatesV294!=='function'||(s.log?.length||0)>=20||incheck(s,s.t))return new Set();
      const lm=legal(s),prefs=bookCandidatesV294(s,who,lm)||[];
      return new Set(prefs.slice(0,5).map(m=>usi(m)));
    }catch(e){return new Set()}
  }
  function candidateList(s,res){
    const raw=Array.isArray(res?.info?.candidates)?res.info.candidates:[],lm=legal(s),seen=new Set(),out=[];
    for(const c of raw){const token=String(c?.token||'');if(!token||seen.has(token))continue;const m=lm.find(x=>usi(x)===token);if(!m)continue;seen.add(token);out.push({...c,move:m})}
    if(res?.move){const u=usi(res.move);if(!seen.has(u))out.unshift({rank:1,token:u,move:res.move,cp:res?.info?.cp,mate:res?.info?.mate,depth:res?.info?.depth||0})}
    return out.sort((a,b)=>(a.rank||99)-(b.rank||99));
  }
  function cpLoss(best,c){if(Number.isFinite(best?.cp)&&Number.isFinite(c?.cp))return Math.max(0,best.cp-c.cp);return c===best?0:9999}
  function moveFlags(s,m){
    let capture=!!s.b[m.to],promote=!!m.prom,check=false,replyChecks=0;
    try{const n=apply(s,m);check=incheck(n,n.t);const replies=legal(n).slice(0,80);for(const r of replies){const nn=apply(n,r);if(incheck(nn,nn.t))replyChecks++}}catch(e){}
    return{capture,promote,check,replyChecks};
  }
  function selectProfileMove(s,res,who){
    const p=PROFILES[who]||PROFILES[4],cands=candidateList(s,res),best=cands[0];
    if(!best||p.personality==='master'||best.mate!==undefined&&best.mate!==null)return{move:res.move,rank:1,loss:0,reason:p.personality,opening:false};
    const pool=cands.filter(c=>cpLoss(best,c)<=p.maxLoss&&!(c.mate!==undefined&&c.mate!==null&&c.mate<0));
    if(pool.length<2)return{move:best.move,rank:best.rank||1,loss:0,reason:p.personality,opening:false};
    const preferred=openingTokens(s,who);
    let winner=best,winnerScore=-1e9,winnerOpening=false;
    for(const c of pool){
      const loss=cpLoss(best,c),f=moveFlags(s,c.move),opening=preferred.has(c.token);let score=-loss;
      if(opening)score+=p.openingBonus||0;
      if(p.personality==='aggressive')score+=f.capture*22+f.promote*18+f.check*32-f.replyChecks*2;
      else if(p.personality==='balanced')score+=f.capture*6+f.promote*5+f.check*5-f.replyChecks*4;
      else if(p.personality==='defensive')score+=f.capture*8-f.replyChecks*18+(!f.check)*4;
      else if(p.personality==='stable')score+=f.capture*6-f.replyChecks*11-f.check*3-f.promote*1;
      score-=(Math.max(1,c.rank||1)-1)*2;
      if(score>winnerScore){winnerScore=score;winner=c;winnerOpening=opening}
    }
    return{move:winner.move,rank:winner.rank||1,loss:cpLoss(best,winner),reason:p.personality,opening:winnerOpening};
  }
  async function profiledBest(s,who){
    const p=PROFILES[who]||PROFILES[4],targetMs=profileMs(s,who);
    const res=await shared.bestMove(s,{ms:targetMs,multiPV:p.multiPV});
    if(res?.resign||res?.declareWin||!res?.move)return{...res,profile:p,targetMs,selectedRank:1,cpLoss:0,openingBias:false};
    const picked=selectProfileMove(s,res,who);
    return{...res,move:picked.move,info:{...(res.info||{}),selectedRank:picked.rank,cpLoss:picked.loss,personality:picked.reason,openingBias:picked.opening},profile:p,targetMs,selectedRank:picked.rank,cpLoss:picked.loss,openingBias:picked.opening};
  }

  const aiMoveBaseTop5=aiMove;
  aiMove=function(){
    if(!TOP5_SET.has(ci))return aiMoveBaseTop5();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    const startCi=ci,charName=C[startCi][0],profile=PROFILES[startCi]||PROFILES[4];
    thinking=true;showSpeech('think',true);setStatus(charName+'が初手からやねうら王＋水匠5で考えています…');
    const startKey=posKey(st),startState=clone(st),started=performance.now();
    (async()=>{
      let res=null,usedFallback=false,engineError='',targetMs=profileMs(startState,startCi);
      try{await shared.init();res=await profiledBest(startState,startCi)}
      catch(e){usedFallback=true;engineError=String(e&&e.message||e);console.error('TOP5 YaneuraOu fallback',charName,e);const fb=chooseAI(clone(startState),startCi);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵AI fallback',error:engineError}}}
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res?.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback,book:false,top5Engine:true,engineFromMove1:true,character:charName,strengthProfile:profile.label,targetMs,multiPV:profile.multiPV};
      if(res?.resign){thinking=false;const delta=recordResult(1);setStatus(charName+'が投了しました。あなたの勝ちです。');setResult('win',charName+'投了・勝ち　R '+(delta>=0?'+':'')+delta);speechMood='loss';lastSpeech='';render();renderOpponent(true);return}
      if(res?.declareWin){thinking=false;const delta=recordResult(0);setStatus(charName+'の入玉宣言勝ちです。');setResult('loss',charName+'宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);return}
      if(res?.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);if(finishIfEnded())return;
      const x=lastAIInfo||{},label=x.fallback?'内蔵AI退避（'+String(x.error||engineError||'原因不明').slice(0,70)+'）':'やねうら王＋水匠5 '+profile.label;
      setStatus('あなたの手番です。'+label+(x.openingBias?' / 戦法バイアス':'' )+(x.selectedRank>1?' / 候補'+x.selectedRank+'位':'' )+(x.cpLoss>0?' / 評価差'+x.cpLoss:'' )+(x.depth?' / 深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };

  const chars=document.getElementById('chars');
  if(chars&&!chars.dataset.top5YaneuraWarm){chars.dataset.top5YaneuraWarm='1';chars.addEventListener('click',ev=>{const card=ev.target.closest?.('.ch');if(!card)return;const cards=[...chars.querySelectorAll('.ch')],i=cards.indexOf(card);if(TOP5_SET.has(i))setTimeout(()=>shared.init().catch(()=>{}),80)},true)}

  const GAME_SAVE_KEY='aiShogiSenseiGameV21530';
  const plainCopy=x=>x==null?x:JSON.parse(JSON.stringify(x));
  function validSavedState(x){return !!x&&Array.isArray(x.b)&&x.b.length===81&&x.h&&Array.isArray(x.log)&&Number.isFinite(x.t)}
  function makeGameSave(){
    return{version:'2.15.30',savedAt:Date.now(),ci:Number(ci)||0,st:clone(st),hist:Array.isArray(hist)?hist.map(x=>clone(x)):[],repHistory:plainCopy(repHistory||[]),gameCounted:!!gameCounted,lastHumanBefore:lastHumanBefore?clone(lastHumanBefore):null,lastHumanMove:lastHumanMove?{...lastHumanMove}:null,reviewTrail:Array.isArray(reviewTrail)?reviewTrail.map(x=>({ply:x.ply,before:clone(x.before),move:{...x.move},moveText:x.moveText})):[]};
  }
  function savedGame(){try{const x=JSON.parse(localStorage.getItem(GAME_SAVE_KEY)||'null');return x&&validSavedState(x.st)?x:null}catch(e){return null}}
  function updateSaveButtons(){
    const b=document.getElementById('resumeGameBtn21530'),x=savedGame();
    if(!b)return;
    b.disabled=!x;
    if(x){const moves=x.st?.log?.length||0,name=C[Math.max(0,Math.min(C.length-1,Number(x.ci)||0))]?.[0]||'';b.textContent='続きから'+(moves?'（'+moves+'手）':'')+(name?'':'')}
    else b.textContent='続きから';
  }
  function saveGame21530(silent=false){
    try{localStorage.setItem(GAME_SAVE_KEY,JSON.stringify(makeGameSave()));updateSaveButtons();if(!silent)setStatus('この対局をセーブしました。いつでも「続きから」で戻れます。');return true}catch(e){if(!silent)setStatus('セーブできませんでした。');return false}
  }
  function loadGame21530(){
    const x=savedGame();if(!x){setStatus('セーブされた対局はありません。');updateSaveButtons();return false}
    try{
      ci=Math.max(0,Math.min(C.length-1,Number(x.ci)||0));st=clone(x.st);hist=Array.isArray(x.hist)?x.hist.filter(validSavedState).map(y=>clone(y)):[];
      repHistory=Array.isArray(x.repHistory)&&x.repHistory.length?plainCopy(x.repHistory):[repEntry(st)];gameCounted=!!x.gameCounted;
      lastHumanBefore=validSavedState(x.lastHumanBefore)?clone(x.lastHumanBefore):null;lastHumanMove=x.lastHumanMove?{...x.lastHumanMove}:null;
      reviewTrail=Array.isArray(x.reviewTrail)?x.reviewTrail.filter(y=>validSavedState(y.before)&&y.move).map(y=>({ply:y.ply,before:clone(y.before),move:{...y.move},moveText:y.moveText||jpMove(y.move,y.before)})):[];
      reviewResults=[];reviewRunning=false;analysisRunning=false;thinking=false;sel=null;drop=null;lastSpeech='';speechMood='auto';clearResult();resetTeacher();
      let sum=document.getElementById('reviewSummary'),pf=document.getElementById('reviewProgressFill'),rs=document.getElementById('reviewStatus');if(sum)sum.innerHTML='';if(pf)pf.style.width='0%';if(rs)rs.textContent=reviewTrail.length?'セーブした棋譜を復元しました。ここまで '+reviewTrail.length+'手、振り返れます。':'あなたが1手以上指すと振り返れます。';
      render();renderStats();renderOpponent(true);updateSaveButtons();
      if(gameCounted)setStatus('セーブした終局局面を読み込みました。');
      else if(st.t===G){setStatus('セーブした対局を読み込みました。相手の手番を再開します。');setTimeout(()=>{if(st.t===G&&!thinking&&!gameCounted)aiMove()},180)}
      else setStatus('セーブした対局を読み込みました。あなたの手番です。');
      return true;
    }catch(e){console.error('game save load failed',e);setStatus('セーブデータを読み込めませんでした。');return false}
  }
  function installSaveUi(){
    if(document.getElementById('gameSaveRow21530'))return;
    const controls=document.querySelector('.controls');if(!controls)return;
    const row=document.createElement('div');row.id='gameSaveRow21530';row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 0';
    row.innerHTML='<button class="btn" id="saveGameBtn21530">セーブ</button><button class="btn" id="resumeGameBtn21530">続きから</button>';
    controls.insertAdjacentElement('afterend',row);
    document.getElementById('saveGameBtn21530').onclick=()=>saveGame21530(false);document.getElementById('resumeGameBtn21530').onclick=()=>loadGame21530();updateSaveButtons();
  }
  const pushBeforeSave21530=push;push=function(m,mark){pushBeforeSave21530(m,mark);setTimeout(()=>saveGame21530(true),0)};
  const undoBeforeSave21530=undo;undo=function(){undoBeforeSave21530();setTimeout(()=>saveGame21530(true),0)};
  window.addEventListener('pagehide',()=>{try{if(st&&st.log&&st.log.length)saveGame21530(true)}catch(e){}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){try{if(st&&st.log&&st.log.length)saveGame21530(true)}catch(e){}}});
  installSaveUi();

  window.AI_SHOGI_GAME_SAVE={version:'2.15.30',key:GAME_SAVE_KEY,save:()=>saveGame21530(false),saveSilent:()=>saveGame21530(true),load:()=>loadGame21530(),hasSave:()=>!!savedGame(),snapshot:()=>makeGameSave()};
  window.AI_SHOGI_YANEURAOU_TOP5={
    version:'2.15.29-tune3',openingMode:'engine-from-move-1',legacyOpeningBypass:false,indices:TOP5.slice(),names:NAMES.slice(),ratings:RATINGS.slice(),profiles:JSON.parse(JSON.stringify(PROFILES)),sharedWorker:true,engine:'YaneuraOu HalfKP + Suisho5',
    enabled:i=>TOP5_SET.has(Number(i)),profileMs:(s,i)=>profileMs(s,Number(i)),status:()=>shared.status(),init:()=>shared.init(),bestMove:(s,i=0)=>profiledBest(s,Number(i)),selectProfileMove:(s,res,i)=>selectProfileMove(s,res,Number(i)),openingTokens:(s,i)=>[...openingTokens(s,Number(i))]
  };
  try{render();renderStats();renderOpponent(false);updateSaveButtons()}catch(e){}
})();
