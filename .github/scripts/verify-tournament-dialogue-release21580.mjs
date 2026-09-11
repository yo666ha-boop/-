import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:280,height:760}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>{await d.accept()});
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?dialogueRelease21580='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:20000});
  await page.addStyleTag({content:'html{font-size:150%!important;-webkit-text-size-adjust:150%!important}body{-webkit-text-size-adjust:150%!important}'});

  const result=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    const started=!!t.start('future');
    await delay(260);
    const panel=document.getElementById('tournament21540Panel');
    if(panel&&!panel.classList.contains('on'))document.getElementById('tournament21540Btn')?.click();
    await delay(100);d.render();await delay(160);
    const box=document.getElementById('tourDialogue21547'),img=box?.querySelector('.tourDialoguePortrait img'),bubble=box?.querySelector('.tourDialogueBubble'),name=box?.querySelector('.tourDialogueName'),status=box?.querySelector('.tourDialogueStatus'),role=box?.querySelector('.tourDialogueRole');
    const opponent=document.getElementById('tourOpponentVoice21549'),opponentImg=opponent?.querySelector('.tourDialoguePortrait img'),opponentBubble=opponent?.querySelector('.tourDialogueBubble');
    const roster=window.AIShogiIOS?.characters?.()||[],future=roster.find(x=>x?.name==='未来からやってきたみつき');
    const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()==='未来からやってきたみつき');
    const opponentCard=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===opponent?.dataset.speaker);
    const real=card?.querySelector('img'),opponentReal=opponentCard?.querySelector('img'),rect=box?.getBoundingClientRect?.()||{width:0,height:0},opponentRect=opponent?.getBoundingClientRect?.()||{width:0,height:0};
    const px=e=>e?(parseFloat(getComputedStyle(e).fontSize)||0):0;
    const overflow=e=>e?Math.max(0,e.scrollWidth-e.clientWidth):0;
    const active=t.state()?.active||{},audit=d.audit?.()||{};
    const attrs=e=>({role:e?.getAttribute('role')||null,ariaLive:e?.getAttribute('aria-live')||null,ariaAtomic:e?.getAttribute('aria-atomic')||null,ariaLabel:e?.getAttribute('aria-label')||null});
    const out={started,roster:roster.length,futureRating:Number(future?.rating)||0,bossInBracket:(active?.bracket?.rounds?.[0]||[]).includes('未来からやってきたみつき'),context:audit.context||null,speaker:audit.speaker||null,roleText:box?.dataset.role||null,text:(bubble?.textContent||'').trim(),name:(name?.textContent||'').trim(),status:(status?.textContent||'').trim(),role:(role?.textContent||'').trim(),portraitSrc:img?.currentSrc||img?.src||'',realSrc:real?.currentSrc||real?.src||'',imageComplete:!!img?.complete,imageWidth:Number(img?.naturalWidth)||0,imageHeight:Number(img?.naturalHeight)||0,visible:!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0,boxWidth:Math.round(rect.width),boxHeight:Math.round(rect.height),fonts:{bubble:px(bubble),name:px(name),status:px(status),role:px(role)},overflow:{box:overflow(box),bubble:overflow(bubble),opponent:overflow(opponent),opponentBubble:overflow(opponentBubble),panel:overflow(panel),doc:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),body:Math.max(0,document.body.scrollWidth-document.body.clientWidth)},connectors:window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.()?.connectors??window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.audit?.()?.connectors??null,hostA11y:attrs(box),opponent:{speaker:opponent?.dataset.speaker||null,roleText:opponent?.dataset.role||null,text:(opponentBubble?.textContent||'').trim(),portraitSrc:opponentImg?.currentSrc||opponentImg?.src||'',realSrc:opponentReal?.currentSrc||opponentReal?.src||'',imageComplete:!!opponentImg?.complete,imageWidth:Number(opponentImg?.naturalWidth)||0,imageHeight:Number(opponentImg?.naturalHeight)||0,visible:!!opponent&&getComputedStyle(opponent).display!=='none'&&opponentRect.width>0&&opponentRect.height>0,a11y:attrs(opponent)},auditA11y:{host:{role:audit.ariaRole||null,ariaLive:audit.ariaLive||null,ariaAtomic:audit.ariaAtomic||null},opponent:{role:audit.opponentAriaRole||null,ariaLive:audit.opponentAriaLive||null,ariaAtomic:audit.opponentAriaAtomic||null,ariaLabel:audit.opponentAriaLabel||null}}};
    return out;
  });

  assert.equal(result.started,true);
  assert.equal(result.roster,26);
  assert.equal(result.futureRating,3400);
  assert.equal(result.bossInBracket,false);
  assert.equal(result.speaker,'未来からやってきたみつき');
  assert.equal(result.roleText,'大会主・トーナメント外');
  assert.ok(result.text&&result.name&&result.status&&result.role,'visible dialogue copy must be present');
  assert.equal(result.portraitSrc,result.realSrc,'dialogue must reuse the existing real 26-character portrait');
  assert.ok(result.imageComplete&&result.imageWidth>0&&result.imageHeight>0,'dialogue portrait must load');
  assert.equal(result.visible,true);
  assert.ok(result.boxWidth>0&&result.boxWidth<=280,'dialogue must fit the 280px viewport');
  for(const [k,v] of Object.entries(result.fonts))assert.ok(v>=8,`${k} text below 8px floor: ${v}`);
  for(const [k,v] of Object.entries(result.overflow))assert.equal(v,0,`${k} horizontal overflow: ${v}`);
  if(result.connectors!=null)assert.equal(result.connectors,30);

  assert.deepEqual(result.hostA11y,{role:'status',ariaLive:'polite',ariaAtomic:'true',ariaLabel:'大会キャラクターのセリフ'});
  assert.ok(result.opponent.speaker,'opponent dialogue speaker must exist');
  assert.equal(result.opponent.roleText,'対戦相手・トーナメント参加者');
  assert.ok(result.opponent.text,'opponent dialogue copy must be present');
  assert.equal(result.opponent.portraitSrc,result.opponent.realSrc,'opponent dialogue must reuse its existing character portrait');
  assert.ok(result.opponent.imageComplete&&result.opponent.imageWidth>0&&result.opponent.imageHeight>0,'opponent portrait must load');
  assert.equal(result.opponent.visible,true);
  assert.deepEqual(result.opponent.a11y,{role:'status',ariaLive:'polite',ariaAtomic:'true',ariaLabel:'大会の対戦相手のセリフ'});
  assert.deepEqual(result.auditA11y.host,{role:'status',ariaLive:'polite',ariaAtomic:'true'});
  assert.deepEqual(result.auditA11y.opponent,{role:'status',ariaLive:'polite',ariaAtomic:'true',ariaLabel:'大会の対戦相手のセリフ'});
  assert.deepEqual(errors,[]);
  console.log('PASS_TOURNAMENT21580_DIALOGUE_LIVE_REGIONS');
  console.log('PASS_TOURNAMENT21580_DIALOGUE_RELEASE_ACCEPTANCE '+JSON.stringify({...result,pageErrors:errors}));
}finally{
  await browser.close();
}
