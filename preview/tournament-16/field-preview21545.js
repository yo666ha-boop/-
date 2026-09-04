/* みつき将棋 大会参加者ルール・外部確認ページ 21545a */
(function installPreviewField21545(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_FIELD_21545A)return;
  window.__TOURNAMENT_PREVIEW_FIELD_21545A=true;

  const rate=ch=>Number(ch?.rating)||1500;
  function rule(cup){
    const nonBoss=CH.filter(ch=>ch.name!==cup.boss);
    const asc=nonBoss.slice().sort((a,b)=>rate(a)-rate(b)||String(a.name).localeCompare(String(b.name),'ja'));
    const minimumNeeded=rate(asc[Math.min(13,Math.max(0,asc.length-1))]);
    const ceiling=Math.max(Number(cup.bossRating)||1500,minimumNeeded||0);
    const score=ch=>{const d=rate(ch)-cup.bossRating;return d<=0?Math.abs(d):(Math.abs(d)*4+120)};
    const selected=nonBoss.filter(ch=>rate(ch)<=ceiling).sort((a,b)=>score(a)-score(b)||rate(a)-rate(b)||String(a.name).localeCompare(String(b.name),'ja')).slice(0,14);
    return{cupId:cup.id,boss:cup.boss,bossRating:cup.bossRating,minimumNeeded,ceiling,selected:selected.map(ch=>ch.name),selectedMax:Math.max(...selected.map(rate)),overBoss:selected.filter(ch=>rate(ch)>cup.bossRating).map(ch=>ch.name)};
  }

  roster=function(cup){const r=rule(cup);return[PLAYER,...r.selected,cup.boss]};
  window.TOURNAMENT_PREVIEW_FIELD_RULE={
    version:'21545a',
    audit:(id='akiou')=>{const cup=CUPS.find(c=>c.id===id)||CUPS.find(c=>c.id==='akiou');return{ok:true,...rule(cup)}},
    cups:()=>CUPS.map(rule)
  };
})();