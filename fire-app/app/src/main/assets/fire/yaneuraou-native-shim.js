/* Fire Stage 3.2: worker-side shim for native Android YaneuraOu V9.70.
 * It preserves the existing Emscripten-facing API used by the browser workers while replacing
 * only the low-level engine transport. Character/profile/rating selection stays unchanged.
 *
 * Physical Fire feedback showed that using the browser-era single-thread/short-time budgets on
 * the tablet made the native engine far weaker than the completed browser baseline. Fire-only
 * transport therefore gives the SAME YaneuraOu+Suisho5 searches more native CPU budget before the
 * unchanged character layer applies its existing MultiPV/cp-loss/personality selection.
 */
(function(){
  'use strict';
  const realFetch=self.fetch.bind(self);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const isEvalUrl=input=>{try{return /\/nn\.bin(?:[?#]|$)/.test(String(input&&input.url||input||''));}catch(e){return false}};

  const FIRE_THREADS=2;
  const FIRE_HASH_MB=96;
  const FIRE_NODE_MULTIPLIER=2;

  // Keep worker-side timeout compatibility: the original workers wait roughly requestedMs+10s.
  // Short searches need the largest correction on Fire; long searches are doubled and stay below
  // the existing timeout margin. This strengthens the underlying read without changing rank/cp-loss.
  function boostedMovetime(ms){
    const n=Math.max(1,Math.round(Number(ms)||1));
    const factor=n<1000?4:n<3000?3:2;
    return Math.min(n*factor,n+8000);
  }

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

  // Browser workers were written for the Emscripten build. On Fire, translate only transport and
  // CPU-budget details. The high-level character logic (MultiPV, target loss, max loss, personality,
  // mate-best handling and displayed rating) remains untouched.
  function toNativeUSI(command){
    const cmd=String(command||'').trim();
    if(/^setoption\s+name\s+EvalDir\s+value(?:\s|$)/i.test(cmd))return 'setoption name EvalDir value eval';
    if(/^setoption\s+name\s+EvalFile\s+value(?:\s|$)/i.test(cmd))return null;

    let m=/^setoption\s+name\s+Threads\s+value\s+(\d+)\s*$/i.exec(cmd);
    if(m)return 'setoption name Threads value '+Math.max(FIRE_THREADS,Number(m[1])||1);

    m=/^setoption\s+name\s+USI_Hash\s+value\s+(\d+)\s*$/i.exec(cmd);
    if(m)return 'setoption name USI_Hash value '+Math.max(FIRE_HASH_MB,Number(m[1])||1);

    m=/^go\s+movetime\s+(\d+)(.*)$/i.exec(cmd);
    if(m)return 'go movetime '+boostedMovetime(Number(m[1]))+String(m[2]||'');

    m=/^go\s+nodes\s+(\d+)(.*)$/i.exec(cmd);
    if(m){
      const nodes=Math.max(1,Math.round((Number(m[1])||1)*FIRE_NODE_MULTIPLIER));
      return 'go nodes '+nodes+String(m[2]||'');
    }
    return cmd;
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
        const translated=toNativeUSI(args&&args[0]);
        if(translated===null)return 0;
        return Number(syncGet('/__native_engine/cmd?id='+encodeURIComponent(session)+'&q='+encodeURIComponent(translated)))||0;
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
  self.YaneuraOu_HalfKP_noeval.__fireNativeEvalDir='eval';
  self.YaneuraOu_HalfKP_noeval.__fireStrength={threads:FIRE_THREADS,hashMB:FIRE_HASH_MB,nodeMultiplier:FIRE_NODE_MULTIPLIER};
})();
