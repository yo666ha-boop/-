import fs from 'node:fs';

const coreFile='shogi-v21528/tournament21541.js';
const verifyFile='.github/scripts/verify-tournament21540.mjs';
let core=fs.readFileSync(coreFile,'utf8');
let verify=fs.readFileSync(verifyFile,'utf8');

function replaceOnce(src,from,to,label){
  if(src.includes(to))return src;
  if(!src.includes(from))throw new Error('21592 missing anchor: '+label);
  return src.replace(from,to);
}

core=replaceOnce(core,
`  const fresh=()=>({version:VERSION,active:null,trophies:{},history:[]});
  const read=()=>{
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'null');
      if(x&&x.version===VERSION)return x;
      if(x&&(x.version===1||x.version===2))return{version:VERSION,active:null,trophies:x.trophies||{},history:Array.isArray(x.history)?x.history:[]};
      return fresh();
    }catch(e){return fresh()}
  };`,
`  const seedChampionships=trophies=>Object.fromEntries(Object.entries(trophies||{}).map(([id,n])=>[id,Number(n)||0]));
  const fresh=()=>({version:VERSION,active:null,trophies:{},championships:{},streaks:{},history:[]});
  const normalize=x=>{
    x.trophies=x.trophies||{};
    x.championships=x.championships||seedChampionships(x.trophies);
    x.streaks=x.streaks||{};
    x.history=Array.isArray(x.history)?x.history:[];
    return x;
  };
  const read=()=>{
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'null');
      if(x&&x.version===VERSION)return normalize(x);
      if(x&&(x.version===1||x.version===2))return normalize({version:VERSION,active:null,trophies:x.trophies||{},championships:seedChampionships(x.trophies),streaks:{},history:Array.isArray(x.history)?x.history:[]});
      return fresh();
    }catch(e){return fresh()}
  };`,
'achievement store');

core=replaceOnce(core,
`.tourCupMeta{font-size:11px;line-height:1.4;color:#bdb18c;margin:4px 0 7px}.tourCup .btn{width:100%;padding:7px 8px}.tourTag{font-size:10px;border:1px solid currentColor;border-radius:999px;padding:1px 5px}.tourTrophy{color:#ffe174}.tourResult`,
`.tourCupMeta{font-size:11px;line-height:1.4;color:#bdb18c;margin:4px 0 4px}.tourCupRecord{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:0 0 7px;font-size:10px;font-weight:900;color:#d8c99a}.tourCupRecord .tourStreak{color:#ffb45b}.tourCupRecord .tourChampionCount{color:#eee0b3}.tourCup .btn{width:100%;padding:7px 8px}.tourTag{font-size:10px;border:1px solid currentColor;border-radius:999px;padding:1px 5px}.tourTrophy{color:#ffe174}.tourResult`,
'achievement style');

core=replaceOnce(core,
`      const wins=Number(store.trophies?.[c.id]||0),recommended=c.id===rec.id;
      return'<div class="tourCup '+(recommended?'recommended ':'')+(wins?'won':'')+'"><div class="tourCupName">'+esc(c.name)+(recommended?'<span class="tourTag">おすすめ</span>':'')+(wins?'<span class="tourTrophy">🏆×'+wins+'</span>':'')+'</div><div class="tourCupMeta">'+esc(c.label)+' ／ 優勝後ボス '+esc(c.boss)+' R'+c.bossRating+'<br>16人・4勝で優勝</div><button class="btn '+(recommended?'primary':'')+'" data-tour-start="'+c.id+'">挑戦する</button></div>';`,
`      const cupWins=Number(store.trophies?.[c.id]||0),championships=Number(store.championships?.[c.id]??cupWins)||0,streak=Number(store.streaks?.[c.id]||0),recommended=c.id===rec.id;
      const streakHtml=streak>=2?'<span class="tourStreak">🔥 '+streak+'連覇中</span>':'';
      return'<div class="tourCup '+(recommended?'recommended ':'')+((cupWins||championships)?'won':'')+'"><div class="tourCupName">'+esc(c.name)+(recommended?'<span class="tourTag">おすすめ</span>':'')+(cupWins?'<span class="tourTrophy">🏆 杯獲得 '+cupWins+'回</span>':'')+'</div><div class="tourCupMeta">'+esc(c.label)+' ／ 優勝後ボス '+esc(c.boss)+' R'+c.bossRating+'<br>16人・4勝で優勝</div><div class="tourCupRecord"><span class="tourChampionCount">優勝 '+championships+'回</span>'+streakHtml+'</div><button class="btn '+(recommended?'primary':'')+'" data-tour-start="'+c.id+'">挑戦する</button></div>';`,
'achievement cards');

core=replaceOnce(core,
`        store.trophies=store.trophies||{};store.trophies[cup.id]=(Number(store.trophies[cup.id])||0)+1;
        addNews(a,cup.name+' 優勝！','result');`,
`        store.championships=store.championships||{};store.championships[cup.id]=(Number(store.championships[cup.id])||0)+1;
        store.streaks=store.streaks||{};store.streaks[cup.id]=(Number(store.streaks[cup.id])||0)+1;
        store.trophies=store.trophies||{};store.trophies[cup.id]=(Number(store.trophies[cup.id])||0)+1;
        addNews(a,cup.name+' 優勝！ 通算'+store.championships[cup.id]+'回'+(store.streaks[cup.id]>=2?'・'+store.streaks[cup.id]+'連覇':'')+'。','result');`,
'champion counters');

core=replaceOnce(core,
`      a.status='lost';a.finishedAt=now();a.pending=null;
      scheduleRoundAI(a,cup,a.round+1);`,
`      a.status='lost';a.finishedAt=now();a.pending=null;
      store.streaks=store.streaks||{};store.streaks[cup.id]=0;
      scheduleRoundAI(a,cup,a.round+1);`,
'streak reset');

core=replaceOnce(core,
`version:'21585'`,
`version:'21592'`,
'core version marker');

verify=replaceOnce(verify,
`assert.equal(state.active.status,'boss_pending');assert.equal(state.active.bracket.rounds[4][0],'__PLAYER__');assert.equal(state.trophies.kenshiro||0,0,'tournament victory alone is not full cup clear');assert.equal(audit.tournamentChampion,true);assert.equal(audit.bossInBracket,false);`,
`assert.equal(state.active.status,'boss_pending');assert.equal(state.active.bracket.rounds[4][0],'__PLAYER__');assert.equal(state.trophies.kenshiro||0,0,'tournament victory alone is not full cup clear');assert.equal(state.championships.kenshiro,1,'tournament championship must persist independently from full cup clear');assert.equal(state.streaks.kenshiro,1,'first consecutive championship must be tracked');assert.equal(audit.tournamentChampion,true);assert.equal(audit.bossInBracket,false);`,
'first championship assertions');

verify=replaceOnce(verify,
`state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());assert.equal(state.active.status,'champion');assert.equal(state.trophies.kenshiro,1,'trophy is awarded only after boss defeat');
 await page.evaluate(()=>{window.__mock.rating=2600;window.dispatchEvent(new Event('ai-shogi-profile-stats'))});`,
`state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());assert.equal(state.active.status,'champion');assert.equal(state.trophies.kenshiro,1,'trophy is awarded only after boss defeat');assert.equal(state.championships.kenshiro,1);assert.equal(state.streaks.kenshiro,1);
 await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.start('kenshiro',true));
 for(let round=0;round<4;round++){await result('win');state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());if(round<3){assert.equal(state.active.round,round+1);await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.next());await page.waitForTimeout(60)}}
 await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_BOSS.audit().bossStatus==='pending');state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());assert.equal(state.championships.kenshiro,2);assert.equal(state.streaks.kenshiro,2);assert.equal(state.trophies.kenshiro,1,'second tournament title must not award a second cup before boss defeat');
 await page.evaluate(()=>{document.getElementById('tournament21540Panel').classList.add('on');window.AI_SHOGI_TOURNAMENT.render()});await page.waitForTimeout(80);
 const achievementText=await page.evaluate(()=>{const b=document.querySelector('[data-tour-start="kenshiro"]');return b?.closest('.tourCup')?.innerText||''});assert.ok(achievementText.includes('🏆 杯獲得 1回'),achievementText);assert.ok(achievementText.includes('優勝 2回'),achievementText);assert.ok(achievementText.includes('🔥 2連覇中'),achievementText);
 await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.challengeBoss());await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_BOSS.audit().bossStatus==='active');await result('loss');await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_BOSS.audit().bossStatus==='lost');state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());assert.equal(state.trophies.kenshiro,1,'boss loss must not remove prior cup clears');assert.equal(state.championships.kenshiro,2);assert.equal(state.streaks.kenshiro,2,'boss loss must not break tournament title streak');
 await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.start('kenshiro',true));await result('loss');state=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT.state());assert.equal(state.championships.kenshiro,2);assert.equal(state.streaks.kenshiro,0,'tournament loss must reset title streak');assert.equal(state.trophies.kenshiro,1);
 await page.evaluate(()=>{window.__mock.rating=2600;window.dispatchEvent(new Event('ai-shogi-profile-stats'))});`,
'achievement flow assertions');

verify=replaceOnce(verify,
`console.log('PASS_TOURNAMENT21546_BOSS_AFTER_BRACKET '`,
`console.log('PASS_TOURNAMENT21592_ACHIEVEMENTS '`,
'pass marker');

fs.writeFileSync(coreFile,core);
fs.writeFileSync(verifyFile,verify);
console.log('PASS_APPLY_TOURNAMENT21592_ACHIEVEMENTS');
