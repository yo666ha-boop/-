import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const pageErrors=[],badResponses=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  page.on('response',r=>{if(r.status()>=400)badResponses.push({status:r.status(),url:r.url()})});
  await page.goto('http://127.0.0.1:4220/shogi-v21528/index.html?all26fixed='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForTimeout(2200);

  const base=await page.evaluate(()=>[...document.querySelectorAll('#chars .ch')].map((card,i)=>{
    const img=card.querySelector('img');
    const name=(card.querySelector('.chName')?.textContent||img?.alt||'').trim();
    const text=(card.textContent||'').replace(/\s+/g,' ').trim();
    const title=(card.title||'').trim();
    const style=(card.querySelector('.chStyle')?.textContent||'').trim();
    const ratingMatch=(title+' '+text).match(/R\s*(\d{3,4})/i);
    return{i,name,text,title,style,rating:ratingMatch?Number(ratingMatch[1]):null,img:{complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0,alt:img?.alt||'',src:img?.src||''}};
  }));

  async function waitOpponentImage(){
    await page.waitForFunction(()=>{const i=document.querySelector('#oppPortrait img');return !!i&&i.complete&&i.naturalWidth>0},{timeout:8000}).catch(()=>{});
    await page.waitForTimeout(80);
  }
  const opponent=[];
  for(let i=0;i<26;i++){
    await page.locator('#chars .ch').nth(i).click();
    await waitOpponentImage();
    opponent.push(await page.evaluate(i=>{const img=document.querySelector('#oppPortrait img');return{i,name:(document.querySelector('#oppName')?.textContent||'').trim(),rank:(document.querySelector('#oppRank')?.textContent||'').trim(),style:(document.querySelector('#oppStyle')?.textContent||'').trim(),img:{complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0,alt:img?.alt||'',src:img?.src||''}}},i));
  }

  const sourcePaths=['../shogi/strong213_01.part','../shogi/strong213_02.part','../shogi/strong213_02b.part','../shogi/strong213_03.part','../shogi/strong213_04.part','../shogi/strong213_05.part','../shogi/strong213_06.part','../shogi-side-test/side2157.js','../shogi-side-test/eva2158.js','../shogi-side-test/dialogue21510.js','../shogi-side-test/hokuto21511.js','../shogi-side-test/hanakeiji21512.js','../shogi-side-test/final21513.js','../shogi-side-test/future21520.js'];
  const sources=await page.evaluate(async paths=>{const rows=[];for(const p of paths){const r=await fetch(p+'?audit='+Date.now(),{cache:'no-store'});rows.push({path:p,status:r.status,text:r.ok?await r.text():''})}return rows},sourcePaths);
  const sourceText=sources.map(x=>x.text).join('\n');

  const failures=[];
  if(base.length!==26)failures.push('cards='+base.length);
  if(new Set(base.map(x=>x.name)).size!==26)failures.push('character names not unique');
  for(const x of base){
    if(!x.name)failures.push('empty name #'+x.i);
    if(!x.img.complete||x.img.w<1)failures.push('broken card image '+x.i+' '+x.name);
    if(!x.style)failures.push('empty card style '+x.i+' '+x.name);
    if(!Number.isFinite(x.rating))failures.push('rating missing '+x.i+' '+x.name+' title='+x.title+' text='+x.text);
  }
  for(const x of opponent){
    const expected=base[x.i]?.name||'';
    if(!x.name.startsWith(expected))failures.push('opponent name mismatch '+x.i+' '+x.name+' vs '+expected);
    if(!x.img.complete||x.img.w<1)failures.push('broken opponent image '+x.i+' '+x.name);
    if(!x.style)failures.push('empty opponent style '+x.i+' '+x.name);
  }

  const expectedTop=[
    [25,'未来からやってきたみつき',3400,'強さ1位・未来最強'],
    [0,'みつき',3000,'強さ2位・現代最強'],[1,'みっちゃん',2850,'強さ3位'],[2,'あき王',2700,'強さ4位'],[3,'おにまま',2600,'強さ5位'],[4,'まま',2500,'強さ6位']
  ];
  for(const [i,name,rating,rank] of expectedTop){
    if(base[i]?.name!==name||Number(base[i]?.rating)!==rating)failures.push('top identity/rating '+i+' '+JSON.stringify(base[i]));
    if(opponent[i]?.rank!==rank)failures.push('top rank '+i+' want='+rank+' got='+opponent[i]?.rank);
  }
  if(!base[0]?.style.includes('現代最強万能型・終盤最強級'))failures.push('regular Mitsuki style '+base[0]?.style);

  const must=['るんばー','みつきーっく！','うどんさんたべたい。','ぺんぎんさんちにいきたいー','じゃんぷ、じゃんぷ！','にゃんびー','かあちゃん、だっこー！！','じゅーすちょうだい。','大人なのに本気でやるの・・・、ぐすん','ままーだっこしてーー'];
  const micMissing=must.filter(s=>!sourceText.includes(s));
  if(micMissing.length)failures.push('micchan required dialogue missing '+JSON.stringify(micMissing));

  const sourceMissingNames=base.filter(x=>!sourceText.includes(x.name)).map(x=>({i:x.i,name:x.name}));
  if(sourceMissingNames.length)failures.push('character source name missing '+JSON.stringify(sourceMissingNames));
  const sourceErrors=sources.filter(x=>x.status>=400).map(x=>({path:x.path,status:x.status}));
  if(sourceErrors.length)failures.push('source fetch errors '+JSON.stringify(sourceErrors));
  if(pageErrors.length)failures.push('pageErrors '+pageErrors.join(' | '));
  if(badResponses.length)failures.push('HTTP errors '+JSON.stringify(badResponses));

  const diag={characters:base.map(x=>({i:x.i,name:x.name,rating:x.rating,cardStyle:x.style,imgW:x.img.w,title:x.title})),opponent:opponent.map(x=>({i:x.i,name:x.name,rank:x.rank,style:x.style,imgW:x.img.w,alt:x.img.alt})),micchanRequired:{required:must.length,missing:micMissing},sourceMissingNames,sourceErrors,pageErrors,badResponses};
  console.log('ALL26_DIAGNOSTIC '+JSON.stringify(diag));
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS_ALL26_CHARACTER_CONTENT '+JSON.stringify({count:base.length,unique:new Set(base.map(x=>x.name)).size,top6:expectedTop.map(([i,name,rating,rank])=>({i,name,rating,rank})),micchanRequired:must.length,sourceMissingNames,pageErrors,badResponses}));
}finally{await browser.close()}
