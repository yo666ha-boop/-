if(typeof window==='undefined'){
  self.addEventListener('install',()=>self.skipWaiting());
  self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch',event=>{
    const req=event.request;
    if(req.cache==='only-if-cached'&&req.mode!=='same-origin')return;
    event.respondWith((async()=>{
      try{
        const url=new URL(req.url);
        const isMicchan=url.pathname.endsWith('/shogi/micchan21528.jpg');
        const sourceReq=isMicchan?new Request(new URL('../shogi/micchan21528.webp',self.location.href),{cache:'no-store'}):req;
        const res=await fetch(sourceReq);
        if(!res||res.status===0)return res;
        const h=new Headers(res.headers);
        h.set('Cross-Origin-Embedder-Policy','require-corp');
        h.set('Cross-Origin-Opener-Policy','same-origin');
        h.set('Cross-Origin-Resource-Policy','same-origin');
        if(isMicchan){
          h.set('Content-Type','image/webp');
          h.set('Cache-Control','no-store');
        }else if(req.mode==='navigate'||req.destination==='document')h.set('Cache-Control','no-store');
        return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
      }catch(err){
        console.error('COI fetch failed',req.url,err);
        throw err;
      }
    })());
  });
}else{
  (()=>{
    if(window.__AI_SHOGI_SAVE_FETCH_PATCH_21531)return;
    window.__AI_SHOGI_SAVE_FETCH_PATCH_21531=true;
    const nativeFetch=window.fetch.bind(window),scriptURL=document.currentScript?.src||location.href;
    window.fetch=async function(...args){
      const res=await nativeFetch(...args);
      try{
        const input=args[0],u=new URL(input instanceof Request?input.url:String(input),location.href);
        if(!u.pathname.endsWith('/shogi/strong2155.js'))return res;
        const saveURL=new URL('./save21530.js?v=21530c',scriptURL);
        const cloudURL=new URL('./cloud-save21531.js?v=21531f',scriptURL);
        const [saveRes,cloudRes]=await Promise.all([nativeFetch(saveURL,{cache:'no-store'}),nativeFetch(cloudURL,{cache:'no-store'})]);
        if(!saveRes.ok||!cloudRes.ok)return res;
        const [baseText,saveText,cloudText]=await Promise.all([res.clone().text(),saveRes.text(),cloudRes.text()]);
        const saveHook=`\n(()=>{if(window.__AI_SHOGI_CLOUD_STORAGE_HOOK)return;window.__AI_SHOGI_CLOUD_STORAGE_HOOK=true;const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const out=native.call(this,k,v);if(this===localStorage&&k==='aiShogiGameSaveV1')setTimeout(()=>window.dispatchEvent(new Event('ai-shogi-local-save')),0);return out}})();\n`;
        const h=new Headers(res.headers);h.delete('content-length');h.delete('content-encoding');h.delete('etag');h.set('content-type','application/javascript; charset=utf-8');h.set('cache-control','no-store');
        return new Response(baseText+'\n'+saveText+'\n'+cloudText+saveHook,{status:res.status,statusText:res.statusText,headers:h});
      }catch(e){console.error('save/cloud patch inject failed',e);return res}
    };
  })();
  (()=>{
    const n=navigator;
    if(!window.isSecureContext||!n.serviceWorker)return;
    const src=document.currentScript.src;
    const RELOAD_KEY='ai-shogi-coi-reload-21531f';
    const VERCEL='https://ai-shogi-yaneuraou-iphone.vercel.app';
    const show=()=>{document.documentElement.style.visibility=''};
    const hide=()=>{if(!window.crossOriginIsolated)document.documentElement.style.visibility='hidden'};
    const fixBadge=()=>{const b=document.querySelector('.badge');if(b)b.textContent='v2.15.28 26キャラ・未来みつき Worker版'};
    const goRealHeaders=()=>{
      if(location.hostname!=='yo666ha-boop.github.io')return false;
      const path=location.pathname.replace(/^\/-\//,'/');
      location.replace(VERCEL+path+location.search+location.hash);
      return true;
    };
    let ticks=0;const timer=setInterval(()=>{fixBadge();if(++ticks>=40)clearInterval(timer)},500);
    if(window.crossOriginIsolated){try{sessionStorage.removeItem(RELOAD_KEY)}catch(e){}show();return;}
    hide();
    let reloading=false;
    const reloadOnce=()=>{
      if(reloading||window.crossOriginIsolated)return;
      let count=0;try{count=Number(sessionStorage.getItem(RELOAD_KEY)||0)}catch(e){}
      if(count>=2){if(!goRealHeaders())show();return;}
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
    }).catch(e=>{console.error('coi service worker update',e);if(!goRealHeaders())show()});
    setTimeout(()=>{if(!window.crossOriginIsolated&&!goRealHeaders())show()},7000);
  })();
}