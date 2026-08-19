import { webkit } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const GAME=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h`.split(/\s+/);
const OPENINGS=['1g1f','2g2f','3g3f','4g4f','5g5f','6g6f','7g7f','8g8f','9g9f','2h1h','2h3h','2h4h','2h5h','2h6h','2h7h','5i4h','5i5h','5i6h','4i3h','4i4h','4i5h','6i5h','6i6h','6i7h','3i3h','3i4h','7i6h','7i7h','1i1h','9i9h'];
function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}
const mode=process.env.MODE||'opening';
const cases=mode==='opening'?OPENINGS.map((human,i)=>({id:i+1,label:human,pos:sfen([human])})):[12,14,18,20,24,28,34].map(ply=>({id:ply,label:'ply'+ply,pos:sfen(GAME.slice(0,ply-1))}));
const reps=mode==='opening'?1:2,refNodes=mode==='opening'?5000000:6000000;
for(const c of cases){if(c.pos.split(/\s+/)[1]!=='w')throw Error('expected Future Gote turn '+c.label+' '+c.pos)}
const browser=await webkit.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
  await page.goto('http://127.0.0.1:4210/shogi-v21528/index.html?pr37q='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  const run=(pos,payload,baseline=false)=>page.evaluate(async({pos,payload,baseline})=>{
    const file=baseline?'future-yaneura-worker-main-test.js':'future-yaneura-worker21528.js';const w=new Worker('/shogi-v21528/'+file+'?q='+Date.now()+Math.random());let id=0,P=new Map();
    w.onmessage=e=>{const m=e.data||{},q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};
    const call=(type,x={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout'))},150000);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});
    try{const init=await call('init');const started=Date.now(),r=await call('bestmove',{sfen:pos,...payload});return{...r,elapsed:Date.now()-started,init}}finally{w.terminate()}
  },{pos,payload,baseline});
  let candidateExact=0,baselineExact=0,candidateTop5=0,baselineTop5=0,total=0,triggers=0,earlyAdaptive=0,candidateElapsed=0,baselineElapsed=0;
  for(const c of cases){
    const ref=await run(c.pos,{ms:4000,nodes:refNodes,multiPV:5,adaptive:false},false),refCandidates=(ref.candidates||[]).map(x=>({rank:x.rank,token:x.token,cp:x.cp,depth:x.depth,nodes:x.nodes})),refBest=refCandidates.find(x=>x.rank===1)?.token||ref.token,refSet=new Set(refCandidates.map(x=>x.token));
    console.log('PR37_REF '+JSON.stringify({mode,id:c.id,label:c.label,best:refBest,candidates:refCandidates,elapsed:ref.elapsed}));
    for(let rep=1;rep<=reps;rep++){
      const cand=await run(c.pos,{ms:4000,multiPV:1},false),base=await run(c.pos,{ms:4000,multiPV:1},true),moveNo=Number(c.pos.trim().split(/\s+/).at(-1));
      const row={mode,id:c.id,label:c.label,rep,moveNo,refBest,candidate:cand.token,baseline:base.token,candidateExact:cand.token===refBest,baselineExact:base.token===refBest,candidateTop5:refSet.has(cand.token),baselineTop5:refSet.has(base.token),adaptive:!!cand.info?.adaptive,reranked:!!cand.info?.reranked,gapCp:cand.info?.gapCp,candidateElapsed:cand.elapsed,baselineElapsed:base.elapsed,candidateThreads:cand.info?.threads,baselineThreads:base.info?.threads,hashMB:cand.info?.hashMB};
      candidateExact+=row.candidateExact?1:0;baselineExact+=row.baselineExact?1:0;candidateTop5+=row.candidateTop5?1:0;baselineTop5+=row.baselineTop5?1:0;triggers+=row.reranked?1:0;if(mode==='opening'&&row.adaptive)earlyAdaptive++;candidateElapsed+=cand.elapsed;baselineElapsed+=base.elapsed;total++;console.log('PR37_ROW '+JSON.stringify(row));
    }
  }
  const summary={mode,tests:total,candidateExact,baselineExact,candidateTop5,baselineTop5,triggers,earlyAdaptive,meanCandidateElapsed:Math.round(candidateElapsed/total),meanBaselineElapsed:Math.round(baselineElapsed/total)};
  console.log('PR37_SUMMARY '+JSON.stringify(summary));
  if(mode==='opening'){if(earlyAdaptive!==0)throw Error('opening adaptive fired '+earlyAdaptive);if(candidateTop5+1<baselineTop5)throw Error('opening Top5 regression '+JSON.stringify(summary));if(candidateExact+2<baselineExact)throw Error('opening exact regression '+JSON.stringify(summary));}
  else {if(candidateTop5<baselineTop5)throw Error('Gote Top5 regression '+JSON.stringify(summary));if(candidateExact<baselineExact)throw Error('Gote exact regression '+JSON.stringify(summary));if(triggers<2)throw Error('Gote rerank gate not exercised '+JSON.stringify(summary));}
}finally{await browser.close()}
