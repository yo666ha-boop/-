import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errs=[];
  page.on('pageerror',e=>errs.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?allOpponentVoices='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,null,{timeout:60000});
  await page.waitForFunction(()=>crossOriginIsolated===true,null,{timeout:60000});
  await page.waitForTimeout(250);
  await page.waitForFunction(()=>crossOriginIsolated===true&&window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10&&window.AIShogiIOS?.characters?.().length===26&&document.querySelectorAll('#chars .ch').length===26,null,{timeout:60000});

  const result=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(r=>setTimeout(r,ms));
    const KEY='aiShogiTournament21540';
    const micchanLines=new Set(['にゃんびー！','でんじゃーでんじゃーえまーじぇんしー！','にゃんびー警報、ぴこぴこぴー！','でんじゃー！こまこま大渋滞！','えまーじぇんしー！将棋が飛んでる！','にゃんびーにゃんびー、こまこまこま！']);
    const cardName=c=>(c?.querySelector('.chName')?.textContent||c?.querySelector('img')?.alt||'').trim();
    const norm=s=>String(s||'').replace(/[?&]v=[^&#]*/g,'').replace(/[?&]ci=[^&#]*/g,'');
    const roster=window.AIShogiIOS.characters().map(c=>({name:c.name,rating:Number(c.rating)||0}));
    const cups=t.cups();
    const targets=roster.filter(c=>c.name!=='未来からやってきたみつき').map(c=>({...c,eligibleCup:cups.find(x=>x.boss!==c.name&&c.rating<x.bossRating)?.id||''}));
    const base=new Map(),fail=[];

    if(t.state()?.active)t.exit();
    await delay(120);

    // First sample the canonical normal-opponent UI before tournament mode is active.
    for(const target of targets){
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>cardName(c)===target.name);
      if(!card){fail.push('card missing '+target.name);continue}
      card.click();
      await delay(45);
      const speech=(document.getElementById('charSpeech')?.textContent||'').trim();
      const selected=(document.getElementById('oppName')?.textContent||'').trim();
      const img=card.querySelector('img');
      base.set(target.name,{speech,selected,src:img?.currentSrc||img?.src||'',complete:!!img?.complete,w:Number(img?.naturalWidth)||0});
      if(!selected.startsWith(target.name)||!speech)fail.push('normal sample '+target.name+' selected='+selected+' speech='+speech);
    }

    if(!t.start('future'))fail.push('future cup start failed');
    await delay(350);
    const rows=[];

    // 21598 already proves live round transitions update the canonical charSpeech.
    // Here we sweep every eligible character through the tournament dialogue renderer,
    // feeding the canonical speech sampled above so the full roster stays protected.
    for(const target of targets){
      const b=base.get(target.name)||{};
      const store=JSON.parse(localStorage.getItem(KEY)||'null'),a=store?.active;
      if(!a){fail.push('active missing '+target.name);break}
      a.status='active';a.pending=null;a.round=0;
      a.bossChallenge=a.bossChallenge||{};a.bossChallenge.status='locked';
      const bracketRow=a.bracket?.rounds?.[0];
      if(!Array.isArray(bracketRow)){fail.push('round0 missing '+target.name);break}
      const oppSlot=(Number(a.playerSlot)||0)^1;
      bracketRow[oppSlot]=target.name;
      localStorage.setItem(KEY,JSON.stringify(store));
      const canonical=document.getElementById('charSpeech');
      if(canonical)canonical.textContent=b.speech||'';
      d.render();
      await delay(25);
      const box=document.getElementById('tourOpponentVoice21549'),img=box?.querySelector('img'),r=box?.getBoundingClientRect?.()||{},text=(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim();
      const row={name:target.name,rating:target.rating,eligibleCup:target.eligibleCup,baseSpeech:b.speech||'',text,speaker:box?.dataset.speaker||'',role:box?.dataset.role||'',portraitEqual:!!b.src&&norm(img?.currentSrc||img?.src||'')===norm(b.src),complete:!!img?.complete,w:Number(img?.naturalWidth)||0,h:Number(r.height)||0,docked:box?.classList.contains('tourRoundBattleDock21550')===true,parent:box?.parentElement?.classList?.contains('side')?'side':'other'};
      rows.push(row);
      if(!row.eligibleCup)fail.push('not eligible '+row.name);
      if(row.speaker!==row.name||row.role!=='対戦相手・トーナメント参加者')fail.push('speaker '+row.name);
      if(!row.portraitEqual||!row.complete||row.w<1||row.h<1)fail.push('portrait '+row.name);
      if(!row.docked||row.parent!=='side')fail.push('dock '+row.name);
      if(row.name==='みっちゃん'){
        if(!micchanLines.has(row.text))fail.push('micchan override '+row.text);
      }else if(row.text!==row.baseSpeech){
        fail.push('voice '+row.name+' base='+row.baseSpeech+' actual='+row.text);
      }
    }

    return{rosterCount:roster.length,cups:cups.length,targets:targets.length,baseCount:base.size,rows,fail,micchanOverride:rows.some(x=>x.name==='みっちゃん'&&micchanLines.has(x.text))};
  });

  const failures=[...result.fail];
  if(result.rosterCount!==26)failures.push('roster '+result.rosterCount);
  if(result.cups!==10)failures.push('cups '+result.cups);
  if(result.targets!==25||result.baseCount!==25||result.rows.length!==25)failures.push('coverage '+JSON.stringify({targets:result.targets,base:result.baseCount,rows:result.rows.length}));
  if(new Set(result.rows.map(x=>x.name)).size!==25)failures.push('speaker uniqueness');
  if(errs.length)failures.push('page errors '+JSON.stringify(errs));
  if(failures.length)throw new Error(failures.join(' | '));

  const inherited=result.rows.filter(x=>x.name!=='みっちゃん'&&x.text===x.baseSpeech).length;
  console.log('PASS_TOURNAMENT21599_ALL_ELIGIBLE_OPPONENT_VOICES '+JSON.stringify({roster:26,eligibleOpponents:25,canonicalSamples:25,inherited,micchanOverride:result.micchanOverride,futureHostExcluded:true,uniqueSpeakers:new Set(result.rows.map(x=>x.speaker)).size,pageErrors:errs,rows:result.rows.map(x=>({name:x.name,rating:x.rating,eligibleCup:x.eligibleCup,equal:x.name==='みっちゃん'?null:x.text===x.baseSpeech,special:x.name==='みっちゃん'?x.text:''}))}));
}finally{
  await browser.close();
}
