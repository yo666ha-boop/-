import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:320,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());

  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,{timeout:30000});
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
      try{window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.()}catch(e){}
      try{window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh?.()}catch(e){}
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
      const px=s=>{const e=document.querySelector(s);return e?Number.parseFloat(getComputedStyle(e).fontSize)||0:0};
      const pxAll=s=>[...document.querySelectorAll(s)].map(e=>Number.parseFloat(getComputedStyle(e).fontSize)||0);
      const overflow=s=>{const e=document.querySelector(s);return e?Math.max(0,e.scrollWidth-e.clientWidth):0};
      const gameAudit=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.()||{};
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
        oppText:(ob?.textContent||'').trim(),
        accessible21574:{
          history:{head:px('.tourAttemptHistoryHead21567'),count:px('.tourAttemptHistoryCount21567'),cups:pxAll('.tourAttemptHistoryCup21567'),ordinals:pxAll('.tourAttemptHistoryOrdinal21568'),meta:pxAll('.tourAttemptHistoryMeta21567'),overflow:overflow('.tourAttemptHistory21567')},
          game:{names:pxAll('.tourMatchName21559'),meta:pxAll('.tourMatchMeta21559'),vsHelpers:pxAll('.tourMatchVs21559 small'),bossHint:px('.tourBossHint21559'),bossLock:px('.tourBossLock21559'),matchupOverflow:overflow('.tourMatchup21559'),bossOverflow:overflow('.tourBossVault21559')},
          road:{fonts:pxAll('.tourRoadStage21562'),overflow:overflow('.tourRoad21562')},
          audit:{connectors:gameAudit.connectors,roster:gameAudit.roster,bossInBracket:gameAudit.bossInBracket}
        }
      };
    });
  };

  await page.goto('http://127.0.0.1:8000/shogi-v21528/?narrowText='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await boot();
  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    if(!t.start('kenshiro'))throw new Error('start failed');
    await delay(3500);
  });

  const checks=[];
  for(const [width,scale] of [[320,100],[320,150],[280,100],[280,150]]){
    const row=await sample(width,scale);
    console.log('TRACE_TOURNAMENT21558_NARROW_TEXT_SAMPLE '+JSON.stringify({width,scale,...row}));
    const f=[];
    if(row.hostVisible||!row.oppVisible||!row.hostText||!row.oppText)f.push('opponent-only dialogue visibility');
    if(row.sideOverflow!==0||row.docOverflow!==0||row.bodyOverflow!==0)f.push('overflow '+JSON.stringify(row));
    if(row.hostWidth>width||row.oppWidth>width||row.panelWidth>width)f.push('width '+JSON.stringify(row));
    if(!row.panelWidth)f.push('panel not open '+JSON.stringify(row));
    if(!row.buttonCount)f.push('no visible tournament buttons '+JSON.stringify(row));
    if(row.minButtonHeight<44)f.push('tap target '+JSON.stringify(row));
    const expected=12*(scale/100);
    if(Math.abs(row.hostBubbleFont-expected)>.6||Math.abs(row.oppBubbleFont-expected)>.6)f.push('text scale not applied '+JSON.stringify(row));
    if(width===280&&scale===150){
      const a=row.accessible21574,h=a.history,g=a.game,r=a.road;
      if(h.head<7||h.count<7||!h.cups.length||h.cups.some(x=>x<7)||!h.ordinals.length||h.ordinals.some(x=>x<7)||!h.meta.length||h.meta.some(x=>x<7))f.push('21574 history font floor '+JSON.stringify(h));
      if(!g.names.length||g.names.some(x=>x<8)||!g.meta.length||g.meta.some(x=>x<7)||!g.vsHelpers.length||g.vsHelpers.some(x=>x<7)||g.bossHint<8||g.bossLock<8)f.push('21574 game font floor '+JSON.stringify(g));
      if(r.fonts.length!==5||r.fonts.some(x=>x<7))f.push('21574 road font floor '+JSON.stringify(r));
      if(h.overflow!==0||g.matchupOverflow!==0||g.bossOverflow!==0||r.overflow!==0)f.push('21574 component overflow '+JSON.stringify(a));
      if(a.audit.connectors!==30||a.audit.roster!==26||a.audit.bossInBracket!==false)f.push('21574 invariant '+JSON.stringify(a.audit));
    }
    if(f.length)throw new Error(width+'px '+scale+'% '+f.join(' | '));
    checks.push({...row,scale});
  }

  const byWidth=new Map();
  for(const row of checks){const x=byWidth.get(row.width)||{};x[row.scale]=row;byWidth.set(row.width,x)}
  for(const [width,x] of byWidth){if(!x[100]||!x[150])throw new Error('missing scale pair '+width);if(x[150].hostBubbleFont<=x[100].hostBubbleFont||x[150].oppBubbleFont<=x[100].oppBubbleFont)throw new Error('font did not grow '+width)}

  if(errors.length)throw new Error('pageErrors '+JSON.stringify(errors));
  const stress21574=checks.find(x=>x.width===280&&x.scale===150)?.accessible21574;
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
  console.log('PASS_TOURNAMENT21558_NARROW_TEXT_SCALE '+JSON.stringify({checks,pageErrors:errors,stressApplied:true,opponentOnlyRounds:true}));
  console.log('PASS_TOURNAMENT21572_NARROW_ACTION_TAP_TARGETS '+JSON.stringify({checks:checks.map(({width,scale,panelWidth,buttonCount,minButtonHeight,docOverflow,bodyOverflow})=>({width,scale,panelWidth,buttonCount,minButtonHeight,docOverflow,bodyOverflow})),pageErrors:errors}));
  console.log('PASS_TOURNAMENT21574_FULLAPP_280PX_150_TEXT_STRESS '+JSON.stringify({...stress21574,pageErrors:errors}));
}finally{
  await browser.close();
}
