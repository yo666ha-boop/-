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

// Stage 3.8 launcher icon: exact user-approved app-style Micchan + Japanese shogi-piece artwork.
// Split Base64 into small immutable text chunks so GitHub transport cannot truncate the image source.
val launcherIconBase64Parts = (1..6).map { index ->
    File(repoRoot, "fire-app/icon/micchan_stage38_app_icon.webp.b64.part$index")
}
val launcherIconOutput = generatedLauncherRes.map { it.file("drawable/micchan_launcher.webp") }
val launcherIconSha256 = "21b1c501ebf828dea3085a4da604224d686d79d92f1936453531ecbecffc24db"
val prepareLauncherIcon by tasks.registering {
    inputs.files(launcherIconBase64Parts)
    outputs.file(launcherIconOutput)
    doLast {
        launcherIconBase64Parts.forEach { part -> check(part.isFile) { "Missing Stage 3.8 launcher icon part: $part" } }
        val encoded = launcherIconBase64Parts.joinToString("") { part ->
            part.readText(Charsets.UTF_8).filterNot { it.isWhitespace() }
        }
        check(encoded.length == 21176) {
            "Stage 3.8 launcher icon Base64 length mismatch: ${encoded.length}"
        }
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
