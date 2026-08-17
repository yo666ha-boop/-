/* AI将棋先生 v2.15.29: 上位5人を未来みつきと同じやねうら王＋水匠5 Workerへ接続＋強さ段階調整 */
(function installTop5Yaneura21529(){
  if(window.AI_SHOGI_YANEURAOU_TOP5)return;
  const TOP5=[0,1,2,3,4];
  const TOP5_SET=new Set(TOP5);
  const shared=window.AI_SHOGI_YANEURAOU_FUTURE;
  if(!shared||typeof shared.init!=='function'||typeof shared.bestMove!=='function'){
    setTimeout(installTop5Yaneura21529,120);
    return;
  }

  const NAMES=TOP5.map(i=>C[i]?.[0]||('CHAR'+i));
  const RATINGS=TOP5.map(i=>C[i]?.[1]||0);
  const PROFILES={
    0:{label:'R3000調整',desktop:{normal:5200,endgame:7600},mobile:{normal:3300,endgame:5000}},
    1:{label:'R2850調整',desktop:{normal:4200,endgame:6200},mobile:{normal:2800,endgame:4300}},
    2:{label:'R2700調整',desktop:{normal:3400,endgame:5200},mobile:{normal:2300,endgame:3600}},
    3:{label:'R2600調整',desktop:{normal:2700,endgame:4300},mobile:{normal:1850,endgame:3000}},
    4:{label:'R2500調整',desktop:{normal:2200,endgame:3600},mobile:{normal:1500,endgame:2500}}
  };

  for(const i of TOP5){
    if(CHAR_META[i]&&!String(CHAR_META[i].feature||'').includes('やねうら王')){
      CHAR_META[i]={...CHAR_META[i],feature:String(CHAR_META[i].feature||'')+' / やねうら王＋水匠5 共通Worker'};
    }
  }

  function isMobile(){return /iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent)}
  function profileMs(s,who){
    const p=PROFILES[who]||PROFILES[4],mode=isMobile()?'mobile':'desktop',phase=(s.log?.length||0)>=55?'endgame':'normal';
    return p[mode][phase];
  }
  function top5BookMove(s,who){
    try{
      if(typeof bookCandidatesV294!=='function'||s.log.length>=9||incheck(s,s.t))return null;
      const lm=legal(s),cands=bookCandidatesV294(s,who,lm);
      return cands&&cands.length?cands[0]:null;
    }catch(e){return null}
  }

  const aiMoveBaseTop5=aiMove;
  aiMove=function(){
    if(!TOP5_SET.has(ci))return aiMoveBaseTop5();
    if(st.t!=G||thinking||gameCounted)return;
    if(finishIfEnded())return;

    const startCi=ci;
    const charName=C[startCi][0];
    const profile=PROFILES[startCi]||PROFILES[4];
    thinking=true;
    showSpeech('think',true);
    setStatus(charName+'がやねうら王＋水匠5で考えています…');
    const startKey=posKey(st),startState=clone(st),started=performance.now();

    (async()=>{
      let res=null,usedFallback=false,usedBook=false,engineError='',targetMs=profileMs(startState,startCi);
      try{
        const bm=top5BookMove(startState,startCi);
        if(bm){
          usedBook=true;
          res={move:bm,info:{engine:'キャラ定跡＋やねうら王待機',book:true,depth:0,nodes:0,ms:0}};
          shared.init().catch(()=>{});
        }else{
          await shared.init();
          res=await shared.bestMove(startState,{ms:targetMs});
        }
      }catch(e){
        usedFallback=true;
        engineError=String(e&&e.message||e);
        console.error('TOP5 YaneuraOu fallback',charName,e);
        const fb=chooseAI(clone(startState),startCi);
        res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵AI fallback',error:engineError}};
      }

      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res?.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback,book:usedBook,top5Engine:true,character:charName,strengthProfile:profile.label,targetMs};

      if(res?.resign){
        thinking=false;
        const delta=recordResult(1);
        setStatus(charName+'が投了しました。あなたの勝ちです。');
        setResult('win',charName+'投了・勝ち　R '+(delta>=0?'+':'')+delta);
        speechMood='loss';lastSpeech='';render();renderOpponent(true);return;
      }
      if(res?.declareWin){
        thinking=false;
        const delta=recordResult(0);
        setStatus(charName+'の入玉宣言勝ちです。');
        setResult('loss',charName+'宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);
        speechMood='win';lastSpeech='';render();renderOpponent(true);return;
      }
      if(res?.move)push(res.move,'△');
      thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);
      if(finishIfEnded())return;
      const x=lastAIInfo||{};
      const label=x.fallback?'内蔵AI退避（'+String(x.error||engineError||'原因不明').slice(0,70)+'）':x.book?'キャラ定跡＋やねうら王待機':'やねうら王＋水匠5 '+profile.label;
      setStatus('あなたの手番です。'+label+(x.depth?' / 深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };

  /* 選択時に共通Workerを先読み。上位5人だけで1基を共有する。 */
  const chars=document.getElementById('chars');
  if(chars&&!chars.dataset.top5YaneuraWarm){
    chars.dataset.top5YaneuraWarm='1';
    chars.addEventListener('click',ev=>{
      const card=ev.target.closest?.('.ch');if(!card)return;
      const cards=[...chars.querySelectorAll('.ch')],i=cards.indexOf(card);
      if(TOP5_SET.has(i))setTimeout(()=>shared.init().catch(()=>{}),80);
    },true);
  }

  window.AI_SHOGI_YANEURAOU_TOP5={
    version:'2.15.29-tune1',
    indices:TOP5.slice(),
    names:NAMES.slice(),
    ratings:RATINGS.slice(),
    profiles:JSON.parse(JSON.stringify(PROFILES)),
    sharedWorker:true,
    engine:'YaneuraOu HalfKP + Suisho5',
    enabled:i=>TOP5_SET.has(Number(i)),
    profileMs:(s,i)=>profileMs(s,Number(i)),
    status:()=>shared.status(),
    init:()=>shared.init(),
    bestMove:(s,i=0)=>shared.bestMove(s,{ms:profileMs(s,Number(i))})
  };
  try{render();renderStats();renderOpponent(false)}catch(e){}
})();
