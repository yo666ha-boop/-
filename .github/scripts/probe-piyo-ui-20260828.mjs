import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'ja-JP' });
const errors=[];
page.on('pageerror',e=>errors.push(String(e.message||e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
try {
  await page.goto('https://www.studiok-i.net/ps/', { waitUntil:'domcontentloaded', timeout:120000 });
  await page.waitForTimeout(8000);
  console.log('PIYO_TITLE', await page.title());
  console.log('PIYO_URL', page.url());
  const info = await page.evaluate(() => {
    const visible = el => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; };
    const summarize = el => { const r=el.getBoundingClientRect(); return {tag:el.tagName,id:el.id||'',name:el.getAttribute('name')||'',type:el.getAttribute('type')||'',value:el.value??'',text:(el.innerText||el.getAttribute('aria-label')||el.getAttribute('alt')||el.getAttribute('title')||'').trim().slice(0,120),cls:String(el.className||'').slice(0,120),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
    const controls=[...document.querySelectorAll('button,input,select,a')].filter(visible).map(summarize);
    const visuals=[...document.querySelectorAll('canvas,img,svg')].filter(visible).map(summarize);
    return {controls,visuals,bodyText:(document.body.innerText||'').slice(0,5000)};
  });
  console.log('PIYO_CONTROLS', JSON.stringify(info.controls));
  console.log('PIYO_VISUALS', JSON.stringify(info.visuals));
  console.log('PIYO_BODY_TEXT', JSON.stringify(info.bodyText));
  if(errors.length) console.log('PIYO_ERRORS',JSON.stringify(errors));
  await page.screenshot({path:'/tmp/piyo-ui.png',fullPage:true});
} finally {
  await browser.close();
}
