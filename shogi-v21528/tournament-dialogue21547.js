/* みつき将棋 大会画像付き状況セリフ v2.15.47d
 * 杯ボスはトーナメント参加者ではなく「大会主」として実況し、優勝後だけ対局相手になる。
 * 既存26キャラ画像を再利用。状況変化時だけ台詞を選び、直近5件の同一台詞を避ける。
 * ボス戦の優勢/劣勢はAI先生の表示評価を優先し、未解析時だけ本体と同じ駒価値の駒得差を補助判定に使う。
 * 4勝直後は「16人トーナメント優勝」を独立表示し、その後「杯ボス挑戦前」へ遷移する。
 */
(function installTournamentDialogue21547(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_DIALOGUE_21547D)return;
  window.__AI_SHOGI_TOURNAMENT_DIALOGUE_21547D=true;

  const KEY='aiShogiTournament21540';
  const HISTORY_KEY='aiShogiTournamentDialogue21547';
  const PLAYER='__PLAYER__';
  const ROUNDS=['1回戦','準々決勝','準決勝','決勝'];
  const CUP_BOSS={shinji:'しんじ',ayanami:'あやなみ',kenshiro:'ケンシロウ',kaworu:'カヲル',akiou:'あき王',micchan:'みっちゃん',mitsuki:'みつき',future:'未来からやってきたみつき'};
  const CUP_NAME={shinji:'しんじ杯',ayanami:'あやなみ杯',kenshiro:'ケンシロウ杯',kaworu:'カヲル杯',akiou:'あき王杯',micchan:'みっちゃん杯',mitsuki:'みつき杯',future:'未来みつき杯'};
  const MATERIAL_VAL={P:100,L:280,N:300,S:420,G:500,B:700,R:850,K:20000,'+P':500,'+L':500,'+N':500,'+S':500,'+B':900,'+R':1050};
  const bank=()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE_BANK;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const readHistory=()=>{try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||'null');return x&&typeof x==='object'?x:{version:1,byKey:{}}}catch(e){return{version:1,byKey:{}}}};
  const writeHistory=x=>{try{localStorage.setItem(HISTORY_KEY,JSON.stringify(x));return true}catch(e){return false}};
  const chars=()=>{try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}};
  const gameState=()=>{try{return window.AIShogiIOS?.state?.()||null}catch(e){return null}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  let lastSignature='',lastPick=null,lastOpponent='',opponentSince=0,lastCup='',cupSince=0,observer=null;

  function cardName(card){return (card?.querySelector?.('.chName')?.textContent||card?.querySelector?.('img')?.alt||'').trim()}
  function portrait(name){
    const roster=chars(),idx=roster.findIndex(c=>c?.name===name),cards=[...document.querySelectorAll('#chars .ch')];
    let card=cards.find(c=>cardName(c)===name);if(!card&&idx>=0)card=cards[idx];
    const img=card?.querySelector('img');return img?.currentSrc||img?.src||'';
  }
  function rating(name){if(!name||name===PLAYER)return null;const c=chars().find(x=>x?.name===name);return Number(c?.rating)||null}
  function display(name){return name===PLAYER?'あなた':String(name||'未定')}
  function currentOpponent(a){const row=a?.bracket?.rounds?.[a?.round];if(!Array.isArray(row))return null;return row[(Number(a.playerSlot)||0)^1]||null}
  function moveCount(){const s=gameState();return Array.isArray(s?.log)?s.log.length:0}
  function visibleEvalScore(){const t=(document.getElementById('evalNumber')?.textContent||'').trim();if(!t||t==='—')return null;const n=Number(t.replace(/[^+\-\d.]/g,''));return Number.isFinite(n)?n:null}
  function materialEvalScore(){
    const s=gameState();if(!Array.isArray(s?.b)||!s?.h)return null;let v=0,seen=false;
    for(const p of s.b){if(!p||p.k==='K')continue;const val=MATERIAL_VAL[p.k];if(!Number.isFinite(val))continue;const side=Number(p.o);if(side!==1&&side!==-1)continue;v+=(side===1?1:-1)*val;seen=true}
    for(const side of[1,-1]){const hand=s.h?.[side];if(!hand||typeof hand!=='object')continue;for(const k in hand){const n=Number(hand[k])||0,val=MATERIAL_VAL[k];if(!n||!Number.isFinite(val)||k==='K')continue;v+=(side===1?1:-1)*n*val*.94;seen=true}}
    return seen?Math.round(v):0;
  }
  function bossSituationScore(){const teacher=visibleEvalScore();if(teacher!=null)return{score:teacher,threshold:350,source:'teacher'};const material=materialEvalScore();return material==null?null:{score:material,threshold:500,source:'material'}}

  function latestUpset(a){
    const entries=Object.entries(a?.bracket?.results||{}).map(([key,r])=>({key,...r})).filter(r=>r?.kind==='ai'&&r?.winner&&r?.resolvedAt).sort((x,y)=>Number(y.resolvedAt)-Number(x.resolvedAt));
    const r=entries[0];if(!r||Date.now()-Number(r.resolvedAt)>8000)return null;
    const loser=r.winner===r.a?r.b:r.a,rw=rating(r.winner),rl=rating(loser);if(!rw||!rl||rl-rw<150)return null;
    return{key:r.key,winner:r.winner,loser,winnerRating:rw,loserRating:rl,resolvedAt:r.resolvedAt};
  }

  function derive(){
    const store=read(),a=store?.active;if(!a?.cupId||!CUP_BOSS[a.cupId])return null;
    const cupId=a.cupId,boss=CUP_BOSS[cupId],opp=currentOpponent(a),now=Date.now();
    if(lastCup!==cupId){lastCup=cupId;cupSince=now;lastOpponent=opp||'';opponentSince=now}
    if(opp&&opp!==lastOpponent){lastOpponent=opp;opponentSince=now}
    const b=a.bossChallenge||{};let context='r1',label='',extra='',scoreSource=null;
    if(b.status==='pending'){
      const wonAt=Number(b.tournamentWonAt)||0;
      if(wonAt&&now-wonAt<3200){context='tournament_champion';extra='champion@'+wonAt}
      else context='boss_pending';
    }else if(b.status==='active'){
      const moves=moveCount(),sit=bossSituationScore();scoreSource=sit?.source||null;
      if(sit&&sit.score>=sit.threshold){context='boss_advantage';extra=sit.source+'+'+Math.floor(sit.score/100)}
      else if(sit&&sit.score<=-sit.threshold){context='boss_disadvantage';extra=sit.source+Math.ceil(sit.score/100)}
      else{context=moves<18?'boss_start':moves<54?'boss_mid':'boss_end';extra='moves'+(moves<18?'0':moves<54?'1':'2')}
    }else if(b.status==='won')context='boss_won';
    else if(b.status==='lost')context='boss_lost';
    else if(b.status==='draw')context='boss_draw';
    else if(a.status==='lost')context='round_loss';
    else if(a.pending==='next')context='round_win';
    else{
      const upset=latestUpset(a);if(upset){context='upset';extra=upset.key+'@'+upset.resolvedAt}
      else if(Number(a.round)>0&&opp&&now-opponentSince<2800)context='opponent';
      else if(now-cupSince<3200)context='intro';
      else context=['r1','qf','sf','final'][Number(a.round)||0]||'r1';
    }
    const upset=context==='upset'?latestUpset(a):null;
    const vars={cup:CUP_NAME[cupId],boss,round:ROUNDS[Number(a.round)||0]||'大会',opponent:display(opp),winner:upset?.winner||'',loser:upset?.loser||'',winnerRating:upset?.winnerRating||'',loserRating:upset?.loserRating||''};
    label=bank()?.events?.[context]?.label||'大会中';
    const role=context==='tournament_champion'?'大会主・トーナメント外':(b.status==='active'||b.status==='pending'||b.status==='won'||b.status==='lost'||b.status==='draw'?'杯ボス':'大会主・トーナメント外');
    const sig=[cupId,context,a.round,a.pending||'',a.status||'',opp||'',b.status||'',extra].join('|');
    return{store,a,cupId,boss,opp,context,label,role,vars,sig,scoreSource};
  }

  function choose(d,force=false){
    const b=bank();if(!b||!d)return null;if(!force&&lastSignature===d.sig&&lastPick)return lastPick;
    const h=readHistory();h.version=1;h.byKey=h.byKey||{};const key=d.cupId+':'+d.context,old=Array.isArray(h.byKey[key])?h.byKey[key]:[];
    const p=b.pick(d.cupId,d.context,d.vars,old);if(!p)return null;
    h.byKey[key]=[...old,p.id].slice(-5);writeHistory(h);lastSignature=d.sig;lastPick=p;return p;
  }

  function ensureStyle(){
    if(document.getElementById('tournamentDialogue21547Style'))return;
    const s=document.createElement('style');s.id='tournamentDialogue21547Style';s.textContent=`
#tournament21540Panel .tourDialogue21547{display:grid;grid-template-columns:70px minmax(0,1fr);gap:10px;align-items:center;border:1px solid rgba(222,181,77,.72);border-radius:13px;padding:9px;margin:8px 0;background:linear-gradient(135deg,rgba(22,40,31,.98),rgba(8,20,17,.98));box-shadow:0 6px 18px rgba(0,0,0,.22),inset 0 0 0 1px rgba(255,231,155,.05);min-width:0}
#tournament21540Panel .tourDialoguePortrait{width:66px;height:66px;border-radius:13px;overflow:hidden;border:2px solid #d8aa45;background:#0b1512;box-shadow:0 0 0 2px rgba(255,226,131,.08)}
#tournament21540Panel .tourDialoguePortrait img{width:100%;height:100%;object-fit:cover;display:block}
#tournament21540Panel .tourDialogueBody{min-width:0}.tourDialogueTop{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:4px}
#tournament21540Panel .tourDialogueStatus{font-size:10px;font-weight:900;border:1px solid #c89b37;color:#ffe39a;border-radius:999px;padding:2px 7px;white-space:nowrap}
#tournament21540Panel .tourDialogueRole{font-size:9px;color:#97c8b0;border:1px solid #416756;border-radius:999px;padding:2px 6px;white-space:nowrap}
#tournament21540Panel .tourDialogueName{font-size:12px;font-weight:900;color:#f8dc8d;margin-bottom:2px}
#tournament21540Panel .tourDialogueBubble{position:relative;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:7px 8px;font-size:12px;line-height:1.55;color:#f4ead0;overflow-wrap:anywhere}
#tournament21540Panel .tourDialogueBubble:before{content:'';position:absolute;left:-7px;top:13px;width:12px;height:12px;background:#172a22;border-left:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);transform:rotate(45deg)}
#tournament21540Panel.tourFireFit .tourDialogue21547{grid-template-columns:52px minmax(0,1fr);gap:7px;padding:6px;margin:5px 0}#tournament21540Panel.tourFireFit .tourDialoguePortrait{width:48px;height:48px;border-radius:10px}#tournament21540Panel.tourFireFit .tourDialogueBubble{font-size:10px;line-height:1.4;padding:5px 6px}#tournament21540Panel.tourFireFit .tourDialogueName{font-size:11px}#tournament21540Panel.tourFireFit .tourDialogueStatus{font-size:9px;padding:1px 5px}
@media(max-width:520px){#tournament21540Panel .tourDialogue21547{grid-template-columns:58px minmax(0,1fr);gap:8px;padding:7px}#tournament21540Panel .tourDialoguePortrait{width:54px;height:54px}#tournament21540Panel .tourDialogueBubble{font-size:11px}}
`;
    document.head.appendChild(s);
  }
  function ensureBox(root){
    let box=document.getElementById('tourDialogue21547');if(box&&box.isConnected)return box;
    box=document.createElement('section');box.id='tourDialogue21547';box.className='tourDialogue21547';box.setAttribute('aria-live','polite');box.setAttribute('aria-label','大会キャラクターのセリフ');
    const anchor=root.querySelector('.tourCurrentMatch')||root.querySelector('.tourActiveTitle');if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box);return box;
  }
  function render(force=false){
    ensureStyle();const d=derive(),activeRoot=document.querySelector('#tournament21540Panel .tourActive');
    if(!d||!activeRoot){document.getElementById('tourDialogue21547')?.remove();lastSignature='';lastPick=null;return false}
    const p=choose(d,force);if(!p)return false;const src=portrait(d.boss),box=ensureBox(activeRoot);
    const oldImg=box.querySelector('img');const same=!force&&box.dataset.context===d.context&&box.dataset.cup===d.cupId&&box.dataset.speaker===d.boss&&box.dataset.role===d.role&&box.dataset.lineId===p.id&&(!src||oldImg?.src===src);if(same){renderOpponentVoice();return true}
    box.dataset.context=d.context;box.dataset.cup=d.cupId;box.dataset.speaker=d.boss;box.dataset.role=d.role;box.dataset.lineId=p.id;box.dataset.scoreSource=d.scoreSource||'';
    box.innerHTML='<div class="tourDialoguePortrait">'+(src?'<img src="'+esc(src)+'" alt="'+esc(d.boss)+'">':'<span aria-hidden="true">'+esc(Array.from(d.boss)[0]||'王')+'</span>')+'</div><div class="tourDialogueBody"><div class="tourDialogueTop"><span class="tourDialogueStatus">'+esc(p.label)+'</span><span class="tourDialogueRole">'+esc(d.role)+'</span></div><div class="tourDialogueName">'+esc(d.boss)+'</div><div class="tourDialogueBubble">'+esc(p.text)+'</div></div>';
    renderOpponentVoice();return true;
  }
  function renderOpponentVoice(){
    const d=derive(),root=document.querySelector('#tournament21540Panel .tourActive');let box=document.getElementById('tourOpponentVoice21549');
    const bossState=d?.a?.bossChallenge?.status||'locked';
    if(!d||!root||!d.opp||d.opp===PLAYER||bossState!=='locked'||d.a.pending||!['active','draw'].includes(d.a.status)){box?.remove();return false}
    if(!box){box=document.createElement('section');box.id='tourOpponentVoice21549';box.className='tourDialogue21547';const host=document.getElementById('tourDialogue21547');host?.parentElement===root?host.insertAdjacentElement('afterend',box):root.prepend(box)}
    const src=portrait(d.opp),speech=(document.getElementById('charSpeech')?.textContent||'').trim()||'いい勝負にしよう。',round=String(Number(d.a.round)||0),oldImg=box.querySelector('img'),oldBubble=(box.querySelector('.tourDialogueBubble')?.textContent||'').trim();
    if(box.dataset.speaker===d.opp&&box.dataset.role==='対戦相手・トーナメント参加者'&&box.dataset.round===round&&oldBubble===speech&&(!src||oldImg?.src===src))return true;
    box.dataset.speaker=d.opp;box.dataset.role='対戦相手・トーナメント参加者';box.dataset.round=round;
    box.innerHTML='<div class="tourDialoguePortrait">'+(src?'<img src="'+esc(src)+'" alt="'+esc(d.opp)+'">':'')+'</div><div class="tourDialogueBody"><div class="tourDialogueTop"><span class="tourDialogueStatus">'+esc(ROUNDS[Number(d.a.round)||0]||'大会')+'・対戦相手</span><span class="tourDialogueRole">対戦相手・トーナメント参加者</span></div><div class="tourDialogueName">'+esc(d.opp)+'</div><div class="tourDialogueBubble">'+esc(speech)+'</div></div>';
    return true;
  }

  function audit(){
    const d=derive(),b=bank()?.audit?.()||{},box=document.getElementById('tourDialogue21547'),img=box?.querySelector('img'),panel=document.getElementById('tournament21540Panel');
    const ob=document.getElementById('tourOpponentVoice21549'),oi=ob?.querySelector('img');return{ok:!!b.ok&&(!d||!!box),version:'21547d',bank:b,active:!!d,context:d?.context||null,cupId:d?.cupId||null,speaker:d?.boss||null,role:box?.dataset.role||null,portrait:!!img?.src,lineId:box?.dataset.lineId||null,label:box?.querySelector('.tourDialogueStatus')?.textContent||'',text:box?.querySelector('.tourDialogueBubble')?.textContent||'',scoreSource:box?.dataset.scoreSource||null,opponentSpeaker:ob?.dataset.speaker||null,opponentRole:ob?.dataset.role||null,opponentPortrait:!!oi?.src,opponentText:ob?.querySelector('.tourDialogueBubble')?.textContent||'',overflow:panel?Math.max(0,panel.scrollWidth-panel.clientWidth):0,historyKey:HISTORY_KEY};
  }

  window.AI_SHOGI_TOURNAMENT_DIALOGUE={version:'21547d',render:()=>render(true),audit,sample:(cupId,context,vars={},history=[],roll)=>bank()?.pick?.(cupId,context,vars,history,roll)||null};
  observer=new MutationObserver(()=>setTimeout(()=>render(false),0));observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  let tries=0;const boot=setInterval(()=>{render(false);if(++tries>120)clearInterval(boot)},120);setInterval(()=>render(false),600);
  window.addEventListener('resize',()=>render(false));window.addEventListener('orientationchange',()=>setTimeout(()=>render(false),100));window.addEventListener('ai-shogi-local-save',()=>setTimeout(()=>render(false),0));
})();