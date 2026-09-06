import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?sameCupRestart='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:30000});

  const result=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(r=>setTimeout(r,ms));
    const snap=label=>{
      d.render();
      const a=t.state()?.active||null,box=document.getElementById('tourDialogue21547'),img=box?.querySelector('img'),r=box?.getBoundingClientRect?.()||{},side=document.querySelector('.side');
      return{
        label,startedAt:Number(a?.startedAt)||0,cupId:a?.cupId||'',context:d.audit?.().context||'',
        speaker:box?.dataset.speaker||'',role:box?.dataset.role||'',lineId:box?.dataset.lineId||'',
        text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),
        portrait:!!img?.src&&!!img.complete&&img.naturalWidth>0,
        docked:box?.classList.contains('tourRoundBattleDock21550')===true,
        parent:box?.parentElement?.classList?.contains('side')?'side':'other',
        h:Math.round(r.height||0),sideOverflow:side?Math.max(0,side.scrollWidth-side.clientWidth):0,
        docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)
      };
    };
    if(t.state()?.active)t.exit();
    localStorage.removeItem('aiShogiTournamentDialogue21547');
    if(!t.start('shinji'))throw new Error('first start failed');
    await delay(220);
    const first=snap('first');
    t.exit();await delay(40);
    await delay(20);
    if(!t.start('shinji'))throw new Error('second start failed');
    await delay(220);
    const second=snap('second');
    t.exit();
    return{first,second};
  });

  const f=[];
  for(const x of [result.first,result.second]){
    if(x.cupId!=='shinji'||x.context!=='intro')f.push(x.label+': context '+JSON.stringify(x));
    if(x.speaker!=='しんじ'||x.role!=='大会主・トーナメント外'||!x.lineId||!x.text||!x.portrait)f.push(x.label+': dialogue '+JSON.stringify(x));
    if(!x.docked||x.parent!=='side'||x.h<1||x.h>115||x.sideOverflow!==0||x.docOverflow!==0)f.push(x.label+': layout '+JSON.stringify(x));
  }
  if(!(result.second.startedAt>result.first.startedAt))f.push('startedAt did not advance '+JSON.stringify(result));
  if(result.second.lineId===result.first.lineId)f.push('anti-repeat failed '+result.first.lineId);
  if(errors.length)f.push('pageErrors '+JSON.stringify(errors));
  if(f.length)throw new Error(f.join(' | '));
  console.log('PASS_TOURNAMENT21555_SAME_CUP_RESTART_INTRO '+JSON.stringify({...result,pageErrors:errors}));
}finally{
  await browser.close();
}
