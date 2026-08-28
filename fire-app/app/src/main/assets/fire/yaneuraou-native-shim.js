/* Fire Stage 3: worker-side shim for native Android YaneuraOu V9.70.
 * It preserves the existing Emscripten-facing API used by the browser workers while replacing
 * only the low-level engine transport.  No character/profile/rating code is changed.
 */
(function(){
  'use strict';
  const realFetch=self.fetch.bind(self);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const isEvalUrl=input=>{try{return /\/nn\.bin(?:[?#]|$)/.test(String(input&&input.url||input||''));}catch(e){return false}};

  // The native engine reads the real 64MB Suisho5 file from app storage. Existing workers still
  // perform their historical fetch/size check before FS.writeFile, so provide a small synthetic
  // 10MB buffer and make FS.writeFile a no-op. This avoids duplicating 64MB per Web Worker.
  self.fetch=function(input,init){
    if(isEvalUrl(input)){
      return Promise.resolve({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(10000000)});
    }
    return realFetch(input,init);
  };

  function syncGet(path){
    const xhr=new XMLHttpRequest();
    xhr.open('GET',path,false);
    xhr.setRequestHeader('Cache-Control','no-store');
    xhr.send(null);
    if(xhr.status<200||xhr.status>=300)throw new Error('native bridge HTTP '+xhr.status+' '+String(xhr.responseText||''));
    return String(xhr.responseText||'');
  }

  self.YaneuraOu_HalfKP_noeval=async function(){
    const session=syncGet('/__native_engine/start').trim();
    if(!session)throw new Error('native engine session start failed');
    let cursor=0,closed=false,listeners=[];

    async function pollLoop(){
      while(!closed){
        try{
          const r=await realFetch('/__native_engine/poll?id='+encodeURIComponent(session)+'&cursor='+cursor,{cache:'no-store'});
          if(!r.ok)throw new Error('poll '+r.status);
          const data=await r.json();
          cursor=Number(data.next)||cursor;
          const lines=Array.isArray(data.lines)?data.lines:[];
          for(const line of lines){
            for(const fn of listeners.slice()){
              try{fn(String(line))}catch(e){}
            }
          }
          if(!lines.length)await sleep(8);
        }catch(e){
          if(!closed){
            for(const fn of listeners.slice())try{fn('info string FIRE_NATIVE_BRIDGE_ERROR '+String(e&&e.message||e))}catch(_e){}
            await sleep(50);
          }
        }
      }
    }
    pollLoop();

    const engine={
      FS:{unlink(){},writeFile(){}},
      ccall(name,ret,argTypes,args){
        if(name!=='usi_command')throw new Error('unsupported native ccall '+name);
        const cmd=String(args&&args[0]||'');
        return Number(syncGet('/__native_engine/cmd?id='+encodeURIComponent(session)+'&q='+encodeURIComponent(cmd)))||0;
      },
      addMessageListener(fn){if(typeof fn==='function'&&!listeners.includes(fn))listeners.push(fn)},
      removeMessageListener(fn){listeners=listeners.filter(x=>x!==fn)},
      terminate(){
        if(closed)return;
        closed=true;
        try{syncGet('/__native_engine/close?id='+encodeURIComponent(session))}catch(e){}
        listeners=[];
      }
    };
    return engine;
  };
  self.YaneuraOu_HalfKP_noeval.__fireNative=true;
})();
