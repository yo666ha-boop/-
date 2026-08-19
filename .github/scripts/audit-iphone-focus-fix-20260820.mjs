import {webkit,chromium} from 'playwright';
const mode=process.env.PLATFORM||'iphone';
const cfg={
 iphone:{browser:webkit,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}},
 fire:{browser:chromium,ua:'Mozilla/5.0 (Linux; U; en-US; KFMAWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/124.5.3 like Chrome/124.0 Safari/535.19',viewport:{width:800,height:1280}},
 desktop:{browser:chromium,ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',viewport:{width:1440,height:900}}
}[mode];
if(!cfg)throw Error('bad platform '+mode);
const browser=await cfg.browser.launch({headless:true});
const page=await browser.newPage({userAgent:cfg.ua,viewport:cfg.viewport});
const pageErrors=[],badResponses=[];
page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
page.on('response',r=>{if(r.status()>=400)badResponses.push({status:r.status(),url:r.url()})});
const text=sel=>page.locator(sel).textContent().then(v=>String(v||'').trim());
try{
 await page.goto('http://127.0.0.1:4222/shogi-v21528/index.html?focusFix='+mode+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
 await page.waitForTimeout(1400);
 await page.locator('#chars .ch').nth(0).click();
 await page.selectOption('#sideSelect2157','sente');
 await page.click('#newBtn');
 const before=await text('#moves');
 await page.locator('#board').locator(':scope > *').nth(56).click();
 await page.waitForTimeout(60);
 await page.locator('#board').locator(':scope > *').nth(47).click();
 await page.waitForFunction(b=>(document.getElementById('moves')?.textContent||'').trim()!==b,before,{timeout:5000});
 const human=await text('#moves');
 await page.waitForFunction(h=>{const t=(document.getElementById('moves')?.textContent||'').trim(),s=document.getElementById('status')?.textContent||'';return t!==h&&!/考えています/.test(s);},human,{timeout:30000});
 const replied=await text('#moves');
 await page.click('#focusBtn');
 await page.waitForTimeout(160);
 const focus=await page.evaluate(()=>{const root=document.getElementById('focus'),b=document.getElementById('fboard')?.getBoundingClientRect(),p=document.querySelector('#foppPortrait img');return{display:root?getComputedStyle(root).display:'none',vw:innerWidth,scrollW:document.documentElement.scrollWidth,board:b&&{l:b.left,r:b.right,w:b.width,h:b.height},portrait:{complete:!!p?.complete,w:p?.naturalWidth||0}}});
 if(focus.display==='none'||!focus.board||focus.board.w<120||focus.board.l<-2||focus.board.r>focus.vw+2||focus.scrollW>focus.vw+2||!focus.portrait.complete||focus.portrait.w<1)throw Error('focus bounds '+JSON.stringify(focus));
 await page.click('#closeBtn');
 const badImages=await page.evaluate(()=>[...document.querySelectorAll('#chars .ch img,#oppPortrait img,#foppPortrait img')].filter(i=>!i.complete||i.naturalWidth<1).map(i=>i.alt||i.src));
 const severeResponses=badResponses.filter(x=>!/favicon\.ico(?:\?|$)/i.test(x.url));
 const out={platform:mode,human,replied,focus,badImages,pageErrors,severeResponses};
 console.log('FOCUS_FIX_DIAGNOSTIC '+JSON.stringify(out));
 if(!replied||replied===human||pageErrors.length||severeResponses.length||badImages.length)throw Error('regression '+JSON.stringify(out));
 console.log('PASS_IPHONE_FOCUS_FIX '+JSON.stringify(out));
}finally{await browser.close();}
