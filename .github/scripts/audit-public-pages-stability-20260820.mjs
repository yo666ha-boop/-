import {webkit,chromium} from 'playwright';
const mode=process.env.PLATFORM||'desktop';
const cfg={
  iphone:{browser:webkit,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}},
  fire:{browser:chromium,ua:'Mozilla/5.0 (Linux; U; en-US; KFMAWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/124.5.3 like Chrome/124.0 Safari/535.19',viewport:{width:800,height:1280}},
  desktop:{browser:chromium,ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',viewport:{width:1440,height:900}}
}[mode];if(!cfg)throw Error('bad platform '+mode);
const PUBLIC='https://yo666ha-boop.github.io/-/shogi-v21528/';
const browser=await cfg.browser.launch({headless:true});
const context=await browser.newContext({userAgent:cfg.ua,viewport:cfg.viewport,ignoreHTTPSErrors:false});
const page=await context.newPage();
const pageErrors=[],consoleErrors=[],badResponses=[],requestFailures=[];
page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)badResponses.push({status:r.status(),url:r.url()})});
page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText||''}));
const text=sel=>page.locator(sel).textContent().then(v=>String(v||'').trim());
try{
  const started=Date.now();
  await page.goto(PUBLIC+'?publicAudit='+mode+'-'+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForFunction(()=>crossOriginIsolated===true,{timeout:120000});
  await page.waitForTimeout(1800);
  const loaded=await page.evaluate(()=>({url:location.href,host:location.host,coi:crossOriginIsolated,cards:document.querySelectorAll('#chars .ch').length,names:[...document.querySelectorAll('#chars .ch')].map(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()),badImages:[...document.querySelectorAll('#chars .ch img')].filter(i=>!i.complete||i.naturalWidth<1).map(i=>i.alt||i.src),sound:window.AI_SHOGI_PIECE_SOUND?.audit?.()||null,future:!!window.AI_SHOGI_YANEURAOU_FUTURE,top5:!!window.AI_SHOGI_YANEURAOU_TOP5,save:!!window.AI_SHOGI_GAME_SAVE,side:!!document.getElementById('sideSelect2157')}));
  if(!loaded.coi||loaded.cards!==26||loaded.badImages.length||!loaded.future||!loaded.top5||!loaded.save||!loaded.side)throw Error('public load '+JSON.stringify(loaded));
  if(loaded.names[25]!=='未来からやってきたみつき'||loaded.names[0]!=='みつき'||loaded.names[1]!=='みっちゃん')throw Error('character order '+JSON.stringify(loaded.names));
  if(loaded.sound?.enabled!==true||loaded.sound?.buttons!==2)throw Error('sound '+JSON.stringify(loaded.sound));

  await page.locator('#chars .ch').nth(25).click();await page.waitForTimeout(120);const futureRank=await text('#oppRank');
  await page.locator('#chars .ch').nth(0).click();await page.waitForTimeout(120);const mitsukiRank=await text('#oppRank');
  if(futureRank!=='強さ1位・未来最強'||mitsukiRank!=='強さ2位・現代最強')throw Error('hierarchy '+JSON.stringify({futureRank,mitsukiRank}));

  await page.selectOption('#sideSelect2157','sente');await page.click('#newBtn');await page.waitForTimeout(150);
  const before=await text('#moves');
  await page.locator('#board').locator(':scope > *').nth(56).click();await page.waitForTimeout(60);await page.locator('#board').locator(':scope > *').nth(47).click();
  await page.waitForFunction(b=>{const t=(document.getElementById('moves')?.textContent||'').trim();return !!t&&t!==b;},before,{timeout:8000});
  const human=await text('#moves');
  await page.waitForFunction(h=>{const t=(document.getElementById('moves')?.textContent||'').trim(),s=(document.getElementById('status')?.textContent||'');return t!==h&&!/考えています/.test(s);},human,{timeout:60000});
  const replied=await text('#moves'),status=await text('#status');
  if(!replied||replied===human)throw Error('public AI reply missing');
  const engine=await page.evaluate(()=>({futureStatus:window.AI_SHOGI_YANEURAOU_FUTURE?.status?.()||null,last:window.lastAIInfo||null}));
  if(!engine.futureStatus?.ready||!engine.futureStatus?.worker)throw Error('public engine not ready '+JSON.stringify(engine));

  await page.click('#focusBtn');await page.waitForTimeout(120);const focus=await page.evaluate(()=>({display:getComputedStyle(document.getElementById('focus')).display,board:(()=>{const r=document.getElementById('fboard')?.getBoundingClientRect();return r&&{l:r.left,r:r.right,w:r.width,h:r.height}})(),portrait:(()=>{const i=document.querySelector('#foppPortrait img');return i&&{complete:i.complete,w:i.naturalWidth}})(),vw:innerWidth}));
  if(focus.display==='none'||!focus.board||focus.board.w<120||focus.board.l<-2||focus.board.r>focus.vw+2||!focus.portrait?.complete||focus.portrait.w<1)throw Error('public focus '+JSON.stringify(focus));
  await page.click('#closeBtn');

  const severeConsole=consoleErrors.filter(x=>!/favicon|Data URL decoding failed|ERR_INVALID_URL/i.test(x));
  const severeResponses=badResponses.filter(x=>!/favicon\.ico(?:\?|$)/i.test(x.url));
  const severeFailures=requestFailures.filter(x=>!/^data:/i.test(x.url)&&!/favicon\.ico(?:\?|$)/i.test(x.url)&&!/ERR_ABORTED/i.test(x.failure));
  const finalImages=await page.evaluate(()=>[...document.querySelectorAll('#chars .ch img,#oppPortrait img,#foppPortrait img')].filter(i=>!i.complete||i.naturalWidth<1).map(i=>i.alt||i.src));
  const diag={platform:mode,publicUrl:PUBLIC,finalUrl:page.url(),loadMs:Date.now()-started,loaded:{host:loaded.host,cards:loaded.cards,badImages:loaded.badImages,coi:loaded.coi,sound:loaded.sound},ranks:{futureRank,mitsukiRank},interaction:{human,replied,status},engine,focus,browser:{pageErrors,severeConsole,severeResponses,severeFailures,finalImages}};
  console.log('PUBLIC_PAGES_DIAGNOSTIC '+JSON.stringify(diag));
  if(pageErrors.length||severeConsole.length||severeResponses.length||severeFailures.length||finalImages.length)throw Error('public browser errors '+JSON.stringify(diag.browser));
  console.log('PASS_PUBLIC_PAGES_STABILITY '+JSON.stringify(diag));
}finally{await context.close();await browser.close();}
