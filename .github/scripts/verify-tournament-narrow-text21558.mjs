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
      let stress=document.getElementById('tourTextScaleStress21558');
      if(!stress){stress=document.createElement('style');stress.id='tourTextScaleStress21558';document.head.appendChild(stress)}
      const k=scale/100;
      stress.textContent=`
        #tourDialogue21547 .tourDialogueBubble,#tourOpponentVoice21549 .tourDialogueBubble{font-size:${12*k}px!important;line-height:1.55!important}
        #tourDialogue21547 .tourDialogueName,#tourOpponentVoice21549 .tourDialogueName{font-size:${12*k}px!important}
        #tourDialogue21547 .tourDialogueStatus,#tourOpponentVoice21549 .tourDialogueStatus{font-size:${10*k}px!important}
        #tourDialogue21547 .tourDialogueRole,#tourOpponentVoice21549 .tourDialogueRole{font-size:${9*k}px!important}
      `;
      const t=window.AI_SHOGI_TOURNAMENT;
      const panel=document.getElementById('tournament21540Panel');
      panel?.classList.add('on');
      try{t?.render?.()}catch(e){}
      const d=window.AI_SHOGI_TOURNAMENT_DIALOGUE;
      try{d?.render?.()}catch(e){}
    },scale);
    await page.waitForTimeout(120);
    return await page.evaluate(()=> {
      const host=document.getElementById('tourDialogue21547');
      const opp=document.getElementById('tourOpponentVoice21549');
      const panel=document.getElementById('tournament21540Panel');
      const side=document.querySelector('.side');
      const h=host?.getBoundingClientRect?.()||{};
      const o=opp?.getBoundingClientRect?.()||{};
      const p=panel?.getBoundingClientRect?.()||{};
      const hb=host?.querySelector('.tourDialogueBubble');
      const ob=opp?.querySelector('.tourDialogueBubble');
      const buttons=[...document.querySelectorAll('#tournament21540Panel button')].filter(x=>{
        const cs=getComputedStyle(x),r=x.getBoundingClientRect();
        return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0;
      });
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
        buttonCount:buttons.length,
        minButtonHeight:Math.round(minButtonHeight||0),
        hostBubbleFont:hb?Number.parseFloat(getComputedStyle(hb).fontSize)||0:0,
        oppBubbleFont:ob?Number.parseFloat(getComputedStyle(ob).fontSize)||0:0,
        hostText:(hb?.textContent||'').trim(),
        oppText:(ob?.textContent||'').trim()
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
    if(!row.panelWidth)f.push('panel not open '+JSON.stringify(row));
    if(!row.buttonCount)f.push('no visible tournament buttons '+JSON.stringify(row));
    if(row.minButtonHeight<44)f.push('tap target '+JSON.stringify(row));
    const expected=12*(scale/100);
    if(Math.abs(row.hostBubbleFont-expected)>.6||Math.abs(row.oppBubbleFont-expected)>.6)f.push('text scale not applied '+JSON.stringify(row));
    if(f.length)throw new Error(width+'px '+scale+'% '+f.join(' | '));
    checks.push({...row,scale});
  }

  const byWidth=new Map();
  for(const row of checks){const x=byWidth.get(row.width)||{};x[row.scale]=row;byWidth.set(row.width,x)}
  for(const [width,x] of byWidth){if(!x[100]||!x[150])throw new Error('missing scale pair '+width);if(x[150].hostBubbleFont<=x[100].hostBubbleFont||x[150].oppBubbleFont<=x[100].oppBubbleFont)throw new Error('font did not grow '+width)}

  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21558_NARROW_TEXT_SCALE '+JSON.stringify({checks,pageErrors:errors,stressApplied:true}));
  console.log('PASS_TOURNAMENT21572_NARROW_ACTION_TAP_TARGETS '+JSON.stringify({checks:checks.map(({width,scale,panelWidth,buttonCount,minButtonHeight,docOverflow,bodyOverflow})=>({width,scale,panelWidth,buttonCount,minButtonHeight,docOverflow,bodyOverflow})),pageErrors:errors}));
}finally{
  await browser.close();
}
