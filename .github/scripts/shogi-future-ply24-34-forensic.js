const {webkit,devices}=require('playwright');

const MOVES=`7g7f 8c8d 2h3h 8d8e 7f7e 8e8f 7e7d 8f8g+ 8h5e 8b8e 5e4f 7a6b 4i5h 3c3d 5i4i 2b9i+ 7d7c+ 6b7c 8i7g 8g7g P*7d 7c6d 6i7h 5a4b 7d7c+ 8a7c 7h7g 9i7g 7i6h 8e8i+ P*7i 7g6h 5h6h 8i7i+`.split(/\s+/);
const FUTURE_PLIES=[24,26,28,30,32];

function initial(){
  const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){
    b[x]={k:back[x],o:-1}; b[72+x]={k:back[8-x],o:1};
    b[18+x]={k:'P',o:-1}; b[54+x]={k:'P',o:1};
  }
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
}
const base=k=>String(k||'').replace(/^\+/,'');
const ix=sq=>(sq.charCodeAt(1)-97)*9+(9-Number(sq[0]));
function parse(tok){
  if(tok[1]==='*')return{drop:tok[0],to:ix(tok.slice(2)),prom:false};
  return{f:ix(tok.slice(0,2)),to:ix(tok.slice(2,4)),prom:tok.endsWith('+'),drop:null};
}
function apply(s,m,label){
  const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h[1]||{})},'-1':{...(s.h[-1]||{})}},t:s.t,log:[...s.log],last:m};
  if(m.drop){
    const have=n.h[s.t][m.drop]||0;if(have<1)throw Error('illegal drop '+label);
    n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};
  }else{
    const p=n.b[m.f];if(!p||p.o!==s.t)throw Error('source '+label);
    const cap=n.b[m.to];if(cap&&cap.o===s.t)throw Error('own '+label);
    n.b[m.f]=null;
    if(cap){const k=base(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1;}
    let k=p.k;if(m.prom&&!k.startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};
  }
  n.t=-s.t;n.log.push(label);return n;
}

(async()=>{
  const states={0:initial()};let s=states[0];
  for(let i=0;i<MOVES.length;i++){s=apply(s,parse(MOVES[i]),MOVES[i]);states[i+1]=s;}

  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?forensic='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});

  const init=await page.evaluate(async()=>{const e=window.AI_SHOGI_YANEURAOU_FUTURE;await e.init();return{tune:e.strengthTune,status:e.status()};});
  console.log('ENGINE',JSON.stringify(init));
  const rows=[];

  for(const ply of FUTURE_PLIES){
    const before=states[ply],afterFuture=states[ply+1],afterPair=states[ply+2];
    if(before.t!==1||afterFuture.t!==-1||afterPair.t!==1)throw Error('turn mismatch around ply '+ply);
    const actual=MOVES[ply],reply=MOVES[ply+1];
    const row=await page.evaluate(async({before,afterFuture,afterPair,actual,reply,ply})=>{
      const e=window.AI_SHOGI_YANEURAOU_FUTURE;
      const root=await e.bestMove(before,{ms:20000,multiPV:3});
      const after=await e.bestMove(afterFuture,{ms:20000,multiPV:1});
      const pair=await e.bestMove(afterPair,{ms:20000,multiPV:1});
      const cands=(root?.info?.candidates||[]).map(c=>({rank:c.rank,move:c.token,cp:c.cp??null,mate:c.mate??null,depth:c.depth||0,nodes:c.nodes||0}));
      const actualCand=cands.find(c=>c.move===actual)||null;
      const rootCp=root?.info?.cp??null;
      const oppCp=after?.info?.cp??null;
      const blackAfterActual=Number.isFinite(oppCp)?-oppCp:null;
      const pairCp=pair?.info?.cp??null;
      return{
        ply,actual,reply,
        sfenBefore:e.toSFEN(before),sfenAfterFuture:e.toSFEN(afterFuture),sfenAfterPair:e.toSFEN(afterPair),
        refBest:root?.info?.candidates?.[0]?.token||'',rootCp,rootMove:(root&&root.move)?(root.move.drop?root.move.drop+'*'+String(9-(root.move.to%9))+String.fromCharCode(97+Math.floor(root.move.to/9)):String(9-(root.move.f%9))+String.fromCharCode(97+Math.floor(root.move.f/9))+String(9-(root.move.to%9))+String.fromCharCode(97+Math.floor(root.move.to/9))+(root.move.prom?'+':'')):'',
        candidates:cands,actualCand,
        afterActualOpponentCp:oppCp,blackAfterActualCp:blackAfterActual,
        afterPairCp:pairCp,
        approxActualLoss:(Number.isFinite(rootCp)&&Number.isFinite(blackAfterActual))?rootCp-blackAfterActual:null,
        exactTop3Loss:(actualCand&&Number.isFinite(rootCp)&&Number.isFinite(actualCand.cp))?rootCp-actualCand.cp:null,
        rootDepth:root?.info?.depth||0,afterDepth:after?.info?.depth||0,pairDepth:pair?.info?.depth||0,
        threads:root?.info?.threads,hashMB:root?.info?.hashMB
      };
    },{before,afterFuture,afterPair,actual,reply,ply});
    rows.push(row);console.log('FORENSIC_ROW',JSON.stringify(row));
  }

  await browser.close();
  if(rows.some(r=>!r.rootMove||!r.rootDepth||r.threads!==1||r.hashMB!==64))throw Error('search/profile failure');
  const ranked=rows.map(r=>({ply:r.ply,actual:r.actual,reply:r.reply,ref:r.rootMove,rootCp:r.rootCp,actualRank:r.actualCand?.rank||null,actualCp:r.actualCand?.cp??null,exactTop3Loss:r.exactTop3Loss,blackAfterActualCp:r.blackAfterActualCp,approxActualLoss:r.approxActualLoss,afterPairCp:r.afterPairCp})).sort((a,b)=>(b.approxActualLoss??-99999)-(a.approxActualLoss??-99999));
  console.log('PLY24_34_FORENSIC_SUMMARY',JSON.stringify({rows:ranked,worstByAfterMove:ranked[0]||null}));
  console.log('PASS ply24-34 forensic completed');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1);});