/* AI将棋先生 v2.15.35: 強さ19〜26位は内蔵AIを主役のまま、強制詰みだけYaneuraOu＋水匠5が救済 */
(function installCohort19_26Supervisor21535(){
  if(window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR)return;
  const shared=window.AI_SHOGI_YANEURAOU_FUTURE,mid=window.AI_SHOGI_YANEURAOU_COHORT13_18;
  if(!shared||typeof shared.init!=='function'||typeof shared.bestMove!=='function'||!mid){setTimeout(installCohort19_26Supervisor21535,120);return}
  const INDICES=[8,13,10,7,22,6,14,16],SET=new Set(INDICES);
  const EXPECTED={8:'直江兼続',13:'ユリア',10:'バット',7:'しんじ',22:'リン',6:'ジャギ',14:'玉ちゃん',16:'ぺんぺん'};
  for(const i of INDICES)if(C[i]?.[0]!==EXPECTED[i]){console.error('cohort19-26 supervisor identity mismatch',i,C[i]?.[0],EXPECTED[i]);return}
  const PROFILES={
    8:{label:'R1700・義知略',normal:220,endgame:460},
    13:{label:'R1680・静穏安定',normal:210,endgame:430},
    10:{label:'R1600・元気直感',normal:195,endgame:400},
    7:{label:'R1550・慎重成長',normal:180,endgame:370},
    22:{label:'R1500・基本忠実',normal:165,endgame:340},
    6:{label:'R1450・撹乱小細工',normal:150,endgame:310},
    14:{label:'R1380・応援マスコット',normal:140,endgame:290},
    16:{label:'R1250・ゆるふわ直感',normal:130,endgame:270}
  };
  const NAMES=INDICES.map(i=>C[i][0]),RATINGS=INDICES.map(i=>C[i][1]);
  function profileMs(s,who){const p=PROFILES[who]||PROFILES[16];return (s.log?.length||0)>=45?p.endgame:p.normal}
  function isWinningMate(res){const m=res?.info?.mate;return Number.isFinite(m)&&m>0&&!!res?.move}
  async function supervisedBest(s,who,builtinResult){
    const p=PROFILES[who]||PROFILES[16],targetMs=profileMs(s,who);
    const builtin=builtinResult||chooseAI(clone(s),who);
    let probe=null;
    try{probe=await shared.bestMove(s,{ms:targetMs,multiPV:1,adaptive:false})}
    catch(e){return{...builtin,info:{...(builtin?.info||{}),engine:'内蔵AI',supervisor:true,supervisorFallback:true,supervisorError:String(e&&e.message||e)},profile:p,targetMs,usedSupervisor:false}}
    if(isWinningMate(probe))return{...probe,info:{...(probe.info||{}),supervisor:true,supervisorReason:'forced-mate',builtinToken:builtin?.move?usi(builtin.move):'',forcedBest:true},profile:p,targetMs,usedSupervisor:true};
    if(probe?.declareWin)return{...probe,info:{...(probe.info||{}),supervisor:true,supervisorReason:'declare-win',builtinToken:builtin?.move?usi(builtin.move):'',forcedBest:true},profile:p,targetMs,usedSupervisor:true};
    return{...builtin,info:{...(builtin?.info||{}),supervisor:true,supervisorReason:'builtin-preserved',probeDepth:probe?.info?.depth||0,probeNodes:probe?.info?.nodes||0,probeMate:probe?.info?.mate??null},profile:p,targetMs,usedSupervisor:false};
  }
  const aiMoveBaseCohort19=aiMove;
  aiMove=function(){
    if(!SET.has(ci))return aiMoveBaseCohort19();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    const startCi=ci,charName=C[startCi][0],profile=PROFILES[startCi]||PROFILES[16];
    thinking=true;showSpeech('think',true);setStatus(charName+'が考えています…');
    const startKey=posKey(st),startState=clone(st),started=performance.now();
    (async()=>{
      const builtin=chooseAI(clone(startState),startCi);
      let res=null,engineError='';
      try{await shared.init();res=await supervisedBest(startState,startCi,builtin)}
      catch(e){engineError=String(e&&e.message||e);console.error('COHORT19_26 supervisor fallback',charName,e);res={...builtin,info:{...(builtin?.info||{}),engine:'内蔵AI',supervisor:true,supervisorFallback:true,supervisorError:engineError},profile,targetMs:profileMs(startState,startCi),usedSupervisor:false}}
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res?.info||{}),elapsed:Math.round(performance.now()-started),fallback:!!res?.info?.supervisorFallback,book:false,cohort19_26:true,supervisor:true,engineFromMove1:false,character:charName,strengthProfile:profile.label,targetMs:res?.targetMs||profileMs(startState,startCi),usedSupervisor:!!res?.usedSupervisor};
      if(res?.declareWin){thinking=false;const delta=recordResult(0);setStatus(charName+'の入玉宣言勝ちです。');setResult('loss',charName+'宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);return}
      if(res?.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);if(finishIfEnded())return;
      const x=lastAIInfo||{},saved=x.usedSupervisor?' / 詰み筋を監督AIが救済':' / 内蔵AIの棋風を維持';
      setStatus('あなたの手番です。'+profile.label+saved+(x.depth?' / 監督深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };
  const chars=document.getElementById('chars');
  if(chars&&!chars.dataset.cohort19_26Warm){chars.dataset.cohort19_26Warm='1';chars.addEventListener('click',ev=>{const card=ev.target.closest?.('.ch');if(!card)return;const cards=[...chars.querySelectorAll('.ch')],i=cards.indexOf(card);if(SET.has(i))setTimeout(()=>shared.init().catch(()=>{}),80)},true)}
  window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR={version:'2.15.35',mode:'builtin-with-forced-mate-supervisor',indices:INDICES.slice(),names:NAMES.slice(),ratings:RATINGS.slice(),profiles:JSON.parse(JSON.stringify(PROFILES)),sharedWorker:true,engine:'YaneuraOu HalfKP + Suisho5',enabled:i=>SET.has(Number(i)),profileMs:(s,i)=>profileMs(s,Number(i)),status:()=>shared.status(),init:()=>shared.init(),bestMove:(s,i,builtin)=>supervisedBest(s,Number(i),builtin)};
})();