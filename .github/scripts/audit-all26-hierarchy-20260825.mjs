import { webkit } from 'playwright';

const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const LONG=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h 2h1i+ 4g4f 1i2i 3h3i 2i2h 3i3h 2h2g 4h3i N*2f 5h4h 8h8i 4h5g L*4g 5g4g 8i6g 6i5h 7e7i L*5i 2f3h+`.split(/\s+/);
function sfen(ms){const b=new Map(),h={b:{},w:{}};let rr=0;for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(c>='1'&&c<='9'){f-=Number(c);continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}
const late=sfen(LONG.slice(0,53)).replace(/\s+\d+$/,' 56');
const cases=[
 {label:'open-7g7f',phase:'opening',pos:sfen(['7g7f'])},
 {label:'open-2g2f',phase:'opening',pos:sfen(['2g2f'])},
 {label:'mid-12',phase:'middlegame',pos:sfen(LONG.slice(0,11))},
 {label:'mid-20',phase:'middlegame',pos:sfen(LONG.slice(0,19))},
 {label:'mid-28',phase:'middlegame',pos:sfen(LONG.slice(0,27))},
 {label:'mid-34',phase:'middlegame',pos:sfen(LONG.slice(0,33))},
 {label:'late-53',phase:'endgame',pos:late},
 {label:'mate-in-1',phase:'mate',pos:'k8/9/9/9/9/9/9/5r3/4K4 w g 60'}
];
const order=[25,0,1,2,3,4,24,23,21,5,17,19,15,12,20,18,9,11,8,13,10,7,22,6,14,16];
const minTop4={25:6,0:6,1:5,2:5,3:5,4:5,24:4,23:4,21:4,5:4,17:4,19:4,15:3,12:3,20:3,18:3,9:3,11:3,8:4,13:4,10:4,7:4,22:4,6:3,14:3,16:3};
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
try{
 await page.goto('http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?all26='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__L8Q&&window.AI_SHOGI_YANEURAOU_FUTURE&&window.AI_SHOGI_YANEURAOU_TOP5&&window.AI_SHOGI_YANEURAOU_COHORT7_12&&window.AI_SHOGI_YANEURAOU_COHORT13_18&&window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR?.version==='2.15.36',{timeout:120000});
 const targets=await page.evaluate(order=>{const future=window.AI_SHOGI_YANEURAOU_FUTURE,top=window.AI_SHOGI_YANEURAOU_TOP5,c7=window.AI_SHOGI_YANEURAOU_COHORT7_12,c13=window.AI_SHOGI_YANEURAOU_COHORT13_18,lo=window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR;const meta=(mod,i)=>{const k=Array.isArray(mod?.indices)?mod.indices.indexOf(i):-1;return{name:k>=0&&Array.isArray(mod.names)?mod.names[k]:('CHAR'+i),rating:k>=0&&Array.isArray(mod.ratings)?Number(mod.ratings[k]||0):0}};return order.map(i=>{let p=null,api='',m=null;if(i===25){p={label:'R3400・未来最強',maxLoss:0};api='future';m={name:future.name,rating:Number(future.rating||3400)}}else if(top?.enabled(i)){p=top.profiles[i];api='top5';m=meta(top,i)}else if(c7?.enabled(i)){p=c7.profiles[i];api='7-12';m=meta(c7,i)}else if(c13?.enabled(i)){p=c13.profiles[i];api='13-18';m=meta(c13,i)}else if(lo?.enabled(i)){p=lo.profiles[i];api='19-26';m=meta(lo,i)}return{i,name:m?.name||('CHAR'+i),rating:Number(m?.rating||0),api,profile:p}})},order);
 if(targets.length!==26||new Set(targets.map(x=>x.i)).size!==26)throw Error('target count/uniqueness '+targets.length);
 if(targets.some(x=>!x.api||!x.profile||!x.rating))throw Error('missing profile/meta '+JSON.stringify(targets.filter(x=>!x.api||!x.profile||!x.rating)));
 for(let j=1;j<targets.length;j++)if(targets[j].rating>=targets[j-1].rating)throw Error('rating order '+JSON.stringify([targets[j-1],targets[j]]));
 const stats=Object.fromEntries(targets.map(t=>[t.i,{...t,tests:0,exact:0,top4:0,mateExact:0,nonBest:0,internalLoss:[],refLoss:[],depth:[],nodes:[],outside:[]} ]));
 for(const c of cases){
   const st=await page.evaluate(pos=>window.__L8Q.parse(pos),c.pos),legal=await page.evaluate(s=>window.__L8Q.legal(s),st);
   const ref=await page.evaluate(async s=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms:4000,multiPV:4,adaptive:false}),st);
   const rc=(ref?.info?.candidates||[]).filter(x=>x?.token).sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,4),rb=rc[0];
   if(!rb?.token)throw Error('no reference '+c.label);
   console.log('A26_REF '+JSON.stringify({case:c.label,phase:c.phase,best:rb.token,depth:ref?.info?.depth||0,nodes:ref?.info?.nodes||0,candidates:rc.map(x=>({rank:x.rank,token:x.token,cp:x.cp,mate:x.mate}))}));
   for(const t of targets){
     const res=await page.evaluate(async({s,i,api})=>{if(api==='future')return window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms:4000,multiPV:1,adaptive:false});if(api==='top5')return window.AI_SHOGI_YANEURAOU_TOP5.bestMove(s,i);if(api==='7-12')return window.AI_SHOGI_YANEURAOU_COHORT7_12.bestMove(s,i);if(api==='13-18')return window.AI_SHOGI_YANEURAOU_COHORT13_18.bestMove(s,i);return window.AI_SHOGI_YANEURAOU_COHORT19_26_SUPERVISOR.bestMove(s,i)},{s:st,i:t.i,api:t.api});
     const u=res?.move?await page.evaluate(m=>window.__L8Q.usi(m),res.move):String(res?.info?.bestmove||'');
     if(!u||!legal.includes(u))throw Error('illegal/unmapped '+t.name+' '+c.label+' '+u);
     const hit=rc.find(x=>x.token===u),z=stats[t.i],internal=Number(res?.info?.cpLoss||0),selectedRank=Number(res?.info?.selectedRank||1);
     let refLoss=null;if(hit&&Number.isFinite(rb.cp)&&Number.isFinite(hit.cp))refLoss=Math.max(0,rb.cp-hit.cp);else if(u===rb.token)refLoss=0;
     const maxLoss=Number(t.profile?.maxLoss);if(t.api!=='future'&&Number.isFinite(maxLoss)&&internal>maxLoss)throw Error('internal maxLoss '+t.name+' '+c.label+' '+internal+'>'+maxLoss);
     z.tests++;z.exact+=u===rb.token?1:0;z.top4+=hit?1:0;z.mateExact+=(c.phase==='mate'&&u===rb.token)?1:0;z.nonBest+=(c.phase!=='mate'&&selectedRank>1)?1:0;z.internalLoss.push(internal);if(refLoss!=null)z.refLoss.push(refLoss);else z.outside.push(c.label);z.depth.push(Number(res?.info?.depth||0));z.nodes.push(Number(res?.info?.nodes||0));
     console.log('A26_ROW '+JSON.stringify({case:c.label,phase:c.phase,index:t.i,name:t.name,rating:t.rating,group:t.api,token:u,selectedRank,internalLoss:internal,refLoss,exact:u===rb.token,top4:!!hit,refRank:hit?.rank||0,depth:res?.info?.depth||0,nodes:res?.info?.nodes||0,targetMs:res?.targetMs||0}));
   }
 }
 const by=targets.map(t=>{const z=stats[t.i];return{index:t.i,name:t.name,rating:t.rating,group:t.api,profile:t.profile?.label||'',tests:z.tests,exact:z.exact,top4:z.top4,mateExact:z.mateExact,nonBest:z.nonBest,meanInternalLoss:mean(z.internalLoss),meanRefLoss:mean(z.refLoss),outsideTop4:z.outside.length,meanDepth:mean(z.depth),meanNodes:mean(z.nodes),quality:z.exact*2+z.top4}});
 const groupNames=['future','top5','7-12','13-18','19-26'];
 const groups=groupNames.map(g=>{const a=by.filter(x=>x.group===g);return{group:g,count:a.length,meanQuality:mean(a.map(x=>x.quality)),meanExact:mean(a.map(x=>x.exact)),meanTop4:mean(a.map(x=>x.top4)),meanInternalLoss:mean(a.map(x=>x.meanInternalLoss)),meanOutsideTop4:mean(a.map(x=>x.outsideTop4))}});
 const fail=[];
 for(const x of by){if(x.tests!==8)fail.push('tests '+x.name+' '+x.tests);if(x.mateExact!==1)fail.push('mate '+x.name);if(x.top4<(minTop4[x.index]||3))fail.push('deepTop4 '+x.name+' '+x.top4+'<'+(minTop4[x.index]||3));}
 const future=by[0],topMean=groups.find(g=>g.group==='top5')?.meanQuality||0;if(future.quality+4<topMean)fail.push('Future below top5 mean '+future.quality+' vs '+topMean);
 for(let j=1;j<groups.length;j++){const upper=groups[j-1],lower=groups[j];if(lower.meanQuality>upper.meanQuality+4)fail.push('group inversion '+lower.group+' '+lower.meanQuality+' > '+upper.group+' '+upper.meanQuality);}
 for(let hi=0;hi<by.length;hi++)for(let lo=hi+1;lo<by.length;lo++){if(by[hi].rating-by[lo].rating>=400&&by[lo].quality>by[hi].quality+6)fail.push('large individual inversion '+by[lo].name+' R'+by[lo].rating+' q'+by[lo].quality+' > '+by[hi].name+' R'+by[hi].rating+' q'+by[hi].quality);}
 if(pageErrors.length)fail.push('page '+pageErrors.join('|'));
 console.log('ALL26_HIERARCHY_SUMMARY '+JSON.stringify({by,groups,fail,pageErrors}));
 if(fail.length)throw Error(fail.join(' | '));
 console.log('PASS_ALL26_8CASE_STRENGTH_HIERARCHY '+JSON.stringify({by,groups}));
}finally{await browser.close()}
