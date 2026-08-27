/* AI将棋先生 v2.15.28 - mobile cloud slot picker */
(function installCloudSlotPicker21532(){
  if(window.__AI_SHOGI_CLOUD_SLOT_PICKER_21532B)return;
  window.__AI_SHOGI_CLOUD_SLOT_PICKER_21532B=true;

  const fmtWhen=value=>{
    const n=Number(value||0);if(!n)return '';
    try{return new Date(n).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}
  };
  const slotLabel=slot=>{
    const parts=[String(slot.slotName||'名称なし')];
    const ply=Number(slot.ply)||0,when=fmtWhen(slot.savedAt||slot.updatedAt);
    if(ply)parts.push(ply+'手');if(when)parts.push(when);return parts.join(' / ');
  };
  const removePicker=()=>document.getElementById('aiShogiCloudSlotPicker')?.remove();
  const setStatus=text=>{const s=document.getElementById('status');if(s)s.textContent=text;const f=document.getElementById('fstatus');if(f)f.textContent=text};

  function showPicker(slots,onPick){
    removePicker();
    const shade=document.createElement('div');shade.id='aiShogiCloudSlotPicker';
    shade.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    const panel=document.createElement('div');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','再開する保存を選ぶ');
    panel.style.cssText='width:min(520px,100%);max-height:min(78vh,680px);overflow:auto;background:#fff;color:#111;border-radius:16px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.32);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    const title=document.createElement('div');title.textContent='再開する保存を選んでください';title.style.cssText='font-size:20px;font-weight:800;margin:0 0 6px';panel.appendChild(title);
    const sub=document.createElement('div');sub.textContent='保存名をタップすると、この端末で続きを再開します。';sub.style.cssText='font-size:14px;line-height:1.5;margin:0 0 12px;color:#444';panel.appendChild(sub);
    slots.forEach(slot=>{
      const b=document.createElement('button');b.type='button';b.textContent=slotLabel(slot);b.dataset.slotId=String(slot.slotId||'');
      b.style.cssText='display:block;width:100%;min-height:52px;margin:8px 0;padding:12px 14px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#111;font-size:17px;font-weight:700;text-align:left;line-height:1.35;touch-action:manipulation';
      b.onclick=()=>{removePicker();onPick(slot)};panel.appendChild(b);
    });
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='キャンセル';cancel.style.cssText='display:block;width:100%;min-height:48px;margin-top:12px;padding:10px 14px;border:1px solid #aaa;border-radius:12px;background:#f5f5f5;color:#111;font-size:16px;font-weight:700';cancel.onclick=removePicker;panel.appendChild(cancel);
    shade.appendChild(panel);shade.onclick=e=>{if(e.target===shade)removePicker()};document.body.appendChild(shade);cancel.focus();
  }

  async function mobileRestore(original){
    const cloud=window.AI_SHOGI_CLOUD_SAVE;if(!cloud?.listSlots||!cloud?.enableWithCode||!cloud?.pull)return original();
    const c=cloud.config?.()||{};
    if(!c.familyCode)return original();
    const listed=await cloud.listSlots();
    if(!listed?.ok){setStatus('クラウドの保存一覧を取得できませんでした。');return}
    if(!listed.slots?.length){setStatus('この家族コードには保存された対局がまだありません。');return}
    showPicker(listed.slots,async slot=>{
      const audit=cloud.audit?.()||{},current=audit.activeSlotName||'現在の保存';
      if(audit.meta?.pending){
        const ok=confirm('この端末の「'+current+'」に未同期の変更があります。\n\n未同期変更を破棄して「'+String(slot.slotName||'選んだ保存')+'」を再開しますか？');
        if(!ok)return;
      }
      const enabled=await cloud.enableWithCode(c.familyCode,{slotId:slot.slotId,slotName:slot.slotName,revision:Number(slot.revision||0),savedAt:Number(slot.savedAt||0)});
      if(!enabled){setStatus('選んだ保存へ切り替えできませんでした。');return}
      const result=await cloud.pull();
      if(result?.ok)setStatus('「'+String(slot.slotName||'選んだ保存')+'」をこの端末へ復元しました。');
      else setStatus('選んだ保存を取得できませんでした。端末内保存は保持されています。');
    });
  }

  function attach(){
    const b=document.getElementById('cloudPullBtn'),cloud=window.AI_SHOGI_CLOUD_SAVE;
    if(!b||!cloud||b.dataset.mobileSlotPicker==='1')return false;
    const original=typeof b.onclick==='function'?b.onclick.bind(b):()=>cloud.restoreFlow?.();
    b.dataset.mobileSlotPicker='1';b.onclick=()=>mobileRestore(original);return true;
  }
  let tries=0;const timer=setInterval(()=>{if(attach()||++tries>80)clearInterval(timer)},100);
})();