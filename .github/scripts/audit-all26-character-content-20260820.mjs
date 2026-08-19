import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const pageErrors=[],badResponses=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  page.on('response',r=>{if(r.status()>=400)badResponses.push({status:r.status(),url:r.url()})});
  await page.goto('http://127.0.0.1:4220/shogi-v21528/index.html?all26='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForTimeout(1800);

  const base=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('#chars .ch')];
    const getLex=(name,fallback=null)=>{try{return eval(name)}catch{return fallback}};
    const C0=getLex('C',[]),M0=getLex('CHAR_META',[]),T0=getLex('TEMP_DIALOGUES',[]),F0=getLex('FINAL21513_DATA',[]);
    const summarizeBank=(b)=>{
      if(!b||typeof b!=='object')return null;
      const out={};for(const [k,v] of Object.entries(b)){if(Array.isArray(v))out[k]={count:v.length,sample:v.slice(0,3)}}return out;
    };
    return cards.map((card,i)=>{
      const img=card.querySelector('img'),name=(card.querySelector('.chName')?.textContent||img?.alt||'').trim();
      const text=(card.textContent||'').replace(/\s+/g,' ').trim(),style=(card.querySelector('.chStyle')?.textContent||'').trim();
      const c=Array.isArray(C0)&&C0[i]?C0[i]:null,meta=Array.isArray(M0)&&M0[i]?M0[i]:null;
      const candidates=[];
      if(Array.isArray(T0)){
        if(T0[i])candidates.push(T0[i]);
        if(i>=5&&T0[i-5])candidates.push(T0[i-5]);
      }
      if(Array.isArray(F0)&&F0[i]?.dialogues)candidates.push(F0[i].dialogues);
      const bank=candidates.map(summarizeBank).find(x=>x&&Object.keys(x).length)||null;
      return{i,name,text,title:card.title||'',style,img:{complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0,alt:img?.alt||'',src:img?.src||''},runtime:c?{name:c[0],rating:c[1]}:null,meta:meta?{style:meta.style||'',feature:meta.feature||''}:null,dialogue:bank};
    });
  });

  const opponent=[];
  for(let i=0;i<26;i++){
    await page.locator('#chars .ch').nth(i).click();
    await page.waitForTimeout(100);
    opponent.push(await page.evaluate(i=>{const img=document.querySelector('#oppPortrait img');return{i,name:(document.querySelector('#oppName')?.textContent||'').trim(),rank:(document.querySelector('#oppRank')?.textContent||'').trim(),img:{complete:!!img?.complete,w:img?.naturalWidth||0,h:img?.naturalHeight||0,alt:img?.alt||'',src:img?.src||''}}},i));
  }

  const failures=[];
  if(base.length!==26)failures.push('cards='+base.length);
  if(new Set(base.map(x=>x.name)).size!==26)failures.push('character names not unique');
  for(const x of base){
    if(!x.name)failures.push('empty name #'+x.i);
    if(!x.img.complete||x.img.w<1)failures.push('broken card image '+x.i+' '+x.name);
    if(!x.style)failures.push('empty card style '+x.i+' '+x.name);
    if(!x.runtime||x.runtime.name!==x.name||!Number.isFinite(Number(x.runtime.rating)))failures.push('runtime C mismatch '+x.i+' '+x.name+' '+JSON.stringify(x.runtime));
    if(!x.meta?.style)failures.push('meta style missing '+x.i+' '+x.name);
  }
  for(const x of opponent){
    if(x.name!==base[x.i]?.name)failures.push('opponent name mismatch '+x.i+' '+x.name+' vs '+base[x.i]?.name);
    if(!x.img.complete||x.img.w<1)failures.push('broken opponent image '+x.i+' '+x.name);
  }
  const expectedTop=[
    [25,'未来からやってきたみつき',3400,'強さ1位・未来最強'],
    [0,'みつき',3000,'強さ2位・現代最強'],[1,'みっちゃん',2850,'強さ3位'],[2,'あき王',2700,'強さ4位'],[3,'おにまま',2600,'強さ5位'],[4,'まま',2500,'強さ6位']
  ];
  for(const [i,name,rating,rank] of expectedTop){
    if(base[i]?.name!==name||Number(base[i]?.runtime?.rating)!==rating)failures.push('top identity/rating '+i+' '+JSON.stringify(base[i]));
    if(opponent[i]?.rank!==rank)failures.push('top rank '+i+' want='+rank+' got='+opponent[i]?.rank);
  }
  if(base[0]?.meta?.style!=='現代最強万能型・終盤最強級')failures.push('regular Mitsuki style '+JSON.stringify(base[0]?.meta));

  const mic=base[1]?.dialogue||{};const micSamples=Object.values(mic).flatMap(x=>x.sample||[]);
  const must=['るんばー','みつきーっく！','うどんさんたべたい。','ぺんぎんさんちにいきたいー','じゃんぷ、じゃんぷ！','にゃんびー','かあちゃん、だっこー！！','じゅーすちょうだい。','大人なのに本気でやるの・・・、ぐすん','ままーだっこしてーー'];
  const allDialogueText=await page.evaluate(()=>{try{return JSON.stringify(eval('TEMP_DIALOGUES'))+' '+JSON.stringify(eval('FINAL21513_DATA'))}catch(e){return''}});
  for(const s of must)if(!allDialogueText.includes(s))failures.push('micchan required dialogue missing '+s);

  const noBank=base.filter(x=>!x.dialogue).map(x=>({i:x.i,name:x.name}));
  const diag={characters:base.map(x=>({i:x.i,name:x.name,rating:x.runtime?.rating,cardStyle:x.style,metaStyle:x.meta?.style,imgW:x.img.w,dialogueCategories:x.dialogue?Object.fromEntries(Object.entries(x.dialogue).map(([k,v])=>[k,v.count])):null,title:x.title})),opponent:opponent.map(x=>({i:x.i,name:x.name,rank:x.rank,imgW:x.img.w})),noBank,pageErrors,badResponses};
  console.log('ALL26_DIAGNOSTIC '+JSON.stringify(diag));
  if(pageErrors.length)failures.push('pageErrors '+pageErrors.join(' | '));
  if(badResponses.length)failures.push('HTTP errors '+JSON.stringify(badResponses));
  if(noBank.length)failures.push('dialogue bank unresolved '+JSON.stringify(noBank));
  if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS_ALL26_CHARACTER_CONTENT '+JSON.stringify({count:base.length,unique:new Set(base.map(x=>x.name)).size,top6:expectedTop.map(([i,name,rating,rank])=>({i,name,rating,rank})),noBank,pageErrors,badResponses}));
}finally{await browser.close()}
