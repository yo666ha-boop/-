const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  await page.goto('https://www.studiok-i.net/ps/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(5000);

  const newGame=page.getByRole('button',{name:'新規対局'});
  if(!(await newGame.count()))throw new Error('新規対局 button not found');
  await newGame.first().click();
  await page.waitForTimeout(1500);

  const data=await page.evaluate(()=>{
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const controls=[...document.querySelectorAll('button,input,select')].filter(visible).map((e,i)=>({
      i,tag:e.tagName.toLowerCase(),type:e.getAttribute('type')||'',id:e.id||'',name:e.getAttribute('name')||'',
      text:(e.innerText||e.value||e.getAttribute('aria-label')||e.getAttribute('title')||'').trim(),value:e.value||'',checked:!!e.checked,
      options:e.tagName==='SELECT'?[...e.options].map((o,j)=>({j,text:(o.textContent||'').trim(),value:o.value,selected:o.selected})):undefined
    }));
    const dialogs=[...document.querySelectorAll('[role=dialog],dialog,.modal,.popup,[class*=dialog],[class*=modal],[class*=popup]')].filter(visible).map((e,i)=>({i,id:e.id||'',cls:e.className||'',text:(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,8000)}));
    const text=(document.body.innerText||'').replace(/\s+/g,' ').slice(0,18000);
    return{title:document.title,url:location.href,controls,dialogs,text};
  });

  console.log('PIYO_NEWGAME_PROBE',JSON.stringify(data));
  const levelish=data.controls.filter(c=>(c.options||[]).some(o=>/Lv\s*\d+|レベル|段|級|ぴよ/i.test(o.text))||/Lv\s*\d+|レベル|段|級|ぴよ/i.test(c.text));
  console.log('PIYO_LEVEL_CONTROLS',JSON.stringify(levelish));
  const sideish=data.controls.filter(c=>/先手|後手|プレイヤー|コンピュータ|対局開始|開始/i.test(c.text)||(c.options||[]).some(o=>/先手|後手|プレイヤー|コンピュータ/i.test(o.text)));
  console.log('PIYO_SIDE_CONTROLS',JSON.stringify(sideish));
  if(!/対局|先手|後手/.test(data.text))throw new Error('new-game settings did not open');
  await page.screenshot({path:'/tmp/piyo-newgame-probe.png',fullPage:true});
  await browser.close();
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
