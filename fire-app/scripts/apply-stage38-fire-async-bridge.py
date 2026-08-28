from pathlib import Path
import runpy
import shutil

# Stage 3.8 keeps every Stage 3.7 transport/strength fix, then removes the last synchronous-XHR
# dependency from the Fire Web Worker. Browser production does not use this shim and is unchanged.
# The Android app already contains the canonical Micchan portrait at shogi/micchan21528.jpg; use
# that exact existing character image as the launcher icon without redrawing or changing the art.
runpy.run_path('fire-app/scripts/apply-stage37-fire-transport-v2.py', run_name='__main__')


def replace_one(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


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
    '''    const rawSession=(await httpText('/__native_engine/start')).trim();\n    if(!rawSession)throw new Error('native engine session start failed');\n    const warmed=rawSession.startsWith('warm:');\n    const warmParts=warmed?rawSession.split(':'):null;\n    const session=warmed?String(warmParts[1]||''):rawSession;\n    const warmCursor=warmed?Math.max(0,Number(warmParts[2])||0):0;\n    if(!session)throw new Error('native engine session id missing');\n    let cursor=warmCursor,closed=false,listeners=[],bridgeFatal='',commandChain=Promise.resolve();\n    function emitBridgeError(err){\n      const msg=String(err&&err.message||err||'native bridge error');\n      bridgeFatal=msg;\n      for(const fn of listeners.slice())try{fn('info string FIRE_NATIVE_BRIDGE_ERROR '+msg)}catch(_e){}\n    }\n    function enqueueCommand(translated){\n      commandChain=commandChain.then(async()=>{\n        if(closed)throw new Error('native bridge already closed');\n        const text=await httpText('/__native_engine/cmd?id='+encodeURIComponent(session)+'&q='+encodeURIComponent(translated));\n        const rc=Number(text)||0;\n        if(rc!==0)throw new Error('native command rc='+rc+' command='+translated);\n        return rc;\n      }).catch(err=>{emitBridgeError(err);throw err});\n      // ccall is historically synchronous. The Fire worker only needs its 0=accepted contract;\n      // actual command ordering is guaranteed by commandChain and output is still awaited normally.\n      commandChain.catch(()=>{});\n      return 0;\n    }\n''',
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
    "      __fireNativeBridgeVersion:'3.8-async-fetch-queue',\n",
    'Stage 3.8 bridge version',
)

worker = 'shogi-v21528/future-yaneura-worker21528.js'
replace_one(
    worker,
    "  if(line.startsWith('info string FIRE_NATIVE_WATCHDOG_STOP '))stage('⑥-Fire時間監視で停止 '+line.slice('info string FIRE_NATIVE_WATCHDOG_STOP '.length));\n",
    "  if(line.startsWith('info string FIRE_NATIVE_WATCHDOG_STOP '))stage('⑥-Fire時間監視で停止 '+line.slice('info string FIRE_NATIVE_WATCHDOG_STOP '.length));\n  if(line.startsWith('info string FIRE_NATIVE_BRIDGE_ERROR ')){const msg=line.slice('info string FIRE_NATIVE_BRIDGE_ERROR '.length);stage('⑤-Fire通信エラー '+msg);const doomed=waiters.slice();waiters=[];for(const w of doomed){clearTimeout(w.timer);try{w.reject(new Error('Fire native bridge: '+msg))}catch(e){}}return}\n",
    'reject worker waiters on native bridge error',
)

# Show the actual transport failure on the Fire status line instead of only the generic new-game text.
future = 'shogi-side-test/future21520.js'
replace_one(
    future,
    "setStatus(FUTURE_NAME+'のやねうら王を再起動できませんでした。弱い内蔵AIには切り替えず停止しました。新規対局で再試行してください。');return",
    "setStatus(FUTURE_NAME+'のやねうら王を再起動できませんでした。原因: '+String(engineError||'不明').slice(0,180)+'。弱い内蔵AIには切り替えず停止しました。');return",
    'Future visible Fire failure reason',
)

cohorts = [
    'shogi-side-test/top5-yaneura21529.js',
    'shogi-side-test/cohort7-12-yaneura21533.js',
    'shogi-side-test/cohort13-18-yaneura21534.js',
    'shogi-side-test/cohort19-26-yaneura21536.js',
]
for path in cohorts:
    replace_one(
        path,
        "setStatus(charName+'のやねうら王を再起動できませんでした。弱い内蔵AIには切り替えず停止しました。新規対局で再試行してください。');return",
        "setStatus(charName+'のやねうら王を再起動できませんでした。原因: '+String(engineError||'不明').slice(0,180)+'。弱い内蔵AIには切り替えず停止しました。');return",
        f'visible Fire failure reason {path}',
    )

# Use the exact existing in-app Micchan image as the Android launcher icon.
icon_src = Path('shogi/micchan21528.jpg')
if not icon_src.is_file() or icon_src.stat().st_size < 1000:
    raise SystemExit('canonical Micchan image missing: shogi/micchan21528.jpg')
icon_dir = Path('fire-app/app/src/main/res/drawable-nodpi')
icon_dir.mkdir(parents=True, exist_ok=True)
icon_dst = icon_dir / 'ic_launcher_micchan.jpg'
shutil.copyfile(icon_src, icon_dst)

manifest = 'fire-app/app/src/main/AndroidManifest.xml'
replace_one(manifest, 'android:icon="@drawable/ic_launcher"', 'android:icon="@drawable/ic_launcher_micchan"', 'Micchan launcher icon')
replace_one(manifest, 'android:roundIcon="@drawable/ic_launcher"', 'android:roundIcon="@drawable/ic_launcher_micchan"', 'Micchan round launcher icon')

gradle = 'fire-app/app/build.gradle.kts'
replace_one(
    gradle,
    '        versionCode = 7\n        versionName = "3.7-fire-native-v970-transport-v2"',
    '        versionCode = 8\n        versionName = "3.8-fire-native-v970-async-bridge"',
    'Stage 3.8 APK version',
)

print('PASS_STAGE38_FIRE_ASYNC_BRIDGE_MICCHAN_ICON')
