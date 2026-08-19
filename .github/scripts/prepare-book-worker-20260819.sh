#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/pbook shogi-v21528/bookpractical
curl -fL --retry 3 'https://github.com/yaneurao/YaneuraOu/releases/download/v4.73_book/standard_book.zip' -o /tmp/pbook/book.zip
unzip -o /tmp/pbook/book.zip -d /tmp/pbook/unpack >/dev/null
BOOK=$(find /tmp/pbook/unpack -type f -name standard_book.db | head -1)
test -n "$BOOK"
cp "$BOOK" shogi-v21528/yaneuraou/standard_book.db
ln -sfn ../yaneuraou shogi-v21528/bookpractical/yaneuraou
cp shogi-v21528/future-yaneura-worker21528.js shogi-v21528/bookpractical/future-worker.js
python3 - <<'PY'
from pathlib import Path
p=Path('shogi-v21528/bookpractical/future-worker.js')
s=p.read_text()
s=s.replace("const EVAL='nn.bin';","const EVAL='nn.bin';\nconst BOOK='standard_book.db';",1)
old="""    engine.FS.writeFile('/'+EVAL,bytes);
    engine.addMessageListener(onLine);"""
new="""    engine.FS.writeFile('/'+EVAL,bytes);
    stage('⑤-3b 公式標準定跡取得中');
    const rb=await fetch(BASE+BOOK+'?v=bookprobe',{cache:'no-store'});if(!rb.ok)throw new Error(BOOK+' '+rb.status);
    const bbytes=new Uint8Array(await rb.arrayBuffer());if(bbytes.byteLength<1000000)throw new Error(BOOK+' too small '+bbytes.byteLength);
    try{engine.FS.unlink('/'+BOOK)}catch(e){}
    engine.FS.writeFile('/'+BOOK,bbytes);stage('⑤-3b 標準定跡 '+Math.round(bbytes.byteLength/1024/1024)+'MB 読込完了');
    engine.addMessageListener(onLine);"""
if old not in s: raise SystemExit('FS marker missing')
s=s.replace(old,new,1)
old2="stage('⑤-4f MultiPV設定開始');await sendUSI('setoption name MultiPV value 1');stage('⑤-4f MultiPV設定完了');"
new2=old2+"\n    stage('⑤-4g 定跡設定開始');await sendUSI('setoption name USI_OwnBook value true');await sendUSI('setoption name BookDir value .');await sendUSI('setoption name BookFile value '+BOOK);stage('⑤-4g 定跡設定完了 '+BOOK);"
if old2 not in s: raise SystemExit('option marker missing')
p.write_text(s.replace(old2,new2,1))
PY
echo "PBOOK_SIZE $(stat -c%s shogi-v21528/yaneuraou/standard_book.db)"
echo "PBOOK_SHA $(sha256sum shogi-v21528/yaneuraou/standard_book.db | awk '{print $1}')"
