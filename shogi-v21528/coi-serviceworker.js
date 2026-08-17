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
    const n=navigator;
    if(!window.isSecureContext||!n.serviceWorker)return;
    const src=document.currentScript.src;
    const RELOAD_KEY='ai-shogi-coi-reload-21528g';
    const show=()=>{document.documentElement.style.visibility=''};
    const hide=()=>{if(!window.crossOriginIsolated)document.documentElement.style.visibility='hidden'};
    const fixBadge=()=>{const b=document.querySelector('.badge');if(b&&b.textContent!=='v2.15.28 26キャラ・未来みつき Worker版')b.textContent='v2.15.28 26キャラ・未来みつき Worker版'};
    if(window.crossOriginIsolated){try{sessionStorage.removeItem(RELOAD_KEY)}catch(e){}show();return;}
    hide();
    let reloading=false;
    const reloadOnce=()=>{
      if(reloading||window.crossOriginIsolated)return;
      let count=0;try{count=Number(sessionStorage.getItem(RELOAD_KEY)||0)}catch(e){}
      if(count>=2){show();return;}
      reloading=true;try{sessionStorage.setItem(RELOAD_KEY,String(count+1))}catch(e){}
      location.reload();
    };
    n.serviceWorker.addEventListener('controllerchange',()=>reloadOnce(),{once:true});
    n.serviceWorker.register(src,{updateViaCache:'none'}).then(async reg=>{
      try{await reg.update()}catch(e){}
      try{await n.serviceWorker.ready}catch(e){}
      if(window.crossOriginIsolated){try{sessionStorage.removeItem(RELOAD_KEY)}catch(e){}show();return;}
      if(n.serviceWorker.controller){reloadOnce();return;}
      const sw=reg.installing||reg.waiting||reg.active;
      if(sw&&sw.state!=='activated'){
        await new Promise(resolve=>{
          const done=()=>resolve();
          sw.addEventListener('statechange',()=>{if(sw.state==='activated')done()});
          setTimeout(done,1800);
        });
      }
      reloadOnce();
    }).catch(e=>{console.error('coi service worker update',e);show()});
    let ticks=0;const timer=setInterval(()=>{fixBadge();if(++ticks>=40)clearInterval(timer)},500);
    setTimeout(show,7000);
  })();
}
