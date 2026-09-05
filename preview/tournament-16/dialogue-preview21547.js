/* みつき将棋 外部確認ページ・画像付き状況セリフ 21547a */
(function installPreviewDialogue21547(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_DIALOGUE_21547A)return;
  window.__TOURNAMENT_PREVIEW_DIALOGUE_21547A=true;
  const bank=()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK;
  const ROUND_CTX=['r1','qf','sf','final'],ROUNDS=['1回戦','準々決勝','準決勝','決勝'];
  const history={},seen={cup:'',opp:'',cupAt:0,oppAt:0,sig:'',pick:null};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function opponent(){const row=active?.rounds?.[active?.round];if(!Array.isArray(row))return null;return row[(Number(active?.playerSlot)||0)^1]||null}
  function derive(){
    if(!active?.cup?.id)return null;const now=Date.now(),cup=active.cup,opp=opponent();
    if(seen.cup!==cup.id){seen.cup=cup.id;seen.cupAt=now;seen.opp=opp||'';seen.oppAt=now}
    if(opp&&seen.opp!==opp){seen.opp=opp;seen.oppAt=now}
    const bs=active.bossChallenge?.status;let ctx;
    if(bs==='pending')ctx='boss_pending';else if(bs==='active')ctx='boss_start';else if(bs==='won')ctx='boss_won';else if(bs==='lost')ctx='boss_lost';else if(bs==='draw')ctx='boss_draw';
    else if(active.status==='lost')ctx='round_loss';else if(active.pending==='next')ctx='round_win';else if(Number(active.round)>0&&opp&&now-seen.oppAt<2200)ctx='opponent';else if(now-seen.cupAt<2500)ctx='intro';else ctx=ROUND_CTX[Number(active.round)||0]||'r1';
    const vars={cup:cup.name,boss:cup.boss,round:ROUNDS[Number(active.round)||0]||'大会',opponent:opp==='__PLAYER__'?'あなた':opp||'未定'};
    return{cup,opp,ctx,vars,sig:[cup.id,ctx,active.round,active.pending||'',active.status||'',opp||'',bs||''].join('|')};
  }
  function pick(d){if(seen.sig===d.sig&&seen.pick)return seen.pick;const key=d.cup.id+':'+d.ctx,old=history[key]||[],p=bank()?.pick?.(d.cup.id,d.ctx,d.vars,old);if(!p)return null;history[key]=[...old,p.id].slice(-5);seen.sig=d.sig;seen.pick=p;return p}
  function style(){if(document.getElementById('dialoguePreview21547Style'))return;const s=document.createElement('style');s.id='dialoguePreview21547Style';s.textContent=`
#dialoguePreview21547{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;border:1px solid #d5a83f;border-radius:13px;padding:9px;margin:8px 0;background:linear-gradient(135deg,#172a22,#081511);box-sizing:border-box;max-width:100%}#dialoguePreview21547 .dpImg{width:66px;height:66px;border-radius:12px;overflow:hidden;border:2px solid #e0b24d;background:#0b1512}#dialoguePreview21547 .dpImg img{width:100%;height:100%;object-fit:cover;display:block}#dialoguePreview21547 .dpTop{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px}#dialoguePreview21547 .dpStatus,#dialoguePreview21547 .dpRole{font-size:10px;font-weight:900;border:1px solid #c89b37;border-radius:999px;padding:2px 7px;color:#ffe39a}#dialoguePreview21547 .dpRole{border-color:#416756;color:#9ccbb4}#dialoguePreview21547 .dpName{font-size:12px;font-weight:900;color:#f8dc8d;margin-bottom:2px}#dialoguePreview21547 .dpSpeech{font-size:12px;line-height:1.5;background:rgba(255,255,255,.055);border-radius:9px;padding:7px 8px;color:#f4ead0;overflow-wrap:anywhere}@media(max-width:520px){#dialoguePreview21547{grid-template-columns:58px minmax(0,1fr);gap:8px;padding:7px}#dialoguePreview21547 .dpImg{width:54px;height:54px}#dialoguePreview21547 .dpSpeech{font-size:11px}}
`;document.head.appendChild(s)}
  function box(){let el=document.getElementById('dialoguePreview21547');if(el)return el;el=document.createElement('section');el.id='dialoguePreview21547';el.setAttribute('aria-live','polite');(document.querySelector('.news')||document.querySelector('.actions'))?.insertAdjacentElement('beforebegin',el);return el}
  function render(){style();const d=derive(),el=box();if(!d){el.style.display='none';return false}const p=pick(d);if(!p)return false;const src=IMG[d.cup.boss]||'',role=['pending','active','won','lost','draw'].includes(active.bossChallenge?.status)?'杯ボス':'大会主・トーナメント外';el.style.display='grid';const oldImg=el.querySelector('img');const same=el.dataset.context===d.ctx&&el.dataset.speaker===d.cup.boss&&el.dataset.role===role&&el.dataset.lineId===p.id&&(!src||oldImg?.src===src);if(same)return true;el.dataset.context=d.ctx;el.dataset.speaker=d.cup.boss;el.dataset.role=role;el.dataset.lineId=p.id;el.innerHTML='<div class="dpImg">'+(src?'<img src="'+esc(src)+'" alt="'+esc(d.cup.boss)+'">':'')+'</div><div><div class="dpTop"><span class="dpStatus">'+esc(p.label)+'</span><span class="dpRole">'+esc(role)+'</span></div><div class="dpName">'+esc(d.cup.boss)+'</div><div class="dpSpeech">'+esc(p.text)+'</div></div>';return true}
  window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT=()=>{const el=document.getElementById('dialoguePreview21547'),b=bank()?.audit?.()||{};return{ok:!!b.ok&&(!active||!!el?.querySelector('img')),version:'21547a',bank:b,context:el?.dataset.context||null,speaker:el?.dataset.speaker||null,role:el?.dataset.role||null,portrait:!!el?.querySelector('img')?.src,lineId:el?.dataset.lineId||null,label:el?.querySelector('.dpStatus')?.textContent||'',text:el?.querySelector('.dpSpeech')?.textContent||'',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}};
  const mo=new MutationObserver(()=>setTimeout(render,0));mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});setInterval(render,450);setTimeout(render,0);setTimeout(render,700);
})();
