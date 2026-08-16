window.FINAL21513_IMAGES=window.FINAL21513_IMAGES||{};window.FINAL21513_IMAGES.rin='./rin21515.jpg?v=21515';
(function installFinalAudit21515(){
  const MOODS21515=['start','normal','winning','losing','critical','think','win','loss','undo'];
  function audit21515(){
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
        for(const mood of MOODS21515){
          if(!Array.isArray(bank[mood])||bank[mood].length<3)dialogueMissing.push((names[i]||('#'+i))+':'+mood+':'+((bank[mood]||[]).length));
        }
      }
      const cards=[...document.querySelectorAll('#chars .ch')];
      const badImages=[];
      cards.forEach((card,i)=>{
        const img=card.querySelector('img.chPic');
        if(!img||!img.complete||img.naturalWidth<1||img.naturalHeight<1)badImages.push(names[i]||('#'+i));
      });
      const side=document.getElementById('sideSelect2157');
      const sideValues=side?[...side.options].map(o=>o.value):[];
      const sideOK=!!side&&['sente','gote','random'].every(v=>sideValues.includes(v))&&!!window.AI_SHOGI_SIDE_TEST;
      const fullscreenOK=['focus','foppPortrait','foppName','foppRank','foppStyle','fcharSpeech','fgHand','fboard','fsHand','fundoBtn','fstatus'].every(id=>!!document.getElementById(id));
      const recentAvoid=window.AI_SHOGI_DIALOGUE_AUDIT?.recentAvoid===4;
      const tempCount=document.querySelectorAll('#chars .ch .chTemp').length;
      const ok=names.length===25&&uniqueNames===25&&ratingsOK&&stylesOK&&metasOK&&dialogueMissing.length===0&&cards.length===25&&badImages.length===0&&sideOK&&fullscreenOK&&recentAvoid&&tempCount===0;
      window.AI_SHOGI_FINAL_AUDIT21515={version:'2.15.15',ok,total:names.length,uniqueNames,ratingsOK,stylesOK,metasOK,dialogueMissing,badImages,sideOK,fullscreenOK,recentAvoid,tempCount,names,ratings,checkedAt:new Date().toISOString()};
      const badge=document.querySelector('.badge');
      if(badge)badge.textContent=ok?'v2.15.15 25キャラ完成・最終監査OK版':'v2.15.15 25キャラ完成・監査注意版';
      if(window.AI_SHOGI_SIDE_TEST)window.AI_SHOGI_SIDE_TEST.version='2.15.15';
      if(window.AI_SHOGI_FINAL21513)window.AI_SHOGI_FINAL21513.version='2.15.15';
      return ok;
    }catch(e){console.error('final audit 21515',e);return false}
  }
  let tries=0;
  const run=()=>{tries++;const ok=audit21515();if(!ok&&tries<4)setTimeout(run,1200)};
  setTimeout(run,2400);
})();