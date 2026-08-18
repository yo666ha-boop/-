const { firefox } = require('playwright');
const fs = require('fs');

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?sequencetactics='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
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
    function applyMove(s,m,label='verify'){
      if(!m||!Number.isInteger(m.to)||m.to<0||m.to>=81)throw new Error('bad move '+JSON.stringify(m));
      const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:{...m}};
      if(m.drop){
        const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop '+m.drop+' side='+s.t);
        n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};
      }else{
        if(!Number.isInteger(m.f)||m.f<0||m.f>=81)throw new Error('bad from '+JSON.stringify(m));
        const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch '+JSON.stringify(m)+' turn='+s.t);
        const cap=n.b[m.to];if(cap&&cap.o===s.t)throw new Error('own capture '+JSON.stringify(m));
        n.b[m.f]=null;
        if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}
        let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};
      }
      n.t=-s.t;n.log.push(label);return n;
    }
    function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
    function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}

    const seeds=[
      {name:'7g7f',move:{f:56,to:47,prom:false,drop:null}},
      {name:'2g2f',move:{f:61,to:52,prom:false,drop:null}}
    ];
    const sequences=[];
    for(const seed of seeds){
      for(const who of top.indices){
        let s=applyMove(initialState(),seed.move,'seed');
        const replies=[];
        for(let turn=0;turn<3;turn++){
          const before=clone(s),r=await top.bestMove(s,who);
          if(!r?.move)throw new Error(seed.name+' '+top.names[who]+' no move turn '+turn);
          const chosen=token(r.move),engineBest=String(r?.info?.token||'');
          replies.push({turn:turn+1,ply:s.log.length+1,chosen,engineBest,targetMs:r?.targetMs||top.profileMs(s,who),depth:r?.info?.depth||0,nodes:r?.info?.nodes||0,selectedRank:r?.info?.selectedRank||1,effectiveMultiPV:r?.info?.profileMultiPV||top.profiles[who].multiPV,cpLoss:r?.info?.cpLoss||0,maxLoss:top.profiles[who].maxLoss,openingBias:!!r?.info?.openingBias,openingTokens:top.openingTokens(before,who),engine:r?.info?.engine||'',mate:r?.info?.mate});
          s=applyMove(s,r.move,'top5');
          if(turn<2){
            const opp=await shared.bestMove(s,{ms:300,multiPV:1});
            if(!opp?.move)throw new Error(seed.name+' '+top.names[who]+' opponent no move turn '+turn);
            s=applyMove(s,opp.move,'future300');
          }
        }
        sequences.push({seed:seed.name,who:top.names[who],rating:top.ratings[who],personality:top.profiles[who].personality,replies,signature:replies.map(x=>x.chosen).join(' '),finalPly:s.log.length});
      }
    }

    const mate={b:Array(81).fill(null),h:{1:{},'-1':{}},t:1,log:Array(24).fill('mate-fixture'),last:null};
    mate.b[8]={k:'K',o:-1};     // defender king 1a
    mate.b[16]={k:'R',o:1};     // attacker rook 2b -> 1b is mate
    mate.b[25]={k:'G',o:1};     // protects 1b/2b
    mate.b[15]={k:'G',o:1};     // covers 2a/2b
    mate.b[72]={k:'K',o:1};     // attacker king 9i
    const mateReference=await shared.bestMove(mate,{ms:2500,multiPV:4});
    const mateRows=[];
    for(const who of top.indices){
      const r=await top.bestMove(mate,who);
      mateRows.push({who:top.names[who],rating:top.ratings[who],selected:token(r?.move),engineBest:String(r?.info?.token||''),mate:r?.info?.mate,selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,targetMs:r?.targetMs||top.profileMs(mate,who),engine:r?.info?.engine||''});
    }
    return{version:top.version,engine:top.engine,coi:crossOriginIsolated,sequences,mateReference:{selected:token(mateReference?.move),engineBest:String(mateReference?.info?.token||''),mate:mateReference?.info?.mate,depth:mateReference?.info?.depth||0,nodes:mateReference?.info?.nodes||0,engine:mateReference?.info?.engine||''},mateRows};
  });

  const failures=[],warnings=[];
  if(!result.coi)failures.push('crossOriginIsolated=false');
  if(!/YaneuraOu/.test(result.engine||''))failures.push('engine='+result.engine);
  const names=['みつき','みっちゃん','あき王','おにまま','まま'];
  const seedSummary={};
  for(const seed of [...new Set(result.sequences.map(x=>x.seed))]){
    const seqs=result.sequences.filter(x=>x.seed===seed);
    if(JSON.stringify(seqs.map(x=>x.who))!==JSON.stringify(names))failures.push(seed+' character order mismatch');
    const uniquePaths=new Set(seqs.map(x=>x.signature)).size;
    const uniqueFirst=new Set(seqs.map(x=>x.replies[0]?.chosen)).size;
    const totalBias=seqs.reduce((a,x)=>a+x.replies.filter(r=>r.openingBias).length,0);
    seedSummary[seed]={uniquePaths,uniqueFirst,totalBias,paths:Object.fromEntries(seqs.map(x=>[x.who,x.signature]))};
    if(uniquePaths<2)warnings.push(seed+' all characters followed same 3-reply path');
    for(const seq of seqs){
      if(seq.finalPly!==6)failures.push(seed+' '+seq.who+' finalPly='+seq.finalPly);
      for(const r of seq.replies){
        if(!r.chosen)failures.push(seed+' '+seq.who+' no chosen move');
        if(!/YaneuraOu/.test(r.engine||''))failures.push(seed+' '+seq.who+' engine='+r.engine);
        if(r.cpLoss>r.maxLoss)failures.push(seed+' '+seq.who+' cpLoss '+r.cpLoss+' > '+r.maxLoss);
        if(r.selectedRank>r.effectiveMultiPV)failures.push(seed+' '+seq.who+' rank '+r.selectedRank+' > mpv '+r.effectiveMultiPV);
        if(r.nodes<=0)failures.push(seed+' '+seq.who+' nodes='+r.nodes);
      }
    }
  }
  const coverage={};
  for(const who of names.slice(1)){
    const seqs=result.sequences.filter(x=>x.who===who),replies=seqs.flatMap(x=>x.replies);
    coverage[who]={replies:replies.length,biasHits:replies.filter(r=>r.openingBias).length,preferredAvailable:replies.filter(r=>Array.isArray(r.openingTokens)&&r.openingTokens.length).length,nonBest:replies.filter(r=>r.chosen!==r.engineBest).length,avgCpLoss:+(replies.reduce((a,r)=>a+r.cpLoss,0)/Math.max(1,replies.length)).toFixed(2),maxCpLoss:Math.max(0,...replies.map(r=>r.cpLoss))};
    if(coverage[who].preferredAvailable>0&&coverage[who].biasHits===0)warnings.push(who+' had opening preferences but never selected one across sequences');
  }

  if(!result.mateReference.selected)failures.push('mate reference no move');
  if(result.mateReference.mate==null)warnings.push('mate fixture reference did not report mate score');
  const referenceMove=result.mateReference.selected;
  for(const r of result.mateRows){
    if(!r.selected)failures.push('mate '+r.who+' no move');
    if(!/YaneuraOu/.test(r.engine||''))failures.push('mate '+r.who+' engine='+r.engine);
    if(r.mate!=null && r.selected!==r.engineBest)failures.push('mate '+r.who+' changed a mate-scored engine best '+r.engineBest+' -> '+r.selected);
    if(result.mateReference.mate!=null && r.selected!==referenceMove)warnings.push('mate '+r.who+' differs from long reference '+referenceMove+' -> '+r.selected);
  }

  const out={generatedAt:new Date().toISOString(),pass:failures.length===0,failures,warnings,version:result.version,engine:result.engine,coi:result.coi,seedSummary,coverage,mateReference:result.mateReference,mateRows:result.mateRows,sequences:result.sequences};
  fs.mkdirSync('.github/benchmark-results',{recursive:true});
  fs.writeFileSync('.github/benchmark-results/shogi-top5-sequence-tactics-latest.json',JSON.stringify(out,null,2)+'\n');
  console.log('SEQUENCE_TACTICS_SUMMARY',JSON.stringify({pass:out.pass,failures,warnings,seedSummary,coverage,mateReference:out.mateReference,mateRows:out.mateRows}));
  await browser.close();
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS multi-ply opening + tactics verification');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
