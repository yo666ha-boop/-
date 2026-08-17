if(typeof window==='undefined'){
  self.addEventListener('install',()=>self.skipWaiting());
  self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch',event=>{
    const req=event.request;
    if(req.cache==='only-if-cached'&&req.mode!=='same-origin')return;
    event.respondWith((async()=>{
      try{
        const res=await fetch(req);
        if(!res||res.status===0)return res;
        const h=new Headers(res.headers);
        h.set('Cross-Origin-Embedder-Policy','require-corp');
        h.set('Cross-Origin-Opener-Policy','same-origin');
        h.set('Cross-Origin-Resource-Policy','same-origin');
        if(req.mode==='navigate'||req.destination==='document')h.set('Cache-Control','no-store');
        return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
      }catch(err){
        console.error('COI fetch failed',req.url,err);
        throw err;
      }
    })());
  });
}else{
  (()=>{
    const n=navigator;if(!window.isSecureContext||!n.serviceWorker)return;
    const src=document.currentScript.src;
    const fixBadge=()=>{const b=document.querySelector('.badge');if(b&&b.textContent!=='v2.15.28 26キャラ・未来みつき Worker版')b.textContent='v2.15.28 26キャラ・未来みつき Worker版'};
    let ticks=0;const timer=setInterval(()=>{fixBadge();if(++ticks>=40)clearInterval(timer)},500);
    const had=!!n.serviceWorker.controller;
    n.serviceWorker.register(src,{updateViaCache:'none'}).then(async reg=>{
      try{await reg.update()}catch(e){}
      if(!had&&reg.active&&!n.serviceWorker.controller)location.reload();
    }).catch(e=>console.error('coi service worker update',e));
  })();
}
