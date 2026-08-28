(()=>{
  if(window.__AI_SHOGI_FIRE_BROWSER_PREWARM_21538)return;
  if(!/\bSilk\//i.test(String(navigator.userAgent||'')))return;
  window.__AI_SHOGI_FIRE_BROWSER_PREWARM_21538=true;

  const state=window.AI_SHOGI_FIRE_BROWSER_PREWARM={
    version:'21538a',silk:true,started:false,ready:false,error:'',startedAt:0,readyAt:0
  };
  let tries=0,timer=0;
  const stop=()=>{if(timer){clearInterval(timer);timer=0}};
  const attempt=()=>{
    if(state.started){stop();return;}
    tries++;
    if(!window.crossOriginIsolated){if(tries>=900)stop();return;}
    const api=window.AI_SHOGI_YANEURAOU_FUTURE;
    if(!api||typeof api.init!=='function'){if(tries>=900)stop();return;}
    state.started=true;
    state.startedAt=Date.now();
    stop();
    Promise.resolve()
      .then(()=>api.init())
      .then(()=>{state.ready=true;state.readyAt=Date.now()})
      .catch(e=>{state.error=String(e&&e.message||e);console.error('Fire browser YaneuraOu prewarm',e)});
  };

  timer=setInterval(attempt,100);
  attempt();
})();
