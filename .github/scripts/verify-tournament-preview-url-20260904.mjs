import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const sha=String(process.env.PREVIEW_SHA||'').trim();
assert.match(sha,/^[0-9a-f]{40}$/,'PREVIEW_SHA must be a full commit SHA');
const path='preview/tournament-16/index21543.html';
const raw=`https://raw.githubusercontent.com/yo666ha-boop/-/${sha}/${path}`;
const blob=`https://github.com/yo666ha-boop/-/blob/${sha}/${path}`;
const candidates=[`https://htmlpreview.github.io/?${raw}`,`https://htmlpreview.github.io/?${blob}`];

const browser=await chromium.launch({headless:true});
try{
  let winner=null;const attempts=[];
  for(const url of candidates){
    const page=await browser.newPage({viewport:{width:390,height:844}});const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
    try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});const status=response?.status()??0;await page.waitForTimeout(1200);const snapshot=await page.evaluate(()=>({title:document.title,hasAudit:typeof window.TOURNAMENT_PREVIEW_AUDIT==='function',hasBracketAudit:!!window.AI_SHOGI_TOURNAMENT_BRACKET_UI,body:(document.body?.innerText||'').slice(0,240)}));attempts.push({url,status,...snapshot,pageErrors});if(status===200&&snapshot.hasAudit&&snapshot.hasBracketAudit){winner={url,page,status};break}}catch(e){attempts.push({url,error:String(e),pageErrors})}if(!winner)await page.close();
  }
  console.log('PREVIEW_HOST_ATTEMPTS '+JSON.stringify(attempts));assert.ok(winner,'no standalone preview host executed the corrected bracket page');
  const {url,page,status}=winner;
  await page.waitForFunction(()=>window.TOURNAMENT_PREVIEW_AUDIT?.().portraitCatalog===26&&window.AI_SHOGI_TOURNAMENT_BRACKET_UI,{timeout:15000});
  let audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.standalone,true);assert.equal(audit.cups,8);assert.equal(audit.recommended,'shinji');assert.equal(audit.portraitCatalog,26);assert.deepEqual(audit.portraitMissing,[]);assert.equal(await page.locator('[data-cup]').count(),8);assert.match(await page.title(),/進行修正版/);assert.match(await page.locator('.notice').innerText(),/各対戦の勝者だけが次の枠へ進みます/);
  await page.locator('[data-cup="shinji"] button').click();await page.waitForSelector('#stage.on .bracket',{state:'visible',timeout:10000});await page.waitForTimeout(100);audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());
  assert.equal(audit.active.cup,'shinji');assert.equal(audit.active.slots,16);assert.equal(audit.active.columns,5);assert.equal(audit.columns,5);assert.equal(audit.firstRound,16);assert.equal(audit.active.resolved,0,'no AI winner at opening');assert.equal(audit.active.running,7,'seven parallel AI matches at opening');assert.equal(await page.locator('.round:first-child .slot img').count(),15,'all 15 AI entrants have portraits');assert.equal(await page.locator('.slot.player').count(),1);assert.ok(await page.locator('.slot.boss').count()>=1);assert.equal(await page.locator('.round:first-child .state.running').count(),16,'all eight first-round matches visibly running');assert.ok((await page.locator('#news').innerText()).length>0,'tournament news visible');

  async function verifyGeometry(p,label){
    const g=await p.evaluate(()=>{
      const rs=[...document.querySelectorAll('.round')];let checks=0,errors=0,max=0;
      for(let r=0;r<Math.min(4,rs.length-1);r++){
        const src=[...rs[r].querySelectorAll('.slot')],dst=[...rs[r+1].querySelectorAll('.slot')];
        for(let i=0;i<dst.length;i++){
          const a=src[i*2],b=src[i*2+1],d=dst[i];if(!a||!b||!d)continue;
          const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dr=d.getBoundingClientRect();
          const expected=((ar.top+ar.bottom)/2+(br.top+br.bottom)/2)/2,actual=(dr.top+dr.bottom)/2,err=Math.abs(expected-actual);
          checks++;max=Math.max(max,err);if(err>1.25)errors++;
        }
      }
      return{checks,errors,max:Number(max.toFixed(3))};
    });
    assert.equal(g.checks,15,`${label}: all 15 source-pair centers checked`);assert.equal(g.errors,0,`${label}: winner placement drift`);assert.ok(g.max<=1.25,`${label}: max drift ${g.max}px`);return g;
  }
  const openingGeometry=await verifyGeometry(page,'mobile opening');

  async function assertRound(round,wins,losses){
    const q=`.round:nth-child(${round+1})`;
    const got=await page.evaluate(q=>{const root=document.querySelector(q);return{win:[...root.querySelectorAll('.state')].filter(x=>x.textContent==='勝利').length,loss:[...root.querySelectorAll('.state')].filter(x=>x.textContent==='敗退').length}},q);
    assert.deepEqual(got,{win:wins,loss:losses},`round ${round} winner/loser labels`);
    const ba=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_BRACKET_UI.audit());
    assert.equal(ba.version,'preview21543b');assert.equal(ba.pairingErrors,0,'advanced character must always come from the source pair');assert.equal(ba.invalidWins,0,'blanket past-round wins must not remain');assert.equal(ba.alignmentErrors,0,'winner slots remain centered');assert.ok(ba.maxAlignmentError<=1.25,`audit drift ${ba.maxAlignmentError}px`);assert.ok(ba.connectors>=30,'bracket connector lines must be drawn');
    const mapping=await page.evaluate(round=>{const rs=[...document.querySelectorAll('.round')],src=[...rs[round].querySelectorAll('.slot')],dst=[...rs[round+1].querySelectorAll('.slot')];const name=x=>(x.querySelector('.name')?.textContent||'').replace(/[👑🏆]/gu,'').trim();return dst.every((d,i)=>{const n=name(d);if(!n||n==='—')return true;return [name(src[i*2]),name(src[i*2+1])].includes(n)})},round);
    assert.equal(mapping,true,`round ${round} pairwise advancement`);await verifyGeometry(page,`mobile round ${round}`);
  }

  for(let i=0;i<4;i++){
    await page.locator('#winBtn').click();await page.waitForTimeout(100);await assertRound(i,2**(3-i),2**(3-i));
    if(i<3){await page.waitForSelector('#nextBtn:not([hidden])');await page.locator('#nextBtn').click();await page.waitForTimeout(70)}
  }
  audit=await page.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());assert.equal(audit.active.status,'champion');assert.match(await page.locator('#status').innerText(),/優勝/);assert.equal(await page.locator('.slot.champion.player').count(),1);
  const finalBracketAudit=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_BRACKET_UI.audit());assert.equal(finalBracketAudit.pairingErrors,0);assert.equal(finalBracketAudit.invalidWins,0);assert.equal(finalBracketAudit.alignmentErrors,0);assert.ok(finalBracketAudit.maxAlignmentError<=1.25);
  await page.close();

  const fire=await browser.newPage({viewport:{width:1280,height:800}});
  await fire.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await fire.waitForFunction(()=>window.TOURNAMENT_PREVIEW_AUDIT?.().portraitCatalog===26&&window.AI_SHOGI_TOURNAMENT_BRACKET_UI,{timeout:15000});await fire.locator('[data-cup="shinji"] button').click();await fire.waitForSelector('#stage.on .bracket',{state:'visible'});await fire.waitForTimeout(100);const fireAudit=await fire.evaluate(()=>window.TOURNAMENT_PREVIEW_AUDIT());const fireBracket=await fire.evaluate(()=>window.AI_SHOGI_TOURNAMENT_BRACKET_UI.audit());const fireGeometry=await verifyGeometry(fire,'Fire opening');assert.ok(fireAudit.bracketOverflow<=3,`Fire-fit preview overflow ${fireAudit.bracketOverflow}px`);assert.equal(await fire.locator('.round').count(),5);assert.equal(await fire.locator('.round:first-child .slot img').count(),15);assert.ok(fireBracket.connectors>=30);assert.equal(fireBracket.alignmentErrors,0);assert.ok(fireBracket.maxAlignmentError<=1.25);await fire.close();

  console.log('PASS_TOURNAMENT_STANDALONE_PREVIEW_21543B '+JSON.stringify({url,status,cups:8,portraitCatalog:26,firstRoundPortraits:15,initialRunning:7,initialResolved:0,fireOverflow:fireAudit.bracketOverflow,connectors:fireBracket.connectors,pairingErrors:finalBracketAudit.pairingErrors,mobileMaxAlignmentError:openingGeometry.max,fireMaxAlignmentError:fireGeometry.max,champion:'player'}));
} finally {await browser.close()}