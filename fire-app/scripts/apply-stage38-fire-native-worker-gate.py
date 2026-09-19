from pathlib import Path
import runpy

# Stage 3.8 fixes the physical-Fire immediate-stop path and the remaining synchronous-XHR
# transport dependency in one canonical patch. The Android native YaneuraOu path does not need
# crossOriginIsolated/SharedArrayBuffer; browser/WASM paths still do. No strength setting changes.
runpy.run_path('fire-app/scripts/apply-stage37-fire-transport-v2.py', run_name='__main__')


def replace_one(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# Product name is "みつき将棋" in both the Fire app and browser. For the Fire APK, rewrite the
# bundled HTML itself so no old "AI将棋先生" product title flashes before JavaScript starts.
index_html = 'shogi-v21528/index.html'
replace_one(
    index_html,
    '<title>AI将棋先生 v2.15.28</title>',
    '<title>みつき将棋</title>',
    'Fire document title rename',
)
replace_one(
    index_html,
    '<div class="top"><div class="title">☗ AI将棋先生</div>',
    '<div class="top"><div class="title">☗ みつき将棋</div>',
    'Fire visible product title rename',
)

future = 'shogi-side-test/future21520.js'

# Fire native Worker does not use the SharedArrayBuffer WASM path. This was the direct reason
# Stage 3.7 could fail immediately on Fire WebView before the native engine received any command.
replace_one(
    future,
    "    if(!globalThis.crossOriginIsolated)throw new Error('crossOriginIsolated=false');\n",
    "    if(!globalThis.crossOriginIsolated&&!FIRE_NATIVE_APP)throw new Error('crossOriginIsolated=false');\n    if(FIRE_NATIVE_APP&&!globalThis.crossOriginIsolated)setEngineState('⑤-0 FireネイティブWorker起動（COI不要）');\n",
    'Fire native worker COI bypass',
)
replace_one(
    future,
    "  const FIRE_NATIVE_APP=!!window.MitsukiFireNative||/MitsukiShogiFire\\//i.test(navigator.userAgent);\n",
    "  const FIRE_NATIVE_APP=!!window.MitsukiFireNative||/MitsukiShogiFire\\//i.test(navigator.userAgent);\n  if(FIRE_NATIVE_APP)window.AI_SHOGI_FIRE_NATIVE_WORKER_GATE='3.8-coi-bypass';\n",
    'Fire native worker gate diagnostic',
)

# Remove synchronous XMLHttpRequest from the Worker/native bridge. Some Android WebView builds can
# reject or deadlock synchronous XHR in workers. Keep ccall's historical 0=accepted contract while
# serializing the actual localhost commands through an async promise queue.
shim = 'fire-app/app/src/main/assets/fire/yaneuraou-native-shim.js'
replace_one(
    shim,
    '''  function syncGet(path){\n    const xhr=new XMLHttpRequest();\n    xhr.open('GET',path,false);\n    xhr.setRequestHeader('Cache-Control','no-store');\n    xhr.send(null);\n    if(xhr.status<200||xhr.status>=300)throw new Error('native bridge HTTP '+xhr.status+' '+String(xhr.responseText||''));\n    return String(xhr.responseText||'');\n  }\n''',
    '''  async function httpText(path){\n    const r=await realFetch(path,{cache:'no-store'});\n    const text=await r.text();\n    if(!r.ok)throw new Error('native bridge HTTP '+r.status+' '+String(text||''));\n    return String(text||'');\n  }\n''',
    'remove synchronous XHR transport',
)
replace_one(
    shim,
    '''    const rawSession=syncGet('/__native_engine/start').trim();\n    if(!rawSession)throw new Error('native engine session start failed');\n    const warmed=rawSession.startsWith('warm:');\n    const warmParts=warmed?rawSession.split(':'):null;\n    const session=warmed?String(warmParts[1]||''):rawSession;\n    const warmCursor=warmed?Math.max(0,Number(warmParts[2])||0):0;\n    if(!session)throw new Error('native engine session id missing');\n    let cursor=warmCursor,closed=false,listeners=[];\n''',
    '''    const rawSession=(await httpText('/__native_engine/start')).trim();\n    if(!rawSession)throw new Error('native engine session start failed');\n    const warmed=rawSession.startsWith('warm:');\n    const warmParts=warmed?rawSession.split(':'):null;\n    const session=warmed?String(warmParts[1]||''):rawSession;\n    const warmCursor=warmed?Math.max(0,Number(warmParts[2])||0):0;\n    if(!session)throw new Error('native engine session id missing');\n    let cursor=warmCursor,closed=false,listeners=[],bridgeFatal='',commandChain=Promise.resolve();\n    function emitBridgeError(err){\n      const msg=String(err&&err.message||err||'native bridge error');\n      bridgeFatal=msg;\n      for(const fn of listeners.slice())try{fn('info string FIRE_NATIVE_BRIDGE_ERROR '+msg)}catch(_e){}\n    }\n    function enqueueCommand(translated){\n      commandChain=commandChain.then(async()=>{\n        if(closed)throw new Error('native bridge already closed');\n        const text=await httpText('/__native_engine/cmd?id='+encodeURIComponent(session)+'&q='+encodeURIComponent(translated));\n        const rc=Number(text)||0;\n        if(rc!==0)throw new Error('native command rc='+rc+' command='+translated);\n        return rc;\n      }).catch(err=>{emitBridgeError(err);throw err});\n      commandChain.catch(()=>{});\n      return 0;\n    }\n''',
    'async start and serialized command queue',
)
replace_one(
    shim,
    '''      ccall(name,ret,argTypes,args){\n        if(name!=='usi_command')throw new Error('unsupported native ccall '+name);\n        const translated=toNativeUSI(args&&args[0]);\n        if(translated===null)return 0;\n        return Number(syncGet('/__native_engine/cmd?id='+encodeURIComponent(session)+'&q='+encodeURIComponent(translated)))||0;\n      },\n''',
    '''      ccall(name,ret,argTypes,args){\n        if(name!=='usi_command')throw new Error('unsupported native ccall '+name);\n        if(bridgeFatal)throw new Error(bridgeFatal);\n        const translated=toNativeUSI(args&&args[0]);\n        if(translated===null)return 0;\n        return enqueueCommand(translated);\n      },\n''',
    'async queued native command bridge',
)
replace_one(
    shim,
    '''      terminate(){\n        if(closed)return;\n        closed=true;\n        try{syncGet('/__native_engine/close?id='+encodeURIComponent(session))}catch(e){}\n        listeners=[];\n      }\n''',
    '''      terminate(){\n        if(closed)return;\n        closed=true;\n        void httpText('/__native_engine/close?id='+encodeURIComponent(session)).catch(()=>{});\n        listeners=[];\n      },\n      __fireNativeBridgeError(){return bridgeFatal}\n''',
    'async close bridge',
)
replace_one(
    shim,
    "      __fireNativeBridgeVersion:'3.7-longpoll-cursor',\n",
    "      __fireNativeBridgeVersion:'3.7-longpoll-cursor',\n      __fireNativeBridgeRevision:'3.8-coi-async-fetch-queue',\n",
    'Stage 3.8 bridge diagnostic',
)

# Fail the current USI waiter immediately on a native HTTP/command error rather than waiting for a
# generic timeout. This gives the real error reason to the parent UI and avoids repeated new-game loops.
worker = 'shogi-v21528/future-yaneura-worker21528.js'
replace_one(
    worker,
    "  if(line.startsWith('info string FIRE_NATIVE_WATCHDOG_STOP '))stage('⑥-Fire時間監視で停止 '+line.slice('info string FIRE_NATIVE_WATCHDOG_STOP '.length));\n",
    "  if(line.startsWith('info string FIRE_NATIVE_WATCHDOG_STOP '))stage('⑥-Fire時間監視で停止 '+line.slice('info string FIRE_NATIVE_WATCHDOG_STOP '.length));\n  if(line.startsWith('info string FIRE_NATIVE_BRIDGE_ERROR ')){const msg=line.slice('info string FIRE_NATIVE_BRIDGE_ERROR '.length);stage('⑤-Fire通信エラー '+msg);const doomed=waiters.slice();waiters=[];for(const w of doomed){clearTimeout(w.timer);try{w.reject(new Error('Fire native bridge: '+msg))}catch(e){}}return}\n",
    'reject worker waiters on native bridge error',
)

# Show the concrete transport error instead of only the generic retry instruction.
replace_one(
    future,
    "setStatus(FUTURE_NAME+'のやねうら王を再起動できませんでした。弱い内蔵AIには切り替えず停止しました。新規対局で再試行してください。');return",
    "setStatus(FUTURE_NAME+'のやねうら王を再起動できませんでした。原因: '+String(engineError||'不明').slice(0,180)+'。弱い内蔵AIには切り替えず停止しました。');return",
    'Future visible Fire failure reason',
)
for path in [
    'shogi-side-test/top5-yaneura21529.js',
    'shogi-side-test/cohort7-12-yaneura21533.js',
    'shogi-side-test/cohort13-18-yaneura21534.js',
    'shogi-side-test/cohort19-26-yaneura21536.js',
]:
    replace_one(
        path,
        "setStatus(charName+'のやねうら王を再起動できませんでした。弱い内蔵AIには切り替えず停止しました。新規対局で再試行してください。');return",
        "setStatus(charName+'のやねうら王を再起動できませんでした。原因: '+String(engineError||'不明').slice(0,180)+'。弱い内蔵AIには切り替えず停止しました。');return",
        f'visible Fire failure reason {path}',
    )

# Keep every Stage 3.7 strength/transport parameter. Version only. The existing canonical workflow
# checks this version name; the additional async bridge revision is exposed separately above.
gradle = 'fire-app/app/build.gradle.kts'
replace_one(
    gradle,
    '        versionCode = 7\n        versionName = "3.7-fire-native-v970-transport-v2"',
    '        versionCode = 8\n        versionName = "3.8-fire-native-v970-worker-gate"',
    'Stage 3.8 APK version',
)
activity = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/MainActivity.java'
replace_one(
    activity,
    ' Silk/MitsukiFire MitsukiShogiFire/3.0 native-v970 baseline/',
    ' Silk/MitsukiFire MitsukiShogiFire/3.8 native-v970 baseline/',
    'Stage 3.8 Fire user agent',
)

print('PASS_STAGE38_FIRE_COI_ASYNC_BRIDGE')