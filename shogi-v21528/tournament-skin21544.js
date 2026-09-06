/* みつき将棋 大会モード・本体見た目 21544c
 * preview 21544b の深緑＋金デザインを本体大会UIへ移植する。
 * 大会ロジック・参加者選定・AI勝敗・棋力設定・ブラケット幾何には触れない。
 */
(function installTournamentSkin21544(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_SKIN_21544C)return;
  window.__AI_SHOGI_TOURNAMENT_SKIN_21544C=true;

  const STYLE_ID='tournament21544SkinStyle';
  let observer=null,raf=0;

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
#tournament21540Panel.tourSkin21544{
  --tour-gold:#e9c86a;--tour-gold-bright:#fff0a7;--tour-blue:#69b5ff;--tour-green:#6fb46a;
  position:relative;isolation:isolate;overflow:hidden;border-color:#a27e35!important;color:#f2e5ba!important;
  background:
    radial-gradient(circle at 50% -12%,rgba(234,198,100,.14),transparent 30%),
    radial-gradient(circle at 8% 28%,rgba(47,118,86,.13),transparent 25%),
    linear-gradient(180deg,#0b1a15 0%,#06120f 52%,#030b08 100%)!important;
  box-shadow:0 14px 38px #0008,inset 0 1px 0 #fff1!important
}
#tournament21540Panel.tourSkin21544:before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.15;
  background-image:
    radial-gradient(circle at 0 50%,transparent 20px,rgba(255,241,177,.055) 21px 22px,transparent 23px),
    radial-gradient(circle at 100% 50%,transparent 20px,rgba(255,241,177,.055) 21px 22px,transparent 23px);
  background-size:44px 30px;background-position:0 0,22px 15px
}
#tournament21540Panel.tourSkin21544 .tourHead{
  position:relative;overflow:hidden;margin:-2px -2px 8px;padding:9px 10px;border:1px solid #8f7035;border-radius:12px;
  background:linear-gradient(135deg,#14271f 0%,#091510 53%,#1b170b 100%);
  box-shadow:0 8px 22px #0006,inset 0 1px 0 #fff2
}
#tournament21540Panel.tourSkin21544 .tourHead:before{content:"🏆";position:absolute;right:52px;top:50%;transform:translateY(-50%);font-size:34px;opacity:.12;pointer-events:none}
#tournament21540Panel.tourSkin21544 .tourHead:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,transparent,#e8c66a 20%,#fff4b8 50%,#e8c66a 80%,transparent);box-shadow:0 0 9px #e8c66a55}
#tournament21540Panel.tourSkin21544 .tourHead strong{font-size:15px;letter-spacing:.045em;color:#ffe8a4;text-shadow:0 2px 8px #000}
#tournament21540Panel.tourSkin21544 .tourHead .miniBtn{border-color:#8b7339;background:linear-gradient(180deg,#2d392f,#17221c);color:#ffe7a2;box-shadow:inset 0 1px 0 #fff2}
#tournament21540Panel.tourSkin21544 .tourLead{color:#d1c8ab}
#tournament21540Panel.tourSkin21544 .tourRecommended{color:#ffe39a;text-shadow:0 0 10px #d0a33133}

#tournament21540Panel.tourSkin21544 .tourGrid{gap:8px}
#tournament21540Panel.tourSkin21544 .tourCup{
  --cup-accent:#7f7047;position:relative;overflow:hidden;border-color:#504a37!important;border-radius:12px!important;
  background:radial-gradient(circle at 100% 0,rgba(127,112,71,.12),transparent 42%),linear-gradient(145deg,#10201a 0%,#091411 64%,#11120c 100%)!important;
  box-shadow:0 6px 18px #0005,inset 0 1px 0 #fff1;transition:transform .14s ease,filter .14s ease,box-shadow .14s ease
}
#tournament21540Panel.tourSkin21544 .tourCup.tourTier0,#tournament21540Panel.tourSkin21544 .tourCup.tourTier1{--cup-accent:#6f9f73;border-color:#57775a!important}
#tournament21540Panel.tourSkin21544 .tourCup.tourTier2,#tournament21540Panel.tourSkin21544 .tourCup.tourTier3{--cup-accent:#6396a9;border-color:#4f7280!important}
#tournament21540Panel.tourSkin21544 .tourCup.tourTier4,#tournament21540Panel.tourSkin21544 .tourCup.tourTier5{--cup-accent:#ad8d4c;border-color:#75643e!important}
#tournament21540Panel.tourSkin21544 .tourCup.tourTier6,#tournament21540Panel.tourSkin21544 .tourCup.tourTier7{--cup-accent:#d6b458;border-color:#92783d!important}
#tournament21540Panel.tourSkin21544 .tourCup:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,var(--cup-accent),#fff2,var(--cup-accent),transparent);opacity:.86}
#tournament21540Panel.tourSkin21544 .tourCup:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 9px 22px #0007,inset 0 1px 0 #fff2}
#tournament21540Panel.tourSkin21544 .tourCup.recommended{border-color:#e4ba48!important;background:radial-gradient(circle at 95% 0,#d5a52f26,transparent 43%),linear-gradient(145deg,#19281e 0%,#121b12 58%,#2b220b 100%)!important;box-shadow:0 0 0 1px #e0b84d55,0 9px 25px #0007,0 0 22px #d8aa3130!important}
#tournament21540Panel.tourSkin21544 .tourCup.recommended:after{content:"おすすめ";position:absolute;top:7px;right:-24px;transform:rotate(35deg);width:92px;text-align:center;padding:2px 0;background:linear-gradient(90deg,#bf8d25,#f4d56d,#bf8d25);color:#171108;font-size:8px;font-weight:1000;box-shadow:0 2px 8px #0006;text-shadow:0 1px #fff5}
#tournament21540Panel.tourSkin21544 .tourCupName{color:#f8e7af;text-shadow:0 1px 4px #000}
#tournament21540Panel.tourSkin21544 .tourCupMeta{color:#c4bca3}
#tournament21540Panel.tourSkin21544 .tourCup .btn,#tournament21540Panel.tourSkin21544 .tourActions .btn{border-color:#806a37!important;background:linear-gradient(180deg,#304237,#16231d)!important;color:#ffecb3!important;box-shadow:inset 0 1px 0 #fff2,0 3px 8px #0006}

#tournament21540Panel.tourSkin21544 .tourActive{position:relative;border-color:#98752f!important;border-radius:13px!important;background:linear-gradient(180deg,rgba(14,31,25,.985),rgba(5,14,11,.985))!important;box-shadow:0 12px 34px #0008,inset 0 1px 0 #fff1!important}
#tournament21540Panel.tourSkin21544 .tourActive:before{content:"";position:absolute;left:12px;right:12px;top:-1px;height:2px;background:linear-gradient(90deg,transparent,#e6c15c,#fff4b7,#e6c15c,transparent);box-shadow:0 0 8px #e0b43d55}
#tournament21540Panel.tourSkin21544 .tourActiveTitle{color:#ffe6a0;letter-spacing:.03em;text-shadow:0 2px 8px #000}
#tournament21540Panel.tourSkin21544 .tourCurrentMatch{padding:5px 8px;border:1px solid #5f5535;border-radius:8px;background:linear-gradient(180deg,#181b12,#0d130f);color:#f5e3aa}
#tournament21540Panel.tourSkin21544 .tourNews{border-color:#3d604f!important;background:linear-gradient(90deg,#07140f,#102119,#07140f)!important;box-shadow:inset 0 1px 0 #fff1}
#tournament21540Panel.tourSkin21544 .tourNewsTitle{color:#f3d77f;letter-spacing:.04em}
#tournament21540Panel.tourSkin21544 .tourNewsTitle:before{content:"📣 ";filter:saturate(.8)}
#tournament21540Panel.tourSkin21544 .tourNewsItem{color:#d0cab5}

#tournament21540Panel.tourSkin21544 .tourBracket{border-color:#776334!important;border-radius:13px!important;background:linear-gradient(90deg,rgba(77,120,99,.065) 0 20%,rgba(110,91,46,.075) 20% 40%,rgba(77,120,99,.052) 40% 60%,rgba(110,91,46,.08) 60% 80%,rgba(161,117,40,.105) 80% 100%),linear-gradient(180deg,#07130f,#030a08)!important;box-shadow:inset 0 0 0 1px #fff1,inset 0 14px 32px #0006,0 6px 20px #0004}
#tournament21540Panel.tourSkin21544 .tourBracketRound{border-radius:8px}
#tournament21540Panel.tourSkin21544 .tourBracketRound.tourRoundLive{background:linear-gradient(180deg,rgba(218,174,67,.055),transparent 54%);box-shadow:inset 0 0 0 1px #d1a74313}
#tournament21540Panel.tourSkin21544 .tourBracketRoundTitle{margin:2px 2px 6px!important;padding:4px!important;border:1px solid #5d5030;border-radius:999px;background:linear-gradient(180deg,#1b1e13,#0d130f)!important;color:#efd887!important;font-weight:1000;letter-spacing:.045em;box-shadow:inset 0 1px 0 #fff1,0 2px 6px #0004;text-shadow:0 1px 3px #000}
#tournament21540Panel.tourSkin21544 .tourBracketRound.tourRoundLive .tourBracketRoundTitle{border-color:#d5a947!important;color:#fff0ac!important;background:linear-gradient(180deg,#30270f,#15150c)!important;box-shadow:0 0 15px #d5a9472c,inset 0 1px 0 #fff2}
#tournament21540Panel.tourSkin21544 .tourBracketRound.tourRoundLive .tourBracketRoundTitle:before{content:"● ";color:#ffd76d;font-size:8px;filter:drop-shadow(0 0 4px #ffc94f)}
#tournament21540Panel.tourSkin21544 .tourBracketSlot{border-color:#4c4636!important;border-radius:8px!important;background:linear-gradient(180deg,rgba(17,32,26,.99),rgba(8,19,15,.99))!important;box-shadow:0 2px 8px #0006,inset 0 1px 0 #fff1}
#tournament21540Panel.tourSkin21544 .tourAvatar{border-color:#967b43!important;box-shadow:0 0 0 1px #0008,0 2px 7px #0008;background:#111d18!important}
#tournament21540Panel.tourSkin21544 .tourAvatar img{filter:saturate(1.05) contrast(1.025)}
#tournament21540Panel.tourSkin21544 .tourSlotName{color:#f0e9d3;text-shadow:0 1px 2px #000;font-weight:900!important}
#tournament21540Panel.tourSkin21544 .tourBracketRating{color:#aaa38f;opacity:1}
#tournament21540Panel.tourSkin21544 .tourMatchState{border-color:#5b5647!important;background:#0c120f;color:#bdb393!important;font-weight:900;box-shadow:inset 0 1px 0 #fff1}
#tournament21540Panel.tourSkin21544 .tourMatchState.running{border-color:#d38b35!important;color:#ffd090!important;background:#2b1b0c!important;box-shadow:0 0 8px #d38b3533,inset 0 1px 0 #fff1}
#tournament21540Panel.tourSkin21544 .tourMatchState.win{border-color:#67aa60!important;color:#c2f3b9!important;background:#112611!important}
#tournament21540Panel.tourSkin21544 .tourMatchState.loss{border-color:#79514b!important;color:#c9958d!important;background:#201211!important;opacity:.76}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.player{border-color:#72beff!important;background:linear-gradient(180deg,#163149,#0b1d2c)!important;box-shadow:0 0 0 1px #68b7ff66,0 0 17px #3d9fff2c,inset 0 1px 0 #fff2!important}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.player:before{content:"PLAYER";position:absolute;right:3px;top:-7px;padding:0 4px;border-radius:999px;border:1px solid #68b7ff88;background:#10283b;color:#bde5ff;font-size:6px;line-height:11px;font-weight:1000;letter-spacing:.06em;box-shadow:0 1px 4px #0008;z-index:3}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.boss{border-color:#e4b94b!important;background:linear-gradient(180deg,#34280f,#18160b)!important;box-shadow:0 0 0 1px #dbae3d55,0 0 18px #c894252b,inset 0 1px 0 #fff2!important}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.boss:before{content:"BOSS";position:absolute;right:3px;top:-7px;padding:0 4px;border-radius:999px;border:1px solid #e2b84b88;background:#2b210d;color:#ffe49a;font-size:6px;line-height:11px;font-weight:1000;letter-spacing:.06em;box-shadow:0 1px 4px #0008;z-index:3}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.champion{border-color:#ffe06b!important;background:linear-gradient(180deg,#4a3810,#201a0b)!important;box-shadow:0 0 0 1px #ffe06b66,0 0 24px #ffd34e44,inset 0 1px 0 #fff2!important}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.champion:after{content:"🏆";position:absolute;left:3px;top:-9px;font-size:11px;filter:drop-shadow(0 1px 3px #000)}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.tourEliminated{opacity:.43!important;filter:saturate(.45) brightness(.8)!important}
#tournament21540Panel.tourSkin21544 .tourBracketSlot.tourAdvanced{box-shadow:0 0 0 1px #6aa75e66 inset,0 2px 8px #0006}
#tournament21540Panel.tourSkin21544 .tourBracketLines path{stroke:#81724a!important;stroke-width:1.1!important;opacity:.44!important}
#tournament21540Panel.tourSkin21544 .tourBracketLines path.advanced{stroke:#e6c15d!important;stroke-width:1.9!important;opacity:.95!important;filter:drop-shadow(0 0 2px #d7a83d55)}
#tournament21540Panel.tourSkin21544 .tourBracketLines path.playerPath{stroke:#68b7ff!important;stroke-width:2.35!important;opacity:1!important;filter:drop-shadow(0 0 3px #4aa8ff77)}
#tournament21540Panel.tourSkin21544 .tourBracketLines path.eliminated{stroke:#605d53!important;opacity:.2!important}

@keyframes tour21544Pulse{0%,100%{box-shadow:0 0 0 0 rgba(216,164,57,0)}50%{box-shadow:0 0 0 2px rgba(216,164,57,.15),0 0 13px rgba(216,164,57,.15)}}
#tournament21540Panel.tourSkin21544 .tourMatchState.running{animation:tour21544Pulse 2.2s ease-in-out infinite}
@media(prefers-reduced-motion:reduce){#tournament21540Panel.tourSkin21544 .tourMatchState.running{animation:none}#tournament21540Panel.tourSkin21544 .tourCup{transition:none}}
@media(max-width:520px){#tournament21540Panel.tourSkin21544 .tourBracketSlot.player:before,#tournament21540Panel.tourSkin21544 .tourBracketSlot.boss:before{display:none}#tournament21540Panel.tourSkin21544 .tourCup{padding:8px!important}}
#tournament21540Panel.tourFireFit.tourSkin21544{overflow:auto!important;background:radial-gradient(circle at 50% -15%,rgba(234,198,100,.11),transparent 30%),linear-gradient(180deg,#091713,#030a08)!important}
#tournament21540Panel.tourFireFit.tourSkin21544 .tourHead{margin:0 0 4px;padding:5px 8px}
#tournament21540Panel.tourFireFit.tourSkin21544 .tourActive{margin:2px 0;padding:5px!important;box-shadow:inset 0 1px 0 #fff1!important}
#tournament21540Panel.tourFireFit.tourSkin21544 .tourBracket{padding:4px!important;gap:3px!important}
#tournament21540Panel.tourFireFit.tourSkin21544 .tourBracketRoundTitle{margin:1px 1px 3px!important;padding:2px!important}
#tournament21540Panel.tourFireFit.tourSkin21544 .tourBracketSlot.player:before,#tournament21540Panel.tourFireFit.tourSkin21544 .tourBracketSlot.boss:before{display:none}
`;
    document.head.appendChild(s);
  }

  function decorate(){
    ensureStyle();
    const panel=document.getElementById('tournament21540Panel');
    if(!panel)return false;
    panel.classList.add('tourSkin21544');
    [...panel.querySelectorAll('.tourCup')].forEach((cup,i)=>{
      for(let n=0;n<8;n++)cup.classList.toggle('tourTier'+n,n===i);
    });
    [...panel.querySelectorAll('.tourBracketRound')].forEach(round=>{
      round.classList.toggle('tourRoundLive',!!round.querySelector('.tourMatchState.running'));
    });
    return true;
  }

  function refresh(){
    decorate();
    try{window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh?.()}catch(e){}
  }
  function requestRefresh(){
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;decorate()});
  }
  function observe(){
    const panel=document.getElementById('tournament21540Panel');
    if(!panel)return false;
    if(!observer)observer=new MutationObserver(requestRefresh);
    observer.disconnect();
    observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    refresh();
    return true;
  }

  let tries=0;
  const boot=setInterval(()=>{if(observe()||++tries>120)clearInterval(boot)},100);
  window.addEventListener('resize',requestRefresh,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(refresh,120),{passive:true});

  window.AI_SHOGI_TOURNAMENT_SKIN={
    version:'21544c',
    refresh,
    audit:()=>{
      const panel=document.getElementById('tournament21540Panel');
      const cups=[...document.querySelectorAll('#tournament21540Panel .tourCup')];
      const liveRounds=[...document.querySelectorAll('#tournament21540Panel .tourBracketRound.tourRoundLive')].length;
      const style=!!document.getElementById(STYLE_ID);
      const scroll=panel?.querySelector('.tourBracketScroll');
      const ui=window.AI_SHOGI_TOURNAMENT_UI?.audit?.()||null;
      const bracket=window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.audit?.()||null;
      return{ok:!!panel&&style&&panel.classList.contains('tourSkin21544'),version:'21544c',style,cups:cups.length,recommended:cups.filter(x=>x.classList.contains('recommended')).length,liveRounds,fire:!!ui?.fire,fireOverflow:ui?.fire?Math.max(0,(Number(ui.scrollWidth)||0)-(Number(ui.clientWidth)||0)):null,alignmentError:bracket?.maxAlignmentError??null,connectors:bracket?.connectors??null};
    }
  };
})();
