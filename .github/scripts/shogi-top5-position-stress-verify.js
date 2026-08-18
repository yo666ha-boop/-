const { firefox } = require('playwright');
const fs = require('fs');

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?positionstress='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
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
    const baseKind=k=>String(k||'').replace(/^\+/, '');
    function clone(s){return JSON.parse(JSON.stringify(s))}
    function applyMove(s,m,label='stress'){
      const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};
      if(m.drop){
        const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop '+m.drop);n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};
      }else{
        const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch '+JSON.stringify(m));const cap=n.b[m.to];if(cap&&cap.o===s.t)throw new Error('own capture '+JSON.stringify(m));n.b[m.f]=null;
        if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};
      }
      n.t=-s.t;n.log.push(label);return n;
    }
    function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
    function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}

    const seeds=[
      {name:'7g7f',move:{f:56,to:47,prom:false,drop:null},late:true},
      {name:'2g2f',move:{f:61,to:52,prom:false,drop:null},late:true},
      {name:'5g5f',move:{f:58,to:49,prom:false,drop:null},late:false}
    ];
    const snapshots=[];
    for(const seed of seeds){
      let s=applyMove(initialState(),seed.move,'seed-'+seed.name);
      for(let ply=2;ply<=56;ply++){
        const r=await shared.bestMove(s,{ms:220,multiPV:1});
        if(!r?.move)throw new Error(seed.name+' generator stopped at ply '+ply);
        s=applyMove(s,r.move,'gen');
        if(ply===20)snapshots.push({name:seed.name+'-middle',seed:seed.name,phase:'middle',ply,state:clone(s)});
        if(seed.late&&ply===56)snapshots.push({name:seed.name+'-late',seed:seed.name,phase:'late',ply,state:clone(s)});
        if(!seed.late&&ply===20)break;
      }
    }

    const rows=[];
    for(const snap of snapshots){
      const refMs=snap.phase==='late'?10000:7000;
      const ref=await shared.bestMove(snap.state,{ms:refMs,multiPV:4});
      const cands=Array.isArray(ref?.info?.candidates)?ref.info.candidates:[];
      const best=cands[0]||null,refMap=Object.fromEntries(cands.map(c=>[String(c.token||''),c]));
      rows.push({snapshot:snap.name,seed:snap.seed,phase:snap.phase,ply:snap.ply,who:'未来みつき',rating:3400,targetMs:refMs,engine:String(ref?.info?.engine||''),engineBest:String(ref?.info?.token||''),selected:token(ref?.move),selectedRank:1,cpLoss:0,maxLoss:0,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,multiPV:ref?.info?.multiPV||4,referenceSeen:true,referenceLoss:0});
      for(const who of top.indices){
        const p=top.profiles[who],r=await top.bestMove(snap.state,who),sel=token(r?.move),rc=refMap[sel];
        const refLoss=(best&&rc&&Number.isFinite(best.cp)&&Number.isFinite(rc.cp))?Math.max(0,best.cp-rc.cp):null;
        rows.push({snapshot:snap.name,seed:snap.seed,phase:snap.phase,ply:snap.ply,who:top.names[who],rating:top.ratings[who],targetMs:r?.targetMs||top.profileMs(snap.state,who),engine:String(r?.info?.engine||''),engineBest:String(r?.info?.token||''),selected:sel,selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,maxLoss:p.maxLoss,depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,multiPV:r?.info?.profileMultiPV||p.multiPV,referenceSeen:!!rc,referenceLoss:refLoss,openingBias:!!r?.info?.openingBias,personality:r?.info?.personality||p.personality});
      }
    }
    return{coi:crossOriginIsolated,version:top.version,engine:top.engine,snapshotCount:snapshots.length,rows};
  });

  const failures=[],warnings=[];
  if(!result.coi)failures.push('crossOriginIsolated=false');
  if(!/YaneuraOu/.test(result.engine||''))failures.push('top engine='+result.engine);
  if(result.snapshotCount!==5)failures.push('snapshotCount='+result.snapshotCount);
  const expected=['未来みつき','みつき','みっちゃん','あき王','おにまま','まま'];
  const snapshotSummary={};
  for(const snap of [...new Set(result.rows.map(r=>r.snapshot))]){
    const rs=result.rows.filter(r=>r.snapshot===snap);
    if(JSON.stringify(rs.map(r=>r.who))!==JSON.stringify(expected))failures.push(snap+' character order mismatch');
    for(let i=1;i<rs.length;i++)if(!(rs[i-1].targetMs>rs[i].targetMs))failures.push(snap+' budget order '+rs[i-1].who+' <= '+rs[i].who);
    for(const r of rs){
      if(!r.selected)failures.push(snap+' '+r.who+' no selected move');
      if(!/YaneuraOu/.test(r.engine||''))failures.push(snap+' '+r.who+' engine='+r.engine);
      if(r.nodes<=0)failures.push(snap+' '+r.who+' nodes='+r.nodes);
      if(r.who!=='未来みつき'){
        if(r.cpLoss>r.maxLoss)failures.push(snap+' '+r.who+' cpLoss '+r.cpLoss+' > '+r.maxLoss);
        if(r.selectedRank>r.multiPV)failures.push(snap+' '+r.who+' rank '+r.selectedRank+' > mpv '+r.multiPV);
        if(r.referenceLoss!=null&&r.referenceLoss>180)failures.push(snap+' '+r.who+' referenceLoss '+r.referenceLoss);
        else if(r.referenceLoss!=null&&r.referenceLoss>90)warnings.push(snap+' '+r.who+' referenceLoss '+r.referenceLoss);
      }
    }
    snapshotSummary[snap]={phase:rs[0]?.phase,uniqueMoves:new Set(rs.map(r=>r.selected)).size,nonBest:rs.slice(1).filter(r=>r.selected!==r.engineBest).length,notSeenByLongRef:rs.slice(1).filter(r=>!r.referenceSeen).map(r=>r.who),moves:Object.fromEntries(rs.map(r=>[r.who,r.selected]))};
  }
  const byWho={};
  for(const r of result.rows)(byWho[r.who]??=[]).push(r);
  const characterSummary=Object.fromEntries(Object.entries(byWho).map(([who,rs])=>[who,{
    samples:rs.length,
    avgDepth:+(rs.reduce((a,x)=>a+x.depth,0)/rs.length).toFixed(2),
    avgNodes:Math.round(rs.reduce((a,x)=>a+x.nodes,0)/rs.length),
    avgCpLoss:+(rs.reduce((a,x)=>a+(x.cpLoss||0),0)/rs.length).toFixed(2),
    maxCpLoss:Math.max(...rs.map(x=>x.cpLoss||0)),
    nonBest:rs.filter(x=>x.selected!==x.engineBest).length,
    referenceSeen:rs.filter(x=>x.referenceSeen).length,
    maxReferenceLoss:Math.max(0,...rs.filter(x=>x.referenceLoss!=null).map(x=>x.referenceLoss||0))
  }]));
  const styleRows=result.rows.filter(r=>!['未来みつき','みつき'].includes(r.who));
  const styleChanges=styleRows.filter(r=>r.selected!==r.engineBest).length;
  const divergentSnapshots=Object.values(snapshotSummary).filter(x=>x.uniqueMoves>1).length;
  if(styleChanges===0)warnings.push('no lower-character style changes in stress suite');
  if(divergentSnapshots<2)warnings.push('only '+divergentSnapshots+' snapshots had move divergence');

  const out={generatedAt:new Date().toISOString(),pass:failures.length===0,failures,warnings,version:result.version,engine:result.engine,coi:result.coi,snapshotCount:result.snapshotCount,styleChanges,divergentSnapshots,snapshotSummary,characterSummary,rows:result.rows};
  fs.mkdirSync('.github/benchmark-results',{recursive:true});
  fs.writeFileSync('.github/benchmark-results/shogi-top5-position-stress-latest.json',JSON.stringify(out,null,2)+'\n');
  console.log('POSITION_STRESS_SUMMARY',JSON.stringify({pass:out.pass,failures,warnings,styleChanges,divergentSnapshots,snapshotSummary,characterSummary}));
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS broader top-five position stress verification');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
