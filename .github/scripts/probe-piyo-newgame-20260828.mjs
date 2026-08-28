import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},locale:'ja-JP'});
try{
  await page.goto('https://www.studiok-i.net/ps/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForTimeout(4000);
  await page.locator('#btnNewGame').click();
  await page.waitForTimeout(1500);
  const info=await page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
    const row=el=>{const r=el.getBoundingClientRect();return{tag:el.tagName,id:el.id||'',name:el.getAttribute('name')||'',type:el.getAttribute('type')||'',value:el.value??'',checked:!!el.checked,text:(el.innerText||el.getAttribute('aria-label')||el.getAttribute('title')||'').trim().slice(0,200),options:el.tagName==='SELECT'?[...el.options].map(o=>({value:o.value,text:o.text,selected:o.selected})):undefined,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
    return{controls:[...document.querySelectorAll('button,input,select,textarea,label')].filter(visible).map(row),body:(document.body.innerText||'').slice(0,8000)};
  });
  console.log('PIYO_NEWGAME_CONTROLS '+JSON.stringify(info.controls));
  console.log('PIYO_NEWGAME_BODY '+JSON.stringify(info.body));
  await page.screenshot({path:'/tmp/piyo-newgame.png',fullPage:true});
}finally{await browser.close()}
