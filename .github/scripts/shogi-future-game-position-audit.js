const {webkit,devices}=require('playwright');

const MOVES=`7g7f 8c8d 2h3h 8d8e 7f7e 8e8f 7e7d 8f8g+ 8h5e 8b8e 5e4f 7a6b 4i5h 3c3d 5i4i 2b9i+ 7d7c+ 6b7c 8i7g 8g7g P*7d 7c6d 6i7h 5a4b 7d7c+ 8a7c 7h7g 9i7g 7i6h 8e8i+ P*7i 7g6h 5h6h 8i7i B*5i L*4d 4f6d 6c6d S*5h N*3e 3g3f 3e4g 5h4g 4d4g+ N*5e S*4f 5e4c+ 4b4c 6h5h 4g5h 3h5h G*4g P*4d 4c5d 5h4h S*5h 4h5h 4g5h`.split(/\s+/);
const CHECK=[0,4,8,12,24,34,44,48,52,56];

function initial(){
  const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
}
const base=k=>String(k||'').replace(/^\+/,'');
const ix=sq=>(sq.charCodeAt(1)-97)*9+(9-Number(sq[0]));
function parse(tok){if(tok[1]==='*')return{drop:tok[0],to:ix(tok.slice(2)),prom:false};return{f:ix(tok.slice(0,2)),to:ix(tok.slice(2,4)),prom:tok.endsWith('+'),drop:null};}
function apply(s,m,label){
  const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h[1]||{})},'-1':{...(s.h[-1]||{})}},t:s.t,log:[...s.log],last:m};
  if(m.drop){const have=n.h[s.t][m.drop]||0;if(have<1)throw Error('drop '+label);n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};}
  else{const p=n.b[m.f];if(!p||p.o!==s.t)throw Error('source '+label);const cap=n.b[m.to];if(cap&&cap.o===s.t)throw Error('own '+label);n.b[m.f]=null;if(cap){const k=base(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!k.startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};}
  n.t=-s.t;n.log.push(label);return n;
}

(async()=>{
  const states={0:initial()};let s=states[0];
  for(let i=0;i<MOVES.length;i++){s=apply(s,parse(MOVES[i]),MOVES[i]);if(CHECK.includes(i+1))states[i+1]=s;}
  const browser=await webkit.launch({headless:true}),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?gamepos='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});
  const init=await page.evaluate(async()=>{const e=window.AI_SHOGI_YANEURAOU_FUTURE;await e.init();return{tune:e.strengthTune,status:e.status()}});console.log('ENGINE',JSON.stringify(init));
  const rows=[];
  for(const ply of CHECK){
    const st=states[ply]; if(st.t!==1)throw Error('not Future turn at '+ply);
    const row=await page.evaluate(async st=>{
      const e=window.AI_SHOGI_YANEURAOU_FUTURE;
      const sq=i=>String(9-(i%9))+String.fromCharCode(97+Math.floor(i/9));
      const tok=m=>!m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'');
      const budget=e.budget(st),cur=await e.bestMove(st),ref=await e.bestMove(st,{ms:20000,multiPV:1});
      return{budget,sfen:e.toSFEN(st),cur:{move:tok(cur?.move),cp:cur?.info?.cp??null,mate:cur?.info?.mate??null,depth:cur?.info?.depth||0,nodes:cur?.info?.nodes||0,ms:cur?.info?.ms||0,pv:cur?.info?.pv||[]},ref:{move:tok(ref?.move),cp:ref?.info?.cp??null,mate:ref?.info?.mate??null,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,ms:ref?.info?.ms||0,pv:ref?.info?.pv||[]}};
    },st);
    row.ply=ply;row.actual=MOVES[ply]||'(game ended)';row.same=row.cur.move===row.ref.move;rows.push(row);console.log('GAME_POS',JSON.stringify(row));
  }
  await browser.close();
  const changed=rows.filter(r=>!r.same),actualVsRef=rows.filter(r=>r.actual!==r.ref.move);
  console.log('GAME_POSITION_SUMMARY',JSON.stringify({checked:rows.length,currentVs20sChanged:changed.map(r=>({ply:r.ply,actual:r.actual,current:r.cur.move,ref:r.ref.move,curCp:r.cur.cp,refCp:r.ref.cp})),actualVs20s:actualVsRef.map(r=>({ply:r.ply,actual:r.actual,ref:r.ref.move,refCp:r.ref.cp}))}));
  if(!rows.every(r=>r.cur.move&&r.ref.move))throw Error('missing bestmove');
  console.log('PASS diagnostic completed: actual Piyo-game positions audited against 20s reference');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});