import java.security.MessageDigest
import java.util.Base64

plugins {
    id("com.android.application")
}

val repoRoot = rootProject.projectDir.parentFile
val generatedOfflineAssets = layout.buildDirectory.dir("generated/offlineAssets")
val generatedLauncherRes = layout.buildDirectory.dir("generated/launcherRes")

val prepareOfflineAssets by tasks.registering(Copy::class) {
    into(generatedOfflineAssets)
    from(File(repoRoot, "shogi-v21528")) { into("shogi-v21528") }
    from(File(repoRoot, "shogi")) { into("shogi") }
    from(File(repoRoot, "shogi-side-test")) { into("shogi-side-test") }
}

// Stage 3.8 launcher icon: use the user-approved app-style Micchan + shogi-piece artwork.
// The approved WebP is stored as Base64 text so the repository keeps the exact tested image bytes.
val launcherIconBase64 = File(repoRoot, "fire-app/icon/micchan_stage38_app_icon.webp.b64")
val launcherIconOutput = generatedLauncherRes.map { it.file("drawable/micchan_launcher.webp") }
val launcherIconSha256 = "21b1c501ebf828dea3085a4da604224d686d79d92f1936453531ecbecffc24db"
val prepareLauncherIcon by tasks.registering {
    inputs.file(launcherIconBase64)
    outputs.file(launcherIconOutput)
    doLast {
        val encoded = launcherIconBase64.readText(Charsets.UTF_8).filterNot { it.isWhitespace() }
        val bytes = Base64.getDecoder().decode(encoded)
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString("") { byte -> "%02x".format(byte) }
        check(digest == launcherIconSha256) {
            "Stage 3.8 launcher icon digest mismatch: $digest"
        }
        val target = launcherIconOutput.get().asFile
        target.parentFile.mkdirs()
        target.writeBytes(bytes)
    }
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
    sourceSets["main"].res.srcDir(generatedLauncherRes)

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
    dependsOn(prepareLauncherIcon)
}
