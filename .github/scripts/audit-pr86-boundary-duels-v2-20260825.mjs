import { webkit } from 'playwright';
const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const LONG=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h 2h1i+ 4g4f 1i2i 3h3i 2i2h 3i3h 2h2g 4h3i N*2f 5h4h 8h8i 4h5g L*4g 5g4g 8i6g 6i5h 7e7i L*5i 2f3h+`.split(/\s+/);
function sfen(ms){const b=new Map(),h={b:{},w:{}};let rr=0;for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(c>='1'&&c<='9'){f-=Number(c);continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}
const starts=[{label:'mid12',pos:sfen(LONG.slice(0,11))},{label:'mid28',pos:sfen(LONG.slice(0,27))}];
const pairs=[
 {label:'future-3400-3000',hi:25,hr:3400,lo:0,lr:3000,tol:0,futureMetric:true,refMs:5000},
 {label:'top-3000-2850',hi:0,hr:3000,lo:1,lr:2850,tol:6,refMs:1800},
 {label:'2500-2400',hi:4,hr:2500,lo:24,lr:2400,tol:6,refMs:1800},
 {label:'2000-1950',hi:19,hr:2000,lo:15,lr:1950,tol:5,refMs:1800},
 {label:'1750-1700',hi:11,hr:1750,lo:8,lr:1700,tol:4,refMs:1800},
 {label:'bottom-1380-1250',hi:14,hr:1380,lo:16,lr:1250,tol:7,refMs:1800}
];
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
const score=z=>z.exact*2+z.top5,mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
function refLoss(best,hit){if(!hit)return null;if(Number.isFinite(best?.cp)&&Number.isFinite(hit?.cp))return Math.max(0,best.cp-hit.cp);if(Number.isFinite(best?.mate)){if(best.mate>0){if(Number.isFinite(hit?.mate)&&hit.mate>0)return Math.max(0,hit.mate-best.mate)*10;return 10000}if(best.mate<0&&Number.isFinite(hit?.mate)&&hit.mate<0)return Math.max(0,Math.abs(best.mate)-Math.abs(hit.mate))*10}return hit.token===best.token?0:null}
try{
 await page.goto('http://127.0.0.1:4239/shogi-v21528/index-boundary-duel-pr86-v2.html?x='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__A26D&&window.AI_SHOGI_YANEURAOU_FUTURE?.strengthTune==='fullsearch-20260825'&&window.AI_SHOGI_YANEURAOU_TOP5&&window.AI_SHOGI_YANEURAOU_COHORT7_12&&window.AI_SHOGI_YANEURAOU_COHORT13_18&&window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR?.version==='2.15.36',{timeout:120000});
 await page.evaluate(()=>window.AI_SHOGI_YANEURAOU_FUTURE.init());
 const meta=await page.evaluate(()=>{const f=AI_SHOGI_YANEURAOU_FUTURE,mods=[AI_SHOGI_YANEURAOU_TOP5,AI_SHOGI_YANEURAOU_COHORT7_12,AI_SHOGI_YANEURAOU_COHORT13_18,AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR],o={25:{name:f.name,rating:Number(f.rating)}};for(const m of mods)for(let k=0;k<(m.indices||[]).length;k++)o[m.indices[k]]={name:m.names[k],rating:Number(m.ratings[k])};return o});
 const api=await page.evaluate(()=>({top:[...AI_SHOGI_YANEURAOU_TOP5.indices],c7:[...AI_SHOGI_YANEURAOU_COHORT7_12.indices],c13:[...AI_SHOGI_YANEURAOU_COHORT13_18.indices],lo:[...AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR.indices]}));
 const apiOf=i=>i===25?'future':api.top.includes(i)?'top':api.c7.includes(i)?'c7':api.c13.includes(i)?'c13':'lo';
 for(const p of pairs)if(Number(meta[p.hi]?.rating)!==p.hr||Number(meta[p.lo]?.rating)!==p.lr)throw Error('pair meta '+p.label+' '+JSON.stringify({hi:meta[p.hi],lo:meta[p.lo]}));
 const all=[];
 for(const p of pairs)for(const start of starts)for(const flip of[0,1]){
   let st=await page.evaluate(pos=>__A26D.parse(pos),start.pos);const side0=await page.evaluate(s=>__A26D.turn(s),st),whoForTurn=t=>flip?(t===side0?p.lo:p.hi):(t===side0?p.hi:p.lo);
   const fresh=()=>({moves:0,exact:0,top5:0,outside:0,internal:[],refLoss:[]});const z={pair:p.label,start:start.label,flip,hi:fresh(),lo:fresh(),plies:0,ended:false};
   for(let ply=0;ply<6;ply++){
     if((await page.evaluate(s=>__A26D.ended(s),st)).ended){z.ended=true;break}
     const turn=await page.evaluate(s=>__A26D.turn(s),st),who=whoForTurn(turn),key=who===p.hi?'hi':'lo',kind=apiOf(who);
     const ref=await page.evaluate(async({s,ms})=>AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms,multiPV:5,adaptive:false}),{s:st,ms:p.refMs}),rc=(ref?.info?.candidates||[]).filter(x=>x?.token).sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,5),best=rc[0];if(!best?.token)throw Error('no ref '+p.label);
     const res=await page.evaluate(async({s,i,k})=>k==='future'?AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms:4000,multiPV:1,adaptive:false}):k==='top'?AI_SHOGI_YANEURAOU_TOP5.bestMove(s,i):k==='c7'?AI_SHOGI_YANEURAOU_COHORT7_12.bestMove(s,i):k==='c13'?AI_SHOGI_YANEURAOU_COHORT13_18.bestMove(s,i):AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR.bestMove(s,i),{s:st,i:who,k:kind});
     const u=res?.move?await page.evaluate(m=>__A26D.usi(m),res.move):String(res?.info?.bestmove||'');if(!u)throw Error('no move '+who);const hit=rc.find(x=>x.token===u),rl=refLoss(best,hit),a=z[key];a.moves++;a.exact+=u===best.token?1:0;a.top5+=hit?1:0;a.outside+=hit?0:1;a.internal.push(Number(res?.info?.cpLoss||0));if(rl!=null)a.refLoss.push(rl);z.plies++;
     console.log('PR86_BDV2_ROW '+JSON.stringify({pair:p.label,start:start.label,flip,ply:ply+1,who,name:meta[who]?.name,rating:meta[who]?.rating,token:u,exact:u===best.token,top5:!!hit,refRank:hit?.rank||0,refLoss:rl,selectedRank:res?.info?.selectedRank||1,internalLoss:res?.info?.cpLoss||0,refBest:{token:best.token,cp:best.cp,mate:best.mate}}));st=await page.evaluate(({s,u})=>__A26D.applyToken(s,u),{s:st,u});
   }
   all.push(z);
 }
 const byPair=pairs.map(p=>{const games=all.filter(x=>x.pair===p.label),sum=k=>games.reduce((a,g)=>({moves:a.moves+g[k].moves,exact:a.exact+g[k].exact,top5:a.top5+g[k].top5,outside:a.outside+g[k].outside,internal:a.internal.concat(g[k].internal),refLoss:a.refLoss.concat(g[k].refLoss)}),{moves:0,exact:0,top5:0,outside:0,internal:[],refLoss:[]}),h=sum('hi'),l=sum('lo');return{pair:p.label,futureMetric:!!p.futureMetric,tol:p.tol,hi:{index:p.hi,name:meta[p.hi]?.name,rating:p.hr,...h,meanInternal:mean(h.internal),meanRefLoss:mean(h.refLoss),quality:score(h)},lo:{index:p.lo,name:meta[p.lo]?.name,rating:p.lr,...l,meanInternal:mean(l.internal),meanRefLoss:mean(l.refLoss),quality:score(l)}}});
 const fail=[];for(const x of byPair){if(x.hi.moves<8||x.lo.moves<8)fail.push('too few '+x.pair);if(x.futureMetric){if(x.hi.top5<x.hi.moves-1)fail.push('Future outside deep top5 '+x.hi.top5+'/'+x.hi.moves);if(x.hi.outside>x.lo.outside+1)fail.push('Future outside worse '+x.hi.outside+'>'+x.lo.outside);if(x.hi.meanRefLoss>x.lo.meanRefLoss+15)fail.push('Future ref loss '+x.hi.meanRefLoss+'>'+x.lo.meanRefLoss+'+15')}else{if(x.lo.quality>x.hi.quality+x.tol)fail.push('boundary inversion '+x.pair+' lower '+x.lo.quality+' > upper '+x.hi.quality+' + '+x.tol);if(x.hi.outside>x.hi.moves*.7)fail.push('upper too weak '+x.pair)}}if(errors.length)fail.push('page '+errors.join('|'));
 console.log('PR86_BOUNDARY_V2_SUMMARY '+JSON.stringify({byPair,fail,errors}));if(fail.length)throw Error(fail.join(' | '));console.log('PASS_PR86_BOUNDARY_V2_DEEP_LOSS_AUDIT '+JSON.stringify({byPair}));
}finally{await browser.close()}
