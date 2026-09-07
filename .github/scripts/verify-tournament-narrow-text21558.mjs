import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:320,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:30000});
  };
  const sample=async(width,scale)=>{
    await page.setViewportSize({width,height:844});
    await page.evaluate(scale=>{
      document.documentElement.style.fontSize=scale+'%';
      document.documentElement.style.setProperty('-webkit-text-size-adjust',scale+'%');
      document.body.style.setProperty('-webkit-text-size-adjust',scale+'%');
      const d=window.AI_SHOGI_TOURNAMENT_DIALOGUE;
      try{d?.render?.()}catch(e){}
    },scale);
    await page.waitForTimeout(100);
    return await page.evaluate(()=> {
      const host=document.getElementById('tourDialogue21547');
      const opp=document.getElementById('tourOpponentVoice21549');
      const panel=document.getElementById('tournament21540Panel');
      const side=document.querySelector('.side');
      const h=host?.getBoundingClientRect?.()||{};
      const o=opp?.getBoundingClientRect?.()||{};
      const p=panel?.getBoundingClientRect?.()||{};
      const buttons=[...document.querySelectorAll('#tournament21540Panel button')].filter(x=>getComputedStyle(x).display!=='none');
      const minButtonHeight=buttons.length?Math.min(...buttons.map(x=>x.getBoundingClientRect().height)):0;
      return {
        width:innerWidth,
        hostVisible:!!host&&getComputedStyle(host).display!=='none'&&h.width>0&&h.height>0,
        oppVisible:!!opp&&getComputedStyle(opp).display!=='none'&&o.width>0&&o.height>0,
        hostWidth:Math.round(h.width||0),hostHeight:Math.round(h.height||0),
        oppWidth:Math.round(o.width||0),oppHeight:Math.round(o.height||0),
        panelWidth:Math.round(p.width||0),
        sideOverflow:side?Math.max(0,side.scrollWidth-side.clientWidth):0,
        docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
        bodyOverflow:Math.max(0,document.body.scrollWidth-document.body.clientWidth),
        minButtonHeight:Math.round(minButtonHeight||0),
        hostText:(host?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),
        oppText:(opp?.querySelector('.tourDialogueBubble')?.textContent||'').trim()
      };
    });
  };

  await page.goto('http://127.0.0.1:8000/shogi-v21528/?narrowText='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    if(!t.start('shinji'))throw new Error('start failed');
    await delay(3500);
  });

  const checks=[];
  for(const [width,scale] of [[320,100],[320,150],[280,100],[280,150]]){
    const row=await sample(width,scale);
    const f=[];
    if(!row.hostVisible||!row.oppVisible||!row.hostText||!row.oppText)f.push('dialogue visibility');
    if(row.sideOverflow!==0||row.docOverflow!==0||row.bodyOverflow!==0)f.push('overflow '+JSON.stringify(row));
    if(row.hostWidth>width||row.oppWidth>width||row.panelWidth>width)f.push('width '+JSON.stringify(row));
    if(row.minButtonHeight&&row.minButtonHeight<44)f.push('tap target '+JSON.stringify(row));
    if(f.length)throw new Error(width+'px '+scale+'% '+f.join(' | '));
    checks.push(row);
  }

  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21558_NARROW_TEXT_SCALE '+JSON.stringify({checks,pageErrors:errors}));
}finally{
  await browser.close();
}
