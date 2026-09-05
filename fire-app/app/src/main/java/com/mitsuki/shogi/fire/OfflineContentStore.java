package com.mitsuki.shogi.fire;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceResponse;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Offline-first content store for the Fire build.
 *
 * The APK always contains the frozen browser-complete baseline. When online, a newer GitHub
 * main is downloaded as an overlay relative to that frozen baseline. A fully downloaded overlay
 * is only activated on the NEXT app launch. A failed/incomplete update can never replace the
 * last working content.
 */
final class OfflineContentStore {
    static final String LOCAL_HOST = "app.mitsuki.local";
    static final String LOCAL_ORIGIN = "https://" + LOCAL_HOST;
    static final String START_URL = LOCAL_ORIGIN + "/shogi-v21528/index.html";
    static final String BASELINE_MAIN = "813cad97b764c142bfb34b12498790c2759fd899";
    private static final String BASELINE_TREE = "39f815805d795575e86546c3865b7d487ba1dfa3";
    private static final String TAG = "MitsukiOffline";
    private static final String PREFS = "mitsuki_fire_content_v2";
    private static final String KEY_ACTIVE = "active_sha";
    private static final String KEY_PENDING = "pending_sha";
    private static final String KEY_STATE = "update_state";
    private static final String REPO_API = "https://api.github.com/repos/yo666ha-boop/-";
    private static final String RAW_BASE = "https://raw.githubusercontent.com/yo666ha-boop/-/";
    private static final String[] ROOTS = {"shogi-v21528/", "shogi/", "shogi-side-test/"};

    private final Context context;
    private final SharedPreferences prefs;
    private final File versionsDir;
    private String activeSha;
    private Set<String> activeTombstones = new HashSet<>();

    OfflineContentStore(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.versionsDir = new File(this.context.getFilesDir(), "fire_content/versions");
        if (!versionsDir.exists()) versionsDir.mkdirs();
        activatePendingOnLaunch();
        this.activeSha = prefs.getString(KEY_ACTIVE, BASELINE_MAIN);
        if (this.activeSha == null || this.activeSha.isEmpty()) this.activeSha = BASELINE_MAIN;
        loadActiveTombstones();
    }

    String activeSha() {
        return activeSha;
    }

    String updateState() {
        return prefs.getString(KEY_STATE, "端末内版");
    }

    private void activatePendingOnLaunch() {
        String pending = prefs.getString(KEY_PENDING, "");
        if (pending == null || pending.isEmpty()) return;
        File ready = new File(new File(versionsDir, pending), "ready.json");
        if (!ready.isFile()) {
            prefs.edit().remove(KEY_PENDING).putString(KEY_STATE, "端末内版").apply();
            return;
        }
        prefs.edit()
            .putString(KEY_ACTIVE, pending)
            .remove(KEY_PENDING)
            .putString(KEY_STATE, "更新適用済み " + pending.substring(0, Math.min(8, pending.length())))
            .apply();
        cleanupOldVersions(pending);
    }

    private void cleanupOldVersions(String keepSha) {
        File[] dirs = versionsDir.listFiles();
        if (dirs == null) return;
        for (File dir : dirs) {
            if (!dir.isDirectory() || dir.getName().equals(keepSha)) continue;
            deleteRecursively(dir);
        }
    }

    private void loadActiveTombstones() {
        activeTombstones = new HashSet<>();
        if (BASELINE_MAIN.equals(activeSha)) return;
        File f = new File(new File(versionsDir, activeSha), "tombstones.json");
        if (!f.isFile()) return;
        try {
            JSONArray a = new JSONArray(readUtf8(f));
            for (int i = 0; i < a.length(); i++) activeTombstones.add(a.getString(i));
        } catch (Exception e) {
            Log.w(TAG, "Could not read tombstones", e);
        }
    }

    WebResourceResponse intercept(String urlString) {
        Uri uri = Uri.parse(urlString);
        if (!LOCAL_HOST.equals(uri.getHost())) return null;
        String rawPath = uri.getPath();
        String path = rawPath == null ? "" : rawPath.replaceFirst("^/+", "");
        if (path.isEmpty()) path = "shogi-v21528/index.html";
        if (path.contains("..") || path.startsWith("/")) return error(403, "Forbidden");

        // The production COI shim intentionally serves the webp bytes for the historical jpg URL.
        if ("shogi/micchan21528.jpg".equals(path)) path = "shogi/micchan21528.webp";
        if (activeTombstones.contains(path)) return error(404, "Not Found");

        try {
            InputStream in = openActiveOrBundled(path);
            if (in == null) return error(404, "Not Found");
            WebResourceResponse r = new WebResourceResponse(mime(path), null, in);
            r.setStatusCodeAndReasonPhrase(200, "OK");
            r.setResponseHeaders(securityHeaders());
            return r;
        } catch (IOException e) {
            Log.e(TAG, "Serve failed: " + path, e);
            return error(500, "Offline asset error");
        }
    }

    private InputStream openActiveOrBundled(String path) throws IOException {
        if (!BASELINE_MAIN.equals(activeSha)) {
            File overlay = new File(new File(versionsDir, activeSha), path);
            if (overlay.isFile()) return new BufferedInputStream(new FileInputStream(overlay));
        }
        try {
            return context.getAssets().open(path);
        } catch (IOException notFound) {
            return null;
        }
    }

    private static Map<String, String> securityHeaders() {
        Map<String, String> h = new HashMap<>();
        h.put("Cross-Origin-Opener-Policy", "same-origin");
        h.put("Cross-Origin-Embedder-Policy", "require-corp");
        h.put("Cross-Origin-Resource-Policy", "same-origin");
        h.put("Cache-Control", "no-store");
        h.put("X-Content-Type-Options", "nosniff");
        return h;
    }

    private WebResourceResponse error(int status, String reason) {
        byte[] bytes = reason.getBytes(StandardCharsets.UTF_8);
        WebResourceResponse r = new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(bytes));
        r.setStatusCodeAndReasonPhrase(status, reason);
        r.setResponseHeaders(securityHeaders());
        return r;
    }

    private static String mime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".part")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".bin")) return "application/octet-stream";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    void checkForUpdateAsync() {
        if (!hasInternet()) return;
        new Thread(() -> {
            try {
                prefs.edit().putString(KEY_STATE, "更新確認中").apply();
                JSONObject branch = getJson(REPO_API + "/branches/main");
                JSONObject commit = branch.getJSONObject("commit");
                String latest = commit.getString("sha");
                String pending = prefs.getString(KEY_PENDING, "");
                if (latest.equals(activeSha) || latest.equals(pending)) {
                    prefs.edit().putString(KEY_STATE, "最新 " + latest.substring(0, 8)).apply();
                    return;
                }
                String latestTree = commit.getJSONObject("commit").getJSONObject("tree").getString("sha");
                Map<String, TreeEntry> baseline = tree(BASELINE_TREE);
                Map<String, TreeEntry> target = tree(latestTree);
                installOverlay(latest, baseline, target);
                prefs.edit()
                    .putString(KEY_PENDING, latest)
                    .putString(KEY_STATE, "更新取得済み・次回起動で適用")
                    .apply();
                android.os.Handler main = new android.os.Handler(context.getMainLooper());
                main.post(() -> Toast.makeText(context, "将棋の更新を取得しました。次回起動から適用します。", Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                Log.w(TAG, "Online update check failed; keeping current offline version", e);
                prefs.edit().putString(KEY_STATE, "端末内版（更新確認失敗・現行維持）").apply();
            }
        }, "mitsuki-fire-update").start();
    }

    private boolean hasInternet() {
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                Network n = cm.getActiveNetwork();
                if (n == null) return false;
                NetworkCapabilities c = cm.getNetworkCapabilities(n);
                return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            }
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (Exception e) {
            return false;
        }
    }

    private void installOverlay(String targetSha, Map<String, TreeEntry> baseline, Map<String, TreeEntry> target) throws Exception {
        File finalDir = new File(versionsDir, targetSha);
        File ready = new File(finalDir, "ready.json");
        if (ready.isFile()) return;
        File staging = new File(versionsDir, ".staging-" + targetSha);
        deleteRecursively(staging);
        if (!staging.mkdirs() && !staging.isDirectory()) throw new IOException("Could not create staging dir");

        List<String> tombstones = new ArrayList<>();
        int changed = 0;
        for (Map.Entry<String, TreeEntry> e : target.entrySet()) {
            String path = e.getKey();
            TreeEntry now = e.getValue();
            TreeEntry old = baseline.get(path);
            if (old != null && old.sha.equals(now.sha)) continue;
            if (now.size > 150L * 1024L * 1024L) throw new IOException("Refusing oversized update asset: " + path);
            downloadRaw(targetSha, path, new File(staging, path));
            changed++;
        }
        for (String oldPath : baseline.keySet()) if (!target.containsKey(oldPath)) tombstones.add(oldPath);
        writeUtf8(new File(staging, "tombstones.json"), new JSONArray(tombstones).toString());
        JSONObject meta = new JSONObject();
        meta.put("baseline", BASELINE_MAIN);
        meta.put("target", targetSha);
        meta.put("changedFiles", changed);
        meta.put("deletedFiles", tombstones.size());
        meta.put("readyAt", System.currentTimeMillis());
        writeUtf8(new File(staging, "ready.json"), meta.toString());

        deleteRecursively(finalDir);
        if (!staging.renameTo(finalDir)) throw new IOException("Could not atomically publish staged update");
    }

    private Map<String, TreeEntry> tree(String treeSha) throws Exception {
        JSONObject json = getJson(REPO_API + "/git/trees/" + treeSha + "?recursive=1");
        if (json.optBoolean("truncated", false)) throw new IOException("GitHub tree was truncated");
        JSONArray a = json.getJSONArray("tree");
        Map<String, TreeEntry> out = new HashMap<>();
        for (int i = 0; i < a.length(); i++) {
            JSONObject row = a.getJSONObject(i);
            if (!"blob".equals(row.optString("type"))) continue;
            String path = row.getString("path");
            if (!wanted(path) || path.contains("..")) continue;
            out.put(path, new TreeEntry(row.getString("sha"), row.optLong("size", 0)));
        }
        return out;
    }

    private static boolean wanted(String path) {
        for (String root : ROOTS) if (path.startsWith(root)) return true;
        return false;
    }

    private JSONObject getJson(String url) throws Exception {
        HttpURLConnection c = open(url);
        try {
            if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode() + " " + url);
            return new JSONObject(readUtf8(c.getInputStream()));
        } finally {
            c.disconnect();
        }
    }

    private void downloadRaw(String commitSha, String path, File dest) throws Exception {
        if (path.contains("..") || !wanted(path)) throw new IOException("Invalid update path");
        File parent = dest.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IOException("Could not create " + parent);
        String encodedPath = Uri.encode(path, "/");
        HttpURLConnection c = open(RAW_BASE + commitSha + "/" + encodedPath);
        try {
            if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode() + " downloading " + path);
            try (InputStream in = new BufferedInputStream(c.getInputStream());
                 BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(dest))) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
            }
        } finally {
            c.disconnect();
        }
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(12000);
        c.setReadTimeout(120000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("Accept", "application/vnd.github+json, application/octet-stream;q=0.9, */*;q=0.8");
        c.setRequestProperty("User-Agent", "MitsukiShogiFire/2.0");
        return c;
    }

    private static String readUtf8(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) { return readUtf8(in); }
    }

    private static String readUtf8(InputStream in) throws IOException {
        StringBuilder s = new StringBuilder();
        byte[] b = new byte[8192];
        int n;
        while ((n = in.read(b)) >= 0) s.append(new String(b, 0, n, StandardCharsets.UTF_8));
        return s.toString();
    }

    private static void writeUtf8(File file, String text) throws IOException {
        File parent = file.getParentFile();
        if (parent != null && !parent.exists()) parent.mkdirs();
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        }
    }

    private static void deleteRecursively(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] kids = f.listFiles();
            if (kids != null) for (File k : kids) deleteRecursively(k);
        }
        if (!f.delete()) Log.d(TAG, "Could not delete " + f);
    }

    private static final class TreeEntry {
        final String sha;
        final long size;
        TreeEntry(String sha, long size) { this.sha = sha; this.size = size; }
    }
}
