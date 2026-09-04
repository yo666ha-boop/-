import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const sha=String(process.env.PREVIEW_SHA||'').trim();
assert.match(sha,/^[0-9a-f]{40}$/,'PREVIEW_SHA must be a full commit SHA');
const path='preview/tournament-16/index.html';
const candidates=[
  `https://raw.githack.com/yo666ha-boop/-/${sha}/${path}`,
  `https://rawcdn.githack.com/yo666ha-boop/-/${sha}/${path}`,
  `https://cdn.jsdelivr.net/gh/yo666ha-boop/-@${sha}/${path}`
];

const browser=await chromium.launch({headless:true});
try{
  let winner=null;
  const attempts=[];
  for(const url of candidates){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e)));
    try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      const status=response?.status()??0;
      await page.waitForTimeout(1000);
      const snapshot=await page.evaluate(()=>({title:document.title,hasAudit:typeof window.TOURNAMENT_PREVIEW_AUDIT==='function',body:(document.body?.innerText||'').slice(0,180)}));
      attempts.push({url,status,...snapshot,pageErrors});
      if(status===200&&snapshot.hasAudit){winner={url,page,status};break}
    }catch(e){attempts.push({url,error:String(e),pageErrors})}
    await page.close();
  }
  console.log('PREVIEW_HOST_ATTEMPTS '+JSON.stringify(attempts));
  assert.ok(winner,'no standalone preview host executed the page JavaScript');

  const {url,page,status}=winner;
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
  console.log('PASS_TOURNAMENT_STANDALONE_PREVIEW_URL_16 '+JSON.stringify({url,status,cups:audit.cups,recommended:'shinji',slots:16,columns:5,champion:'player'}));
  await page.close();
} finally {
  await browser.close();
}
