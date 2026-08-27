import { webkit } from 'playwright';

const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
function sfen(ms){const b=new Map(),h={b:{},w:{}};let rr=0;for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(c>='1'&&c<='9'){f-=Number(c);continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}

const starts=[
  {label:'open-7g7f',pos:sfen(['7g7f'])},
  {label:'open-2g2f',pos:sfen(['2g2f'])},
];
const boundaries=[
  {label:'R3400-R3000',upper:{i:25,name:'未来からやってきたみつき',rating:3400},lower:{i:0,name:'みつき',rating:3000}},
  {label:'R2500-R2400',upper:{i:4,name:'まま',rating:2500},lower:{i:24,name:'カヲル',rating:2400}},
  {label:'R2000-R1950',upper:{i:19,name:'シン',rating:2000},lower:{i:15,name:'まり',rating:1950}},
  {label:'R1750-R1700',upper:{i:11,name:'伊達政宗',rating:1750},lower:{i:8,name:'直江兼続',rating:1700}},
];
const PLIES=10,ARBITER_MS=2200,MATE_CP=5000,START_MAX_ABS_CP=250;
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));

async function profileMeta(i){return page.evaluate(i=>{const mods=[window.AI_SHOGI_YANEURAOU_TOP5,window.AI_SHOGI_YANEURAOU_COHORT7_12,window.AI_SHOGI_YANEURAOU_COHORT13_18,window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR];if(i===25){const f=window.AI_SHOGI_YANEURAOU_FUTURE;return{name:f?.name||'',rating:Number(f?.rating||3400),api:'future'}}for(const m of mods){if(!m?.enabled?.(i))continue;const k=Array.isArray(m.indices)?m.indices.indexOf(i):-1;return{name:k>=0&&Array.isArray(m.names)?m.names[k]:'',rating:k>=0&&Array.isArray(m.ratings)?Number(m.ratings[k]||0):0,api:m===mods[0]?'top5':m===mods[1]?'7-12':m===mods[2]?'13-18':'19-26'}}return null},i)}
async function think(s,i){return page.evaluate(async({s,i})=>{if(i===25)return window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms:4000,multiPV:1,adaptive:false});const top=window.AI_SHOGI_YANEURAOU_TOP5,c7=window.AI_SHOGI_YANEURAOU_COHORT7_12,c13=window.AI_SHOGI_YANEURAOU_COHORT13_18,lo=window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR;if(top?.enabled(i))return top.bestMove(s,i);if(c7?.enabled(i))return c7.bestMove(s,i);if(c13?.enabled(i))return c13.bestMove(s,i);if(lo?.enabled(i))return lo.bestMove(s,i);throw new Error('no profile '+i)},{s,i})}
async function arbiter(s){return page.evaluate(async({s,ms})=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms,multiPV:1,adaptive:false}),{s,ms:ARBITER_MS})}
async function terminalEval(s,upperSide){const legal=await page.evaluate(s=>window.__L8Q.legal(s),s);if(legal.length)return null;const checked=await page.evaluate(s=>window.__L8Q.incheck(s),s),turn=Number(s.t);if(!checked)return{upperCp:0,kind:'stalemate/no-legal'};return{upperCp:turn===upperSide?-MATE_CP:MATE_CP,kind:'checkmate'}}
function scoreFromArbiter(a,turn,upperSide){const mate=a?.info?.mate,cp=Number(a?.info?.cp);let sideCp=0,kind='cp';if(mate!==undefined&&mate!==null&&Number.isFinite(Number(mate))){sideCp=Number(mate)>0?MATE_CP:-MATE_CP;kind='mate'}else if(Number.isFinite(cp))sideCp=cp;else throw new Error('arbiter score missing');return{upperCp:turn===upperSide?sideCp:-sideCp,kind,arbiter:{cp:Number.isFinite(cp)?cp:null,mate:mate??null,depth:Number(a?.info?.depth||0),nodes:Number(a?.info?.nodes||0),turn}}}

try{
  await page.goto('http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?cal='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__L8Q?.apply&&window.__L8Q?.incheck&&window.AI_SHOGI_YANEURAOU_FUTURE&&window.AI_SHOGI_YANEURAOU_TOP5&&window.AI_SHOGI_YANEURAOU_COHORT7_12&&window.AI_SHOGI_YANEURAOU_COHORT13_18&&window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR?.version==='2.15.36',{timeout:120000});

  for(const b of boundaries){for(const p of[b.upper,b.lower]){const m=await profileMeta(p.i);if(!m||m.name!==p.name||m.rating!==p.rating)throw new Error('profile mismatch '+JSON.stringify({expected:p,actual:m}))}}
  for(const start of starts){const s=await page.evaluate(pos=>window.__L8Q.parse(pos),start.pos),a=await arbiter(s),mate=a?.info?.mate,cp=Number(a?.info?.cp);if(mate!==undefined&&mate!==null)throw new Error('start unexpectedly mate '+start.label);if(!Number.isFinite(cp)||Math.abs(cp)>START_MAX_ABS_CP)throw new Error('start not balanced '+start.label+' cp '+cp);console.log('CAL_START_REF '+JSON.stringify({start:start.label,cp,depth:Number(a?.info?.depth||0),nodes:Number(a?.info?.nodes||0),turn:Number(s.t)}))}

  const summaries=[];
  for(const b of boundaries){
    const games=[];
    for(const start of starts){
      for(const upperMovesFirst of[true,false]){
        let s=await page.evaluate(pos=>window.__L8Q.parse(pos),start.pos);
        const initialSide=Number(s.t),upperSide=upperMovesFirst?initialSide:-initialSide,seq=[];
        let final=null;
        for(let ply=0;ply<PLIES;ply++){
          final=await terminalEval(s,upperSide);if(final)break;
          const mover=Number(s.t)===upperSide?b.upper:b.lower,res=await think(s,mover.i),legal=await page.evaluate(s=>window.__L8Q.legal(s),s);
          if(res?.resign){final={upperCp:mover.i===b.upper.i?-MATE_CP:MATE_CP,kind:'resign'};break}
          if(res?.declareWin){final={upperCp:mover.i===b.upper.i?MATE_CP:-MATE_CP,kind:'declareWin'};break}
          if(!res?.move)throw new Error('missing move '+b.label+' '+start.label+' '+mover.name+' ply '+ply);
          const token=await page.evaluate(m=>window.__L8Q.usi(m),res.move);if(!legal.includes(token))throw new Error('illegal '+b.label+' '+mover.name+' '+token);
          seq.push({ply:ply+1,mover:mover.name,rating:mover.rating,token,selectedRank:Number(res?.info?.selectedRank||1),cpLoss:Number(res?.info?.cpLoss||0),depth:Number(res?.info?.depth||0),nodes:Number(res?.info?.nodes||0),targetMs:Number(res?.targetMs||0)});
          s=await page.evaluate(({s,m})=>window.__L8Q.apply(s,m),{s,m:res.move});
        }
        if(!final)final=await terminalEval(s,upperSide);
        if(!final){const a=await arbiter(s);final=scoreFromArbiter(a,Number(s.t),upperSide)}
        const upperLoss=seq.filter(x=>x.mover===b.upper.name).map(x=>x.cpLoss),lowerLoss=seq.filter(x=>x.mover===b.lower.name).map(x=>x.cpLoss);
        const row={boundary:b.label,upper:b.upper,lower:b.lower,start:start.label,upperMovesFirst,upperSide,plies:seq.length,sequence:seq,upperCp:final.upperCp,kind:final.kind,upperMeanMoveLoss:mean(upperLoss),lowerMeanMoveLoss:mean(lowerLoss),arbiter:final.arbiter||null};
        games.push(row);console.log('CAL_GAME '+JSON.stringify(row));
      }
    }
    const pairs=starts.map(start=>{const a=games.find(g=>g.start===start.label&&g.upperMovesFirst),z=games.find(g=>g.start===start.label&&!g.upperMovesFirst);if(!a||!z)throw new Error('missing pair '+b.label+' '+start.label);return{start:start.label,upperFirstCp:a.upperCp,lowerFirstCp:z.upperCp,pairedUpperCp:mean([a.upperCp,z.upperCp])}});
    const upperLoss=games.flatMap(g=>g.sequence.filter(x=>x.mover===b.upper.name).map(x=>x.cpLoss)),lowerLoss=games.flatMap(g=>g.sequence.filter(x=>x.mover===b.lower.name).map(x=>x.cpLoss)),pairCps=pairs.map(p=>p.pairedUpperCp);
    const summary={boundary:b.label,upper:b.upper,lower:b.lower,games:games.length,pairs,meanPairedUpperCp:mean(pairCps),upperFavoredPairs:pairCps.filter(x=>x>50).length,nearEvenPairs:pairCps.filter(x=>Math.abs(x)<=50).length,lowerFavoredPairs:pairCps.filter(x=>x<-50).length,upperMeanMoveLoss:mean(upperLoss),lowerMeanMoveLoss:mean(lowerLoss),moveLossAdvantage:mean(lowerLoss)-mean(upperLoss)};
    summaries.push(summary);console.log('CAL_BOUNDARY '+JSON.stringify(summary));
  }
  if(pageErrors.length)throw new Error('page errors '+pageErrors.join(' | '));
  console.log('RATING_MATCH_CALIBRATION_SUMMARY '+JSON.stringify({plies:PLIES,arbiterMs:ARBITER_MS,startMaxAbsCp:START_MAX_ABS_CP,summaries,pageErrors}));
  console.log('PASS_RATING_MATCH_CALIBRATION_DIAGNOSTIC');
}finally{await browser.close()}
