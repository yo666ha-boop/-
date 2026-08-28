plugins {
    id("com.android.application")
}

val repoRoot = rootProject.projectDir.parentFile
val generatedOfflineAssets = layout.buildDirectory.dir("generated/offlineAssets")
val prepareOfflineAssets by tasks.registering(Copy::class) {
    into(generatedOfflineAssets)
    from(File(repoRoot, "shogi-v21528")) { into("shogi-v21528") }
    from(File(repoRoot, "shogi")) { into("shogi") }
    from(File(repoRoot, "shogi-side-test")) { into("shogi-side-test") }
}

android {
    namespace = "com.mitsuki.shogi.fire"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mitsuki.shogi.fire"
        minSdk = 22
        targetSdk = 35
        versionCode = 3
        versionName = "3.0-fire-native-v970"
    }

    sourceSets["main"].assets.srcDir(generatedOfflineAssets)

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }

    androidResources {
        noCompress += listOf("bin", "wasm")
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

tasks.named("preBuild").configure {
    dependsOn(prepareOfflineAssets)
}
