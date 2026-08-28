import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { webkit } from 'playwright';

const shim=fs.readFileSync('coi-serviceworker.js','utf8');
const canonical=fs.readFileSync('shogi-v21528/coi-serviceworker.js','utf8');
const cloud=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const family=fs.readFileSync('shogi-v21528/cloud-family-switcher21533.js','utf8');
assert.match(shim,/document\.write\([\s\S]*\/shogi-v21528\/coi-serviceworker\.js\?v=21537a/);
assert.match(shim,/importScripts\('\.\/shogi-v21528\/coi-serviceworker\.js\?v=21537a'\)/);
assert.match(shim,/__AI_SHOGI_ROOT_COI_SHIM_21537A/);
assert.match(canonical,/board-theme21537\.js\?v=21537a/);
assert.match(canonical,/cloud-save21531\.js\?v=21532a/);
assert.match(canonical,/cloud-slot-picker21532\.js\?v=21532b/);
assert.match(canonical,/cloud-family-switcher21533\.js\?v=21533a/);
assert.match(canonical,/profile-stats21535\.js\?v=21535a/);
assert.match(canonical,/rating-progress21536\.js\?v=21536b/);
assert.match(canonical,/ai-shogi-coi-reload-21537a/);
assert.match(cloud,/version:'21532a'/);
assert.match(cloud,/supabase-edge-cas-multislot-v2/);
assert.match(family,/version:'21533a'/);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.bin':'application/octet-stream','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.part':'text/plain; charset=utf-8'};
const root=process.cwd();
const server=http.createServer((req,res)=>{
  let pathname=decodeURIComponent(new URL(req.url,'http://x').pathname);
  if(pathname==='/')pathname='/shogi-v21528/index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end('404')}
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(4197,'127.0.0.1',r));

let browser;
try{
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1'});
  const page=await context.newPage();
  const bad=[];
  page.on('console',m=>{if(m.type()==='error')bad.push(m.text())});
  page.on('pageerror',e=>bad.push(String(e.message||e)));
  const response=await page.goto('http://127.0.0.1:4197/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200);
  await page.waitForFunction(()=>window.AI_SHOGI_CLOUD_SAVE?.version==='21532a'&&window.AI_SHOGI_FAMILY_SWITCHER?.version==='21533a'&&window.AI_SHOGI_PROFILE_STATS?.version==='21535a'&&window.AI_SHOGI_RATING_PROGRESS?.version==='21536b'&&window.AI_SHOGI_BOARD_THEME?.version==='21537a'&&!!document.getElementById('cloudPullBtn')&&!!document.getElementById('cloudFamilySwitchBtn')&&!!document.getElementById('boardThemeBtn'),null,{timeout:30000});
  const audit=await page.evaluate(()=>({
    coi:crossOriginIsolated,
    cloud:window.AI_SHOGI_CLOUD_SAVE?.audit?.(),
    family:window.AI_SHOGI_FAMILY_SWITCHER?.audit?.(),
    profile:window.AI_SHOGI_PROFILE_STATS?.audit?.(),
    ratingProgress:window.AI_SHOGI_RATING_PROGRESS?.audit?.(),
    boardTheme:{version:window.AI_SHOGI_BOARD_THEME?.version,current:window.AI_SHOGI_BOARD_THEME?.get?.(),button:document.getElementById('boardThemeBtn')?.textContent||''},
    cards:document.querySelectorAll('#chars .ch').length,
    shim:!!window.__AI_SHOGI_ROOT_COI_SHIM_21537A,
    swScript:[...document.scripts].map(s=>s.src).find(s=>s.includes('/shogi-v21528/coi-serviceworker.js'))||''
  }));
  assert.equal(audit.coi,true);
  assert.equal(audit.shim,true);
  assert.equal(audit.cards,26);
  assert.equal(audit.cloud?.backend,'supabase-edge-cas-multislot-v2');
  assert.equal(audit.cloud?.buttons?.cloud,true);
  assert.equal(audit.cloud?.buttons?.pull,true);
  assert.equal(audit.family?.ok,true);
  assert.equal(audit.family?.button,true);
  assert.equal(audit.profile?.ok,true);
  assert.equal(audit.ratingProgress?.ok,true);
  assert.equal(audit.boardTheme?.version,'21537a');
  assert.equal(audit.boardTheme?.current,'bright');
  assert.match(audit.boardTheme?.button||'',/明るい木目/);
  assert.match(audit.swScript,/\/shogi-v21528\/coi-serviceworker\.js\?v=21537a/);
  assert.ok(!bad.some(x=>x.includes('save/cloud patch inject failed')),bad.join('\n'));
  console.log('PASS Vercel-root WebKit shim + board theme + family/profile/rating runtime 21537a',JSON.stringify(audit));
} finally {
  if(browser)await browser.close();
  await new Promise(r=>server.close(r));
}
