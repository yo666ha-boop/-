const { firefox } = require('playwright');
const fs = require('fs');
const stressCase=process.env.STRESS_CASE||'7g-middle';

(async()=>{
  const cases={
    '7g-middle':{seed:'7g7f',move:{f:56,to:47,prom:false,drop:null},targetPly:20,phase:'middle'},
    '2g-middle':{seed:'2g2f',move:{f:61,to:52,prom:false,drop:null},targetPly:20,phase:'middle'},
    '5g-middle':{seed:'5g5f',move:{f:58,to:49,prom:false,drop:null},targetPly:20,phase:'middle'},
    '7g-late':{seed:'7g7f',move:{f:56,to:47,prom:false,drop:null},targetPly:56,phase:'late'},
    '2g-late':{seed:'2g2f',move:{f:61,to:52,prom:false,drop:null},targetPly:56,phase:'late'}
  };
  const spec=cases[stressCase];if(!spec)throw new Error('unknown STRESS_CASE '+stressCase);
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?positionstress='+encodeURIComponent(stressCase)+'-'+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});

  const result=await page.evaluate(async spec=>{
    const top=window.AI_SHOGI_YANEURAOU_TOP5,shared=window.AI_SHOGI_YANEURAOU_FUTURE;await shared.init();
    function initialState(){const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};return{b,h:{1:{},'-1':{}},t:1,log:[],last:null}}
    const baseKind=k=>String(k||'').replace(/^\+/, '');
    function applyMove(s,m,label='stress'){const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};if(m.drop){const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop '+m.drop);n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t}}else{const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch '+JSON.stringify(m));const cap=n.b[m.to];if(cap&&cap.o===s.t)throw new Error('own capture '+JSON.stringify(m));n.b[m.f]=null;if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o}}n.t=-s.t;n.log.push(label);return n}
    function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
    function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}

    let s=applyMove(initialState(),spec.move,'seed-'+spec.seed);
    for(let ply=2;ply<=spec.targetPly;ply++){const r=await shared.bestMove(s,{ms:120,multiPV:1});if(!r?.move)throw new Error(spec.seed+' generator stopped at ply '+ply);s=applyMove(s,r.move,'gen')}
    const refMs=spec.phase==='late'?10000:7000,ref=await shared.bestMove(s,{ms:refMs,multiPV:4});
    const cands=Array.isArray(ref?.info?.candidates)?ref.info.candidates:[],best=cands[0]||null,refMap=Object.fromEntries(cands.map(c=>[String(c.token||''),c]));
    const rows=[{who:'未来みつき',rating:3400,targetMs:refMs,engine:String(ref?.info?.engine||''),engineBest:String(ref?.info?.token||''),selected:token(ref?.move),selectedRank:1,cpLoss:0,maxLoss:0,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,multiPV:ref?.info?.multiPV||4,referenceSeen:true,referenceLoss:0}];
    for(const who of top.indices){const p=top.profiles[who],r=await top.bestMove(s,who),sel=token(r?.move),rc=refMap[sel],refLoss=(best&&rc&&Number.isFinite(best.cp)&&Number.isFinite(rc.cp))?Math.max(0,best.cp-rc.cp):null;rows.push({who:top.names[who],rating:top.ratings[who],targetMs:r?.targetMs||top.profileMs(s,who),engine:String(r?.info?.engine||''),engineBest:String(r?.info?.token||''),selected:sel,selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,maxLoss:p.maxLoss,depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,multiPV:r?.info?.profileMultiPV||p.multiPV,referenceSeen:!!rc,referenceLoss:refLoss,openingBias:!!r?.info?.openingBias,personality:r?.info?.personality||p.personality})}
    return{coi:crossOriginIsolated,version:top.version,engine:top.engine,seed:spec.seed,phase:spec.phase,ply:spec.targetPly,rows};
  },spec);

  const failures=[],warnings=[],expected=['未来みつき','みつき','みっちゃん','あき王','おにまま','まま'],rs=result.rows;
  if(!result.coi)failures.push('crossOriginIsolated=false');if(!/YaneuraOu/.test(result.engine||''))failures.push('top engine='+result.engine);if(JSON.stringify(rs.map(r=>r.who))!==JSON.stringify(expected))failures.push('character order mismatch');
  for(let i=1;i<rs.length;i++)if(!(rs[i-1].targetMs>rs[i].targetMs))failures.push('budget order '+rs[i-1].who+' <= '+rs[i].who);
  for(const r of rs){if(!r.selected)failures.push(r.who+' no selected move');if(!/YaneuraOu/.test(r.engine||''))failures.push(r.who+' engine='+r.engine);if(r.nodes<=0)failures.push(r.who+' nodes='+r.nodes);if(r.who!=='未来みつき'){if(r.cpLoss>r.maxLoss)failures.push(r.who+' cpLoss '+r.cpLoss+' > '+r.maxLoss);if(r.selectedRank>r.multiPV)failures.push(r.who+' rank '+r.selectedRank+' > mpv '+r.multiPV);if(r.referenceLoss!=null&&r.referenceLoss>180)failures.push(r.who+' referenceLoss '+r.referenceLoss);else if(r.referenceLoss!=null&&r.referenceLoss>90)warnings.push(r.who+' referenceLoss '+r.referenceLoss)}}
  const summary={uniqueMoves:new Set(rs.map(r=>r.selected)).size,nonBest:rs.slice(1).filter(r=>r.selected!==r.engineBest).length,notSeenByLongRef:rs.slice(1).filter(r=>!r.referenceSeen).map(r=>r.who),moves:Object.fromEntries(rs.map(r=>[r.who,r.selected])),maxCpLoss:Object.fromEntries(rs.slice(1).map(r=>[r.who,r.cpLoss])),nodes:Object.fromEntries(rs.map(r=>[r.who,r.nodes]))};
  const out={generatedAt:new Date().toISOString(),case:stressCase,pass:failures.length===0,failures,warnings,version:result.version,engine:result.engine,coi:result.coi,seed:result.seed,phase:result.phase,ply:result.ply,summary,rows:rs};
  fs.mkdirSync('.github/benchmark-results',{recursive:true});const outPath='.github/benchmark-results/shogi-top5-position-stress-'+stressCase+'.json';fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log('POSITION_STRESS_CASE',JSON.stringify({case:stressCase,pass:out.pass,failures,warnings,summary}));await browser.close();if(failures.length)throw new Error(failures.join(' | '));console.log('PASS position stress '+stressCase);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
