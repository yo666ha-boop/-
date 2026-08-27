import { webkit } from 'playwright';

const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL',MATE_CP=10000;
function sfen(ms){const b=new Map(),h={b:{},w:{}};let rr=0;for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(c>='1'&&c<='9'){f-=Number(c);continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}

const STARTS=[
  {label:'b7g7f',cp:-68,line:['7g7f','8c8d','8h7g','7a7b','7i6h','3c3d','6i7h','9c9d','2g2f','2b7g+','6h7g','3a4b','3g3f']},
  {label:'b2g2f',cp:-101,line:['2g2f','1c1d','2f2e','4a3b','7g7f','7a6b','3i3h','8c8d','3g3f','6a5b','5i6h','3c3d','6i7h']},
  {label:'b5g5f',cp:63,line:['5g5f','7a7b','6i7h','4a3b','4i5h','8c8d','3i4h','3c3d','2g2f','8d8e','5i6i','7c7d','7i6h']},
  {label:'b9g9f',cp:-71,line:['9g9f','4a3b','6i7h','4c4d','4g4f','3a4b','7i6h','8c8d','7g7f','4b4c','5i6i','7a6b','6i7i']},
  {label:'b6g6f',cp:30,line:['6g6f','5a4b','7i7h','3a3b','3i4h','6c6d','5g5f','7a6b','4h5g','6b6c','2g2f','6a5b','4i5h']},
  {label:'b1g1f',cp:80,line:['1g1f','8c8d','2g2f','3c3d','6i7h','4a3b','5i6h','3a4b','3i3h','8d8e','7g7f','4b3c','4g4f']}
];
const PAIRS=[
  {upper:{i:8,name:'直江兼続',rating:1700},lower:{i:13,name:'ユリア',rating:1680}},
  {upper:{i:6,name:'ジャギ',rating:1450},lower:{i:14,name:'玉ちゃん',rating:1380}}
];
const MATCH_PLIES=14,FINAL_ARB_MS=1500;
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
async function future(s){return page.evaluate(async({s,ms})=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms,multiPV:1,adaptive:false}),{s,ms:FINAL_ARB_MS})}
async function think(s,i){return page.evaluate(async({s,i})=>window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR.bestMove(s,i),{s,i})}
async function applyMove(s,m){return page.evaluate(({s,m})=>window.__L8Q.apply(s,m),{s,m})}
async function legal(s){return page.evaluate(s=>window.__L8Q.legal(s),s)}
function orientedScore(a,turn,upperSide){const mate=a?.info?.mate;if(mate!==undefined&&mate!==null&&Number.isFinite(Number(mate))){const sideCp=Number(mate)>0?MATE_CP:-MATE_CP;return turn===upperSide?sideCp:-sideCp}const cp=Number(a?.info?.cp);if(!Number.isFinite(cp))throw new Error('arbiter score missing');return turn===upperSide?cp:-cp}

try{
  await page.goto('http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?watchdeep='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__L8Q?.apply&&window.AI_SHOGI_YANEURAOU_FUTURE&&window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR?.version==='2.15.36',{timeout:120000});
  const identity=await page.evaluate(()=>{const x=window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR;return x.indices.map((i,k)=>({i:Number(i),name:String(x.names[k]),rating:Number(x.ratings[k])}))});
  for(const pair of PAIRS)for(const p of[pair.upper,pair.lower]){const got=identity.find(x=>x.i===p.i);if(!got||got.name!==p.name||got.rating!==p.rating)throw new Error('identity mismatch '+JSON.stringify({want:p,got}))}
  const parsed=[];for(const x of STARTS)parsed.push({...x,state:await page.evaluate(pos=>window.__L8Q.parse(pos),sfen(x.line))});
  const finals=[];
  for(const pair of PAIRS){
    const games=[];
    for(const start of parsed){
      for(const upperMovesFirst of[true,false]){
        let s=JSON.parse(JSON.stringify(start.state)),initialSide=Number(s.t),upperSide=upperMovesFirst?initialSide:-initialSide,seq=[],terminal=null;
        for(let ply=0;ply<MATCH_PLIES;ply++){
          const lm=await legal(s);if(!lm.length){const checked=await page.evaluate(s=>window.__L8Q.incheck(s),s),turn=Number(s.t);terminal={upperCp:checked?(turn===upperSide?-MATE_CP:MATE_CP):0,kind:checked?'checkmate':'no-legal'};break}
          const mover=Number(s.t)===upperSide?pair.upper:pair.lower,res=await think(s,mover.i);
          if(res?.resign){terminal={upperCp:mover.i===pair.upper.i?-MATE_CP:MATE_CP,kind:'resign'};break}
          if(res?.declareWin){terminal={upperCp:mover.i===pair.upper.i?MATE_CP:-MATE_CP,kind:'declareWin'};break}
          if(!res?.move)throw new Error('missing move '+pair.upper.name+'/'+pair.lower.name+' '+start.label+' '+ply);
          const token=await page.evaluate(m=>window.__L8Q.usi(m),res.move);if(!lm.includes(token))throw new Error('illegal '+mover.name+' '+token);
          seq.push({mover:mover.name,token,cpLoss:Number(res?.info?.cpLoss||0),selectedRank:Number(res?.info?.selectedRank||1),targetMs:Number(res?.targetMs||0)});s=await applyMove(s,res.move);
        }
        let upperCp,kind;if(terminal){upperCp=terminal.upperCp;kind=terminal.kind}else{const a=await future(s),turn=Number(s.t);upperCp=orientedScore(a,turn,upperSide);kind=a?.info?.mate!==undefined&&a?.info?.mate!==null?'mate':'cp'}
        const row={start:start.label,startCp:start.cp,upperMovesFirst,plies:seq.length,upperCp,kind,upperMeanMoveLoss:mean(seq.filter(x=>x.mover===pair.upper.name).map(x=>x.cpLoss)),lowerMeanMoveLoss:mean(seq.filter(x=>x.mover===pair.lower.name).map(x=>x.cpLoss)),sequence:seq};games.push(row);console.log('WATCH_DEEP_GAME '+JSON.stringify({pair:pair.upper.rating+'-'+pair.lower.rating,...row,sequence:undefined}));
      }
    }
    const paired=parsed.map(s=>{const gs=games.filter(g=>g.start===s.label),a=gs.find(g=>g.upperMovesFirst),b=gs.find(g=>!g.upperMovesFirst);return{start:s.label,upperFirstCp:a?.upperCp??null,lowerFirstCp:b?.upperCp??null,pairedUpperCp:Math.round(((a?.upperCp||0)+(b?.upperCp||0))/2)}});
    const upperLosses=games.flatMap(g=>g.sequence.filter(x=>x.mover===pair.upper.name).map(x=>x.cpLoss)),lowerLosses=games.flatMap(g=>g.sequence.filter(x=>x.mover===pair.lower.name).map(x=>x.cpLoss));
    const upperMeanMoveLoss=mean(upperLosses),lowerMeanMoveLoss=mean(lowerLosses),moveLossAdvantage=lowerMeanMoveLoss-upperMeanMoveLoss,meanPairedUpperCp=mean(paired.map(x=>x.pairedUpperCp));
    let verdict='overlapping-no-clear-separation';if(moveLossAdvantage>=5&&meanPairedUpperCp>=-30)verdict='supports-upper-rating';else if(moveLossAdvantage<=-8&&meanPairedUpperCp<=-30)verdict='possible-systematic-inversion';else if(moveLossAdvantage<=-5||meanPairedUpperCp<=-60)verdict='watch-mixed-signal';
    const out={upper:pair.upper,lower:pair.lower,games:games.length,matchPlies:MATCH_PLIES,upperMeanMoveLoss,lowerMeanMoveLoss,moveLossAdvantage,meanPairedUpperCp,paired,verdict};finals.push(out);console.log('WATCH_DEEP_SUMMARY '+JSON.stringify(out));
  }
  const inversions=finals.filter(x=>x.verdict==='possible-systematic-inversion');console.log('WATCH_DEEP_FINAL '+JSON.stringify({pairs:finals.length,inversions:inversions.map(x=>({upper:x.upper,lower:x.lower,moveLossAdvantage:x.moveLossAdvantage,meanPairedUpperCp:x.meanPairedUpperCp})),results:finals,pageErrors}));
  if(pageErrors.length)throw new Error('page errors '+pageErrors.join(' | '));
  console.log('PASS_WATCH_RATING_BOUNDARIES_DEEP_DIAGNOSTIC');
}finally{await browser.close()}
