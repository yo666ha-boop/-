import { webkit } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const GAME=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h`.split(/\s+/);
// Actual app orientation is user=Sente / Future=Gote, so audit positions where Gote is to move.
// Move 2 is already covered exhaustively by the all-30 first-reply audit; start at move 4 here.
const PLIES=[];for(let p=4;p<=34;p+=2)PLIES.push(p);
const THRESHOLDS=[4,8,12,16,18,20,24,28];

function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';
  for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}

const cases=PLIES.map(ply=>({ply,pos:sfen(GAME.slice(0,ply-1))}));
for(const c of cases){const side=c.pos.split(/\s+/)[1];if(side!=='w')throw Error('orientation regression ply '+c.ply+' side='+side+' '+c.pos)}
const browser=await webkit.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
  await page.goto('http://127.0.0.1:4206/shogi-v21528/index.html?phase='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  const run=(pos,payload)=>page.evaluate(async({pos,payload})=>{
    const w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?phase='+Date.now()+Math.random());let id=0,P=new Map();
    w.onmessage=e=>{const m=e.data||{},q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};
    const call=(type,x={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout'))},150000);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});
    try{await call('init');const started=Date.now(),r=await call('bestmove',{sfen:pos,...payload});return{...r,elapsed:Date.now()-started}}finally{w.terminate()}
  },{pos,payload});

  const rows=[];
  for(const c of cases){
    const ref=await run(c.pos,{ms:4000,nodes:6000000,multiPV:5,adaptive:false});
    const refCandidates=(ref.candidates||[]).map(x=>({rank:x.rank,token:x.token,cp:x.cp,depth:x.depth,nodes:x.nodes}));
    const refBest=refCandidates.find(x=>x.rank===1)?.token||ref.token,refSet=new Set(refCandidates.map(x=>x.token));
    console.log('PHASE_REF '+JSON.stringify({orientation:'future-gote',ply:c.ply,best:refBest,candidates:refCandidates,elapsed:ref.elapsed}));
    for(let rep=1;rep<=2;rep++){
      const candidate=await run(c.pos,{ms:4000,multiPV:1});
      const baseline=await run(c.pos,{ms:4000,multiPV:1,adaptive:false});
      const row={orientation:'future-gote',ply:c.ply,rep,refBest,candidate:candidate.token,baseline:baseline.token,candidateExact:candidate.token===refBest,baselineExact:baseline.token===refBest,candidateTop5:refSet.has(candidate.token),baselineTop5:refSet.has(baseline.token),reranked:!!candidate.info?.reranked,gapCp:candidate.info?.gapCp,candidateElapsed:candidate.elapsed,baselineElapsed:baseline.elapsed};
      rows.push(row);console.log('PHASE_ROW '+JSON.stringify(row));
    }
  }
  const baseline={exact:0,top5:0,elapsed:0};for(const r of rows){baseline.exact+=r.baselineExact?1:0;baseline.top5+=r.baselineTop5?1:0;baseline.elapsed+=r.baselineElapsed}
  const gates={};
  for(const threshold of THRESHOLDS){let exact=0,top5=0,triggers=0,elapsed=0;for(const r of rows){const use=r.ply>=threshold;exact+=(use?r.candidateExact:r.baselineExact)?1:0;top5+=(use?r.candidateTop5:r.baselineTop5)?1:0;triggers+=use&&r.reranked?1:0;elapsed+=use?r.candidateElapsed:r.baselineElapsed}gates[threshold]={exact,top5,triggers,meanElapsed:Math.round(elapsed/rows.length)}}
  console.log('PHASE_SUMMARY '+JSON.stringify({orientation:'future-gote',tests:rows.length,baselineExact:baseline.exact,baselineTop5:baseline.top5,baselineMeanElapsed:Math.round(baseline.elapsed/rows.length),gates}));
}finally{await browser.close()}
