window.FINAL21513_IMAGES=window.FINAL21513_IMAGES||{};window.FINAL21513_IMAGES.rin=new URL('../shogi-side-test/rin21515.jpg?v=21515',location.href).href;
/* v2.15.29 experimental loader: core IIFE内で、未来みつき導入後に上位5人エンジン接続パッチを読む */
setTimeout(async()=>{
  try{
    const r=await fetch('../shogi-side-test/top5-yaneura21529.js?v=21529a',{cache:'no-store'});
    if(!r.ok)throw new Error('top5-yaneura21529.js '+r.status);
    eval(await r.text());
  }catch(e){console.error('top5 yaneura patch load failed',e)}
},0);