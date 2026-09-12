/* みつき将棋 大会参加者ルール・外部確認ページ 21545c */
(function installPreviewField21545(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_FIELD_21545C)return;
  window.__TOURNAMENT_PREVIEW_FIELD_21545C=true;

  const rate=ch=>Number(ch?.rating)||1500;
  function random01(){
    try{const u=new Uint32Array(1);crypto.getRandomValues(u);return u[0]/4294967296}catch(e){return Math.random()}
  }
  function shuffle(list){
    const a=list.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(random01()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  function rule(cup){
    const nonBoss=CH.filter(ch=>ch.name!==cup.boss);
    const asc=nonBoss.slice().sort((a,b)=>rate(a)-rate(b)||String(a.name).localeCompare(String(b.name),'ja'));
    const minimumNeeded=rate(asc[Math.min(14,Math.max(0,asc.length-1))]);
    const ceiling=Math.max(Number(cup.bossRating)||1500,minimumNeeded||0);
    const eligible=nonBoss.filter(ch=>rate(ch)<=ceiling);
    const score=ch=>{const d=rate(ch)-cup.bossRating;return d<=0?Math.abs(d):(Math.abs(d)*4+120)};
    const selected=eligible.slice().sort((a,b)=>score(a)-score(b)||rate(a)-rate(b)||String(a.name).localeCompare(String(b.name),'ja')).slice(0,15);
    return{cupId:cup.id,boss:cup.boss,bossRating:cup.bossRating,minimumNeeded,ceiling,eligible:eligible.map(ch=>ch.name),selected:selected.map(ch=>ch.name),selectedMax:Math.max(...selected.map(rate)),overBoss:selected.filter(ch=>rate(ch)>cup.bossRating).map(ch=>ch.name)};
  }
  function draw(cup){
    const r=rule(cup);
    const picked=shuffle(r.eligible).slice(0,15);
    return shuffle([PLAYER,...picked]);
  }

  roster=function(cup){return draw(cup)};
  window.TOURNAMENT_PREVIEW_FIELD_RULE={
    version:'21545c',
    audit:(id='akiou')=>{const cup=CUPS.find(c=>c.id===id)||CUPS.find(c=>c.id==='akiou');return{ok:true,...rule(cup),bossSeparate:true,bossInBracket:false,randomizedBracket:true}},
    cups:()=>CUPS.map(rule),
    draw:id=>{const cup=CUPS.find(c=>c.id===id)||CUPS.find(c=>c.id==='akiou');return draw(cup)}
  };
})();