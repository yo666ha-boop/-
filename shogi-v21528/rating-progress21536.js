/* AI将棋先生 v2.15.28 - visible per-profile rating progress */
(function installRatingProgress21536(){
  if(window.__AI_SHOGI_RATING_PROGRESS_21536B)return;
  window.__AI_SHOGI_RATING_PROGRESS_21536B=true;

  const KEY='aiShogiRatingProgressV1';
  const SAVE_KEY='aiShogiGameSaveV1';
  const readJson=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}};
  const read=()=>{const x=readJson(KEY,{version:1,profiles:{}});return x&&typeof x==='object'?x:{version:1,profiles:{}}};
  const write=v=>writeJson(KEY,v);
  const profile=()=>{try{return window.AI_SHOGI_PROFILE_STATS?.profile?.()||{key:'',slotName:''}}catch(e){return{key:'',slotName:''}}};
  const stats=()=>{try{return window.AI_SHOGI_PROFILE_STATS?.current?.()||null}catch(e){return null}};
  const total=s=>(Number(s?.w)||0)+(Number(s?.l)||0)+(Number(s?.d)||0);
  const signed=n=>n>0?('+'+n):String(n);

  function ensureLine(){
    const sub=document.getElementById('statsSub');if(!sub)return null;
    let line=document.getElementById('ratingProgressLine');
    if(line)return line;
    line=document.createElement('div');line.id='ratingProgressLine';line.setAttribute('aria-live','polite');
    line.style.cssText='margin-top:4px;font-size:12px;line-height:1.45;font-weight:800;opacity:.9;overflow-wrap:anywhere';
    sub.insertAdjacentElement('afterend',line);return line;
  }
  function render(entry=null){
    const line=ensureLine();if(!line)return;
    if(entry?.message){line.textContent=entry.message;line.dataset.ratingChange='1';}
    else{line.textContent='対局結果に応じてレートが増減し、この名前の成績として保存されます。';line.dataset.ratingChange='0';}
  }
  function resultLabel(prev,s){
    if((Number(s.w)||0)>(Number(prev.w)||0))return'勝ち';
    if((Number(s.l)||0)>(Number(prev.l)||0))return'負け';
    if((Number(s.d)||0)>(Number(prev.d)||0))return'引き分け';
    return'対局終了';
  }
  function snapshot(s){return{rating:Number(s.rating)||1500,w:Number(s.w)||0,l:Number(s.l)||0,d:Number(s.d)||0,total:total(s)}}
  function normalizeLast(value){
    if(!value||typeof value!=='object'||typeof value.message!=='string'||!value.message)return null;
    const result=['勝ち','負け','引き分け','対局終了'].includes(value.result)?value.result:'対局終了';
    return{message:value.message,delta:Number(value.delta)||0,rating:Number(value.rating)||1500,result,at:Number(value.at)||0,total:Math.max(0,Math.floor(Number(value.total)||0))};
  }
  function savedLast(key,nowTotal){
    const save=readJson(SAVE_KEY,null),rp=save?.ratingProgress,last=normalizeLast(rp?.last);
    if(!last||String(rp?.profileKey||'')!==key||last.total!==nowTotal)return null;
    return last;
  }
  function persistLast(key,last){
    const save=readJson(SAVE_KEY,null);if(!save||typeof save!=='object')return false;
    save.ratingProgress={version:1,profileKey:key,last:normalizeLast(last)};
    return writeJson(SAVE_KEY,save);
  }
  function restoreSavedLast(key,now,e,store){
    const remote=savedLast(key,now.total);if(!remote)return false;
    const localAt=Number(e?.last?.at)||0,seenTotal=Number(e?.seen?.total);
    if(e&&localAt>=remote.at&&seenTotal===now.total)return false;
    e=e||{seen:now,last:null};e.seen=now;e.last=remote;store.profiles[key]=e;write(store);render(remote);return true;
  }
  function tick(){
    if(!window.AI_SHOGI_PROFILE_STATS)return;
    const p=profile(),s=stats();if(!s)return;
    const key=p.key||'__local__',store=read();store.version=1;store.profiles=store.profiles||{};
    const now=snapshot(s);let e=store.profiles[key];
    if(restoreSavedLast(key,now,e,store))return;
    e=store.profiles[key];
    if(!e){e={seen:now,last:null};store.profiles[key]=e;write(store);render(null);return;}
    const prev=e.seen||now;
    if(now.total<Number(prev.total||0)){
      e.seen=now;e.last=null;write(store);persistLast(key,null);render(null);return;
    }
    if(now.total>Number(prev.total||0)){
      const delta=now.rating-(Number(prev.rating)||1500),kind=resultLabel(prev,now);
      const msg='前局：'+kind+'　R'+(Number(prev.rating)||1500)+' → R'+now.rating+'（'+signed(delta)+'）';
      e.seen=now;e.last={message:msg,delta,rating:now.rating,result:kind,at:Date.now(),total:now.total};write(store);persistLast(key,e.last);render(e.last);try{window.AI_SHOGI_PROFILE_STATS.saveNow?.()}catch(err){};return;
    }
    if(now.rating!==Number(prev.rating||now.rating)||now.w!==Number(prev.w||0)||now.l!==Number(prev.l||0)||now.d!==Number(prev.d||0)){
      e.seen=now;write(store);
    }
    render(e.last||null);
  }
  let tries=0;const boot=setInterval(()=>{ensureLine();tick();if(++tries>80)clearInterval(boot)},120);
  setInterval(tick,700);
  window.addEventListener('ai-shogi-local-save',()=>setTimeout(tick,0));

  window.AI_SHOGI_RATING_PROGRESS={
    version:'21536b',
    audit:()=>{const p=profile(),s=stats(),store=read(),e=store.profiles?.[p.key||'__local__'];return{ok:!!s,profileKey:p.key||'',slotName:p.slotName||'',rating:s?.rating??null,total:s?total(s):null,last:e?.last||null,line:document.getElementById('ratingProgressLine')?.textContent||'',cloudLast:s?savedLast(p.key||'__local__',total(s)):null}},
    clearMessage:()=>{const p=profile(),store=read(),key=p.key||'__local__';if(store.profiles?.[key]){store.profiles[key].last=null;write(store)}persistLast(key,null);render(null);try{window.AI_SHOGI_PROFILE_STATS?.saveNow?.()}catch(e){}}
  };
})();

/* v2.15.47d: tournament + separate boss challenge + image-backed situation dialogue. */
(function loadTournament21547(){
  if(window.__AI_SHOGI_TOURNAMENT_LOADER_21547D)return;
  window.__AI_SHOGI_TOURNAMENT_LOADER_21547D=true;
  try{
    const scriptURL=document.currentScript?.src||location.href;
    const core=document.createElement('script');
    core.src=new URL('./tournament21541.js?v=21541a',scriptURL).href;
    core.async=false;
    core.addEventListener('load',()=>{
      const field=document.createElement('script');
      field.src=new URL('./tournament-field21545.js?v=21545b',scriptURL).href;
      field.async=false;
      field.addEventListener('load',()=>{
        const boss=document.createElement('script');
        boss.src=new URL('./tournament-boss21546.js?v=21546a',scriptURL).href;
        boss.async=false;
        boss.addEventListener('load',()=>{
          const ui=document.createElement('script');
          ui.src=new URL('./tournament-ui21542.js?v=21542a',scriptURL).href;
          ui.async=false;
          ui.addEventListener('load',()=>{
            const skin=document.createElement('script');
            skin.src=new URL('./tournament-skin21544.js?v=21544c',scriptURL).href;
            skin.async=false;
            skin.addEventListener('load',()=>{
              const bank=document.createElement('script');
              bank.src=new URL('./tournament-dialogue-bank21547.js?v=21547d',scriptURL).href;
              bank.async=false;
              bank.addEventListener('load',()=>{
                const dialogue=document.createElement('script');
                dialogue.src=new URL('./tournament-dialogue21547.js?v=21547d',scriptURL).href;
                dialogue.async=false;
                document.head.appendChild(dialogue);
              },{once:true});
              document.head.appendChild(bank);
            },{once:true});
            document.head.appendChild(skin);
          },{once:true});
          document.head.appendChild(ui);
        },{once:true});
        document.head.appendChild(boss);
      },{once:true});
      document.head.appendChild(field);
    },{once:true});
    document.head.appendChild(core);
  }catch(e){console.error('tournament21547 loader failed',e)}
})();

/* v2.15.47e: keep boss-start dialogue visible while the tournament panel is closed for the fifth match. */
(function installTournamentDialogueBattleDock21547(){
  if(window.__AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK_21547E)return;
  window.__AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK_21547E=true;
  const KEY='aiShogiTournament21540';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  function ensureStyle(){
    if(document.getElementById('tournamentDialogueBattleDock21547Style'))return;
    const s=document.createElement('style');s.id='tournamentDialogueBattleDock21547Style';s.textContent=`
.side>#tourDialogue21547.tourDialogueBattleDock21547{display:grid;grid-template-columns:70px minmax(0,1fr);gap:10px;align-items:center;border:1px solid rgba(222,181,77,.72);border-radius:13px;padding:9px;margin:8px 0;background:linear-gradient(135deg,rgba(22,40,31,.98),rgba(8,20,17,.98));box-shadow:0 6px 18px rgba(0,0,0,.22),inset 0 0 0 1px rgba(255,231,155,.05);min-width:0}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialoguePortrait{width:66px;height:66px;border-radius:13px;overflow:hidden;border:2px solid #d8aa45;background:#0b1512;box-shadow:0 0 0 2px rgba(255,226,131,.08)}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialoguePortrait img{width:100%;height:100%;object-fit:cover;display:block}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueBody{min-width:0}.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueTop{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueStatus{font-size:10px;font-weight:900;border:1px solid #c89b37;color:#ffe39a;border-radius:999px;padding:2px 7px;white-space:nowrap}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueRole{font-size:9px;color:#97c8b0;border:1px solid #416756;border-radius:999px;padding:2px 6px;white-space:nowrap}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueName{font-size:12px;font-weight:900;color:#f8dc8d;margin-bottom:2px}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueBubble{position:relative;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:7px 8px;font-size:12px;line-height:1.55;color:#f4ead0;overflow-wrap:anywhere}
.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueBubble:before{content:'';position:absolute;left:-7px;top:13px;width:12px;height:12px;background:#172a22;border-left:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);transform:rotate(45deg)}
body.tournamentFire21542 .side>#tourDialogue21547.tourDialogueBattleDock21547{grid-template-columns:52px minmax(0,1fr);gap:7px;padding:6px;margin:5px 0}body.tournamentFire21542 .side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialoguePortrait{width:48px;height:48px;border-radius:10px}body.tournamentFire21542 .side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueBubble{font-size:10px;line-height:1.4;padding:5px 6px}
@media(max-width:520px){.side>#tourDialogue21547.tourDialogueBattleDock21547{grid-template-columns:58px minmax(0,1fr);gap:8px;padding:7px}.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialoguePortrait{width:54px;height:54px}.side>#tourDialogue21547.tourDialogueBattleDock21547 .tourDialogueBubble{font-size:11px}}
`;
    document.head.appendChild(s);
  }
  function dock(){
    const api=window.AI_SHOGI_TOURNAMENT_DIALOGUE;if(!api)return false;
    try{api.render?.()}catch(e){}
    const box=document.getElementById('tourDialogue21547');if(!box)return false;
    const a=read()?.active,battle=a?.bossChallenge?.status==='active';
    if(battle){
      const side=document.querySelector('.side'),status=document.getElementById('status');if(!side)return false;
      if(box.parentElement!==side){if(status?.parentElement===side)status.insertAdjacentElement('afterend',box);else side.prepend(box)}
      box.classList.add('tourDialogueBattleDock21547');box.dataset.battleDock='1';return true;
    }
    if(box.dataset.battleDock==='1'){
      const root=document.querySelector('#tournament21540Panel .tourActive');if(root){const anchor=root.querySelector('.tourCurrentMatch')||root.querySelector('.tourActiveTitle');if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box)}
      box.classList.remove('tourDialogueBattleDock21547');delete box.dataset.battleDock;
    }
    return false;
  }
  ensureStyle();let tries=0;const boot=setInterval(()=>{dock();if(window.AI_SHOGI_TOURNAMENT_DIALOGUE&&++tries>80)clearInterval(boot)},120);setInterval(dock,240);
  window.addEventListener('ai-shogi-profile-stats',()=>setTimeout(dock,0));
  window.AI_SHOGI_TOURNAMENT_DIALOGUE_BATTLE_DOCK={version:'21547e',audit:()=>{const box=document.getElementById('tourDialogue21547'),a=read()?.active;return{bossActive:a?.bossChallenge?.status==='active',docked:box?.dataset.battleDock==='1',connected:!!box?.isConnected,parentClass:box?.parentElement?.className||''}}};
})();