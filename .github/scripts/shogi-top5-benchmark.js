const { firefox } = require('playwright');
const fs = require('fs');

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  const url='http://127.0.0.1:8000/shogi-v21528/?bench='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:15000});

  const result=await page.evaluate(async()=>{
    const top=window.AI_SHOGI_YANEURAOU_TOP5;
    const shared=window.AI_SHOGI_YANEURAOU_FUTURE;
    await shared.init();

    function initialState(){
      const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
      for(let x=0;x<9;x++){
        b[x]={k:back[x],o:-1}; b[72+x]={k:back[8-x],o:1};
        b[18+x]={k:'P',o:-1}; b[54+x]={k:'P',o:1};
      }
      b[10]={k:'R',o:-1}; b[16]={k:'B',o:-1}; b[64]={k:'B',o:1}; b[70]={k:'R',o:1};
      return {b,h:{1:{},'-1':{}},t:1,log:[],last:null};
    }
    const baseKind=k=>String(k||'').replace(/^\+/, '');
    function applyMove(s,m){
      const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};
      if(m.drop){n.h[s.t][m.drop]=(n.h[s.t][m.drop]||0)-1;n.b[m.to]={k:m.drop,o:s.t}}
      else{
        const p=n.b[m.f],cap=n.b[m.to];n.b[m.f]=null;
        if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}
        let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};
      }
      n.t=-s.t;n.log.push('bench');return n;
    }

    let s=initialState();
    const snapshots=[];
    const targets=new Map([[8,'opening'],[28,'middlegame'],[52,'late']]);
    for(let ply=1;ply<=52;ply++){
      const r=await shared.bestMove(s,{ms:250,multiPV:1});
      if(!r?.move)throw new Error('self-play generation stopped at ply '+ply+' '+JSON.stringify(r));
      s=applyMove(s,r.move);
      if(targets.has(ply))snapshots.push({phase:targets.get(ply),ply,state:JSON.parse(JSON.stringify(s))});
    }

    const futureMs={opening:7000,middlegame:7000,late:10000};
    const rows=[];
    for(const snap of snapshots){
      const ref=await shared.bestMove(snap.state,{ms:futureMs[snap.phase],multiPV:1});
      rows.push({phase:snap.phase,who:'未来みつき',rating:3400,targetMs:futureMs[snap.phase],actualMs:ref?.info?.ms||0,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,move:ref?.info?.token||'',selectedRank:1,cpLoss:0,personality:'master',openingBias:false});
      for(const i of top.indices){
        const r=await top.bestMove(snap.state,i),p=top.profiles[i];
        rows.push({phase:snap.phase,who:top.names[i],rating:top.ratings[i],targetMs:r?.targetMs||top.profileMs(snap.state,i),actualMs:r?.info?.ms||0,depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,move:r?.info?.token||'',selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,personality:r?.info?.personality||p.personality,openingBias:!!r?.info?.openingBias,maxLoss:p.maxLoss,multiPV:p.multiPV});
      }
    }
    return {version:top.version,engine:top.engine,coi:crossOriginIsolated,rows};
  });

  console.log('TOP5_MULTI_POSITION_BENCH',JSON.stringify(result));
  const failures=[];
  if(!result.coi)failures.push('crossOriginIsolated=false');
  if(!/YaneuraOu/.test(result.engine||''))failures.push('engine='+result.engine);
  const expectedOrder=['未来みつき','みつき','みっちゃん','あき王','おにまま','まま'];
  const phaseSummary={};
  for(const phase of ['opening','middlegame','late']){
    const rs=result.rows.filter(r=>r.phase===phase);
    if(JSON.stringify(rs.map(r=>r.who))!==JSON.stringify(expectedOrder))failures.push(phase+' order '+JSON.stringify(rs.map(r=>r.who)));
    for(let i=1;i<rs.length;i++)if(!(rs[i-1].targetMs>rs[i].targetMs))failures.push(phase+' budget order '+rs[i-1].who+':'+rs[i-1].targetMs+' <= '+rs[i].who+':'+rs[i].targetMs);
    for(const r of rs.slice(1)){
      if(r.cpLoss>(r.maxLoss||0))failures.push(phase+' '+r.who+' cpLoss '+r.cpLoss+' > '+r.maxLoss);
      if(r.selectedRank>(r.multiPV||1))failures.push(phase+' '+r.who+' rank '+r.selectedRank+' > '+r.multiPV);
      if(!r.move)failures.push(phase+' '+r.who+' no move');
    }
    const unique=new Set(rs.map(r=>r.move)).size;
    phaseSummary[phase]={uniqueMoves:unique,moves:Object.fromEntries(rs.map(r=>[r.who,r.move]))};
    console.log('BENCH_PHASE',phase,'uniqueMoves',unique,'rows',JSON.stringify(rs));
  }

  const byWho={};
  for(const r of result.rows){(byWho[r.who]??=[]).push(r)}
  const summary=Object.fromEntries(Object.entries(byWho).map(([who,rs])=>[who,{
    avgDepth:+(rs.reduce((a,x)=>a+x.depth,0)/rs.length).toFixed(2),
    avgNodes:Math.round(rs.reduce((a,x)=>a+x.nodes,0)/rs.length),
    avgCpLoss:+(rs.reduce((a,x)=>a+x.cpLoss,0)/rs.length).toFixed(2),
    nonBest:rs.filter(x=>x.selectedRank>1).length,
    openingBias:rs.filter(x=>x.openingBias).length
  }]));
  console.log('BENCH_SUMMARY',JSON.stringify(summary));
  const out={generatedAt:new Date().toISOString(),pass:failures.length===0,failures,version:result.version,engine:result.engine,coi:result.coi,phaseSummary,summary,rows:result.rows};
  fs.mkdirSync('.github/benchmark-results',{recursive:true});
  fs.writeFileSync('.github/benchmark-results/shogi-top5-latest.json',JSON.stringify(out,null,2)+'\n');
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS top5 multi-position benchmark: strength budgets + personality loss guards');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
