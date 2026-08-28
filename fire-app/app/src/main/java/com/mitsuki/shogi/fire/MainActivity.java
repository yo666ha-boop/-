package com.mitsuki.shogi.fire;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

public final class MainActivity extends Activity {
    // Browser production remains frozen. Fire Stage 3 changes only the Fire execution transport:
    // shared-WASM -> the same YaneuraOu V9.70 source built as an Android NDK executable.
    private static final String BASELINE_MAIN = OfflineContentStore.BASELINE_MAIN;

    private WebView webView;
    private OfflineContentStore contentStore;
    private LoopbackHttpServer loopbackServer;
    private String localOrigin;
    private String appUrl;
    private boolean strengthGuardHandled;
    private boolean strengthGuardRunning;
    private boolean updateCheckStarted;
    private boolean themeInjected;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        contentStore = new OfflineContentStore(this);
        try {
            loopbackServer = new LoopbackHttpServer(this, contentStore);
            localOrigin = loopbackServer.origin();
            appUrl = loopbackServer.startUrl();
        } catch (Exception e) {
            showStartupFailure("端末内サーバーを起動できませんでした。\n" + e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()));
            return;
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        setContentView(webView);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // Existing worker code recognizes Silk/ as the Fire memory profile (Hash 48MB + adaptive mode).
        s.setUserAgentString(s.getUserAgentString() + " Silk/MitsukiFire MitsukiShogiFire/3.0 native-v970 baseline/" + BASELINE_MAIN.substring(0, 8));

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new FireInfoBridge(), "MitsukiFireNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = contentStore.intercept(request.getUrl().toString());
                return local != null ? local : super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (url != null && localOrigin != null && url.startsWith(localOrigin)) themeInjected = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (localOrigin == null || url == null || !url.startsWith(localOrigin)) return;
                injectFireTheme(view);
                if (!updateCheckStarted) {
                    updateCheckStarted = true;
                    contentStore.checkForUpdateAsync();
                }
                checkNativeStrengthGuard();
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(appUrl);
        }
        enterImmersiveMode();
    }

    private void checkNativeStrengthGuard() {
        if (strengthGuardHandled || strengthGuardRunning || loopbackServer == null) return;
        strengthGuardRunning = true;
        new Thread(() -> {
            JSONObject result = loopbackServer == null ? null : loopbackServer.nativeSelfTest();
            final String diagnostic = result == null ? "native self-test unavailable" : result.toString();
            final boolean pass = result != null && result.optBoolean("ok", false)
                && result.optString("engine", "").contains("YaneuraOu V9.70")
                && result.optString("runtime", "").contains("binaryExecutable=true")
                && result.optString("runtime", "").contains("evalReady=true");
            runOnUiThread(() -> {
                strengthGuardRunning = false;
                if (isFinishing() || strengthGuardHandled) return;
                strengthGuardHandled = true;
                if (!pass) refuseWeakFallback(diagnostic);
            });
        }, "mitsuki-native-strength-guard").start();
    }

    private void injectFireTheme(WebView view) {
        if (themeInjected) return;
        themeInjected = true;
        view.evaluateJavascript(
            "(function(){if(document.getElementById('mitsukiFireThemeScript'))return;" +
            "var s=document.createElement('script');s.id='mitsukiFireThemeScript';" +
            "s.src='/fire/fire-theme.js?v=3';document.head.appendChild(s);})()",
            null
        );
    }

    private String webViewVersion() {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                PackageInfo info = WebView.getCurrentWebViewPackage();
                if (info != null) return info.packageName + " " + info.versionName;
            }
        } catch (Throwable ignored) {}
        return "unknown";
    }

    private void refuseWeakFallback(String diagnostic) {
        if (isFinishing() || webView == null) return;
        final String runtime = loopbackServer == null ? "native runtime unavailable" : loopbackServer.nativeRuntimeInfo();
        final String details = "WebView: " + webViewVersion() + "\n" + runtime + "\n" + diagnostic;
        webView.stopLoading();
        webView.loadDataWithBaseURL(
            null,
            "<html><body style='background:#111;color:#fff;font-family:sans-serif;padding:24px'><h2>ネイティブ将棋エンジンを起動できません</h2>" +
            "<p>FireのSharedArrayBuffer制限を避けるためAndroidネイティブ版やねうら王V9.70へ切り替えましたが、この端末ではネイティブエンジンの自己診断を完了できませんでした。弱い代替動作には切り替えません。</p>" +
            "<p style='font-size:12px;white-space:pre-wrap;color:#bbb'>" + escapeHtml(details) + "</p></body></html>",
            "text/html",
            "UTF-8",
            null
        );
        new AlertDialog.Builder(this)
            .setTitle("みつき将棋")
            .setMessage("やねうら王V9.70ネイティブ版の起動確認に失敗しました。\n\n" + details)
            .setCancelable(false)
            .setPositiveButton("終了", (dialog, which) -> finish())
            .show();
    }

    private void showStartupFailure(String message) {
        new AlertDialog.Builder(this)
            .setTitle("みつき将棋")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("終了", (dialog, which) -> finish())
            .show();
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private final class FireInfoBridge {
        @JavascriptInterface public String getContentSha() {
            return contentStore == null ? BASELINE_MAIN : contentStore.activeSha();
        }
        @JavascriptInterface public String getUpdateState() {
            return contentStore == null ? "端末内版" : contentStore.updateState();
        }
        @JavascriptInterface public String getLocalOrigin() {
            return localOrigin == null ? "" : localOrigin;
        }
        @JavascriptInterface public String getEngineRuntime() {
            return loopbackServer == null ? "" : loopbackServer.nativeRuntimeInfo();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override public void onConfigurationChanged(Configuration newConfig) { super.onConfigurationChanged(newConfig); enterImmersiveMode(); }
    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) enterImmersiveMode(); }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("MitsukiFireNative");
            webView.destroy();
            webView = null;
        }
        if (loopbackServer != null) {
            loopbackServer.close();
            loopbackServer = null;
        }
        super.onDestroy();
    }

    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }
}
