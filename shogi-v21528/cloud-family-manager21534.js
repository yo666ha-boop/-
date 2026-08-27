/* AI将棋先生 v2.15.28 - family delete manager + player name */
(function installFamilyManager21534(){
  if(window.__AI_SHOGI_FAMILY_MANAGER_21534A)return;
  window.__AI_SHOGI_FAMILY_MANAGER_21534A=true;

  const HISTORY_KEY='aiShogiFamilyCodeHistoryV1';
  const CLOUD_CFG_KEY='aiShogiCloudConfigV1';
  const CLOUD_META1_KEY='aiShogiCloudMetaV1';
  const CLOUD_META2_KEY='aiShogiCloudMetaV2';
  const FAMILY_SALT='AI_SHOGI_FAMILY_CODE_V1';
  const DEFAULT_API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
  const LEGACY_KEY_RE=/^[A-Za-z0-9_-]{24,128}$/;
  const SLOT_ID_RE=/^[A-Za-z0-9_-]{1,80}$/;
  const normalize=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const validFamily=v=>{const s=normalize(v),n=[...s].length;return !!s&&n<=32&&!/[\u0000-\u001F\u007F]/.test(s)};
  const validName=v=>{const s=normalize(v),n=[...s].length;return !!s&&n<=40&&!/[\u0000-\u001F\u007F]/.test(s)};
  const cloud=()=>window.AI_SHOGI_CLOUD_SAVE;
  const audit=()=>cloud()?.audit?.()||{};
  const cfg=()=>{try{return JSON.parse(localStorage.getItem(CLOUD_CFG_KEY)||'{}')||{}}catch(e){return {}}};
  const setStatus=text=>{for(const id of ['status','fstatus']){const el=document.getElementById(id);if(el)el.textContent=text}};
  const close=()=>document.getElementById('aiShogiFamilyManagerDialog')?.remove();
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const randomSlotId=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return 'slot_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};

  function history(){
    try{
      const raw=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      if(!Array.isArray(raw))return [];
      const seen=new Set(),out=[];
      for(const item of raw){const code=normalize(typeof item==='string'?item:item?.code);if(!validFamily(code)||seen.has(code))continue;seen.add(code);out.push({code,lastUsed:Number(item?.lastUsed||0)})}
      return out.sort((a,b)=>b.lastUsed-a.lastUsed).slice(0,8);
    }catch(e){return []}
  }
  function remember(code){
    const v=normalize(code);if(!validFamily(v))return;
    const next=[{code:v,lastUsed:Date.now()},...history().filter(x=>x.code!==v)].slice(0,8);
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next))}catch(e){}
  }
  function forget(code){
    const v=normalize(code);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history().filter(x=>x.code!==v)))}catch(e){}
  }
  function panel(label){
    close();
    const shade=document.createElement('div');shade.id='aiShogiFamilyManagerDialog';shade.style.cssText='position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box';
    const p=document.createElement('div');p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label',label);p.style.cssText='width:min(540px,100%);max-height:min(86vh,760px);overflow:auto;background:#fff;color:#111;border-radius:16px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.34);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    shade.appendChild(p);shade.onclick=e=>{if(e.target===shade)close()};document.body.appendChild(shade);return p;
  }
  function title(p,head,sub=''){
    const h=document.createElement('div');h.textContent=head;h.style.cssText='font-size:20px;font-weight:900;margin:0 0 6px';p.appendChild(h);
    if(sub){const d=document.createElement('div');d.textContent=sub;d.style.cssText='font-size:14px;line-height:1.55;color:#444;margin:0 0 12px';p.appendChild(d)}
  }
  function button(p,text,fn,opt={}){
    const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='display:block;width:100%;min-height:52px;margin:8px 0;padding:12px 14px;border:1px solid '+(opt.danger?'#b44':'#999')+';border-radius:12px;background:'+(opt.danger?'#fff5f5':opt.secondary?'#f5f5f5':'#fff')+';color:'+(opt.danger?'#8b1111':'#111')+';font-size:17px;font-weight:800;text-align:left;line-height:1.35;touch-action:manipulation';b.onclick=fn;p.appendChild(b);return b;
  }
  function input(p,placeholder,value=''){
    const i=document.createElement('input');i.type='text';i.autocapitalize='none';i.autocomplete='off';i.spellcheck=false;i.placeholder=placeholder;i.value=value;i.style.cssText='display:block;width:100%;box-sizing:border-box;min-height:52px;padding:10px 12px;border:1px solid #999;border-radius:10px;font-size:18px;color:#111;background:#fff;margin:8px 0';p.appendChild(i);return i;
  }
  function fmt(slot){
    const parts=[normalize(slot?.slotName)||'名称なし'];const ply=Number(slot?.ply)||0;if(ply)parts.push(ply+'手');const when=Number(slot?.savedAt||slot?.updatedAt||0);if(when){try{parts.push(new Date(when).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}catch(e){}}return parts.join(' / ');
  }
  async function derive(code){
    const enc=new TextEncoder(),material=await crypto.subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(FAMILY_SALT),iterations:120000},material,256);
    return base64url(new Uint8Array(bits));
  }
  async function resolve(raw){
    const code=normalize(raw);if(LEGACY_KEY_RE.test(code))return {ok:true,code,syncKey:code,legacy:true};if(!validFamily(code))return {ok:false,error:'invalid_family_code'};return {ok:true,code,syncKey:await derive(code),legacy:false};
  }
  async function list(raw){
    if(!navigator.onLine)return {ok:false,error:'offline',slots:[]};let rsv;try{rsv=await resolve(raw)}catch(e){return {ok:false,error:String(e.message||e),slots:[]}}if(!rsv.ok)return {ok:false,error:rsv.error,slots:[]};
    const api=String(cfg().api||DEFAULT_API);try{const r=await fetch(api+'?mode=list',{method:'GET',headers:{Authorization:'Bearer '+rsv.syncKey,'Content-Type':'application/json'},cache:'no-store'});const j=await r.json().catch(()=>({ok:false}));if(!r.ok||!j.ok||!Array.isArray(j.slots))throw new Error(j.error||('HTTP '+r.status));return {ok:true,slots:j.slots,resolved:rsv}}catch(e){return {ok:false,error:String(e.message||e),slots:[],resolved:rsv}}
  }
  async function del(raw,body){
    if(!navigator.onLine)return {ok:false,error:'offline'};let rsv;try{rsv=await resolve(raw)}catch(e){return {ok:false,error:String(e.message||e)}}if(!rsv.ok)return rsv;
    const api=String(cfg().api||DEFAULT_API);try{const r=await fetch(api,{method:'DELETE',headers:{Authorization:'Bearer '+rsv.syncKey,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body)});const j=await r.json().catch(()=>({ok:false}));if(!r.ok||!j.ok)throw new Error(j.error||('HTTP '+r.status));return j}catch(e){return {ok:false,error:String(e.message||e)}}
  }
  function activeMatches(code,slotId=''){
    const c=cfg(),a=audit(),sameCode=normalize(c.familyCode||'')===normalize(code);return sameCode&&(!slotId||String(a.activeSlotId||'')===String(slotId));
  }
  function clearActiveSlot(){
    try{const c=cfg();c.activeSlotId='';c.activeSlotName='';c.multislotReady=true;localStorage.setItem(CLOUD_CFG_KEY,JSON.stringify(c));const m=JSON.parse(localStorage.getItem(CLOUD_META2_KEY)||'{"slots":{}}');if(m&&typeof m==='object')m.slots={};localStorage.setItem(CLOUD_META2_KEY,JSON.stringify(m))}catch(e){}
    syncPlayerName();
  }
  function detachLocalFamily(code){
    try{const c=cfg();if(!code||normalize(c.familyCode||'')===normalize(code)){c.syncKey='';c.familyCode='';c.codeMode='';c.enabled=false;c.activeSlotId='';c.activeSlotName='';c.multislotReady=true;localStorage.setItem(CLOUD_CFG_KEY,JSON.stringify(c));localStorage.removeItem(CLOUD_META1_KEY);localStorage.removeItem(CLOUD_META2_KEY)}}catch(e){}
    if(code)forget(code);try{cloud()?.disable?.()}catch(e){}syncPlayerName();
  }
  function confirmLeaving(code,slotId){
    const a=audit();if(!a.meta?.pending||activeMatches(code,slotId))return true;return confirm('現在の「'+(a.activeSlotName||'保存')+'」に未同期の変更があります。\n\n切り替えると、その未同期変更は現在の保存先には送られません。切り替えますか？');
  }
  async function activate(code,slot){
    const c=cloud();if(!c?.enableWithCode||!c?.pull)return;const id=String(slot?.slotId||''),name=normalize(slot?.slotName||'');if(!SLOT_ID_RE.test(id)||!validName(name)){setStatus('保存情報が正しくありません。');return}if(!confirmLeaving(code,id))return;
    const ok=await c.enableWithCode(code,{slotId:id,slotName:name,revision:Number(slot.revision||0),savedAt:Number(slot.savedAt||0)});if(!ok){setStatus('保存先を切り替えできませんでした。');return}const pulled=await c.pull();if(pulled?.ok){remember(code);close();syncPlayerName();setStatus(name+'さんの保存へ切り替えて再開しました。')}else setStatus('保存を取得できませんでした。端末内保存は残っています。');
  }
  function createName(code){
    const p=panel('新しい名前を作る');title(p,'この家族コードで使う名前','この名前が盤面の「あなた」の代わりに表示され、クラウド保存名にもなります。');const i=input(p,'パパ / みっちゃん / まま','');
    button(p,'この名前で作る',async()=>{const name=normalize(i.value);if(!validName(name)){setStatus('名前は1〜40文字で入力してください。');return}const id=randomSlotId();if(!confirmLeaving(code,id))return;const c=cloud();if(!c?.enableWithCode)return;const ok=await c.enableWithCode(code,{slotId:id,slotName:name,revision:0,savedAt:0});if(!ok){setStatus('新しい保存を作れませんでした。');return}remember(code);await c.push?.();close();syncPlayerName();setStatus(name+'さんの保存を作りました。以後はこの名前で表示します。')});button(p,'戻る',()=>openCode(code),{secondary:true});setTimeout(()=>i.focus(),0);
  }
  async function deleteSlot(code,slot){
    const name=normalize(slot?.slotName||'保存'),id=String(slot?.slotId||'');if(!SLOT_ID_RE.test(id))return;
    if(!confirm('「'+name+'」のクラウド保存を完全に削除します。\n\nこの操作は元に戻せません。削除しますか？'))return;
    const result=await del(code,{mode:'slot',slotId:id});if(!result?.ok){setStatus('削除できませんでした。通信状態を確認してください。');return}
    if(activeMatches(code,id))clearActiveSlot();setStatus('「'+name+'」をクラウドから削除しました。');await openCode(code);
  }
  function deleteFamilyConfirm(code,count){
    const p=panel('家族コードを完全削除');title(p,'家族コード「'+normalize(code)+'」を完全削除','この家族コードにある保存 '+count+'件をすべてクラウドから削除します。元に戻せません。確認のため家族コードをもう一度入力してください。');const i=input(p,'家族コードを再入力','');
    const b=button(p,'すべて完全に削除',async()=>{if(normalize(i.value)!==normalize(code)){setStatus('家族コードが一致しません。');return}b.disabled=true;const result=await del(code,{mode:'family'});if(!result?.ok){b.disabled=false;setStatus('家族コードのデータを削除できませんでした。');return}forget(code);if(activeMatches(code))detachLocalFamily(code);close();setStatus('家族コード「'+normalize(code)+'」のクラウド保存をすべて削除しました。')},{danger:true});button(p,'やめる',()=>openCode(code),{secondary:true});setTimeout(()=>i.focus(),0);
  }
  function renderSlots(code,slots){
    const p=panel('家族コードの保存管理');title(p,'「'+normalize(code)+'」の名前・保存',slots.length?'名前を選ぶとその人の続きから再開できます。不要な保存は右の削除で完全に消せます。':'この家族コードにはクラウド保存がありません。');
    for(const slot of slots){const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:8px;align-items:stretch;margin:8px 0';p.appendChild(row);const use=document.createElement('button');use.type='button';use.textContent=fmt(slot);use.style.cssText='min-height:56px;padding:10px 12px;border:1px solid #999;border-radius:12px;background:#fff;color:#111;font-size:16px;font-weight:800;text-align:left;line-height:1.35';use.onclick=()=>activate(code,slot);row.appendChild(use);const d=document.createElement('button');d.type='button';d.textContent='削除';d.style.cssText='min-height:56px;border:1px solid #b44;border-radius:12px;background:#fff5f5;color:#8b1111;font-size:16px;font-weight:900';d.onclick=()=>deleteSlot(code,slot);row.appendChild(d)}
    button(p,'＋ 新しい名前を作る',()=>createName(code));button(p,'この家族コードのクラウド保存を全部削除',()=>deleteFamilyConfirm(code,slots.length),{danger:true});button(p,'家族コード選択へ戻る',openManager,{secondary:true});button(p,'キャンセル',close,{secondary:true});
  }
  async function openCode(raw){
    const code=normalize(raw);if(!LEGACY_KEY_RE.test(code)&&!validFamily(code)){setStatus('家族コードは1〜32文字で入力してください。');return}setStatus('家族コード「'+code+'」の保存を確認しています…');const listed=await list(code);if(!listed.ok){setStatus(listed.error==='offline'?'オフラインのため確認できません。':'保存一覧を取得できませんでした。');return}renderSlots(code,listed.slots||[]);
  }
  function openManager(){
    const c=cfg(),current=normalize(c.familyCode||'');if(current)remember(current);const p=panel('家族コード管理');title(p,'家族コード・名前・保存の管理','家族コードを切り替えたり、名前ごとの保存を削除できます。');const now=document.createElement('div');now.textContent='現在：'+(current||'未設定')+(audit().activeSlotName?' / '+audit().activeSlotName+'さん':'');now.style.cssText='font-size:16px;font-weight:900;margin:4px 0 12px;padding:10px 12px;background:#f4f4f4;border-radius:10px';p.appendChild(now);
    if(current){button(p,'現在の家族コードの名前・保存を見る',()=>openCode(current));button(p,'この端末から家族コードだけ外す',()=>{if(!confirm('この端末から家族コード「'+current+'」の設定だけ外します。\n\nクラウド保存は削除しません。端末内の対局も残ります。よろしいですか？'))return;detachLocalFamily(current);close();setStatus('この端末から家族コードを外しました。クラウド保存と端末内対局は残っています。')},{secondary:true})}
    const recent=history().filter(x=>x.code!==current);if(recent.length){const lab=document.createElement('div');lab.textContent='最近使った家族コード';lab.style.cssText='font-size:14px;font-weight:900;margin:14px 0 4px';p.appendChild(lab);for(const x of recent)button(p,x.code,()=>openCode(x.code))}
    const lab=document.createElement('div');lab.textContent='別の家族コード';lab.style.cssText='font-size:14px;font-weight:900;margin:14px 0 4px';p.appendChild(lab);const i=input(p,'みかみ / ぱぱ / test','');button(p,'この家族コードの名前・保存を見る',()=>openCode(i.value));button(p,'キャンセル',close,{secondary:true});i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openCode(i.value)}});
  }

  let lastName='';
  function syncPlayerName(){
    const name=normalize(audit().activeSlotName||'')||'あなた';if(name===lastName&&document.querySelector('#sHand b')?.textContent===name)return;lastName=name;
    for(const id of ['sHand','fsHand']){const b=document.querySelector('#'+id+' b');if(b)b.textContent=name}
    const stats=document.getElementById('statsMain');if(stats){const t=stats.textContent||'';const m=t.match(/\sR-?\d+/);if(m)stats.textContent=name+t.slice(m.index)}
    for(const id of ['status','fstatus']){const el=document.getElementById(id);if(el&&name!=='あなた'&&el.textContent.includes('あなた'))el.textContent=el.textContent.replaceAll('あなた',name)}
    document.documentElement.dataset.aiShogiPlayerName=name;
  }
  function attach(){
    const b=document.getElementById('cloudFamilySwitchBtn');if(b)b.onclick=openManager;syncPlayerName();return !!b;
  }
  let tries=0;const t=setInterval(()=>{attach();if(++tries>120)clearInterval(t)},100);setInterval(()=>{const b=document.getElementById('cloudFamilySwitchBtn');if(b&&b.onclick!==openManager)b.onclick=openManager;syncPlayerName()},700);
  const obs=new MutationObserver(()=>queueMicrotask(syncPlayerName));obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.AI_SHOGI_FAMILY_MANAGER={version:'21534a',open:openManager,openCode,deleteSlot:(code,slotId)=>del(code,{mode:'slot',slotId}),deleteFamily:code=>del(code,{mode:'family'}),playerName:()=>normalize(audit().activeSlotName||'')||'あなた',audit:()=>({ok:true,deleteApi:true,button:!!document.getElementById('cloudFamilySwitchBtn'),playerName:normalize(audit().activeSlotName||'')||'あなた'})};
})();
