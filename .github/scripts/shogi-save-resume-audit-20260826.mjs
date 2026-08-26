import { chromium, firefox, webkit, devices } from 'playwright';

const BASE = process.env.SHOGI_URL || 'http://127.0.0.1:8000/shogi-v21528/';
const targets = [
  { name: 'chromium', type: chromium, context: { viewport: { width: 1280, height: 900 } } },
  { name: 'firefox', type: firefox, context: { viewport: { width: 1280, height: 900 } } },
  { name: 'webkit-iphone', type: webkit, context: { ...devices['iPhone 13'] } },
];

function sqIndex(sq) {
  const file = Number(sq[0]);
  const rank = sq.charCodeAt(1) - 'a'.charCodeAt(0);
  if (!(file >= 1 && file <= 9 && rank >= 0 && rank <= 8)) throw new Error('bad USI square ' + sq);
  return rank * 9 + (9 - file);
}

function stateKey(x) {
  return JSON.stringify({ b: x.b, h: x.h, t: x.t, log: x.log, last: x.last });
}

async function waitApp(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForFunction(() => {
        return !!window.AI_SHOGI_SAVE && !!window.AIShogiIOS &&
          document.querySelectorAll('#board .sq').length === 81 &&
          document.querySelectorAll('#chars .ch').length === 26 &&
          !!document.getElementById('saveGameBtn') && !!document.getElementById('resumeGameBtn');
      }, { timeout: 60000 });
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1500);
    }
  }
}

async function assetIntegrity(page) {
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('#chars .ch img')];
    const broken = imgs.map((img, i) => ({ i, src: img.currentSrc || img.src, complete: img.complete, w: img.naturalWidth, h: img.naturalHeight }))
      .filter(x => !x.complete || x.w <= 0 || x.h <= 0);
    const d7 = window.AIShogiIOS.dialogues?.(7) || {};
    const dialoguePatch = Array.isArray(d7.start) && d7.start.includes('今日は、最後までちゃんと考える。');
    return { imageCount: imgs.length, broken, dialoguePatch };
  });
}

async function runOne(target) {
  const browser = await target.type.launch({ headless: true });
  const context = await browser.newContext(target.context);
  const page = await context.newPage();
  const logs = [];
  const errors = [];
  page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', e => errors.push(String(e?.message || e)));
  page.on('dialog', async d => { try { await d.accept(); } catch {} });

  const url = BASE + (BASE.includes('?') ? '&' : '?') + `saveaudit=${Date.now()}-${target.name}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitApp(page);

  const initial = await page.evaluate(() => {
    window.AI_SHOGI_SAVE.clear();
    return {
      api: window.AI_SHOGI_SAVE.audit(),
      version: window.AI_SHOGI_SAVE.version,
      cards: document.querySelectorAll('#chars .ch').length,
      coi: globalThis.crossOriginIsolated,
      saveBtn: document.getElementById('saveGameBtn')?.textContent,
      resumeDisabled: document.getElementById('resumeGameBtn')?.disabled,
      focusSave: !!document.getElementById('fsaveGameBtn')
    };
  });
  if (initial.version !== '21530a') throw new Error(`${target.name}: save API version ${initial.version}`);
  if (initial.cards !== 26) throw new Error(`${target.name}: cards ${initial.cards}`);
  if (initial.saveBtn !== '対局保存') throw new Error(`${target.name}: save button missing`);
  if (!initial.resumeDisabled) throw new Error(`${target.name}: empty resume should be disabled`);
  if (!initial.focusSave) throw new Error(`${target.name}: focus save button missing`);

  const assets = await assetIntegrity(page);
  if (assets.imageCount !== 26 || assets.broken.length) throw new Error(`${target.name}: character image integrity failed ${JSON.stringify(assets)}`);
  if (!assets.dialoguePatch) throw new Error(`${target.name}: dialogue21510 patch not active ${JSON.stringify(assets)}`);

  await page.click('#saveGameBtn');
  await page.waitForFunction(() => !!window.AI_SHOGI_SAVE.data());
  const manual = await page.evaluate(() => ({ audit: window.AI_SHOGI_SAVE.audit(), data: window.AI_SHOGI_SAVE.data() }));
  if (!manual.audit.hasSave || manual.audit.savedPly !== 0 || manual.data.reason !== 'manual') {
    throw new Error(`${target.name}: manual save failed ${JSON.stringify(manual)}`);
  }

  await page.evaluate(() => { window.AIShogiIOS.select(24); window.AI_SHOGI_SAVE.clear(); });
  const legal = await page.evaluate(() => window.AIShogiIOS.legal());
  const move = legal.find(u => /^[1-9][a-i][1-9][a-i]$/.test(u)) || legal[0];
  if (!move || move.includes('*')) throw new Error(`${target.name}: no simple opening move ${JSON.stringify(legal.slice(0, 20))}`);
  const from = sqIndex(move.slice(0, 2));
  const to = sqIndex(move.slice(2, 4));
  await page.locator('#board .sq').nth(from).click();
  await page.locator('#board .sq').nth(to).click();

  await page.waitForFunction(() => (window.AI_SHOGI_SAVE.data()?.st?.log?.length || 0) >= 1, { timeout: 10000 });
  const afterHuman = await page.evaluate(() => ({ audit: window.AI_SHOGI_SAVE.audit(), reason: window.AI_SHOGI_SAVE.data()?.reason, t: window.AIShogiIOS.state()?.t }));
  if (afterHuman.audit.savedPly < 1) throw new Error(`${target.name}: human move was not auto-saved`);

  await page.waitForFunction(() => {
    const s = window.AIShogiIOS.state();
    const a = window.AI_SHOGI_SAVE.audit();
    return s && s.t === 1 && s.log.length >= 2 && a.savedPly === s.log.length;
  }, { timeout: 30000 });

  const beforeReload = await page.evaluate(() => ({
    state: window.AIShogiIOS.state(),
    saved: window.AI_SHOGI_SAVE.data(),
    audit: window.AI_SHOGI_SAVE.audit(),
    char: window.AIShogiIOS.char(),
    resumeText: document.getElementById('resumeGameBtn')?.textContent
  }));
  if (beforeReload.saved.ci !== 24) throw new Error(`${target.name}: opponent index not saved ${beforeReload.saved.ci}`);
  if (beforeReload.audit.savedPly !== beforeReload.audit.currentPly) throw new Error(`${target.name}: auto-save not current ${JSON.stringify(beforeReload.audit)}`);
  const expectedKey = stateKey(beforeReload.saved.st);
  const expectedPly = beforeReload.saved.st.log.length;

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitApp(page);
  const beforeResume = await page.evaluate(() => ({ audit: window.AI_SHOGI_SAVE.audit(), disabled: document.getElementById('resumeGameBtn')?.disabled, text: document.getElementById('resumeGameBtn')?.textContent }));
  if (!beforeResume.audit.hasSave || beforeResume.disabled) throw new Error(`${target.name}: save missing after reload ${JSON.stringify(beforeResume)}`);
  if (beforeResume.audit.currentPly !== 0) throw new Error(`${target.name}: page should start fresh before resume ${JSON.stringify(beforeResume.audit)}`);

  await page.click('#resumeGameBtn');
  await page.waitForFunction(p => window.AIShogiIOS.state()?.log?.length === p, expectedPly, { timeout: 10000 });
  const restored = await page.evaluate(() => ({ state: window.AIShogiIOS.state(), audit: window.AI_SHOGI_SAVE.audit(), char: window.AIShogiIOS.char() }));
  if (stateKey(restored.state) !== expectedKey) throw new Error(`${target.name}: restored state mismatch`);
  if (restored.audit.currentCharacter !== 24 || restored.char?.[0] !== beforeReload.char?.[0]) throw new Error(`${target.name}: opponent restore mismatch ${JSON.stringify(restored)}`);

  await page.click('#undoBtn');
  await page.waitForFunction(p => (window.AIShogiIOS.state()?.log?.length || 0) < p, expectedPly, { timeout: 10000 });
  await page.waitForTimeout(250);
  const afterUndo = await page.evaluate(() => ({ state: window.AIShogiIOS.state(), saved: window.AI_SHOGI_SAVE.data(), audit: window.AI_SHOGI_SAVE.audit() }));
  const undoPly = afterUndo.state.log.length;
  const savedUndoPly = afterUndo.saved?.st?.log?.length ?? -1;
  if (savedUndoPly !== undoPly) throw new Error(`${target.name}: undo left stale save current=${undoPly} saved=${savedUndoPly}`);

  const localCors = BASE.startsWith('http://127.0.0.1') || BASE.startsWith('http://localhost');
  const verifiedFallbackAccessError = target.name === 'webkit-iphone' && assets.imageCount === 26 && assets.broken.length === 0 && assets.dialoguePatch;
  const fatalErrors = errors.filter(e => {
    if (!/due to access control checks/i.test(e)) return true;
    if (localCors) return false;
    return !verifiedFallbackAccessError;
  });
  if (fatalErrors.length) throw new Error(`${target.name}: page errors: ${fatalErrors.join(' | ')}`);
  console.log('PASS_SAVE_RESUME', JSON.stringify({
    browser: target.name,
    coi: initial.coi,
    move,
    expectedPly,
    undoPly,
    savedUndoPly,
    imageCount: assets.imageCount,
    dialoguePatch: assets.dialoguePatch,
    ignoredVerifiedAccessErrors: errors.length - fatalErrors.length,
    char: beforeReload.char?.[0],
    audit: restored.audit,
    logTail: logs.slice(-8)
  }));
  await browser.close();
}

(async () => {
  const failures = [];
  for (const target of targets) {
    try { await runOne(target); }
    catch (e) { failures.push(`${target.name}: ${e?.stack || e}`); }
  }
  if (failures.length) {
    console.error('FAIL_SAVE_RESUME\n' + failures.join('\n---\n'));
    process.exit(1);
  }
  console.log('PASS_SAVE_RESUME_ALL_BROWSERS');
})();
