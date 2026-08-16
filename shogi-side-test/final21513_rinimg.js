window.FINAL21513_IMAGES=window.FINAL21513_IMAGES||{};window.FINAL21513_IMAGES.rin='./rin21515.jpg?v=21515';
(function installFinalAudit21517(){
  const MOODS=['start','normal','winning','losing','critical','think','win','loss','undo'];
  function audit21517(){
    try{
      const names=Array.isArray(C)?C.map(x=>x&&x[0]):[];
      const ratings=Array.isArray(C)?C.map(x=>Number(x&&x[1])):[];
      const uniqueNames=new Set(names).size;
      const ratingsOK=ratings.length===25&&ratings.every(Number.isFinite);
      const stylesOK=Array.isArray(STYLE)&&STYLE.length>=25&&STYLE.slice(0,25).every(x=>x&&Number.isFinite(x.atk)&&Number.isFinite(x.def)&&Number.isFinite(x.pos)&&Number.isFinite(x.end));
      const metasOK=Array.isArray(CHAR_META)&&CHAR_META.length>=25&&CHAR_META.slice(0,25).every(x=>x&&x.style&&x.feature);
      const dialogueMissing=[];
      for(let i=5;i<25;i++){
        const bank=(typeof TEMP_DIALOGUES!=='undefined'&&TEMP_DIALOGUES[i-5])||{};
        for(const mood of MOODS){if(!Array.isArray(bank[mood])||bank[mood].length<3)dialogueMissing.push((names[i]||('#'+i))+':'+mood+':'+((bank[mood]||[]).length));}
      }
      const cards=[...document.querySelectorAll('#chars .ch')];
      const badImages=[];
      cards.forEach((card,i)=>{const img=card.querySelector('img.chPic');if(!img||!img.complete||img.naturalWidth<1||img.naturalHeight<1)badImages.push(names[i]||('#'+i));});
      const side=document.getElementById('sideSelect2157');
      const sideValues=side?[...side.options].map(o=>o.value):[];
      const sideOK=!!side&&['sente','gote','random'].every(v=>sideValues.includes(v))&&!!window.AI_SHOGI_SIDE_TEST;
      const fullscreenOK=['focus','foppPortrait','foppName','foppRank','foppStyle','fcharSpeech','fgHand','fboard','fsHand','fundoBtn','fstatus'].every(id=>!!document.getElementById(id));
      const recentAvoid=window.AI_SHOGI_DIALOGUE_AUDIT?.recentAvoid===4;
      const tempCount=document.querySelectorAll('#chars .ch .chTemp').length;
      const strongMarker=window.AI_SHOGI_STRONG_SCOPE_FIX21517||{};
      const strongOK=strongMarker.ok===true&&strongMarker.bindingChanged===true;

      let legalOK=false,applyOK=false,aiProbeOK=false,strengthOrderOK=false,probeError='';
      try{
        const ps=clone(st),lm=legal(ps);
        legalOK=Array.isArray(lm)&&lm.length>0;
        if(legalOK){const n=apply(clone(ps),lm[0]);applyOK=!!n&&Array.isArray(legal(n));}
        if(typeof chooseAI==='function'){
          const p1=chooseAI(clone(st),0,45);
          const p2=chooseAI(clone(st),16,45);
          aiProbeOK=!!p1&&!!p1.move&&!!p1.info&&!!p2&&!!p2.move&&!!p2.info;
        }
        if(typeof aiSettings==='function'){
          const hi=aiSettings(C[0][1],0),lo=aiSettings(C[16][1],16);
          strengthOrderOK=!!hi&&!!lo&&hi.maxDepth>lo.maxDepth&&hi.think>lo.think;
        }
      }catch(e){probeError=String(e&&e.message||e);}

      const functionalOK=legalOK&&applyOK&&aiProbeOK&&strengthOrderOK;
      const ok=names.length===25&&uniqueNames===25&&ratingsOK&&stylesOK&&metasOK&&dialogueMissing.length===0&&cards.length===25&&badImages.length===0&&sideOK&&fullscreenOK&&recentAvoid&&tempCount===0&&strongOK&&functionalOK;
      window.AI_SHOGI_FINAL_AUDIT21517={version:'2.15.17',ok,total:names.length,uniqueNames,ratingsOK,stylesOK,metasOK,dialogueMissing,badImages,sideOK,fullscreenOK,recentAvoid,tempCount,strongOK,strongMarker,legalOK,applyOK,aiProbeOK,strengthOrderOK,functionalOK,probeError,names,ratings,checkedAt:new Date().toISOString()};
      const newerAudit=!!window.AI_SHOGI_FUNCTIONAL_AUDIT21520||!!window.AI_SHOGI_FUNCTIONAL_AUDIT21519||!!window.AI_SHOGI_FUNCTIONAL_AUDIT21518;
      const badge=document.querySelector('.badge');
      if(badge&&!newerAudit)badge.textContent=ok?'v2.15.17 25キャラ完成・実戦監査OK版':'v2.15.17 25キャラ完成・監査注意版';
      if(window.AI_SHOGI_SIDE_TEST&&!newerAudit)window.AI_SHOGI_SIDE_TEST.version='2.15.17';
      if(window.AI_SHOGI_FINAL21513&&!newerAudit)window.AI_SHOGI_FINAL21513.version='2.15.17';
      return ok;
    }catch(e){console.error('final audit 21517',e);return false}
  }
  let tries=0;const run=()=>{tries++;const ok=audit21517();if(!ok&&tries<5)setTimeout(run,1200)};setTimeout(run,2200);
})();

/* v2.15.20: 25AI・みつきMAX・後手・待った・R変動・振り返り・全画面を非破壊自己監査 */
(async function loadFunctional21520(){
  try{
    const b=document.querySelector('.badge');if(b)b.textContent='v2.15.20 みつきMAX・実戦フロー監査中';
    const l=document.getElementById('strongLoad');if(l)l.textContent='AI将棋先生 v2.15.20 実戦フローを確認しています…';
    const r=await fetch('./functional21518.js?v=21520',{cache:'no-store'});
    if(!r.ok)throw new Error('functional21518.js '+r.status);
    eval(await r.text());
  }catch(e){
    console.error('functional21520 load failed',e);
    const b=document.querySelector('.badge');if(b)b.textContent='v2.15.20 実戦フロー監査読込エラー';
  }
})();