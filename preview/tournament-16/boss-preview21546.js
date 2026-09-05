/* みつき将棋 外部確認ページ・優勝後ボス戦 21546a */
(function installPreviewBoss21546(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_BOSS_21546A)return;
  window.__TOURNAMENT_PREVIEW_BOSS_21546A=true;
  const winBtn=document.getElementById('winBtn'),lossBtn=document.getElementById('lossBtn'),next=document.getElementById('nextBtn');
  const actions=document.querySelector('.actions'),oldWin=winBtn?.onclick,oldLoss=lossBtn?.onclick,oldStart=start,oldRender=renderBracket,oldAudit=window.TOURNAMENT_PREVIEW_AUDIT;

  function ensureBossBox(){
    let box=document.getElementById('bossPreview21546');if(box)return box;
    box=document.createElement('div');box.id='bossPreview21546';box.style.cssText='display:none;border:1px solid #c99c32;border-radius:9px;padding:7px;margin:5px 0;background:#17160d;color:#f2e3ad;font-size:11px';
    document.querySelector('.news')?.insertAdjacentElement('beforebegin',box);return box;
  }
  function bossImg(){const cup=active?.cup;if(!cup)return'';const src=IMG[cup.boss];return src?`<span class="avatar" style="display:inline-block;vertical-align:middle;margin-right:6px"><img src="${src}" alt=""></span>`:''}
  function button(){let b=document.getElementById('bossChallengeBtn21546');if(b)return b;b=document.createElement('button');b.id='bossChallengeBtn21546';b.className='btn primary';b.onclick=()=>{if(active?.status!=='boss_pending'&&active?.status!=='boss_draw')return;active.status='boss_active';active.bossChallenge.status='active';statusEl.textContent=`完全制覇戦：${active.cup.boss} R${active.cup.bossRating}`;news.textContent=`トーナメント優勝者として杯ボス ${active.cup.boss} に挑戦します。`;decorate()};actions?.prepend(b);return b}
  function decorate(){
    document.querySelectorAll('.cup small').forEach(el=>{if(el.textContent.includes('決勝ボス'))el.textContent=el.textContent.replace('決勝ボス','優勝後ボス')});
    const box=ensureBossBox(),b=button();
    if(!active){box.style.display='none';b.hidden=true;if(winBtn){winBtn.hidden=false;winBtn.textContent='この対局に勝った'}if(lossBtn){lossBtn.hidden=false;lossBtn.textContent='負けた'}return}
    const phase=active.bossChallenge?.status||'locked';
    const inBoss=['pending','active','draw','lost','won'].includes(phase);box.style.display=inBoss?'block':'none';
    if(!inBoss){b.hidden=true;if(winBtn){winBtn.hidden=false;winBtn.textContent='この対局に勝った'}if(lossBtn){lossBtn.hidden=false;lossBtn.textContent='負けた'}return}
    box.innerHTML=bossImg()+`<b>👑 ${active.cup.boss} R${active.cup.bossRating}</b><br>杯ボスは16人トーナメントには参加せず、優勝したあとにだけ挑戦できます。`;
    if(phase==='pending'||phase==='draw'){
      b.hidden=false;b.textContent=phase==='draw'?`👑 ${active.cup.boss} と指し直す`:`👑 ${active.cup.boss} に挑戦`;
      winBtn.hidden=true;lossBtn.hidden=true;next.hidden=true;
    }else if(phase==='active'){
      b.hidden=true;winBtn.hidden=false;lossBtn.hidden=false;next.hidden=true;winBtn.textContent='ボスに勝った';lossBtn.textContent='ボスに負けた';
    }else{
      b.hidden=true;winBtn.hidden=true;lossBtn.hidden=true;next.hidden=true;
    }
  }
  function promote(){
    if(active?.status!=='champion'||active?.bossChallenge?.status!=='locked')return false;
    active.status='boss_pending';active.bossChallenge.status='pending';statusEl.textContent='🏆 16人トーナメント優勝！ 杯ボスへの挑戦権を獲得';news.textContent=`次は杯ボス ${active.cup.boss} R${active.cup.bossRating} への挑戦です。`;decorate();return true;
  }

  start=function(id){oldStart(id);if(active){active.bossChallenge={boss:active.cup.boss,bossRating:active.cup.bossRating,status:'locked'};if(active.rounds?.[0]?.includes(active.cup.boss))throw Error('cup boss must not be in 16-player bracket')}decorate()};
  renderBracket=function(){oldRender();setTimeout(()=>{promote();decorate()},0)};
  if(winBtn)winBtn.onclick=()=>{
    if(active?.bossChallenge?.status==='active'){
      active.bossChallenge.status='won';active.status='cup_clear';oldRender();statusEl.textContent=`🏆 ${active.cup.name} 完全制覇！`;news.textContent=`16人トーナメント優勝後、杯ボス ${active.cup.boss} も撃破しました。`;decorate();return;
    }
    oldWin?.();promote();decorate();
  };
  if(lossBtn)lossBtn.onclick=()=>{
    if(active?.bossChallenge?.status==='active'){
      active.bossChallenge.status='lost';active.status='boss_lost';oldRender();statusEl.textContent='トーナメント優勝・ボス戦敗北';news.textContent=`トーナメントは優勝。杯ボス ${active.cup.boss} には敗れ、完全制覇ならず。`;decorate();return;
    }
    oldLoss?.();decorate();
  };

  window.TOURNAMENT_PREVIEW_AUDIT=()=>{
    const base=oldAudit();const cup=active?.cup,boss=cup?.boss||null,r0=active?.rounds?.[0]||[];
    return{...base,format:'16-player-then-boss',bossSeparate:true,boss,bossInBracket:!!(boss&&r0.includes(boss)),bossStatus:active?.bossChallenge?.status||null,tournamentChampion:!!(active?.rounds?.[4]?.[0]===PLAYER),cupClear:active?.status==='cup_clear'};
  };
  ensureBossBox();button();decorate();setTimeout(decorate,0);setTimeout(decorate,500);
})();