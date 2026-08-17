let coepCredentialless=false;

if(typeof window==='undefined'){
  self.addEventListener('install',()=>self.skipWaiting());
  self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
  self.addEventListener('message',ev=>{if(ev.data?.type==='coepCredentialless')coepCredentialless=ev.data.value});
  self.addEventListener('fetch',event=>{
    const r=event.request;
    if(r.cache==='only-if-cached'&&r.mode!=='same-origin')return;
    const req=(coepCredentialless&&r.mode==='no-cors')?new Request(r,{credentials:'omit'}):r;
    const isDocument=r.mode==='navigate'||r.destination==='document';
    const isWorker=r.destination==='worker'||r.destination==='sharedworker';
    if(!isDocument&&!isWorker){event.respondWith(fetch(req).catch(()=>fetch(r)));return;}
    event.respondWith((async()=>{
      try{
        const res=await fetch(req);
        if(res.status===0)return res;
        const h=new Headers(res.headers);
        h.set('Cross-Origin-Embedder-Policy',coepCredentialless?'credentialless':'require-corp');
        h.set('Cache-Control','no-store');
        if(isDocument)h.set('Cross-Origin-Opener-Policy','same-origin');
        if(isWorker){
          const body=await res.arrayBuffer();
          return new Response(body,{status:res.status,statusText:res.statusText,headers:h});
        }
        return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
      }catch(e){
        return fetch(r);
      }
    })());
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

    const fixBadge=()=>{const b=document.querySelector('.badge');if(b)b.textContent='v2.15.28 26キャラ・未来みつき Worker版'};
    setTimeout(fixBadge,1500);setTimeout(fixBadge,3500);setTimeout(fixBadge,7000);setTimeout(fixBadge,12000);

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
