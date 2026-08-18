const { firefox } = require('playwright');
const fs = require('fs');

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?deepverify='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});

  const result=await page.evaluate(async()=>{
    const top=window.AI_SHOGI_YANEURAOU_TOP5,shared=window.AI_SHOGI_YANEURAOU_FUTURE;await shared.init();
    function initialState(){const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};return{b,h:{1:{},'-1':{}},t:1,log:[],last:null}}
    const baseKind=k=>String(k||'').replace(/^\+/, '');
    function applyMove(s,m){const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};if(m.drop){n.h[s.t][m.drop]=(n.h[s.t][m.drop]||0)-1;n.b[m.to]={k:m.drop,o:s.t}}else{const p=n.b[m.f],cap=n.b[m.to];n.b[m.f]=null;if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o}}n.t=-s.t;n.log.push('verify');return n}
    function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
    function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}
    function idx(sqv){return (sqv.charCodeAt(1)-97)*9+(9-Number(sqv[0]))}
    function flags(s,tok){if(!tok)return{capture:false,promote:false};const to=idx(tok.slice(tok.includes('*')?2:2,4));return{capture:!!s.b[to],promote:tok.endsWith('+')}}

    let opening=initialState();
    opening=applyMove(opening,{f:56,to:47,prom:false,drop:null}); // 7g7f
    opening=applyMove(opening,{f:24,to:33,prom:false,drop:null}); // 3c3d
    opening=applyMove(opening,{f:61,to:52,prom:false,drop:null}); // 2g2f
    opening.log=['a','b','c'];

    let s=initialState(),middle=null,late=null;
    for(let ply=1;ply<=56;ply++){
      const r=await shared.bestMove(s,{ms:180,multiPV:1});if(!r?.move)break;s=applyMove(s,r.move);
      if(ply===32)middle=JSON.parse(JSON.stringify(s));if(ply===56)late=JSON.parse(JSON.stringify(s));
    }
    const snaps=[{name:'opening-target',state:opening,ply:3},{name:'middle',state:middle,ply:32},{name:'late',state:late,ply:56}].filter(x=>x.state);
    const rows=[];
    for(const snap of snaps){
      const refMs=snap.ply>=55?5500:3500,ref=await shared.bestMove(snap.state,{ms:refMs,multiPV:4}),cands=Array.isArray(ref?.info?.candidates)?ref.info.candidates:[],best=cands[0]||null,map=Object.fromEntries(cands.map(c=>[String(c.token||''),c]));
      rows.push({phase:snap.name,ply:snap.ply,who:'未来みつき',rating:3400,targetMs:refMs,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,engineBest:ref?.info?.token||'',selected:token(ref?.move),selectedRank:1,cpLoss:0,referenceLoss:0,referenceSeen:true,openingBias:false,personality:'master'});
      for(const i of top.indices){const p=top.profiles[i],r=await top.bestMove(snap.state,i),sel=token(r?.move),rc=map[sel],refLoss=(best&&rc&&Number.isFinite(best.cp)&&Number.isFinite(rc.cp))?Math.max(0,best.cp-rc.cp):null,fl=flags(snap.state,sel);rows.push({phase:snap.name,ply:snap.ply,who:top.names[i],rating:top.ratings[i],targetMs:r?.targetMs||top.profileMs(snap.state,i),depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,engineBest:String(r?.info?.token||''),selected:sel,selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,referenceLoss:refLoss,referenceSeen:!!rc,openingBias:!!r?.info?.openingBias,personality:r?.info?.personality||p.personality,maxLoss:p.maxLoss,multiPV:p.multiPV,capture:fl.capture,promote:fl.promote,openingTokens:top.openingTokens(snap.state,i)})}
    }
    return{version:top.version,engine:top.engine,coi:crossOriginIsolated,snapshotCount:snaps.length,rows};
  });

  const failures=[],warnings=[],expected=['未来みつき','みつき','みっちゃん','あき王','おにまま','まま'];
  if(!result.coi)failures.push('crossOriginIsolated=false');if(!/YaneuraOu/.test(result.engine||''))failures.push('engine='+result.engine);if(result.snapshotCount!==3)failures.push('snapshotCount='+result.snapshotCount);
  const phaseSummary={};
  for(const phase of [...new Set(result.rows.map(r=>r.phase))]){const rs=result.rows.filter(r=>r.phase===phase);if(JSON.stringify(rs.map(r=>r.who))!==JSON.stringify(expected))failures.push(phase+' order mismatch');for(let i=1;i<rs.length;i++)if(!(rs[i-1].targetMs>rs[i].targetMs))failures.push(phase+' budget order '+rs[i-1].who+' <= '+rs[i].who);for(const r of rs.slice(1)){if(!r.selected)failures.push(phase+' '+r.who+' no selected move');if(r.cpLoss>(r.maxLoss||0))failures.push(phase+' '+r.who+' cpLoss '+r.cpLoss+' > '+r.maxLoss);if(r.referenceLoss!=null&&r.referenceLoss>250)failures.push(phase+' '+r.who+' long-ref loss '+r.referenceLoss);else if(r.referenceLoss!=null&&r.referenceLoss>120)warnings.push(phase+' '+r.who+' long-ref loss '+r.referenceLoss)}phaseSummary[phase]={selectedUnique:new Set(rs.map(r=>r.selected)).size,nonBest:rs.slice(1).filter(r=>r.selected!==r.engineBest).length,moves:Object.fromEntries(rs.map(r=>[r.who,r.selected]))}}
  const byWho={};for(const r of result.rows)(byWho[r.who]??=[]).push(r);const summary=Object.fromEntries(Object.entries(byWho).map(([who,rs])=>[who,{avgDepth:+(rs.reduce((a,x)=>a+x.depth,0)/rs.length).toFixed(2),avgNodes:Math.round(rs.reduce((a,x)=>a+x.nodes,0)/rs.length),avgCpLoss:+(rs.reduce((a,x)=>a+x.cpLoss,0)/rs.length).toFixed(2),maxCpLoss:Math.max(...rs.map(x=>x.cpLoss||0)),nonBest:rs.filter(x=>x.selected!==x.engineBest).length,openingBias:rs.filter(x=>x.openingBias).length,referenceSeen:rs.filter(x=>x.referenceSeen).length,avgReferenceLoss:+((()=>{const a=rs.filter(x=>x.referenceLoss!=null);return a.length?a.reduce((s,x)=>s+x.referenceLoss,0)/a.length:0})()).toFixed(2)}]));
  const nonMaster=result.rows.filter(r=>!['未来みつき','みつき'].includes(r.who)),divergence=nonMaster.filter(r=>r.selected!==r.engineBest).length,openingPreferred=nonMaster.filter(r=>r.phase==='opening-target'&&r.openingBias).length,divergentPhases=Object.values(phaseSummary).filter(x=>x.selectedUnique>1).length;if(divergence===0)warnings.push('personality never changed engine best');if(openingPreferred===0)warnings.push('opening bias selected no preferred move');if(divergentPhases<2)warnings.push('only '+divergentPhases+' phases diverged');
  const out={generatedAt:new Date().toISOString(),pass:failures.length===0,failures,warnings,version:result.version,engine:result.engine,coi:result.coi,snapshotCount:result.snapshotCount,divergence,openingPreferred,divergentPhases,phaseSummary,summary,rows:result.rows};fs.mkdirSync('.github/benchmark-results',{recursive:true});fs.writeFileSync('.github/benchmark-results/shogi-top5-deep-verify-latest.json',JSON.stringify(out,null,2)+'\n');console.log('VERIFY_SUMMARY',JSON.stringify({pass:out.pass,failures,warnings,divergence,openingPreferred,divergentPhases,phaseSummary,summary}));await browser.close();if(failures.length)throw new Error(failures.join(' | '));console.log('PASS deep verify');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
