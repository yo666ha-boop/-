from pathlib import Path
import runpy

# Keep every Stage 3.4 stability / no-weak-fallback fix, then add a single persistent
# native-engine prewarm session. The warmed process is claimed by the actual Web Worker,
# so startup never launches a second YaneuraOu and the first move does not pay usi/isready/NNUE cost.
runpy.run_path('fire-app/scripts/apply-stage34-fire-runtime.py', run_name='__main__')


def replace_one(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


manager = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/NativeEngineManager.java'
replace_one(
    manager,
    '    private final Map<String, Session> sessions = new HashMap<>();\n',
    '    private final Map<String, Session> sessions = new HashMap<>();\n    private String warmedSessionId;\n',
    'warmed session field',
)

start_anchor = '''    synchronized String startSession() throws IOException {\n        ensurePrepared();\n        // All 26 characters share one gameplay worker. If a Web Worker was force-terminated,\n        // its localhost close request may never run, leaving an orphan native YaneuraOu process.\n        // Reap every older session before starting the replacement so Fire cannot accumulate\n        // 64MB NNUE + hash/process copies and spiral into repeated bestmove timeouts.\n        if (!sessions.isEmpty()) {\n            Log.w(TAG, "reaping " + sessions.size() + " stale native engine session(s) before gameplay restart");\n            for (Session old : new ArrayList<>(sessions.values())) old.close();\n            sessions.clear();\n        }\n        String id = UUID.randomUUID().toString().replace("-", "");\n        Session s = new Session(id);\n        sessions.put(id, s);\n        return id;\n    }\n'''

warm_and_start = '''    /**\n     * Stage 3.5 Fire first-move prewarm. Start exactly one real gameplay YaneuraOu process,\n     * complete the same strong native options + Suisho5 isready, and run one tiny legal search.\n     * The process remains alive and startSession() hands this exact session to the Web Worker.\n     * No second diagnostic engine is started and no strength/search option is reduced.\n     */\n    JSONObject warmupGameplaySession() {\n        JSONObject out = new JSONObject();\n        String id = null;\n        StringBuilder transcript = new StringBuilder();\n        try {\n            synchronized (this) {\n                ensurePrepared();\n                if (!sessions.isEmpty()) {\n                    for (Session old : new ArrayList<>(sessions.values())) old.close();\n                    sessions.clear();\n                }\n                warmedSessionId = null;\n                id = UUID.randomUUID().toString().replace("-", "");\n                Session s = new Session(id);\n                sessions.put(id, s);\n            }\n\n            long cursor = 0;\n            command(id, "usi");\n            WaitResult usi = waitFor(id, cursor, "usiok", 15000L, transcript);\n            cursor = usi.cursor;\n            if (!usi.matched) throw new IOException("usiok timeout during Fire gameplay prewarm");\n\n            // Match the Stage 3.2 Fire transport floors and the production worker options.\n            command(id, EVAL_DIR_OPTION + " " + evalDir.getAbsolutePath());\n            command(id, "setoption name FV_SCALE value 24");\n            command(id, "setoption name USI_Hash value 96");\n            command(id, "setoption name Threads value 2");\n            command(id, "setoption name MultiPV value 1");\n            command(id, "isready");\n            WaitResult ready = waitFor(id, cursor, "readyok", 90000L, transcript);\n            cursor = ready.cursor;\n            if (!ready.matched) throw new IOException("readyok timeout during Fire gameplay prewarm");\n\n            command(id, "setoption name USI_Ponder value false");\n            command(id, "usinewgame");\n            // Exercise the real NNUE/search path once so first user move does not pay lazy init cost.\n            command(id, "position startpos");\n            command(id, "go movetime 120");\n            WaitResult searched = waitForPrefix(id, cursor, "bestmove ", 20000L, transcript);\n            cursor = searched.cursor;\n            if (!searched.matched) throw new IOException("bestmove timeout during Fire gameplay prewarm");\n            String bestmove = searched.matchedLine == null ? "" : searched.matchedLine.substring("bestmove ".length()).trim();\n            if (bestmove.isEmpty() || "resign".equals(bestmove) || "win".equals(bestmove)) {\n                throw new IOException("unexpected Fire prewarm bestmove: " + bestmove);\n            }\n            command(id, "usinewgame");\n\n            synchronized (this) {\n                Session s = sessions.get(id);\n                if (s == null || !s.isAlive()) throw new IOException("prewarmed native session exited before handoff");\n                warmedSessionId = id;\n            }\n            out.put("ok", true);\n            out.put("usiok", true);\n            out.put("readyok", true);\n            out.put("searched", true);\n            out.put("bestmove", bestmove);\n            out.put("warmSession", true);\n            out.put("engine", "YaneuraOu V9.70 Android NDK + Suisho5");\n            out.put("runtime", runtimeInfo());\n            out.put("transcriptTail", tail(transcript.toString(), 1800));\n        } catch (Throwable e) {\n            synchronized (this) {\n                if (id != null) closeSession(id);\n                if (id != null && id.equals(warmedSessionId)) warmedSessionId = null;\n            }\n            try {\n                out.put("ok", false);\n                out.put("error", e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()));\n                out.put("runtime", runtimeInfo());\n                out.put("transcriptTail", tail(transcript.toString(), 2200));\n            } catch (Exception ignored) {}\n        }\n        return out;\n    }\n\n    synchronized String startSession() throws IOException {\n        ensurePrepared();\n        if (warmedSessionId != null) {\n            String id = warmedSessionId;\n            warmedSessionId = null;\n            Session warmed = sessions.get(id);\n            if (warmed != null && warmed.isAlive()) {\n                Log.i(TAG, "handing prewarmed native YaneuraOu session to gameplay worker");\n                return "warm:" + id;\n            }\n            if (warmed != null) warmed.close();\n            sessions.remove(id);\n        }\n        // If a Web Worker was force-terminated, its close request may never run. Reap stale\n        // sessions before a cold restart so Fire cannot accumulate NNUE/hash/process copies.\n        if (!sessions.isEmpty()) {\n            Log.w(TAG, "reaping " + sessions.size() + " stale native engine session(s) before gameplay restart");\n            for (Session old : new ArrayList<>(sessions.values())) old.close();\n            sessions.clear();\n        }\n        String id = UUID.randomUUID().toString().replace("-", "");\n        Session s = new Session(id);\n        sessions.put(id, s);\n        return id;\n    }\n'''
replace_one(manager, start_anchor, warm_and_start, 'persistent native prewarm + claim')

replace_one(
    manager,
    '''        synchronized JSONObject poll(long cursor) throws Exception {\n''',
    '''        synchronized boolean isAlive() { return !closed && process.isAlive(); }\n\n        synchronized JSONObject poll(long cursor) throws Exception {\n''',
    'session liveness helper',
)

loopback = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/LoopbackHttpServer.java'
replace_one(
    loopback,
    '    JSONObject nativePreflight() { return nativeEngine.preflight(); }\n    JSONObject nativeSelfTest() { return nativeEngine.selfTest(); }',
    '    JSONObject nativePreflight() { return nativeEngine.preflight(); }\n    JSONObject nativeWarmup() { return nativeEngine.warmupGameplaySession(); }\n    JSONObject nativeSelfTest() { return nativeEngine.selfTest(); }',
    'loopback warmup bridge',
)

activity = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/MainActivity.java'
old_load = '''        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {\n            webView.loadUrl(appUrl);\n        }\n        enterImmersiveMode();\n'''
new_load = '''        // A new native process must be fully warm before the board becomes playable. Restoring\n        // a WebView tied to an old localhost port would bypass this guarantee, so reload the\n        // current local app after the persistent gameplay engine is ready. Game/profile state\n        // itself remains in the existing local/cloud save layer.\n        startNativeWarmupAndLoad();\n        enterImmersiveMode();\n'''
replace_one(activity, old_load, new_load, 'gate board load on native gameplay warmup')

check_anchor = '''    private void checkNativeStrengthGuard() {\n'''
warm_method = '''    private void startNativeWarmupAndLoad() {\n        if (webView == null || loopbackServer == null) return;\n        strengthGuardRunning = true;\n        webView.loadDataWithBaseURL(\n            null,\n            "<html><body style='background:#111;color:#fff;font-family:sans-serif;padding:28px;text-align:center'>" +\n            "<h2>みつき将棋</h2><p>やねうら王＋水匠5を準備しています</p>" +\n            "<p style='font-size:13px;color:#bbb'>初手で長く待たないよう、実戦エンジンを先に完全起動しています。</p></body></html>",\n            "text/html",\n            "UTF-8",\n            null\n        );\n        new Thread(() -> {\n            JSONObject result = loopbackServer == null ? null : loopbackServer.nativeWarmup();\n            final String diagnostic = result == null ? "native gameplay warmup unavailable" : result.toString();\n            final boolean pass = result != null && result.optBoolean("ok", false)\n                && result.optBoolean("usiok", false)\n                && result.optBoolean("readyok", false)\n                && result.optBoolean("searched", false)\n                && result.optBoolean("warmSession", false)\n                && !result.optString("bestmove", "").isEmpty()\n                && result.optString("engine", "").contains("YaneuraOu V9.70")\n                && result.optString("runtime", "").contains("binaryExecutable=true")\n                && result.optString("runtime", "").contains("evalReady=true")\n                && result.optString("runtime", "").contains("/eval/nn.bin");\n            runOnUiThread(() -> {\n                strengthGuardRunning = false;\n                if (isFinishing()) return;\n                if (!pass) {\n                    strengthGuardHandled = true;\n                    refuseWeakFallback(diagnostic);\n                    return;\n                }\n                // The real gameplay process already passed USI, Suisho5 readyok and bestmove.\n                // Skip the old lightweight guard and hand this exact process to the worker.\n                strengthGuardHandled = true;\n                webView.loadUrl(appUrl);\n            });\n        }, "mitsuki-native-gameplay-prewarm").start();\n    }\n\n    private void checkNativeStrengthGuard() {\n'''
replace_one(activity, check_anchor, warm_method, 'startup persistent gameplay prewarm')

shim = 'fire-app/app/src/main/assets/fire/yaneuraou-native-shim.js'
replace_one(
    shim,
    '''    const session=syncGet('/__native_engine/start').trim();\n    if(!session)throw new Error('native engine session start failed');\n    let cursor=0,closed=false,listeners=[];\n''',
    '''    const rawSession=syncGet('/__native_engine/start').trim();\n    if(!rawSession)throw new Error('native engine session start failed');\n    const warmed=rawSession.startsWith('warm:');\n    const session=warmed?rawSession.slice(5):rawSession;\n    if(!session)throw new Error('native engine session id missing');\n    let cursor=0,closed=false,listeners=[];\n''',
    'shim claims warmed native session',
)
replace_one(
    shim,
    '''      FS:{unlink(){},writeFile(){}},\n''',
    '''      FS:{unlink(){},writeFile(){}},\n      __fireNativeWarmReady:warmed,\n''',
    'shim warm-ready signal',
)

worker = 'shogi-v21528/future-yaneura-worker21528.js'
worker_anchor = '''    stage('⑤-2 Worker内 Wasm本体起動完了');\n    stage('⑤-3 水匠5 64MB取得中');\n'''
worker_warm = '''    stage('⑤-2 Worker内 Wasm本体起動完了');\n    if(engine.__fireNativeWarmReady){\n      engine.addMessageListener(onLine);\n      ready=true;\n      stage('⑤成功 Fire事前初期化済みV9.70＋水匠5セッション引継ぎ');\n      return engine;\n    }\n    stage('⑤-3 水匠5 64MB取得中');\n'''
replace_one(worker, worker_anchor, worker_warm, 'worker skips duplicate init on warmed Fire session')

# Stage 3.5 version marker. Stage 3.4 already changed 3 -> 4.
gradle = 'fire-app/app/build.gradle.kts'
replace_one(
    gradle,
    '        versionCode = 4\n        versionName = "3.4-fire-native-v970-stable-session"',
    '        versionCode = 5\n        versionName = "3.5-fire-native-v970-prewarmed-session"',
    'Stage 3.5 APK version',
)

print('PASS_STAGE35_FIRE_PREWARM_PATCH')
