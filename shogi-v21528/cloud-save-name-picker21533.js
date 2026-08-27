/* AI将棋先生 v2.15.28 - mobile save-name picker */
(function installSaveNamePicker21533(){
  if(window.__AI_SHOGI_SAVE_NAME_PICKER_21533B)return;
  window.__AI_SHOGI_SAVE_NAME_PICKER_21533B=true;

  const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const validName=value=>{const s=normalize(value),len=[...s].length;return !!s&&len<=40&&!/[\u0000-\u001F\u007F]/.test(s)};
  const randomSlotId=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return 'slot_'+Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
  const cloud=()=>window.AI_SHOGI_CLOUD_SAVE;
  const setStatus=text=>{const s=document.getElementById('status');if(s)s.textContent=text;const f=document.getElementById('fstatus');if(f)f.textContent=text};

  function familyFromDialog(button){
    const dialog=button?.closest?.('#aiShogiFamilySwitcherDialog');
    if(!dialog)return '';
    const text=Array.from(dialog.querySelectorAll('div')).map(x=>x.textContent||'').find(x=>/^「.*」の保存を選ぶ$/.test(x.trim()))||'';
    const m=text.trim().match(/^「(.*)」の保存を選ぶ$/);
    return normalize(m?.[1]||'');
  }

  function removePicker(){document.getElementById('aiShogiSaveNamePickerDialog')?.remove()}
  function makePicker(code){
    removePicker();
    const shade=document.createElement('div');shade.id='aiShogiSaveNamePickerDialog';
    shade.style.cssText='position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    const panel=document.createElement('div');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','新しい保存名を入力');
    panel.style.cssText='width:min(520px,100%);background:#fff;color:#111;border-radius:16px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.34);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    const title=document.createElement('div');title.textContent='新しい保存を作る';title.style.cssText='font-size:20px;font-weight:800;margin:0 0 6px';
    const sub=document.createElement('div');sub.textContent='家族コード「'+code+'」で使う保存名を入力してください。例：パパ / みっちゃん / まま';sub.style.cssText='font-size:14px;line-height:1.5;margin:0 0 12px;color:#444';
    const label=document.createElement('label');label.textContent='保存名';label.style.cssText='display:block;font-size:14px;font-weight:800;margin:4px 0 6px';
    const input=document.createElement('input');input.type='text';input.autocomplete='off';input.enterKeyHint='done';input.maxLength=40;input.placeholder='保存1';
    input.style.cssText='display:block;width:100%;box-sizing:border-box;min-height:52px;padding:11px 12px;border:1px solid #888;border-radius:10px;font-size:18px;color:#111;background:#fff';
    const error=document.createElement('div');error.setAttribute('aria-live','polite');error.style.cssText='min-height:20px;margin:6px 0 2px;color:#b00020;font-size:14px;font-weight:700';
    const button=(text,secondary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='display:block;width:100%;min-height:52px;margin:8px 0;padding:12px 14px;border:1px solid #999;border-radius:12px;background:'+(secondary?'#f5f5f5':'#fff')+';color:#111;font-size:17px;font-weight:700;text-align:center;touch-action:manipulation';return b};
    const create=button('この名前で保存を作る');
    const cancel=button('キャンセル',true);
    panel.append(title,sub,label,input,error,create,cancel);shade.appendChild(panel);document.body.appendChild(shade);
    shade.addEventListener('click',e=>{if(e.target===shade)removePicker()});cancel.onclick=removePicker;

    const submit=async()=>{
      const c=cloud();if(!c?.enableWithCode)return;
      const name=normalize(input.value);
      if(!validName(name)){error.textContent='保存名は1〜40文字で入力してください。';input.focus();return}
      const slotId=randomSlotId();
      const a=c.audit?.()||{},cfg=c.config?.()||{};
      const sameFamily=normalize(cfg.familyCode||'')===code;
      if(a.meta?.pending&&!(sameFamily&&String(a.activeSlotId||'')===slotId)){
        const ok=confirm('現在の「'+(a.activeSlotName||'保存')+'」に未同期の変更があります。\n\n保存先を切り替えると、その未同期変更は現在の保存先には送られません。切り替えますか？');
        if(!ok)return;
      }
      create.disabled=true;cancel.disabled=true;error.textContent='保存先を作成しています…';
      const enabled=await c.enableWithCode(code,{slotId,slotName:name,revision:0,savedAt:0});
      if(!enabled){create.disabled=false;cancel.disabled=false;error.textContent='新しい保存先を作れませんでした。';return}
      const pushed=await c.push?.();
      removePicker();
      try{window.AI_SHOGI_FAMILY_SWITCHER?.openCode?.(code)}catch(e){}
      if(pushed?.ok)setStatus('家族コード「'+code+'」の新しい保存「'+name+'」へ切り替えました。');
      else setStatus('保存先「'+name+'」へ切り替えました。対局を進めるとこの保存先へ自動保存されます。');
    };
    create.onclick=submit;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
    setTimeout(()=>input.focus(),0);
  }

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('button');
    if(!b||b.textContent?.trim()!=='この家族コードで新しい保存を作る')return;
    const code=familyFromDialog(b);if(!code)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    document.getElementById('aiShogiFamilySwitcherDialog')?.remove();
    makePicker(code);
  },true);

  window.AI_SHOGI_SAVE_NAME_PICKER={version:'21533b',audit:()=>({ok:true,installed:true,dialog:!!document.getElementById('aiShogiSaveNamePickerDialog')})};
})();
