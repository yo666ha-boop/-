import { webkit } from 'playwright';

const ua='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const browser=await webkit.launch({headless:true});
const context=await browser.newContext({userAgent:ua,viewport:{width:390,height:844}});
const page=await context.newPage();
await page.goto('http://127.0.0.1:4197/shogi-v21528/index-cohort-profile-audit.html?x='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.__COHORT_PROFILE_DIAG&&window.AI_SHOGI_YANEURAOU_FUTURE&&window.AI_SHOGI_YANEURAOU_TOP5,{timeout:120000});

const meta=await page.evaluate(()=>window.__COHORT_PROFILE_DIAG.info());
const target=meta.filter(x=>x.i!==25&&x.i>4).sort((a,b)=>b.rating-a.rating).slice(0,6);
const expected=['カヲル','ラオウ','サウザー','ケンシロウ','げんどー','シン'];
if(JSON.stringify(target.map(x=>x.name))!==JSON.stringify(expected)) throw new Error('target cohort mismatch '+JSON.stringify(target));

const profiles={
  24:{name:'カヲル',rating:2400,personality:'balanced',normalMs:1350,endgameMs:1900,maxLoss:55,multiPV:5},
  23:{name:'ラオウ',rating:2250,personality:'aggressive',normalMs:1100,endgameMs:1700,maxLoss:70,multiPV:5},
  21:{name:'サウザー',rating:2180,personality:'positional',normalMs:950,endgameMs:1500,maxLoss:75,multiPV:5},
  5:{name:'ケンシロウ',rating:2100,personality:'defensive',normalMs:800,endgameMs:1450,maxLoss:80,multiPV:5},
  17:{name:'げんどー',rating:2050,personality:'stable',normalMs:700,endgameMs:1200,maxLoss:90,multiPV:5},
  19:{name:'シン',rating:2000,personality:'aggressive',normalMs:600,endgameMs:1050,maxLoss:105,multiPV:5}
};
for(const x of target) console.log('PROFILE_TARGET '+JSON.stringify({...x,...profiles[x.i]}));

const seq=[
  ['opening',['7g7f']],
  ['early',['7g7f','3c3d','2g2f']],
  ['mid19',['4i5h','8c8d','2h3h','8d8e','6g6f','8e8f','8g8f','8b8f','7g7f','8f8g+','6i7h','8g7f','P*7b','7a7b','5i4i','7f8e','3i4h','P*8f','6f6e']],
  ['mid33',['4i5h','8c8d','2h3h','8d8e','6g6f','8e8f','8g8f','8b8f','7g7f','8f8g+','6i7h','8g7f','P*7b','7a7b','5i4i','7f8e','3i4h','P*8f','6f6e','8f8g+','8h5e','8e6e','7h6h','6e5e','5g5f','5e7e','6h6i','3c3d','9g9f','2b9i+','7i8h','9i8h','3h3i']],
  ['late55',['4i5h','8c8d','2h3h','8d8e','6g6f','8e8f','8g8f','8b8f','7g7f','8f8g+','6i7h','8g7f','P*7b','7a7b','5i4i','7f8e','3i4h','P*8f','6f6e','8f8g+','8h5e','8e6e','7h6h','6e5e','5g5f','5e7e','6h6i','3c3d','9g9f','2b9i+','7i8h','9i8h','3h3i','B*2h','3i3h','2h1i+','4g4f','1i2i','3h3i','2i2h','3i3h','2h2g','4h3i','N*2f','5h4h','8h8i','4h5g','L*4g','5g4g','8i6g','6i5h','7e7i','L*5i','2f3h+']]
];

function cpLoss(best,c){return Number.isFinite(best?.cp)&&Number.isFinite(c?.cp)?Math.max(0,best.cp-c.cp):(c===best?0:9999)}
async function pickProfile(state,res,p){
  const raw=(res?.info?.candidates||[]).filter(c=>c?.token);
  if(!raw.length){const token=res?.info?.bestmove||null;return {token,rank:1,ownLoss:0,score:0,flags:null}}
  const sorted=[...raw].sort((a,b)=>(a.rank||99)-(b.rank||99));
  const best=sorted[0];
  if(best?.mate!==undefined&&best?.mate!==null&&best.mate>=0)return {token:best.token,rank:best.rank||1,ownLoss:0,score:999999,flags:null};
  const pool=sorted.filter(c=>cpLoss(best,c)<=p.maxLoss&&!(c?.mate!==undefined&&c?.mate!==null&&c.mate<0));
  let winner=best,winnerScore=-1e12,winnerFlags=null;
  for(const c of (pool.length?pool:[best])){
    const loss=cpLoss(best,c);
    const f=await page.evaluate(({s,u})=>window.__COHORT_PROFILE_DIAG.flags(s,u),{s:state,u:c.token});
    let score=-loss-(Math.max(1,c.rank||1)-1)*2;
    if(p.personality==='aggressive')score+=(f?.capture?28:0)+(f?.promote?22:0)+(f?.check?38:0)+Math.max(0,f?.advance||0)*8+Math.max(0,f?.centerGain||0)*3+(f?.major?7:0)-(f?.replyChecks||0)*2;
    else if(p.personality==='defensive')score+=(f?.capture?7:0)-(f?.replyChecks||0)*20+(f?.develop?22:0)+(f?.kingMove?14:0)-Math.max(0,f?.advance||0)*2+(f&&!f.check?4:0);
    else if(p.personality==='stable')score+=(f?.capture?6:0)-(f?.replyChecks||0)*12-(f?.check?4:0)-(f?.promote?1:0)+(f?.develop?28:0)+(f?.kingMove?10:0)+Math.max(0,f?.centerGain||0)*2;
    else if(p.personality==='positional')score+=(f?.capture?4:0)+(f?.develop?14:0)+Math.max(0,f?.centerGain||0)*4-(f?.replyChecks||0)*8+(f?.kingMove?4:0)+(f?.check?3:0);
    else score+=(f?.capture?8:0)+(f?.promote?6:0)+(f?.check?6:0)+(f?.develop?8:0)+Math.max(0,f?.centerGain||0)*2-(f?.replyChecks||0)*4;
    if(score>winnerScore){winnerScore=score;winner=c;winnerFlags=f}
  }
  return {token:winner.token,rank:winner.rank||1,ownLoss:cpLoss(best,winner),score:winnerScore,flags:winnerFlags};
}

const rows=[];const mamaRows=[];
for(const [label,moves] of seq){
  const state=await page.evaluate((moves)=>{let s=window.__COHORT_PROFILE_DIAG.state();for(const u of moves)s=window.__COHORT_PROFILE_DIAG.applyUsi(s,u);return s},moves);
  const legal=await page.evaluate(s=>window.__COHORT_PROFILE_DIAG.legal(s),state);
  const ref=await page.evaluate(async(s)=>{const a=window.AI_SHOGI_YANEURAOU_FUTURE;await a.init();return a.bestMove(s,{ms:4200,multiPV:5,adaptive:false})},state);
  const refToken=ref?.info?.bestmove||ref?.info?.candidates?.[0]?.token||null;
  const refCands=(ref?.info?.candidates||[]).filter(c=>c?.token).sort((a,b)=>(a.rank||99)-(b.rank||99));
  const refTop5=refCands.slice(0,5).map(c=>c.token);
  console.log('PROFILE_REF '+JSON.stringify({case:label,ref:refToken,top5:refTop5,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0}));

  const mt=performance.now();
  const mama=await page.evaluate(async(s)=>window.AI_SHOGI_YANEURAOU_TOP5.bestMove(s,4),state);
  const mamaMs=Math.round(performance.now()-mt);
  const mamaToken=mama?.move?await page.evaluate(m=>window.__COHORT_PROFILE_DIAG.usi(m),mama.move):(mama?.info?.bestmove||null);
  if(!legal.includes(mamaToken))throw new Error('mama illegal '+JSON.stringify({label,mamaToken}));
  const mr={case:label,token:mamaToken,ref:refToken,exact:mamaToken===refToken,top5:refTop5.includes(mamaToken),elapsed:mamaMs,targetMs:mama?.targetMs||mama?.info?.targetMs||null,selectedRank:mama?.info?.selectedRank||mama?.selectedRank||1,ownLoss:mama?.info?.cpLoss||mama?.cpLoss||0};
  mamaRows.push(mr);console.log('MAMA_ROW '+JSON.stringify(mr));

  for(const x of target){
    const p=profiles[x.i],endgame=label==='late55',budget=endgame?p.endgameMs:p.normalMs;
    const t=performance.now();
    const res=await page.evaluate(async({s,ms})=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms,multiPV:5,adaptive:false}),{s:state,ms:budget});
    const elapsed=Math.round(performance.now()-t);
    const picked=await pickProfile(state,res,p);
    if(!legal.includes(picked.token))throw new Error('profile illegal '+JSON.stringify({label,x,picked}));
    if(picked.ownLoss>p.maxLoss)throw new Error('profile maxLoss breach '+JSON.stringify({label,x,p,picked}));
    const row={case:label,index:x.i,name:x.name,rating:x.rating,personality:p.personality,budget,maxLoss:p.maxLoss,token:picked.token,rank:picked.rank,ownLoss:picked.ownLoss,ref:refToken,exact:picked.token===refToken,top5:refTop5.includes(picked.token),elapsed,depth:res?.info?.depth||0,threads:res?.info?.threads,hashMB:res?.info?.hashMB,flags:picked.flags};
    rows.push(row);console.log('PROFILE_ROW '+JSON.stringify(row));
  }
}

const byChar=target.map(x=>{const r=rows.filter(y=>y.index===x.i);return {index:x.i,name:x.name,rating:x.rating,personality:profiles[x.i].personality,tests:r.length,exact:r.filter(y=>y.exact).length,top5:r.filter(y=>y.top5).length,meanOwnLoss:Math.round(r.reduce((a,y)=>a+y.ownLoss,0)/r.length),meanMs:Math.round(r.reduce((a,y)=>a+y.elapsed,0)/r.length),maxOwnLoss:Math.max(...r.map(y=>y.ownLoss))}});
const mamaSummary={tests:mamaRows.length,exact:mamaRows.filter(x=>x.exact).length,top5:mamaRows.filter(x=>x.top5).length,meanOwnLoss:Math.round(mamaRows.reduce((a,x)=>a+(x.ownLoss||0),0)/mamaRows.length),meanMs:Math.round(mamaRows.reduce((a,x)=>a+x.elapsed,0)/mamaRows.length)};
const sum={tests:rows.length,exact:rows.filter(r=>r.exact).length,top5:rows.filter(r=>r.top5).length,meanMs:Math.round(rows.reduce((a,r)=>a+r.elapsed,0)/rows.length),threads:[...new Set(rows.map(r=>r.threads))],hashMB:[...new Set(rows.map(r=>r.hashMB))],mama:mamaSummary,byChar};
console.log('PROFILE_SUMMARY '+JSON.stringify(sum));
if(sum.top5<Math.ceil(rows.length*0.65))throw new Error('profile top5 quality too low '+JSON.stringify(sum));
if(!sum.threads.includes(1)||!sum.hashMB.includes(32))throw new Error('mobile engine config mismatch '+JSON.stringify(sum));
if(byChar.some(c=>c.maxOwnLoss>profiles[c.index].maxLoss))throw new Error('maxLoss invariant failed '+JSON.stringify(byChar));
console.log('PASS_COHORT7_12_PROFILE_AUDIT '+JSON.stringify(sum));
await browser.close();
