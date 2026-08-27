/* AI将棋先生 v2.15.28 - persistent player name display */
(function installPlayerName21534B(){
  if(window.__AI_SHOGI_PLAYER_NAME_21534B)return;
  window.__AI_SHOGI_PLAYER_NAME_21534B=true;
  const normalize=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const currentName=()=>normalize(window.AI_SHOGI_CLOUD_SAVE?.audit?.()?.activeSlotName||'')||'あなた';
  function sync(){
    const name=currentName();
    for(const id of ['sHand','fsHand']){
      const b=document.querySelector('#'+id+' b');
      if(b&&b.textContent!==name)b.textContent=name;
    }
    const stats=document.getElementById('statsMain');
    if(stats){
      const t=stats.textContent||'',m=t.match(/\sR-?\d+/);
      if(m){const next=name+t.slice(m.index);if(t!==next)stats.textContent=next}
    }
    for(const id of ['status','fstatus']){
      const el=document.getElementById(id);
      if(el&&name!=='あなた'&&el.textContent.includes('あなた'))el.textContent=el.textContent.replaceAll('あなた',name);
    }
    if(document.documentElement.dataset.aiShogiPlayerName!==name)document.documentElement.dataset.aiShogiPlayerName=name;
  }
  const obs=new MutationObserver(()=>queueMicrotask(sync));
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  setInterval(sync,600);
  setTimeout(sync,0);
  window.AI_SHOGI_PLAYER_NAME={version:'21534b',name:currentName,sync,audit:()=>({ok:true,name:currentName(),hands:[document.querySelector('#sHand b')?.textContent||'',document.querySelector('#fsHand b')?.textContent||''],stats:document.getElementById('statsMain')?.textContent||''})};
})();
