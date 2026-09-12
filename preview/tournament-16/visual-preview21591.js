/* みつき将棋 外部確認ページ・画像カード/進出演出 21591a
 * preview専用。大会進行/AI/R/勝敗ロジックは変更しない。
 */
(function installTournamentPreviewVisual21591(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_VISUAL_21591A)return;
  window.__TOURNAMENT_PREVIEW_VISUAL_21591A=true;
  let attempt=0,introTimer=0,bossTimer=0;
  const seenRound=new Set(),seenAdvance=new Set();

  function ensureStyle(){
    if(document.getElementById('previewVisual21591Style'))return;
    const s=document.createElement('style');s.id='previewVisual21591Style';s.textContent=`
#stage{position:relative;overflow:hidden}.bracket{background:radial-gradient(circle at 12% 12%,rgba(101,168,255,.10),transparent 28%),radial-gradient(circle at 86% 86%,rgba(255,225,116,.10),transparent 26%),linear-gradient(180deg,#07130f,#050d0b);box-shadow:inset 0 0 0 1px rgba(255,232,161,.035),0 12px 30px rgba(0,0,0,.2)}
.round{padding:0 2px}.roundTitle{position:relative;overflow:hidden;border:1px solid rgba(181,145,62,.42);border-radius:999px;padding:4px 6px!important;background:linear-gradient(180deg,rgba(44,47,30,.92),rgba(14,25,20,.92));letter-spacing:.04em;color:#d8c985!important;text-shadow:0 1px 2px #000}.round.pvCurrentRound21591 .roundTitle{border-color:#e5b94d;color:#ffe58a!important;box-shadow:0 0 13px rgba(229,185,77,.22)}
.slot{min-height:46px!important;padding:4px!important;border-radius:9px!important;background:linear-gradient(135deg,rgba(17,31,25,.98),rgba(7,16,13,.98))!important;border-color:#51472f!important;box-shadow:0 3px 10px rgba(0,0,0,.18),inset 0 0 0 1px rgba(255,255,255,.018);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,filter .22s ease,opacity .22s ease}.slot:not(.empty):hover{transform:translateY(-1px)!important;border-color:#8d7844!important;box-shadow:0 6px 16px rgba(0,0,0,.25)!important}.slot.player{background:linear-gradient(135deg,#112a48,#091827)!important;border-color:#477bb7!important}.slot.pvAdvanced21591{border-color:#c7a54b!important;background:linear-gradient(135deg,#273116,#0f1910)!important;box-shadow:0 0 0 1px rgba(255,225,116,.15) inset,0 0 14px rgba(226,185,70,.16)!important}.slot.pvAdvanceAnim21591{animation:pv21591Advance .72s cubic-bezier(.18,.78,.25,1.08)}.slot.eliminated{filter:saturate(.45) brightness(.74)}
.avatar{width:38px!important;height:38px!important;flex:0 0 38px!important;border-radius:10px!important;border:1px solid #8d773c!important;box-shadow:0 2px 8px rgba(0,0,0,.3)}.avatar img{transform:scale(1.02);transition:transform .25s ease}.slot:not(.empty):hover .avatar img{transform:scale(1.08)}.name{font-size:10px;line-height:1.2}.meta{font-size:7px!important}.champion .avatar{width:44px!important;height:44px!important;flex-basis:44px!important;border-color:#ffe174!important;box-shadow:0 0 14px rgba(255,213,76,.24)}
.pvRoundIntro21591,.pvBossIntro21591{position:absolute;inset:0;z-index:80;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at 50% 48%,rgba(26,51,40,.74),rgba(4,11,9,.84));animation:pv21591Backdrop 1.2s ease both}.pvIntroCard21591{min-width:min(74%,280px);padding:15px 18px;border:1px solid rgba(235,199,92,.62);border-radius:16px;text-align:center;background:linear-gradient(145deg,rgba(31,45,29,.98),rgba(8,19,15,.99));box-shadow:0 12px 38px rgba(0,0,0,.48),inset 0 0 0 1px rgba(255,238,166,.06);animation:pv21591Card 1.2s cubic-bezier(.18,.78,.25,1.08) both}.pvBossIntro21591 .pvIntroCard21591{border-color:rgba(255,204,73,.8);background:radial-gradient(circle at 50% 0,rgba(125,75,12,.38),transparent 54%),linear-gradient(145deg,rgba(45,34,14,.99),rgba(8,19,15,.99))}.pvKicker21591{font-size:9px;letter-spacing:.16em;color:#bda45f;font-weight:900}.pvTitle21591{margin-top:3px;font-size:21px;line-height:1.1;color:#ffe58a;font-weight:950;text-shadow:0 2px 8px #000}.pvSub21591{margin-top:5px;font-size:10px;color:#d7d1b8}
#bossPreview21546{border-color:#d3a642!important;background:radial-gradient(circle at 0 50%,rgba(114,74,14,.26),transparent 44%),linear-gradient(90deg,#18160d,#0a1512)!important;box-shadow:0 0 16px rgba(211,166,66,.12)}
@keyframes pv21591Advance{0%{transform:translateX(-9px) scale(.94);opacity:.42;filter:brightness(1.75)}58%{transform:translateX(2px) scale(1.035);opacity:1}100%{transform:none;filter:none}}@keyframes pv21591Backdrop{0%{opacity:0}18%,72%{opacity:1}100%{opacity:0}}@keyframes pv21591Card{0%{opacity:0;transform:scale(.82) translateY(10px)}22%,72%{opacity:1;transform:none}100%{opacity:0;transform:scale(1.03) translateY(-3px)}}
@media(max-width:900px){.slot{min-height:42px!important}.avatar{width:34px!important;height:34px!important;flex-basis:34px!important}}@media(prefers-reduced-motion:reduce){.slot,.avatar img,.pvRoundIntro21591,.pvBossIntro21591,.pvIntroCard21591,.slot.pvAdvanceAnim21591{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }
  function veil(kind,title,sub){
    const host=document.getElementById('stage');if(!host)return;
    host.querySelector('.pvRoundIntro21591,.pvBossIntro21591')?.remove();
    const v=document.createElement('div');v.className=kind==='boss'?'pvBossIntro21591':'pvRoundIntro21591';v.setAttribute('aria-hidden','true');
    v.innerHTML='<div class="pvIntroCard21591"><div class="pvKicker21591">'+(kind==='boss'?'EXTRA MATCH':'TOURNAMENT')+'</div><div class="pvTitle21591">'+title+'</div><div class="pvSub21591">'+sub+'</div></div>';
    host.appendChild(v);const t=kind==='boss'?'bossTimer':'introTimer';clearTimeout(kind==='boss'?bossTimer:introTimer);const id=setTimeout(()=>v.remove(),1250);if(kind==='boss')bossTimer=id;else introTimer=id;
  }
  function decorate(){
    ensureStyle();if(!active||!document.getElementById('stage')?.classList.contains('on'))return;
    const rounds=[...document.querySelectorAll('#bracket .round')],r=Math.max(0,Number(active.round)||0);
    rounds.forEach((round,ri)=>round.classList.toggle('pvCurrentRound21591',ri===r&&active.status!=='lost'));
    rounds.forEach((round,ri)=>[...round.querySelectorAll('.slot')].forEach((slot,si)=>{
      if(slot.classList.contains('empty'))return;const name=String(slot.querySelector('.name')?.textContent||'').trim(),state=String(slot.querySelector('.state')?.textContent||'').trim();
      slot.classList.toggle('pvAdvanced21591',state==='勝利'||state==='優勝');
      if(ri>0&&name&&name!=='—'){const k=attempt+':'+ri+':'+si+':'+name;if(!seenAdvance.has(k)){seenAdvance.add(k);slot.classList.add('pvAdvanceAnim21591');setTimeout(()=>slot.classList.remove('pvAdvanceAnim21591'),780)}}
    }));
    const roundKey=attempt+':'+r+':'+active.status;if(active.status==='playing'&&r<4&&!seenRound.has(roundKey)){seenRound.add(roundKey);const jp=['1回戦','準々決勝','準決勝','決勝'][r],en=['ROUND OF 16','QUARTERFINAL','SEMIFINAL','FINAL'][r];veil('round',jp,en+' · 対局開始')}
    const bp=active.bossChallenge?.status;if(['pending','active','draw'].includes(bp)){const bk=attempt+':boss:'+bp;if(!seenRound.has(bk)){seenRound.add(bk);veil('boss','優勝後ボス戦',String(active.cup?.boss||'杯ボス')+' · EXTRA MATCH')}}
  }
  const oldStart=start;start=function(id){attempt++;seenRound.clear();seenAdvance.clear();oldStart(id);requestAnimationFrame(()=>requestAnimationFrame(decorate))};
  const oldRender=renderBracket;renderBracket=function(){oldRender();requestAnimationFrame(()=>requestAnimationFrame(decorate))};
  const mo=new MutationObserver(()=>requestAnimationFrame(decorate));const host=document.getElementById('stage')||document.body;mo.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  window.TOURNAMENT_PREVIEW_VISUAL_21591={version:'21591a',refresh:decorate};ensureStyle();setTimeout(decorate,0);
})();
