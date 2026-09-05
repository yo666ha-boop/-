from pathlib import Path


def replace_one(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def replace_each(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count < 1:
        raise SystemExit(f'{label}: expected at least one match in {path}, found {count}')
    p.write_text(s.replace(old, new), encoding='utf-8')
    return count


# 1) Native manager: do not launch a second heavy self-test beside gameplay.
manager = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/NativeEngineManager.java'
replace_one(
    manager,
    '    synchronized JSONObject selfTest() {',
    '    JSONObject selfTest() {',
    'selfTest global lock removal',
)

preflight_anchor = '''    private void ensurePrepared() throws IOException {\n'''
preflight = '''    synchronized JSONObject preflight() {\n        JSONObject out = new JSONObject();\n        try {\n            ensurePrepared();\n            out.put("ok", true);\n            out.put("runtime", runtimeInfo());\n            out.put("engine", "YaneuraOu V9.70 Android NDK + Suisho5");\n            out.put("mode", "lightweight-no-second-engine-process");\n        } catch (Throwable e) {\n            try {\n                out.put("ok", false);\n                out.put("error", e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()));\n                out.put("runtime", runtimeInfo());\n            } catch (Exception ignored) {}\n        }\n        return out;\n    }\n\n    private void ensurePrepared() throws IOException {\n'''
replace_one(manager, preflight_anchor, preflight, 'lightweight preflight insertion')

old_start = '''    synchronized String startSession() throws IOException {\n        ensurePrepared();\n        String id = UUID.randomUUID().toString().replace("-", "");\n        Session s = new Session(id);\n        sessions.put(id, s);\n        return id;\n    }\n'''
new_start = '''    synchronized String startSession() throws IOException {\n        ensurePrepared();\n        // All 26 characters share one gameplay worker. If a Web Worker was force-terminated,\n        // its localhost close request may never run, leaving an orphan native YaneuraOu process.\n        // Reap every older session before starting the replacement so Fire cannot accumulate\n        // 64MB NNUE + hash/process copies and spiral into repeated bestmove timeouts.\n        if (!sessions.isEmpty()) {\n            Log.w(TAG, "reaping " + sessions.size() + " stale native engine session(s) before gameplay restart");\n            for (Session old : new ArrayList<>(sessions.values())) old.close();\n            sessions.clear();\n        }\n        String id = UUID.randomUUID().toString().replace("-", "");\n        Session s = new Session(id);\n        sessions.put(id, s);\n        return id;\n    }\n'''
replace_one(manager, old_start, new_start, 'stale native session reap')

# 2) Loopback/MainActivity startup guard: prepare binary+NNUE without spawning another engine.
loopback = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/LoopbackHttpServer.java'
replace_one(
    loopback,
    '    JSONObject nativeSelfTest() { return nativeEngine.selfTest(); }',
    '    JSONObject nativePreflight() { return nativeEngine.preflight(); }\n    JSONObject nativeSelfTest() { return nativeEngine.selfTest(); }',
    'loopback preflight bridge',
)
replace_one(
    loopback,
    '            writeJson(out, nativeEngine.selfTest(), false);',
    '            writeJson(out, nativeEngine.preflight(), false);',
    'health uses lightweight preflight',
)

activity = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/MainActivity.java'
replace_one(
    activity,
    '            JSONObject result = loopbackServer == null ? null : loopbackServer.nativeSelfTest();',
    '            JSONObject result = loopbackServer == null ? null : loopbackServer.nativePreflight();',
    'startup guard uses preflight',
)
old_pass = '''            final boolean pass = result != null && result.optBoolean("ok", false)\n                && result.optBoolean("usiok", false)\n                && result.optBoolean("readyok", false)\n                && result.optBoolean("searched", false)\n                && !result.optString("bestmove", "").isEmpty()\n                && result.optString("engine", "").contains("YaneuraOu V9.70")\n                && result.optString("runtime", "").contains("binaryExecutable=true")\n                && result.optString("runtime", "").contains("evalReady=true")\n                && result.optString("runtime", "").contains("/eval/nn.bin");\n'''
new_pass = '''            final boolean pass = result != null && result.optBoolean("ok", false)\n                && result.optString("engine", "").contains("YaneuraOu V9.70")\n                && result.optString("runtime", "").contains("binaryExecutable=true")\n                && result.optString("runtime", "").contains("evalReady=true")\n                && result.optString("runtime", "").contains("/eval/nn.bin");\n'''
replace_one(activity, old_pass, new_pass, 'startup preflight pass contract')

# 3) Worker: explicitly close the localhost native session on any Fire engine error.
worker = 'shogi-v21528/future-yaneura-worker21528.js'
worker_anchor = "const sleep=ms=>new Promise(r=>setTimeout(r,ms));\n"
worker_reset = """const sleep=ms=>new Promise(r=>setTimeout(r,ms));\nfunction resetNativeTransport(reason=''){\n  const old=engine;engine=null;ready=false;initPromise=null;\n  const pending=waiters.slice();waiters=[];\n  for(const w of pending){clearTimeout(w.timer);try{w.reject(new Error(reason||'native transport reset'))}catch(e){}}\n  try{if(old&&typeof old.terminate==='function')old.terminate()}catch(e){}\n  if(reason)stage('⑤-R Fireネイティブ再起動準備: '+String(reason).slice(0,120));\n}\n"""
replace_one(worker, worker_anchor, worker_reset, 'worker native reset helper')
replace_one(
    worker,
    "    if(m.type==='stop'){try{if(engine)await sendUSI('stop')}catch(e){};return}\n",
    "    if(m.type==='shutdown'){resetNativeTransport('worker shutdown');self.postMessage({type:'result',id,ok:true,kind:'shutdown'});return}\n    if(m.type==='stop'){try{if(engine)await sendUSI('stop')}catch(e){};return}\n",
    'worker shutdown protocol',
)
replace_one(
    worker,
    "  }catch(e){const msg=String(e&&e.message||e);stage('⑤失敗 '+msg);self.postMessage({type:'result',id,ok:false,error:msg,mobileWebKit:MOBILE_WEBKIT,fireSilk:FIRE_SILK,mobileSafe:MOBILE_SAFE,threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB});}\n",
    "  }catch(e){const msg=String(e&&e.message||e);stage('⑤失敗 '+msg);if(FIRE_SILK)resetNativeTransport(msg);self.postMessage({type:'result',id,ok:false,error:msg,mobileWebKit:MOBILE_WEBKIT,fireSilk:FIRE_SILK,mobileSafe:MOBILE_SAFE,threads:ENGINE_THREADS,hashMB:ENGINE_HASH_MB});}\n",
    'worker error closes native session',
)

# 4) Shared Future bridge: graceful worker shutdown + one full-strength retry on Fire.
future = 'shogi-side-test/future21520.js'
replace_one(
    future,
    "  const FUTURE_RATING=3400;\n",
    "  const FUTURE_RATING=3400;\n  const FIRE_NATIVE_APP=!!window.MitsukiFireNative||/MitsukiShogiFire\\//i.test(navigator.userAgent);\n",
    'Fire native app detection',
)
old_kill = '''  function killWorker(reason){\n    try{worker?.terminate()}catch(e){}worker=null;engineReady=false;\n    for(const [id,p] of pending){clearTimeout(p.timer);p.reject(new Error(reason||'worker terminated'))}pending.clear();\n  }\n'''
new_kill = '''  function killWorker(reason){\n    const doomed=worker;worker=null;engineReady=false;\n    try{doomed?.postMessage({type:'shutdown',id:0})}catch(e){}\n    if(doomed)setTimeout(()=>{try{doomed.terminate()}catch(e){}},300);\n    for(const [id,p] of pending){clearTimeout(p.timer);p.reject(new Error(reason||'worker terminated'))}pending.clear();\n  }\n'''
replace_one(future, old_kill, new_kill, 'graceful native worker shutdown')
old_init = "  async function initFutureEngine(){if(engineReady&&worker)return true;await callWorker('init',{},75000);engineReady=true;setEngineState('⑤成功 V9.70＋水匠5 接続済み',true);return true}\n"
new_init = """  async function initFutureEngineOnce(){if(engineReady&&worker)return true;await callWorker('init',{},75000);engineReady=true;setEngineState('⑤成功 V9.70＋水匠5 接続済み',true);return true}\n  async function initFutureEngine(){\n    try{return await initFutureEngineOnce()}catch(first){\n      if(!FIRE_NATIVE_APP)throw first;\n      engineError=String(first&&first.message||first);killWorker('Fire init retry: '+engineError);await sleep(450);\n      try{return await initFutureEngineOnce()}catch(second){engineError='Fire再起動失敗: '+String(second&&second.message||second);throw new Error(engineError)}\n    }\n  }\n"""
replace_one(future, old_init, new_init, 'Fire init retry')
replace_one(future, '  async function futureBest(s,opts={}){\n', '  async function futureBestOnce(s,opts={}){\n', 'rename futureBest once')
future_wrapper_anchor = '  const aiMoveBase=aiMove;\n'
future_wrapper = '''  async function futureBest(s,opts={}){\n    try{return await futureBestOnce(s,opts)}catch(first){\n      if(!FIRE_NATIVE_APP)throw first;\n      engineError=String(first&&first.message||first);setEngineState('⑤-R Fireネイティブ再起動中: '+engineError);killWorker('Fire search retry: '+engineError);await sleep(450);\n      try{return await futureBestOnce(s,opts)}catch(second){engineError='Fire再探索失敗: '+String(second&&second.message||second);throw new Error(engineError)}\n    }\n  }\n\n  const aiMoveBase=aiMove;\n'''
replace_one(future, future_wrapper_anchor, future_wrapper, 'Fire full-strength search retry')

strict_future_old = "console.error('Future Mitsuki worker fallback',e);setEngineState('⑤失敗 → 内蔵MAXへ退避: '+engineError);killWorker(engineError);const fb=chooseAI(clone(startState),0);"
strict_future_new = "console.error('Future Mitsuki worker failure',e);if(FIRE_NATIVE_APP){thinking=false;setEngineState('⑤失敗・弱いAIへ退避せず停止: '+engineError);setStatus(FUTURE_NAME+'のやねうら王を再起動できませんでした。弱い内蔵AIには切り替えず停止しました。新規対局で再試行してください。');return}setEngineState('⑤失敗 → 内蔵MAXへ退避: '+engineError);killWorker(engineError);const fb=chooseAI(clone(startState),0);"
replace_one(future, strict_future_old, strict_future_new, 'Future no weak fallback on Fire')

# 5) Top5 and all cohorts: shared.bestMove already retries once; after a second failure,
# Fire must stop rather than silently choose the weaker built-in AI. Browser behavior is unchanged.
cohorts = [
    'shogi-side-test/top5-yaneura21529.js',
    'shogi-side-test/cohort7-12-yaneura21533.js',
    'shogi-side-test/cohort13-18-yaneura21534.js',
    'shogi-side-test/cohort19-26-yaneura21536.js',
]
old_fb = "const fb=chooseAI(clone(startState),startCi);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵AI fallback',error:engineError}}"
new_fb = "if(window.MitsukiFireNative||/MitsukiShogiFire\\//i.test(navigator.userAgent)){thinking=false;setStatus(charName+'のやねうら王を再起動できませんでした。弱い内蔵AIには切り替えず停止しました。新規対局で再試行してください。');return}const fb=chooseAI(clone(startState),startCi);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵AI fallback',error:engineError}}"
for path in cohorts:
    replace_one(path, old_fb, new_fb, f'Fire strict no fallback {path}')

# 6) APK version marker only; strength values are intentionally untouched.
gradle = 'fire-app/app/build.gradle.kts'
replace_one(gradle, '        versionCode = 3\n        versionName = "3.0-fire-native-v970"', '        versionCode = 4\n        versionName = "3.4-fire-native-v970-stable-session"', 'Stage 3.4 APK version')

print('PASS_STAGE34_FIRE_RUNTIME_PATCH')
