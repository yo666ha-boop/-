import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e?.message||e))); page.on('dialog',async d=>d.accept());
  const url='http://127.0.0.1:8000/shogi-v21528/?road21562='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8&&window.__AI_SHOGI_TOURNAMENT_ROAD_21562,{timeout:60000});
  await page.evaluate(()=>{const t=window.AI_SHOGI_TOURNAMENT;if(t.state()?.active)t.exit();t.start('shinji');if(!t.state()?.active)throw new Error('start state missing');t.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.()});
  await page.waitForFunction(()=>document.querySelectorAll('#tournament21540Panel .tourRoadStage21562').length===5,{timeout:10000});

  const setState=async (patch,expect)=>{
    await page.evaluate(p=>{const k='aiShogiTournament21540',s=JSON.parse(localStorage.getItem(k)||'null');if(!s?.active)throw new Error('no active');Object.assign(s.active,p.active||{});s.active.bossChallenge={...(s.active.bossChallenge||{}),...(p.bossChallenge||{})};localStorage.setItem(k,JSON.stringify(s));window.AI_SHOGI_TOURNAMENT?.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();window.dispatchEvent(new Event('ai-shogi-local-save'))},patch);
    await page.waitForFunction(e=>{if(!window.__AI_SHOGI_TOURNAMENT_ROAD_21562)return false;const xs=[...document.querySelectorAll('#tournament21540Panel .tourRoadStage21562')];if(xs.length!==5)return false;const labels=xs.map(x=>x.textContent.trim()),done=xs.filter(x=>x.classList.contains('done')).length,current=xs.findIndex(x=>x.classList.contains('current')),failed=xs.some(x=>x.classList.contains('failed'));return JSON.stringify(labels)===JSON.stringify(['1R','QF','SF','F','EX'])&&done===e.done&&current===e.current&&failed===e.failed},expect,{timeout:10000});
    return page.evaluate(()=>{const xs=[...document.querySelectorAll('#tournament21540Panel .tourRoadStage21562')];return {labels:xs.map(x=>x.textContent.trim()),done:xs.filter(x=>x.classList.contains('done')).length,current:xs.findIndex(x=>x.classList.contains('current')),failed:xs.some(x=>x.classList.contains('failed')),bossInBracket:[...document.querySelectorAll('.tourBracketSlot')].some(x=>/しんじ/.test(x.textContent||'')),roster:document.querySelectorAll('#chars .ch').length,connectors:document.querySelectorAll('#tournament21540Panel .tourBracketLines path').length,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)}});
  };
  const cases=[];
  for(const [name,patch,expect] of [
    ['1R',{active:{round:0,status:'active'},bossChallenge:{status:'locked'}},{done:0,current:0,failed:false}],
    ['QF',{active:{round:1,status:'active'},bossChallenge:{status:'locked'}},{done:1,current:1,failed:false}],
    ['SF',{active:{round:2,status:'active'},bossChallenge:{status:'locked'}},{done:2,current:2,failed:false}],
    ['F',{active:{round:3,status:'active'},bossChallenge:{status:'locked'}},{done:3,current:3,failed:false}],
    ['SF_LOST',{active:{round:2,status:'lost'},bossChallenge:{status:'locked'}},{done:2,current:2,failed:true}],
    ['EX',{active:{round:3,status:'champion'},bossChallenge:{status:'pending'}},{done:4,current:4,failed:false}]
  ]){
    const row=await setState(patch,expect); const bad=[];
    if(JSON.stringify(row.labels)!==JSON.stringify(['1R','QF','SF','F','EX']))bad.push('labels');
    for(const k of ['done','current','failed'])if(row[k]!==expect[k])bad.push(k+'='+row[k]);
    if(row.roster!==26||row.bossInBracket||row.overflow!==0)bad.push('invariants '+JSON.stringify(row));
    if(bad.length)throw new Error(name+' '+bad.join(' | ')); cases.push({name,...row});
  }
  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));
  console.log('PASS_TOURNAMENT21562_ROAD_STAGE_TRANSITIONS '+JSON.stringify({cases,pageErrors:errors}));
}finally{await browser.close()}
