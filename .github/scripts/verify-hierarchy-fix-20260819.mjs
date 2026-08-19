import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36'});
  await page.goto('http://127.0.0.1:4215/shogi-v21528/index.html?hierfix='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForTimeout(1700);
  const expected=[
    [25,'未来からやってきたみつき','R3400','強さ1位・未来最強'],
    [0,'みつき','R3000','強さ2位・現代最強'],
    [1,'みっちゃん','R2850','強さ3位'],
    [2,'あき王','R2700','強さ4位'],
    [3,'おにまま','R2600','強さ5位'],
    [4,'まま','R2500','強さ6位']
  ];
  const cards=page.locator('#chars .ch'),rows=[];
  for(const [i,name,rating,rank] of expected){
    await cards.nth(i).click();await page.waitForTimeout(120);
    const row=await page.evaluate(i=>{const c=document.querySelectorAll('#chars .ch')[i];return{i,oppName:String(document.getElementById('oppName')?.textContent||'').trim(),oppRank:String(document.getElementById('oppRank')?.textContent||'').trim(),cardStyle:String(c?.querySelector('.chStyle')?.textContent||'').trim(),cardText:String(c?.innerText||'').replace(/\s+/g,' ').trim()};},i);
    rows.push(row);
    if(!row.oppName.startsWith(name)||!row.oppName.includes(rating))throw Error('name/rating '+JSON.stringify({expected:[name,rating],row}));
    if(row.oppRank!==rank)throw Error('rank '+JSON.stringify({expected:rank,row}));
  }
  if(!rows.find(x=>x.i===0)?.cardStyle.startsWith('現代最強万能型・終盤最強級'))throw Error('regular Mitsuki card style stale '+JSON.stringify(rows.find(x=>x.i===0)));
  const stale=rows.filter(x=>x.i!==25&&/強さ1位・最強/.test(x.oppRank));if(stale.length)throw Error('stale overall strongest '+JSON.stringify(stale));
  const img=await page.evaluate(()=>({cards:document.querySelectorAll('#chars .ch').length,badImages:[...document.querySelectorAll('#chars .ch img')].filter(i=>!i.complete||i.naturalWidth<1).length,coi:crossOriginIsolated}));
  if(img.cards!==26||img.badImages!==0||!img.coi)throw Error('visual runtime '+JSON.stringify(img));
  console.log('PASS_HIERARCHY_FIX '+JSON.stringify({rows,img}));
}finally{await browser.close()}
