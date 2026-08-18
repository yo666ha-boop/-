const { webkit, chromium, devices } = require('playwright');

function initialState(){
  const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
}
const baseKind=k=>String(k||'').replace(/^\+/, '');
function applyMove(s,m,label='probe'){
  const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};
  if(m.drop){const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop '+m.drop);n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t}}
  else{const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch '+JSON.stringify(m));const cap=n.b[m.to];if(cap&&cap.o===s.t)throw new Error('own capture '+JSON.stringify(m));n.b[m.f]=null;if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o}}
  n.t=-s.t;n.log.push(label);return n;
}
function sq(i){const x=i%9,y=Math.floor(i/9);return String(9-x)+String.fromCharCode(97+y)}
function token(m){return !m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'')}

async function prepare(page){
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?futuremobile='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});
}

async function iphoneAudit(){
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();await prepare(page);
  const audit=await page.evaluate(async()=>{
    const top=window.AI_SHOGI_YANEURAOU_TOP5,shared=window.AI_SHOGI_YANEURAOU_FUTURE;
    const initial=()=>{const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};return{b,h:{1:{},'-1':{}},t:1,log:[],last:null}};
    const baseKind=k=>String(k||'').replace(/^\+/, '');
    const apply=(s,m,label='probe')=>{const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};if(m.drop){const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop');n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t}}else{const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch');const cap=n.b[m.to];n.b[m.f]=null;if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o}}n.t=-s.t;n.log.push(label);return n};
    const sq=i=>String(9-(i%9))+String.fromCharCode(97+Math.floor(i/9));const tok=m=>!m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'');
    await shared.init();
    async function generated(seedMove,target){let s=apply(initial(),seedMove,'seed');for(let p=2;p<=target;p++){const r=await shared.bestMove(s,{ms:120,multiPV:1});if(!r?.move)throw new Error('generator stopped '+p);s=apply(s,r.move,'gen')}return s}
    const states=[{name:'initial',s:initial()},{name:'7g-opening',s:await generated({f:56,to:47,prom:false,drop:null},20)},{name:'2g-mid',s:await generated({f:61,to:52,prom:false,drop:null},30)}];
    const rows=[];
    for(const c of states){
      const mitsu=await top.bestMove(c.s,0);
      const future=await shared.bestMove(c.s);
      const ref=await shared.bestMove(c.s,{ms:20000,multiPV:1});
      rows.push({name:c.name,ply:c.s.log?.length||0,mitsu:{move:tok(mitsu?.move),ms:mitsu?.info?.ms,nodes:mitsu?.info?.nodes||0,depth:mitsu?.info?.depth||0},future:{move:tok(future?.move),ms:future?.info?.ms,nodes:future?.info?.nodes||0,depth:future?.info?.depth||0,threads:future?.info?.threads,hashMB:future?.info?.hashMB,deviceClass:future?.info?.deviceClass,hardwareConcurrency:future?.info?.hardwareConcurrency},ref:{move:tok(ref?.move),nodes:ref?.info?.nodes||0,depth:ref?.info?.depth||0}})
    }
    const mid=initial();mid.log=Array(24).fill('mid');const late=initial();late.log=Array(55).fill('late');
    return{ua:navigator.userAgent,coi:crossOriginIsolated,tune:shared.strengthTune,budgetOpening:shared.budget(initial()),budgetMid:shared.budget(mid),budgetLate:shared.budget(late),topVersion:top.version,topMaxLoss:top.indices.map(i=>top.profiles[i].maxLoss),rows};
  });
  await browser.close();return audit;
}

async function fireAudit(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; U; en-US; KFTRWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/124.5.1 like Chrome/124.0.0.0 Safari/535.19'});
  const page=await context.newPage();await prepare(page);
  const audit=await page.evaluate(async()=>{
    const shared=window.AI_SHOGI_YANEURAOU_FUTURE;
    function initial(){const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};return{b,h:{1:{},'-1':{}},t:1,log:[],last:null}}
    await shared.init();const s=initial(),r=await shared.bestMove(s);const mid=initial();mid.log=Array(24).fill('mid');const late=initial();late.log=Array(55).fill('late');
    return{coi:crossOriginIsolated,tune:shared.strengthTune,budgetOpening:shared.budget(s),budgetMid:shared.budget(mid),budgetLate:shared.budget(late),move:!!r?.move,ms:r?.info?.ms,threads:r?.info?.threads,hashMB:r?.info?.hashMB,fireSilk:r?.info?.fireSilk,deviceClass:r?.info?.deviceClass,nodes:r?.info?.nodes||0,depth:r?.info?.depth||0};
  });
  await browser.close();return audit;
}

(async()=>{
  const iphone=await iphoneAudit();
  console.log('IPHONE_FUTURE_STRENGTH',JSON.stringify(iphone));
  const fire=await fireAudit();
  console.log('FIRE_FUTURE_STRENGTH',JSON.stringify(fire));
  const failures=[];
  if(!iphone.coi)failures.push('iPhone crossOriginIsolated=false');
  if(iphone.tune!=='mobile-max2-openingdeep')failures.push('iPhone tune='+iphone.tune);
  if(iphone.budgetOpening!==15000||iphone.budgetMid!==9000||iphone.budgetLate!==13000)failures.push('iPhone budgets '+iphone.budgetOpening+'/'+iphone.budgetMid+'/'+iphone.budgetLate);
  if(JSON.stringify(iphone.topMaxLoss)!==JSON.stringify([0,35,28,45,40]))failures.push('top5 tune changed '+JSON.stringify(iphone.topMaxLoss));
  let futureAgree=0,mitsuAgree=0;
  for(const r of iphone.rows){
    const expectedFutureMs=r.ply<24?15000:9000;
    if(r.mitsu.ms!==3300)failures.push(r.name+' Mitsuki ms='+r.mitsu.ms);
    if(r.future.ms!==expectedFutureMs)failures.push(r.name+' Future ms='+r.future.ms+' expected '+expectedFutureMs);
    if(!(r.future.nodes>r.mitsu.nodes*1.5))failures.push(r.name+' node lead too small '+r.future.nodes+'/'+r.mitsu.nodes);
    if(r.future.depth<r.mitsu.depth-1)failures.push(r.name+' Future depth '+r.future.depth+' < Mitsuki '+r.mitsu.depth);
    if(r.future.deviceClass!=='ios-webkit')failures.push(r.name+' deviceClass='+r.future.deviceClass);
    if(r.future.hardwareConcurrency>=4&&r.future.threads!==2)failures.push(r.name+' expected 2 threads at HW '+r.future.hardwareConcurrency);
    if(r.future.hardwareConcurrency<4&&r.future.threads!==1)failures.push(r.name+' expected 1 thread at HW '+r.future.hardwareConcurrency);
    if(r.future.hashMB<48)failures.push(r.name+' hashMB='+r.future.hashMB);
    if(r.future.move===r.ref.move)futureAgree++;
    if(r.mitsu.move===r.ref.move)mitsuAgree++;
  }
  if(futureAgree<mitsuAgree)failures.push('20s-reference agreement Future '+futureAgree+' < Mitsuki '+mitsuAgree);
  if(!fire.coi)failures.push('Fire crossOriginIsolated=false');
  if(fire.tune!=='mobile-max2-openingdeep')failures.push('Fire tune='+fire.tune);
  if(fire.budgetOpening!==12000||fire.budgetMid!==8500||fire.budgetLate!==12000)failures.push('Fire budgets '+fire.budgetOpening+'/'+fire.budgetMid+'/'+fire.budgetLate);
  if(!fire.move||!(fire.nodes>0))failures.push('Fire no search result');
  if(fire.deviceClass!=='fire-silk'||fire.fireSilk!==true)failures.push('Fire detection '+JSON.stringify(fire));
  if(![1,2].includes(fire.threads)||fire.hashMB<48||fire.hashMB>64)failures.push('Fire worker ceiling '+JSON.stringify(fire));
  console.log('MOBILE_STRENGTH_SUMMARY',JSON.stringify({futureAgree,mitsuAgree,iphoneRows:iphone.rows.map(r=>({name:r.name,ply:r.ply,nodeRatio:Number((r.future.nodes/Math.max(1,r.mitsu.nodes)).toFixed(2)),futureDepth:r.future.depth,mitsuDepth:r.mitsu.depth,futureMove:r.future.move,mitsuMove:r.mitsu.move,refMove:r.ref.move})),fire:{ms:fire.ms,threads:fire.threads,hashMB:fire.hashMB,depth:fire.depth,nodes:fire.nodes}}));
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS Future Mitsuki mobile-max2-openingdeep: opening/mid/end budgets + node lead + 20s-reference agreement');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});