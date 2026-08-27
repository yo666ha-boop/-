/* AI将棋先生 v2.15.28 - player profile rating/stats cloud persistence */
(function installProfileStats21535(){
  if(window.__AI_SHOGI_PROFILE_STATS_21535A)return;
  window.__AI_SHOGI_PROFILE_STATS_21535A=true;

  const GLOBAL_STATS_KEY='aiShogiSenseiStatsV27';
  const SAVE_KEY='aiShogiGameSaveV1';
  const CFG_KEY='aiShogiCloudConfigV1';
  const CACHE_KEY='aiShogiProfileStatsV1';
  const VERSION=1;
  const normalize=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const readJson=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}};
  const cfg=()=>readJson(CFG_KEY,{})||{};
  const countChars=()=>{try{return Math.max(1,window.AIShogiIOS?.characters?.().length||26)}catch(e){return 26}};
  const freshStats=()=>({rating:1500,w:0,l:0,d:0,chars:Array.from({length:countChars()},()=>({w:0,l:0,d:0}))});
  const int=v=>Math.max(0,Math.floor(Number(v)||0));
  const validRating=v=>Number.isFinite(Number(v));
  const normalizeStats=value=>{
    const n=countChars(),src=value&&typeof value==='object'?value:{};
    const out={
      rating:validRating(src.rating)?Math.max(600,Math.min(3400,Math.round(Number(src.rating)))):1500,
      w:int(src.w),l:int(src.l),d:int(src.d),chars:[]
    };
    const arr=Array.isArray(src.chars)?src.chars:[];
    for(let i=0;i<n;i++){const c=arr[i]&&typeof arr[i]==='object'?arr[i]:{};out.chars.push({w:int(c.w),l:int(c.l),d:int(c.d)})}
    return out;
  };
  const cloneStats=value=>JSON.parse(JSON.stringify(normalizeStats(value)));
  const currentStats=()=>{try{return window.AIShogiIOS?.stats?.()||null}catch(e){return null}};
  const currentProfile=()=>{
    const c=cfg(),slotId=String(c.activeSlotId||''),slotName=normalize(c.activeSlotName||''),familyCode=normalize(c.familyCode||''),syncKey=String(c.syncKey||'');
    const family=familyCode||syncKey;
    return {familyCode,slotId,slotName,key:family&&slotId?family+'::'+slotId:''};
  };
  const readCache=()=>{const x=readJson(CACHE_KEY,{version:VERSION,profiles:{}});return x&&typeof x==='object'&&x.profiles&&typeof x.profiles==='object'?x:{version:VERSION,profiles:{}}};
  function cacheStats(key,value){if(!key)return;const store=readCache();store.version=VERSION;store.profiles[key]=cloneStats(value);writeJson(CACHE_KEY,store)}
  function cachedStats(key){if(!key)return null;const x=readCache().profiles[key];return x?normalizeStats(x):null}
  function mutateCurrent(value){
    const target=currentStats();if(!target)return false;const src=normalizeStats(value);
    target.rating=src.rating;target.w=src.w;target.l=src.l;target.d=src.d;target.chars=src.chars.map(x=>({...x}));
    writeJson(GLOBAL_STATS_KEY,src);return true;
  }
  function selectedOpponent(){
    try{
      const raw=window.AIShogiIOS?.char?.(),chars=window.AIShogiIOS?.characters?.()||[];
      const name=Array.isArray(raw)?String(raw[0]||''):'';
      let idx=chars.findIndex(x=>x?.name===name);if(idx<0)idx=0;
      return {name:name||chars[idx]?.name||'相手',idx};
    }catch(e){return {name:'相手',idx:0}}
  }
  function playerName(){return normalize(window.AI_SHOGI_CLOUD_SAVE?.audit?.()?.activeSlotName||'')||'あなた'}
  function renderStats(){
    const s=normalizeStats(currentStats()||freshStats()),opp=selectedOpponent(),cs=s.chars[opp.idx]||{w:0,l:0,d:0},name=playerName();
    const main=document.getElementById('statsMain'),sub=document.getElementById('statsSub');
    if(main)main.textContent=name+' R'+s.rating;
    if(sub)sub.textContent=s.w+'勝 '+s.l+'敗 '+s.d+'分　vs '+opp.name+' '+cs.w+'-'+cs.l+'-'+cs.d;
    try{window.AI_SHOGI_PLAYER_NAME?.sync?.()}catch(e){}
  }
  function validSave(x){return !!(x&&x.version===1&&x.st&&Array.isArray(x.st.b)&&x.st.b.length===81&&Array.isArray(x.st.log))}
  function enrichLocalSave(value=null){
    const x=readJson(SAVE_KEY,null);if(!validSave(x))return false;const p=currentProfile(),s=normalizeStats(value||currentStats()||freshStats());
    x.playerStats={version:VERSION,...cloneStats(s)};
    x.playerProfile={slotId:p.slotId,slotName:p.slotName,familyCode:p.familyCode};
    writeJson(SAVE_KEY,x);if(p.key)cacheStats(p.key,s);return true;
  }
  function applyForActive({migrateCurrent=false,forceFresh=false}={}){
    const p=currentProfile(),x=readJson(SAVE_KEY,null),before=normalizeStats(currentStats()||freshStats());let src=null,source='global';
    if(forceFresh){src=freshStats();source='fresh'}
    else if(validSave(x)&&x.playerStats){src=normalizeStats(x.playerStats);source='save'}
    else if(p.key&&cachedStats(p.key)){src=cachedStats(p.key);source='cache'}
    else if(p.key&&migrateCurrent){src=before;source='migrated-current'}
    else if(p.key){src=freshStats();source='fresh-profile'}
    else src=before;
    mutateCurrent(src);if(p.key&&validSave(x))enrichLocalSave(src);else if(p.key)cacheStats(p.key,src);renderStats();
    return {ok:true,source,profile:p,stats:cloneStats(src)};
  }
  function cacheCurrentProfile(){const p=currentProfile(),s=currentStats();if(p.key&&s)cacheStats(p.key,s)}

  function wrapSaveApi(){
    const api=window.AI_SHOGI_SAVE;if(!api||api.__profileStats21535)return false;api.__profileStats21535=true;
    for(const key of ['load','restore']){
      const base=api[key];if(typeof base!=='function')continue;
      api[key]=function(...args){const out=base.apply(this,args);if(out)applyForActive({migrateCurrent:false});return out};
    }
    return true;
  }
  function wrapCloudApi(){
    const api=window.AI_SHOGI_CLOUD_SAVE;if(!api||api.__profileStats21535)return false;api.__profileStats21535=true;
    const baseEnable=api.enableWithCode;
    if(typeof baseEnable==='function')api.enableWithCode=async function(code,opts={}){
      cacheCurrentProfile();const out=await baseEnable.call(this,code,opts);
      if(out&&opts?.slotId&&opts?.slotName){
        const isNew=Number(opts.revision||0)===0&&Number(opts.savedAt||0)===0;
        if(isNew){applyForActive({forceFresh:true});enrichLocalSave();}
      }
      return out;
    };
    const basePush=api.push;
    if(typeof basePush==='function')api.push=function(...args){enrichLocalSave();return basePush.apply(this,args)};
    return true;
  }
  function install(){
    if(!window.AIShogiIOS||!window.AI_SHOGI_SAVE||!window.AI_SHOGI_CLOUD_SAVE)return false;
    wrapSaveApi();wrapCloudApi();
    const p=currentProfile();applyForActive({migrateCurrent:!!p.key});
    return true;
  }

  window.addEventListener('ai-shogi-local-save',()=>{enrichLocalSave();renderStats()});
  document.addEventListener('click',e=>{if(e.target?.id==='resetStatsBtn')setTimeout(()=>{enrichLocalSave();renderStats();try{window.AI_SHOGI_CLOUD_SAVE?.push?.()}catch(err){}},80)});
  let tries=0;const boot=setInterval(()=>{if(install()||++tries>160)clearInterval(boot)},100);
  let lastKey='';setInterval(()=>{
    const p=currentProfile();if(p.key!==lastKey){lastKey=p.key;if(p.key)applyForActive({migrateCurrent:false});else renderStats()}else renderStats();
  },900);

  window.AI_SHOGI_PROFILE_STATS={
    version:'21535a',
    current:()=>cloneStats(currentStats()||freshStats()),
    profile:currentProfile,
    fresh:freshStats,
    saveNow:()=>{const ok=enrichLocalSave();if(ok)try{window.AI_SHOGI_CLOUD_SAVE?.push?.()}catch(e){}return ok},
    apply:()=>applyForActive({migrateCurrent:false}),
    audit:()=>{const p=currentProfile(),x=readJson(SAVE_KEY,null),s=normalizeStats(currentStats()||freshStats());return{ok:true,profileKey:p.key,slotName:p.slotName,rating:s.rating,w:s.w,l:s.l,d:s.d,payloadHasStats:!!x?.playerStats,cacheHasStats:!!cachedStats(p.key)}}
  };
})();
