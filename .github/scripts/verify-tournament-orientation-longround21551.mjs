import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?orientationLong='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:20000});
  const setup=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();if(!t.start('shinji'))throw new Error('start failed');await delay(3500);d.render();await delay(250);
    const snap=label=>{const host=document.getElementById('tourDialogue21547'),opp=document.getElementById('tourOpponentVoice21549'),side=document.querySelector('.side'),hr=host?.getBoundingClientRect?.()||{},or=opp?.getBoundingClientRect?.()||{};return{label,iw:innerWidth,ih:innerHeight,hostDocked:host?.classList.contains('tourRoundBattleDock21550')===true,oppDocked:opp?.classList.contains('tourRoundBattleDock21550')===true,hostParent:host?.parentElement?.classList?.contains('side')?'side':'other',oppParent:opp?.parentElement?.classList?.contains('side')?'side':'other',hostHeight:Math.round(hr.height||0),oppHeight:Math.round(or.height||0),sideOverflow:side?Math.max(0,side.scrollWidth-side.clientWidth):0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),opponentText:(opp?.querySelector('.tourDialogueBubble')?.textContent||'').trim()};};
    const initial=snap('initial'),speech=document.getElementById('charSpeech'),before=speech?.textContent||'',updates=[];
    for(let i=1;i<=3;i++){if(speech)speech.textContent='LONG_SYNC_'+i+'_21551';await delay(750);updates.push(snap('update'+i))}
    if(speech)speech.textContent=before;return{initial,updates};
  });
  const check=x=>x.hostDocked&&x.oppDocked&&x.hostParent==='side'&&x.oppParent==='side'&&x.hostHeight>0&&x.oppHeight>0&&x.hostHeight<=115&&x.oppHeight<=115&&x.sideOverflow===0&&x.docOverflow===0;
  const failures=[];for(const x of [setup.initial,...setup.updates])if(!check(x))failures.push('portrait/long '+JSON.stringify(x));
  for(let i=1;i<=3;i++)if(setup.updates[i-1]?.opponentText!=='LONG_SYNC_'+i+'_21551')failures.push('sync '+i+' '+setup.updates[i-1]?.opponentText);
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await page.waitForTimeout(450);
  const landscape=await page.evaluate(()=>{const h=document.getElementById('tourDialogue21547'),o=document.getElementById('tourOpponentVoice21549'),s=document.querySelector('.side'),hr=h?.getBoundingClientRect?.()||{},or=o?.getBoundingClientRect?.()||{};return{iw:innerWidth,ih:innerHeight,hostDocked:h?.classList.contains('tourRoundBattleDock21550')===true,oppDocked:o?.classList.contains('tourRoundBattleDock21550')===true,hostParent:h?.parentElement?.classList?.contains('side')?'side':'other',oppParent:o?.parentElement?.classList?.contains('side')?'side':'other',hostHeight:Math.round(hr.height||0),oppHeight:Math.round(or.height||0),sideOverflow:s?Math.max(0,s.scrollWidth-s.clientWidth):0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await page.waitForTimeout(450);
  const portraitAgain=await page.evaluate(()=>{const h=document.getElementById('tourDialogue21547'),o=document.getElementById('tourOpponentVoice21549'),s=document.querySelector('.side'),hr=h?.getBoundingClientRect?.()||{},or=o?.getBoundingClientRect?.()||{};return{iw:innerWidth,ih:innerHeight,hostDocked:h?.classList.contains('tourRoundBattleDock21550')===true,oppDocked:o?.classList.contains('tourRoundBattleDock21550')===true,hostParent:h?.parentElement?.classList?.contains('side')?'side':'other',oppParent:o?.parentElement?.classList?.contains('side')?'side':'other',hostHeight:Math.round(hr.height||0),oppHeight:Math.round(or.height||0),sideOverflow:s?Math.max(0,s.scrollWidth-s.clientWidth):0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};});
  if(!check(landscape)||landscape.iw!==844||landscape.ih!==390)failures.push('landscape '+JSON.stringify(landscape));
  if(!check(portraitAgain)||portraitAgain.iw!==390||portraitAgain.ih!==844)failures.push('portraitAgain '+JSON.stringify(portraitAgain));
  if(pageErrors.length)failures.push('pageErrors '+JSON.stringify(pageErrors));
  await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT?.exit?.());if(failures.length)throw new Error(failures.join(' | '));
  console.log('PASS_TOURNAMENT21551_ORIENTATION_LONGROUND '+JSON.stringify({initial:setup.initial,updates:setup.updates,landscape,portraitAgain,pageErrors}));
}finally{await browser.close()}
