/*! AI将棋先生 v2.15.23 isolated scope - legacy badge/image repair */
let coepCredentialless=false;
const SCOPE_PREFIX='/\-/shogi-v21523/';
const LEGACY_PREFIX='/\-/shogi-side-test/';
function withIsolationHeaders(res){
  if(res.status===0)return res;
  const h=new Headers(res.headers);
  h.set('Cross-Origin-Embedder-Policy',coepCredentialless?'credentialless':'require-corp');
  if(!coepCredentialless)h.set('Cross-Origin-Resource-Policy','cross-origin');
  h.set('Cross-Origin-Opener-Policy','same-origin');
  return {headers:h,status:res.status,statusText:res.statusText};
}
function stripLegacyBadgeWrites(text){
  return text
    .replace(/const\s+([A-Za-z0-9_$]+)\s*=\s*document\.querySelector\(['"]\.badge['"]\)\s*;\s*if\s*\(\s*\1\s*\)\s*\1\.textContent\s*=\s*['"][^'"]*['"]\s*;?/g,'')
    .replace(/(?:document\.)?querySelector\(['"]\.badge['"]\)\.textContent\s*=\s*['"][^'"]*['"]\s*;?/g,'')
    .replace(/let\s+([A-Za-z0-9_$]+)\s*=\s*document\.querySelector\(['"]\.badge['"]\)\s*;\s*if\s*\(\s*\1\s*\)\s*\1\.textContent\s*=\s*['"][^'"]*['"]\s*;?/g,'');
}
async function fetchWithRepairs(request){
  const url=new URL(request.url);
  let res=await fetch(request);

  // v2.15.23内の相対キャラ画像が404なら、既存の正しい素材置き場へフォールバックする。
  if(!res.ok && url.origin===location.origin && url.pathname.startsWith(SCOPE_PREFIX)){
    const rel=url.pathname.slice(SCOPE_PREFIX.length);
    if(/\.(?:png|jpe?g|webp|svg)$/i.test(rel)){
      const fallback=new URL(LEGACY_PREFIX+rel,location.origin);
      fallback.search=url.search;
      const fr=await fetch(fallback.href,{cache:'no-store'});
      if(fr.ok)res=fr;
    }
  }

  // 旧キャラパッチはデータだけ利用し、17/20などへ表示を書き戻す命令だけ除去。
  if(res.ok && url.origin===location.origin && url.pathname.startsWith(LEGACY_PREFIX) && url.pathname.endsWith('.js')){
    let text=await res.text();
    text=stripLegacyBadgeWrites(text);
    const meta=withIsolationHeaders(res);
    meta.headers.set('Content-Type','application/javascript; charset=utf-8');
    meta.headers.set('Cache-Control','no-store');
    return new Response(text,meta);
  }

  const meta=withIsolationHeaders(res);
  return new Response(res.body,meta);
}
if(typeof window==='undefined'){
  self.addEventListener('install',()=>self.skipWaiting());
  self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
  self.addEventListener('message',ev=>{if(ev.data?.type==='coepCredentialless')coepCredentialless=ev.data.value});
  self.addEventListener('fetch',event=>{
    const r=event.request;
    if(r.cache==='only-if-cached'&&r.mode!=='same-origin')return;
    const req=(coepCredentialless&&r.mode==='no-cors')?new Request(r,{credentials:'omit'}):r;
    event.respondWith(fetchWithRepairs(req).catch(()=>fetch(req)));
  });
}else{
  (()=>{
    const n=navigator,controlling=n.serviceWorker&&n.serviceWorker.controller;
    if(controlling){
      n.serviceWorker.controller.postMessage({type:'coepCredentialless',value:false});
      n.serviceWorker.getRegistration().then(reg=>reg&&reg.update()).catch(()=>{});
      return;
    }
    if(window.crossOriginIsolated!==false||!window.isSecureContext||!n.serviceWorker)return;
    n.serviceWorker.register(window.document.currentScript.src).then(reg=>{
      reg.update().catch(()=>{});
      if(reg.active&&!n.serviceWorker.controller)location.reload();
      reg.addEventListener('updatefound',()=>{
        const w=reg.installing;if(!w)return;
        w.addEventListener('statechange',()=>{if(w.state==='activated')location.reload()});
      });
    });
  })();
}
