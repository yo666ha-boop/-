let coepCredentialless=false;

async function installPageRepair21528(){
  let micchanSrc='';
  try{
    const r=await fetch('../shogi/strong213_06.part?v=21528f',{cache:'no-store'});
    if(r.ok){
      const t=await r.text();
      const m=/FIXED_IMG\[1\]='([^']+)'/.exec(t);
      if(m)micchanSrc=m[1];
    }
  }catch(e){console.error('micchan source repair',e)}

  function cardName(c){return (c?.querySelector('.chName')?.textContent||c?.querySelector('img')?.alt||'').trim()}
  function fix(){
    const cards=[...document.querySelectorAll('#chars .ch')];
    if(cards[1]&&micchanSrc){
      const img=cards[1].querySelector('img');
      if(img&&img.src!==micchanSrc){img.onerror=null;img.src=micchanSrc;}
    }
    if(cards[25]&&window.FUTURE_MITSUKI_IMAGE21520){
      const img=cards[25].querySelector('img');
      if(img&&img.src!==window.FUTURE_MITSUKI_IMAGE21520){img.onerror=null;img.src=window.FUTURE_MITSUKI_IMAGE21520;}
    }
    const op=(document.querySelector('#oppName')?.textContent||'').trim();
    if(op==='未来からやってきたみつき'&&window.FUTURE_MITSUKI_IMAGE21520){
      document.querySelectorAll('#oppPortrait img,#foppPortrait img').forEach(img=>{
        if(img.src!==window.FUTURE_MITSUKI_IMAGE21520){img.onerror=null;img.src=window.FUTURE_MITSUKI_IMAGE21520;}
      });
    }
    if(cards.length===26){
      const bad=cards.filter(c=>{const img=c.querySelector('img');return !img||(img.complete&&img.naturalWidth===0)}).map(cardName).filter(Boolean);
      const d=document.getElementById('diag28');
      if(d&&/③/.test(d.textContent||'')){
        d.style.display='block';
        d.textContent=bad.length?'v2.15.28 ①成功 / ②成功 / ③実画像エラー '+bad.length+'人: '+bad.join('、'):'v2.15.28 ①成功 / ②成功 / ③成功: 26人画像OK';
      }
    }
  }
  const start=()=>{
    fix();
    const root=document.documentElement;
    new MutationObserver(fix).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    setInterval(fix,500);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}

if(typeof window==='undefined'){
  self.addEventListener('install',()=>self.skipWaiting());
  self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
  self.addEventListener('message',ev=>{if(ev.data?.type==='coepCredentialless')coepCredentialless=ev.data.value});
  self.addEventListener('fetch',event=>{
    const r=event.request;
    if(r.cache==='only-if-cached'&&r.mode!=='same-origin')return;
    const req=(coepCredentialless&&r.mode==='no-cors')?new Request(r,{credentials:'omit'}):r;
    event.respondWith(fetch(req).then(res=>{
      if(res.status===0)return res;
      const h=new Headers(res.headers);
      h.set('Cross-Origin-Embedder-Policy',coepCredentialless?'credentialless':'require-corp');
      if(!coepCredentialless)h.set('Cross-Origin-Resource-Policy','cross-origin');
      h.set('Cross-Origin-Opener-Policy','same-origin');
      h.set('Cache-Control','no-store');
      return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
    }))
  });
}else{
  installPageRepair21528();
  (()=>{
    const n=navigator;
    if(!window.isSecureContext||!n.serviceWorker)return;
    const src=window.document.currentScript.src;
    const hadController=!!n.serviceWorker.controller;
    if(hadController)n.serviceWorker.controller.postMessage({type:'coepCredentialless',value:false});
    n.serviceWorker.register(src,{updateViaCache:'none'}).then(async reg=>{
      try{await reg.update()}catch(e){}
      if(!hadController&&reg.active&&!n.serviceWorker.controller)location.reload();
    }).catch(e=>console.error('coi service worker update',e));
  })()
}
