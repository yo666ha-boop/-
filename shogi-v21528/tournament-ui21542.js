/* みつき将棋 大会UI補強 v2.15.42a
 * - 最終キャラ名と旧カード名のずれがあっても、26キャラ順で実画像を復元
 * - Fire/Silk/ローカルAPKでは大会表を画面内に自動フィット
 */
(function installTournamentUI21542(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_UI_21542A)return;
  window.__AI_SHOGI_TOURNAMENT_UI_21542A=true;

  const PLAYER_LABEL='あなた';
  const ua=String(navigator.userAgent||'');
  const host=String(location.hostname||'').toLowerCase();
  const IS_FIRE=/\bSilk\//i.test(ua)||/Kindle|KF[A-Z0-9]{2,}|Amazon/i.test(ua)||host==='127.0.0.1'||host==='localhost';
  const norm=s=>String(s||'').replace(/[\s　]+/g,'').trim();
  const chars=()=>{try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}};
  const cards=()=>[...document.querySelectorAll('#chars .ch')];
  const cardName=card=>(card?.querySelector?.('.chName')?.textContent||card?.querySelector?.('img')?.alt||'').trim();
  const imageSrc=card=>{
    const img=card?.querySelector?.('img');
    return img?.currentSrc||img?.src||'';
  };
  const srcCache=new Map();

  function sourceFor(name){
    if(!name||name===PLAYER_LABEL)return'';
    if(srcCache.has(name))return srcCache.get(name)||'';
    const allCards=cards(),allChars=chars();
    let card=allCards.find(c=>norm(cardName(c))===norm(name));
    if(!card){
      const idx=allChars.findIndex(c=>norm(c?.name)===norm(name));
      if(idx>=0)card=allCards[idx]||null;
    }
    const src=imageSrc(card);
    if(src)srcCache.set(name,src);
    return src||'';
  }

  function slotName(slot){
    const node=slot?.querySelector?.('.tourSlotName');
    if(!node)return'';
    return String(node.textContent||'').replace(/[👑🏆]/gu,'').trim();
  }

  function repairPortraits(root=document){
    let repaired=0,missing=[];
    root.querySelectorAll?.('.tourBracketSlot').forEach(slot=>{
      const name=slotName(slot);
      if(!name||name==='—'||name===PLAYER_LABEL)return;
      const avatar=slot.querySelector('.tourAvatar');
      if(!avatar)return;
      const existing=avatar.querySelector('img');
      if(existing&&(existing.currentSrc||existing.src)){avatar.classList.remove('tourAvatarFallback');return}
      const src=sourceFor(name);
      if(!src){missing.push(name);return}
      avatar.classList.remove('tourAvatarFallback');
      avatar.textContent='';
      const img=document.createElement('img');
      img.src=src;img.alt='';img.loading='eager';img.decoding='async';
      avatar.appendChild(img);repaired++;
    });
    return{repaired,missing:[...new Set(missing)]};
  }

  function ensureStyle(){
    if(document.getElementById('tournament21542UIStyle'))return;
    const style=document.createElement('style');
    style.id='tournament21542UIStyle';
    style.textContent=`
#tournament21540Panel.tourFireFit{position:fixed!important;inset:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));z-index:2147482000;margin:0!important;max-width:none!important;width:auto!important;height:auto!important;overflow:auto!important;padding:8px!important;box-shadow:0 8px 30px #000b;background:#06110e!important}
#tournament21540Panel.tourFireFit .tourHead{position:sticky;top:0;z-index:4;background:#06110ef2;padding:3px 0 6px;margin-bottom:3px}
#tournament21540Panel.tourFireFit.tourHasActive .tourLead{display:none}
#tournament21540Panel.tourFireFit.tourHasActive .tourGrid{display:none}
#tournament21540Panel.tourFireFit .tourActive{margin:2px 0;padding:6px;height:auto}
#tournament21540Panel.tourFireFit .tourActiveTitle{font-size:12px;margin-bottom:1px}
#tournament21540Panel.tourFireFit .tourCurrentMatch,#tournament21540Panel.tourFireFit .tourResult{font-size:10px;margin:2px 0}
#tournament21540Panel.tourFireFit .tourNews{padding:3px 6px;margin:3px 0;max-height:52px;overflow:hidden}
#tournament21540Panel.tourFireFit .tourNewsTitle{font-size:9px;margin-bottom:1px}
#tournament21540Panel.tourFireFit .tourNewsItem{font-size:8px;line-height:1.25}
#tournament21540Panel.tourFireFit .tourBracketWrap{margin:3px 0}
#tournament21540Panel.tourFireFit .tourBracketCaption{font-size:9px;margin-bottom:2px}
#tournament21540Panel.tourFireFit .tourBracketScroll{overflow-x:hidden!important;padding-bottom:0;box-sizing:border-box!important}
#tournament21540Panel.tourFireFit .tourBracket{min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;gap:3px;padding:4px}
#tournament21540Panel.tourFireFit .tourBracketRound{width:auto!important;flex:1 1 0!important;min-width:0!important;box-sizing:border-box!important}
#tournament21540Panel.tourFireFit .tourBracketRoundTitle{font-size:9px;margin-bottom:2px}
#tournament21540Panel.tourFireFit .tourBracketRoundBody{height:clamp(430px,calc(100vh - 205px),650px)!important;gap:1px}
#tournament21540Panel.tourFireFit .tourBracketSlot{min-height:0!important;padding:2px 3px!important;font-size:clamp(7px,.85vw,10px)!important;gap:3px!important;border-radius:6px}
#tournament21540Panel.tourFireFit .tourAvatar{width:clamp(18px,2.4vw,28px)!important;height:clamp(18px,2.4vw,28px)!important;flex-basis:clamp(18px,2.4vw,28px)!important}
#tournament21540Panel.tourFireFit .tourSlotMeta{gap:2px;margin-top:0}
#tournament21540Panel.tourFireFit .tourBracketRating,#tournament21540Panel.tourFireFit .tourMatchState{font-size:clamp(6px,.65vw,8px)!important;padding:0 2px!important}
#tournament21540Panel.tourFireFit .tourActions{margin-top:3px}
#tournament21540Panel.tourFireFit .tourActions .btn{padding:5px 7px;font-size:10px}
@media(max-width:720px){#tournament21540Panel .tourCup .btn,#tournament21540Panel .tourActions .btn{min-height:44px}}
@media (orientation:landscape) and (max-height:700px){#tournament21540Panel.tourFireFit .tourBracketRoundBody{height:calc(100vh - 180px)!important}#tournament21540Panel.tourFireFit .tourNews{display:none}}
`;
    document.head.appendChild(style);
  }

  function syncFit(){
    ensureStyle();
    const panel=document.getElementById('tournament21540Panel');
    if(!panel)return;
    panel.classList.toggle('tourFireFit',IS_FIRE);
    panel.classList.toggle('tourHasActive',!!panel.querySelector('.tourActive'));
    if(IS_FIRE&&panel.classList.contains('on')&&panel.querySelector('.tourBracket')){
      const scroll=panel.querySelector('.tourBracketScroll');
      if(scroll)scroll.scrollLeft=0;
    }
  }

  function refresh(){repairPortraits();syncFit()}
  let raf=0;
  function requestRefresh(){
    refresh();
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;refresh()});
  }

  const observer=new MutationObserver(requestRefresh);
  function startObserver(){
    const panel=document.getElementById('tournament21540Panel');
    if(!panel)return false;
    observer.disconnect();observer.observe(panel,{childList:true,subtree:true});
    refresh();return true;
  }
  let tries=0;
  const boot=setInterval(()=>{if(startObserver()||++tries>100)clearInterval(boot)},100);
  window.addEventListener('resize',requestRefresh,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(requestRefresh,120),{passive:true});
  window.addEventListener('ai-shogi-local-save',()=>setTimeout(requestRefresh,0));

  window.AI_SHOGI_TOURNAMENT_UI={
    version:'21542a',
    repair:()=>{const r=repairPortraits();syncFit();return r},
    audit:()=>{
      const roster=chars().map(c=>c.name),missingRoster=roster.filter(n=>!sourceFor(n));
      const panel=document.getElementById('tournament21540Panel');
      const scroll=panel?.querySelector('.tourBracketScroll'),bracket=panel?.querySelector('.tourBracket');
      const fallback=[...document.querySelectorAll('.tourBracketSlot .tourAvatarFallback')].filter(x=>{const name=slotName(x.closest('.tourBracketSlot'));return name&&name!=='—'&&name!==PLAYER_LABEL}).length;
      return{ok:true,fire:IS_FIRE,roster:roster.length,rosterPortraits:roster.length-missingRoster.length,missingRoster,fallback,fit:!!panel?.classList.contains('tourFireFit'),activeFit:!!panel?.classList.contains('tourHasActive'),scrollWidth:scroll?.scrollWidth||0,clientWidth:scroll?.clientWidth||0,bracketWidth:bracket?.getBoundingClientRect?.().width||0,viewportWidth:innerWidth};
    }
  };
})();

/* v2.15.43a: bracket result labels + connector lines. */
(function loadTournamentBracketUI21543(){
  if(window.__AI_SHOGI_TOURNAMENT_BRACKET_LOADER_21543A)return;
  window.__AI_SHOGI_TOURNAMENT_BRACKET_LOADER_21543A=true;
  try{
    const scriptURL=document.currentScript?.src||location.href;
    const s=document.createElement('script');
    s.src=new URL('./tournament-ui21543.js?v=21543a',scriptURL).href;
    s.async=false;
    document.head.appendChild(s);
  }catch(e){console.error('tournament21543 bracket loader failed',e)}
})();

/* v2.15.48a: page reload restore compatibility.
 * Only the tournament state that already existed when this script loaded is
 * eligible for restoration. A tournament started later by the user is never
 * mistaken for a reload. boss_active restores the saved cup boss as the real
 * AI opponent once; other saved states reopen the tournament panel stably.
 */
(function installTournamentReloadRestore21548(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_RELOAD_RESTORE_21548A)return;
  window.__AI_SHOGI_TOURNAMENT_RELOAD_RESTORE_21548A=true;
  const KEY='aiShogiTournament21540';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const initialStore=read();
  const initialActive=initialStore?.active?JSON.parse(JSON.stringify(initialStore.active)):null;
  const initialBossStatus=initialActive?.bossChallenge?.status||null;
  const initialBoss=initialActive?.bossChallenge?.boss||null;
  let done=!initialActive,tries=0;
  const currentOpponent=()=>String(document.getElementById('oppName')?.textContent||'').trim();
  const panelOpen=()=>!!document.getElementById('tournament21540Panel')?.classList.contains('on');
  function publish(){
    window.AI_SHOGI_TOURNAMENT_RELOAD_RESTORE={version:'21548a',audit:()=>({done,hadInitialActive:!!initialActive,initialBossStatus,active:!!read()?.active,bossStatus:read()?.active?.bossChallenge?.status||null,opponent:currentOpponent(),panelOpen:panelOpen()})};
  }
  publish();
  if(!initialActive){document.documentElement.dataset.tournamentRestore21548='idle';return}

  function restoreOnce(){
    if(done)return true;
    const panel=document.getElementById('tournament21540Panel'),api=window.AIShogiIOS,current=read()?.active;
    if(!panel||!api?.characters||!api?.select||!current)return false;
    if(initialBossStatus==='active'){
      const boss=String(initialBoss||current?.bossChallenge?.boss||'');
      if(!boss)return false;
      if(!currentOpponent().startsWith(boss)){
        const idx=api.characters().findIndex(c=>c?.name===boss);
        if(idx<0)return false;
        try{api.select(idx)}catch(e){console.error('tournament reload boss opponent restore failed',e);return false}
      }
      panel.classList.remove('on');
      const st=document.getElementById('status');if(st)st.textContent='復元した杯ボス戦：'+boss+' に挑戦中';
    }else{
      const reopen=()=>{
        const p=document.getElementById('tournament21540Panel');if(!p)return;
        p.classList.add('on');
        try{window.AI_SHOGI_TOURNAMENT?.render?.()}catch(e){}
        p.classList.add('on');
      };
      reopen();setTimeout(reopen,120);setTimeout(reopen,350);setTimeout(reopen,700);
    }
    done=true;document.documentElement.dataset.tournamentRestore21548='1';publish();return true;
  }
  const timer=setInterval(()=>{if(restoreOnce()||++tries>120)clearInterval(timer)},100);
  setTimeout(restoreOnce,0);
})();

/* v2.15.48c: keep a pre-existing tournament visually restored through late startup.
 * A saved tournament can be reopened before the base UI finishes its default
 * opponent initialization; that later initialization may close overlays again.
 * For a finite startup window only, keep the saved non-boss-active tournament
 * panel + image dialogue rendered. Any trusted user pointer/key interaction
 * stops this stabilizer immediately, so manual close/navigation always wins.
 * New tournaments started after page load are never eligible.
 */
(function installTournamentReloadVisual21548c(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_RELOAD_VISUAL_21548C)return;
  window.__AI_SHOGI_TOURNAMENT_RELOAD_VISUAL_21548C=true;
  const KEY='aiShogiTournament21540';
  const HOLD_MS=8000;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const initialRaw=read()?.active;
  const initial=initialRaw?JSON.parse(JSON.stringify(initialRaw)):null;
  const initialStatus=initial?.bossChallenge?.status||null;
  const fingerprint=a=>a?[a.cupId,a.round,a.status,a.pending||'',a?.bossChallenge?.status||''].join('|'):'';
  const initialFingerprint=fingerprint(initial);
  let done=!initial||initialStatus==='active',cancelled=false,readyAt=0,attempts=0,timer=0;
  const panelOpen=()=>!!document.getElementById('tournament21540Panel')?.classList.contains('on');
  const publish=()=>{
    window.AI_SHOGI_TOURNAMENT_RELOAD_VISUAL={
      version:'21548c',
      audit:()=>({done,cancelled,hadInitialActive:!!initial,initialStatus,panelOpen:panelOpen(),dialogueReady:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d',attempts,elapsedMs:readyAt?Date.now()-readyAt:0})
    };
  };
  const stop=cancel=>{
    if(done)return;
    done=true;cancelled=!!cancel;
    if(timer)clearInterval(timer);
    document.removeEventListener('pointerdown',onUser,true);
    document.removeEventListener('keydown',onUser,true);
    document.removeEventListener('touchstart',onUser,true);
    document.documentElement.dataset.tournamentRestoreVisual21548=cancelled?'cancelled':'1';
    publish();
  };
  const onUser=e=>{if(e?.isTrusted)stop(true)};
  publish();
  if(done){document.documentElement.dataset.tournamentRestoreVisual21548=initialStatus==='active'?'boss-active':'idle';return}
  document.addEventListener('pointerdown',onUser,true);
  document.addEventListener('keydown',onUser,true);
  document.addEventListener('touchstart',onUser,true);

  function maintain(){
    if(done)return true;
    const current=read()?.active,panel=document.getElementById('tournament21540Panel'),t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE;
    if(!current){stop(false);return true}
    if(fingerprint(current)!==initialFingerprint){stop(false);return true}
    if(!panel||!t?.render||d?.version!=='21547d'||typeof d.render!=='function')return false;
    if(!readyAt)readyAt=Date.now();
    attempts++;
    panel.classList.add('on');
    try{t.render()}catch(e){}
    panel.classList.add('on');
    try{d.render()}catch(e){}
    try{window.AI_SHOGI_TOURNAMENT_UI?.repair?.()}catch(e){}
    panel.classList.add('on');
    const box=document.getElementById('tourDialogue21547'),img=box?.querySelector('.tourDialoguePortrait img'),rect=box?.getBoundingClientRect?.();
    const visible=!!box&&!!img&&!!img.src&&!!rect&&rect.width>0&&rect.height>0;
    document.documentElement.dataset.tournamentRestoreVisual21548=visible?'holding':'warming';
    publish();
    if(Date.now()-readyAt>=HOLD_MS){
      panel.classList.add('on');
      try{d.render()}catch(e){}
      panel.classList.add('on');
      stop(false);
      return true;
    }
    return false;
  }
  timer=setInterval(maintain,160);
  setTimeout(maintain,0);
})();
