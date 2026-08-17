const { firefox } = require('playwright');
const fs = require('fs');

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?openingbench='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2200);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_TOP5&&!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});
  const out=await page.evaluate(async()=>{
    const api=window.AI_SHOGI_YANEURAOU_TOP5,shared=window.AI_SHOGI_YANEURAOU_FUTURE;await api.init();
    const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
    for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
    b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
    let s={b,h:{1:{},'-1':{}},t:1,log:[],last:null};
    function apply(s,m){const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h[1]||{})},'-1':{...(s.h[-1]||{})}},t:-s.t,log:[...s.log,'bench'],last:{...m}};const p=n.b[m.f],cap=n.b[m.to];n.b[m.f]=null;if(cap){const k=String(cap.k).replace(/^\+/,'');n.h[s.t][k]=(n.h[s.t][k]||0)+1}let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};return n}
    s=apply(s,{f:56,to:47,prom:false,drop:null}); // 7g7f
    s=apply(s,{f:24,to:33,prom:false,drop:null}); // 3c3d
    s=apply(s,{f:61,to:52,prom:false,drop:null}); // 2g2f
    const rows=[];
    for(const i of api.indices){
      const tokens=api.openingTokens(s,i),r=await api.bestMove(s,i),targetMs=r?.targetMs||api.profileMs(s,i);
      let pv4=[];
      if(i>0){const raw=await shared.bestMove(s,{ms:targetMs,multiPV:4});pv4=(raw?.info?.candidates||[]).map(c=>({rank:c.rank,token:c.token,cp:c.cp,depth:c.depth}))}
      rows.push({who:api.names[i],rating:api.ratings[i],openingTokens:tokens,move:r?.info?.token||'',openingBias:!!r?.info?.openingBias,selectedRank:r?.info?.selectedRank||1,cpLoss:r?.info?.cpLoss||0,depth:r?.info?.depth||0,targetMs,pv4,prefInPv4:tokens.filter(t=>pv4.some(c=>c.token===t))});
    }
    return {version:api.version,rows};
  });
  const preferred=out.rows.filter(r=>r.openingBias).length;
  const withTokens=out.rows.filter(r=>r.openingTokens.length).length;
  const prefVisible4=out.rows.filter(r=>r.prefInPv4.length).length;
  const report={generatedAt:new Date().toISOString(),pass:withTokens===5,withTokens,preferred,prefVisible4,rows:out.rows,version:out.version};
  fs.mkdirSync('.github/benchmark-results',{recursive:true});
  fs.writeFileSync('.github/benchmark-results/shogi-top5-opening-latest.json',JSON.stringify(report,null,2)+'\n');
  console.log('TOP5_OPENING_BENCH',JSON.stringify(report));
  await browser.close();
  if(withTokens!==5)throw new Error('opening tokens missing: '+withTokens+'/5');
  console.log('PASS top5 opening candidate probe; current selected bias='+preferred+'/5, preferred visible in MultiPV4='+prefVisible4+'/5');
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
