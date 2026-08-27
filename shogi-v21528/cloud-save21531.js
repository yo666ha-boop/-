/* AI将棋先生 v2.15.28 - 端末間クラウド保存 v1 */
(function installCloudSave21531(){
  if(window.AI_SHOGI_CLOUD_SAVE)return;
  const CFG_KEY='aiShogiCloudConfigV1';
  const META_KEY='aiShogiCloudMetaV1';
  const SAVE_KEY='aiShogiGameSaveV1';
  const LEGACY_API='https://ai-shogi-yaneuraou-iphone.vercel.app/api/shogi-save';
  const DEFAULT_API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
  const LEGACY_KEY_RE=/^[A-Za-z0-9_-]{24,128}$/;
  const FAMILY_SALT='AI_SHOGI_FAMILY_CODE_V1';
  let timer=0,syncing=false;

  const readJson=(k,fallback=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch(e){return fallback}};
  const writeJson=(k,v)=>{localStorage.setItem(k,JSON.stringify(v));return v};
  const emptyMeta=()=>({revision:0,lastSyncedSavedAt:0,pending:false,lastError:'',updatedAt:Date.now()});
  const normalizeApi=api=>!api||api===LEGACY_API?DEFAULT_API:api;
  const cfg=()=>{const c=readJson(CFG_KEY,{syncKey:'',familyCode:'',codeMode:'',deviceId:'',api:DEFAULT_API,enabled:false});return {...c,familyCode:String(c.familyCode||''),codeMode:String(c.codeMode||''),api:normalizeApi(c.api)}};
  const meta=()=>readJson(META_KEY,emptyMeta());
  const saveMeta=p=>writeJson(META_KEY,{...meta(),...p,updatedAt:Date.now()});
  const currentSave=()=>readJson(SAVE_KEY,null);
  const validSave=x=>!!(x&&x.version===1&&x.st&&Array.isArray(x.st.b)&&x.st.b.length===81&&x.st.h&&Array.isArray(x.st.log));
  const randomDevice=()=>{
    const b=new Uint8Array(12);crypto.getRandomValues(b);
    return 'dev_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
  };
  const randomFamilyCode=()=>{
    const n=new Uint16Array(1);crypto.getRandomValues(n);
    return 'かぞく'+String(n[0]%10000).padStart(4,'0');
  };
  const normalizeFamilyCode=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const validFamilyCode=value=>{
    const s=normalizeFamilyCode(value),len=[...s].length;
    return !!s&&len<=32&&!/[\u0000-\u001F\u007F]/.test(s);
  };
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
    const syncKey=await deriveFamilySyncKey(normalized);
    return {ok:true,syncKey,familyCode:normalized,codeMode:'family'};
  }
  function ensureDevice(){const c=cfg();if(c.deviceId)return c;return writeJson(CFG_KEY,{...c,deviceId:randomDevice()})}
  function configured(){const c=cfg();return !!(c.enabled&&LEGACY_KEY_RE.test(c.syncKey)&&c.deviceId)}
  function displayCode(){const c=cfg();return c.familyCode||c.syncKey||''}
  function apiHeaders(c){return {'Authorization':'Bearer '+c.syncKey,'Content-Type':'application/json'};}
  function setStatus(text){const s=document.getElementById('status');if(s)s.textContent=text;const f=document.getElementById('fstatus');if(f)f.textContent=text;}
  function cloudButtonText(){const b=document.getElementById('cloudSaveBtn');if(!b)return;const c=cfg(),m=meta();b.textContent=!c.enabled?'クラウド同期':m.lastError?'同期エラー':m.pending?'同期待ち':'クラウド同期 ✓';b.title=c.enabled?((c.familyCode?'家族コード設定済み / ':'')+'revision '+m.revision+(m.pending?' / 未同期あり':'')):'家族コードを設定すると別端末で続きを再開できます';const q=document.getElementById('cloudCodeBtn');if(q){q.disabled=!configured();q.textContent='家族コードをコピー';}}

  async function request(method,body){
    const c=ensureDevice();
    const r=await fetch(normalizeApi(c.api),{method,headers:apiHeaders(c),cache:'no-store',body:body?JSON.stringify(body):undefined});
    const j=await r.json().catch(()=>({ok:false,error:'invalid_response'}));
    return {r,j};
  }

  async function pull(opts={}){
    if(!configured()||!navigator.onLine)return {ok:false,skipped:true};
    const local=currentSave(),m=meta();
    try{
      const {r,j}=await request('GET');
      if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));
      const rec=j.record;
      if(!rec){saveMeta({lastError:''});cloudButtonText();return {ok:true,empty:true};}
      if(!validSave(rec.payload))throw new Error('invalid_cloud_payload');
      if(opts.inspectOnly)return {ok:true,record:rec,inspected:true};
      if(m.pending&&!opts.discardLocal){
        saveMeta({lastError:'local_pending'});cloudButtonText();
        return {ok:false,conflict:true,localPending:true,record:rec};
      }
      const remoteNewer=rec.revision>m.revision || Number(rec.payload.savedAt||0)>Number(local?.savedAt||0);
      if(remoteNewer||opts.force){
        localStorage.setItem(SAVE_KEY,JSON.stringify(rec.payload));
        saveMeta({revision:rec.revision,lastSyncedSavedAt:Number(rec.payload.savedAt||0),pending:false,lastError:''});
        if(opts.restore&&window.AI_SHOGI_SAVE?.load)window.AI_SHOGI_SAVE.load();
      }else saveMeta({revision:Math.max(m.revision,rec.revision),lastError:''});
      cloudButtonText();
      return {ok:true,record:rec,restored:remoteNewer||opts.force};
    }catch(e){saveMeta({lastError:String(e.message||e)});cloudButtonText();return {ok:false,error:String(e.message||e)}}
  }

  async function pushCloud(opts={}){
    if(syncing||!configured()||!navigator.onLine)return {ok:false,skipped:true};
    const payload=currentSave();if(!validSave(payload))return {ok:false,skipped:true};
    syncing=true;
    try{
      const c=ensureDevice(),m=meta();
      const {r,j}=await request('PUT',{baseRevision:m.revision,deviceId:c.deviceId,payload});
      if(r.status===409&&j.error==='revision_conflict'){
        saveMeta({pending:true,lastError:'conflict'});cloudButtonText();
        return {ok:false,conflict:true,record:j.record||null};
      }
      if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));
      saveMeta({revision:j.record.revision,lastSyncedSavedAt:Number(payload.savedAt||0),pending:false,lastError:''});
      cloudButtonText();
      if(opts.flash)setStatus('クラウドにも保存しました。同じ家族コードを別端末に入れると再開できます。');
      return {ok:true,record:j.record};
    }catch(e){saveMeta({pending:true,lastError:String(e.message||e)});cloudButtonText();return {ok:false,error:String(e.message||e)}}
    finally{syncing=false}
  }

  function queuePush(){
    if(!configured())return;
    saveMeta({pending:true});cloudButtonText();
    clearTimeout(timer);timer=setTimeout(()=>pushCloud(),550);
  }

  async function enableWithCode(code){
    let resolved;
    try{resolved=await resolveUserCode(code)}catch(e){setStatus('家族コードを設定できませんでした。この端末の保存はそのまま残っています。');return false;}
    if(!resolved.ok){setStatus('家族コードを入力してください。ひらがな・カタカナ・漢字・英数字など1〜32文字で使えます。');return false;}
    const c=ensureDevice(),changed=c.syncKey!==resolved.syncKey;
    writeJson(CFG_KEY,{...c,syncKey:resolved.syncKey,familyCode:resolved.familyCode,codeMode:resolved.codeMode,enabled:true,api:normalizeApi(c.api)});
    if(changed)writeJson(META_KEY,emptyMeta());else saveMeta({lastError:''});
    cloudButtonText();

    const local=currentSave();
    if(validSave(local)){
      const checked=await pull({inspectOnly:true});
      if(checked.ok&&checked.record){
        setStatus('家族コードを設定しました。クラウド側にも対局があります。「別端末から再開」で選んで復元できます。');
      }else if(checked.ok&&checked.empty){
        queuePush();setStatus('家族コードを設定しました。端末内の対局をクラウドへ同期します。');
      }else{
        queuePush();setStatus('家族コードを設定しました。端末内保存を保持し、接続復旧後に同期します。');
      }
      return true;
    }

    const pulled=await pull({force:true,restore:true});
    if(pulled.ok&&pulled.record)setStatus('家族コードを設定し、保存済み対局をこの端末へ復元しました。');
    else if(pulled.ok&&pulled.empty)setStatus('家族コードを設定しました。クラウドに保存済み対局はまだありません。');
    else setStatus('家族コードを設定しました。接続復旧後に同期します。');
    return true;
  }

  async function setup(){
    let c=ensureDevice();
    if(c.enabled&&c.syncKey){
      const current=displayCode();
      const answer=prompt('家族コードです。\nひらがな・カタカナ・漢字・英数字など短い言葉で使えます。\n家族の別端末でも同じ文字を入力してください。\n\n変更しない場合はそのままOK。',current);
      if(answer===null)return;
      await enableWithCode(answer);
      return;
    }
    const answer=prompt('家族で使うクラウド保存を有効にします。\n好きな家族コードを決めてください。\n例：みかみ / ぱぱ / test\n\n家族の別端末でも同じ文字を入力すると同じ対局を再開できます。',randomFamilyCode());
    if(answer===null)return;
    await enableWithCode(answer);
  }

  async function copySyncCode(){
    if(!configured()){await setup();if(!configured())return false;}
    const code=displayCode();
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(code);
      setStatus('家族コードをコピーしました。別端末で「クラウド同期」に貼り付けてください。');
      return true;
    }catch(e){
      prompt('この家族コードをコピーして、別端末の「クラウド同期」に入力してください。',code);
      setStatus('家族コードを表示しました。長押しまたは選択してコピーできます。');
      return false;
    }
  }

  function installUI(){
    ensureDevice();
    const controls=document.querySelector('.controls');
    if(controls&&!document.getElementById('cloudSaveBtn')){
      const b=document.createElement('button');b.className='btn';b.id='cloudSaveBtn';b.type='button';b.textContent='クラウド同期';b.onclick=setup;controls.appendChild(b);
      const q=document.createElement('button');q.className='btn';q.id='cloudCodeBtn';q.type='button';q.textContent='家族コードをコピー';q.onclick=copySyncCode;controls.appendChild(q);
      const p=document.createElement('button');p.className='btn';p.id='cloudPullBtn';p.type='button';p.textContent='別端末から再開';p.onclick=async()=>{
        if(!configured()){await setup();if(!configured())return;}
        let r=await pull({force:true,restore:true});
        if(r.localPending){
          const discard=confirm('この端末にまだクラウドへ送れていない変更があります。\n\n端末内の未同期変更を破棄して、クラウド側の対局で置き換えますか？');
          if(discard)r=await pull({force:true,restore:true,discardLocal:true});
        }
        if(r.ok&&r.record)setStatus('クラウドの対局をこの端末へ復元しました。');
        else if(r.ok&&r.empty)setStatus('クラウドに保存された対局はまだありません。');
        else if(r.conflict)setStatus('この端末に未同期の変更があります。自動上書きを止めました。');
        else setStatus('クラウドから取得できませんでした。端末内保存は保持されています。');
      };controls.appendChild(p);
    }
    cloudButtonText();
  }

  window.addEventListener('ai-shogi-local-save',queuePush);
  window.addEventListener('online',async()=>{if(!configured())return;const m=meta();if(m.pending)await pushCloud();else await pull({restore:false})});
  setTimeout(async()=>{installUI();if(configured()&&navigator.onLine){const m=meta();if(m.pending)await pushCloud();else await pull({restore:false})}},0);

  window.AI_SHOGI_CLOUD_SAVE={
    version:'21531f',setup,enableWithCode,copySyncCode,push:()=>pushCloud({flash:true}),pull:()=>pull({force:true,restore:true}),
    config:()=>{const c=cfg();return {...c,syncKey:c.syncKey?'***'+c.syncKey.slice(-6):'',familyCode:c.familyCode||'',codeMode:c.familyCode?'family':(c.syncKey?'legacy':'')}} ,meta,
    disable:()=>{const c=cfg();writeJson(CFG_KEY,{...c,enabled:false});cloudButtonText()},
    audit:()=>{const c=cfg();return {ok:true,configured:configured(),online:navigator.onLine,backend:'supabase-edge-cas-v1',codeMode:c.familyCode?'family':(c.syncKey?'legacy':''),familyCodeLength:[...(c.familyCode||'')].length,meta:meta(),hasLocal:validSave(currentSave()),buttons:{cloud:!!document.getElementById('cloudSaveBtn'),codeCopy:!!document.getElementById('cloudCodeBtn'),pull:!!document.getElementById('cloudPullBtn')}}}
  };
})();