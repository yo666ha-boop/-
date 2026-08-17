/* AI将棋先生 v2.15.29 tune3: 上位5人を初手から共通やねうら王＋水匠5で思考＋棋風/戦法バイアス */
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

  window.AI_SHOGI_YANEURAOU_TOP5={
    version:'2.15.29-tune3',openingMode:'engine-from-move-1',legacyOpeningBypass:false,indices:TOP5.slice(),names:NAMES.slice(),ratings:RATINGS.slice(),profiles:JSON.parse(JSON.stringify(PROFILES)),sharedWorker:true,engine:'YaneuraOu HalfKP + Suisho5',
    enabled:i=>TOP5_SET.has(Number(i)),profileMs:(s,i)=>profileMs(s,Number(i)),status:()=>shared.status(),init:()=>shared.init(),bestMove:(s,i=0)=>profiledBest(s,Number(i)),selectProfileMove:(s,res,i)=>selectProfileMove(s,res,Number(i)),openingTokens:(s,i)=>[...openingTokens(s,Number(i))]
  };
  try{render();renderStats();renderOpponent(false)}catch(e){}
})();
