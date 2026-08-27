import {webkit} from 'playwright';

const expected=[
  [25,'未来からやってきたみつき','強さ1位・未来最強'],
  [0,'みつき','強さ2位・現代最強'],
  [1,'みっちゃん','強さ3位'],
  [2,'あき王','強さ4位'],
  [3,'おにまま','強さ5位'],
  [4,'まま','強さ6位'],
  [24,'カヲル','強さ7位'],
  [23,'ラオウ','強さ8位'],
  [21,'サウザー','強さ9位'],
  [5,'ケンシロウ','強さ10位'],
  [17,'げんどー','強さ11位'],
  [19,'シン','強さ12位'],
  [15,'まり','強さ13位'],
  [12,'あすか','強さ14位'],
  [20,'みさとさん','強さ15位'],
  [18,'前田慶次','強さ16位'],
  [9,'あやなみ','強さ17位'],
  [11,'伊達政宗','強さ18位'],
  [8,'直江兼続','強さ19位'],
  [13,'ユリア','強さ20位'],
  [10,'バット','強さ21位'],
  [7,'しんじ','強さ22位'],
  [22,'リン','強さ23位'],
  [6,'ジャギ','強さ24位'],
  [14,'玉ちゃん','強さ25位'],
  [16,'ぺんぺん','強さ26位'],
];

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  viewport:{width:390,height:844},
});
const errors=[];
page.on('pageerror',e=>errors.push(String(e.message||e)));
try{
  await page.goto('http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?ranklabels='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&window.AI_SHOGI_STRENGTH_RANK_LABELS?.version==='21536c',{timeout:120000});
  const audit=await page.evaluate(expected=>({
    version:window.AI_SHOGI_STRENGTH_RANK_LABELS?.version,
    count:window.AI_SHOGI_STRENGTH_RANK_LABELS?.count,
    rows:expected.map(([i,name,label])=>({i,name,label,actual:window.AI_SHOGI_STRENGTH_RANK_LABELS.labelFor(i)})),
  }),expected);
  if(audit.count!==26)throw Error('label count '+audit.count);
  for(const row of audit.rows)if(row.actual!==row.label)throw Error('rank API '+JSON.stringify(row));

  for(const [i,name,label] of expected){
    const card=page.locator('#chars .ch').nth(i);
    const cardName=String(await card.locator('.chName').textContent()||'').trim();
    if(cardName!==name)throw Error('card identity '+JSON.stringify({i,name,cardName}));
    await card.click();
    await page.waitForFunction(({name,label})=>{
      const n=(document.getElementById('oppName')?.textContent||'').trim();
      const r=(document.getElementById('oppRank')?.textContent||'').trim();
      return n.startsWith(name)&&r===label;
    },{name,label},{timeout:10000});
    const ui=await page.evaluate(()=>({name:(document.getElementById('oppName')?.textContent||'').trim(),rank:(document.getElementById('oppRank')?.textContent||'').trim()}));
    if(ui.rank.includes('仮キャラクター'))throw Error('legacy provisional label '+JSON.stringify({i,name,ui}));
    console.log('RANK_LABEL_ROW '+JSON.stringify({i,name,label,ui}));
  }
  if(errors.length)throw Error('page errors '+errors.join(' | '));
  console.log('PASS_ALL26_VISIBLE_STRENGTH_RANK_LABELS '+JSON.stringify(audit));
}finally{
  await browser.close();
}
