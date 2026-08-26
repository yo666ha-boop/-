import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

const code='abcdefghijklmnopqrstuvwxyzABCDEFGH';
const html=`<!doctype html><html><body><div class="controls"></div><div id="status"></div><div id="fstatus"></div><script src="/shogi-v21528/cloud-save21531.js"></script></body></html>`;
await fs.writeFile('cloud-code-copy-test.html',html);

async function run(browserType,name){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext();
  await context.route('https://htvfcdktdjtyoyzrohji.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,record:null})}));
  await context.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedSyncCode=text;}}});
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/cloud-code-copy-test.html');
  await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE&&document.getElementById('cloudCodeBtn'));
  const initial=await page.evaluate(()=>({audit:AI_SHOGI_CLOUD_SAVE.audit(),disabled:document.getElementById('cloudCodeBtn').disabled,text:document.getElementById('cloudCodeBtn').textContent}));
  assert.equal(initial.audit.buttons.cloud,true);
  assert.equal(initial.audit.buttons.codeCopy,true);
  assert.equal(initial.audit.buttons.pull,true);
  assert.equal(initial.disabled,true);
  assert.equal(initial.text,'同期コードをコピー');

  const enabled=await page.evaluate(c=>AI_SHOGI_CLOUD_SAVE.enableWithCode(c),code);
  assert.equal(enabled,true);
  await page.waitForFunction(()=>document.getElementById('cloudCodeBtn').disabled===false);
  const copied=await page.evaluate(async()=>{const ok=await AI_SHOGI_CLOUD_SAVE.copySyncCode();return {ok,copied:window.__copiedSyncCode,status:document.getElementById('status').textContent,audit:AI_SHOGI_CLOUD_SAVE.audit()};});
  assert.equal(copied.ok,true);
  assert.equal(copied.copied,code);
  assert.match(copied.status,/同期コードをコピーしました/);
  assert.equal(copied.audit.configured,true);
  assert.equal(copied.audit.buttons.codeCopy,true);
  console.log('CLOUD_CODE_COPY_ENV '+JSON.stringify({name,buttons:copied.audit.buttons,configured:copied.audit.configured,clipboard:true,status:copied.status}));
  await context.close();await browser.close();
}

await run(chromium,'DESKTOP_CHROMIUM');
await run(webkit,'IPHONE_WEBKIT');
console.log('PASS_CLOUD_CODE_COPY_CHROMIUM_WEBKIT');
