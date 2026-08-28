(()=>{
  if(window.__AI_SHOGI_BOARD_THEME_21537A)return;
  window.__AI_SHOGI_BOARD_THEME_21537A=true;

  const KEY='ai-shogi-board-theme';
  const THEMES={
    bright:{label:'明るい木目'},
    classic:{label:'従来'},
    contrast:{label:'くっきり'}
  };
  const ORDER=['bright','classic','contrast'];

  const css=`
    #boardThemeBtn{grid-column:1/-1;min-height:44px;font-size:12px;background:#f4ead2!important;color:#2c2013!important;border:1px solid #8d6d3f!important}
    @media(max-width:720px){#boardThemeBtn{min-height:52px;font-size:13px}}

    /* 明るい木目: 見やすさを優先したオリジナル盤面。ゲームUI/AIロジックは変更しない。 */
    html[data-board-theme="bright"] .board{
      background:linear-gradient(90deg,#efc676 0%,#f7d58d 47%,#eabd69 100%)!important;
      border:4px solid #6b4727!important;
      box-shadow:0 4px 14px #2d1b0d55!important;
    }
    html[data-board-theme="bright"] .sq{border-right:1.35px solid #56371f!important;border-bottom:1.35px solid #56371f!important}
    html[data-board-theme="bright"] .sq:nth-child(9n){border-right:0!important}
    html[data-board-theme="bright"] .sq:nth-last-child(-n+9){border-bottom:0!important}
    html[data-board-theme="bright"] .sq.sel{background:#ffd229cc!important;box-shadow:inset 0 0 0 3px #df8500!important}
    html[data-board-theme="bright"] .sq.last{background:#78b9e766!important;box-shadow:inset 0 0 0 2px #2879a9bb!important}
    html[data-board-theme="bright"] .sq.legal:after{width:22%!important;background:#188447cc!important;box-shadow:0 0 0 2px #fff8!important}
    html[data-board-theme="bright"] .sq.cap:after{width:72%!important;border:4px solid #d22922!important;background:transparent!important;border-radius:7px!important;box-shadow:0 0 0 1px #fff9!important}
    html[data-board-theme="bright"] .piece{
      width:86%!important;height:90%!important;
      background:linear-gradient(180deg,#ffe9b7 0%,#f2c87a 70%,#dda958 100%)!important;
      color:#17110b!important;text-shadow:0 .5px 0 #fff6!important;
      filter:drop-shadow(0 1px 1px #5b361f66)!important;
      font-size:clamp(17px,5.6vw,31px)!important;
    }
    html[data-board-theme="bright"] .piece.pro{color:#c31f17!important}
    html[data-board-theme="bright"] .hand{background:#f7eedc!important;border:1px solid #9d7b4b!important;color:#322419!important;box-shadow:0 1px 3px #68451f22 inset!important}
    html[data-board-theme="bright"] .hp{background:#f1cf8d!important;color:#1d160e!important;border:1px solid #76502b!important;box-shadow:0 1px 2px #0002!important}
    html[data-board-theme="bright"] .hp.sel{outline:3px solid #e79b18!important;outline-offset:-2px!important}

    /* くっきり: 升目・駒・選択位置を最大限見分けやすくする。 */
    html[data-board-theme="contrast"] .board{background:#e7b85d!important;border:5px solid #f4f4f4!important;box-shadow:0 0 0 2px #000,0 5px 18px #0008!important}
    html[data-board-theme="contrast"] .sq{border-right:2px solid #171717!important;border-bottom:2px solid #171717!important}
    html[data-board-theme="contrast"] .sq:nth-child(9n){border-right:0!important}
    html[data-board-theme="contrast"] .sq:nth-last-child(-n+9){border-bottom:0!important}
    html[data-board-theme="contrast"] .sq.sel{background:#fff000cc!important;box-shadow:inset 0 0 0 4px #ff7a00!important}
    html[data-board-theme="contrast"] .sq.last{background:#00a8ff77!important;box-shadow:inset 0 0 0 3px #005b9c!important}
    html[data-board-theme="contrast"] .sq.legal:after{width:25%!important;background:#087d31!important;box-shadow:0 0 0 3px #fff!important}
    html[data-board-theme="contrast"] .sq.cap:after{width:72%!important;border:5px solid #e00000!important;background:transparent!important}
    html[data-board-theme="contrast"] .piece{width:88%!important;height:91%!important;background:#ffe2a4!important;color:#000!important;font-size:clamp(18px,5.8vw,32px)!important;filter:drop-shadow(0 1px 1px #0009)!important}
    html[data-board-theme="contrast"] .piece.pro{color:#d00000!important}
    html[data-board-theme="contrast"] .hand{background:#202020!important;border-color:#ddd!important;color:#fff!important}
    html[data-board-theme="contrast"] .hp{background:#ffd98c!important;color:#000!important;border-color:#fff!important}
  `;

  function readTheme(){
    try{const v=localStorage.getItem(KEY);if(THEMES[v])return v}catch(e){}
    return 'bright';
  }
  function applyTheme(name,persist=true){
    if(!THEMES[name])name='bright';
    document.documentElement.dataset.boardTheme=name;
    if(persist){try{localStorage.setItem(KEY,name)}catch(e){}}
    const btn=document.getElementById('boardThemeBtn');
    if(btn){
      btn.textContent=`盤面：${THEMES[name].label}（タップで切替）`;
      btn.setAttribute('aria-label',`盤面テーマ ${THEMES[name].label}。タップで次へ`);
    }
    return name;
  }
  function nextTheme(){
    const now=document.documentElement.dataset.boardTheme||readTheme();
    const i=Math.max(0,ORDER.indexOf(now));
    applyTheme(ORDER[(i+1)%ORDER.length]);
  }
  function install(){
    if(!document.getElementById('boardThemeStyle')){
      const style=document.createElement('style');
      style.id='boardThemeStyle';style.textContent=css;document.head.appendChild(style);
    }
    applyTheme(readTheme(),false);
    const controls=document.querySelector('.controls');
    if(controls&&!document.getElementById('boardThemeBtn')){
      const btn=document.createElement('button');
      btn.id='boardThemeBtn';btn.className='btn';btn.type='button';
      btn.addEventListener('click',nextTheme);
      controls.appendChild(btn);
      applyTheme(document.documentElement.dataset.boardTheme||readTheme(),false);
    }
  }

  /* Fire/Silk browser first-move latency fix.
   * The shared YaneuraOu+Suisho5 engine can spend tens of seconds on its first WASM/NNUE/readyok
   * initialization. Start that exact same initialization as soon as the dynamically-installed
   * engine API exists, instead of charging it to the player's first AI move. Search budgets,
   * Threads/Hash, evaluation, MultiPV/cp-loss profiles and adaptive/full-search choices are not
   * changed here, so this is latency hiding only and does not weaken any character.
   */
  function installFireBrowserPrewarm(){
    if(window.__AI_SHOGI_FIRE_BROWSER_PREWARM_21538)return;
    if(!/\bSilk\//i.test(String(navigator.userAgent||'')))return;
    window.__AI_SHOGI_FIRE_BROWSER_PREWARM_21538=true;
    const state=window.AI_SHOGI_FIRE_BROWSER_PREWARM={version:'21538a',silk:true,started:false,ready:false,error:'',startedAt:0,readyAt:0};
    let tries=0,timer=0;
    const stop=()=>{if(timer){clearInterval(timer);timer=0}};
    const attempt=()=>{
      tries++;
      if(!window.crossOriginIsolated){if(tries>=900)stop();return;}
      const api=window.AI_SHOGI_YANEURAOU_FUTURE;
      if(!api||typeof api.init!=='function'){if(tries>=900)stop();return;}
      stop();state.started=true;state.startedAt=Date.now();
      Promise.resolve().then(()=>api.init()).then(()=>{state.ready=true;state.readyAt=Date.now()}).catch(e=>{state.error=String(e&&e.message||e);console.error('Fire browser YaneuraOu prewarm',e)});
    };
    attempt();timer=setInterval(attempt,100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  installFireBrowserPrewarm();
  new MutationObserver(()=>{if(!document.getElementById('boardThemeBtn'))install()}).observe(document.documentElement,{childList:true,subtree:true});
  window.AI_SHOGI_BOARD_THEME={version:'21537a',themes:[...ORDER],get:()=>document.documentElement.dataset.boardTheme||readTheme(),set:n=>applyTheme(n)};
})();
