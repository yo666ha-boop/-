import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const sha=String(process.env.PREVIEW_SHA||'').trim();
assert.match(sha,/^[0-9a-f]{40}$/,'PREVIEW_SHA must be a full commit SHA');
const path='preview/tournament-16/index21542b.html';
const raw=`https://raw.githubusercontent.com/yo666ha-boop/-/${sha}/${path}`;
const blob=`https://github.com/yo666ha-boop/-/blob/${sha}/${path}`;
const candidates=[`https://htmlpreview.github.io/?${raw}`,`https://htmlpreview.github.io/?${blob}`];

const browser=await chromium.launch({headless:true});
try{
  let winner=null;const attempts=[];
  for(const url of candidates){
    const page=await browser.newPage({viewport:{width:390,height:844}});const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
    try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});const status=response?.status()??0;await page.waitForTimeout(1200);const snapshot=await page.evaluate(()=>({title:document.title,hasAudit:typeof window.TOURNAMENT_PREVIEW_AUDIT==='function',body:(document.body?.innerText||'').slice(0,220)}));attempts.push({url,status,...snapshot,pageErrors});if(status===200&&snapshot.hasAudit){winner={url,page,status};break}}catch(e){attempts.push({url,error:String(e),pageErrors})}if(!winner)await page.close();
  }
  console.log('PREVIEW_HOST_ATTEMPTS '+JSON.stringify(attempts));assert.ok(winner,'no standalone preview host executed the page JavaScript');
  const {url,page,status}=winner;
  await page.waitForFunction(()=>window.TOURNAMENT_PREVIEW_AUDIT?.().portraitCatalog===26,{timeout:15000});
  let audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.standalone,true);assert.equal(audit.cups,8);assert.equal(audit.recommended,'shinji');assert.equal(audit.portraitCatalog,26);assert.deepEqual(audit.portraitMissing,[]);assert.equal(await page.locator('[data-cup]').count(),8);assert.match(await page.title(),/画像完全＋Fireフィット確認版/);assert.match(await page.locator('.notice').innerText(),/勝者は開始時には決まっていません/);
  await page.locator('[data-cup="shinji"] button').click();await page.waitForSelector('#stage.on .bracket',{state:'visible',timeout:10000});audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.active.cup,'shinji');assert.equal(audit.active.slots,16);assert.equal(audit.active.columns,5);assert.equal(audit.columns,5);assert.equal(audit.firstRound,16);assert.equal(audit.active.resolved,0,'no AI winner at opening');assert.equal(audit.active.running,7,'seven parallel AI matches at opening');assert.equal(await page.locator('.round:first-child .slot img').count(),15,'all 15 AI entrants have portraits');assert.equal(await page.locator('.slot.player').count(),1);assert.ok(await page.locator('.slot.boss').count()>=1);assert.ok(await page.locator('.state.running').count()>=16,'all eight first-round matches visibly running');assert.ok((await page.locator('#news').innerText()).length>0,'tournament news visible');
  for(let i=0;i<4;i++){await page.locator('#winBtn').click();if(i<3){await page.waitForSelector('#nextBtn:not([hidden])');await page.locator('#nextBtn').click();}}
  audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());assert.equal(audit.active.status,'champion');assert.match(await page.locator('#status').innerText(),/優勝/);assert.equal(await page.locator('.slot.champion.player').count(),1);
  await page.close();

  const fire=await browser.newPage({viewport:{width:1280,height:800}});
  await fire.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await fire.waitForFunction(()=>window.TOURNAMENT_PREVIEW_AUDIT?.().portraitCatalog===26,{timeout:15000});await fire.locator('[data-cup="shinji"] button').click();await fire.waitForSelector('#stage.on .bracket',{state:'visible'});const fireAudit=await fire.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());assert.ok(fireAudit.bracketOverflow<=3,`Fire-fit preview overflow ${fireAudit.bracketOverflow}px`);assert.equal(await fire.locator('.round').count(),5);assert.equal(await fire.locator('.round:first-child .slot img').count(),15);await fire.close();

  console.log('PASS_TOURNAMENT_STANDALONE_PREVIEW_21542B '+JSON.stringify({url,status,cups:8,portraitCatalog:26,firstRoundPortraits:15,initialRunning:7,initialResolved:0,fireOverflow:fireAudit.bracketOverflow,champion:'player'}));
} finally {await browser.close()}
