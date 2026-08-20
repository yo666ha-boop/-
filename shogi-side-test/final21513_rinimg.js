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
/* v2.15.35: 強さ19〜26位は内蔵AIの棋風を維持し、強制詰みだけ共通YaneuraOu＋水匠5で救済 */
setTimeout(async()=>{
  try{
    const r=await fetch('../shogi-side-test/cohort19-26-supervisor21535.js?v=21535a',{cache:'no-store'});
    if(!r.ok)throw new Error('cohort19-26-supervisor21535.js '+r.status);
    eval(await r.text());
  }catch(e){console.error('cohort19-26 supervisor patch load failed',e)}
},60);