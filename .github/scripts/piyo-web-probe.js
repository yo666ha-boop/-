const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto('https://www.studiok-i.net/ps/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(7000);
  const data=await page.evaluate(()=>{
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const buttons=[...document.querySelectorAll('button,input[type=button],input[type=submit]')].filter(visible).map((e,i)=>({i,text:(e.innerText||e.value||e.getAttribute('aria-label')||'').trim()})).filter(x=>x.text);
    const selects=[...document.querySelectorAll('select')].map((e,i)=>({i,visible:visible(e),value:e.value,options:[...e.options].map(o=>({text:(o.textContent||'').trim(),value:o.value,selected:o.selected}))}));
    const labels=[...document.querySelectorAll('label')].filter(visible).map(e=>(e.innerText||e.textContent||'').trim()).filter(Boolean);
    const text=(document.body.innerText||'').replace(/\s+/g,' ').slice(0,12000);
    return{title:document.title,url:location.href,buttons,selects,labels,text};
  });
  console.log('PIYO_WEB_PROBE',JSON.stringify(data));
  if(!/ぴよ将棋/.test(data.title+data.text))throw new Error('piyo page not loaded');
  const levelish=data.selects.filter(s=>s.options.some(o=>/Lv\s*\d+|レベル|段|級/i.test(o.text)));
  console.log('PIYO_LEVEL_SELECTS',JSON.stringify(levelish));
  await page.screenshot({path:'/tmp/piyo-web-probe.png',fullPage:true});
  await browser.close();
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
