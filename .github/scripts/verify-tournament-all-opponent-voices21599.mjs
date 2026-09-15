import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errs=[];
  page.on('pageerror',e=>errs.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?allOpponentVoices='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10&&window.AIShogiIOS?.characters?.().length===26,{timeout:30000});

  const init=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    if(!t.start('future'))throw new Error('future cup start failed');
    await delay(500);
    const roster=window.AIShogiIOS.characters().map(c=>({name:c.name,rating:Number(c.rating)||0}));
    const cups=t.cups();
    const targets=roster.filter(c=>c.name!=='未来からやってきたみつき').map(c=>({...c,eligibleCup:cups.find(x=>x.boss!==c.name&&c.rating<x.bossRating)?.id||''}));
    return{targets,rosterCount:roster.length,cups:cups.length};
  });

  const rows=[];
  for(const target of init.targets){
    const row=await page.evaluate(async({name,rating,eligibleCup})=>{
      const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(r=>setTimeout(r,ms));
      const KEY='aiShogiTournament21540';
      const canon=s=>{if(!s)return'';try{const u=new URL(s,location.href);return u.origin+u.pathname}catch{return String(s).split('?')[0]}};
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===name);
      const cardImg=card?.querySelector('img');
      const store=JSON.parse(localStorage.getItem(KEY)||'null');
      const a=store?.active;
      if(!a)throw new Error('active tournament missing '+name);
      a.status='active';a.pending=null;a.round=0;
      a.bossChallenge=a.bossChallenge||{};a.bossChallenge.status='locked';
      const bracketRow=a.bracket?.rounds?.[0];
      if(!Array.isArray(bracketRow))throw new Error('round0 missing '+name);
      const playerSlot=Number(a.playerSlot)||0,oppSlot=playerSlot^1;
      bracketRow[oppSlot]=name;
      localStorage.setItem(KEY,JSON.stringify(store));
      t.render();await delay(120);d.render();await delay(80);d.render();
      const baseSpeech=(document.getElementById('charSpeech')?.textContent||'').trim();
      const selected=(document.getElementById('oppName')?.textContent||'').trim();
      const box=document.getElementById('tourOpponentVoice21549'),img=box?.querySelector('img'),r=box?.getBoundingClientRect?.()||{};
      const text=(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim();
      return{name,rating,eligibleCup,selected,baseSpeech,text,speaker:box?.dataset.speaker||'',role:box?.dataset.role||'',round:box?.dataset.round||'',cardSrc:canon(cardImg?.currentSrc||cardImg?.src||''),voiceSrc:canon(img?.currentSrc||img?.src||''),complete:!!img?.complete,w:Number(img?.naturalWidth)||0,h:Number(r.height)||0,docked:box?.classList.contains('tourRoundBattleDock21550')===true,parent:box?.parentElement?.classList?.contains('side')?'side':'other'};
    },target);
    rows.push(row);
  }

  const micchanLines=new Set(['にゃんびー！','でんじゃーでんじゃーえまーじぇんしー！','にゃんびー警報、ぴこぴこぴー！','でんじゃー！こまこま大渋滞！','えまーじぇんしー！将棋が飛んでる！','にゃんびーにゃんびー、こまこまこま！']);
  const failures=[];
  if(init.rosterCount!==26)failures.push('roster '+init.rosterCount);
  if(init.cups!==10)failures.push('cups '+init.cups);
  if(rows.length!==25)failures.push('targets '+rows.length);
  if(new Set(rows.map(x=>x.name)).size!==25)failures.push('target uniqueness');
  for(const x of rows){
    if(!x.eligibleCup)failures.push('not tournament eligible '+x.name);
    if(!x.selected.startsWith(x.name))failures.push('base opponent selection '+JSON.stringify(x));
    if(!x.baseSpeech)failures.push('empty base speech '+x.name);
    if(x.speaker!==x.name||x.role!=='対戦相手・トーナメント参加者')failures.push('speaker role '+JSON.stringify(x));
    if(!x.cardSrc||x.voiceSrc!==x.cardSrc||!x.complete||x.w<1||x.h<1)failures.push('portrait '+JSON.stringify(x));
    if(!x.docked||x.parent!=='side')failures.push('dock '+JSON.stringify(x));
    if(x.name==='みっちゃん'){
      if(!micchanLines.has(x.text))failures.push('micchan override '+JSON.stringify(x));
    }else if(x.text!==x.baseSpeech){
      failures.push('voice inheritance '+JSON.stringify(x));
    }
  }
  if(errs.length)failures.push('page errors '+JSON.stringify(errs));
  if(failures.length)throw new Error(failures.join(' | '));

  const inherited=rows.filter(x=>x.name!=='みっちゃん'&&x.text===x.baseSpeech);
  const micchan=rows.find(x=>x.name==='みっちゃん');
  console.log('PASS_TOURNAMENT21599_ALL_ELIGIBLE_OPPONENT_VOICES '+JSON.stringify({roster:26,eligibleOpponents:25,inherited:inherited.length,micchanOverride:!!micchan&&micchanLines.has(micchan.text),futureHostExcluded:true,uniqueSpeakers:new Set(rows.map(x=>x.speaker)).size,pageErrors:errs,rows:rows.map(x=>({name:x.name,rating:x.rating,eligibleCup:x.eligibleCup,equal:x.name==='みっちゃん'?null:x.text===x.baseSpeech,special:x.name==='みっちゃん'?x.text:''}))}));
}finally{
  await browser.close();
}
