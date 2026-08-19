import { webkit } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const MOVES=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h`.split(/\s+/);

function sfen(ms){
  const b=new Map(),h={b:{},w:{}};
  let rr=0;
  for(const row of INIT.split('/')){
    let f=9,pr=false;
    for(const c of row){
      if(c==='+'){pr=true;continue}
      if(/\d/.test(c)){f-=+c;continue}
      const side=c===c.toUpperCase()?'b':'w';
      b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});
      pr=false;f--;
    }
    rr++;
  }
  let t='b';
  for(const m of ms){
    if(/^[PLNSGBR]\*/.test(m)){
      const k=m[0],d=m.slice(2);
      h[t][k]=(h[t][k]||0)-1;
      b.set(d,{side:t,k,pr:false});
    }else{
      const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);
      if(!pc)throw Error('missing '+a+' '+m);
      const cap=b.get(d);
      if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;
      b.delete(a);
      b.set(d,{...pc,pr:pc.pr||p});
    }
    t=t==='b'?'w':'b';
  }
  const rows=[];
  for(let r=0;r<9;r++){
    let x='',e=0;
    for(let f=9;f;f--){
      const pc=b.get(''+f+R[r]);
      if(!pc){e++;continue}
      if(e){x+=e;e=0}
      x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase());
    }
    if(e)x+=e;
    rows.push(x);
  }
  let hand='';
  for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){
    const n=h[side][k]||0;
    if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase());
  }
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}

const targets=[19,23,33,35].map(ply=>({ply,pos:sfen(MOVES.slice(0,ply-1))}));
const budgets=[1000000,1500000,2000000,3000000];
const browser=await webkit.launch({headless:true});

try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
  await page.goto('http://127.0.0.1:4199/shogi-v21528/index.html?rootcand='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});

  const run=async(pos,nodes,pv=5)=>page.evaluate(async({pos,nodes,pv})=>{
    let src=await(await fetch('./future-yaneura-worker21528.js?v=rootcand')).text();
    src=src.replace("BASE=new URL('./yaneuraou/',self.location.href).href;","BASE=new URL('/shogi-v21528/yaneuraou/',self.location.origin).href;");
    src=src.replace("Math.min(MOBILE_SAFE?3:4,Math.round(Number(multiPV)||1))","Math.min(5,Math.round(Number(multiPV)||1))");
    src=src.replace("async function bestmove(sfen,ms,multiPV=1){","async function bestmove(sfen,ms,multiPV=1,nodes=0){");
    src=src.replace("const p=waitLine(x=>x.startsWith('bestmove '),ms+10000,'bestmove');await sendUSI('go movetime '+ms);const line=await p;stage('⑦ bestmove受信');","const limit=nodes>0?120000:ms+10000;const p=waitLine(x=>x.startsWith('bestmove '),limit,'bestmove');await sendUSI(nodes>0?('go nodes '+nodes):('go movetime '+ms));const line=await p;stage('⑦ bestmove受信');");
    src=src.replace("const out=await bestmove(String(m.sfen||''),ms,inferred||1);","const out=await bestmove(String(m.sfen||''),ms,inferred||1,Math.max(0,Number(m.nodes)||0));");
    const blob=new Blob([src],{type:'text/javascript'}),url=URL.createObjectURL(blob),w=new Worker(url);
    let id=0,P=new Map();
    w.onmessage=e=>{
      const m=e.data||{},q=P.get(m.id);
      if(!q||m.type!=='result')return;
      P.delete(m.id);clearTimeout(q.t);
      m.ok?q.r(m):q.j(Error(m.error||'worker'));
    };
    const call=(type,x={})=>new Promise((r,j)=>{
      const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout'))},150000);
      P.set(n,{r,j,t});w.postMessage({type,id:n,...x});
    });
    try{
      await call('init');
      const started=Date.now();
      const r=await call('bestmove',{sfen:pos,ms:4000,nodes,multiPV:pv});
      return {...r,elapsed:Date.now()-started};
    }finally{
      w.terminate();URL.revokeObjectURL(url);
    }
  },{pos,nodes,pv});

  let exact=0,present=0,total=0;
  for(const t of targets){
    const ref=await run(t.pos,8000000,5);
    const refCandidates=(ref.candidates||[]).map(x=>({rank:x.rank,token:x.token,cp:x.cp,depth:x.depth,nodes:x.nodes}));
    const refBest=refCandidates.find(x=>x.rank===1)?.token||ref.token;
    console.log('ROOT_REF '+JSON.stringify({ply:t.ply,best:refBest,candidates:refCandidates,elapsed:ref.elapsed,depth:ref.info?.depth,nodes:ref.info?.nodes,threads:ref.info?.threads,hashMB:ref.info?.hashMB,mobileWebKit:ref.info?.mobileWebKit}));
    for(const nodes of budgets){
      for(let rep=1;rep<=2;rep++){
        const r=await run(t.pos,nodes,5);
        const candidates=(r.candidates||[]).map(x=>({rank:x.rank,token:x.token,cp:x.cp,depth:x.depth,nodes:x.nodes}));
        const hit=candidates.find(x=>x.token===refBest);
        const row={ply:t.ply,nodes,rep,token:r.token,refBest,exact:r.token===refBest,refBestPresent:!!hit,refBestRank:hit?.rank||0,candidates,elapsed:r.elapsed,depth:r.info?.depth,seenNodes:r.info?.nodes};
        exact+=row.exact?1:0;present+=row.refBestPresent?1:0;total++;
        console.log('ROOT_ROW '+JSON.stringify(row));
      }
    }
  }
  console.log('ROOT_SUMMARY '+JSON.stringify({tests:total,exact,refBestPresent:present}));
}finally{
  await browser.close();
}
