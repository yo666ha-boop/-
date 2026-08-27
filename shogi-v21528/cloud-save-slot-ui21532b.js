/* AI将棋先生 v2.15.28 - 複数クラウド保存: 新しい保存枠を作る */
(function installCloudNewSlot21532b(){
  if(window.__AI_SHOGI_CLOUD_NEW_SLOT_21532B)return;
  window.__AI_SHOGI_CLOUD_NEW_SLOT_21532B=true;

  const CFG_KEY='aiShogiCloudConfigV1';
  const META2_KEY='aiShogiCloudMetaV2';
  const SAVE_KEY='aiShogiGameSaveV1';
  const LEGACY_KEY_RE=/^[A-Za-z0-9_-]{24,128}$/;

  const readJson=(k,fallback=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch(e){return fallback}};
  const writeJson=(k,v)=>{localStorage.setItem(k,JSON.stringify(v));return v};
  const normalizeName=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const validName=value=>{const s=normalizeName(value),len=[...s].length;return !!s&&len<=40&&!/[\u0000-\u001F\u007F]/.test(s)};
  const validSave=x=>!!(x&&x.version===1&&x.st&&Array.isArray(x.st.b)&&x.st.b.length===81&&x.st.h&&Array.isArray(x.st.log));
  const randomSlotId=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return 'slot_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
  const setStatus=text=>{const s=document.getElementById('status');if(s)s.textContent=text;const f=document.getElementById('fstatus');if(f)f.textContent=text};
  const familyConfigured=()=>{const c=readJson(CFG_KEY,{})||{};return !!(c.enabled&&LEGACY_KEY_RE.test(String(c.syncKey||''))&&c.deviceId)};

  async function createNewSlot(){
    const api=window.AI_SHOGI_CLOUD_SAVE;
    if(!api){setStatus('クラウド保存の準備がまだできていません。少し待ってからもう一度押してください。');return false}

    if(!familyConfigured()){
      const code=prompt('家族コードを入力してください。','');
      if(code===null)return false;
      if(!await api.enableWithCode(code))return false;
    }

    const current=readJson(SAVE_KEY,null);
    if(!validSave(current)){
      setStatus('先に「この端末に保存」で対局を保存してから、新しいクラウド保存を作ってください。');
      return false;
    }

    let audit=null;
    try{audit=api.audit()}catch(e){}
    if(audit?.meta?.pending||audit?.meta?.lastError==='conflict'||audit?.meta?.lastError==='local_pending'){
      setStatus('現在の保存に未同期の変更があります。先にクラウド同期を完了してから新しい保存を作ってください。');
      return false;
    }

    let count=0;
    try{const listed=await api.listSlots();if(listed?.ok)count=listed.slots.length}catch(e){}
    const answer=prompt('新しい保存の名前を入力してください。\n例：パパ / みっちゃん / 第2局',`保存${count+1}`);
    if(answer===null)return false;
    const slotName=normalizeName(answer);
    if(!validName(slotName)){setStatus('保存名は1〜40文字で入力してください。');return false}

    const slotId=randomSlotId();
    const cfg=readJson(CFG_KEY,{})||{};
    writeJson(CFG_KEY,{...cfg,activeSlotId:slotId,activeSlotName:slotName,multislotReady:true});
    const store=readJson(META2_KEY,{slots:{}})||{slots:{}};
    store.slots={...(store.slots||{}),[slotId]:{revision:0,lastSyncedSavedAt:0,pending:true,lastError:'',updatedAt:Date.now()}};
    writeJson(META2_KEY,store);

    if(!navigator.onLine){
      const b=document.getElementById('cloudSaveBtn');if(b)b.textContent='同期待ち';
      setStatus('「'+slotName+'」を新しい保存として作りました。オンラインになると自動でクラウドへ同期します。');
      return true;
    }

    const pushed=await api.push();
    if(pushed?.ok){setStatus('「'+slotName+'」を新しいクラウド保存として追加しました。');return true}
    setStatus('「'+slotName+'」を新しい保存として作りましたが、クラウド送信は待機中です。端末内の対局は残っています。');
    return false;
  }

  function installButton(){
    const actions=document.getElementById('cloudSaveActions')||document.querySelector('.controls');
    if(!actions||document.getElementById('cloudNewSlotBtn'))return false;
    const b=document.createElement('button');
    b.className='btn';b.id='cloudNewSlotBtn';b.type='button';b.textContent='新しい保存を作る';
    b.title='現在の対局を別の名前のクラウド保存として追加します';
    b.onclick=createNewSlot;
    actions.appendChild(b);
    return true;
  }

  if(window.AI_SHOGI_CLOUD_SAVE)window.AI_SHOGI_CLOUD_SAVE.createNewSlot=createNewSlot;
  let tries=0;const timer=setInterval(()=>{
    if(window.AI_SHOGI_CLOUD_SAVE&&!window.AI_SHOGI_CLOUD_SAVE.createNewSlot)window.AI_SHOGI_CLOUD_SAVE.createNewSlot=createNewSlot;
    if(installButton()||++tries>=30)clearInterval(timer);
  },100);
  setTimeout(installButton,0);
})();
