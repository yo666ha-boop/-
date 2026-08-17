let coepCredentialless=false;

function patchFuture21528(text){
  const helper=`\n  function withTimeout21528(p,ms,label){\n    return Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(new Error(label+' timeout '+ms+'ms')),ms))]);\n  }\n`;
  text=text.replace('  function setEngineState21520(text,ok=false){',helper+'  function setEngineState21520(text,ok=false){');
  text=text.replace("    window.AI_SHOGI_YANEURAOU_FUTURE.state=text;\n  }","    window.AI_SHOGI_YANEURAOU_FUTURE.state=text;\n    window.AI_SHOGI_YANEURAOU_FUTURE.stage=text;\n    try{if(ci===FUTURE_INDEX){const s=document.getElementById('status');if(s)s.textContent='未来みつき ENGINE：'+text;}}catch(e){}\n  }");
  text=text.replace("      if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',()=>reject(new Error('YaneuraOu script load failed')),{once:true});return}","      if(old)old.remove()");
  text=text.replace("        setEngineState21520('起動中…');","        setEngineState21520('⑤-0 起動開始');");
  text=text.replace("        await loadEngineScript21520();","        setEngineState21520('⑤-1 Wasm JS読込中');\n        await withTimeout21528(loadEngineScript21520(),10000,'Wasm JS');\n        setEngineState21520('⑤-1 Wasm JS読込完了');");
  text=text.replace("        const e=await factory({locateFile:(p)=>ENGINE_BASE+String(p).split('/').pop()});","        setEngineState21520('⑤-2 Wasm本体起動中');\n        const e=await withTimeout21528(factory({locateFile:(p)=>ENGINE_BASE+String(p).split('/').pop()}),15000,'Wasm factory');\n        setEngineState21520('⑤-2 Wasm本体起動完了');");
  text=text.replace("        const evalRes=await fetch(ENGINE_BASE+ENGINE_EVAL+'?v=21520',{cache:'no-store'});","        setEngineState21520('⑤-3 水匠5 nn.bin取得中');\n        const evalRes=await withTimeout21528(fetch(ENGINE_BASE+ENGINE_EVAL+'?v=21528d',{cache:'no-store'}),20000,'nn.bin fetch');");
  text=text.replace("        const evalBytes=new Uint8Array(await evalRes.arrayBuffer());","        setEngineState21520('⑤-3 水匠5 64MB読込中');\n        const evalBytes=new Uint8Array(await withTimeout21528(evalRes.arrayBuffer(),35000,'nn.bin body'));\n        setEngineState21520('⑤-3 水匠5読込完了 '+Math.round(evalBytes.byteLength/1024/1024)+'MB');");
  text=text.replace("        let p=waitLine21520(x=>x==='usiok',15000);e.postMessage('usi');await p;","        setEngineState21520('⑤-4 usiok待ち');\n        let p=waitLine21520(x=>x==='usiok',15000);e.postMessage('usi');await p;\n        setEngineState21520('⑤-4 usiok受信');");
  text=text.replace("        p=waitLine21520(x=>x==='readyok',45000);e.postMessage('isready');await p;","        setEngineState21520('⑤-5 readyok待ち');\n        p=waitLine21520(x=>x==='readyok',30000);e.postMessage('isready');await p;\n        setEngineState21520('⑤-5 readyok受信');");
  text=text.replace("        setEngineState21520('やねうら王＋水匠5 接続済み',true);","        setEngineState21520('⑤成功 やねうら王＋水匠5 接続済み',true);");
  text=text.replace("      }catch(err){engineInitError21520=String(err&&err.message||err);engineReady21520=false;setEngineState21520('起動失敗');throw err}","      }catch(err){engineInitError21520=String(err&&err.message||err);engineReady21520=false;setEngineState21520('⑤失敗 '+engineInitError21520);throw err}");
  text=text.replace("    const p=waitLine21520(x=>x.startsWith('bestmove '),ms+8000);","    setEngineState21520('⑥ 思考中 bestmove待ち');\n    const p=waitLine21520(x=>x.startsWith('bestmove '),ms+8000);");
  text=text.replace("    const line=await p;","    const line=await p;\n    setEngineState21520('⑦ bestmove受信',true);");
  return text;
}

function installPageFix21528(){
  const src=(p)=>new URL(p,location.href).href;
  const INDEX_IMG={
    1:'../shogi/micchan2154.svg?v=21528d',
    5:'../shogi-side-test/hokuto21511/kenshiro.webp?v=21528d',
    6:'../shogi-side-test/hokuto21511/jagi.webp?v=21528d',
    7:'../shogi-side-test/eva2158/shinji.webp?v=21528d',
    9:'../shogi-side-test/eva2158/ayanami.webp?v=21528d',
    12:'../shogi-side-test/eva2158/asuka.webp?v=21528d',
    15:'../shogi-side-test/eva2158/mari.webp?v=21528d',
    16:'../shogi-side-test/eva2158/penpen.webp?v=21528d',
    17:'../shogi-side-test/eva2158/gendo.webp?v=21528d',
    19:'../shogi-side-test/hokuto21511/shin.webp?v=21528d',
    20:'../shogi-side-test/eva2158/misato.webp?v=21528d',
    21:'../shogi-side-test/hokuto21511/souther.webp?v=21528d',
    22:'../shogi-side-test/rin21515.jpg?v=21528d',
    23:'../shogi-side-test/hokuto21511/raoh.webp?v=21528d',
    24:'../shogi-side-test/eva2158/kaworu.webp?v=21528d'
  };
  let lastDiag='';
  function fix(){
    const cards=[...document.querySelectorAll('#chars .ch')];
    for(const [k,p] of Object.entries(INDEX_IMG)){
      const img=cards[Number(k)]?.querySelector('img');if(!img)continue;
      const u=src(p);if(img.src!==u){img.onerror=null;img.src=u;}
    }
    const future=cards[25]?.querySelector('img');
    if(future&&window.FUTURE_MITSUKI_IMAGE21520&&future.src!==window.FUTURE_MITSUKI_IMAGE21520){future.onerror=null;future.src=window.FUTURE_MITSUKI_IMAGE21520;}
    const op=(document.querySelector('#oppName')?.textContent||'').trim();
    if(op==='未来からやってきたみつき'&&window.FUTURE_MITSUKI_IMAGE21520){document.querySelectorAll('#oppPortrait img,#foppPortrait img').forEach(i=>{if(i.src!==window.FUTURE_MITSUKI_IMAGE21520){i.onerror=null;i.src=window.FUTURE_MITSUKI_IMAGE21520;}})}
    if(cards.length===26){
      const bad=cards.map((c,i)=>({i,n:(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||('#'+i)).trim(),img:c.querySelector('img')})).filter(x=>x.img&&x.img.complete&&x.img.naturalWidth===0).map(x=>x.n);
      const diag=document.getElementById('diag28');
      if(diag&&/③画像エラー/.test(diag.textContent||'')){
        const s=bad.length?('①成功 / ②成功 / ③実画像エラー '+bad.length+'人: '+bad.join('、')):'①成功 / ②成功 / ③成功: 26人画像OK';
        if(s!==lastDiag){diag.textContent='v2.15.28 '+s;lastDiag=s;}
      }
    }
  }
  const start=()=>{fix();setInterval(fix,600)};
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
    event.respondWith(fetch(req).then(async res=>{
      if(res.status===0)return res;
      const h=new Headers(res.headers);
      h.set('Cross-Origin-Embedder-Policy',coepCredentialless?'credentialless':'require-corp');
      if(!coepCredentialless)h.set('Cross-Origin-Resource-Policy','cross-origin');
      h.set('Cross-Origin-Opener-Policy','same-origin');
      const u=new URL(r.url);
      if(u.pathname.endsWith('/shogi-side-test/future21520.js')){
        const t=patchFuture21528(await res.text());
        h.set('Content-Type','text/javascript; charset=utf-8');
        h.set('Cache-Control','no-store');
        return new Response(t,{status:res.status,statusText:res.statusText,headers:h});
      }
      return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
    }))
  })
}else{
  installPageFix21528();
  (()=>{
    const n=navigator,controlling=n.serviceWorker&&n.serviceWorker.controller;
    if(controlling){n.serviceWorker.controller.postMessage({type:'coepCredentialless',value:false});return}
    if(window.crossOriginIsolated!==false||!window.isSecureContext||!n.serviceWorker)return;
    n.serviceWorker.register(window.document.currentScript.src).then(reg=>{if(reg.active&&!n.serviceWorker.controller)location.reload()})
  })()
}
