import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const sha=String(process.env.PREVIEW_SHA||'').trim();
assert.match(sha,/^[0-9a-f]{40}$/,'PREVIEW_SHA must be a full commit SHA');
const url=`https://cdn.jsdelivr.net/gh/yo666ha-boop/-@${sha}/shogi-v21528/index.html`;

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  const failed=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));

  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  assert.ok(response,'preview navigation returned no response');
  assert.equal(response.status(),200,'preview URL HTTP status');

  await page.waitForFunction(()=>{
    const a=window.AI_SHOGI_TOURNAMENT?.audit?.();
    return a?.ok===true&&a?.format==='16-player'&&a?.bracketSize===16&&a?.rounds===4&&a?.charactersReady===true&&a?.button===true&&a?.panel===true;
  },null,{timeout:120000});

  const before=await page.evaluate(()=>({
    title:document.title,
    coi:crossOriginIsolated,
    cards:document.querySelectorAll('#chars .ch').length,
    tournament:window.AI_SHOGI_TOURNAMENT.audit()
  }));
  assert.equal(before.cards,26,'preview must show 26 characters');
  assert.equal(before.tournament.cups,8,'preview must expose 8 cups');
  assert.equal(before.tournament.recommended,'shinji','R1500 recommendation');

  const started=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.start('shinji'));
  assert.equal(started,true,'start shinji cup');
  await page.evaluate(()=>{
    const p=document.getElementById('tournament21540Panel');
    p?.classList.add('on');
    window.AI_SHOGI_TOURNAMENT.render();
  });
  await page.waitForSelector('.tourBracket',{state:'visible',timeout:15000});

  const bracket=await page.evaluate(()=>({
    cols:document.querySelectorAll('.tourBracketRound').length,
    firstRound:document.querySelectorAll('.tourBracketRound[data-round="0"] .tourBracketSlot').length,
    championSlots:document.querySelectorAll('.tourBracketRound[data-round="4"] .tourBracketSlot').length,
    player:document.querySelectorAll('.tourBracketSlot.player').length,
    boss:document.querySelectorAll('.tourBracketSlot.boss').length,
    scroll:!!document.querySelector('.tourBracketScroll'),
    text:document.querySelector('#tournament21540Panel')?.textContent||'',
    audit:window.AI_SHOGI_TOURNAMENT.audit()
  }));
  assert.equal(bracket.cols,5,'5 bracket columns');
  assert.equal(bracket.firstRound,16,'16 first-round slots');
  assert.equal(bracket.championSlots,1,'one champion slot');
  assert.ok(bracket.player>=1,'player shown in bracket');
  assert.ok(bracket.boss>=1,'cup boss shown in bracket');
  assert.equal(bracket.scroll,true,'mobile horizontal bracket scroll exists');
  assert.match(bracket.text,/16人トーナメント表/);
  assert.equal(bracket.audit.bracketUI,true,'bracket UI audit');

  const relevantFailures=failed.filter(x=>!/(favicon|analytics|vercel-insights)/i.test(x.url));
  assert.deepEqual(pageErrors,[],'preview page errors');
  console.log('PASS_TOURNAMENT_PREVIEW_URL_16 '+JSON.stringify({
    url,status:response.status(),title:before.title,coi:before.coi,cards:before.cards,cups:before.tournament.cups,
    format:before.tournament.format,rounds:before.tournament.rounds,columns:bracket.cols,firstRound:bracket.firstRound,
    player:bracket.player,boss:bracket.boss,requestFailures:relevantFailures.slice(0,8)
  }));
} finally {
  await browser.close();
}
