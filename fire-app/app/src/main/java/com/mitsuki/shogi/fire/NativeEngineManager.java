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
import java.util.Map;
import java.util.UUID;

/** Fire-only native USI bridge.
 *
 * The physical Fire WebView exposes WebAssembly but not SharedArrayBuffer, so the threaded
 * YaneuraOu WASM build cannot run there. This manager executes the exact YaneuraOu V9.70
 * Android/NDK binary in the app's nativeLibraryDir and keeps the existing browser worker API
 * unchanged through a localhost shim.
 */
final class NativeEngineManager implements Closeable {
    private static final String TAG = "MitsukiNativeEngine";
    private static final String ENGINE_FILE = "libyaneuraou_v970_exec.so";
    private static final String EVAL_ASSET = "shogi-side-test/yaneuraou/nn.bin";
    private static final long EVAL_SIZE = 64217066L;
    private static final int MAX_LINES = 5000;
    private static final String EVAL_DIR_OPTION = "setoption name EvalDir value";
    private static final String EVAL_FILE_OPTION = "setoption name EvalFile value";

    private final Context context;
    private final File engineDir;
    private final File evalDir;
    private final File evalFile;
    private final File engineBinary;
    private final Map<String, Session> sessions = new HashMap<>();

    NativeEngineManager(Context context) {
        this.context = context.getApplicationContext();
        this.engineDir = new File(this.context.getFilesDir(), "native-yaneuraou-v970");
        // The NNUE is copied to app-private storage. YaneuraOu resolves a relative EvalDir from
        // the executable directory (nativeLibraryDir), not from ProcessBuilder.directory(), so
        // every EvalDir command is rewritten below to this absolute app-private directory.
        this.evalDir = new File(engineDir, "eval");
        this.evalFile = new File(evalDir, "nn.bin");
        this.engineBinary = new File(this.context.getApplicationInfo().nativeLibraryDir, ENGINE_FILE);
    }

    synchronized String runtimeInfo() {
        return "binary=" + engineBinary.getAbsolutePath()
            + "|binaryExists=" + engineBinary.isFile()
            + "|binaryExecutable=" + engineBinary.canExecute()
            + "|evalDir=" + evalDir.getAbsolutePath()
            + "|eval=" + evalFile.getAbsolutePath()
            + "|evalReady=" + (evalFile.isFile() && evalFile.length() == EVAL_SIZE)
            + "|abi=" + android.os.Build.SUPPORTED_ABIS[0];
    }

    private void ensurePrepared() throws IOException {
        if (!engineBinary.isFile()) throw new IOException("Native YaneuraOu binary missing for ABI " + android.os.Build.SUPPORTED_ABIS[0]);
        if (!engineBinary.canExecute()) throw new IOException("Native YaneuraOu binary is not executable: " + engineBinary);
        if (!engineDir.exists() && !engineDir.mkdirs() && !engineDir.isDirectory()) throw new IOException("Could not create native engine dir");
        if (!evalDir.exists() && !evalDir.mkdirs() && !evalDir.isDirectory()) throw new IOException("Could not create native eval dir");
        if (evalFile.isFile() && evalFile.length() == EVAL_SIZE) return;

        File tmp = new File(evalDir, "nn.bin.tmp");
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
        String nativeCommand = normalizeCommand(command);
        if (nativeCommand != null) s.command(nativeCommand);
        return 0;
    }

    /**
     * Browser/WASM workers historically send EvalDir=. and an Emscripten-only EvalFile option.
     * The native executable resolves relative EvalDir values against its executable directory,
     * which is the APK's nativeLibraryDir. The real NNUE lives under app-private files instead,
     * so always force an absolute EvalDir here. This is transport-only and does not alter any
     * strength/search option. EvalFile remains ignored because upstream native V9.70 uses nn.bin.
     */
    private String normalizeCommand(String command) {
        String cmd = command == null ? "" : command.trim();
        if (startsWithIgnoreCase(cmd, EVAL_DIR_OPTION)) {
            return EVAL_DIR_OPTION + " " + evalDir.getAbsolutePath();
        }
        if (startsWithIgnoreCase(cmd, EVAL_FILE_OPTION)) return null;
        return cmd;
    }

    private static boolean startsWithIgnoreCase(String value, String prefix) {
        return value.length() >= prefix.length() && value.regionMatches(true, 0, prefix, 0, prefix.length());
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

    /**
     * Physical-device strength gate. This deliberately goes beyond process launch/usiok:
     * 1) USI protocol must initialize, 2) isready must load the real Suisho5 from eval/nn.bin,
     * and 3) a real startpos search must return a legal-looking bestmove.
     */
    synchronized JSONObject selfTest() {
        JSONObject out = new JSONObject();
        String id = null;
        StringBuilder transcript = new StringBuilder();
        try {
            id = startSession();
            long cursor = 0;

            command(id, "usi");
            WaitResult usi = waitFor(id, cursor, "usiok", 15000L, transcript);
            cursor = usi.cursor;
            String name = extractIdName(transcript.toString());
            if (!usi.matched) throw new IOException("usiok timeout");

            // Do not rely on a relative native EvalDir. YaneuraOu resolves it from the executable
            // directory, while the packaged Suisho5 is copied to app-private files/eval/nn.bin.
            command(id, EVAL_DIR_OPTION + " " + evalDir.getAbsolutePath());
            command(id, "isready");
            WaitResult ready = waitFor(id, cursor, "readyok", 90000L, transcript);
            cursor = ready.cursor;
            if (!ready.matched) throw new IOException("readyok timeout while loading Suisho5 eval/nn.bin");

            command(id, "usinewgame");
            command(id, "position startpos");
            command(id, "go movetime 120");
            WaitResult searched = waitForPrefix(id, cursor, "bestmove ", 20000L, transcript);
            if (!searched.matched) throw new IOException("bestmove timeout after native search");
            String bestmove = searched.matchedLine == null ? "" : searched.matchedLine.substring("bestmove ".length()).trim();
            if (bestmove.isEmpty() || "resign".equals(bestmove) || "win".equals(bestmove)) {
                throw new IOException("unexpected startpos bestmove: " + bestmove);
            }

            out.put("ok", true);
            out.put("usiok", true);
            out.put("readyok", true);
            out.put("searched", true);
            out.put("bestmove", bestmove);
            out.put("name", name);
            out.put("runtime", runtimeInfo());
            out.put("engine", "YaneuraOu V9.70 Android NDK + Suisho5");
            out.put("transcriptTail", tail(transcript.toString(), 1800));
        } catch (Throwable e) {
            try {
                out.put("ok", false);
                out.put("error", e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()));
                out.put("runtime", runtimeInfo());
                out.put("transcriptTail", tail(transcript.toString(), 2200));
            } catch (Exception ignored) {}
        } finally {
            if (id != null) closeSession(id);
        }
        return out;
    }

    private WaitResult waitFor(String id, long cursor, String exact, long timeoutMs, StringBuilder transcript) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            JSONObject p = poll(id, cursor);
            cursor = p.optLong("next", cursor);
            JSONArray lines = p.optJSONArray("lines");
            if (lines != null) for (int i = 0; i < lines.length(); i++) {
                String line = lines.optString(i, "");
                appendTranscript(transcript, line);
                if (exact.equals(line.trim())) return new WaitResult(cursor, true, line);
            }
            if (!p.optBoolean("alive", true)) throw new IOException("native engine exited before " + exact + "; tail=" + tail(transcript.toString(), 900));
            Thread.sleep(20L);
        }
        return new WaitResult(cursor, false, null);
    }

    private WaitResult waitForPrefix(String id, long cursor, String prefix, long timeoutMs, StringBuilder transcript) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            JSONObject p = poll(id, cursor);
            cursor = p.optLong("next", cursor);
            JSONArray lines = p.optJSONArray("lines");
            if (lines != null) for (int i = 0; i < lines.length(); i++) {
                String line = lines.optString(i, "");
                appendTranscript(transcript, line);
                if (line.startsWith(prefix)) return new WaitResult(cursor, true, line);
            }
            if (!p.optBoolean("alive", true)) throw new IOException("native engine exited before " + prefix + "; tail=" + tail(transcript.toString(), 900));
            Thread.sleep(20L);
        }
        return new WaitResult(cursor, false, null);
    }

    private static void appendTranscript(StringBuilder transcript, String line) {
        if (transcript.length() > 12000) transcript.delete(0, transcript.length() - 8000);
        transcript.append(line).append('\n');
    }

    private static String extractIdName(String transcript) {
        for (String line : transcript.split("\\n")) if (line.startsWith("id name ")) return line.substring(8).trim();
        return "";
    }

    private static String tail(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(text.length() - max);
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
                if (!closed) {
                    String status = process.isAlive() ? "alive-stream-ended" : String.valueOf(process.exitValue());
                    append("info string FIRE_NATIVE_PROCESS_EXIT " + status);
                }
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
            if (!process.isAlive()) out.put("exitCode", process.exitValue());
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

    private static final class WaitResult {
        final long cursor;
        final boolean matched;
        final String matchedLine;
        WaitResult(long cursor, boolean matched, String matchedLine) {
            this.cursor = cursor;
            this.matched = matched;
            this.matchedLine = matchedLine;
        }
    }
}
