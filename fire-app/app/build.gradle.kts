plugins {
    id("com.android.application")
}

android {
    namespace = "com.mitsuki.shogi.fire"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mitsuki.shogi.fire"
        minSdk = 22
        targetSdk = 35
        versionCode = 1
        versionName = "1.0-fire-webview"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
