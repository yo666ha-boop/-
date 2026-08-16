/* AI将棋先生 v2.15.18 実戦フロー自己監査＋千日手引分カウント修正 */
(function installFunctional21518(){
  const VERSION='2.15.18';

  /* 千日手はR変動なしのまま、成績の「引き分け」には正しく加算する。 */
  const finishIfEnded21518Base=finishIfEnded;
  function recordDrawNoRating21518(){
    if(gameCounted)return 0;
    gameCounted=true;
    const old=stats.rating;
    const cs=stats.chars[ci]||(stats.chars[ci]={w:0,l:0,d:0});
    stats.d=(stats.d||0)+1;
    cs.d=(cs.d||0)+1;
    saveStats();
    renderStats();
    return stats.rating-old;
  }
  finishIfEnded=function(){
    const rep=repetitionResult();
    if(rep&&rep.type!=='perpetual'){
      recordDrawNoRating21518();
      setStatus('千日手です。同一局面4回。公式ルールでは先後を交代して指し直しです。');
      setResult('draw','千日手・指し直し対象（R変動なし）');
      speechMood='normal';lastSpeech='';
      render();renderOpponent(true);
      const rb=document.getElementById('reviewBtn');if(rb)rb.textContent='対局を振り返る';
      const rs=document.getElementById('reviewStatus');if(rs)rs.textContent='対局が終わりました。AI先生と一局を振り返れます。';
      return true;
    }
    return finishIfEnded21518Base();
  };

  function deep21518(x){return JSON.parse(JSON.stringify(x));}
  function moveInLegal21518(s,m){if(!m)return false;const u=usi(m);return legal(s).some(x=>usi(x)===u);}

  function runFunctionalAudit21518(){
    const out={version:VERSION,ok:false,checkedAt:new Date().toISOString(),errors:[]};
    let liveSnapshot=null;
    try{
      /* 1) 将棋ルール監査 */
      const ra=rulesAudit();
      out.rules=ra;
      out.rulesOK=!!ra&&ra.pass===true;

      /* 2) 25キャラ全員が同一局面で合法手を返せるか */
      const probe=initial();probe.t=G;
      const legalProbe=legal(probe);const legalUSI=new Set(legalProbe.map(usi));
      const ai25=[];
      for(let i=0;i<C.length;i++){
        try{
          const r=chooseAI(clone(probe),i,18);
          const u=r&&r.move?usi(r.move):null;
          ai25.push({i,name:C[i][0],rating:C[i][1],move:u,legal:!!u&&legalUSI.has(u),depth:r?.info?.depth??0,ms:r?.info?.ms??0});
        }catch(e){ai25.push({i,name:C[i][0],rating:C[i][1],move:null,legal:false,error:String(e&&e.message||e)});}
      }
      out.ai25=ai25;
      out.ai25OK=ai25.length===25&&ai25.every(x=>x.legal);

      /* 3) R値が実際の探索設定へ反映されているか */
      const hi=aiSettings(C[0][1],0),mid=aiSettings(C[5][1],5),lo=aiSettings(C[14][1],14);
      out.strengthSettings={high:hi,mid,low:lo};
      out.strengthOrderOK=hi.maxDepth>mid.maxDepth&&hi.think>mid.think&&mid.maxDepth>=lo.maxDepth&&mid.think>lo.think;

      /* 4) 後手選択時：AIが先に指し、その後ユーザー側へ手番が渡る＋棋譜記号が反転するか */
      const g0=initial();g0.t=G;
      const gm=legal(g0)[0];
      const g1=gm?apply(g0,gm):null;
      const sm=g1?legal(g1)[0]:null;
      const savedSide=typeof SIDE2157_GOTE!=='undefined'?SIDE2157_GOTE:false;
      if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=true;
      const aiText=gm?jpMove(gm,g0):'';
      const userText=sm?jpMove(sm,g1):'';
      if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=savedSide;
      out.goteFlow={aiFirst:!!gm,turnAfterAI:g1?.t,userHasMove:!!sm,aiText,userText};
      out.goteFlowOK=!!gm&&!!g1&&g1.t===S&&!!sm&&aiText.startsWith('▲')&&userText.startsWith('△');

      /* 5) 本物の undo() を3手局面で実行し、ユーザーの直前手＋AI応手の2手が戻るか。最後に完全復元。 */
      liveSnapshot={
        st:clone(st),hist:hist.map(clone),repHistory:deep21518(repHistory),reviewTrail:reviewTrail.map(x=>({...x,before:clone(x.before),move:{...x.move}})),reviewResults:reviewResults.slice(),
        thinking,gameCounted,lastHumanBefore:lastHumanBefore?clone(lastHumanBefore):null,lastHumanMove:lastHumanMove?{...lastHumanMove}:null,
        speechMood,lastSpeech,sel,drop,ci,stats:deep21518(stats),
        sideGote:typeof SIDE2157_GOTE!=='undefined'?SIDE2157_GOTE:false,sideMode:typeof SIDE2157_MODE!=='undefined'?SIDE2157_MODE:'sente'
      };
      if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=true;
      st=initial();st.t=G;hist=[];repHistory=[repEntry(st)];reviewTrail=[];reviewResults=[];thinking=false;gameCounted=false;sel=null;drop=null;
      const m1=legal(st)[0];if(m1)push(m1,'▲');
      const m2=legal(st)[0];if(m2)push(m2,'△');
      const m3=legal(st)[0];if(m3)push(m3,'▲');
      const preUndoPly=st.log.length;
      undo();
      out.undoFlow={before:preUndoPly,after:st.log.length,turn:st.t};
      out.undoOK=preUndoPly===3&&st.log.length===1&&st.t===S;

      /* 6) R計算：勝てば上がる、負ければ下がる、千日手はR据え置きで引分数のみ増える。 */
      const savedCi=ci;ci=5;
      stats=freshStats();stats.rating=1500;gameCounted=false;const winDelta=recordResult(1);
      stats=freshStats();stats.rating=1500;gameCounted=false;const lossDelta=recordResult(0);
      stats=freshStats();stats.rating=1500;gameCounted=false;const drawBefore=stats.rating;recordDrawNoRating21518();const drawAfter=stats.rating;
      out.ratingFlow={winDelta,lossDelta,drawDelta:drawAfter-drawBefore,drawCount:stats.d};
      out.ratingOK=winDelta>0&&lossDelta<0&&drawAfter===drawBefore&&stats.d===1;
      ci=savedCi;

      /* 7) AI先生・振り返りの中核計算が実際に動くか */
      const rv=initial();
      const hm=legal(rv)[0];
      let reviewOK=false,reviewData={};
      if(hm){
        const best=chooseAI(clone(rv),0,30);
        const actual=forcedScore(clone(rv),hm,1,20);
        reviewOK=!!best?.move&&Number.isFinite(actual)&&moveInLegal21518(rv,best.move);
        reviewData={human:usi(hm),best:best?.move?usi(best.move):null,actual,bestScore:best?.info?.score};
      }
      out.reviewData=reviewData;out.reviewOK=reviewOK;

      /* 8) 全画面を実際に開閉できるか */
      const focus=document.getElementById('focus'),fb=document.getElementById('focusBtn'),cb=document.getElementById('closeBtn');
      let focusOpen=false,focusClose=false;
      if(focus&&fb&&cb){fb.click();focusOpen=focus.classList.contains('on');cb.click();focusClose=!focus.classList.contains('on');}
      out.fullscreenFlow={open:focusOpen,close:focusClose};out.fullscreenOK=focusOpen&&focusClose;

      out.ok=out.rulesOK&&out.ai25OK&&out.strengthOrderOK&&out.goteFlowOK&&out.undoOK&&out.ratingOK&&out.reviewOK&&out.fullscreenOK;
    }catch(e){out.errors.push(String(e&&e.stack||e));}
    finally{
      if(liveSnapshot){
        try{
          st=liveSnapshot.st;hist=liveSnapshot.hist;repHistory=liveSnapshot.repHistory;reviewTrail=liveSnapshot.reviewTrail;reviewResults=liveSnapshot.reviewResults;
          thinking=liveSnapshot.thinking;gameCounted=liveSnapshot.gameCounted;lastHumanBefore=liveSnapshot.lastHumanBefore;lastHumanMove=liveSnapshot.lastHumanMove;
          speechMood=liveSnapshot.speechMood;lastSpeech=liveSnapshot.lastSpeech;sel=liveSnapshot.sel;drop=liveSnapshot.drop;ci=liveSnapshot.ci;stats=liveSnapshot.stats;
          if(typeof SIDE2157_GOTE!=='undefined')SIDE2157_GOTE=liveSnapshot.sideGote;
          if(typeof SIDE2157_MODE!=='undefined')SIDE2157_MODE=liveSnapshot.sideMode;
          saveStats();render();renderStats();renderOpponent(false);if(typeof side2157UpdateLabels==='function')side2157UpdateLabels();
        }catch(e){out.errors.push('restore:'+String(e&&e.message||e));out.ok=false;}
      }
      out.checkedAt=new Date().toISOString();
      window.AI_SHOGI_FUNCTIONAL_AUDIT21518=out;
      const badge=document.querySelector('.badge');
      if(badge)badge.textContent=out.ok?'v2.15.18 25キャラ完成・実戦フロー監査OK版':'v2.15.18 25キャラ完成・実戦フロー監査注意版';
      if(window.AI_SHOGI_SIDE_TEST)window.AI_SHOGI_SIDE_TEST.version=VERSION;
      if(window.AI_SHOGI_FINAL21513)window.AI_SHOGI_FINAL21513.version=VERSION;
    }
    return out;
  }

  window.AI_SHOGI_RUN_FUNCTIONAL_AUDIT21518=runFunctionalAudit21518;
  setTimeout(runFunctionalAudit21518,700);
})();