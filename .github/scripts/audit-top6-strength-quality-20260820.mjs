import { webkit } from 'playwright';

const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const LONG=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h 2h1i+ 4g4f 1i2i 3h3i 2i2h 3i3h 2h2g 4h3i N*2f 5h4h 8h8i 4h5g L*4g 5g4g 8i6g 6i5h 7e7i L*5i 2f3h+`.split(/\s+/);
function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}
const late=sfen(LONG.slice(0,53)).replace(/\s+\d+$/,' 56');
const cases=[
  {label:'open-7g7f',phase:'opening',pos:sfen(['7g7f']),refNodes:4500000},
  {label:'open-2g2f',phase:'opening',pos:sfen(['2g2f']),refNodes:4500000},
  {label:'mid-12',phase:'middlegame',pos:sfen(LONG.slice(0,11)),refNodes:5500000},
  {label:'mid-20',phase:'middlegame',pos:sfen(LONG.slice(0,19)),refNodes:5500000},
  {label:'mid-28',phase:'middlegame',pos:sfen(LONG.slice(0,27)),refNodes:5500000},
  {label:'mid-34',phase:'middlegame',pos:sfen(LONG.slice(0,33)),refNodes:5500000},
  {label:'late-53-endgame-profile',phase:'endgame',pos:late,refNodes:5500000},
  {label:'mate-in-1',phase:'mate',pos:'k8/9/9/9/9/9/9/5r3/4K4 w g 60',refNodes:1500000}
];
for(const c of cases)if(c.pos.split(/\s+/)[1]!=='w')throw Error('expected Gote turn '+c.label+' '+c.pos);
const chars=[
  {idx:25,name:'未来からやってきたみつき',rating:3400},
  {idx:0,name:'みつき',rating:3000},
  {idx:1,name:'みっちゃん',rating:2850},
  {idx:2,name:'あき王',rating:2700},
  {idx:3,name:'おにまま',rating:2600},
  {idx:4,name:'まま',rating:2500}
];
const browser=await webkit.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:4221/shogi-v21528/index.html?top6='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE&&!!window.AI_SHOGI_GAME_SAVE&&document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForTimeout(1000);

  async function deepRef(pos,nodes){
    return page.evaluate(async({pos,nodes})=>new Promise((resolve,reject)=>{
      const w=new Worker('/shogi-v21528/future-yaneura-worker21528.js?top6ref='+Date.now()+Math.random());let id=0,P=new Map(),stages=[];
      w.onmessage=e=>{const m=e.data||{};if(m.type==='stage'){stages.push(m.text);return}const q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};
      w.onerror=e=>reject(Error(e.message||'worker'));
      const call=(type,x={},timeout=150000)=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>{P.delete(n);j(Error(type+' timeout '+stages.slice(-8).join(' | ')))},timeout);P.set(n,{r,j,t});w.postMessage({type,id:n,...x})});
      (async()=>{try{await call('init',{},120000);const started=Date.now(),r=await call('bestmove',{sfen:pos,ms:4000,nodes,multiPV:5,adaptive:false},150000);resolve({...r,elapsed:Date.now()-started})}catch(e){reject(e)}finally{w.terminate()}})();
    }),{pos,nodes});
  }

  const metrics=Object.fromEntries(chars.map(c=>[c.idx,{...c,tests:0,exact:0,top5:0,outsideTop5:0,mateExact:0,knownLoss:[],elapsed:[]}]))
  for(let ciCase=0;ciCase<cases.length;ciCase++){
    const c=cases[ciCase],ref=await deepRef(c.pos,c.refNodes),refCandidates=(ref.candidates||[]).slice().sort((a,b)=>(a.rank||99)-(b.rank||99)).map(x=>({rank:x.rank,token:x.token,cp:x.cp,mate:x.mate,depth:x.depth,nodes:x.nodes}));
    const refBest=refCandidates.find(x=>x.rank===1)||{token:ref.token,cp:ref.info?.cp,mate:ref.info?.mate,rank:1};
    if(!refBest.token)throw Error('no reference '+c.label);
    console.log('TOP6_REF '+JSON.stringify({label:c.label,phase:c.phase,moveNo:Number(c.pos.split(/\s+/).at(-1)),best:refBest.token,candidates:refCandidates,elapsed:ref.elapsed}));
    const order=ciCase%2===0?chars.map(x=>x.idx):chars.map(x=>x.idx).reverse();
    const actual=await page.evaluate(async({pos,order})=>{
      const top=window.AI_SHOGI_YANEURAOU_TOP5,fut=window.AI_SHOGI_YANEURAOU_FUTURE,save=window.AI_SHOGI_GAME_SAVE;
      const letters='abcdefghi',pieceKeys=['R','B','G','S','N','L','P'];
      function parseState(fen){
        const [board,turn,hands,moveNoRaw]=fen.trim().split(/\s+/),moveNo=Math.max(1,Number(moveNoRaw)||1),s=JSON.parse(JSON.stringify(save.snapshot().st));
        s.b=Array(81).fill(null);let y=0;
        for(const row of board.split('/')){let x=0,prom=false;for(const ch of row){if(ch==='+'){prom=true;continue}if(/\d/.test(ch)){x+=Number(ch);continue}const upper=ch.toUpperCase();s.b[y*9+x]={k:(prom?'+':'')+upper,o:ch===upper?1:-1};prom=false;x++}if(x!==9)throw Error('bad row '+row);y++}
        s.h={'1':{},'-1':{}};for(const side of['1','-1'])for(const k of pieceKeys)s.h[side][k]=0;
        if(hands!=='-'){let n='';for(const ch of hands){if(/\d/.test(ch)){n+=ch;continue}const count=n?Number(n):1;n='';const side=ch===ch.toUpperCase()?'1':'-1';s.h[side][ch.toUpperCase()]=(s.h[side][ch.toUpperCase()]||0)+count}}
        s.t=turn==='b'?1:-1;s.log=Array(Math.max(0,moveNo-1)).fill(0).map((_,i)=>({audit:true,ply:i+1}));
        return s;
      }
      function u(m){if(!m)return'';const sq=i=>String(9-(i%9))+letters[Math.floor(i/9)];return m.drop?String(m.drop)+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}
      const rows=[];
      for(const idx of order){const s=parseState(pos),started=performance.now();let r;if(idx===25)r=await fut.bestMove(s);else r=await top.bestMove(s,idx);rows.push({idx,token:u(r.move),resign:!!r.resign,declareWin:!!r.declareWin,elapsed:Math.round(performance.now()-started),info:{depth:r.info?.depth,nodes:r.info?.nodes,cp:r.info?.cp,mate:r.info?.mate,selectedRank:r.info?.selectedRank,cpLoss:r.info?.cpLoss,personality:r.info?.personality,openingBias:r.info?.openingBias,adaptive:r.info?.adaptive,reranked:r.info?.reranked,targetMs:r.targetMs||r.info?.ms,threads:r.info?.threads,hashMB:r.info?.hashMB}})}
      return rows;
    },{pos:c.pos,order});
    for(const row of actual){
      const meta=chars.find(x=>x.idx===row.idx),refHit=refCandidates.find(x=>x.token===row.token),exact=row.token===refBest.token,top5=!!refHit,loss=Number.isFinite(refBest.cp)&&Number.isFinite(refHit?.cp)?Math.max(0,refBest.cp-refHit.cp):null,m=metrics[row.idx];
      m.tests++;m.exact+=exact?1:0;m.top5+=top5?1:0;m.outsideTop5+=top5?0:1;m.mateExact+=(c.phase==='mate'&&exact)?1:0;if(loss!==null)m.knownLoss.push(loss);m.elapsed.push(row.elapsed);
      console.log('TOP6_ROW '+JSON.stringify({label:c.label,phase:c.phase,index:row.idx,name:meta.name,rating:meta.rating,token:row.token,refBest:refBest.token,exact,top5,refRank:refHit?.rank||0,lossCp:loss,elapsed:row.elapsed,info:row.info}));
    }
  }
  const summary=chars.map(c=>{const m=metrics[c.idx],mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;return{index:c.idx,name:c.name,rating:c.rating,tests:m.tests,exact:m.exact,top5:m.top5,outsideTop5:m.outsideTop5,mateExact:m.mateExact,meanKnownLossCp:mean(m.knownLoss),knownLossN:m.knownLoss.length,meanElapsed:mean(m.elapsed),qualityScore:m.exact*2+m.top5}});
  const by=Object.fromEntries(summary.map(x=>[x.index,x])),fail=[];
  for(const x of summary){if(x.tests!==cases.length)fail.push('tests '+x.name+' '+x.tests);if(x.mateExact!==1)fail.push('mate '+x.name+' '+x.mateExact)}
  if(by[25].top5<6)fail.push('Future Top5 too low '+by[25].top5);
  if(by[0].top5<6)fail.push('Mitsuki Top5 too low '+by[0].top5);
  if(by[25].qualityScore+2<by[0].qualityScore)fail.push('Future materially below Mitsuki '+by[25].qualityScore+'<'+by[0].qualityScore);
  if(by[0].qualityScore+2<by[4].qualityScore)fail.push('Mitsuki materially below Mama '+by[0].qualityScore+'<'+by[4].qualityScore);
  if(pageErrors.length)fail.push('pageErrors '+pageErrors.join(' | '));
  console.log('TOP6_SUMMARY '+JSON.stringify({cases:cases.map(x=>({label:x.label,phase:x.phase,moveNo:Number(x.pos.split(/\s+/).at(-1))})),summary,fail}));
  if(fail.length)throw Error(fail.join(' | '));
  console.log('PASS_TOP6_STRENGTH_QUALITY '+JSON.stringify({summary,order:'Future > Mitsuki > Micchan > Aki-oh > Oni-mama > Mama',pageErrors}));
}finally{await browser.close()}
