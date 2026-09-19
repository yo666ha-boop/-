import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const sha=String(process.env.PREVIEW_SHA||'').trim();
assert.match(sha,/^[0-9a-f]{40}$/);
const path='preview/tournament-16/index21543.html';
const raw=`https://raw.githubusercontent.com/yo666ha-boop/-/${sha}/${path}`;
const blob=`https://github.com/yo666ha-boop/-/blob/${sha}/${path}`;
const candidates=[`https://htmlpreview.github.io/?${raw}`,`https://htmlpreview.github.io/?${blob}`];
const browser=await chromium.launch({headless:true});
try{
  let winner=null;const attempts=[];
  for(const url of candidates){
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}),status=response?.status()??0;
      await page.waitForTimeout(1400);
      const snap=await page.evaluate(()=>({title:document.title,hasAudit:typeof window.TOURNAMENT_PREVIEW_AUDIT==='function',hasBracket:!!window.AI_SHOGI_TOURNAMENT_BRACKET_UI,hasDialogue:typeof window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT==='function',body:(document.body?.innerText||'').slice(0,240)}));
      attempts.push({url,status,...snap,errors});
      if(status===200&&snap.hasAudit&&snap.hasBracket&&snap.hasDialogue){winner={url,page,status,errors};break}
    }catch(e){attempts.push({url,error:String(e),errors})}
    if(!winner)await page.close();
  }
  console.log('PREVIEW21589_HOST_ATTEMPTS '+JSON.stringify(attempts));
  assert.ok(winner,'no usable immutable preview host');
  const {url,page,status,errors}=winner;
  await page.waitForFunction(()=>{
    const a=window.TOURNAMENT_PREVIEW_AUDIT?.(),d=window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT?.();
    return a?.portraitCatalog===26&&a?.cups===10&&d?.bank?.bosses===12&&d?.bank?.contexts>=19;
  },{timeout:20000});
  let audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  let dialogue=await page.evaluate(()=>window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT());
  assert.equal(audit.standalone,true);assert.equal(audit.cups,10);assert.equal(audit.recommended,'kenshiro');
  assert.equal(audit.portraitCatalog,26);assert.deepEqual(audit.portraitMissing,[]);
  assert.equal(dialogue.bank.bosses,12);assert.equal(dialogue.bank.contexts,19);assert.ok(dialogue.bank.minVariants>=25);assert.ok(dialogue.bank.totalContextVariants>=5700);
  assert.equal(await page.locator('[data-cup]').count(),10);
  const labels=await page.locator('.cup small').allTextContents();assert.equal(labels.length,10);assert.equal(labels.some(x=>x.includes('決勝ボス')),false);assert.equal(labels.every(x=>x.includes('優勝後ボス')),true);
  await page.locator('[data-cup="kenshiro"] button').click();
  await page.waitForSelector('#stage.on .bracket',{state:'visible'});await page.waitForTimeout(150);
  audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());dialogue=await page.evaluate(()=>window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT());
  assert.equal(audit.format,'16-player-then-boss');assert.equal(audit.bossSeparate,true);assert.equal(audit.bossInBracket,false);assert.equal(audit.active.cup,'kenshiro');assert.equal(audit.firstRound,16);assert.equal(audit.active.resolved,0);assert.equal(audit.active.running,7);
  assert.equal(await page.locator('.round:first-child .slot img').count(),15);assert.equal(await page.locator('.slot.player').count(),1);assert.equal(await page.locator('.slot.boss').count(),0);
  assert.equal(dialogue.speaker,'ケンシロウ');assert.equal(dialogue.role,'大会主・トーナメント外');assert.equal(dialogue.portrait,true);
  const geometry=await page.evaluate(()=>{const rs=[...document.querySelectorAll('.round')];let checks=0,max=0;for(let r=0;r<Math.min(4,rs.length-1);r++){const src=[...rs[r].querySelectorAll('.slot')],dst=[...rs[r+1].querySelectorAll('.slot')];for(let i=0;i<dst.length;i++){const a=src[i*2],b=src[i*2+1],d=dst[i];if(!a||!b||!d)continue;const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dr=d.getBoundingClientRect(),expected=((ar.top+ar.bottom)/2+(br.top+br.bottom)/2)/2,actual=(dr.top+dr.bottom)/2;checks++;max=Math.max(max,Math.abs(expected-actual))}}return{checks,max:Number(max.toFixed(3)),overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)}});
  assert.equal(geometry.checks,15);assert.ok(geometry.max<=1.25,JSON.stringify(geometry));assert.ok(geometry.overflow<=1,JSON.stringify(geometry));
  for(let i=0;i<4;i++){await page.locator('#winBtn').click();await page.waitForTimeout(140);if(i<3){await page.waitForSelector('#nextBtn:not([hidden])');await page.locator('#nextBtn').click();await page.waitForTimeout(140)}}
  audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());assert.equal(audit.bossStatus,'pending');assert.equal(audit.tournamentChampion,true);assert.equal(audit.cupClear,false);assert.equal(audit.bossInBracket,false);
  await page.evaluate(()=>{active.bossChallenge.tournamentWonAt=Date.now()-5000});await page.waitForFunction(()=>window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT?.().context==='boss_pending',{timeout:4000});
  dialogue=await page.evaluate(()=>window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT());assert.equal(dialogue.role,'杯ボス');assert.equal(dialogue.speaker,'ケンシロウ');
  await page.locator('#bossChallengeBtn21546').click();await page.waitForTimeout(80);audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());assert.equal(audit.bossStatus,'active');assert.equal(await page.locator('#winBtn').innerText(),'ボスに勝った');
  await page.locator('#winBtn').click();await page.waitForTimeout(120);audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());dialogue=await page.evaluate(()=>window.TOURNAMENT_DIALOGUE_PREVIEW_AUDIT());assert.equal(audit.cupClear,true);assert.equal(audit.bossStatus,'won');assert.equal(dialogue.context,'boss_won');
  assert.deepEqual(errors,[]);
  console.log('PASS_TOURNAMENT_PREVIEW21589_TEN_CUPS '+JSON.stringify({url,status,cups:10,recommended:'kenshiro',portraitCatalog:26,dialogueBosses:12,dialogueContexts:19,firstRound:16,bossInBracket:false,tournamentWins:4,bossMatch:5,cupClear:true,geometry,pageErrors:errors}));
  await page.close();
}finally{await browser.close()}
