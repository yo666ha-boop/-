/* AI将棋先生 v2.15.28 - family code switcher */
(function installFamilySwitcher21533(){
  if(window.__AI_SHOGI_FAMILY_SWITCHER_21533A)return;
  window.__AI_SHOGI_FAMILY_SWITCHER_21533A=true;

  const HISTORY_KEY='aiShogiFamilyCodeHistoryV1';
  const FAMILY_SALT='AI_SHOGI_FAMILY_CODE_V1';
  const DEFAULT_API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
  const LEGACY_KEY_RE=/^[A-Za-z0-9_-]{24,128}$/;
  const SLOT_ID_RE=/^[A-Za-z0-9_-]{1,80}$/;
  const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const validFamily=value=>{const s=normalize(value),len=[...s].length;return !!s&&len<=32&&!/[\u0000-\u001F\u007F]/.test(s)};
  const validSlotName=value=>{const s=normalize(value),len=[...s].length;return !!s&&len<=40&&!/[\u0000-\u001F\u007F]/.test(s)};
  const setStatus=text=>{const s=document.getElementById('status');if(s)s.textContent=text;const f=document.getElementById('fstatus');if(f)f.textContent=text};
  const cloud=()=>window.AI_SHOGI_CLOUD_SAVE;
  const cfg=()=>cloud()?.config?.()||{};
  const audit=()=>cloud()?.audit?.()||{};
  const removeDialog=()=>document.getElementById('aiShogiFamilySwitcherDialog')?.remove();
  const fmtWhen=value=>{const n=Number(value||0);if(!n)return '';try{return new Date(n).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
  const slotLabel=slot=>{const parts=[String(slot.slotName||'名称なし')],ply=Number(slot.ply)||0,when=fmtWhen(slot.savedAt||slot.updatedAt);if(ply)parts.push(ply+'手');if(when)parts.push(when);return parts.join(' / ')};
  const randomSlotId=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return 'slot_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');

  function readHistory(){
    try{
      const raw=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      if(!Array.isArray(raw))return [];
      const seen=new Set(),out=[];
      raw.forEach(item=>{const code=normalize(typeof item==='string'?item:item?.code);if(!validFamily(code)||seen.has(code))return;seen.add(code);out.push({code,lastUsed:Number(item?.lastUsed||0)})});
      return out.sort((a,b)=>b.lastUsed-a.lastUsed).slice(0,8);
    }catch(e){return []}
  }
  function remember(code){
    const v=normalize(code);if(!validFamily(v))return;
    const next=[{code:v,lastUsed:Date.now()},...readHistory().filter(x=>x.code!==v)].slice(0,8);
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next))}catch(e){}
  }

  async function deriveFamilySyncKey(code){
    const subtle=crypto?.subtle;if(!subtle)throw new Error('family_code_crypto_unavailable');
    const enc=new TextEncoder();
    const material=await subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveBits']);
    const bits=await subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(FAMILY_SALT),iterations:120000},material,256);
    return base64url(new Uint8Array(bits));
  }
  async function resolveCode(raw){
    const code=normalize(raw);
    if(LEGACY_KEY_RE.test(code))return {ok:true,userCode:code,syncKey:code,isFamily:false};
    if(!validFamily(code))return {ok:false,error:'invalid_family_code'};
    return {ok:true,userCode:code,syncKey:await deriveFamilySyncKey(code),isFamily:true};
  }
  async function listSlotsForCode(raw){
    let resolved;try{resolved=await resolveCode(raw)}catch(e){return {ok:false,error:String(e.message||e),slots:[]}}
    if(!resolved.ok)return {ok:false,error:resolved.error,slots:[]};
    if(!navigator.onLine)return {ok:false,error:'offline',slots:[]};
    const api=String(cfg().api||DEFAULT_API);
    try{
      const r=await fetch(api+'?mode=list',{method:'GET',headers:{'Authorization':'Bearer '+resolved.syncKey,'Content-Type':'application/json'},cache:'no-store'});
      const j=await r.json().catch(()=>({ok:false,error:'invalid_response'}));
      if(!r.ok||!j.ok||!Array.isArray(j.slots))throw new Error(j.error||('HTTP '+r.status));
      return {ok:true,slots:j.slots,resolved};
    }catch(e){return {ok:false,error:String(e.message||e),slots:[],resolved}}
  }

  function makePanel(label){
    removeDialog();
    const shade=document.createElement('div');shade.id='aiShogiFamilySwitcherDialog';
    shade.style.cssText='position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    const panel=document.createElement('div');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',label);
    panel.style.cssText='width:min(520px,100%);max-height:min(82vh,720px);overflow:auto;background:#fff;color:#111;border-radius:16px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.32);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    shade.appendChild(panel);shade.onclick=e=>{if(e.target===shade)removeDialog()};document.body.appendChild(shade);return {shade,panel};
  }
  function addTitle(panel,title,sub=''){
    const h=document.createElement('div');h.textContent=title;h.style.cssText='font-size:20px;font-weight:800;margin:0 0 6px';panel.appendChild(h);
    if(sub){const d=document.createElement('div');d.textContent=sub;d.style.cssText='font-size:14px;line-height:1.5;margin:0 0 12px;color:#444';panel.appendChild(d)}
  }
  function addButton(panel,text,onClick,secondary=false){
    const b=document.createElement('button');b.type='button';b.textContent=text;
    b.style.cssText='display:block;width:100%;min-height:52px;margin:8px 0;padding:12px 14px;border:1px solid '+(secondary?'#aaa':'#999')+';border-radius:12px;background:'+(secondary?'#f5f5f5':'#fff')+';color:#111;font-size:17px;font-weight:700;text-align:left;line-height:1.35;touch-action:manipulation';
    b.onclick=onClick;panel.appendChild(b);return b;
  }
  function confirmLeaving(targetCode,targetSlotName=''){
    const c=cfg(),a=audit();
    const current=normalize(c.familyCode||'');
    const sameFamily=current&&current===normalize(targetCode);
    const sameSlot=!targetSlotName||String(a.activeSlotName||'')===String(targetSlotName||'');
    if(!a.meta?.pending||sameFamily&&sameSlot)return true;
    return confirm('現在の「'+(a.activeSlotName||'保存')+'」に未同期の変更があります。\n\n家族コードや保存先を切り替えると、その未同期変更は現在の保存先には送られません。切り替えますか？');
  }

  async function activateRemote(code,slot){
    const c=cloud();if(!c?.enableWithCode||!c?.pull)return;
    if(!confirmLeaving(code,slot.slotName))return;
    const enabled=await c.enableWithCode(code,{slotId:String(slot.slotId||''),slotName:String(slot.slotName||''),revision:Number(slot.revision||0),savedAt:Number(slot.savedAt||0)});
    if(!enabled){setStatus('家族コードまたは保存先を切り替えできませんでした。');return}
    if(validFamily(code))remember(code);
    const result=await c.pull();
    refreshButton();
    if(result?.ok)setStatus('家族コード「'+normalize(code)+'」の「'+String(slot.slotName||'保存')+'」へ切り替えて再開しました。');
    else setStatus('選んだ保存を取得できませんでした。端末内保存は保持されています。');
  }
  async function createNewSlot(code){
    const c=cloud();if(!c?.enableWithCode)return;
    if(!confirmLeaving(code,''))return;
    const answer=prompt('この家族コードで新しく使う保存名を入力してください。\n例：パパ / みっちゃん / まま','保存1');
    if(answer===null)return;
    const name=normalize(answer);if(!validSlotName(name)){setStatus('保存名は1〜40文字で入力してください。');return}
    const enabled=await c.enableWithCode(code,{slotId:randomSlotId(),slotName:name,revision:0,savedAt:0});
    if(!enabled){setStatus('新しい保存先を作れませんでした。');return}
    if(validFamily(code))remember(code);
    const pushed=await c.push?.();
    refreshButton();removeDialog();
    if(pushed?.ok)setStatus('家族コード「'+normalize(code)+'」の新しい保存「'+name+'」へ切り替えました。');
    else setStatus('保存先「'+name+'」へ切り替えました。対局を進めるとこの保存先へ自動保存されます。');
  }
  function showSlots(code,slots){
    const {panel}=makePanel('家族コードの保存を選ぶ');
    addTitle(panel,'「'+normalize(code)+'」の保存を選ぶ',slots.length?'保存名をタップすると、その保存へ切り替えて続きを再開します。':'この家族コードには、まだクラウド保存がありません。');
    slots.forEach(slot=>addButton(panel,slotLabel(slot),()=>{removeDialog();activateRemote(code,slot)}));
    addButton(panel,'この家族コードで新しい保存を作る',()=>createNewSlot(code));
    addButton(panel,'家族コード選択へ戻る',()=>openSwitcher(),true);
    addButton(panel,'キャンセル',removeDialog,true);
  }
  async function openCode(code){
    const v=normalize(code);if(!LEGACY_KEY_RE.test(v)&&!validFamily(v)){setStatus('家族コードは1〜32文字で入力してください。');return}
    setStatus('家族コード「'+v+'」の保存一覧を確認しています…');
    const listed=await listSlotsForCode(v);
    if(!listed.ok){setStatus(listed.error==='offline'?'オフラインのため保存一覧を取得できません。':'この家族コードの保存一覧を取得できませんでした。');return}
    showSlots(v,listed.slots||[]);
  }
  function openSwitcher(){
    const c=cfg(),current=normalize(c.familyCode||'');if(current)remember(current);
    const {panel}=makePanel('家族コードを切り替える');
    addTitle(panel,'家族コードを切り替える','別の家族コードにある保存へ切り替えられます。切り替え後は、その保存が以後の自動保存先になります。');
    const now=document.createElement('div');now.textContent='現在：'+(current||'未設定');now.style.cssText='font-size:16px;font-weight:800;margin:4px 0 12px;padding:10px 12px;background:#f4f4f4;border-radius:10px';panel.appendChild(now);
    const recent=readHistory().filter(x=>x.code!==current);
    if(recent.length){const lab=document.createElement('div');lab.textContent='最近使った家族コード';lab.style.cssText='font-size:14px;font-weight:800;margin:8px 0 4px';panel.appendChild(lab);recent.forEach(x=>addButton(panel,x.code,()=>openCode(x.code)))}
    const lab=document.createElement('label');lab.textContent='別の家族コード';lab.style.cssText='display:block;font-size:14px;font-weight:800;margin:14px 0 6px';panel.appendChild(lab);
    const input=document.createElement('input');input.type='text';input.autocapitalize='none';input.autocomplete='off';input.spellcheck=false;input.placeholder='みかみ / ぱぱ / test';input.value='';
    input.style.cssText='display:block;width:100%;box-sizing:border-box;min-height:50px;padding:10px 12px;border:1px solid #999;border-radius:10px;font-size:18px;color:#111;background:#fff';panel.appendChild(input);
    addButton(panel,'この家族コードの保存を見る',()=>openCode(input.value));
    if(current)addButton(panel,'現在の家族コードの保存を見る',()=>openCode(current),true);
    addButton(panel,'キャンセル',removeDialog,true);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openCode(input.value)}});setTimeout(()=>input.focus(),0);
  }
  function refreshButton(){
    const b=document.getElementById('cloudFamilySwitchBtn');if(!b)return;
    const current=normalize(cfg().familyCode||'');
    b.textContent=current?'家族コード：'+([...current].length>12?[...current].slice(0,12).join('')+'…':current)+'（変更）':'家族コードを設定 / 切替';
    b.title=current?'現在の家族コード「'+current+'」から別の家族コードへ切り替えます':'家族コードを設定して保存を選びます';
  }
  function attach(){
    const c=cloud();if(!c)return false;
    const pull=document.getElementById('cloudPullBtn'),copy=document.getElementById('cloudCodeBtn');
    const host=pull?.parentElement||copy?.parentElement||document.querySelector('.controls');
    if(!host)return false;
    if(!document.getElementById('cloudFamilySwitchBtn')){
      const b=document.createElement('button');b.className='btn';b.id='cloudFamilySwitchBtn';b.type='button';b.onclick=openSwitcher;
      if(pull?.parentElement===host)host.insertBefore(b,pull);
      else if(copy?.parentElement===host)host.insertBefore(b,copy.nextSibling);
      else host.appendChild(b);
    }
    const current=normalize(cfg().familyCode||'');if(current)remember(current);refreshButton();return true;
  }

  let tries=0;const timer=setInterval(()=>{if(attach()||++tries>100)clearInterval(timer)},100);
  setInterval(refreshButton,1200);
  window.AI_SHOGI_FAMILY_SWITCHER={version:'21533a',open:openSwitcher,openCode,history:()=>readHistory().map(x=>x.code),audit:()=>({ok:true,button:!!document.getElementById('cloudFamilySwitchBtn'),currentFamilyCode:normalize(cfg().familyCode||''),history:readHistory().map(x=>x.code)})};
})();
