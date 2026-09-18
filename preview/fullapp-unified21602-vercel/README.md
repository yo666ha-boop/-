# Full-app unified preview 21602

This package is only for the tournament feature branch preview.

It serves the real shogi-v21528 application through the same path layout used by normal play, so tournament mode can be checked on the real 81-square board instead of the standalone tournament mock.

The proxy is pinned to the exact product head already validated by the 21601 full-app run. Existing production Vercel projects, main, PR121/APK, ratings, engine settings, MultiPV, cp-loss, and personalities are not changed.
