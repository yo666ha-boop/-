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
      e.seen=now;e.last={message:msg,delta,rating:now.rating,result:kind,at:Date.now(),total:now.total};write(store);persistLast(key,e.last);render(e.last);
      try{window.AI_SHOGI_PROFILE_STATS.saveNow?.()}catch(err){}
      return;
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

/* v2.15.42a: live 16-player tournament + portrait repair + Fire fit loader. */
(function loadTournament21542(){
  if(window.__AI_SHOGI_TOURNAMENT_LOADER_21542A)return;
  window.__AI_SHOGI_TOURNAMENT_LOADER_21542A=true;
  try{
    const scriptURL=document.currentScript?.src||location.href;
    const core=document.createElement('script');
    core.src=new URL('./tournament21541.js?v=21541a',scriptURL).href;
    core.async=false;
    core.addEventListener('load',()=>{
      const ui=document.createElement('script');
      ui.src=new URL('./tournament-ui21542.js?v=21542a',scriptURL).href;
      ui.async=false;
      document.head.appendChild(ui);
    },{once:true});
    document.head.appendChild(core);
  }catch(e){console.error('tournament21542 loader failed',e)}
})();