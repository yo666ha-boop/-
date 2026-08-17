let coepCredentialless=false;

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
  (()=>{
    let done=false;
    let obs=null;
    const restore=(src)=>{
      const cards=[...document.querySelectorAll('#chars .ch')];
      const img=cards[1]?.querySelector('img');
      if(img&&src&&img.src!==src){img.onerror=null;img.src=src;}
    };
    const capture=()=>{
      if(done)return;
      const cards=[...document.querySelectorAll('#chars .ch')];
      if(cards.length<25)return;
      const img=cards[1]?.querySelector('img');
      const src=img?.src||'';
      if(!src||src.includes('micchan2154.svg'))return;
      done=true;window.__MICCHAN_ORIGINAL_21528=src;
      try{obs?.disconnect()}catch(e){}
      setTimeout(()=>restore(src),350);
      setTimeout(()=>restore(src),900);
      setTimeout(()=>restore(src),1800);
      setTimeout(()=>restore(src),3200);
    };
    obs=new MutationObserver(capture);
    obs.observe(document.documentElement,{subtree:true,childList:true});
    capture();
    setTimeout(()=>{try{obs?.disconnect()}catch(e){}},5000);

    const n=navigator;
    if(!window.isSecureContext||!n.serviceWorker)return;
    const src=window.document.currentScript.src;
    const hadController=!!n.serviceWorker.controller;
    if(hadController)n.serviceWorker.controller.postMessage({type:'coepCredentialless',value:false});
    n.serviceWorker.register(src,{updateViaCache:'none'}).then(async reg=>{
      try{await reg.update()}catch(e){}
      if(!hadController&&reg.active&&!n.serviceWorker.controller)location.reload();
    }).catch(e=>console.error('coi service worker update',e));
  })();
}
