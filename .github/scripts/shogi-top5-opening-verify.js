const { firefox } = require('playwright');
const fs = require('fs');

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?openingverify='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});

  const result=await page.evaluate(async()=>{
    const top=window.AI_SHOGI_YANEURAOU_TOP5,shared=window.AI_SHOGI_YANEURAOU_FUTURE;
    await shared.init();
    function initialState(){
      const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
      b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
      return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
    }
    function applySimple(s,f,to){
      const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:{f,to,prom:false,drop:null}};
      const p=n.b[f]; if(!p||n.b[to])throw new Error('bad opening move '+f+'-'+to);
      n.b[f]=null;n.b[to]={...p};n.t=-s.t;n.log.push('opening-probe');return n;
    }
    function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
    function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}
    const probes=[
      ['P26',61,52,'2g2f'],
      ['P76',56,47,'7g7f'],
      ['P56',58,49,'5g5f'],
      ['P46',59,50,'4g4f'],
      ['P66',57,48,'6g6f'],
      ['P96',54,45,'9g9f']
    ];
    const rows=[];
    for(const [name,f,to,humanMove] of probes){
      const s=applySimple(initialState(),f,to);
      const ref=await shared.bestMove(s,{ms:7000,multiPV:4});
      rows.push({probe:name,humanMove,who:'未来みつき',rating:3400,targetMs:7000,selected:token(ref?.move),engineBest:String(ref?.info?.token||''),selectedRank:1,cpLoss:0,openingBias:false,openingTokens:[],depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,effectiveMultiPV:ref?.info?.multiPV||1});
      for(const i of top.indices){
        const p=top.profiles[i],r=await top.bestMove(s,i);
        rows.push({probe:name,humanMove,who:top.names[i],rating:top.ratings[i],targetMs:r?.targetMs||top.profileMs(s,i),selected:token(r?.move),engineBest:String(r?.info?.token||''),selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,openingBias:!!r?.info?.openingBias,openingTokens:top.openingTokens(s,i),depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,maxLoss:p.maxLoss,effectiveMultiPV:r?.info?.profileMultiPV||p.multiPV,personality:p.personality});
      }
    }
    return{version:top.version,engine:top.engine,coi:crossOriginIsolated,rows};
  });

  const failures=[],warnings=[];
  if(!result.coi)failures.push('crossOriginIsolated=false');
  if(!/YaneuraOu/.test(result.engine||''))failures.push('engine='+result.engine);
  const probes=[...new Set(result.rows.map(r=>r.probe))];
  const expected=['未来みつき','みつき','みっちゃん','あき王','おにまま','まま'];
  const phaseSummary={};
  for(const probe of probes){
    const rs=result.rows.filter(r=>r.probe===probe);
    if(JSON.stringify(rs.map(r=>r.who))!==JSON.stringify(expected))failures.push(probe+' order mismatch');
    for(let i=1;i<rs.length;i++)if(!(rs[i-1].targetMs>rs[i].targetMs))failures.push(probe+' budget order '+rs[i-1].who+' <= '+rs[i].who);
    for(const r of rs.slice(1)){
      if(!r.selected)failures.push(probe+' '+r.who+' no selected move');
      if(r.cpLoss>(r.maxLoss||0))failures.push(probe+' '+r.who+' cpLoss '+r.cpLoss+' > '+r.maxLoss);
      if(r.selectedRank>(r.effectiveMultiPV||1))failures.push(probe+' '+r.who+' rank '+r.selectedRank+' > mpv '+r.effectiveMultiPV);
    }
    phaseSummary[probe]={humanMove:rs[0]?.humanMove,selectedUnique:new Set(rs.map(r=>r.selected)).size,moves:Object.fromEntries(rs.map(r=>[r.who,r.selected])),bias:Object.fromEntries(rs.slice(1).map(r=>[r.who,r.openingBias])),preferred:Object.fromEntries(rs.slice(1).map(r=>[r.who,r.openingTokens]))};
  }
  const byWho={};for(const r of result.rows.slice())(byWho[r.who]??=[]).push(r);
  const coverage={};
  for(const who of expected.slice(2)){
    const rs=byWho[who]||[];
    coverage[who]={biasHits:rs.filter(r=>r.openingBias).length,nonBest:rs.filter(r=>r.selected!==r.engineBest).length,avgCpLoss:+(rs.reduce((a,r)=>a+(r.cpLoss||0),0)/Math.max(1,rs.length)).toFixed(2),maxCpLoss:Math.max(0,...rs.map(r=>r.cpLoss||0)),preferredAvailable:rs.filter(r=>Array.isArray(r.openingTokens)&&r.openingTokens.length).length};
    if(coverage[who].preferredAvailable>0&&coverage[who].biasHits===0)warnings.push(who+' has preferred opening candidates but never selected one');
  }
  const divergent=Object.values(phaseSummary).filter(x=>x.selectedUnique>1).length;
  if(divergent<3)warnings.push('only '+divergent+'/'+probes.length+' opening probes produced different actual moves');
  const out={generatedAt:new Date().toISOString(),pass:failures.length===0,failures,warnings,version:result.version,engine:result.engine,coi:result.coi,probeCount:probes.length,divergentProbes:divergent,coverage,phaseSummary,rows:result.rows};
  fs.mkdirSync('.github/benchmark-results',{recursive:true});
  fs.writeFileSync('.github/benchmark-results/shogi-top5-opening-verify-latest.json',JSON.stringify(out,null,2)+'\n');
  console.log('OPENING_VERIFY_SUMMARY',JSON.stringify({pass:out.pass,failures,warnings,divergentProbes:divergent,coverage,phaseSummary}));
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS opening verification');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
