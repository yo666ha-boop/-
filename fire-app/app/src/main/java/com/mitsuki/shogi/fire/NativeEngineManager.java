package com.mitsuki.shogi.fire;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.Closeable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Fire-only native USI bridge.
 *
 * The physical Fire WebView exposes WebAssembly but not SharedArrayBuffer, so the threaded
 * YaneuraOu WASM build cannot run there.  This manager executes the exact YaneuraOu V9.70
 * Android/NDK binary in the app's nativeLibraryDir and keeps the existing browser worker API
 * unchanged through a localhost shim.
 */
final class NativeEngineManager implements Closeable {
    private static final String TAG = "MitsukiNativeEngine";
    private static final String ENGINE_FILE = "libyaneuraou_v970_exec.so";
    private static final String EVAL_ASSET = "shogi-side-test/yaneuraou/nn.bin";
    private static final long EVAL_SIZE = 64217066L;
    private static final int MAX_LINES = 5000;

    private final Context context;
    private final File engineDir;
    private final File evalFile;
    private final File engineBinary;
    private final Map<String, Session> sessions = new HashMap<>();

    NativeEngineManager(Context context) {
        this.context = context.getApplicationContext();
        this.engineDir = new File(this.context.getFilesDir(), "native-yaneuraou-v970");
        this.evalFile = new File(engineDir, "nn.bin");
        this.engineBinary = new File(this.context.getApplicationInfo().nativeLibraryDir, ENGINE_FILE);
    }

    synchronized String runtimeInfo() {
        return "binary=" + engineBinary.getAbsolutePath()
            + "|binaryExists=" + engineBinary.isFile()
            + "|binaryExecutable=" + engineBinary.canExecute()
            + "|eval=" + evalFile.getAbsolutePath()
            + "|evalReady=" + (evalFile.isFile() && evalFile.length() == EVAL_SIZE)
            + "|abi=" + android.os.Build.SUPPORTED_ABIS[0];
    }

    private void ensurePrepared() throws IOException {
        if (!engineBinary.isFile()) throw new IOException("Native YaneuraOu binary missing for ABI " + android.os.Build.SUPPORTED_ABIS[0]);
        if (!engineBinary.canExecute()) throw new IOException("Native YaneuraOu binary is not executable: " + engineBinary);
        if (!engineDir.exists() && !engineDir.mkdirs() && !engineDir.isDirectory()) throw new IOException("Could not create native engine dir");
        if (evalFile.isFile() && evalFile.length() == EVAL_SIZE) return;
        File tmp = new File(engineDir, "nn.bin.tmp");
        if (tmp.exists() && !tmp.delete()) throw new IOException("Could not replace stale NNUE temp file");
        try (InputStream in = context.getAssets().open(EVAL_ASSET);
             FileOutputStream out = new FileOutputStream(tmp)) {
            byte[] buf = new byte[128 * 1024];
            int n;
            long total = 0;
            while ((n = in.read(buf)) >= 0) {
                out.write(buf, 0, n);
                total += n;
            }
            out.getFD().sync();
            if (total != EVAL_SIZE) throw new IOException("Unexpected Suisho5 size " + total);
        }
        if (evalFile.exists() && !evalFile.delete()) throw new IOException("Could not replace old NNUE");
        if (!tmp.renameTo(evalFile)) throw new IOException("Could not publish NNUE atomically");
    }

    synchronized String startSession() throws IOException {
        ensurePrepared();
        String id = UUID.randomUUID().toString().replace("-", "");
        Session s = new Session(id);
        sessions.put(id, s);
        return id;
    }

    synchronized int command(String id, String command) throws IOException {
        Session s = sessions.get(id);
        if (s == null) throw new IOException("Unknown engine session");
        s.command(command);
        return 0;
    }

    synchronized JSONObject poll(String id, long cursor) throws Exception {
        Session s = sessions.get(id);
        if (s == null) throw new IOException("Unknown engine session");
        return s.poll(cursor);
    }

    synchronized void closeSession(String id) {
        Session s = sessions.remove(id);
        if (s != null) s.close();
    }

    synchronized JSONObject selfTest() {
        JSONObject out = new JSONObject();
        String id = null;
        try {
            id = startSession();
            command(id, "usi");
            long cursor = 0;
            long deadline = System.currentTimeMillis() + 12000L;
            boolean usiok = false;
            String name = "";
            while (System.currentTimeMillis() < deadline && !usiok) {
                JSONObject p = poll(id, cursor);
                cursor = p.optLong("next", cursor);
                JSONArray lines = p.optJSONArray("lines");
                if (lines != null) for (int i = 0; i < lines.length(); i++) {
                    String line = lines.optString(i, "");
                    if (line.startsWith("id name ")) name = line.substring(8);
                    if ("usiok".equals(line.trim())) usiok = true;
                }
                if (!usiok) Thread.sleep(20L);
            }
            out.put("ok", usiok);
            out.put("name", name);
            out.put("runtime", runtimeInfo());
            out.put("engine", "YaneuraOu V9.70 Android NDK + Suisho5");
            if (!usiok) out.put("error", "usiok timeout");
        } catch (Throwable e) {
            try {
                out.put("ok", false);
                out.put("error", e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()));
                out.put("runtime", runtimeInfo());
            } catch (Exception ignored) {}
        } finally {
            if (id != null) closeSession(id);
        }
        return out;
    }

    @Override
    public synchronized void close() {
        for (Session s : new ArrayList<>(sessions.values())) s.close();
        sessions.clear();
    }

    private final class Session implements Closeable {
        private final String id;
        private final Process process;
        private final BufferedWriter stdin;
        private final ArrayDeque<Line> lines = new ArrayDeque<>();
        private long nextSeq = 1;
        private volatile boolean closed;

        Session(String id) throws IOException {
            this.id = id;
            ProcessBuilder pb = new ProcessBuilder(engineBinary.getAbsolutePath());
            pb.directory(engineDir);
            pb.redirectErrorStream(true);
            this.process = pb.start();
            this.stdin = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
            Thread t = new Thread(this::readLoop, "yaneuraou-stdout-" + id.substring(0, 6));
            t.setDaemon(true);
            t.start();
        }

        private void readLoop() {
            try (BufferedReader r = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while (!closed && (line = r.readLine()) != null) append(line);
            } catch (IOException e) {
                if (!closed) Log.w(TAG, "stdout failed " + id, e);
            } finally {
                if (!closed) append("info string FIRE_NATIVE_PROCESS_EXIT " + process.exitValue());
            }
        }

        private synchronized void append(String text) {
            lines.addLast(new Line(nextSeq++, text));
            while (lines.size() > MAX_LINES) lines.removeFirst();
        }

        synchronized void command(String command) throws IOException {
            if (closed || !process.isAlive()) throw new IOException("Native engine process is not alive");
            stdin.write(command == null ? "" : command);
            stdin.newLine();
            stdin.flush();
        }

        synchronized JSONObject poll(long cursor) throws Exception {
            JSONArray outLines = new JSONArray();
            long next = cursor;
            int count = 0;
            for (Line row : lines) {
                if (row.seq <= cursor) continue;
                outLines.put(row.text);
                next = row.seq;
                if (++count >= 512) break;
            }
            JSONObject out = new JSONObject();
            out.put("next", next);
            out.put("lines", outLines);
            out.put("alive", process.isAlive());
            return out;
        }

        @Override
        public synchronized void close() {
            if (closed) return;
            closed = true;
            try {
                if (process.isAlive()) {
                    stdin.write("quit");
                    stdin.newLine();
                    stdin.flush();
                }
            } catch (Exception ignored) {}
            try { stdin.close(); } catch (Exception ignored) {}
            try { process.destroy(); } catch (Exception ignored) {}
        }
    }

    private static final class Line {
        final long seq;
        final String text;
        Line(long seq, String text) { this.seq = seq; this.text = text; }
    }
}
