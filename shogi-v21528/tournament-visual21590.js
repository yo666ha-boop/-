/* みつき将棋 大会ビジュアル演出 v2.15.90a
 * 既存の大会進行ロジックを変更せず、26キャラ実画像を主役にした対戦カードと進出演出を追加する。
 * Fire/狭幅では既存fitを尊重し、prefers-reduced-motionではアニメを抑制する。
 */
(function installTournamentVisual21590(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_VISUAL_21590A)return;
  window.__AI_SHOGI_TOURNAMENT_VISUAL_21590A=true;

  const seenAdvance=new Set();
  let observer=null,raf=0;

  function ensureStyle(){
    if(document.getElementById('tournamentVisual21590Style'))return;
    const s=document.createElement('style');
    s.id='tournamentVisual21590Style';
    s.textContent=`
#tournament21540Panel .tourBracket{background:
  radial-gradient(circle at 14% 12%,rgba(101,168,255,.10),transparent 30%),
  radial-gradient(circle at 86% 88%,rgba(255,225,116,.09),transparent 28%),
  linear-gradient(180deg,#081510 0%,#07110e 100%);border-color:#55482b;box-shadow:inset 0 0 0 1px rgba(255,231,155,.035),0 10px 30px rgba(0,0,0,.18)}
#tournament21540Panel .tourBracketRound{padding:0 2px;box-sizing:border-box}
#tournament21540Panel .tourBracketRoundTitle{position:relative;overflow:hidden;border:1px solid rgba(181,145,62,.36);border-radius:999px;padding:4px 6px;background:linear-gradient(180deg,rgba(45,48,31,.86),rgba(16,28,22,.86));letter-spacing:.04em;text-shadow:0 1px 2px #000}
#tournament21540Panel .tourBracketRoundTitle:after{content:'';position:absolute;inset:0 auto 0 -35%;width:28%;transform:skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent);animation:tour21590RoundShine 5.4s ease-in-out infinite}
#tournament21540Panel .tourBracketSlot{position:relative;overflow:visible;background:linear-gradient(135deg,rgba(16,30,24,.98),rgba(8,18,15,.98));border-color:#4e4630;box-shadow:0 3px 10px rgba(0,0,0,.16),inset 0 0 0 1px rgba(255,255,255,.015);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,opacity .22s ease,filter .22s ease}
#tournament21540Panel .tourBracketSlot:not(.empty):hover{transform:translateY(-1px);border-color:#8d7844;box-shadow:0 5px 15px rgba(0,0,0,.23),inset 0 0 0 1px rgba(255,235,168,.05)}
#tournament21540Panel .tourAvatar{width:40px;height:40px;flex:0 0 40px;border-radius:10px;border:1px solid #8b7538;background:#142019;box-shadow:0 2px 8px rgba(0,0,0,.3);position:relative;z-index:2}
#tournament21540Panel .tourAvatar img{transform:scale(1.02);transition:transform .28s ease,filter .28s ease}
#tournament21540Panel .tourBracketSlot:not(.empty):hover .tourAvatar img{transform:scale(1.08)}
#tournament21540Panel .tourSlotName{font-size:11px;line-height:1.2;text-shadow:0 1px 2px #000}
#tournament21540Panel .tourSlotMeta{min-height:14px}
#tournament21540Panel .tourBracketSlot.player{background:linear-gradient(135deg,#112a48,#0a1929);box-shadow:0 0 0 1px rgba(101,168,255,.22) inset,0 3px 12px rgba(37,106,190,.14)}
#tournament21540Panel .tourBracketSlot.current,#tournament21540Panel .tourBracketSlot.currentOpp{z-index:5;animation:tour21590CurrentPulse 1.65s ease-in-out infinite}
#tournament21540Panel .tourBracketSlot.tourAdvanced{border-color:#b99a43!important;background:linear-gradient(135deg,#273016,#101a11)!important;box-shadow:0 0 0 1px rgba(255,225,116,.20) inset,0 0 14px rgba(230,190,70,.16)}
#tournament21540Panel .tourBracketSlot.tourAdvanced .tourAvatar{border-color:#e5bd4c;box-shadow:0 0 0 2px rgba(255,225,116,.08),0 2px 10px rgba(0,0,0,.3)}
#tournament21540Panel .tourBracketSlot.tourVisualAdvance21590{animation:tour21590Advance .7s cubic-bezier(.18,.78,.25,1.08)}
#tournament21540Panel .tourBracketSlot.tourEliminated .tourAvatar img{filter:saturate(.45) brightness(.72)}
#tournament21540Panel .tourBracketSlot.champion{border-color:#ffe174!important;background:linear-gradient(135deg,#3a3210,#17190d)!important;box-shadow:0 0 0 1px rgba(255,235,140,.32) inset,0 0 22px rgba(255,205,68,.18)}
#tournament21540Panel .tourBracketSlot.champion .tourAvatar{width:46px;height:46px;flex-basis:46px;border-color:#ffe174;box-shadow:0 0 14px rgba(255,213,76,.23)}
#tournament21540Panel .tourBracketSlot[data-tour-visual-pair='a']:after{content:'VS';position:absolute;left:50%;bottom:-10px;transform:translateX(-50%);z-index:7;font-size:7px;line-height:14px;width:18px;height:14px;text-align:center;border-radius:999px;background:#111b16;border:1px solid #6f6036;color:#d9c37f;font-weight:900;pointer-events:none}
#tournament21540Panel .tourVisualBossGate21590{display:grid;grid-template-columns:58px minmax(0,1fr);gap:9px;align-items:center;border:1px solid rgba(210,165,55,.58);border-radius:12px;padding:8px;margin:7px 0;background:linear-gradient(135deg,rgba(45,34,12,.84),rgba(9,22,17,.95));box-shadow:inset 0 0 0 1px rgba(255,232,140,.05)}
#tournament21540Panel .tourVisualBossGate21590 .tourAvatar{width:54px;height:54px;flex-basis:54px;border-radius:12px;border-color:#e1b548}
#tournament21540Panel .tourVisualBossGateTitle21590{font-size:10px;color:#ceb66f;font-weight:900;letter-spacing:.05em}
#tournament21540Panel .tourVisualBossGateName21590{font-size:13px;color:#ffe38a;font-weight:900;margin-top:2px}
#tournament21540Panel .tourVisualBossGateNote21590{font-size:9px;color:#b9ad8a;margin-top:2px;line-height:1.35}
@keyframes tour21590Advance{0%{transform:translateX(-8px) scale(.95);opacity:.48;filter:brightness(1.7)}55%{transform:translateX(2px) scale(1.04);opacity:1}100%{transform:none;filter:none}}
@keyframes tour21590CurrentPulse{0%,100%{box-shadow:0 0 0 1px rgba(101,168,255,.16),0 0 8px rgba(101,168,255,.12)}50%{box-shadow:0 0 0 2px rgba(255,211,89,.26),0 0 18px rgba(255,195,56,.18)}}
@keyframes tour21590RoundShine{0%,72%,100%{left:-35%}86%{left:115%}}
@media(max-width:520px){#tournament21540Panel:not(.tourFireFit) .tourAvatar{width:36px;height:36px;flex-basis:36px}#tournament21540Panel:not(.tourFireFit) .tourBracketSlot.champion .tourAvatar{width:40px;height:40px;flex-basis:40px}}
#tournament21540Panel.tourFireFit .tourBracketSlot[data-tour-visual-pair='a']:after{display:none}
#tournament21540Panel.tourFireFit .tourVisualBossGate21590{grid-template-columns:42px minmax(0,1fr);padding:5px;gap:6px;margin:4px 0}#tournament21540Panel.tourFireFit .tourVisualBossGate21590 .tourAvatar{width:40px!important;height:40px!important;flex-basis:40px!important}
@media(prefers-reduced-motion:reduce){#tournament21540Panel .tourBracketRoundTitle:after,#tournament21540Panel .tourBracketSlot.current,#tournament21540Panel .tourBracketSlot.currentOpp,#tournament21540Panel .tourBracketSlot.tourVisualAdvance21590{animation:none!important}#tournament21540Panel .tourBracketSlot,#tournament21540Panel .tourAvatar img{transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function cleanName(slot){
    return String(slot?.querySelector('.tourSlotName')?.textContent||'').replace(/[👑🏆]/gu,'').trim();
  }
  function roundIndex(slot){
    const round=slot?.closest('.tourBracketRound');
    return Number(round?.dataset?.round??-1);
  }
  function slotIndex(slot){
    const body=slot?.parentElement;if(!body)return-1;
    return [...body.children].filter(x=>x.classList?.contains('tourBracketSlot')).indexOf(slot);
  }
  function markPairs(){
    document.querySelectorAll('#tournament21540Panel .tourBracketRound').forEach(round=>{
      const r=Number(round.dataset.round||0);if(r>=4)return;
      const slots=[...round.querySelectorAll('.tourBracketSlot')];
      slots.forEach((slot,i)=>{
        if(i%2===0&&i+1<slots.length)slot.dataset.tourVisualPair='a';
        else delete slot.dataset.tourVisualPair;
      });
    });
  }
  function animateAdvances(){
    document.querySelectorAll('#tournament21540Panel .tourBracketSlot.tourAdvanced').forEach(slot=>{
      const name=cleanName(slot),r=roundIndex(slot),i=slotIndex(slot);if(!name||r<0||i<0)return;
      const key=r+':'+i+':'+name;
      if(seenAdvance.has(key))return;
      seenAdvance.add(key);slot.classList.add('tourVisualAdvance21590');
      setTimeout(()=>slot.classList.remove('tourVisualAdvance21590'),780);
    });
  }
  function bossGate(){
    const active=document.querySelector('#tournament21540Panel .tourActive');if(!active)return;
    const existing=active.querySelector('.tourVisualBossGate21590');
    const boss=active.querySelector('.tourBoss21546');
    if(!boss){existing?.remove();return}
    if(existing)return;
    const row=boss.querySelector('.tourBoss21546Row'),img=row?.querySelector('img'),name=row?.querySelector('b')?.textContent?.replace('👑','').trim()||'杯ボス';
    const card=document.createElement('div');card.className='tourVisualBossGate21590';card.setAttribute('aria-label','トーナメント優勝後のボス戦');
    const portrait=document.createElement('span');portrait.className='tourAvatar';
    if(img?.src){const clone=document.createElement('img');clone.src=img.currentSrc||img.src;clone.alt='';clone.loading='eager';portrait.appendChild(clone)}else portrait.textContent='👑';
    const text=document.createElement('div');text.innerHTML='<div class="tourVisualBossGateTitle21590">FINAL BOSS · トーナメント優勝後</div><div class="tourVisualBossGateName21590">👑 '+name+'</div><div class="tourVisualBossGateNote21590">4勝で優勝したあとに挑む、ブラケット外の別5戦目です。</div>';
    card.append(portrait,text);boss.insertAdjacentElement('afterend',card);
  }
  function decorate(){
    ensureStyle();markPairs();animateAdvances();bossGate();
    const panel=document.getElementById('tournament21540Panel');
    if(panel)panel.dataset.visualVersion='21590a';
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;decorate()})}
  function observe(){
    const panel=document.getElementById('tournament21540Panel');if(!panel)return false;
    observer?.disconnect();observer=new MutationObserver(muts=>{
      if(muts.every(m=>m.target?.closest?.('.tourVisualBossGate21590')))return;
      schedule();
    });observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});decorate();return true;
  }
  let tries=0;const boot=setInterval(()=>{if(observe()||++tries>120)clearInterval(boot)},100);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(schedule,120),{passive:true});

  window.AI_SHOGI_TOURNAMENT_VISUAL={
    version:'21590a',refresh:decorate,
    audit:()=>{
      const panel=document.getElementById('tournament21540Panel'),slots=[...document.querySelectorAll('#tournament21540Panel .tourBracketSlot')],portraits=slots.filter(s=>s.querySelector('.tourAvatar img')).length,fallbacks=slots.filter(s=>s.querySelector('.tourAvatarFallback')&&cleanName(s)&&cleanName(s)!=='—').length;
      return{ok:!!panel,version:panel?.dataset.visualVersion||'',slots:slots.length,portraits,fallbacks,advanced:slots.filter(s=>s.classList.contains('tourAdvanced')).length,current:slots.filter(s=>s.classList.contains('current')||s.classList.contains('currentOpp')).length,bossGate:!!panel?.querySelector('.tourVisualBossGate21590'),fireFit:!!panel?.classList.contains('tourFireFit')};
    }
  };
})();
