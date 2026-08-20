import { webkit } from 'playwright';
const R='abcdefghi',INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
function sfen(ms){const b=new Map();let y=0;for(const row of INIT.split('/')){let f=9;for(const c of row){if(c>='1'&&c<='9'){f-=Number(c);continue}b.set(''+f+R[y],{s:c===c.toUpperCase()?'b':'w',k:c.toUpperCase()});f--}if(f!==0)throw Error('bad init row '+row);y++}let t='b';for(const m of ms){const a=m.slice(0,2),d=m.slice(2,4),p=b.get(a);if(!p)throw Error('bad '+m);b.delete(a);b.set(d,p);t=t==='b'?'w':'b'}const rows=[];for(let r=0;r<9;r++){let z='',e=0;for(let f=9;f;f--){const p=b.get(''+f+R[r]);if(!p){e++;continue}if(e){z+=e;e=0}z+=p.s==='b'?p.k:p.k.toLowerCase()}if(e)z+=e;rows.push(z)}return rows.join('/')+' '+t+' - '+(ms.length+1)}
const cases=[['open7',sfen(['7g7f'])],['open2',sfen(['2g2f'])],['midA',sfen(['7g7f','3c3d','2g2f','8c8d','2f2e','8d8e'])],['midB',sfen(['2g2f','8c8d','2f2e','8d8e','7g7f','3c3d','6g6f','6c6d'])]];
const used=new Set([0,1,2,3,4,24,23,21,5,17,19,15,12,20,18,9,11]);
const browser=await webkit.launch({headless:true}),page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}}),pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
try{
 await page.goto('http://127.0.0.1:4237/shogi-v21528/index-c-feasibility.html?x='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__C_DIAG&&window.AI_SHOGI_YANEURAOU_FUTURE&&document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
 const cards=await page.evaluate(()=>[...document.querySelectorAll('#chars .ch')].map((el,i)=>{const text=(el.textContent||'').replace(/\s+/g,' ').trim(),m=text.match(/R\s*(\d{3,4})/i)||text.match(/(?:^|\D)(\d{3,4})(?:\D|$)/);return{domIndex:i,text,rating:m?Number(m[1]):null}}));
 console.log('STAGEC_ALL_CARDS '+JSON.stringify(cards));
 const pool=cards.filter(x=>x.domIndex<25&&!used.has(x.domIndex)&&Number.isFinite(x.rating)).sort((a,b)=>b.rating-a.rating||a.domIndex-b.domIndex);
 if(pool.length!==8)throw Error('remaining pool mismatch '+JSON.stringify(pool));
 const targets=pool.slice(0,6).map((x,j)=>({...x,ms:[280,255,230,210,190,170][j],max:[180,190,200,215,230,245][j],min:j<2?3:4}));
 console.log('STAGEC_IDENTITIES '+JSON.stringify({remaining:pool,targets}));
 const rows=[];
 for(const [label,pos] of cases){const st=await page.evaluate(pos=>window.__C_DIAG.parse(pos),pos);for(const t of targets){const res=await page.evaluate(async({s,ms})=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(s,{ms,multiPV:5,adaptive:false}),{s:st,ms:t.ms});const cs=(res?.info?.candidates||[]).filter(x=>x?.token).sort((a,b)=>(a.rank||99)-(b.rank||99)),best=cs[0];if(!best)throw Error('no candidates '+label+' '+t.text);const loss=c=>Number.isFinite(best.cp)&&Number.isFinite(c.cp)?Math.max(0,best.cp-c.cp):0,safe=cs.filter(c=>loss(c)<=t.max),pref=safe.filter(c=>(c.rank||1)>=t.min),pick=pref[0]||safe[0]||best;rows.push({case:label,index:t.domIndex,text:t.text,rating:t.rating,ms:t.ms,max:t.max,min:t.min,best:best.token,pick:pick.token,rank:pick.rank||1,loss:loss(pick),depth:res?.info?.depth||0,nodes:res?.info?.nodes||0,cands:cs.length})}}
 const by=targets.map(t=>{const a=rows.filter(x=>x.index===t.domIndex);return{index:t.domIndex,text:t.text,rating:t.rating,ms:t.ms,max:t.max,min:t.min,tests:a.length,nonBest:a.filter(x=>x.rank>1).length,within:a.filter(x=>x.loss<=t.max).length,meanLoss:Math.round(a.reduce((s,x)=>s+x.loss,0)/a.length),meanDepth:Math.round(a.reduce((s,x)=>s+x.depth,0)/a.length),minCands:Math.min(...a.map(x=>x.cands))}}),fail=[];
 for(const x of by){if(x.tests!==4||x.within!==4)fail.push('loss '+x.text);if(x.nonBest<2)fail.push('diversity '+x.text);if(x.minCands<3)fail.push('candidates '+x.text)}if(pageErrors.length)fail.push('page '+pageErrors.join('|'));
 console.log('COHORT19_24_FEASIBILITY '+JSON.stringify({targets,by,rows,fail,pageErrors}));if(fail.length)throw Error(fail.join(' | '));console.log('PASS_COHORT19_24_FEASIBILITY '+JSON.stringify({targets,by}));
}finally{await browser.close()}
