package com.mitsuki.shogi.fire;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.pm.ApplicationInfo;
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
    // Fire Stage 2 serves the exact frozen browser baseline from APK assets.
    // No shogi engine/profile/rating code is weakened or replaced by the Android wrapper.
    private static final String APP_URL = OfflineContentStore.START_URL;
    private static final String BASELINE_MAIN = OfflineContentStore.BASELINE_MAIN;

    private WebView webView;
    private OfflineContentStore contentStore;
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
        s.setUserAgentString(s.getUserAgentString() + " MitsukiShogiFire/2.0 offline baseline/" + BASELINE_MAIN.substring(0, 8));

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
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!url.startsWith(OfflineContentStore.LOCAL_ORIGIN)) return;
                injectFireTheme(view);
                if (!updateCheckStarted) {
                    updateCheckStarted = true;
                    contentStore.checkForUpdateAsync();
                }
                if (strengthGuardHandled) return;
                view.evaluateJavascript(
                    "(function(){return !!(self.crossOriginIsolated && typeof SharedArrayBuffer==='function' && typeof WebAssembly==='object');})()",
                    value -> {
                        if ("true".equals(value)) {
                            strengthGuardHandled = true;
                        } else {
                            strengthGuardHandled = true;
                            refuseWeakFallback();
                        }
                    }
                );
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL);
        }
        enterImmersiveMode();
    }

    private void injectFireTheme(WebView view) {
        if (themeInjected) return;
        themeInjected = true;
        view.evaluateJavascript(
            "(function(){if(document.getElementById('mitsukiFireThemeScript'))return;" +
            "var s=document.createElement('script');s.id='mitsukiFireThemeScript';" +
            "s.src='/fire/fire-theme.js?v=2';document.head.appendChild(s);})()",
            null
        );
    }

    private void refuseWeakFallback() {
        if (isFinishing() || webView == null) return;
        webView.stopLoading();
        webView.loadDataWithBaseURL(
            null,
            "<html><body style='background:#111;color:#fff;font-family:sans-serif;padding:24px'><h2>強さ維持条件を満たしていません</h2><p>このFireのWebViewでは、現在のやねうら王＋水匠5を同じ条件で動かせません。弱い代替動作には切り替えず停止しました。</p></body></html>",
            "text/html",
            "UTF-8",
            null
        );
        new AlertDialog.Builder(this)
            .setTitle("みつき将棋")
            .setMessage("この端末では現在の強さを維持できる実行条件を確認できませんでした。弱くして続行せず、ここで停止します。")
            .setCancelable(false)
            .setPositiveButton("終了", (dialog, which) -> finish())
            .show();
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
