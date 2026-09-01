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

/* Fire APK OTA persistence v1.
 * Fire native starts its localhost server on a new 127.0.0.1 port each launch. localStorage is
 * origin/port scoped, so a normal local save can appear empty after a restart. The APK already
 * OTA-updates this Web layer. Keep only a random device backup key in a host cookie (cookies are
 * not port-scoped), and keep the actual game/profile data in the existing Supabase save service.
 * This is separate from the user-visible family-code cloud slots and does not require an APK update.
 */
(function installFireOtaPersistence21539(){
  if(window.__AI_SHOGI_FIRE_OTA_PERSIST_21539A)return;
  const isFire=!!window.MitsukiFireNative||/MitsukiShogiFire\//i.test(navigator.userAgent||'');
  if(!isFire)return;
  window.__AI_SHOGI_FIRE_OTA_PERSIST_21539A=true;

  const API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
  const SAVE_KEY='aiShogiGameSaveV1';
  const STATS_KEY='aiShogiSenseiStatsV27';
  const COOKIE_KEY='mitsukiFireAutoSaveKeyV1';
  const SLOT_ID='fire_device_autosave_v1';
  const SLOT_NAME='Fire端末自動保存';
  const KEY_RE=/^[A-Za-z0-9_-]{24,128}$/;
  let suppress=false,syncing=false,dirty=false,timer=0,lastError='',lastRemoteRevision=0,lastSyncedSavedAt=0;

  const validSave=x=>!!(x&&x.version===1&&x.st&&Array.isArray(x.st.b)&&x.st.b.length===81&&x.st.h&&Array.isArray(x.st.log));
  const readJson=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  function cookieRead(name){
    try{
      for(const part of String(document.cookie||'').split(';')){
        const p=part.trim(),i=p.indexOf('=');if(i<0)continue;
        if(p.slice(0,i)===name)return decodeURIComponent(p.slice(i+1));
      }
    }catch(e){}
    return'';
  }
  function cookieWrite(name,value){
    try{document.cookie=name+'='+encodeURIComponent(value)+'; Path=/; Max-Age=315360000; SameSite=Lax';return cookieRead(name)===value}catch(e){return false}
  }
  function ensureDeviceKey(){
    let key=cookieRead(COOKIE_KEY);
    if(KEY_RE.test(key))return key;
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);key=base64url(bytes);cookieWrite(COOKIE_KEY,key);return key;
  }
  const deviceKey=ensureDeviceKey();
  const deviceId='fire_'+deviceKey.slice(0,32);
  const headers=()=>({'Authorization':'Bearer '+deviceKey,'Content-Type':'application/json'});

  function collectSmallLocalStorage(){
    const out={};let total=0;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key||key===SAVE_KEY||!key.startsWith('aiShogi'))continue;
        const value=localStorage.getItem(key);if(value==null||value.length>24000)continue;
        const next=key.length+value.length;if(total+next>90000)break;
        out[key]=value;total+=next;
      }
    }catch(e){}
    return out;
  }
  function payloadForUpload(){
    const local=readJson(SAVE_KEY,null);if(!validSave(local))return null;
    const payload=clone(local),stats=readJson(STATS_KEY,null);
    if(stats&&typeof stats==='object')payload.playerStats={version:1,...clone(stats)};
    payload.fireLocalStorageV1=collectSmallLocalStorage();
    payload.fireAutoBackup={version:1,deviceId,savedAt:Number(payload.savedAt)||Date.now()};
    return payload;
  }
  function compactPayload(payload){
    const p=clone(payload);
    p.hist=[];p.repHistory=[];p.reviewTrail=[];p.lastHumanBefore=null;p.lastHumanMove=null;
    p.fireAutoBackup={...(p.fireAutoBackup||{}),compact:true};
    return p;
  }
  function restoreSmallLocalStorage(payload){
    const box=payload?.fireLocalStorageV1;if(!box||typeof box!=='object')return;
    for(const [key,value] of Object.entries(box)){
      if(key===SAVE_KEY||!key.startsWith('aiShogi')||typeof value!=='string'||value.length>24000)continue;
      try{localStorage.setItem(key,value)}catch(e){}
    }
  }
  function applyRemotePayload(payload){
    if(!validSave(payload))return false;
    suppress=true;
    try{
      restoreSmallLocalStorage(payload);
      localStorage.setItem(SAVE_KEY,JSON.stringify(payload));
      if(payload.playerStats&&typeof payload.playerStats==='object'){
        const s=payload.playerStats;
        localStorage.setItem(STATS_KEY,JSON.stringify({rating:s.rating,w:s.w,l:s.l,d:s.d,chars:s.chars}));
      }
    }finally{suppress=false}
    lastSyncedSavedAt=Number(payload.savedAt)||0;
    setTimeout(()=>{
      try{window.AI_SHOGI_PROFILE_STATS?.apply?.()}catch(e){}
      try{window.AI_SHOGI_PLAYER_NAME?.sync?.()}catch(e){}
      try{window.dispatchEvent(new Event('ai-shogi-local-save'))}catch(e){}
    },0);
    return true;
  }

  async function getRemote(){
    const r=await fetch(API+'?slot='+encodeURIComponent(SLOT_ID),{method:'GET',headers:headers(),cache:'no-store'});
    const j=await r.json().catch(()=>({ok:false,error:'invalid_response'}));
    if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));
    return j.record||null;
  }
  async function putRemote(payload,baseRevision){
    const r=await fetch(API,{method:'PUT',headers:headers(),cache:'no-store',body:JSON.stringify({slotId:SLOT_ID,slotName:SLOT_NAME,baseRevision:Number(baseRevision)||0,deviceId,payload})});
    const j=await r.json().catch(()=>({ok:false,error:'invalid_response'}));return{r,j};
  }
  async function deleteRemote(){
    if(!navigator.onLine)return false;
    try{
      const r=await fetch(API,{method:'DELETE',headers:headers(),cache:'no-store',body:JSON.stringify({mode:'slot',slotId:SLOT_ID})});
      const j=await r.json().catch(()=>({ok:false}));if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));
      lastRemoteRevision=0;lastSyncedSavedAt=0;lastError='';return true;
    }catch(e){lastError=String(e.message||e);return false}
  }

  async function hydrate(){
    if(!navigator.onLine)return{ok:false,offline:true};
    try{
      const local=readJson(SAVE_KEY,null),rec=await getRemote();
      lastRemoteRevision=Number(rec?.revision)||0;
      const remote=rec?.payload,localAt=Number(local?.savedAt)||0,remoteAt=Number(remote?.savedAt)||0;
      if(validSave(remote)&&(!validSave(local)||remoteAt>localAt)){
        applyRemotePayload(remote);lastError='';return{ok:true,restored:true,revision:lastRemoteRevision,savedAt:remoteAt};
      }
      if(validSave(local)&&(!validSave(remote)||localAt>remoteAt))queuePush(120);
      lastSyncedSavedAt=Math.max(localAt,remoteAt);lastError='';return{ok:true,restored:false,revision:lastRemoteRevision,savedAt:lastSyncedSavedAt};
    }catch(e){lastError=String(e.message||e);return{ok:false,error:lastError}}
  }

  function queuePush(delay=750){
    dirty=true;clearTimeout(timer);timer=setTimeout(()=>{void pushNow()},delay);
  }
  async function pushNow(){
    if(syncing||!navigator.onLine)return{ok:false,skipped:true};
    let payload=payloadForUpload();if(!payload)return{ok:false,skipped:true};
    syncing=true;dirty=false;
    try{
      let rec=await getRemote(),remote=rec?.payload,remoteAt=Number(remote?.savedAt)||0,localAt=Number(payload.savedAt)||0;
      lastRemoteRevision=Number(rec?.revision)||0;
      if(validSave(remote)&&remoteAt>localAt){
        applyRemotePayload(remote);lastError='';return{ok:true,restoredNewer:true};
      }
      let out=await putRemote(payload,lastRemoteRevision);
      if(out.r.status===413){payload=compactPayload(payload);out=await putRemote(payload,lastRemoteRevision)}
      if(out.r.status===409){
        rec=await getRemote();lastRemoteRevision=Number(rec?.revision)||0;remote=rec?.payload;remoteAt=Number(remote?.savedAt)||0;
        if(validSave(remote)&&remoteAt>Number(payload.savedAt||0)){applyRemotePayload(remote);lastError='';return{ok:true,restoredConflict:true}}
        out=await putRemote(payload,lastRemoteRevision);
      }
      if(!out.r.ok||!out.j.ok)throw new Error(out.j.error||('HTTP '+out.r.status));
      lastRemoteRevision=Number(out.j.record?.revision)||lastRemoteRevision;
      lastSyncedSavedAt=Number(payload.savedAt)||0;lastError='';return{ok:true,revision:lastRemoteRevision,savedAt:lastSyncedSavedAt};
    }catch(e){lastError=String(e.message||e);return{ok:false,error:lastError}}
    finally{syncing=false;if(dirty)queuePush(280)}
  }

  try{
    const nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
    Storage.prototype.setItem=function(key,value){
      const out=nativeSet.call(this,key,value);
      try{if(this===window.localStorage&&key===SAVE_KEY&&!suppress)queuePush()}catch(e){}
      return out;
    };
    Storage.prototype.removeItem=function(key){
      const wasSave=(()=>{try{return this===window.localStorage&&key===SAVE_KEY}catch(e){return false}})();
      const out=nativeRemove.call(this,key);
      if(wasSave&&!suppress)void deleteRemote();
      return out;
    };
  }catch(e){lastError='storage_hook_failed: '+String(e.message||e)}

  window.addEventListener('online',()=>{void hydrate().then(()=>queuePush(250))});
  window.addEventListener('ai-shogi-local-save',()=>queuePush(650));
  const ready=hydrate();
  window.AI_SHOGI_FIRE_PERSIST={
    version:'21539a',ready,hydrate,push:pushNow,clearRemote:deleteRemote,
    audit:()=>({ok:true,fire:true,cookiePersisted:KEY_RE.test(cookieRead(COOKIE_KEY)),deviceKeyPresent:KEY_RE.test(deviceKey),slotId:SLOT_ID,online:!!navigator.onLine,syncing,dirty,lastError,lastRemoteRevision,lastSyncedSavedAt,localSavedAt:Number(readJson(SAVE_KEY,null)?.savedAt)||0,localPly:Number(readJson(SAVE_KEY,null)?.st?.log?.length)||0})
  };
})();

/* Fire-only startup auto-resume v1.
 * Fire tablets are treated as a personal appliance: if an unfinished saved game exists, reopen it
 * automatically after the OTA persistence layer has restored the latest device backup. The manual
 * resume button remains available as a fallback. Finished games and empty saves are never auto-opened.
 */
(function installFireAutoResume21539B(){
  if(window.__AI_SHOGI_FIRE_AUTO_RESUME_21539B)return;
  const isFire=!!window.MitsukiFireNative||/MitsukiShogiFire\//i.test(navigator.userAgent||'');
  if(!isFire)return;
  window.__AI_SHOGI_FIRE_AUTO_RESUME_21539B=true;
  let state='waiting',lastError='',attempts=0,resumedPly=0;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function run(){
    state='waiting-persistence';
    try{await window.AI_SHOGI_FIRE_PERSIST?.ready}catch(e){}
    state='waiting-save-api';
    for(attempts=1;attempts<=120;attempts++){
      const api=window.AI_SHOGI_SAVE;
      if(api&&typeof api.data==='function'&&typeof api.restore==='function'){
        try{
          const saved=api.data();
          const savedPly=Number(saved?.st?.log?.length)||0;
          if(!saved){state='no-save';return{ok:true,resumed:false,reason:state}}
          if(saved.gameCounted){state='finished-save';return{ok:true,resumed:false,reason:state,savedPly}}
          if(savedPly<1){state='empty-save';return{ok:true,resumed:false,reason:state,savedPly}}
          const currentPly=Number(api.audit?.()?.currentPly)||0;
          if(currentPly>0){state='already-active';return{ok:true,resumed:false,reason:state,currentPly,savedPly}}
          const ok=api.restore({force:true});
          if(ok){state='resumed';resumedPly=savedPly;return{ok:true,resumed:true,savedPly}}
          state='restore-failed';return{ok:false,resumed:false,reason:state,savedPly}
        }catch(e){lastError=String(e?.message||e);state='error';return{ok:false,resumed:false,reason:state,error:lastError}}
      }
      await sleep(50);
    }
    state='save-api-timeout';
    return{ok:false,resumed:false,reason:state};
  }

  const ready=run();
  window.AI_SHOGI_FIRE_AUTO_RESUME={
    version:'21539b',ready,run,
    audit:()=>({ok:true,fire:true,state,lastError,attempts,resumedPly})
  };
})();
