import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const sha=String(process.env.PREVIEW_SHA||'').trim();
assert.match(sha,/^[0-9a-f]{40}$/,'PREVIEW_SHA must be a full commit SHA');
const url=`https://cdn.jsdelivr.net/gh/yo666ha-boop/-@${sha}/preview/tournament-16/index.html`;

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  assert.ok(response,'preview navigation returned no response');
  assert.equal(response.status(),200,'preview URL HTTP status');
  await page.waitForFunction(()=>window.TOURNAMENT_PREVIEW_AUDIT?.().ok===true,null,{timeout:15000});

  let audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.standalone,true);
  assert.equal(audit.cups,8);
  assert.equal(audit.recommended,'shinji');
  assert.equal(await page.locator('[data-cup]').count(),8);
  assert.match(await page.title(),/大会モード16人確認版/);
  assert.match(await page.locator('.notice').innerText(),/本体とは完全に別/);

  await page.locator('[data-cup="shinji"]').click();
  await page.waitForSelector('#stage.on .bracket',{state:'visible',timeout:10000});
  audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.active.cup,'shinji');
  assert.equal(audit.active.slots,16);
  assert.equal(audit.active.columns,5);
  assert.equal(audit.columns,5);
  assert.equal(audit.firstRound,16);
  assert.equal(await page.locator('.slot.player').count(),1);
  assert.ok(await page.locator('.slot.boss').count()>=1);

  for(let i=0;i<4;i++)await page.locator('#winBtn').click();
  audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.active.status,'champion');
  assert.match(await page.locator('#status').innerText(),/優勝/);
  assert.equal(await page.locator('.slot.champion.player').count(),1);
  assert.deepEqual(pageErrors,[],'preview page errors');

  console.log('PASS_TOURNAMENT_STANDALONE_PREVIEW_URL_16 '+JSON.stringify({url,status:response.status(),cups:audit.cups,recommended:'shinji',slots:16,columns:5,champion:'player'}));
} finally {
  await browser.close();
}
