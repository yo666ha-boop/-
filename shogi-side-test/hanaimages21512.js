/* v2.15.12 花の慶次3人画像をbase64テキストから読み込む */
(async()=>{try{
  const files={8:'naoe',11:'date',18:'keiji'};
  await Promise.all(Object.entries(files).map(async([ki,name])=>{
    const r=await fetch('./hana21512/'+name+'.b64.txt?v=21512',{cache:'no-store'});
    if(!r.ok)throw new Error(name+' image '+r.status);
    const b64=(await r.text()).trim();
    HANA21512_DATA[Number(ki)].img='data:image/webp;base64,'+b64;
  }));
  if(typeof hana21512ApplyCards==='function')hana21512ApplyCards();
  lastSpeech='';renderOpponent(true);
  setTimeout(()=>{if(typeof hana21512ApplyCards==='function')hana21512ApplyCards();},120);
  setTimeout(()=>{if(typeof hana21512ApplyCards==='function')hana21512ApplyCards();},500);
  window.AI_SHOGI_HANA_IMAGE_AUDIT={ok:true,version:'2.15.12',loaded:[8,11,18]};
}catch(e){console.error('hana images 2.15.12',e);window.AI_SHOGI_HANA_IMAGE_AUDIT={ok:false,error:String(e)}}})();
