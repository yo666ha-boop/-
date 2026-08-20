/* AI将棋先生 v2.15.35: 強さ19〜24位を共通やねうら王＋水匠5で段階化 */
(function installCohort19_24Yaneura21535(){
  if(window.AI_SHOGI_YANEURAOU_COHORT19_24)return;
  const shared=window.AI_SHOGI_YANEURAOU_FUTURE,upper=window.AI_SHOGI_YANEURAOU_COHORT13_18,upper2=window.AI_SHOGI_YANEURAOU_COHORT7_12,top5=window.AI_SHOGI_YANEURAOU_TOP5;
  if(!shared||typeof shared.init!=='function'||typeof shared.bestMove!=='function'||!upper||!upper2||!top5){setTimeout(installCohort19_24Yaneura21535,120);return}
  const INDICES=[8,13,10,7,22,6],SET=new Set(INDICES);
  const EXPECTED={8:'直江兼続',13:'ユリア',10:'バット',7:'しんじ',22:'リン',6:'ジャギ'};
  for(const i of INDICES)if(C[i]?.[0]!==EXPECTED[i]){console.error('cohort19-24 identity mismatch',i,C[i]?.[0],EXPECTED[i]);return}
  const PROFILES={
    8:{label:'R1700・義知略反撃',personality:'stable',multiPV:5,minRank:3,maxLoss:180,normal:280,endgame:460},
    13:{label:'R1680・静穏安定',personality:'stable',multiPV:5,minRank:3,maxLoss:190,normal:255,endgame:430},
    10:{label:'R1600・ひらめき成長',personality:'balanced',multiPV:5,minRank:4,maxLoss:200,normal:230,endgame:400},
    7:{label:'R1550・相掛かり成長',personality:'balanced',multiPV:5,minRank:4,maxLoss:215,normal:210,endgame:370},
    22:{label:'R1500・基本忠実',personality:'stable',multiPV:5,minRank:4,maxLoss:230,normal:190,endgame:340},
    6:{label:'R1450・撹乱小細工',personality:'aggressive',multiPV:5,minRank:4,maxLoss:245,normal:170,endgame:310}
  };
  const NAMES=INDICES.map(i=>C[i][0]),RATINGS=INDICES.map(i=>C[i][1]);
  function profileMs(s,who){const p=PROFILES[who]||PROFILES[6];return (s.log?.length||0)>=55?p.endgame:p.normal}
  function candidateList(s,res){
    const raw=Array.isArray(res?.info?.candidates)?res.info.candidates:[],lm=legal(s),seen=new Set(),out=[];
    for(const c of raw){const token=String(c?.token||'');if(!token||seen.has(token))continue;const m=lm.find(x=>usi(x)===token);if(!m)continue;seen.add(token);out.push({...c,move:m})}
    if(res?.move){const u=usi(res.move);if(!seen.has(u))out.unshift({rank:1,token:u,move:res.move,cp:res?.info?.cp,mate:res?.info?.mate,depth:res?.info?.depth||0})}
    return out.sort((a,b)=>(a.rank||99)-(b.rank||99));
  }
  function cpLoss(best,c){if(Number.isFinite(best?.cp)&&Number.isFinite(c?.cp))return Math.max(0,best.cp-c.cp);return c===best?0:9999}
  function selectProfileMove(s,res,who){
    const p=PROFILES[who]||PROFILES[6],cands=candidateList(s,res),best=cands[0];
    if(!best)return{move:res?.move,rank:1,loss:0,forced:true};
    if(best.mate!==undefined&&best.mate!==null)return{move:best.move,rank:best.rank||1,loss:0,forced:true};
    const safe=cands.filter(c=>cpLoss(best,c)<=p.maxLoss&&!(c.mate!==undefined&&c.mate!==null&&c.mate<0));
    const preferred=safe.filter(c=>(c.rank||1)>=p.minRank),winner=preferred[0]||safe[0]||best;
    return{move:winner.move,rank:winner.rank||1,loss:cpLoss(best,winner),forced:false};
  }
  async function profiledBest(s,who){
    const p=PROFILES[who]||PROFILES[6],targetMs=profileMs(s,who),res=await shared.bestMove(s,{ms:targetMs,multiPV:p.multiPV,adaptive:false});
    if(res?.resign||res?.declareWin||!res?.move)return{...res,profile:p,targetMs,selectedRank:1,cpLoss:0};
    const picked=selectProfileMove(s,res,who);
    return{...res,move:picked.move,info:{...(res.info||{}),selectedRank:picked.rank,cpLoss:picked.loss,personality:p.personality,profileMultiPV:p.multiPV,cohort19_24:true,forcedBest:picked.forced},profile:p,targetMs,selectedRank:picked.rank,cpLoss:picked.loss};
  }
  const aiMoveBaseCohort=aiMove;
  aiMove=function(){
    if(!SET.has(ci))return aiMoveBaseCohort();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    const startCi=ci,charName=C[startCi][0],profile=PROFILES[startCi]||PROFILES[6];
    thinking=true;showSpeech('think',true);setStatus(charName+'がやねうら王＋水匠5で考えています…');
    const startKey=posKey(st),startState=clone(st),started=performance.now();
    (async()=>{
      let res=null,usedFallback=false,engineError='';
      try{await shared.init();res=await profiledBest(startState,startCi)}
      catch(e){usedFallback=true;engineError=String(e&&e.message||e);console.error('COHORT19_24 YaneuraOu fallback',charName,e);const fb=chooseAI(clone(startState),startCi);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵AI fallback',error:engineError}}}
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res?.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback,book:false,cohort19_24:true,engineFromMove1:true,character:charName,strengthProfile:profile.label,targetMs:res?.targetMs||profileMs(startState,startCi),multiPV:profile.multiPV};
      if(res?.resign){thinking=false;const delta=recordResult(1);setStatus(charName+'が投了しました。あなたの勝ちです。');setResult('win',charName+'投了・勝ち　R '+(delta>=0?'+':'')+delta);speechMood='loss';lastSpeech='';render();renderOpponent(true);return}
      if(res?.declareWin){thinking=false;const delta=recordResult(0);setStatus(charName+'の入玉宣言勝ちです。');setResult('loss',charName+'宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);return}
      if(res?.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);if(finishIfEnded())return;
      const x=lastAIInfo||{},label=x.fallback?'内蔵AI退避（'+String(x.error||engineError||'原因不明').slice(0,70)+'）':'やねうら王＋水匠5 '+profile.label;
      setStatus('あなたの手番です。'+label+(x.selectedRank>1?' / 候補'+x.selectedRank+'位':'')+(x.cpLoss>0?' / 評価差'+x.cpLoss+'cp':'')+(x.depth?' / 深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };
  const chars=document.getElementById('chars');
  if(chars&&!chars.dataset.cohort19_24Warm){chars.dataset.cohort19_24Warm='1';chars.addEventListener('click',ev=>{const card=ev.target.closest?.('.ch');if(!card)return;const cards=[...chars.querySelectorAll('.ch')],i=cards.indexOf(card);if(SET.has(i))setTimeout(()=>shared.init().catch(()=>{}),80)},true)}
  window.AI_SHOGI_YANEURAOU_COHORT19_24={version:'2.15.35',indices:INDICES.slice(),names:NAMES.slice(),ratings:RATINGS.slice(),profiles:JSON.parse(JSON.stringify(PROFILES)),sharedWorker:true,engine:'YaneuraOu HalfKP + Suisho5',enabled:i=>SET.has(Number(i)),profileMs:(s,i)=>profileMs(s,Number(i)),status:()=>shared.status(),init:()=>shared.init(),bestMove:(s,i)=>profiledBest(s,Number(i)),selectProfileMove:(s,res,i)=>selectProfileMove(s,res,Number(i))};
})();
