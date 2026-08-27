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

public final class MainActivity extends Activity {
    // Fire Stage 2.1 still serves the exact frozen browser baseline from APK assets.
    // No shogi engine/profile/rating code is weakened or replaced by the Android wrapper.
    private static final String BASELINE_MAIN = OfflineContentStore.BASELINE_MAIN;

    private WebView webView;
    private OfflineContentStore contentStore;
    private LoopbackHttpServer loopbackServer;
    private String localOrigin;
    private String appUrl;
    private boolean strengthGuardHandled;
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
            loopbackServer = new LoopbackHttpServer(contentStore);
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
        s.setUserAgentString(s.getUserAgentString() + " MitsukiShogiFire/2.1 loopback baseline/" + BASELINE_MAIN.substring(0, 8));

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new FireInfoBridge(), "MitsukiFireNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // The new normal path is real localhost HTTP. Keep the old pseudo-HTTPS resolver only
                // as an internal compatibility fallback for any legacy absolute asset URL.
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
                if (!strengthGuardHandled) checkStrengthGuard(view, 0);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(appUrl);
        }
        enterImmersiveMode();
    }

    private void checkStrengthGuard(WebView view, int attempt) {
        if (strengthGuardHandled || view == null) return;
        final String script =
            "(function(){" +
            "var shared=false,err='';" +
            "try{shared=(typeof SharedArrayBuffer==='function')&&(new WebAssembly.Memory({initial:1,maximum:1,shared:true}).buffer instanceof SharedArrayBuffer)}catch(e){err=String(e)}" +
            "return 'coi='+!!self.crossOriginIsolated+'|secure='+!!self.isSecureContext+'|sab='+(typeof SharedArrayBuffer==='function')+'|wasm='+(typeof WebAssembly==='object')+'|sharedMemory='+shared+'|err='+err+'|ua='+navigator.userAgent;" +
            "})()";
        view.evaluateJavascript(script, value -> {
            if (strengthGuardHandled) return;
            String diagnostic = value == null ? "" : value;
            boolean pass = diagnostic.contains("coi=true")
                && diagnostic.contains("secure=true")
                && diagnostic.contains("sab=true")
                && diagnostic.contains("wasm=true")
                && diagnostic.contains("sharedMemory=true");
            if (pass) {
                strengthGuardHandled = true;
                return;
            }
            if (attempt < 3) {
                view.postDelayed(() -> checkStrengthGuard(view, attempt + 1), 700L);
                return;
            }
            strengthGuardHandled = true;
            refuseWeakFallback(diagnostic);
        });
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
        final String details = "WebView: " + webViewVersion() + "\n" + diagnostic;
        webView.stopLoading();
        webView.loadDataWithBaseURL(
            null,
            "<html><body style='background:#111;color:#fff;font-family:sans-serif;padding:24px'><h2>強さ維持条件を満たしていません</h2>" +
            "<p>このFireでは、現在のやねうら王＋水匠5が必要とする共有WebAssemblyメモリを有効にできませんでした。弱い代替動作には切り替えず停止しました。</p>" +
            "<p style='font-size:12px;white-space:pre-wrap;color:#bbb'>" + escapeHtml(details) + "</p></body></html>",
            "text/html",
            "UTF-8",
            null
        );
        new AlertDialog.Builder(this)
            .setTitle("みつき将棋")
            .setMessage("同じ強さで動かす条件を確認できませんでした。\n\n" + details)
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
        @JavascriptInterface
        public String getContentSha() {
            return contentStore == null ? BASELINE_MAIN : contentStore.activeSha();
        }

        @JavascriptInterface
        public String getUpdateState() {
            return contentStore == null ? "端末内版" : contentStore.updateState();
        }

        @JavascriptInterface
        public String getLocalOrigin() {
            return localOrigin == null ? "" : localOrigin;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        enterImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
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
