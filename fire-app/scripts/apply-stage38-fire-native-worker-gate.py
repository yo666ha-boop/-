from pathlib import Path
import runpy

# Stage 3.8 fixes the actual immediate-stop gate seen on physical Fire.
# The Android app does NOT need crossOriginIsolated/SharedArrayBuffer for the native engine path:
# the Web Worker imports the Fire native shim, and YaneuraOu itself runs as an Android process.
# Browser/WASM behavior stays unchanged: non-native browser paths still require COI.
runpy.run_path('fire-app/scripts/apply-stage37-fire-transport-v2.py', run_name='__main__')


def replace_one(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


future = 'shogi-side-test/future21520.js'
replace_one(
    future,
    "    if(!globalThis.crossOriginIsolated)throw new Error('crossOriginIsolated=false');\n",
    "    if(!globalThis.crossOriginIsolated&&!FIRE_NATIVE_APP)throw new Error('crossOriginIsolated=false');\n    if(FIRE_NATIVE_APP&&!globalThis.crossOriginIsolated)setEngineState('⑤-0 FireネイティブWorker起動（COI不要）');\n",
    'Fire native worker COI bypass',
)

# Surface an explicit runtime marker so the built APK can prove the native-only gate is present.
replace_one(
    future,
    "  const FIRE_NATIVE_APP=!!window.MitsukiFireNative||/MitsukiShogiFire\\//i.test(navigator.userAgent);\n",
    "  const FIRE_NATIVE_APP=!!window.MitsukiFireNative||/MitsukiShogiFire\\//i.test(navigator.userAgent);\n  if(FIRE_NATIVE_APP)window.AI_SHOGI_FIRE_NATIVE_WORKER_GATE='3.8-coi-bypass';\n",
    'Fire native worker gate diagnostic',
)

# Keep every Stage 3.7 strength/transport setting. Version only.
gradle = 'fire-app/app/build.gradle.kts'
replace_one(
    gradle,
    '        versionCode = 7\n        versionName = "3.7-fire-native-v970-transport-v2"',
    '        versionCode = 8\n        versionName = "3.8-fire-native-v970-worker-gate"',
    'Stage 3.8 APK version',
)

# Make diagnostics/user-agent identify the exact native runtime version.
activity = 'fire-app/app/src/main/java/com/mitsuki/shogi/fire/MainActivity.java'
replace_one(
    activity,
    ' Silk/MitsukiFire MitsukiShogiFire/3.0 native-v970 baseline/',
    ' Silk/MitsukiFire MitsukiShogiFire/3.8 native-v970 baseline/',
    'Stage 3.8 Fire user agent',
)

print('PASS_STAGE38_FIRE_NATIVE_WORKER_GATE')
