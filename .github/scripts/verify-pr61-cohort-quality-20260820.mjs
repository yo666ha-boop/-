import { webkit } from 'playwright';
const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const LONG=`4i5h 8c8d 2h3h 8d8e 6g6f 8e8f 8g8f 8b8f 7g7f 8f8g+ 6i7h 8g7f P*7b 7a7b 5i4i 7f8e 3i4h P*8f 6f6e 8f8g+ 8h5e 8e6e 7h6h 6e5e 5g5f 5e7e 6h6i 3c3d 9g9f 2b9i+ 7i8h 9i8h 3h3i B*2h 3i3h 2h1i+ 4g4f 1i2i 3h3i 2i2h 3i3h 2h2g 4h3i N*2f 5h4h 8h8i 4h5g L*4g 5g4g 8i6g 6i5h 7e7i L*5i 2f3h+`.split(/\s+/);
function sfen(ms){const b=new Map(),h={b:{},w:{}};let rr=0;for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(/\d/.test(c)){f-=+c;continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}let t='b';for(const m of ms){if(/^[PLNSGBR]\*/.test(m)){const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false})}else{const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing '+a+' '+m);const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p})}t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1)}
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
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
try{
 await page.goto('http://127.0.0.1:4228/shogi-v21528/index-pr61-quality-audit.html?x='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.__PR61_QUALITY_DIAG&&window.AI_SHOGI_YANEURAOU_COHORT7_12&&window.AI_SHOGI_YANEURAOU_FUTURE&&window.AI_SHOGI_YANEURAOU_TOP5&&window.AI_SHOGI_GAME_SAVE,{timeout:120000});
 const api=await page.evaluate(()=>{const c=window.AI_SHOGI_YANEURAOU_COHORT7_12;return{version:c.version,indices:c.indices,names:c.names,ratings:c.ratings,profiles:c.profiles,engine:c.engine,sharedWorker:c.sharedWorker,coi:crossOriginIsolated}});
 const indices=[24,23,21,5,17,19],names=['カヲル','ラオウ','サウザー','ケンシロウ','げんどー','シン'],ratings=[2400,2250,2180,2100,2050,2000];
 if(JSON.stringify(api.indices)!==JSON.stringify(indices)||JSON.stringify(api.names)!==JSON.stringify(names)||JSON.stringify(api.ratings)!==JSON.stringify(ratings)||api.engine!=='YaneuraOu HalfKP + Suisho5'||!api.sharedWorker||!api.coi)throw Error('production API mapping '+JSON.stringify(api));
 const minNonBest={24:3,23:3,21:3,5:3,17:4,19:5};
 async function parseState(pos){return page.evaluate(pos=>{const save=window.AI_SHOGI_GAME_SAVE,[board,turn,hands,moveNoRaw]=pos.trim().split(/\s+/),moveNo=Math.max(1,Number(moveNoRaw)||1),s=JSON.parse(JSON.stringify(save.snapshot().st)),pieceKeys=['R','B','G','S','N','L','P'];s.b=Array(81).fill(null);let y=0;for(const row of board.split('/')){let x=0,prom=false;for(const ch of row){if(ch==='+'){prom=true;continue}if(/\d/.test(ch)){x+=Number(ch);continue}const upper=ch.toUpperCase();s.b[y*9+x]={k:(prom?'+':'')+upper,o:ch===upper?1:-1};prom=false;x++}if(x!==9)throw Error('bad row '+row);y++}s.h={'1':{},'-1':{}};for(const side of['1','-1'])for(const k of pieceKeys)s.h[side][k]=0;if(hands!=='-'){let n='';for(const ch of hands){if(/\d/.test(ch)){n+=ch;continue}const count=n?Number(n):1;n='';const side=ch===ch.toUpperCase()?'1':'-1';s.h[side][ch.toUpperCase()]=(s.h[side][ch.toUpperCase()]||0)+count}}s.t=turn==='b'?1:-1;s.log=Array(Math.max(0,moveNo-1)).fill(0).map((_,i)=>({audit:true,ply:i+1}));return s},pos)}
 const stats=Object.fromEntries(indices.map((i,j)=>[i,{index:i,name:names[j],rating:ratings[j],tests:0,exact:0,top5:0,outside:0,mateExact:0,nonBest:0,losses:[],elapsed:[]} ]));
 const mama={tests:0,exact:0,top5:0,outside:0,mateExact:0,nonBest:0,losses:[],elapsed:[]};
 for(const c of cases){
  const state=await parseState(c.pos),legal=await page.evaluate(s=>window.__PR61_QUALITY_DIAG.legal(s),state);
  const ref=await page.evaluate(async({s,n})=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{nodes:n,multiPV:5,adaptive:false}),{s:state,n:c.refNodes});
  const rc=(ref?.info?.candidates||[]).filter(x=>x?.token).sort((a,b)=>(a.rank||99)-(b.rank||99)),rb=rc[0];if(!rb?.token)throw Error('no ref '+c.label);
  console.log('PR61_QUALITY_REF '+JSON.stringify({case:c.label,phase:c.phase,best:rb.token,candidates:rc.map(x=>({rank:x.rank,token:x.token,cp:x.cp,mate:x.mate})),depth:ref?.info?.depth,nodes:ref?.info?.nodes}));
  const mt=performance.now(),mr=await page.evaluate(async s=>window.AI_SHOGI_YANEURAOU_TOP5.bestMove(s,4),state),mm=Math.round(performance.now()-mt),mu=mr?.move?await page.evaluate(m=>window.__PR61_QUALITY_DIAG.usi(m),mr.move):mr?.info?.bestmove;if(!legal.includes(mu))throw Error('mama illegal '+c.label);const mh=rc.find(x=>x.token===mu);mama.tests++;mama.exact+=mu===rb.token?1:0;mama.top5+=mh?1:0;mama.outside+=mh?0:1;mama.mateExact+=(c.phase==='mate'&&mu===rb.token)?1:0;mama.nonBest+=(c.phase!=='mate'&&Number(mr?.info?.selectedRank||1)>1)?1:0;mama.losses.push(Number(mr?.info?.cpLoss||0));mama.elapsed.push(mm);
  console.log('PR61_QUALITY_MAMA '+JSON.stringify({case:c.label,token:mu,exact:mu===rb.token,top5:!!mh,selectedRank:mr?.info?.selectedRank||1,cpLoss:mr?.info?.cpLoss||0,elapsed:mm}));
  for(const i of indices){const p=api.profiles[String(i)]||api.profiles[i],t=performance.now(),r=await page.evaluate(async({s,i})=>window.AI_SHOGI_YANEURAOU_COHORT7_12.bestMove(s,i),{s:state,i}),em=Math.round(performance.now()-t),u=r?.move?await page.evaluate(m=>window.__PR61_QUALITY_DIAG.usi(m),r.move):r?.info?.bestmove;if(!u||!legal.includes(u))throw Error('illegal cohort '+i+' '+c.label+' '+u);const h=rc.find(q=>q.token===u),z=stats[i],rank=Number(r?.info?.selectedRank||r?.selectedRank||1),loss=Number(r?.info?.cpLoss||r?.cpLoss||0);if(loss>Number(p.maxLoss))throw Error('maxLoss '+z.name+' '+c.label+' '+loss+'>'+p.maxLoss);z.tests++;z.exact+=u===rb.token?1:0;z.top5+=h?1:0;z.outside+=h?0:1;z.mateExact+=(c.phase==='mate'&&u===rb.token)?1:0;z.nonBest+=(c.phase!=='mate'&&rank>1)?1:0;z.losses.push(loss);z.elapsed.push(em);console.log('PR61_QUALITY_ROW '+JSON.stringify({case:c.label,phase:c.phase,index:i,name:z.name,rating:z.rating,token:u,rank,cpLoss:loss,forcedBest:!!r?.info?.forcedBest,exact:u===rb.token,top5:!!h,refRank:h?.rank||0,targetMs:r?.targetMs,elapsed:em,threads:r?.info?.threads,hashMB:r?.info?.hashMB}))}
 }
 const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
 const ms={tests:mama.tests,exact:mama.exact,top5:mama.top5,outside:mama.outside,mateExact:mama.mateExact,nonBest:mama.nonBest,meanOwnLoss:mean(mama.losses),meanMs:mean(mama.elapsed),quality:mama.exact*2+mama.top5};
 const by=indices.map(i=>{const z=stats[i];return{index:i,name:z.name,rating:z.rating,tests:z.tests,exact:z.exact,top5:z.top5,outside:z.outside,mateExact:z.mateExact,nonBest:z.nonBest,meanOwnLoss:mean(z.losses),meanMs:mean(z.elapsed),quality:z.exact*2+z.top5}}),fail=[];
 if(ms.tests!==8||ms.mateExact!==1||ms.top5<6)fail.push('Mama reference unstable '+JSON.stringify(ms));
 for(const x of by){const p=api.profiles[String(x.index)]||api.profiles[x.index];if(x.tests!==8)fail.push('tests '+x.name);if(x.mateExact!==1)fail.push('mate '+x.name);if(x.top5<6)fail.push('top5 low '+x.name+' '+x.top5);if(x.nonBest<minNonBest[x.index])fail.push('nonBest low '+x.name+' '+x.nonBest+'<'+minNonBest[x.index]);if(x.quality>ms.quality+4)fail.push('material quality inversion '+x.name+' '+x.quality+' > Mama '+ms.quality);if(Number(p.normal)>=1500||Number(p.endgame)>=2500)fail.push('budget not below Mama '+x.name)}
 const shin=by.find(x=>x.index===19);if(shin.exact>5||shin.nonBest<5)fail.push('Shin too exact '+JSON.stringify(shin));if(pageErrors.length)fail.push('pageErrors '+pageErrors.join(' | '));
 console.log('PR61_QUALITY_SUMMARY '+JSON.stringify({api:{version:api.version,engine:api.engine},mama:ms,byChar:by,fail,pageErrors}));
 if(fail.length)throw Error(fail.join(' | '));
 console.log('PASS_PR61_COHORT_QUALITY '+JSON.stringify({mama:ms,byChar:by,pageErrors}));
}finally{await browser.close()}
