from pathlib import Path
import runpy

# Stage 3.6 keeps the complete Stage 3.5 prewarmed-session design and every strength setting.
# It adds an Android-side wall-clock watchdog around native `go movetime`: if YaneuraOu on a
# physical Fire fails to honor its own movetime stop, Android sends `stop` only AFTER the full
# translated Fire search budget plus a 2.5s grace period. A normally returning search is untouched.
runpy.run_path('fire-app/scripts/apply-stage35-fire-prewarm.py', run_name='__main__')


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
    '        private volatile boolean closed;\n',
    '''        private volatile boolean closed;\n        // Generation invalidates an older watchdog as soon as its bestmove arrives or a new search starts.\n        private long searchGeneration;\n        private volatile String lastInfoLine = "";\n''',
    'native watchdog state',
)

old_append = '''        private synchronized void append(String text) {\n            lines.addLast(new Line(nextSeq++, text));\n            while (lines.size() > MAX_LINES) lines.removeFirst();\n        }\n\n        synchronized void command(String command) throws IOException {\n            if (closed || !process.isAlive()) throw new IOException("Native engine process is not alive");\n            stdin.write(command == null ? "" : command);\n            stdin.newLine();\n            stdin.flush();\n        }\n'''

new_append = '''        private synchronized void append(String text) {\n            String row = text == null ? "" : text;\n            if (row.startsWith("info ")) {\n                lastInfoLine = row.length() <= 360 ? row : row.substring(row.length() - 360);\n            }\n            // A returned bestmove means the engine obeyed the search limit; invalidate its watchdog.\n            if (row.startsWith("bestmove ")) searchGeneration++;\n            lines.addLast(new Line(nextSeq++, row));\n            while (lines.size() > MAX_LINES) lines.removeFirst();\n        }\n\n        private long movetimeBudget(String command) {\n            String cmd = command == null ? "" : command.trim();\n            if (!cmd.regionMatches(true, 0, "go movetime ", 0, "go movetime ".length())) return 0L;\n            String rest = cmd.substring("go movetime ".length()).trim();\n            int sp = rest.indexOf(' ');\n            String token = sp >= 0 ? rest.substring(0, sp) : rest;\n            try { return Math.max(1L, Long.parseLong(token)); } catch (Exception e) { return 0L; }\n        }\n\n        private void scheduleMovetimeWatchdog(final long generation, final long budgetMs) {\n            Thread t = new Thread(() -> {\n                try { Thread.sleep(budgetMs + 2500L); } catch (InterruptedException e) { return; }\n                synchronized (Session.this) {\n                    if (closed || generation != searchGeneration || !process.isAlive()) return;\n                    long elapsed = budgetMs + 2500L;\n                    try {\n                        // This does not shorten the configured Fire search. It fires only after the full\n                        // native budget + grace when the engine has failed to return bestmove by itself.\n                        stdin.write("stop");\n                        stdin.newLine();\n                        stdin.flush();\n                        String info = "info string FIRE_NATIVE_WATCHDOG_STOP budgetMs=" + budgetMs\n                            + " elapsedMs=" + elapsed\n                            + " last=" + (lastInfoLine == null ? "" : lastInfoLine);\n                        lines.addLast(new Line(nextSeq++, info));\n                        while (lines.size() > MAX_LINES) lines.removeFirst();\n                        Log.w(TAG, "native movetime watchdog sent stop: " + info);\n                    } catch (Exception e) {\n                        Log.w(TAG, "native movetime watchdog stop failed", e);\n                    }\n                }\n            }, "yaneuraou-watchdog-" + id.substring(0, 6));\n            t.setDaemon(true);\n            t.start();\n        }\n\n        synchronized void command(String command) throws IOException {\n            if (closed || !process.isAlive()) throw new IOException("Native engine process is not alive");\n            String cmd = command == null ? "" : command;\n            long budget = movetimeBudget(cmd);\n            if (budget > 0L) {\n                long generation = ++searchGeneration;\n                stdin.write(cmd);\n                stdin.newLine();\n                stdin.flush();\n                scheduleMovetimeWatchdog(generation, budget);\n                return;\n            }\n            String trimmed = cmd.trim();\n            if ("stop".equalsIgnoreCase(trimmed) || "quit".equalsIgnoreCase(trimmed)) searchGeneration++;\n            stdin.write(cmd);\n            stdin.newLine();\n            stdin.flush();\n        }\n'''
replace_one(manager, old_append, new_append, 'Android native movetime watchdog')

worker = 'shogi-v21528/future-yaneura-worker21528.js'
replace_one(
    worker,
    "  if(line.startsWith('info string WASMDBG '))stage('DBG '+line.slice('info string WASMDBG '.length));\n",
    "  if(line.startsWith('info string WASMDBG '))stage('DBG '+line.slice('info string WASMDBG '.length));\n  if(line.startsWith('info string FIRE_NATIVE_WATCHDOG_STOP '))stage('⑥-Fire時間監視で停止 '+line.slice('info string FIRE_NATIVE_WATCHDOG_STOP '.length));\n",
    'surface native watchdog telemetry',
)

# The physical Fire gameplay path uses 4s/7s requested searches which Stage 3.2 translates to
# 8s/14s. The Android watchdog returns them by ~10.5s/~16.5s even if native movetime is broken.
# Cap only the Fire transport wait at 45s so a broken worker/session retries instead of hanging for
# repeated 90s windows. This is not a search-strength change and exceeds every normal Future budget.
future = 'shogi-side-test/future21520.js'
old_call = '''  function callWorker(type,data={},timeout=70000){\n    const w=getWorker(),id=++seq;\n    return new Promise((resolve,reject)=>{\n      const timer=setTimeout(()=>{pending.delete(id);engineError=type+' timeout '+timeout+'ms';setEngineState('⑤失敗 '+engineError);try{w.terminate()}catch(e){}worker=null;engineReady=false;reject(new Error(engineError))},timeout);\n      pending.set(id,{resolve,reject,timer});w.postMessage({type,id,...data});\n    });\n  }\n'''
new_call = '''  function callWorker(type,data={},timeout=70000){\n    const w=getWorker(),id=++seq;\n    const effectiveTimeout=(FIRE_NATIVE_APP&&type==='bestmove')?Math.min(Number(timeout)||70000,45000):timeout;\n    return new Promise((resolve,reject)=>{\n      const timer=setTimeout(()=>{pending.delete(id);engineError=type+' timeout '+effectiveTimeout+'ms';setEngineState('⑤失敗 '+engineError);try{w.terminate()}catch(e){}worker=null;engineReady=false;reject(new Error(engineError))},effectiveTimeout);\n      pending.set(id,{resolve,reject,timer});w.postMessage({type,id,...data});\n    });\n  }\n'''
replace_one(future, old_call, new_call, 'Fire-only transport hang cap')

gradle = 'fire-app/app/build.gradle.kts'
replace_one(
    gradle,
    '        versionCode = 5\n        versionName = "3.5-fire-native-v970-prewarmed-session"',
    '        versionCode = 6\n        versionName = "3.6-fire-native-v970-search-watchdog"',
    'Stage 3.6 APK version',
)

print('PASS_STAGE36_FIRE_SEARCH_WATCHDOG_PATCH')
