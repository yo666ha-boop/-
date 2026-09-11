import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?dialogue21588='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d',{timeout:30000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.__boss21546a===true&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10,{timeout:30000});
  const audit=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE;
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    const cardName=c=>(c?.querySelector?.('.chName')?.textContent||c?.querySelector?.('img')?.alt||'').trim();
    const portrait=name=>{const c=[...document.querySelectorAll('#chars .ch')].find(x=>cardName(x)===name);const i=c?.querySelector('img');return i?.currentSrc||i?.src||''};
    const rows=[];
    for(const cup of t.cups()){
      if(t.state()?.active)t.exit();
      const started=!!t.start(cup.id);await delay(180);d.render();await delay(120);
      const a=t.state()?.active||null,box=document.getElementById('tourDialogue21547'),img=box?.querySelector('.tourDialoguePortrait img');
      const src=img?.currentSrc||img?.src||'',expected=portrait(cup.boss),r=box?.getBoundingClientRect?.()||{width:0,height:0};
      rows.push({id:cup.id,boss:cup.boss,started,active:a?.cupId||null,entrants:a?.bracket?.rounds?.[0]?.length||0,bossInBracket:a?.bracket?.rounds?.[0]?.includes(cup.boss)||false,speaker:d.audit?.().speaker||null,role:box?.dataset.role||null,text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),portraitMatch:!!expected&&src===expected,imageWidth:Number(img?.naturalWidth)||0,visible:r.width>0&&r.height>0});
      t.exit();await delay(40);
    }
    return {rows,activeAfter:!!t.state()?.active,roster:window.AIShogiIOS?.characters?.().length||0,format:t.audit?.().format||null};
  });
  const fail=[];
  if(audit.rows.length!==10)fail.push('cups '+audit.rows.length);
  if(audit.roster!==26)fail.push('roster '+audit.roster);
  if(audit.format!=='16-player-then-boss')fail.push('format '+audit.format);
  for(const x of audit.rows){
    if(!x.started||x.active!==x.id)fail.push(x.id+': start/active');
    if(x.entrants!==16||x.bossInBracket)fail.push(x.id+': bracket');
    if(x.speaker!==x.boss||x.role!=='大会主・トーナメント外'||!x.text)fail.push(x.id+': dialogue');
    if(!x.portraitMatch||x.imageWidth<1||!x.visible)fail.push(x.id+': portrait/visible');
  }
  if(audit.activeAfter)fail.push('active remains');
  if(errors.length)fail.push('page errors '+JSON.stringify(errors));
  if(fail.length)throw new Error(fail.join(' | '));
  console.log('PASS_TOURNAMENT21588_TEN_CUP_VISIBLE_DIALOGUE '+JSON.stringify({cups:audit.rows.length,roster:audit.roster,format:audit.format,portraitMatches:audit.rows.filter(x=>x.portraitMatch).length,bossOutside:audit.rows.filter(x=>!x.bossInBracket).length,pageErrors:errors}));
}finally{await browser.close()}
