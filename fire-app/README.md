# みつき将棋 Fire版 — Stage 1

このディレクトリは、完成済みブラウザ版を壊さずにFireタブレット向けAPKへ包むための別系統候補です。

## 強さを維持する方針

Stage 1ではAndroid/Fire側に将棋エンジンを移植しません。専用WebViewから既存production URLを読み込むため、YaneuraOu + 水匠5、26キャラ、表示R、思考時間、MultiPV、評価損失、詰み時最善手、保存/家族コード/個人Rはブラウザ完成版と同じ実装です。

Baseline production main: `813cad97b764c142bfb34b12498790c2759fd899`

Production URL: `https://ai-shogi-yaneuraou-iphone.vercel.app/`

## Stage 1で変わるもの

- Fireホーム画面からアプリとして起動
- Silkのアドレスバーなし
- 全画面・画面常時ON
- Amazon WebView/Android WebView上で実行
- アプリのlocalStorageはSilkとは別領域。別端末/旧Silk保存は家族コードのクラウド保存で引き継ぐ

## Stage 1で変えないもの

- 将棋エンジン
- 水匠5評価ファイル
- 26人の強さ設定
- Elo-like K=24
- クラウド保存仕様

## 次段階

Fire実機でStage 1の強さ・COI・Worker・音・保存を確認した後だけ、別branchでARM native engine化を検討する。native化では弱体化を許さず、現行26人の強さ監査を再利用して同等以上を条件にする。
