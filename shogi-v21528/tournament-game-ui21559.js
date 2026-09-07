/* みつき将棋 大会ゲーム演出 v2.15.59a
 * 表示専用。大会ロジック、AI、R、ブラケット座標、接続線本数は変更しない。
 * - 大会ヘッダー / 進捗
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
  const api=()=>window.AI_SHOGI_TOURNAMENT;
  const active=()=>{try{return api()?.state?.()?.active||null}catch(e){return null}};
  const cups=()=>{try{return api()?.cups?.()||[]}catch(e){return[]}};
  const cupFor=a=>cups().find(c=>c.id===a?.cupId)||null;

  function portrait(name){
    if(!name)return'';
    const cards=[...document.querySelectorAll('#chars .ch')];
    const card=cards.find(c=>clean(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt)===clean(name));
    const img=card?.querySelector('img');return img?.currentSrc||img?.src||'';
  }

  function ensureStyle(){
    if(document.getElementById('tournamentGameUI21559Style'))return;
    const s=document.createElement('style');s.id='tournamentGameUI21559Style';s.textContent=`
#tournament21540Panel .tourGameHero21559{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;margin:7px 0 8px;padding:10px 12px;border:1px solid #d7aa42;border-radius:14px;background:radial-gradient(circle at 12% 0%,rgba(255,216,104,.18),transparent 34%),linear-gradient(135deg,#172b23,#07130f 68%);box-shadow:0 7px 22px #0006,inset 0 0 0 1px rgba(255,232,161,.06)}
#tournament21540Panel .tourGameHero21559:after{content:'🏆';position:absolute;right:8px;bottom:-20px;font-size:72px;opacity:.055;transform:rotate(-10deg);pointer-events:none}
#tournament21540Panel .tourGameCup21559{font-size:16px;font-weight:1000;letter-spacing:.04em;color:#ffe8a5;text-shadow:0 1px 8px #000}
#tournament21540Panel .tourGameSub21559{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.tourGameChip21559{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border:1px solid #6f735d;border-radius:999px;background:#0a1713;color:#d7d3bd;font-size:10px;font-weight:800}.tourGameChip21559.now{border-color:#f0bd48;color:#ffe39a;box-shadow:0 0 10px rgba(245,188,61,.2)}
#tournament21540Panel .tourGameWins21559{text-align:center;min-width:72px;padding:6px 8px;border-left:1px solid rgba(255,224,135,.2)}#tournament21540Panel .tourGameWinsNum21559{font-size:22px;font-weight:1000;color:#fff0b8;line-height:1}#tournament21540Panel .tourGameWinsLabel21559{margin-top:3px;font-size:9px;color:#cbbd8c}
#tournament21540Panel .tourBossVault21559{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:8px;align-items:center;margin:6px 0 8px;padding:7px 9px;border:1px solid #6d5730;border-radius:12px;background:linear-gradient(90deg,#17150f,#0a1512);min-width:0}#tournament21540Panel .tourBossPortrait21559{width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #806734;background:#171b17;display:grid;place-items:center;font-size:20px;filter:grayscale(.75) brightness(.68)}#tournament21540Panel .tourBossPortrait21559 img{width:100%;height:100%;object-fit:cover;display:block}#tournament21540Panel .tourBossVault21559.unlocked .tourBossPortrait21559{filter:none;border-color:#e4b849;box-shadow:0 0 12px rgba(239,187,67,.35)}#tournament21540Panel .tourBossName21559{font-size:11px;font-weight:900;color:#e8d7a1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tournament21540Panel .tourBossHint21559{font-size:9px;color:#a89d7e;margin-top:2px}.tourBossLock21559{font-size:10px;font-weight:900;border:1px solid #615739;border-radius:999px;padding:3px 7px;color:#bbae80;white-space:nowrap}.unlocked .tourBossLock21559{border-color:#d3a642;color:#ffe097;background:#372b0f}
#tournament21540Panel .tourBracketRoundTitle{border:1px solid #5a5034;border-radius:999px;padding:3px 6px!important;background:linear-gradient(#1b241d,#0c1512);color:#cfc39a!important;text-align:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}#tournament21540Panel .tourBracketRound.tourGameCurrentRound21559 .tourBracketRoundTitle{border-color:#d8aa40;color:#ffe29a!important;background:linear-gradient(#3a2d10,#15170f);box-shadow:0 0 12px rgba(225,174,55,.2)}
#tournament21540Panel .tourBracketSlot{position:relative}#tournament21540Panel .tourBracketSlot.tourGameNow21559{z-index:5!important;outline:2px solid #f0bd48!important;box-shadow:0 0 0 2px rgba(240,189,72,.12),0 0 14px rgba(240,189,72,.32)!important}#tournament21540Panel .tourBracketSlot.tourGameNow21559:after{content:'NOW';position:absolute;right:3px;top:-8px;z-index:6;padding:1px 4px;border-radius:999px;background:#e4aa31;color:#1a1305;font-size:7px;font-weight:1000;line-height:1.25;box-shadow:0 1px 4px #0009}
#tournament21540Panel .tourWinStamp21559{position:absolute;right:2px;bottom:2px;z-index:6;pointer-events:none;padding:1px 4px;border:1px solid #d8b14b;border-radius:4px;background:rgba(42,32,7,.9);color:#ffe28a;font-size:7px;font-weight:1000;line-height:1.2;transform:rotate(-7deg);transform-origin:center}
#tournament21540Panel .tourBracketLines path.advanced{filter:drop-shadow(0 0 2px rgba(226,181,70,.7))}
#tournament21540Panel.tourFireFit .tourGameHero21559{margin:3px 0 4px;padding:5px 7px;border-radius:9px;gap:4px}#tournament21540Panel.tourFireFit .tourGameCup21559{font-size:11px}#tournament21540Panel.tourFireFit .tourGameSub21559{margin-top:2px;gap:2px}#tournament21540Panel.tourFireFit .tourGameChip21559{font-size:7px;min-height:15px;padding:0 4px}#tournament21540Panel.tourFireFit .tourGameWins21559{min-width:52px;padding:2px 4px}#tournament21540Panel.tourFireFit .tourGameWinsNum21559{font-size:15px}#tournament21540Panel.tourFireFit .tourGameWinsLabel21559{font-size:7px}#tournament21540Panel.tourFireFit .tourBossVault21559{grid-template-columns:30px minmax(0,1fr) auto;margin:2px 0 4px;padding:3px 5px;gap:5px;border-radius:8px}#tournament21540Panel.tourFireFit .tourBossPortrait21559{width:28px;height:28px}#tournament21540Panel.tourFireFit .tourBossName21559{font-size:8px}#tournament21540Panel.tourFireFit .tourBossHint21559,.tourFireFit .tourBossLock21559{font-size:7px}#tournament21540Panel.tourFireFit .tourBossLock21559{padding:1px 4px}
@media(max-width:520px){#tournament21540Panel .tourGameHero21559{padding:7px 8px}.tourGameCup21559{font-size:13px!important}#tournament21540Panel .tourBossVault21559{grid-template-columns:38px minmax(0,1fr) auto}#tournament21540Panel .tourBossPortrait21559{width:34px;height:34px}}
`;
    document.head.appendChild(s);
  }

  function removeOld(){document.querySelectorAll('.tourGameHero21559,.tourBossVault21559').forEach(x=>x.remove())}
  function stateLabel(a){
    const b=a?.bossChallenge?.status||'locked';
    if(b==='active')return'杯ボス戦';if(b==='pending')return'優勝・ボス解放';if(b==='draw')return'杯ボス指し直し';if(b==='won')return'完全制覇';if(b==='lost')return'ボス戦敗北';
    if(a?.status==='champion')return'トーナメント優勝';if(a?.status==='lost')return'敗退';if(a?.pending==='next')return (ROUND_NAMES[Math.max(0,Number(a.round)-1)]||'回戦')+'突破';return ROUND_NAMES[Number(a?.round)||0]||'大会中';
  }
  function winsLeft(a){
    if(!a)return 4;const b=a.bossChallenge?.status||'locked';if(b!=='locked'||a.status==='champion')return 0;return Math.max(0,4-(Number(a.round)||0)-(a.pending==='next'?1:0));
  }
  function bossUnlocked(a){const b=a?.bossChallenge?.status;return a?.status==='champion'||['pending','active','draw','won','lost'].includes(b)}

  function decorate(){
    ensureStyle();const a=active(),panel=document.getElementById('tournament21540Panel'),root=panel?.querySelector('.tourActive');
    if(!panel||!root||!a){removeOld();return false}
    const cup=cupFor(a);if(!cup)return false;
    removeOld();
    const hero=document.createElement('section');hero.className='tourGameHero21559';hero.dataset.gameUi='21559';
    const left=Math.max(0,winsLeft(a)),phase=stateLabel(a);
    hero.innerHTML='<div><div class="tourGameCup21559">🏆 '+cup.name+'</div><div class="tourGameSub21559"><span class="tourGameChip21559 now">'+phase+'</span><span class="tourGameChip21559">16人・4勝優勝</span><span class="tourGameChip21559">優勝後ボス戦</span></div></div><div class="tourGameWins21559"><div class="tourGameWinsNum21559">'+left+'</div><div class="tourGameWinsLabel21559">優勝まであと</div></div>';
    const title=root.querySelector('.tourActiveTitle');if(title)title.insertAdjacentElement('afterend',hero);else root.prepend(hero);

    const vault=document.createElement('section');vault.className='tourBossVault21559'+(bossUnlocked(a)?' unlocked':'');vault.dataset.outsideBracket='1';
    const src=portrait(cup.boss),locked=!bossUnlocked(a);
    vault.innerHTML='<div class="tourBossPortrait21559">'+(src?'<img src="'+src.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt="">':'👑')+'</div><div><div class="tourBossName21559">杯ボス '+cup.boss+'　R'+cup.bossRating+'</div><div class="tourBossHint21559">'+(locked?'トーナメント優勝で挑戦権を獲得':'トーナメント外・EX MATCH')+'</div></div><span class="tourBossLock21559">'+(locked?'🔒 優勝で解放':'⚔ 解放')+'</span>';
    const bracket=root.querySelector('.tourBracketWrap');if(bracket)bracket.insertAdjacentElement('beforebegin',vault);else root.appendChild(vault);

    const rounds=[...root.querySelectorAll('.tourBracketRound')];rounds.forEach((r,i)=>r.classList.toggle('tourGameCurrentRound21559',i===Number(a.round)&&Number(a.round)<4));
    const slots=[...root.querySelectorAll('.tourBracketSlot')];
    slots.forEach(s=>{s.classList.remove('tourGameNow21559');s.querySelector(':scope > .tourWinStamp21559')?.remove()});
    if(Number(a.round)<4&&['active','draw'].includes(a.status)&&!a.pending&&(a.bossChallenge?.status||'locked')==='locked'){
      const row=rounds[Number(a.round)],rowSlots=row?[...row.querySelectorAll('.tourBracketSlot')]:[],ps=Number(a.playerSlot)||0;[ps,ps^1].forEach(i=>rowSlots[i]?.classList.add('tourGameNow21559'));
    }
    for(let r=0;r<Math.min(4,rounds.length-1);r++){
      const srcSlots=[...rounds[r].querySelectorAll('.tourBracketSlot')],dstSlots=[...rounds[r+1].querySelectorAll('.tourBracketSlot')];
      srcSlots.forEach((s,i)=>{const name=clean(s.querySelector('.tourSlotName')?.textContent),next=clean(dstSlots[Math.floor(i/2)]?.querySelector('.tourSlotName')?.textContent);if(name&&name!=='—'&&next&&next===name){const stamp=document.createElement('span');stamp.className='tourWinStamp21559';stamp.textContent='WIN';s.appendChild(stamp)}});
    }
    return true;
  }

  let busy=false,raf=0;
  function request(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(busy)return;busy=true;try{decorate()}finally{busy=false}})}
  const observer=new MutationObserver(ms=>{if(busy)return;if(ms.every(m=>m.target?.closest?.('.tourGameHero21559,.tourBossVault21559,.tourWinStamp21559')))return;request()});
  function boot(){const panel=document.getElementById('tournament21540Panel');if(!panel)return false;observer.disconnect();observer.observe(panel,{childList:true,subtree:true,attributes:true});decorate();return true}
  let tries=0;const timer=setInterval(()=>{if(boot()||++tries>120)clearInterval(timer)},120);
  window.addEventListener('resize',request,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(request,120),{passive:true});window.addEventListener('ai-shogi-local-save',request);

  window.AI_SHOGI_TOURNAMENT_GAME_UI={version:'21559a',render:decorate,audit:()=>{const a=active(),panel=document.getElementById('tournament21540Panel'),hero=panel?.querySelector('.tourGameHero21559'),vault=panel?.querySelector('.tourBossVault21559'),bracket=panel?.querySelector('.tourBracket'),rounds=panel?[...panel.querySelectorAll('.tourBracketRound')]:[],stamps=panel?.querySelectorAll('.tourWinStamp21559')?.length||0,now=panel?.querySelectorAll('.tourGameNow21559')?.length||0;return{ok:!!hero&&!!vault,version:'21559a',cupId:a?.cupId||null,hero:!!hero,bossVault:!!vault,bossOutsideBracket:vault?.dataset.outsideBracket==='1'&&!bracket?.contains(vault),bossInBracket:!!(a&&cupFor(a)&&a.bracket?.rounds?.flat?.().includes(cupFor(a).boss)),roundPlates:rounds.length,currentMarkers:now,winnerStamps:stamps,connectors:panel?.querySelectorAll('.tourBracketLines path')?.length||0,roster:document.querySelectorAll('#chars .ch').length,sideOverflow:document.querySelector('.side')?Math.max(0,document.querySelector('.side').scrollWidth-document.querySelector('.side').clientWidth):0,docOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)}}};
})();