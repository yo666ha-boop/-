from pathlib import Path
import re
import runpy

# Stage 3.7 keeps Stage 3.6 strength/watchdog behavior, but fixes two transport defects that are
# specific to the Android app and do not exist in the working browser path:
# 1) a prewarmed session was handed to the Worker with cursor=0, so warmup-era usi/info/bestmove
#    lines could be replayed as if they belonged to the live game;
# 2) the Worker polled localhost every ~8ms while idle, creating >100 HTTP/socket requests/sec and
#    stealing CPU from YaneuraOu on low-power Fire hardware.
# No character strength/search/profile setting is reduced here.
runpy.run_path('fire-app/scripts/apply-stage36-fire-search-watchdog.py', run_name='__main__')


def replace_one(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def regex_one(path, pattern, repl, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    out, count = re.subn(pattern, repl, s, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match in {path}, found {count}')
    p.write_text(out, encoding='utf-8')

manager = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/NativeEngineManager.java'
replace_one(
    manager,
    '    private String warmedSessionId;\n',
    '    private String warmedSessionId;\n    private long warmedCursor;\n',
    'warmed cursor field',
)

replace_one(
    manager,
    '''            command(id, "usinewgame");\n\n            synchronized (this) {\n                Session s = sessions.get(id);\n                if (s == null || !s.isAlive()) throw new IOException("prewarmed native session exited before handoff");\n                warmedSessionId = id;\n            }\n''',
    '''            command(id, "usinewgame");\n            // Drain every line emitted by the warmup search before handing this process to the\n            // gameplay Worker. Without this cursor handoff the Worker starts at 0 and can replay\n            // the warmup bestmove as if it were the current game's answer.\n            Thread.sleep(30L);\n            JSONObject drained = poll(id, cursor);\n            cursor = drained.optLong("next", cursor);\n\n            synchronized (this) {\n                Session s = sessions.get(id);\n                if (s == null || !s.isAlive()) throw new IOException("prewarmed native session exited before handoff");\n                warmedSessionId = id;\n                warmedCursor = cursor;\n            }\n''',
    'drain warmup output and store cursor',
)

replace_one(
    manager,
    '''        if (warmedSessionId != null) {\n            String id = warmedSessionId;\n            warmedSessionId = null;\n            Session warmed = sessions.get(id);\n            if (warmed != null && warmed.isAlive()) {\n                Log.i(TAG, "handing prewarmed native YaneuraOu session to gameplay worker");\n                return "warm:" + id;\n            }\n            if (warmed != null) warmed.close();\n            sessions.remove(id);\n        }\n''',
    '''        if (warmedSessionId != null) {\n            String id = warmedSessionId;\n            long cursor = warmedCursor;\n            warmedSessionId = null;\n            warmedCursor = 0L;\n            Session warmed = sessions.get(id);\n            if (warmed != null && warmed.isAlive()) {\n                Log.i(TAG, "handing prewarmed native YaneuraOu session to gameplay worker at cursor=" + cursor);\n                return "warm:" + id + ":" + cursor;\n            }\n            if (warmed != null) warmed.close();\n            sessions.remove(id);\n        }\n''',
    'return warmed session with cursor',
)

# Manager-level long-poll must not hold the manager monitor while waiting, otherwise /cmd cannot
# reach the same session. Grab the Session under the map lock, then wait only on Session itself.
replace_one(
    manager,
    '''    synchronized JSONObject poll(String id, long cursor) throws Exception {\n        Session s = sessions.get(id);\n        if (s == null) throw new IOException("Unknown engine session");\n        return s.poll(cursor);\n    }\n''',
    '''    JSONObject poll(String id, long cursor) throws Exception {\n        return poll(id, cursor, 0L);\n    }\n\n    JSONObject poll(String id, long cursor, long waitMs) throws Exception {\n        final Session s;\n        synchronized (this) {\n            s = sessions.get(id);\n        }\n        if (s == null) throw new IOException("Unknown engine session");\n        return s.poll(cursor, waitMs);\n    }\n''',
    'manager nonblocking long poll',
)

# Wake a blocked long-poll whenever any new engine line (including watchdog telemetry) arrives.
p = Path(manager)
s = p.read_text(encoding='utf-8')
needle = '            while (lines.size() > MAX_LINES) lines.removeFirst();\n'
count = s.count(needle)
if count < 2:
    raise SystemExit(f'notify long poll: expected >=2 queue trim sites, found {count}')
s = s.replace(needle, needle + '            notifyAll();\n')
p.write_text(s, encoding='utf-8')

regex_one(
    manager,
    r'''        synchronized JSONObject poll\(long cursor\) throws Exception \{.*?            return out;\n        \}\n''',
    '''        private boolean hasLineAfter(long cursor) {\n            Line last = lines.peekLast();\n            return last != null && last.seq > cursor;\n        }\n\n        synchronized JSONObject poll(long cursor, long waitMs) throws Exception {\n            long boundedWait = Math.max(0L, Math.min(1000L, waitMs));\n            if (boundedWait > 0L && !hasLineAfter(cursor) && !closed && process.isAlive()) {\n                long deadline = System.currentTimeMillis() + boundedWait;\n                while (!hasLineAfter(cursor) && !closed && process.isAlive()) {\n                    long remain = deadline - System.currentTimeMillis();\n                    if (remain <= 0L) break;\n                    wait(remain);\n                }\n            }\n            JSONArray outLines = new JSONArray();\n            long next = cursor;\n            int count = 0;\n            for (Line row : lines) {\n                if (row.seq <= cursor) continue;\n                outLines.put(row.text);\n                next = row.seq;\n                if (++count >= 512) break;\n            }\n            JSONObject out = new JSONObject();\n            out.put("next", next);\n            out.put("lines", outLines);\n            out.put("alive", process.isAlive());\n            if (!process.isAlive()) out.put("exitCode", process.exitValue());\n            return out;\n        }\n''',
    'session long-poll implementation',
)

loopback = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/LoopbackHttpServer.java'
replace_one(
    loopback,
    '''        if ("/__native_engine/poll".equals(path)) {\n            long cursor = 0;\n            try { cursor = Long.parseLong(String.valueOf(uri.getQueryParameter("cursor"))); } catch (Exception ignored) {}\n            writeJson(out, nativeEngine.poll(id, cursor), false);\n            return;\n        }\n''',
    '''        if ("/__native_engine/poll".equals(path)) {\n            long cursor = 0;\n            long waitMs = 0;\n            try { cursor = Long.parseLong(String.valueOf(uri.getQueryParameter("cursor"))); } catch (Exception ignored) {}\n            try { waitMs = Long.parseLong(String.valueOf(uri.getQueryParameter("wait"))); } catch (Exception ignored) {}\n            waitMs = Math.max(0L, Math.min(1000L, waitMs));\n            writeJson(out, nativeEngine.poll(id, cursor, waitMs), false);\n            return;\n        }\n''',
    'loopback long-poll query',
)

shim = 'fire-app/app/src/main/assets/fire/yaneuraou-native-shim.js'
replace_one(
    shim,
    '''    const rawSession=syncGet('/__native_engine/start').trim();\n    if(!rawSession)throw new Error('native engine session start failed');\n    const warmed=rawSession.startsWith('warm:');\n    const session=warmed?rawSession.slice(5):rawSession;\n    if(!session)throw new Error('native engine session id missing');\n    let cursor=0,closed=false,listeners=[];\n''',
    '''    const rawSession=syncGet('/__native_engine/start').trim();\n    if(!rawSession)throw new Error('native engine session start failed');\n    const warmed=rawSession.startsWith('warm:');\n    const warmParts=warmed?rawSession.split(':'):null;\n    const session=warmed?String(warmParts[1]||''):rawSession;\n    const warmCursor=warmed?Math.max(0,Number(warmParts[2])||0):0;\n    if(!session)throw new Error('native engine session id missing');\n    let cursor=warmCursor,closed=false,listeners=[];\n''',
    'shim warm cursor parse',
)
replace_one(
    shim,
    "          const r=await realFetch('/__native_engine/poll?id='+encodeURIComponent(session)+'&cursor='+cursor,{cache:'no-store'});\n",
    "          const r=await realFetch('/__native_engine/poll?id='+encodeURIComponent(session)+'&cursor='+cursor+'&wait=250',{cache:'no-store'});\n",
    '250ms native long poll',
)
replace_one(
    shim,
    '''          if(!lines.length)await sleep(8);\n''',
    '''          // Server-side long-poll already waits for data. Do not spin at ~125 HTTP requests/sec.\n''',
    'remove 8ms hot polling loop',
)
replace_one(
    shim,
    '''      __fireNativeWarmReady:warmed,\n''',
    '''      __fireNativeWarmReady:warmed,\n      __fireNativeWarmCursor:warmCursor,\n      __fireNativeBridgeVersion:'3.7-longpoll-cursor',\n''',
    'transport v2 diagnostics',
)

# Visible worker stage confirms that a warm handoff is using the nonzero cursor-aware transport.
worker = 'shogi-v21528/future-yaneura-worker21528.js'
replace_one(
    worker,
    "      stage('⑤成功 Fire事前初期化済みV9.70＋水匠5セッション引継ぎ');\n",
    "      stage('⑤成功 Fire事前初期化済みV9.70＋水匠5セッション引継ぎ cursor='+String(engine.__fireNativeWarmCursor||0));\n",
    'surface warm cursor',
)

gradle = 'fire-app/app/build.gradle.kts'
replace_one(
    gradle,
    '        versionCode = 6\n        versionName = "3.6-fire-native-v970-search-watchdog"',
    '        versionCode = 7\n        versionName = "3.7-fire-native-v970-transport-v2"',
    'Stage 3.7 APK version',
)

print('PASS_STAGE37_FIRE_TRANSPORT_V2_PATCH')
