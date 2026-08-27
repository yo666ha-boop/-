window.FINAL21513_IMAGES=window.FINAL21513_IMAGES||{};window.FINAL21513_IMAGES.rin=new URL('../shogi-side-test/rin21515.jpg?v=21515',location.href).href;
/* v2.15.29 experimental loader: core IIFE内で、未来みつき導入後に上位5人エンジン接続パッチを読む */
setTimeout(async()=>{
  try{
    const r=await fetch('../shogi-side-test/top5-yaneura21529.js?v=21529a',{cache:'no-store'});
    if(!r.ok)throw new Error('top5-yaneura21529.js '+r.status);
    eval(await r.text());
  }catch(e){console.error('top5 yaneura patch load failed',e)}
},0);
/* v2.15.33: 上位5人を壊さず、強さ7〜12位の段階別やねうら王パッチを追加 */
setTimeout(async()=>{
  try{
    const r=await fetch('../shogi-side-test/cohort7-12-yaneura21533.js?v=21533a',{cache:'no-store'});
    if(!r.ok)throw new Error('cohort7-12-yaneura21533.js '+r.status);
    eval(await r.text());
  }catch(e){console.error('cohort7-12 yaneura patch load failed',e)}
},20);
/* v2.15.34: 強さ13〜18位を、さらに浅い共通やねうら王＋水匠5プロファイルへ段階化 */
setTimeout(async()=>{
  try{
    const r=await fetch('../shogi-side-test/cohort13-18-yaneura21534.js?v=21534a',{cache:'no-store'});
    if(!r.ok)throw new Error('cohort13-18-yaneura21534.js '+r.status);
    eval(await r.text());
  }catch(e){console.error('cohort13-18 yaneura patch load failed',e)}
},40);
/* v2.15.36: 強さ19〜26位も共通YaneuraOu＋水匠5を毎手使い、評価損失上限と棋風で段階化 */
setTimeout(async()=>{
  try{
    const r=await fetch('../shogi-side-test/cohort19-26-yaneura21536.js?v=21536a',{cache:'no-store'});
    if(!r.ok)throw new Error('cohort19-26-yaneura21536.js '+r.status);
    eval(await r.text());
  }catch(e){console.error('cohort19-26 yaneura patch load failed',e)}
},60);
/* v2.15.36d: 未来みつき追加後の実R順で26人全員の順位を表示し、完成前の仮キャラ表記を除去。 */
setTimeout(()=>{
  try{
    const baseRankText=rankText;
    const ordered=()=>C.map((c,index)=>({index,rating:Number(c?.[1]||0)})).sort((a,b)=>b.rating-a.rating||a.index-b.index);
    const labelFor=i=>{
      const pos=ordered().findIndex(x=>x.index===Number(i));
      if(pos<0)return baseRankText(i);
      const rank=pos+1;
      if(Number(i)===25)return '強さ'+rank+'位・未来最強';
      if(Number(i)===0)return '強さ'+rank+'位・現代最強';
      return '強さ'+rank+'位';
    };
    rankText=function(i){return labelFor(i)};
    for(let i=0;i<C.length;i++){
      const meta=CHAR_META[i];
      if(!meta)continue;
      const before=String(meta.feature||'');
      const after=before
        .replace('空き仮キャラ勢の最高位。','26人の中でも上位。')
        .replace('仮キャラ勢の最上位。','26人の中でも上位。');
      if(after===before)continue;
      CHAR_META[i]={...meta,feature:after};
      const card=document.querySelectorAll('#chars .ch')[i];
      if(card)card.title=C[i][0]+'｜R'+C[i][1]+'｜'+CHAR_META[i].style+'｜'+CHAR_META[i].feature;
    }
    const labels=Object.fromEntries(C.map((c,i)=>[c?.[0]||String(i),labelFor(i)]));
    const provisionalMeta=C.map((c,i)=>({i,name:c?.[0]||String(i),feature:String(CHAR_META[i]?.feature||'')})).filter(x=>x.feature.includes('仮キャラ'));
    window.AI_SHOGI_STRENGTH_RANK_LABELS={version:'21536d',count:C.length,labels,provisionalMeta,labelFor:i=>labelFor(Number(i))};
    try{renderOpponent(false)}catch(e){}
  }catch(e){console.error('all26 strength rank label patch failed',e)}
},100);
