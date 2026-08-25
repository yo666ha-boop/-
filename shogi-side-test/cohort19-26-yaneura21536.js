/* AI将棋先生 v2.15.36: 強さ19〜26位も毎手YaneuraOu＋水匠5で思考。評価損失上限と棋風でR1700〜R1250を段階化 */
(function installCohort19_26Yaneura21536(){
  if(window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR)return;
  const shared=window.AI_SHOGI_YANEURAOU_FUTURE,mid=window.AI_SHOGI_YANEURAOU_COHORT13_18;
  if(!shared||typeof shared.init!=='function'||typeof shared.bestMove!=='function'||!mid){setTimeout(installCohort19_26Yaneura21536,120);return}
  const INDICES=[8,13,10,7,22,6,14,16],SET=new Set(INDICES);
  const EXPECTED={8:'直江兼続',13:'ユリア',10:'バット',7:'しんじ',22:'リン',6:'ジャギ',14:'玉ちゃん',16:'ぺんぺん'};
  for(const i of INDICES)if(C[i]?.[0]!==EXPECTED[i]){console.error('cohort19-26 yaneura identity mismatch',i,C[i]?.[0],EXPECTED[i]);return}
  const PROFILES={
    8:{label:'R1700・義知略',personality:'positional',multiPV:4,minRank:3,maxLoss:180,normal:500,endgame:700},
    13:{label:'R1680・静穏安定',personality:'stable',multiPV:4,minRank:3,maxLoss:190,normal:460,endgame:660},
    10:{label:'R1600・元気直感',personality:'aggressive',multiPV:4,minRank:4,maxLoss:200,normal:420,endgame:620},
    7:{label:'R1550・慎重成長',personality:'defensive',multiPV:4,minRank:4,maxLoss:215,normal:380,endgame:580},
    22:{label:'R1500・基本忠実',personality:'balanced',multiPV:4,minRank:4,maxLoss:230,normal:340,endgame:540},
    6:{label:'R1450・撹乱小細工',personality:'aggressive',multiPV:4,minRank:4,maxLoss:245,normal:310,endgame:500},
    14:{label:'R1380・応援マスコット',personality:'stable',multiPV:4,minRank:4,maxLoss:265,normal:280,endgame:460},
    16:{label:'R1250・ゆるふわ直感',personality:'balanced',multiPV:4,minRank:4,maxLoss:300,normal:250,endgame:420}
  };
  const NAMES=INDICES.map(i=>C[i][0]),RATINGS=INDICES.map(i=>C[i][1]);
  function profileMs(s,who){const p=PROFILES[who]||PROFILES[16];return (s.log?.length||0)>=45?p.endgame:p.normal}
  function candidateList(s,res){
    const raw=Array.isArray(res?.info?.candidates)?res.info.candidates:[],lm=legal(s),seen=new Set(),out=[];
    for(const c of raw){const token=String(c?.token||'');if(!token||seen.has(token))continue;const m=lm.find(x=>usi(x)===token);if(!m)continue;seen.add(token);out.push({...c,move:m})}
    if(res?.move){const u=usi(res.move);if(!seen.has(u))out.unshift({rank:1,token:u,move:res.move,cp:res?.info?.cp,mate:res?.info?.mate,depth:res?.info?.depth||0})}
    return out.sort((a,b)=>(a.rank||99)-(b.rank||99));
  }
  function cpLoss(best,c){if(Number.isFinite(best?.cp)&&Number.isFinite(c?.cp))return Math.max(0,best.cp-c.cp);return c===best?0:9999}
  function moveFlags(s,m){
    const before=m.f!=null?s.b[m.f]:null,base=BASE(m.drop||before?.k||''),from=m.f!=null?xy(m.f):null,to=xy(m.to),fwd=s.t===S?-1:1;
    let capture=!!s.b[m.to],promote=!!m.prom,check=false,replyChecks=0;
    const advance=from?(to[1]-from[1])*fwd:0,step=from?Math.abs(to[1]-from[1]):0,centerGain=from?(Math.abs(from[0]-4)+Math.abs(from[1]-4))-(Math.abs(to[0]-4)+Math.abs(to[1]-4)):0;
    const develop=(base==='G'||base==='S')&&!!from,kingMove=base==='K',major=base==='R'||base==='B',drop=!!m.drop;
    try{const n=apply(s,m);check=incheck(n,n.t);for(const r of legal(n).slice(0,80)){const nn=apply(n,r);if(incheck(nn,nn.t))replyChecks++}}catch(e){}
    return{capture,promote,check,replyChecks,advance,step,centerGain,develop,kingMove,major,drop,base};
  }
  function styleScore(p,f){
    if(p.personality==='aggressive')return f.capture*28+f.promote*22+f.check*38+Math.max(0,f.advance)*8+Math.max(0,f.centerGain)*3+f.major*7-f.replyChecks*2;
    if(p.personality==='defensive')return f.capture*6-f.replyChecks*20+f.develop*24+f.kingMove*18-Math.max(0,f.advance)*2+(!f.check)*4;
    if(p.personality==='stable')return f.capture*4-f.replyChecks*14-f.check*5+f.develop*28+f.kingMove*14+Math.max(0,f.centerGain)*2-f.step*4;
    if(p.personality==='positional')return f.capture*4+f.develop*24+Math.max(0,f.centerGain)*7-f.replyChecks*10+f.kingMove*8-f.step*2+f.drop*8;
    return f.capture*8+f.promote*5+f.check*5+f.develop*10+Math.max(0,f.centerGain)*2-f.replyChecks*5;
  }
  function selectProfileMove(s,res,who){
    const p=PROFILES[who]||PROFILES[16],cands=candidateList(s,res),best=cands[0];
    if(!best)return{move:res?.move,rank:1,loss:0,forced:true,reason:p.personality};
    if(best.mate!==undefined&&best.mate!==null)return{move:best.move,rank:best.rank||1,loss:0,forced:true,reason:p.personality};
    const safe=cands.filter(c=>cpLoss(best,c)<=p.maxLoss&&!(c.mate!==undefined&&c.mate!==null&&c.mate<0));
    const preferred=safe.filter(c=>(c.rank||1)>=p.minRank),pool=preferred.length?preferred:(safe.length?safe:[best]);
    let winner=pool[0],winnerScore=-1e12;
    for(const c of pool){const loss=cpLoss(best,c),f=moveFlags(s,c.move),rank=Math.max(1,c.rank||1),score=styleScore(p,f)-loss-(rank-1)*2;if(score>winnerScore){winnerScore=score;winner=c}}
    return{move:winner.move,rank:winner.rank||1,loss:cpLoss(best,winner),forced:false,reason:p.personality};
  }
  async function profiledBest(s,who){
    const p=PROFILES[who]||PROFILES[16],targetMs=profileMs(s,who),res=await shared.bestMove(s,{ms:targetMs,multiPV:p.multiPV,adaptive:false});
    if(res?.resign||res?.declareWin||!res?.move)return{...res,profile:p,targetMs,selectedRank:1,cpLoss:0};
    const picked=selectProfileMove(s,res,who);
    return{...res,move:picked.move,info:{...(res.info||{}),selectedRank:picked.rank,cpLoss:picked.loss,personality:picked.reason,profileMultiPV:p.multiPV,cohort19_26:true,forcedBest:picked.forced},profile:p,targetMs,selectedRank:picked.rank,cpLoss:picked.loss};
  }
  const aiMoveBaseCohort19=aiMove;
  aiMove=function(){
    if(!SET.has(ci))return aiMoveBaseCohort19();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    const startCi=ci,charName=C[startCi][0],profile=PROFILES[startCi]||PROFILES[16];
    thinking=true;showSpeech('think',true);setStatus(charName+'がやねうら王＋水匠5で考えています…');
    const startKey=posKey(st),startState=clone(st),started=performance.now();
    (async()=>{
      let res=null,usedFallback=false,engineError='';
      try{await shared.init();res=await profiledBest(startState,startCi)}
      catch(e){usedFallback=true;engineError=String(e&&e.message||e);console.error('COHORT19_26 YaneuraOu fallback',charName,e);const fb=chooseAI(clone(startState),startCi);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵AI fallback',error:engineError}}}
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res?.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback,book:false,cohort19_26:true,supervisor:false,engineFromMove1:true,character:charName,strengthProfile:profile.label,targetMs:res?.targetMs||profileMs(startState,startCi),multiPV:profile.multiPV};
      if(res?.resign){thinking=false;const delta=recordResult(1);setStatus(charName+'が投了しました。あなたの勝ちです。');setResult('win',charName+'投了・勝ち　R '+(delta>=0?'+':'')+delta);speechMood='loss';lastSpeech='';render();renderOpponent(true);return}
      if(res?.declareWin){thinking=false;const delta=recordResult(0);setStatus(charName+'の入玉宣言勝ちです。');setResult('loss',charName+'宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);return}
      if(res?.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);if(finishIfEnded())return;
      const x=lastAIInfo||{},label=x.fallback?'内蔵AI退避（'+String(x.error||engineError||'原因不明').slice(0,70)+'）':'やねうら王＋水匠5 '+profile.label;
      setStatus('あなたの手番です。'+label+(x.selectedRank>1?' / 候補'+x.selectedRank+'位':'')+(x.cpLoss>0?' / 評価差'+x.cpLoss+'cp':'')+(x.depth?' / 深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };
  const chars=document.getElementById('chars');
  if(chars&&!chars.dataset.cohort19_26Warm){chars.dataset.cohort19_26Warm='1';chars.addEventListener('click',ev=>{const card=ev.target.closest?.('.ch');if(!card)return;const cards=[...chars.querySelectorAll('.ch')],i=cards.indexOf(card);if(SET.has(i))setTimeout(()=>shared.init().catch(()=>{}),80)},true)}
  window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR={version:'2.15.36',mode:'profiled-yaneuraou-every-move',indices:INDICES.slice(),names:NAMES.slice(),ratings:RATINGS.slice(),profiles:JSON.parse(JSON.stringify(PROFILES)),sharedWorker:true,engine:'YaneuraOu HalfKP + Suisho5',enabled:i=>SET.has(Number(i)),profileMs:(s,i)=>profileMs(s,Number(i)),status:()=>shared.status(),init:()=>shared.init(),bestMove:(s,i)=>profiledBest(s,Number(i)),selectProfileMove:(s,res,i)=>selectProfileMove(s,res,Number(i))};
})();