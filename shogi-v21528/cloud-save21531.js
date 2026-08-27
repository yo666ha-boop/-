/* AI将棋先生 v2.15.28 - 端末間クラウド保存 v2 / 複数保存スロット */
(function installCloudSave21532(){
  if(window.AI_SHOGI_CLOUD_SAVE?.version==='21532a')return;
  const CFG_KEY='aiShogiCloudConfigV1';
  const META_KEY='aiShogiCloudMetaV1';
  const META2_KEY='aiShogiCloudMetaV2';
  const SAVE_KEY='aiShogiGameSaveV1';
  const LEGACY_API='https://ai-shogi-yaneuraou-iphone.vercel.app/api/shogi-save';
  const DEFAULT_API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
  const LEGACY_KEY_RE=/^[A-Za-z0-9_-]{24,128}$/;
  const SLOT_ID_RE=/^[A-Za-z0-9_-]{1,80}$/;
  const FAMILY_SALT='AI_SHOGI_FAMILY_CODE_V1';
  const LEGACY_SLOT_ID='default';
  const LEGACY_SLOT_NAME='これまでの保存';
  let timer=0,syncing=false;

  const readJson=(k,fallback=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch(e){return fallback}};
  const writeJson=(k,v)=>{localStorage.setItem(k,JSON.stringify(v));return v};
  const emptyMeta=()=>({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()});
  const normalizeApi=api=>!api||api===LEGACY_API?DEFAULT_API:api;
  const normalizeFamilyCode=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const normalizeSlotName=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const validFamilyCode=value=>{const s=normalizeFamilyCode(value),len=[...s].length;return !!s&&len<=32&&!/[\u0000-\u001F\u007F]/.test(s)};
  const validSlotName=value=>{const s=normalizeSlotName(value),len=[...s].length;return !!s&&len<=40&&!/[\u0000-\u001F\u007F]/.test(s)};
  const cfg=()=>{const c=readJson(CFG_KEY,{syncKey:'',familyCode:'',codeMode:'',deviceId:'',api:DEFAULT_API,enabled:false,activeSlotId:'',activeSlotName:'',multislotReady:false});return {...c,familyCode:String(c.familyCode||''),codeMode:String(c.codeMode||''),activeSlotId:String(c.activeSlotId||''),activeSlotName:String(c.activeSlotName||''),multislotReady:!!c.multislotReady,api:normalizeApi(c.api)}};
  const saveCfg=p=>writeJson(CFG_KEY,{...cfg(),...p});
  const metaStore=()=>readJson(META2_KEY,{slots:{}});
  const meta=(slotId=cfg().activeSlotId)=>{
    if(!slotId)return emptyMeta();
    const v=metaStore().slots?.[slotId];
    if(v)return {...emptyMeta(),...v};
    if(slotId===LEGACY_SLOT_ID){const old=readJson(META_KEY,null);if(old)return {...emptyMeta(),...old};}
    return emptyMeta();
  };
  const saveMeta=(patch,slotId=cfg().activeSlotId)=>{
    if(!slotId)return emptyMeta();
    const store=metaStore(),next={...meta(slotId),...patch,updatedAt:Date.now()};
    store.slots={...(store.slots||{}),[slotId]:next};writeJson(META2_KEY,store);return next;
  };
  const currentSave=()=>readJson(SAVE_KEY,null);
  const validSave=x=>!!(x&&x.version===1&&x.st&&Array.isArray(x.st.b)&&x.st.b.length===81&&x.st.h&&Array.isArray(x.st.log));

  const randomDevice=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return 'dev_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
  const randomSlotId=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return 'slot_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
  const randomFamilyCode=()=>{const n=new Uint16Array(1);crypto.getRandomValues(n);return 'かぞく'+String(n[0]%10000).padStart(4,'0')};
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');

  async function deriveFamilySyncKey(code){
    const subtle=crypto?.subtle;if(!subtle)throw new Error('family_code_crypto_unavailable');
    const enc=new TextEncoder();
    const material=await subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveBits']);
    const bits=await subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(FAMILY_SALT),iterations:120000},material,256);
    return base64url(new Uint8Array(bits));
  }
  async function resolveUserCode(raw){
    const normalized=normalizeFamilyCode(raw);
    if(LEGACY_KEY_RE.test(normalized))return {ok:true,syncKey:normalized,familyCode:'',codeMode:'legacy'};
    if(!validFamilyCode(normalized))return {ok:false,error:'invalid_family_code'};
    return {ok:true,syncKey:await deriveFamilySyncKey(normalized),familyCode:normalized,codeMode:'family'};
  }
  function ensureDevice(){const c=cfg();if(c.deviceId)return c;return saveCfg({deviceId:randomDevice()})}
  function familyConfigured(){const c=cfg();return !!(c.enabled&&LEGACY_KEY_RE.test(c.syncKey)&&c.deviceId)}
  function configured(){const c=cfg();return !!(familyConfigured()&&SLOT_ID_RE.test(c.activeSlotId)&&validSlotName(c.activeSlotName))}
  function displayCode(){const c=cfg();return c.familyCode||c.syncKey||''}
  function apiHeaders(c){return {'Authorization':'Bearer '+c.syncKey,'Content-Type':'application/json'}}
  function setStatus(text){const s=document.getElementById('status');if(s)s.textContent=text;const f=document.getElementById('fstatus');if(f)f.textContent=text}
  function cloudButtonText(){
    const b=document.getElementById('cloudSaveBtn');if(!b)return;
    const c=cfg(),m=meta();
    b.textContent=!c.enabled?'クラウド同期':!c.activeSlotId?'保存名を設定':m.lastError?'同期エラー':m.pending?'同期待ち':'クラウド同期 ✓';
    const slot=c.activeSlotName?('保存名: '+c.activeSlotName+' / '):'';
    b.title=c.enabled?(slot+'revision '+m.revision+(m.pending?' / 未同期あり':'')):'家族コードと保存名を設定すると別端末で続きを再開できます';
    const q=document.getElementById('cloudCodeBtn');if(q){q.disabled=!familyConfigured();q.textContent='家族コードをコピー'};
  }

  async function request(method,body,urlSuffix=''){
    const c=ensureDevice();
    const r=await fetch(normalizeApi(c.api)+urlSuffix,{method,headers:apiHeaders(c),cache:'no-store',body:body?JSON.stringify(body):undefined});
    const j=await r.json().catch(()=>({ok:false,error:'invalid_response'}));return {r,j};
  }
  async function listSlots(){
    if(!familyConfigured()||!navigator.onLine)return {ok:false,skipped:true,slots:[]};
    try{const {r,j}=await request('GET',null,'?mode=list');if(!r.ok||!j.ok||!Array.isArray(j.slots))throw new Error(j.error||('HTTP '+r.status));return {ok:true,slots:j.slots}}
    catch(e){return {ok:false,error:String(e.message||e),slots:[]}}
  }
  async function getSlot(slotId){
    if(!familyConfigured()||!navigator.onLine||!SLOT_ID_RE.test(slotId))return {ok:false,skipped:true};
    try{const {r,j}=await request('GET',null,'?slot='+encodeURIComponent(slotId));if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));return {ok:true,record:j.record||null}}
    catch(e){return {ok:false,error:String(e.message||e)}}
  }
  function setActiveSlot(slotId,slotName,revision=null,savedAt=null){
    const name=normalizeSlotName(slotName);if(!SLOT_ID_RE.test(slotId)||!validSlotName(name))return false;
    saveCfg({activeSlotId:slotId,activeSlotName:name});
    if(revision!==null)saveMeta({revision:Number(revision)||0,lastSyncedSavedAt:Number(savedAt)||0,pending:false,lastError:''},slotId);
    cloudButtonText();return true;
  }
  function ensureLegacyActiveSlot(){
    const c=ensureDevice();if(!familyConfigured()||c.activeSlotId||c.multislotReady)return c;
    saveCfg({multislotReady:true});
    const old=readJson(META_KEY,null);
    if(old||validSave(currentSave())){setActiveSlot(LEGACY_SLOT_ID,LEGACY_SLOT_NAME,Number(old?.revision||0),Number(old?.lastSyncedSavedAt||0));return cfg();}
    return cfg();
  }

  async function pull(opts={}){
    ensureLegacyActiveSlot();if(!configured()||!navigator.onLine)return {ok:false,skipped:true};
    const c=cfg(),local=currentSave(),m=meta(c.activeSlotId);
    try{
      const got=await getSlot(c.activeSlotId);if(!got.ok)throw new Error(got.error||'cloud_unavailable');
      const rec=got.record;
      if(!rec){saveMeta({lastError:''},c.activeSlotId);cloudButtonText();return {ok:true,empty:true}}
      if(!validSave(rec.payload))throw new Error('invalid_cloud_payload');
      if(opts.inspectOnly)return {ok:true,record:rec,inspected:true};
      if(m.pending&&!opts.discardLocal){saveMeta({lastError:'local_pending'},c.activeSlotId);cloudButtonText();return {ok:false,conflict:true,localPending:true,record:rec}}
      const remoteNewer=Number(rec.revision)>Number(m.revision)||Number(rec.payload.savedAt||0)>Number(local?.savedAt||0);
      if(remoteNewer||opts.force){
        localStorage.setItem(SAVE_KEY,JSON.stringify(rec.payload));
        setActiveSlot(rec.slotId||c.activeSlotId,rec.slotName||c.activeSlotName,rec.revision,rec.payload.savedAt);
        if(opts.restore&&window.AI_SHOGI_SAVE?.load)window.AI_SHOGI_SAVE.load();
      }else saveMeta({revision:Math.max(Number(m.revision)||0,Number(rec.revision)||0),lastError:''},c.activeSlotId);
      cloudButtonText();return {ok:true,record:rec,restored:remoteNewer||opts.force};
    }catch(e){saveMeta({lastError:String(e.message||e)},c.activeSlotId);cloudButtonText();return {ok:false,error:String(e.message||e)}}
  }

  async function pushCloud(opts={}){
    ensureLegacyActiveSlot();if(syncing||!configured()||!navigator.onLine)return {ok:false,skipped:true};
    const payload=currentSave();if(!validSave(payload))return {ok:false,skipped:true};
    syncing=true;
    try{
      const c=ensureDevice(),m=meta(c.activeSlotId);
      const {r,j}=await request('PUT',{slotId:c.activeSlotId,slotName:c.activeSlotName,baseRevision:Number(m.revision)||0,deviceId:c.deviceId,payload});
      if(r.status===409&&j.error==='revision_conflict'){saveMeta({pending:true,lastError:'conflict'},c.activeSlotId);cloudButtonText();return {ok:false,conflict:true,record:j.record||null}}
      if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));
      setActiveSlot(j.record.slotId||c.activeSlotId,j.record.slotName||c.activeSlotName,j.record.revision,payload.savedAt);
      if(opts.flash)setStatus('「'+cfg().activeSlotName+'」をクラウドにも保存しました。');
      return {ok:true,record:j.record};
    }catch(e){const c=cfg();saveMeta({pending:true,lastError:String(e.message||e)},c.activeSlotId);cloudButtonText();return {ok:false,error:String(e.message||e)}}
    finally{syncing=false}
  }
  function queuePush(){ensureLegacyActiveSlot();if(!configured())return;const c=cfg();saveMeta({pending:true},c.activeSlotId);cloudButtonText();clearTimeout(timer);timer=setTimeout(()=>pushCloud(),550)}

  async function configureFamily(code){
    let resolved;try{resolved=await resolveUserCode(code)}catch(e){setStatus('家族コードを設定できませんでした。この端末の保存はそのまま残っています。');return false}
    if(!resolved.ok){setStatus('家族コードを入力してください。1〜32文字で使えます。');return false}
    const c=ensureDevice(),changed=c.syncKey!==resolved.syncKey;
    saveCfg({...c,syncKey:resolved.syncKey,familyCode:resolved.familyCode,codeMode:resolved.codeMode,enabled:true,api:normalizeApi(c.api),...(changed?{activeSlotId:'',activeSlotName:'',multislotReady:true}:{})});
    if(changed)writeJson(META2_KEY,{slots:{}});
    cloudButtonText();return true;
  }
  async function enableWithCode(code,opts={}){
    if(!await configureFamily(code))return false;
    if(opts.slotId&&opts.slotName)setActiveSlot(String(opts.slotId),String(opts.slotName),Number(opts.revision||0),Number(opts.savedAt||0));
    return true;
  }
  async function ensureLocalSlot(preferredName=''){
    ensureLegacyActiveSlot();if(configured())return true;
    const answer=prompt('この端末の対局を保存する名前を決めてください。\n家族5人なら「パパ」「みっちゃん」のように分けられます。',preferredName||'保存1');
    if(answer===null)return false;
    const name=normalizeSlotName(answer);if(!validSlotName(name)){setStatus('保存名は1〜40文字で入力してください。');return false}
    setActiveSlot(randomSlotId(),name,0,0);queuePush();return true;
  }

  async function setup(){
    const c=ensureDevice(),current=displayCode();
    const answer=prompt(c.enabled?'家族コードです。変更しない場合はそのままOK。':'家族で使う家族コードを決めてください。\n別端末でも同じ文字を入力します。',current||randomFamilyCode());
    if(answer===null)return;
    if(!await configureFamily(answer))return;
    ensureLegacyActiveSlot();
    if(validSave(currentSave())){
      if(configured()){
        const rename=prompt('この端末が自動保存する保存名です。\n例：パパ / みっちゃん / まま',cfg().activeSlotName);
        if(rename!==null){const name=normalizeSlotName(rename);if(validSlotName(name)){saveCfg({activeSlotName:name});queuePush();setStatus('保存名を「'+name+'」に設定しました。')}else setStatus('保存名は1〜40文字で入力してください。')}
      }else if(await ensureLocalSlot())setStatus('家族コードと保存名を設定しました。端末内の対局をクラウドへ同期します。');
    }else setStatus('家族コードを設定しました。「別端末から再開」で保存一覧から選べます。');
    cloudButtonText();
  }

  async function copySyncCode(){
    if(!familyConfigured()){const answer=prompt('家族コードを入力してください。',randomFamilyCode());if(answer===null||!await configureFamily(answer))return false}
    const code=displayCode();
    try{if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');await navigator.clipboard.writeText(code);setStatus('家族コードをコピーしました。別端末で入力してください。');return true}
    catch(e){prompt('この家族コードをコピーして、別端末に入力してください。',code);setStatus('家族コードを表示しました。');return false}
  }
  function slotLine(slot,index){
    const when=Number(slot.savedAt||slot.updatedAt||0);let d='';try{if(when)d=new Date(when).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){}
    const ply=Number(slot.ply)||0;return `${index+1}. ${slot.slotName||'名称なし'}${ply?' / '+ply+'手':''}${d?' / '+d:''}`;
  }
  async function chooseRestoreSlot(){
    const listed=await listSlots();
    if(!listed.ok){setStatus('クラウドの保存一覧を取得できませんでした。');return null}
    if(!listed.slots.length){setStatus('この家族コードには保存された対局がまだありません。');return null}
    const text='再開する保存を選んでください。\n\n'+listed.slots.map(slotLine).join('\n')+'\n\n番号を入力してください。';
    const answer=prompt(text,'');if(answer===null)return null;
    const n=Number(String(answer).trim());if(!Number.isInteger(n)||n<1||n>listed.slots.length){setStatus('一覧の番号を入力してください。');return null}
    return listed.slots[n-1];
  }
  async function restoreFlow(){
    if(!familyConfigured()){
      const answer=prompt('別端末で使っている家族コードを入力してください。','');if(answer===null)return;
      if(!await configureFamily(answer))return;
    }
    const slot=await chooseRestoreSlot();if(!slot)return;
    const c=cfg(),m=meta(c.activeSlotId);
    if(validSave(currentSave())&&c.activeSlotId&&m.pending){
      const discard=confirm('この端末の「'+(c.activeSlotName||'現在の保存')+'」に未同期の変更があります。\n\n未同期変更を破棄して「'+slot.slotName+'」を再開しますか？');
      if(!discard)return;
    }
    const got=await getSlot(slot.slotId);
    if(!got.ok||!got.record||!validSave(got.record.payload)){setStatus('選んだ保存を取得できませんでした。端末内保存は保持されています。');return}
    localStorage.setItem(SAVE_KEY,JSON.stringify(got.record.payload));
    setActiveSlot(got.record.slotId,got.record.slotName,got.record.revision,got.record.payload.savedAt);
    if(window.AI_SHOGI_SAVE?.load)window.AI_SHOGI_SAVE.load();
    setStatus('「'+got.record.slotName+'」をこの端末へ復元しました。');
  }

  function installUI(){
    ensureDevice();ensureLegacyActiveSlot();
    const controls=document.querySelector('.controls');
    if(controls&&!document.getElementById('cloudSaveBtn')){
      const b=document.createElement('button');b.className='btn';b.id='cloudSaveBtn';b.type='button';b.textContent='クラウド同期';b.onclick=setup;controls.appendChild(b);
      const q=document.createElement('button');q.className='btn';q.id='cloudCodeBtn';q.type='button';q.textContent='家族コードをコピー';q.onclick=copySyncCode;controls.appendChild(q);
      const p=document.createElement('button');p.className='btn';p.id='cloudPullBtn';p.type='button';p.textContent='別端末から再開';p.onclick=restoreFlow;controls.appendChild(p);
    }
    cloudButtonText();
  }

  window.addEventListener('ai-shogi-local-save',queuePush);
  window.addEventListener('online',async()=>{ensureLegacyActiveSlot();if(!configured())return;const c=cfg(),m=meta(c.activeSlotId);if(m.pending)await pushCloud();else await pull({restore:false})});
  setTimeout(async()=>{installUI();if(configured()&&navigator.onLine){const c=cfg(),m=meta(c.activeSlotId);if(m.pending)await pushCloud();else await pull({restore:false})}},0);

  window.AI_SHOGI_CLOUD_SAVE={
    version:'21532a',setup,enableWithCode,copySyncCode,listSlots,chooseRestoreSlot,restoreFlow,push:()=>pushCloud({flash:true}),pull:()=>pull({force:true,restore:true}),
    config:()=>{const c=cfg();return {...c,syncKey:c.syncKey?'***'+c.syncKey.slice(-6):'',familyCode:c.familyCode||'',codeMode:c.familyCode?'family':(c.syncKey?'legacy':'')}} ,
    meta:()=>meta(),
    disable:()=>{saveCfg({enabled:false});cloudButtonText()},
    audit:()=>{const c=cfg();return {ok:true,familyConfigured:familyConfigured(),configured:configured(),online:navigator.onLine,backend:'supabase-edge-cas-multislot-v2',codeMode:c.familyCode?'family':(c.syncKey?'legacy':''),familyCodeLength:[...(c.familyCode||'')].length,activeSlotId:c.activeSlotId||'',activeSlotName:c.activeSlotName||'',meta:meta(c.activeSlotId),hasLocal:validSave(currentSave()),buttons:{cloud:!!document.getElementById('cloudSaveBtn'),codeCopy:!!document.getElementById('cloudCodeBtn'),pull:!!document.getElementById('cloudPullBtn')}}}
  };
})();
