import { firefox } from 'playwright';
const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e?.message||e))); page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?boss21583='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForTimeout(3000);
  const bootstrap=await page.evaluate(()=>({characters:document.querySelectorAll('#chars .ch').length,tournament:!!window.AI_SHOGI_TOURNAMENT,cups:window.AI_SHOGI_TOURNAMENT?.cups?.().map(c=>c.id)||[],bossVersion:window.AI_SHOGI_TOURNAMENT_BOSS?.version||null,bossFlag:window.AI_SHOGI_TOURNAMENT?.__boss21546a||false,webAudit:window.AI_SHOGI_WEB_AUDIT||null}));
  console.log('TOURNAMENT21583_BOOTSTRAP',JSON.stringify(bootstrap));
  if(bootstrap.cups.length!==10||bootstrap.bossVersion!=='21583')throw Error('21583 bootstrap mismatch '+JSON.stringify(bootstrap));
  const report=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT, delay=ms=>new Promise(r=>setTimeout(r,ms));
    const expected=[['kenshiro','ケンシロウ',2100],['souther','サウザー',2180],['raoh','ラオウ',2250],['kaworu','カヲル',2400],['mama','まま',2500],['onimama','おにまま',2600],['akiou','あき王',2700],['micchan','みっちゃん',2850],['mitsuki','みつき',3000],['future','未来からやってきたみつき',3400]];
    const chars=window.AIShogiIOS.characters();
    const rating=name=>chars.find(c=>c.name===name)?.rating;
    const fields=[];
    for(const cup of t.cups()){
      if(t.state()?.active)t.exit();
      if(!t.start(cup.id))throw Error(cup.id+':start');
      await delay(80);
      const a=t.state().active,r0=a.bracket.rounds[0],ai=r0.filter(x=>x&&x!=='__PLAYER__');
      fields.push({id:cup.id,boss:cup.boss,bossRating:cup.bossRating,n:r0.length,ai:ai.length,bossIn:r0.includes(cup.boss),player:r0.indexOf('__PLAYER__'),maxAI:Math.max(...ai.map(rating)),under:ai.every(n=>Number(rating(n))<cup.bossRating)});
      t.exit(); await delay(30);
    }
    const orders=[];
    for(let i=0;i<3;i++){t.start('future');await delay(4);orders.push(t.state().active.bracket.rounds[0].join('|'));t.exit();await delay(4)}
    const result=async kind=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-'+kind;b.textContent=kind;await delay(130)};
    const wait=async status=>{for(let i=0;i<80;i++){if(t.state()?.active?.bossChallenge?.status===status)return true;await delay(30)}return false};
    const reachBoss=async()=>{if(t.state()?.active)t.exit();if(!t.start('kenshiro'))throw Error('kenshiro:start');await delay(80);for(let r=0;r<4;r++){await result('win');if(r<3){t.next();await delay(80)}}if(!await wait('pending'))throw Error('boss pending timeout')};
    await reachBoss();
    const pending=t.state().active, pendingAudit=window.AI_SHOGI_TOURNAMENT_BOSS.audit();
    const trophyBefore=Number(t.state().trophies?.kenshiro||0);
    if(!t.challengeBoss())throw Error('boss challenge'); if(!await wait('active'))throw Error('boss active timeout');
    await result('draw'); if(!await wait('draw'))throw Error('boss draw timeout');
    if(!t.challengeBoss())throw Error('boss retry'); if(!await wait('active'))throw Error('boss retry active timeout');
    await result('loss'); if(!await wait('lost'))throw Error('boss lost timeout');
    const loss=t.state().active, trophyAfterLoss=Number(t.state().trophies?.kenshiro||0);
    t.exit(); await delay(50);
    await reachBoss(); if(!t.challengeBoss())throw Error('boss challenge2'); if(!await wait('active'))throw Error('boss active2 timeout');
    await result('win'); if(!await wait('won'))throw Error('boss won timeout');
    const won=t.state().active, trophyAfterWin=Number(t.state().trophies?.kenshiro||0);
    return {expected,cups:t.cups().map(c=>[c.id,c.boss,c.bossRating]),fields,ordersUnique:new Set(orders).size,pendingStatus:pending?.status,pendingBoss:pending?.bossChallenge?.status,pendingChampion:pending?.bracket?.rounds?.[4]?.[0],pendingAudit,trophyBefore,lossStatus:loss?.status,lossBoss:loss?.bossChallenge?.status,trophyAfterLoss,wonStatus:won?.status,wonBoss:won?.bossChallenge?.status,trophyAfterWin};
  });
  const failures=[];
  if(JSON.stringify(report.cups)!==JSON.stringify(report.expected))failures.push('cup order '+JSON.stringify(report.cups));
  for(const f of report.fields){if(f.n!==16||f.ai!==15||f.bossIn||!f.under)failures.push('field '+JSON.stringify(f));}
  if(report.ordersUnique<2)failures.push('shuffle did not vary');
  if(report.pendingStatus!=='boss_pending'||report.pendingBoss!=='pending'||report.pendingChampion!=='__PLAYER__'||report.pendingAudit?.bossInBracket)failures.push('pending '+JSON.stringify(report.pendingAudit));
  if(report.lossStatus!=='boss_lost'||report.lossBoss!=='lost'||report.trophyAfterLoss!==report.trophyBefore)failures.push('loss semantics');
  if(report.wonBoss!=='won'||report.trophyAfterWin!==report.trophyBefore+1)failures.push('win semantics');
  if(errors.length)failures.push('pageErrors '+JSON.stringify(errors));
  if(failures.length)throw Error(failures.join('\n'));
  console.log('PASS_TOURNAMENT21583_TEN_CUP_BOSS_CHAIN',JSON.stringify(report));
}finally{await browser.close()}
