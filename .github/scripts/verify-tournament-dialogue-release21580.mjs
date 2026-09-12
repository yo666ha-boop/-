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
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===10&&window.AI_SHOGI_TOURNAMENT_VISUAL?.version==='21590a',{timeout:20000});
  await page.addStyleTag({content:'html{font-size:150%!important;-webkit-text-size-adjust:150%!important}body{-webkit-text-size-adjust:150%!important}'});

  const result=await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,v=window.AI_SHOGI_TOURNAMENT_VISUAL,delay=ms=>new Promise(r=>setTimeout(r,ms));
    if(t.state()?.active)t.exit();
    const started=!!t.start('future');
    await delay(700);
    const panel=document.getElementById('tournament21540Panel');
    if(panel&&!panel.classList.contains('on'))document.getElementById('tournament21540Btn')?.click();
    await delay(250);d.render();v.refresh?.();await delay(450);
    const box=document.getElementById('tourDialogue21547'),img=box?.querySelector('.tourDialoguePortrait img'),bubble=box?.querySelector('.tourDialogueBubble'),name=box?.querySelector('.tourDialogueName'),status=box?.querySelector('.tourDialogueStatus'),role=box?.querySelector('.tourDialogueRole');
    const opponent=document.getElementById('tourOpponentVoice21549'),opponentImg=opponent?.querySelector('.tourDialoguePortrait img'),opponentBubble=opponent?.querySelector('.tourDialogueBubble'),opponentRoleBadge=opponent?.querySelector('.tourDialogueRole');
    const duplicate=document.getElementById('tourOpponentDialogue21592');
    const roster=window.AIShogiIOS?.characters?.()||[],future=roster.find(x=>x?.name==='未来からやってきたみつき');
    const card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()==='未来からやってきたみつき');
    const opponentCard=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===opponent?.dataset.speaker);
    const real=card?.querySelector('img'),opponentReal=opponentCard?.querySelector('img'),rect=box?.getBoundingClientRect?.()||{width:0,height:0},opponentRect=opponent?.getBoundingClientRect?.()||{width:0,height:0};
    const px=e=>e?(parseFloat(getComputedStyle(e).fontSize)||0):0;
    const overflow=e=>e?Math.max(0,e.scrollWidth-e.clientWidth):0;
    const active=t.state()?.active||{},audit=d.audit?.()||{},visualAudit=v.audit?.()||{};
    const attrs=e=>({role:e?.getAttribute('role')||null,ariaLive:e?.getAttribute('aria-live')||null,ariaAtomic:e?.getAttribute('aria-atomic')||null,ariaLabel:e?.getAttribute('aria-label')||null});
    const hostVisible=!!box&&getComputedStyle(box).display!=='none'&&rect.width>0&&rect.height>0;
    const opponentVisible=!!opponent&&getComputedStyle(opponent).display!=='none'&&opponentRect.width>0&&opponentRect.height>0;
    return {started,roster:roster.length,futureRating:Number(future?.rating)||0,bossInBracket:(active?.bracket?.rounds?.[0]||[]).includes('未来からやってきたみつき'),context:audit.context||null,speaker:audit.speaker||null,roleText:box?.dataset.role||null,text:(bubble?.textContent||'').trim(),name:(name?.textContent||'').trim(),status:(status?.textContent||'').trim(),role:(role?.textContent||'').trim(),portraitSrc:img?.currentSrc||img?.src||'',realSrc:real?.currentSrc||real?.src||'',imageComplete:!!img?.complete,imageWidth:Number(img?.naturalWidth)||0,imageHeight:Number(img?.naturalHeight)||0,hostVisible,boxWidth:Math.round(rect.width),boxHeight:Math.round(rect.height),fonts:{bubble:px(bubble),name:px(name),status:px(status),role:px(role),opponentBubble:px(opponentBubble),opponentRole:px(opponentRoleBadge)},overflow:{opponent:overflow(opponent),opponentBubble:overflow(opponentBubble),panel:overflow(panel),doc:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),body:Math.max(0,document.body.scrollWidth-document.body.clientWidth)},hostA11y:attrs(box),opponent:{id:opponent?.id||null,speaker:opponent?.dataset.speaker||null,roleText:opponent?.dataset.role||null,visualRole:opponent?.dataset.visualRole||null,roleBadge:(opponentRoleBadge?.textContent||'').trim(),text:(opponentBubble?.textContent||'').trim(),portraitSrc:opponentImg?.currentSrc||opponentImg?.src||'',realSrc:opponentReal?.currentSrc||opponentReal?.src||'',imageComplete:!!opponentImg?.complete,imageWidth:Number(opponentImg?.naturalWidth)||0,imageHeight:Number(opponentImg?.naturalHeight)||0,visible:opponentVisible,width:Math.round(opponentRect.width),height:Math.round(opponentRect.height),a11y:attrs(opponent)},duplicateOpponentCard:!!duplicate,visualAudit,auditA11y:{host:{role:audit.ariaRole||null,ariaLive:audit.ariaLive||null,ariaAtomic:audit.ariaAtomic||null},opponent:{role:audit.opponentAriaRole||null,ariaLive:audit.opponentAriaLive||null,ariaAtomic:audit.opponentAriaAtomic||null,ariaLabel:audit.opponentAriaLabel||null}}};
  });

  assert.equal(result.started,true);
  assert.equal(result.roster,26);
  assert.equal(result.futureRating,3400);
  assert.equal(result.bossInBracket,false);

  // The cup boss remains the tournament host in state, but is intentionally hidden during an ordinary bracket match.
  assert.equal(result.speaker,'未来からやってきたみつき');
  assert.equal(result.roleText,'大会主・トーナメント外');
  assert.ok(result.text&&result.name&&result.status&&result.role,'host dialogue copy must remain available for milestone/boss phases');
  assert.equal(result.portraitSrc,result.realSrc,'host dialogue must keep the existing real 26-character portrait');
  assert.ok(result.imageComplete&&result.imageWidth>0&&result.imageHeight>0,'host portrait must load even while hidden');
  assert.equal(result.hostVisible,false,'cup host must not be visually confused with the current bracket opponent');
  assert.deepEqual(result.hostA11y,{role:'status',ariaLive:'polite',ariaAtomic:'true',ariaLabel:'大会キャラクターのセリフ'});

  // Exactly one canonical participant card is the visible in-match speaker.
  assert.equal(result.duplicateOpponentCard,false,'duplicate 21592 opponent card must not exist');
  assert.equal(result.opponent.id,'tourOpponentVoice21549');
  assert.ok(result.opponent.speaker,'canonical opponent dialogue speaker must exist');
  assert.equal(result.opponent.roleText,'対戦相手・トーナメント参加者');
  assert.equal(result.opponent.visualRole,'対戦相手');
  assert.equal(result.opponent.roleBadge,'対戦相手');
  assert.ok(result.opponent.text,'opponent dialogue copy must be present');
  assert.equal(result.opponent.portraitSrc,result.opponent.realSrc,'opponent dialogue must reuse its existing character portrait');
  assert.ok(result.opponent.imageComplete&&result.opponent.imageWidth>0&&result.opponent.imageHeight>0,'opponent portrait must load');
  assert.equal(result.opponent.visible,true);
  assert.ok(result.opponent.width>0&&result.opponent.width<=280,'opponent dialogue must fit the 280px viewport');
  assert.deepEqual(result.opponent.a11y,{role:'status',ariaLive:'polite',ariaAtomic:'true',ariaLabel:'大会の対戦相手のセリフ'});
  assert.equal(result.visualAudit.opponentSpeaker,result.opponent.speaker);
  assert.equal(result.visualAudit.opponentRole,'対戦相手');

  for(const [k,v] of Object.entries(result.fonts))assert.ok(v>=8,`${k} text below 8px floor: ${v}`);
  for(const [k,v] of Object.entries(result.overflow))assert.equal(v,0,`${k} horizontal overflow: ${v}`);
  assert.deepEqual(result.auditA11y.host,{role:'status',ariaLive:'polite',ariaAtomic:'true'});
  assert.deepEqual(result.auditA11y.opponent,{role:'status',ariaLive:'polite',ariaAtomic:'true',ariaLabel:'大会の対戦相手のセリフ'});
  assert.deepEqual(errors,[]);
  console.log('PASS_TOURNAMENT_DIALOGUE_RELEASE21580');
  console.log('PASS_TOURNAMENT21580_CANONICAL_OPPONENT_SPEAKER');
  console.log('PASS_TOURNAMENT21580_DIALOGUE_LIVE_REGIONS');
  console.log('PASS_TOURNAMENT21580_DIALOGUE_RELEASE_ACCEPTANCE '+JSON.stringify({...result,pageErrors:errors}));
}finally{
  await browser.close();
}