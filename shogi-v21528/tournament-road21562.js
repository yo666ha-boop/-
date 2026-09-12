/* Tournament road-to-cup tracker v2.15.62
 * Display-only: 1R -> QF -> SF -> F -> EX. Does not mutate tournament/AI/rating state.
 */
(function(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_ROAD_21562)return;
  window.__AI_SHOGI_TOURNAMENT_ROAD_21562=true;
  function state(){
    try{return window.AI_SHOGI_TOURNAMENT?.state?.()?.active||null}catch(e){return null}
  }
  function phase(a){
    const b=a?.bossChallenge?.status||'locked';
    if(b==='won')return{done:5,current:-1,failed:false};
    if(b==='lost')return{done:4,current:4,failed:true};
    if(['pending','active','draw'].includes(b)||a?.status==='champion')return{done:4,current:4,failed:false};
    const r=Math.max(0,Math.min(3,Number(a?.round)||0));
    return{done:r,current:r,failed:a?.status==='lost'};
  }
  function style(){
    if(document.getElementById('tournamentRoad21562Style'))return;
    const s=document.createElement('style');s.id='tournamentRoad21562Style';s.textContent=
      '#tournament21540Panel .tourRoad21562{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:3px;padding-top:7px;border-top:1px solid rgba(255,224,135,.12);min-width:0}'+
      '#tournament21540Panel .tourRoadStage21562{position:relative;min-width:0;text-align:center;padding-top:10px;color:#756f5c;font-size:7px;font-weight:900;white-space:nowrap}'+
      '#tournament21540Panel .tourRoadStage21562:before{content:"";position:absolute;left:50%;top:0;width:7px;height:7px;margin-left:-4px;border-radius:50%;border:1px solid #67614f;background:#19201b;z-index:2}'+
      '#tournament21540Panel .tourRoadStage21562:not(:first-child):after{content:"";position:absolute;right:50%;top:3px;width:calc(100% + 4px);height:1px;background:#4a473b;z-index:1}'+
      '#tournament21540Panel .tourRoadStage21562.done{color:#e6cf87}#tournament21540Panel .tourRoadStage21562.done:before{border-color:#d9aa3e;background:#d9aa3e}#tournament21540Panel .tourRoadStage21562.done:not(:first-child):after{background:#b38b34}'+
      '#tournament21540Panel .tourRoadStage21562.current{color:#ffe39a}#tournament21540Panel .tourRoadStage21562.current:before{width:9px;height:9px;top:-1px;margin-left:-5px;border:2px solid #ffe39a;background:#574111}'+
      '#tournament21540Panel .tourRoadStage21562.boss.current,#tournament21540Panel .tourRoadStage21562.boss.done{color:#ffd56b}#tournament21540Panel .tourRoadStage21562.failed{color:#d99b91}'+
      '#tournament21540Panel.tourFireFit .tourRoad21562{gap:2px;margin-top:1px;padding-top:4px}#tournament21540Panel.tourFireFit .tourRoadStage21562{padding-top:7px;font-size:5px}';
    document.head.appendChild(s);
  }
  function render(){
    style();
    const a=state(),hero=document.querySelector('#tournament21540Panel .tourGameHero21559');
    document.querySelectorAll('#tournament21540Panel .tourRoad21562').forEach(x=>x.remove());
    if(!a||!hero)return false;
    const p=phase(a),labels=['1R','QF','SF','F','EX'],road=document.createElement('div');
    road.className='tourRoad21562';road.setAttribute('aria-label','大会進行');
    labels.forEach((label,i)=>{
      const el=document.createElement('span');el.textContent=label;
      el.className='tourRoadStage21562'+(i===4?' boss':'')+(i<p.done?' done':'')+(i===p.current?' current':'')+(i===p.current&&p.failed?' failed':'');
      road.appendChild(el);
    });
    hero.insertAdjacentElement('afterend',road);return true;
  }
  function install(){
    const base=window.AI_SHOGI_TOURNAMENT_GAME_UI;if(!base||base.__road21562)return false;
    base.__road21562=true;const oldRender=base.render.bind(base),oldAudit=base.audit.bind(base);
    base.render=()=>{const r=oldRender();render();return r};
    base.audit=()=>{render();const out=oldAudit(),stages=[...document.querySelectorAll('#tournament21540Panel .tourRoadStage21562')];return{...out,road21562:stages.length===5,roadDone21562:stages.filter(x=>x.classList.contains('done')).length,roadCurrent21562:stages.findIndex(x=>x.classList.contains('current')),roadFailed21562:stages.some(x=>x.classList.contains('failed'))}};
    render();return true;
  }
  let installed=false,tries=0;const t=setInterval(()=>{if(!installed)installed=install();if(installed&&render())clearInterval(t);else if(++tries>80)clearInterval(t)},100);
  window.addEventListener('ai-shogi-local-save',render);
  window.addEventListener('resize',render,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(render,120),{passive:true});
})();

/* 21567 companion loader: load the display-only recent-attempt history after the road tracker. */
(function loadTournamentAttemptHistory21567(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_HISTORY_LOADER_21567)return;
  const here=document.currentScript?.src||'';let src='';
  if(/tournament-road21562\.js(?:[?#]|$)/.test(here))src=here.replace(/tournament-road21562\.js(?:[?#].*)?$/,'tournament-history21567.js?v=21567');
  else if(/\/shogi-v21528\/(?:index\.html)?$/.test(location.pathname))src=new URL('tournament-history21567.js?v=21567',location.href).href;
  else return;
  window.__AI_SHOGI_TOURNAMENT_HISTORY_LOADER_21567=true;
  if(window.__AI_SHOGI_TOURNAMENT_HISTORY_21567||!src||[...document.scripts].some(s=>s.src===src))return;
  const tag=document.createElement('script');tag.src=src;tag.async=false;tag.dataset.tournamentHistory='21567';document.head.appendChild(tag);
})();