/* みつき将棋 大会ゲーム演出 v2.15.59a
 * 表示専用。大会ロジック、AI、R、ブラケット座標、接続線本数は変更しない。
 * - 大会ヘッダー / 進捗
 * - 実画像付き「あなた VS 現在の相手」カード
 * - 現在対戦カード NOW
 * - 勝者 WIN スタンプ
 * - ラウンドプレート
 * - ブラケット外の杯ボス待機パネル
 */
(function installTournamentGameUI21559(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_GAME_UI_21559A)return;
  window.__AI_SHOGI_TOURNAMENT_GAME_UI_21559A=true;

  const PLAYER='__PLAYER__';
  const ROUND_NAMES=['1回戦','準々決勝','準決勝','決勝','優勝'];
  const clean=s=>String(s||'').replace(/[👑🏆]/gu,'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const api=()=>window.AI_SHOGI_TOURNAMENT;
  const store=()=>{try{return api()?.state?.()||null}catch(e){return null}};
  const active=()=>store()?.active||null;
  const cups=()=>{try{return api()?.cups?.()||[]}catch(e){return[]}};
  const navReload=()=>{try{return performance.getEntriesByType('navigation')?.[0]?.type==='reload'}catch(e){return false}};
  const restoredStartedAt=navReload()?(Number(active()?.startedAt)||0):0;
  const attemptCount=a=>{const h=store()?.history;return a?.cupId&&Array.isArray(h)?h.filter(x=>x?.cupId===a.cupId).length:0};
  const cupFor=a=>cups().find(c=>c.id===a?.cupId)||null;
  const characters=()=>{try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}};
  const playerRating=()=>{try{return Number(window.AIShogiIOS?.stats?.()?.rating)||1500}catch(e){return 1500}};
  const ratingOf=name=>Number(characters().find(c=>clean(c?.name)===clean(name))?.rating)||null;

  function portrait(name){
    if(!name)return'';
    const cards=[...document.querySelectorAll('#chars .ch')];
    const card=cards.find(c=>clean(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt)===clean(name));
    const img=card?.querySelector('img');return img?.currentSrc||img?.src||'';
  }
  function matchupOpponent(a,cup){
    if(!a||!cup)return null;
    const b=a.bossChallenge?.status||'locked';
    if(b!=='locked'||['boss_pending','boss_active','boss_draw','boss_lost','champion'].includes(a.status))return cup.boss;
    const row=a.bracket?.rounds?.[Number(a.round)||0];
    return Array.isArray(row)?row[(Number(a.playerSlot)||0)^1]||a.lastOpponent||null:a.lastOpponent||null;
  }
  function portraitInRoster(src){
    if(!src)return false;
    return [...document.querySelectorAll('#chars .ch img')].some(img=>(img.currentSrc||img.src||'')===src);
  }

  function ensureStyle(){
    if(document.getElementById('tournamentGameUI21559Style'))return;
    const s=document.createElement('style');s.id='tournamentGameUI21559Style';s.textContent=`
#tournament21540Panel .tourGameHero21559{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;margin:7px 0 8px;padding:10px 12px;border:1px solid #d7aa42;border-radius:14px;background:radial-gradient(circle at 12% 0%,rgba(255,216,104,.18),transparent 34%),linear-gradient(135deg,#172b23,#07130f 68%);box-shadow:0 7px 22px #0006,inset 0 0 0 1px rgba(255,232,161,.06)}
#tournament21540Panel .tourGameHero21559:after{content:'🏆';position:absolute;right:8px;bottom:-20px;font-size:72px;opacity:.055;transform:rotate(-10deg);pointer-events:none}
#tournament21540Panel .tourGameCup21559{font-size:16px;font-weight:1000;letter-spacing:.04em;color:#ffe8a5;text-shadow:0 1px 8px #000}
#tournament21540Panel .tourGameSub21559{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.tourGameChip21559{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border:1px solid #6f735d;border-radius:999px;background:#0a1713;color:#d7d3bd;font-size:10px;font-weight:800}.tourGameChip21559.now{border-color:#f0bd48;color:#ffe39a;box-shadow:0 0 10px rgba(245,188,61,.2)}
#tournament21540Panel .tourGameWins21559{text-align:center;min-width:72px;padding:6px 8px;border-left:1px solid rgba(255,224,135,.2)}#tournament21540Panel .tourGameWinsNum21559{font-size:22px;font-weight:1000;color:#fff0b8;line-height:1}#tournament21540Panel .tourGameWinsLabel21559{margin-top:3px;font-size:9px;color:#cbbd8c}
#tournament21540Panel .tourMatchup21559{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:7px;align-items:center;margin:5px 0 7px;padding:7px 9px;border:1px solid #38564b;border-radius:12px;background:linear-gradient(90deg,#0a1713,#111c17 48%,#0a1713);min-width:0;overflow:hidden}#tournament21540Panel .tourMatchSide21559{display:grid;grid-template-columns:42px minmax(0,1fr);gap:7px;align-items:center;min-width:0}#tournament21540Panel .tourMatchSide21559.opponent{grid-template-columns:minmax(0,1fr) 42px;text-align:right}#tournament21540Panel .tourMatchPortrait21559{width:40px;height:40px;border-radius:50%;overflow:hidden;border:2px solid #6b7b6e;background:#17221d;display:grid;place-items:center;font-size:9px;font-weight:1000;color:#e6ddbd;letter-spacing:.04em}#tournament21540Panel .tourMatchPortrait21559 img{width:100%;height:100%;object-fit:cover;display:block}#tournament21540Panel .tourMatchPortrait21559.opponent{border-color:#d2a744;box-shadow:0 0 9px rgba(210,167,68,.18)}#tournament21540Panel .tourMatchName21559{font-size:11px;font-weight:1000;color:#f3e9c5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tournament21540Panel .tourMatchMeta21559{font-size:9px;color:#aaa083;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tournament21540Panel .tourMatchVs21559{text-align:center;font-size:15px;font-weight:1000;font-style:italic;color:#f0bd48;text-shadow:0 0 8px rgba(240,189,72,.3)}#tournament21540Panel .tourMatchVs21559 small{display:block;font-size:7px;font-style:normal;color:#9e9273;letter-spacing:.08em;margin-top:1px}
#tournament21540Panel .tourBossVault21559{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:8px;align-items:center;margin:6px 0 8px;padding:7px 9px;border:1px solid #6d5730;border-radius:12px;background:linear-gradient(90deg,#17150f,#0a1512);min-width:0}#tournament21540Panel .tourBossPortrait21559{width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #806734;background:#171b17;display:grid;place-items:center;font-size:20px;filter:grayscale(.75) brightness(.68)}#tournament21540Panel .tourBossPortrait21559 img{width:100%;height:100%;object-fit:cover;display:block}#tournament21540Panel .tourBossVault21559.unlocked .tourBossPortrait21559{filter:none;border-color:#e4b849;box-shadow:0 0 12px rgba(239,187,67,.35)}#tournament21540Panel .tourBossName21559{font-size:11px;font-weight:900;color:#e8d7a1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tournament21540Panel .tourBossHint21559{font-size:9px;color:#a89d7e;margin-top:2px}.tourBossLock21559{font-size:10px;font-weight:900;border:1px solid #615739;border-radius:999px;padding:3px 7px;color:#bbae80;white-space:nowrap}.unlocked .tourBossLock21559{border-color:#d3a642;color:#ffe097;background:#372b0f}
#tournament21540Panel .tourBracketRoundTitle{border:1px solid #5a5034;border-radius:999px;padding:3px 6px!important;background:linear-gradient(#1b241d,#0c1512);color:#cfc39a!important;text-align:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}#tournament21540Panel .tourBracketRound.tourGameCurrentRound21559 .tourBracketRoundTitle{border-color:#d8aa40;color:#ffe29a!important;background:linear-gradient(#3a2d10,#15170f);box-shadow:0 0 12px rgba(225,174,55,.2)}
#tournament21540Panel .tourBracketSlot{position:relative}#tournament21540Panel .tourBracketSlot.tourGameNow21559{z-index:5!important;outline:2px solid #f0bd48!important;box-shadow:0 0 0 2px rgba(240,189,72,.12),0 0 14px rgba(240,189,72,.32)!important}#tournament21540Panel .tourBracketSlot.tourGameNow21559:after{content:'NOW';position:absolute;right:3px;top:-8px;z-index:6;padding:1px 4px;border-radius:999px;background:#e4aa31;color:#1a1305;font-size:7px;font-weight:1000;line-height:1.25;box-shadow:0 1px 4px #0009}
#tournament21540Panel .tourWinStamp21559{position:absolute;right:2px;bottom:2px;z-index:6;pointer-events:none;padding:1px 4px;border:1px solid #d8b14b;border-radius:4px;background:rgba(42,32,7,.9);color:#ffe28a;font-size:7px;font-weight:1000;line-height:1.2;transform:rotate(-7deg);transform-origin:center}
#tournament21540Panel .tourBracketLines path.advanced{filter:drop-shadow(0 0 2px rgba(226,181,70,.7))}
#tournament21540Panel.tourFireFit .tourGameHero21559{margin:3px 0 4px;padding:5px 7px;border-radius:9px;gap:4px}#tournament21540Panel.tourFireFit .tourGameCup21559{font-size:11px}#tournament21540Panel.tourFireFit .tourGameSub21559{margin-top:2px;gap:2px}#tournament21540Panel.tourFireFit .tourGameChip21559{font-size:7px;min-height:15px;padding:0 4px}#tournament21540Panel.tourFireFit .tourGameWins21559{min-width:52px;padding:2px 4px}#tournament21540Panel.tourFireFit .tourGameWinsNum21559{font-size:15px}#tournament21540Panel.tourFireFit .tourGameWinsLabel21559{font-size:7px}#tournament21540Panel.tourFireFit .tourMatchup21559{margin:2px 0 3px;padding:3px 5px;gap:3px;border-radius:8px}#tournament21540Panel.tourFireFit .tourMatchSide21559{grid-template-columns:28px minmax(0,1fr);gap:3px}#tournament21540Panel.tourFireFit .tourMatchSide21559.opponent{grid-template-columns:minmax(0,1fr) 28px}#tournament21540Panel.tourFireFit .tourMatchPortrait21559{width:26px;height:26px;font-size:6px}#tournament21540Panel.tourFireFit .tourMatchName21559{font-size:7px}#tournament21540Panel.tourFireFit .tourMatchMeta21559{font-size:6px;margin-top:0}#tournament21540Panel.tourFireFit .tourMatchVs21559{font-size:10px}#tournament21540Panel.tourFireFit .tourMatchVs21559 small{font-size:5px}#tournament21540Panel.tourFireFit .tourBossVault21559{grid-template-columns:30px minmax(0,1fr) auto;margin:2px 0 4px;padding:3px 5px;gap:5px;border-radius:8px}#tournament21540Panel.tourFireFit .tourBossPortrait21559{width:28px;height:28px}#tournament21540Panel.tourFireFit .tourBossName21559{font-size:8px}#tournament21540Panel.tourFireFit .tourBossHint21559,.tourFireFit .tourBossLock21559{font-size:7px}#tournament21540Panel.tourFireFit .tourBossLock21559{padding:1px 4px}
@media(max-width:520px){#tournament21540Panel .tourGameHero21559{padding:7px 8px}.tourGameCup21559{font-size:13px!important}#tournament21540Panel .tourMatchup21559{padding:5px 6px;gap:4px}#tournament21540Panel .tourMatchSide21559{grid-template-columns:34px minmax(0,1fr);gap:4px}#tournament21540Panel .tourMatchSide21559.opponent{grid-template-columns:minmax(0,1fr) 34px}#tournament21540Panel .tourMatchPortrait21559{width:32px;height:32px}#tournament21540Panel .tourMatchName21559{font-size:9px}#tournament21540Panel .tourMatchMeta21559{font-size:7px}#tournament21540Panel .tourBossVault21559{grid-template-columns:38px minmax(0,1fr) auto}#tournament21540Panel .tourBossPortrait21559{width:34px;height:34px}}
`;
    document.head.appendChild(s);
  }

  function removeOld(){document.querySelectorAll('.tourGameHero21559,.tourMatchup21559,.tourBossVault21559').forEach(x=>x.remove())}
  function stateLabel(a){
    const b=a?.bossChallenge?.status||'locked';
    if(b==='active')return'杯ボス戦';if(b==='pending')return'優勝・ボス解放';if(b==='draw')return'杯ボス指し直し';if(b==='won')return'完全制覇';if(b==='lost')return'ボス戦敗北';
    if(a?.status==='champion')return'トーナメント優勝';if(a?.status==='lost')return'敗退';if(a?.pending==='next')return (ROUND_NAMES[Math.max(0,Number(a.round)-1)]||'回戦')+'突破';return ROUND_NAMES[Number(a?.round)||0]||'大会中';
  }
  function winsLeft(a){
    if(!a)return 4;const b=a.bossChallenge?.status||'locked';if(b!=='locked'||a.status==='champion')return 0;return Math.max(0,4-(Number(a.round)||0)-(a.pending==='next'?1:0));
  }
  function progressMetric(a){
    const b=a?.bossChallenge?.status||'locked';
    if(b==='pending')return{value:'EX',label:'杯ボス解放'};
    if(b==='active'||b==='draw')return{value:'5戦目',label:b==='draw'?'杯ボス指し直し':'杯ボス挑戦中'};
    if(b==='won')return{value:'🏆',label:'完全制覇'};
    if(b==='lost')return{value:'EX',label:'ボス戦終了'};
    if(a?.status==='champion')return{value:'EX',label:'杯ボス解放'};
    return{value:String(Math.max(0,winsLeft(a))),label:'優勝まであと'};
  }
  function bossUnlocked(a){const b=a?.bossChallenge?.status;return a?.status==='champion'||['pending','active','draw','won','lost'].includes(b)}

  function decorate(){
    ensureStyle();const a=active(),panel=document.getElementById('tournament21540Panel'),root=panel?.querySelector('.tourActive');
    if(!panel||!root||!a){removeOld();return false}
    const cup=cupFor(a);if(!cup)return false;
    removeOld();
    const hero=document.createElement('section');hero.className='tourGameHero21559';hero.dataset.gameUi='21559';
    const progress=progressMetric(a),phase=stateLabel(a);
    const attempts=Math.max(1,attemptCount(a)),resume=restoredStartedAt>0&&Number(a?.startedAt)===restoredStartedAt;
    hero.innerHTML='<div><div class="tourGameCup21559">🏆 '+esc(cup.name)+'</div><div class="tourGameSub21559"><span class="tourGameChip21559 now">'+esc(phase)+'</span><span class="tourGameChip21559">16人・4勝優勝</span><span class="tourGameChip21559">優勝後ボス戦</span><span class="tourGameChip21559" data-tour-attempt="1">この杯 '+attempts+'回目</span>'+(resume?'<span class="tourGameChip21559 now" data-tour-resume="1">↻ 再開中</span>':'')+'</div></div><div class="tourGameWins21559"><div class="tourGameWinsNum21559">'+esc(progress.value)+'</div><div class="tourGameWinsLabel21559">'+esc(progress.label)+'</div></div>';
    const title=root.querySelector('.tourActiveTitle');if(title)title.insertAdjacentElement('afterend',hero);else root.prepend(hero);

    const opponent=matchupOpponent(a,cup),oppSrc=portrait(opponent),oppRating=opponent===cup.boss?cup.bossRating:ratingOf(opponent),bossMatch=opponent===cup.boss&&(a.bossChallenge?.status||'locked')!=='locked';
    if(opponent){
      const match=document.createElement('section');match.className='tourMatchup21559';match.dataset.opponent=opponent;match.dataset.boss=bossMatch?'1':'0';
      match.innerHTML='<div class="tourMatchSide21559 player"><div class="tourMatchPortrait21559 player" aria-label="あなた">YOU</div><div><div class="tourMatchName21559">あなた</div><div class="tourMatchMeta21559">R'+playerRating()+'</div></div></div><div class="tourMatchVs21559">VS<small>'+(bossMatch?'EX MATCH':esc(ROUND_NAMES[Number(a.round)||0]||'対局'))+'</small></div><div class="tourMatchSide21559 opponent"><div><div class="tourMatchName21559">'+esc(opponent)+'</div><div class="tourMatchMeta21559">R'+(oppRating||'—')+(bossMatch?' 👑':'')+'</div></div><div class="tourMatchPortrait21559 opponent">'+(oppSrc?'<img src="'+esc(oppSrc)+'" alt="'+esc(opponent)+'">':esc(Array.from(String(opponent))[0]||'?'))+'</div></div>';
      hero.insertAdjacentElement('afterend',match);
    }

    const vault=document.createElement('section');vault.className='tourBossVault21559'+(bossUnlocked(a)?' unlocked':'');vault.dataset.outsideBracket='1';
    const src=portrait(cup.boss),locked=!bossUnlocked(a);
    vault.innerHTML='<div class="tourBossPortrait21559">'+(src?'<img src="'+esc(src)+'" alt="">':'👑')+'</div><div><div class="tourBossName21559">杯ボス '+esc(cup.boss)+'　R'+cup.bossRating+'</div><div class="tourBossHint21559">'+(locked?'トーナメント優勝で挑戦権を獲得':'トーナメント外・EX MATCH')+'</div></div><span class="tourBossLock21559">'+(locked?'🔒 優勝で解放':'⚔ 解放')+'</span>';
    const bracket=root.querySelector('.tourBracketWrap');if(bracket)bracket.insertAdjacentElement('beforebegin',vault);else root.appendChild(vault);

    const rounds=[...root.querySelectorAll('.tourBracketRound')];rounds.forEach((r,i)=>r.classList.toggle('tourGameCurrentRound21559',i===Number(a.round)&&Number(a.round)<4));
    const slots=[...root.querySelectorAll('.tourBracketSlot')];
    slots.forEach(s=>{s.classList.remove('tourGameNow21559');s.querySelector(':scope > .tourWinStamp21559')?.remove()});
    if(Number(a.round)<4&&['active','draw'].includes(a.status)&&!a.pending&&(a.bossChallenge?.status||'locked')==='locked'){
      const row=rounds[Number(a.round)],rowSlots=row?[...row.querySelectorAll('.tourBracketSlot')]:[],ps=Number(a.playerSlot)||0;[ps,ps^1].forEach(i=>rowSlots[i]?.classList.add('tourGameNow21559'));
    }
    const stamp=s=>{if(!s||s.querySelector(':scope > .tourWinStamp21559'))return;const mark=document.createElement('span');mark.className='tourWinStamp21559';mark.textContent='WIN';s.appendChild(mark)};
    slots.filter(s=>s.classList.contains('tourAdvanced')).forEach(stamp);
    if(a.pending==='next'&&Number(a.round)<4){
      const row=rounds[Number(a.round)],rowSlots=row?[...row.querySelectorAll('.tourBracketSlot')]:[],ps=Number(a.playerSlot)||0;stamp(rowSlots[ps]);
    }
    return true;
  }

  let busy=false,raf=0;
  function request(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(busy)return;busy=true;try{decorate()}finally{busy=false}})}
  const observer=new MutationObserver(ms=>{if(busy)return;if(ms.every(m=>m.target?.closest?.('.tourGameHero21559,.tourMatchup21559,.tourBossVault21559,.tourWinStamp21559')))return;request()});
  function boot(){const panel=document.getElementById('tournament21540Panel');if(!panel)return false;observer.disconnect();observer.observe(panel,{childList:true,subtree:true,attributes:true});decorate();return true}
  let tries=0;const timer=setInterval(()=>{if(boot()||++tries>120)clearInterval(timer)},120);
  window.addEventListener('resize',request,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(request,120),{passive:true});window.addEventListener('ai-shogi-local-save',request);

  window.AI_SHOGI_TOURNAMENT_GAME_UI={version:'21559a',render:decorate,audit:()=>{const a=active(),panel=document.getElementById('tournament21540Panel'),hero=panel?.querySelector('.tourGameHero21559'),match=panel?.querySelector('.tourMatchup21559'),oppImg=match?.querySelector('.tourMatchSide21559.opponent img'),oppSrc=oppImg?.currentSrc||oppImg?.src||'',vault=panel?.querySelector('.tourBossVault21559'),bracket=panel?.querySelector('.tourBracket'),rounds=panel?[...panel.querySelectorAll('.tourBracketRound')]:[],stamps=panel?.querySelectorAll('.tourWinStamp21559')?.length||0,now=panel?.querySelectorAll('.tourGameNow21559')?.length||0;return{ok:!!hero&&!!vault,version:'21559a',cupId:a?.cupId||null,hero:!!hero,matchupCard:!!match,matchupOpponent:match?.dataset.opponent||'',matchupBoss:match?.dataset.boss==='1',matchupPortrait:!!oppImg,matchupPortraitCatalogMatch:portraitInRoster(oppSrc),matchupPlayerRating:playerRating(),matchupOpponentRating:Number((match?.querySelector('.tourMatchSide21559.opponent .tourMatchMeta21559')?.textContent||'').match(/R(\d+)/)?.[1])||null,matchupOverflow:match?Math.max(0,match.scrollWidth-match.clientWidth):0,bossVault:!!vault,bossOutsideBracket:vault?.dataset.outsideBracket==='1'&&!bracket?.contains(vault),bossInBracket:!!(a&&cupFor(a)&&a.bracket?.rounds?.flat?.().includes(cupFor(a).boss)),roundPlates:rounds.length,currentMarkers:now,winnerStamps:stamps,progressValue:hero?.querySelector('.tourGameWinsNum21559')?.textContent||'',progressLabel:hero?.querySelector('.tourGameWinsLabel21559')?.textContent||'',attemptCount:Number(hero?.querySelector('[data-tour-attempt]')?.textContent?.match(/(\d+)回目/)?.[1])||0,resumeChip:!!hero?.querySelector('[data-tour-resume]'),connectors:panel?.querySelectorAll('.tourBracketLines path')?.length||0,roster:document.querySelectorAll('#chars .ch').length,sideOverflow:document.querySelector('.side')?Math.max(0,document.querySelector('.side').scrollWidth-document.querySelector('.side').clientWidth):0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)}}};
})();

/* 21561: 勝ち上がり直後、次のAI戦が未決着でもVSカードを消さない表示補助。
 * 大会ロジックには触れず、相手確定時は既存21560実画像カードへ自動復帰する。
 */
(function installTournamentNextOpponentWait21561(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_NEXT_OPPONENT_WAIT_21561)return;
  window.__AI_SHOGI_TOURNAMENT_NEXT_OPPONENT_WAIT_21561=true;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const api=()=>window.AI_SHOGI_TOURNAMENT;
  const active=()=>{try{return api()?.state?.()?.active||null}catch(e){return null}};
  const playerRating=()=>{try{return Number(window.AIShogiIOS?.stats?.()?.rating)||1500}catch(e){return 1500}};
  function waiting(a){
    if(!a||a.status!=='active'||a.pending!=='next'||Number(a.round)>=4||(a.bossChallenge?.status||'locked')!=='locked')return false;
    const row=a.bracket?.rounds?.[Number(a.round)||0];
    return Array.isArray(row)&&!row[(Number(a.playerSlot)||0)^1];
  }
  function ensureStyle(){
    if(document.getElementById('tournamentNextOpponentWait21561Style'))return;
    const s=document.createElement('style');s.id='tournamentNextOpponentWait21561Style';s.textContent=`
#tournament21540Panel .tourMatchup21559.tourMatchWaiting21561{border-style:dashed;border-color:#7f7655;background:linear-gradient(90deg,#0a1713,#161914 48%,#0a1713)}
#tournament21540Panel .tourMatchWaiting21561 .tourMatchPortrait21559.opponent{border-color:#706b57;box-shadow:none;color:#d8cb99;font-size:14px;letter-spacing:.12em}
#tournament21540Panel .tourMatchWaiting21561 .tourMatchName21559{color:#ddd3af}
#tournament21540Panel .tourMatchWaiting21561 .tourMatchMeta21559{color:#928a70}
#tournament21540Panel .tourMatchWaitPulse21561{display:inline-block;animation:tourWaitPulse21561 1.15s ease-in-out infinite}
@keyframes tourWaitPulse21561{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:1;transform:scale(1.05)}}
@media(prefers-reduced-motion:reduce){#tournament21540Panel .tourMatchWaitPulse21561{animation:none}}
`;
    document.head.appendChild(s);
  }
  function renderWait(){
    ensureStyle();
    const a=active(),panel=document.getElementById('tournament21540Panel'),root=panel?.querySelector('.tourActive');
    if(!panel||!root||!waiting(a))return false;
    if(root.querySelector('.tourMatchup21559'))return false;
    const hero=root.querySelector('.tourGameHero21559');if(!hero)return false;
    const match=document.createElement('section');
    match.className='tourMatchup21559 tourMatchWaiting21561';match.dataset.opponent='';match.dataset.boss='0';match.dataset.waiting='1';
    match.innerHTML='<div class="tourMatchSide21559 player"><div class="tourMatchPortrait21559 player" aria-label="あなた">YOU</div><div><div class="tourMatchName21559">あなた</div><div class="tourMatchMeta21559">R'+playerRating()+'</div></div></div><div class="tourMatchVs21559">VS<small>NEXT MATCH</small></div><div class="tourMatchSide21559 opponent"><div><div class="tourMatchName21559">対戦相手 決定待ち</div><div class="tourMatchMeta21559">他の対局結果を待っています</div></div><div class="tourMatchPortrait21559 opponent"><span class="tourMatchWaitPulse21561">•••</span></div></div>';
    hero.insertAdjacentElement('afterend',match);return true;
  }
  function install(){
    const base=window.AI_SHOGI_TOURNAMENT_GAME_UI;if(!base||base.__wait21561)return false;
    base.__wait21561=true;
    const oldRender=base.render.bind(base),oldAudit=base.audit.bind(base);
    base.render=()=>{const out=oldRender();renderWait();return out};
    base.audit=()=>{renderWait();const out=oldAudit(),match=document.querySelector('#tournament21540Panel .tourMatchup21559');return{...out,matchupWaiting:match?.dataset.waiting==='1',matchupOpponentLabel:match?.querySelector('.tourMatchSide21559.opponent .tourMatchName21559')?.textContent||'',matchupOpponentMeta:match?.querySelector('.tourMatchSide21559.opponent .tourMatchMeta21559')?.textContent||''}};
    renderWait();setInterval(renderWait,250);return true;
  }
  let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},100);
})();

/* 21562 companion loader: production/preview file-name path only.
 * Mock game.js regressions stay isolated; real tournament-game-ui21559.js loads the display-only road tracker.
 */
(function loadTournamentRoad21562(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_ROAD_LOADER_21562)return;
  const here=document.currentScript?.src||'';
  let src='';
  if(/tournament-game-ui21559\.js(?:[?#]|$)/.test(here)){
    src=here.replace(/tournament-game-ui21559\.js(?:[?#].*)?$/,'tournament-road21562.js?v=21562');
  }else if(/\/shogi-v21528\/(?:index\.html)?$/.test(location.pathname)){
    src=new URL('tournament-road21562.js?v=21562',location.href).href;
  }else return;
  window.__AI_SHOGI_TOURNAMENT_ROAD_LOADER_21562=true;
  if(window.__AI_SHOGI_TOURNAMENT_ROAD_21562)return;
  if(!src||[...document.scripts].some(s=>s.src===src))return;
  const tag=document.createElement('script');tag.src=src;tag.async=false;tag.dataset.tournamentRoad='21562';
  document.head.appendChild(tag);
})();

/* 21563: 大会再開/同杯挑戦回数の表示補助。大会ロジック・保存形式は変更しない。 */