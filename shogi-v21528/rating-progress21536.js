/* AI将棋先生 v2.15.28 - visible per-profile rating progress */
(function installRatingProgress21536(){
  if(window.__AI_SHOGI_RATING_PROGRESS_21536A)return;
  window.__AI_SHOGI_RATING_PROGRESS_21536A=true;

  const KEY='aiShogiRatingProgressV1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{"version":1,"profiles":{}}')}catch(e){return{version:1,profiles:{}}}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch(e){return false}};
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
  function tick(){
    if(!window.AI_SHOGI_PROFILE_STATS)return;
    const p=profile(),s=stats();if(!s)return;
    const key=p.key||'__local__',store=read();store.version=1;store.profiles=store.profiles||{};
    let e=store.profiles[key];
    if(!e){e={seen:snapshot(s),last:null};store.profiles[key]=e;write(store);render(null);return;}
    const now=snapshot(s),prev=e.seen||snapshot(s);
    if(now.total<Number(prev.total||0)){
      e.seen=now;e.last=null;write(store);render(null);return;
    }
    if(now.total>Number(prev.total||0)){
      const delta=now.rating-(Number(prev.rating)||1500),kind=resultLabel(prev,now);
      const msg='前局：'+kind+'　R'+(Number(prev.rating)||1500)+' → R'+now.rating+'（'+signed(delta)+'）';
      e.seen=now;e.last={message:msg,delta,rating:now.rating,result:kind,at:Date.now()};write(store);render(e.last);
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
    version:'21536a',
    audit:()=>{const p=profile(),s=stats(),store=read(),e=store.profiles?.[p.key||'__local__'];return{ok:!!s,profileKey:p.key||'',slotName:p.slotName||'',rating:s?.rating??null,total:s?total(s):null,last:e?.last||null,line:document.getElementById('ratingProgressLine')?.textContent||''}},
    clearMessage:()=>{const p=profile(),store=read(),key=p.key||'__local__';if(store.profiles?.[key]){store.profiles[key].last=null;write(store)}render(null)}
  };
})();
