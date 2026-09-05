package com.mitsuki.shogi.fire;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceResponse;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Fire-local HTTP transport.
 *
 * Stage 2.1 proved on the physical Fire that localhost is secure but Amazon WebView still reports
 * COI=false/SAB=false. Stage 3 therefore keeps localhost for the unchanged browser UI, but replaces
 * only yaneuraou.halfkp.noeval.js with a worker-compatible shim that talks to native Android V9.70.
 */
final class LoopbackHttpServer implements Closeable {
    private static final String TAG = "MitsukiLoopback";
    private final OfflineContentStore contentStore;
    private final NativeEngineManager nativeEngine;
    private final ServerSocket serverSocket;
    private final ExecutorService workers = Executors.newCachedThreadPool();
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final Thread acceptThread;
    private final String origin;

    LoopbackHttpServer(Context context, OfflineContentStore contentStore) throws IOException {
        this.contentStore = contentStore;
        this.nativeEngine = new NativeEngineManager(context);
        this.serverSocket = new ServerSocket(0, 64, InetAddress.getByName("127.0.0.1"));
        this.origin = "http://127.0.0.1:" + serverSocket.getLocalPort();
        this.acceptThread = new Thread(this::acceptLoop, "mitsuki-fire-loopback");
        this.acceptThread.setDaemon(true);
        this.acceptThread.start();
    }

    String origin() { return origin; }
    String startUrl() { return origin + "/shogi-v21528/index.html"; }
    String nativeRuntimeInfo() { return nativeEngine.runtimeInfo(); }
    JSONObject nativeSelfTest() { return nativeEngine.selfTest(); }

    private void acceptLoop() {
        while (running.get()) {
            try {
                Socket socket = serverSocket.accept();
                socket.setSoTimeout(15000);
                workers.execute(() -> handle(socket));
            } catch (IOException e) {
                if (running.get()) Log.w(TAG, "accept failed", e);
            }
        }
    }

    private void handle(Socket socket) {
        try (Socket s = socket;
             BufferedInputStream rawIn = new BufferedInputStream(s.getInputStream());
             BufferedOutputStream rawOut = new BufferedOutputStream(s.getOutputStream())) {

            BufferedReader reader = new BufferedReader(new InputStreamReader(rawIn, StandardCharsets.ISO_8859_1));
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                writeSimple(rawOut, 400, "Bad Request", "bad request");
                return;
            }
            String method = parts[0].toUpperCase(Locale.US);
            String target = parts[1];
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {}

            if (!"GET".equals(method) && !"HEAD".equals(method)) {
                writeSimple(rawOut, 405, "Method Not Allowed", "method not allowed");
                return;
            }
            if (target.startsWith("http://") || target.startsWith("https://")) {
                int slash = target.indexOf('/', target.indexOf("//") + 2);
                target = slash >= 0 ? target.substring(slash) : "/";
            }
            if (!target.startsWith("/")) target = "/" + target;

            Uri requestUri = Uri.parse("http://127.0.0.1" + target);
            String path = requestUri.getPath() == null ? "/" : requestUri.getPath();
            if (path.startsWith("/__native_engine/")) {
                handleNative(method, path, requestUri, rawOut);
                return;
            }

            // Preserve all existing high-level Future/TOP5/cohort worker logic. Only substitute the
            // Emscripten engine factory requested by those workers.
            String assetTarget = target;
            if (path.endsWith("/yaneuraou/yaneuraou.halfkp.noeval.js")) {
                assetTarget = "/fire/yaneuraou-native-shim.js?v=3";
            }

            WebResourceResponse response = contentStore.intercept(OfflineContentStore.LOCAL_ORIGIN + assetTarget);
            if (response == null) {
                writeSimple(rawOut, 404, "Not Found", "not found");
                return;
            }

            int status = response.getStatusCode();
            if (status <= 0) status = 200;
            String reason = response.getReasonPhrase();
            if (reason == null || reason.isEmpty()) reason = status == 200 ? "OK" : "Error";
            writeAscii(rawOut, "HTTP/1.1 " + status + " " + reason + "\r\n");
            String mime = response.getMimeType();
            if (mime != null && !mime.isEmpty()) {
                String type = mime;
                String encoding = response.getEncoding();
                if (encoding != null && !encoding.isEmpty() && mime.startsWith("text/")) type += "; charset=" + encoding;
                writeAscii(rawOut, "Content-Type: " + type + "\r\n");
            }
            Map<String, String> headers = response.getResponseHeaders();
            if (headers != null) {
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    String name = entry.getKey();
                    String value = entry.getValue();
                    if (name == null || value == null || name.equalsIgnoreCase("Content-Length") || name.equalsIgnoreCase("Connection")) continue;
                    writeAscii(rawOut, name + ": " + value + "\r\n");
                }
            }
            writeAscii(rawOut, "Connection: close\r\n");
            writeAscii(rawOut, "Accept-Ranges: none\r\n\r\n");

            if (!"HEAD".equals(method)) {
                try (InputStream body = response.getData()) {
                    if (body != null) copy(body, rawOut);
                }
            }
            rawOut.flush();
        } catch (Exception e) {
            Log.w(TAG, "request failed", e);
        }
    }

    private void handleNative(String method, String path, Uri uri, OutputStream out) throws Exception {
        if ("HEAD".equals(method)) {
            writeJson(out, new JSONObject().put("ok", true), true);
            return;
        }
        if ("/__native_engine/health".equals(path)) {
            writeJson(out, nativeEngine.selfTest(), false);
            return;
        }
        if ("/__native_engine/start".equals(path)) {
            writeText(out, nativeEngine.startSession());
            return;
        }
        String id = uri.getQueryParameter("id");
        if (id == null || id.isEmpty()) {
            writeSimple(out, 400, "Bad Request", "missing session id");
            return;
        }
        if ("/__native_engine/cmd".equals(path)) {
            String q = uri.getQueryParameter("q");
            writeText(out, String.valueOf(nativeEngine.command(id, q == null ? "" : q)));
            return;
        }
        if ("/__native_engine/poll".equals(path)) {
            long cursor = 0;
            try { cursor = Long.parseLong(String.valueOf(uri.getQueryParameter("cursor"))); } catch (Exception ignored) {}
            writeJson(out, nativeEngine.poll(id, cursor), false);
            return;
        }
        if ("/__native_engine/close".equals(path)) {
            nativeEngine.closeSession(id);
            writeText(out, "ok");
            return;
        }
        writeSimple(out, 404, "Not Found", "native route not found");
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
    }

    private static void writeJson(OutputStream out, JSONObject json, boolean head) throws IOException {
        byte[] body = json.toString().getBytes(StandardCharsets.UTF_8);
        writeHeaders(out, 200, "OK", "application/json; charset=UTF-8", body.length);
        if (!head) out.write(body);
        out.flush();
    }

    private static void writeText(OutputStream out, String text) throws IOException {
        byte[] body = String.valueOf(text).getBytes(StandardCharsets.UTF_8);
        writeHeaders(out, 200, "OK", "text/plain; charset=UTF-8", body.length);
        out.write(body);
        out.flush();
    }

    private static void writeSimple(OutputStream out, int status, String reason, String text) throws IOException {
        byte[] body = text.getBytes(StandardCharsets.UTF_8);
        writeHeaders(out, status, reason, "text/plain; charset=UTF-8", body.length);
        out.write(body);
        out.flush();
    }

    private static void writeHeaders(OutputStream out, int status, String reason, String type, int length) throws IOException {
        writeAscii(out, "HTTP/1.1 " + status + " " + reason + "\r\n");
        writeAscii(out, "Content-Type: " + type + "\r\n");
        writeAscii(out, "Cross-Origin-Opener-Policy: same-origin\r\n");
        writeAscii(out, "Cross-Origin-Embedder-Policy: require-corp\r\n");
        writeAscii(out, "Cross-Origin-Resource-Policy: same-origin\r\n");
        writeAscii(out, "Cache-Control: no-store\r\n");
        writeAscii(out, "Content-Length: " + length + "\r\n");
        writeAscii(out, "Connection: close\r\n\r\n");
    }

    private static void writeAscii(OutputStream out, String text) throws IOException {
        out.write(text.getBytes(StandardCharsets.ISO_8859_1));
    }

    @Override
    public void close() {
        if (!running.getAndSet(false)) return;
        nativeEngine.close();
        try { serverSocket.close(); } catch (IOException ignored) {}
        workers.shutdownNow();
    }
}
