import { webkit } from 'playwright';
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
try{
 await page.goto('http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?runtime='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__L8Q&&window.AI_SHOGI_YANEURAOU_FUTURE?.strengthTune==='fullsearch-20260825'&&window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR?.version==='2.15.36',{timeout:120000});
 const staticCheck=await page.evaluate(async()=>{const t=await (await fetch('../shogi-side-test/future21520.js?x='+Date.now(),{cache:'no-store'})).text();return{fixedGameplay:t.includes("futureBest(startState,{adaptive:false})"),forwards:t.includes("{sfen,ms,multiPV,nodes,searchmoves,adaptive}"),min150:t.includes('requested>=150'),mpv5:t.includes('Math.min(5')}});
 if(!staticCheck.fixedGameplay||!staticCheck.forwards||!staticCheck.min150||!staticCheck.mpv5)throw Error('Future contract '+JSON.stringify(staticCheck));
 const lower=await page.evaluate(()=>window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR),expected=[300,285,260,240,220,200,180,160];
 const actual=lower.indices.map(i=>lower.profiles[i].normal);if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('lower budgets '+JSON.stringify(actual));
 if(lower.indices.some(i=>lower.profiles[i].multiPV!==4))throw Error('lower MultiPV '+JSON.stringify(lower.profiles));
 await page.evaluate(()=>window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR.init());
 const st=await page.evaluate(()=>window.__L8Q.parse('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 13'));
 const rows=[];
 for(const i of lower.indices){const t=Date.now(),r=await page.evaluate(async({s,i})=>window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR.bestMove(s,i),{s:st,i}),elapsed=Date.now()-t,p=lower.profiles[i];rows.push({i,name:lower.names[lower.indices.indexOf(i)],rating:lower.ratings[lower.indices.indexOf(i)],target:p.normal,reported:r?.targetMs,elapsed,depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,adaptive:r?.info?.adaptive,multiPV:r?.info?.multiPV});if(r?.targetMs!==p.normal)throw Error('target mismatch '+i+' '+r?.targetMs+' != '+p.normal);if(r?.info?.adaptive!==false)throw Error('lower adaptive '+i+' '+JSON.stringify(r?.info));if(elapsed>1200)throw Error('lower runtime fallback '+i+' '+elapsed+'ms');}
 const future=await page.evaluate(async s=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms:4000,multiPV:1,adaptive:false}),st);if(future?.info?.adaptive!==false)throw Error('Future adaptive not false '+JSON.stringify(future?.info));
 if(errors.length)throw Error('page '+errors.join('|'));
 console.log('STRENGTH_RUNTIME_CONTRACT '+JSON.stringify({staticCheck,rows,future:{depth:future?.info?.depth||0,nodes:future?.info?.nodes||0,adaptive:future?.info?.adaptive,targetMs:future?.targetMs}}));
 console.log('PASS_STRENGTH_RUNTIME_CONTRACT');
}finally{await browser.close()}
