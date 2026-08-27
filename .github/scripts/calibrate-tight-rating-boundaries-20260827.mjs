import { webkit } from 'playwright';

const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
function sfen(ms){const b=new Map(),h={b:{},w:{}};let rr=0;for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(c>='1'&&c<='9'){f-=Number(c);continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}

const SEEDS=['7g7f','2g2f','5g5f','9g9f','6g6f','1g1f','3g3f','4g4f'];
const GEN_PLIES=12,GEN_MS=700,GEN_MULTIPV=4,GEN_MAX_LOSS=28;
const START_ARB_MS=1200,START_MAX_ABS_CP=150,MAX_STARTS=3;
const MATCH_PLIES=8,FINAL_ARB_MS=1000,MATE_CP=10000,MAX_GAP=80,MAX_UPPER_RATING=2250;
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));

async function future(s,ms=FINAL_ARB_MS,multiPV=1){return page.evaluate(async({s,ms,multiPV})=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms,multiPV,adaptive:false}),{s,ms,multiPV})}
async function think(s,i){return page.evaluate(async({s,i})=>{const xs=[window.AI_SHOGI_YANEURAOU_TOP5,window.AI_SHOGI_YANEURAOU_COHORT7_12,window.AI_SHOGI_YANEURAOU_COHORT13_18,window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR];for(const x of xs)if(x?.enabled(i))return x.bestMove(s,i);throw new Error('missing profile '+i)},{s,i})}
async function applyUsi(s,t){return page.evaluate(({s,t})=>window.__L8Q.applyUsi(s,t),{s,t})}
async function applyMove(s,m){return page.evaluate(({s,m})=>window.__L8Q.apply(s,m),{s,m})}
async function legal(s){return page.evaluate(s=>window.__L8Q.legal(s),s)}
function candidateLoss(best,c){if(Number.isFinite(best?.cp)&&Number.isFinite(c?.cp))return Math.max(0,Number(best.cp)-Number(c.cp));return c===best?0:9999}
function orientedScore(a,turn,upperSide){const mate=a?.info?.mate;if(mate!==undefined&&mate!==null&&Number.isFinite(Number(mate))){const sideCp=Number(mate)>0?MATE_CP:-MATE_CP;return turn===upperSide?sideCp:-sideCp}const cp=Number(a?.info?.cp);if(!Number.isFinite(cp))throw new Error('arbiter score missing');return turn===upperSide?cp:-cp}

try{
  await page.goto('http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?tight='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__L8Q?.applyUsi&&window.AI_SHOGI_YANEURAOU_FUTURE&&window.AI_SHOGI_YANEURAOU_TOP5&&window.AI_SHOGI_YANEURAOU_COHORT7_12&&window.AI_SHOGI_YANEURAOU_COHORT13_18&&window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR?.version==='2.15.36',{timeout:120000});

  const profiles=await page.evaluate(()=>{const xs=[window.AI_SHOGI_YANEURAOU_TOP5,window.AI_SHOGI_YANEURAOU_COHORT7_12,window.AI_SHOGI_YANEURAOU_COHORT13_18,window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR],out=[];for(const x of xs)for(let k=0;k<x.indices.length;k++)out.push({i:Number(x.indices[k]),name:String(x.names[k]),rating:Number(x.ratings[k])});return out.sort((a,b)=>b.rating-a.rating)});
  const seen=new Set();for(const p of profiles){if(seen.has(p.i))throw new Error('duplicate profile index '+p.i);seen.add(p.i)}
  const pairs=[];for(let k=0;k<profiles.length-1;k++){const upper=profiles[k],lower=profiles[k+1],gap=upper.rating-lower.rating;if(upper.rating<=MAX_UPPER_RATING&&gap>0&&gap<=MAX_GAP)pairs.push({upper,lower,gap})}
  if(pairs.length<12)throw new Error('too few tight boundaries '+pairs.length+' '+JSON.stringify(pairs));
  console.log('TIGHT_BOUNDARY_PAIR_SET '+JSON.stringify(pairs));

  const starts=[];
  for(let si=0;si<SEEDS.length;si++){
    let s=await page.evaluate(pos=>window.__L8Q.parse(pos),sfen([SEEDS[si]])),line=[SEEDS[si]];
    for(let ply=0;ply<GEN_PLIES;ply++){
      const r=await future(s,GEN_MS,GEN_MULTIPV),cands=(r?.info?.candidates||[]).filter(x=>x?.token).sort((a,b)=>(a.rank||99)-(b.rank||99)),best=cands[0];
      if(!best?.token||best?.mate!==undefined&&best?.mate!==null)break;
      const safe=cands.filter(c=>candidateLoss(best,c)<=GEN_MAX_LOSS),choice=safe.length?safe[(si+ply)%safe.length]:best;
      s=await applyUsi(s,choice.token);line.push(choice.token);
    }
    const a=await future(s,START_ARB_MS,1),mate=a?.info?.mate,cp=Number(a?.info?.cp),ok=(mate===undefined||mate===null)&&Number.isFinite(cp)&&Math.abs(cp)<=START_MAX_ABS_CP;
    console.log('TIGHT_BALANCED_START '+JSON.stringify({seed:SEEDS[si],line,cp:Number.isFinite(cp)?cp:null,mate:mate??null,accepted:ok}));
    if(ok&&starts.length<MAX_STARTS)starts.push({label:'balanced-'+SEEDS[si],state:s,startCp:cp,line});
  }
  if(starts.length<MAX_STARTS)throw new Error('not enough balanced starts '+starts.length);

  const summaries=[];
  for(const pair of pairs){
    const games=[];
    for(const start of starts){
      for(const upperMovesFirst of[true,false]){
        let s=JSON.parse(JSON.stringify(start.state)),initialSide=Number(s.t),upperSide=upperMovesFirst?initialSide:-initialSide,seq=[],terminal=null;
        for(let ply=0;ply<MATCH_PLIES;ply++){
          const lm=await legal(s);if(!lm.length){const checked=await page.evaluate(s=>window.__L8Q.incheck(s),s),turn=Number(s.t);terminal={upperCp:checked?(turn===upperSide?-MATE_CP:MATE_CP):0,kind:checked?'checkmate':'no-legal'};break}
          const mover=Number(s.t)===upperSide?pair.upper:pair.lower,res=await think(s,mover.i);
          if(res?.resign){terminal={upperCp:mover.i===pair.upper.i?-MATE_CP:MATE_CP,kind:'resign'};break}
          if(res?.declareWin){terminal={upperCp:mover.i===pair.upper.i?MATE_CP:-MATE_CP,kind:'declareWin'};break}
          if(!res?.move)throw new Error('missing move '+pair.upper.name+'/'+pair.lower.name+' '+start.label+' ply '+ply);
          const token=await page.evaluate(m=>window.__L8Q.usi(m),res.move);if(!lm.includes(token))throw new Error('illegal '+mover.name+' '+token);
          seq.push({mover:mover.name,rating:mover.rating,token,selectedRank:Number(res?.info?.selectedRank||1),cpLoss:Number(res?.info?.cpLoss||0),targetMs:Number(res?.targetMs||0)});
          s=await applyMove(s,res.move);
        }
        let upperCp,kind;
        if(terminal){upperCp=terminal.upperCp;kind=terminal.kind}else{const a=await future(s,FINAL_ARB_MS,1),turn=Number(s.t);upperCp=orientedScore(a,turn,upperSide);kind=a?.info?.mate!==undefined&&a?.info?.mate!==null?'mate':'cp'}
        const upperLoss=seq.filter(x=>x.mover===pair.upper.name).map(x=>x.cpLoss),lowerLoss=seq.filter(x=>x.mover===pair.lower.name).map(x=>x.cpLoss);
        const row={start:start.label,upperMovesFirst,plies:seq.length,upperCp,kind,upperMeanMoveLoss:mean(upperLoss),lowerMeanMoveLoss:mean(lowerLoss)};
        games.push({...row,sequence:seq});console.log('TIGHT_BOUNDARY_GAME '+JSON.stringify({pair:pair.upper.rating+'-'+pair.lower.rating,...row}));
      }
    }
    const paired=starts.map(s=>{const gs=games.filter(g=>g.start===s.label),a=gs.find(g=>g.upperMovesFirst),b=gs.find(g=>!g.upperMovesFirst);return{start:s.label,upperFirstCp:a?.upperCp??null,lowerFirstCp:b?.upperCp??null,pairedUpperCp:Math.round(((a?.upperCp||0)+(b?.upperCp||0))/2)}});
    const upperLosses=games.flatMap(g=>g.sequence.filter(x=>x.mover===pair.upper.name).map(x=>x.cpLoss)),lowerLosses=games.flatMap(g=>g.sequence.filter(x=>x.mover===pair.lower.name).map(x=>x.cpLoss));
    const upperMeanMoveLoss=mean(upperLosses),lowerMeanMoveLoss=mean(lowerLosses),moveLossAdvantage=lowerMeanMoveLoss-upperMeanMoveLoss,meanPairedUpperCp=mean(paired.map(x=>x.pairedUpperCp));
    let verdict='overlapping-no-clear-separation';if(moveLossAdvantage>=5&&meanPairedUpperCp>=-30)verdict='supports-upper-rating';else if(moveLossAdvantage<=-8&&meanPairedUpperCp<=-30)verdict='possible-systematic-inversion';else if(moveLossAdvantage<=-5||meanPairedUpperCp<=-60)verdict='watch-mixed-signal';
    const summary={upper:pair.upper,lower:pair.lower,gap:pair.gap,games:games.length,upperMeanMoveLoss,lowerMeanMoveLoss,moveLossAdvantage,meanPairedUpperCp,paired,verdict};summaries.push(summary);console.log('TIGHT_BOUNDARY_SUMMARY '+JSON.stringify(summary));
  }

  const inversions=summaries.filter(x=>x.verdict==='possible-systematic-inversion'),watch=summaries.filter(x=>x.verdict==='watch-mixed-signal');
  const final={pairs:summaries.length,starts:starts.length,matchPlies:MATCH_PLIES,inversions:inversions.map(x=>({upper:x.upper,lower:x.lower,moveLossAdvantage:x.moveLossAdvantage,meanPairedUpperCp:x.meanPairedUpperCp})),watch:watch.map(x=>({upper:x.upper,lower:x.lower,moveLossAdvantage:x.moveLossAdvantage,meanPairedUpperCp:x.meanPairedUpperCp})),pageErrors};
  console.log('TIGHT_RATING_BOUNDARIES_FINAL '+JSON.stringify(final));
  if(pageErrors.length)throw new Error('page errors '+pageErrors.join(' | '));
  console.log('PASS_TIGHT_RATING_BOUNDARIES_DIAGNOSTIC');
}finally{await browser.close()}
