const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  await page.goto('https://www.studiok-i.net/ps/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(5000);
  await page.getByRole('button',{name:'新規対局'}).first().click();
  await page.waitForTimeout(800);
  const level=page.locator('#selectLevelGote');
  await level.selectOption({index:39});
  await page.locator('#chkRatingTarget').uncheck().catch(()=>{});
  await page.locator('#chkRandomBook').uncheck().catch(()=>{});
  await page.locator('#btnDialogGameStart').click();
  await page.waitForTimeout(1800);

  const data=await page.evaluate(()=>{
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const rect=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
    const boardish=[...document.querySelectorAll('canvas,svg,table,[id*=board i],[class*=board i],[id*=ban i],[class*=ban i],[id*=koma i],[class*=koma i]')].filter(visible).map((e,i)=>({i,tag:e.tagName.toLowerCase(),id:e.id||'',cls:String(e.className||''),rect:rect(e),text:(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,1000)}));
    const clickable=[...document.querySelectorAll('button,input,[onclick],[role=button]')].filter(visible).map((e,i)=>({i,tag:e.tagName.toLowerCase(),id:e.id||'',cls:String(e.className||''),rect:rect(e),text:(e.innerText||e.value||e.getAttribute('aria-label')||'').trim()})).filter(x=>x.text||/board|koma|ban/i.test(x.id+x.cls));
    const kifu=[...document.querySelectorAll('#select_kifu option')].map((o,i)=>({i,text:(o.textContent||'').trim(),value:o.value}));
    return{title:document.title,boardish,clickable,kifu,body:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,6000)};
  });
  console.log('PIYO_LV40_BOARD',JSON.stringify(data));
  if(!/ピヨ帝|Lv40/.test(data.body))throw new Error('Lv40 game not started');
  if(!data.boardish.length)throw new Error('board geometry not found');
  await page.screenshot({path:'/tmp/piyo-lv40-board.png',fullPage:true});
  await browser.close();
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
