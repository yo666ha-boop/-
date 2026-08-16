/* AI将棋先生 v2.15.19 みつき専用MAX AI＋実戦フロー監査 */
(function installFunctional21519(){
  const VERSION='2.15.19';

  /* ===== みつき専用MAX AI =====
     既存 strong2155 の最強設定よりさらに上。
     R3000表示だけでなく、探索深度・静止探索・詰み探索・思考時間を専用化する。
     iPhoneでは序盤を抑え、中盤〜終盤ほど時間を投入する。 */
  const aiSettings21519Base=aiSettings;
  aiSettings=function(r,who=ci){
    if(who===0){
      const mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent);
      return mobile
        ? {maxDepth:16,think:9000,q:10,matePly:11,mateMs:2200,qCheckLayers:5}
        : {maxDepth:18,think:18000,q:11,matePly:13,mateMs:3600,qCheckLayers:6};
    }
    return aiSettings21519Base(r,who);
  };

  const chooseAI21519Base=chooseAI;
  chooseAI=function(s,idx=ci,budgetOverride=null){
    if(idx===0 && budgetOverride==null){
      const mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent);
      const ply=(s&&Array.isArray(s.log))?s.log.length:0;
      let material=0;
      try{material=phaseV214(s)}catch(e){}
      let budget;
      if(mobile){
        if(ply<16) budget=4200;          // 序盤
        else if(material>5200) budget=7200; // 中盤
        else budget=10500;              // 終盤
      }else{
        if(ply<16) budget=7000;
        else if(material>5200) budget=14000;
        else budget=22000;
      }
      return chooseAI21519Base(s,idx,budget);
    }
    return chooseAI21519Base(s,idx,budgetOverride);
  };

  window.AI_SHOGI_MITSUKI_MAX21519={
    ok:true,
    version:VERSION,
    character:'みつき',
    rating:C?.[0]?.[1],
    mobile:{maxDepth:16,openingMs:4200,middleMs:7200,endgameMs:10500,q:10,matePly:11,mateMs:2200,qCheckLayers:5},
    desktop:{maxDepth:18,openingMs:7000,middleMs:14000,endgameMs:22000,q:11,matePly:13,mateMs:3600,qCheckLayers:6},
    deterministic:true,
    note:'上位24人とは別の専用MAX探索。終盤ほど長く読む。'
  };

  /* 千日手はR変動なしのまま、成績の「引き分け」には正しく加算する。 */
  const finishIfEnded21519Base=finishIfEnded;
  function recordDrawNoRating21519(){
    if(gameCounted)return 0;
    gameCounted=true;
    const old=stats.rating;
    const cs=stats.chars[ci]||(stats.chars[ci]={w:0,l:0,d:0});
    stats.d=(stats.d||0)+1;
    cs.d=(cs.d||0)+1;
    saveStats();renderStats();
    return stats.rating-old;
  }
  finishIfEnded=function(){
    const rep=repetitionResult();
    if(rep&&rep.type!=='perpetual'){
      recordDrawNoRating21519();
      setStatus('千日手です。同一局面4回。公式ルールでは先後を交代して指し直しです。');
      setResult('draw','千日手・指し直し対象（R変動なし）');
      speechMood='normal';lastSpeech='';render();renderOpponent(true);
      const rb=document.getElementById('reviewBtn');if(rb)rb.textContent='対局を振り返る';
      const rs=document.getElementById('reviewStatus');if(rs)rs.textContent='対局が終わりました。AI先生と一局を振り返れます。';
      return true;
    }
    return finishIfEnded21519Base();
  };

  function deep21519(x){return JSON.parse(JSON.stringify(x));}
  function moveInLegal21519(s,m){if(!m)return false;const u=usi(m);return legal(s).some(x=>usi(x)===u);}

  function runFunctionalAudit21519(){
    const out={version:VERSION,ok:false,checkedAt:new Date().toISOString(),errors:[]};
    let liveSnapshot=null;
    try{
      const ra=rulesAudit();out.rules=ra;out.rulesOK=!!ra&&ra.pass===true;

      const probe=initial();probe.t=G;
      const legalProbe=legal(probe),legalUSI=new Set(legalProbe.map(usi));
      const ai25=[];
      for(let i=0;i<C.length;i++){
        try{
          const r=chooseAI(clone(probe),i,18),u=r&&r.move?usi(r.move):null;
          ai25.push({i,name:C[i][0],rating:C[i][1],move:u,legal:!!u&&legalUSI.has(u),depth:r?.info?.depth??0,ms:r?.info?.ms??0});
        }catch(e){ai25.push({i,name:C[i][0],rating:C[i][1],move:null,legal:false,error:String(e&&e.message||e)});}
      }
      out.ai25=ai25;out.ai25OK=ai25.length===25&&ai25.every(x=>x.legal);

      const hi=aiSettings(C[0][1],0),next=aiSettings(C[1][1],1),mid=aiSettings(C[5][1],5),lo=aiSettings(C[14][1],14);
      out.strengthSettings={mitsuki:hi,next,mid,low:lo};
      out.mitsukiMaxOK=hi.maxDepth>=16&&hi.q>=10&&hi.matePly>=11&&hi.think>next.think&&hi.maxDepth>next.maxDepth;
      out.strengthOrderOK=out.mitsukiMaxOK&&next.maxDepth>mid.maxDepth&&next.think>mid.think&&mid.maxDepth>=lo.maxDepth&&mid.think>lo.think;

      const g0=initial();g0.t=G;const gm=legal(g0)[0],g1=gm?apply(g0,gm):null,sm=g1?legal(g1)[0]:null;
      const savedSide=typeof SIDE2157_GOTE!=='undefined'?SIDE2157_GOTE:false;
      if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=true;
      const aiText=gm?jpMove(gm,g0):'',userText=sm?jpMove(sm,g1):'';
      if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=savedSide;
      out.goteFlow={aiFirst:!!gm,turnAfterAI:g1?.t,userHasMove:!!sm,aiText,userText};
      out.goteFlowOK=!!gm&&!!g1&&g1.t===S&&!!sm&&aiText.startsWith('▲')&&userText.startsWith('△');

      liveSnapshot={st:clone(st),hist:hist.map(clone),repHistory:deep21519(repHistory),reviewTrail:reviewTrail.map(x=>({...x,before:clone(x.before),move:{...x.move}})),reviewResults:reviewResults.slice(),thinking,gameCounted,lastHumanBefore:lastHumanBefore?clone(lastHumanBefore):null,lastHumanMove:lastHumanMove?{...lastHumanMove}:null,speechMood,lastSpeech,sel,drop,ci,stats:deep21519(stats),sideGote:typeof SIDE2157_GOTE!=='undefined'?SIDE2157_GOTE:false,sideMode:typeof SIDE2157_MODE!=='undefined'?SIDE2157_MODE:'sente'};
      if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=true;
      st=initial();st.t=G;hist=[];repHistory=[repEntry(st)];reviewTrail=[];reviewResults=[];thinking=false;gameCounted=false;sel=null;drop=null;
      const m1=legal(st)[0];if(m1)push(m1,'▲');
      const m2=legal(st)[0];if(m2){const beforeHuman=clone(st);reviewTrail.push({ply:st.log.length+1,before:beforeHuman,move:{...m2},moveText:jpMove(m2,beforeHuman)});push(m2,'△');}
      const m3=legal(st)[0];if(m3)push(m3,'▲');
      const preUndoPly=st.log.length;undo();
      out.undoFlow={before:preUndoPly,after:st.log.length,turn:st.t,reviewAfter:reviewTrail.length};
      out.undoOK=preUndoPly===3&&st.log.length===1&&st.t===S&&reviewTrail.length===0;

      const savedCi=ci;ci=5;
      stats=freshStats();stats.rating=1500;gameCounted=false;const winDelta=recordResult(1);
      stats=freshStats();stats.rating=1500;gameCounted=false;const lossDelta=recordResult(0);
      stats=freshStats();stats.rating=1500;gameCounted=false;const drawBefore=stats.rating;recordDrawNoRating21519();const drawAfter=stats.rating;
      out.ratingFlow={winDelta,lossDelta,drawDelta:drawAfter-drawBefore,drawCount:stats.d};
      out.ratingOK=winDelta>0&&lossDelta<0&&drawAfter===drawBefore&&stats.d===1;ci=savedCi;

      const rv=initial(),hm=legal(rv)[0];let reviewOK=false,reviewData={};
      if(hm){const best=chooseAI(clone(rv),0,30),actual=forcedScore(clone(rv),hm,1,20);reviewOK=!!best?.move&&Number.isFinite(actual)&&moveInLegal21519(rv,best.move);reviewData={human:usi(hm),best:best?.move?usi(best.move):null,actual,bestScore:best?.info?.score};}
      out.reviewData=reviewData;out.reviewOK=reviewOK;

      const focus=document.getElementById('focus'),fb=document.getElementById('focusBtn'),cb=document.getElementById('closeBtn');let focusOpen=false,focusClose=false;
      if(focus&&fb&&cb){fb.click();focusOpen=focus.classList.contains('on');cb.click();focusClose=!focus.classList.contains('on');}
      out.fullscreenFlow={open:focusOpen,close:focusClose};out.fullscreenOK=focusOpen&&focusClose;

      out.ok=out.rulesOK&&out.ai25OK&&out.strengthOrderOK&&out.goteFlowOK&&out.undoOK&&out.ratingOK&&out.reviewOK&&out.fullscreenOK;
    }catch(e){out.errors.push(String(e&&e.stack||e));}
    finally{
      if(liveSnapshot){try{st=liveSnapshot.st;hist=liveSnapshot.hist;repHistory=liveSnapshot.repHistory;reviewTrail=liveSnapshot.reviewTrail;reviewResults=liveSnapshot.reviewResults;thinking=liveSnapshot.thinking;gameCounted=liveSnapshot.gameCounted;lastHumanBefore=liveSnapshot.lastHumanBefore;lastHumanMove=liveSnapshot.lastHumanMove;speechMood=liveSnapshot.speechMood;lastSpeech=liveSnapshot.lastSpeech;sel=liveSnapshot.sel;drop=liveSnapshot.drop;ci=liveSnapshot.ci;stats=liveSnapshot.stats;if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=liveSnapshot.sideGote;if(typeof SIDE2157_MODE!=='undefined')SIDE2157_MODE=liveSnapshot.sideMode;saveStats();render();renderStats();renderOpponent(false);if(typeof side2157UpdateLabels==='function')side2157UpdateLabels();}catch(e){out.errors.push('restore:'+String(e&&e.message||e));out.ok=false;}}
      out.checkedAt=new Date().toISOString();window.AI_SHOGI_FUNCTIONAL_AUDIT21519=out;
      const badge=document.querySelector('.badge');if(badge)badge.textContent=out.ok?'v2.15.19 みつきMAX・実戦監査OK版':'v2.15.19 みつきMAX・監査注意版';
      if(window.AI_SHOGI_SIDE_TEST)window.AI_SHOGI_SIDE_TEST.version=VERSION;if(window.AI_SHOGI_FINAL21513)window.AI_SHOGI_FINAL21513.version=VERSION;
    }
    return out;
  }

  window.AI_SHOGI_RUN_FUNCTIONAL_AUDIT21519=runFunctionalAudit21519;
  setTimeout(runFunctionalAudit21519,700);
})();