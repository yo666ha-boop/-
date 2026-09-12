/* みつき将棋 大会ビジュアル演出 v2.15.90a + opponent reveal 21592
 * 既存の大会進行ロジックを変更せず、26キャラ実画像を主役にした対戦カードと進出演出を追加する。
 * 対局中は実際の対戦相手本人を明示し、杯ボスの大会主コメントと混同させない。
 * Fire/狭幅では既存fitを尊重し、prefers-reduced-motionではアニメを抑制する。
 */
(function installTournamentVisual21590(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_VISUAL_21590A)return;
  window.__AI_SHOGI_TOURNAMENT_VISUAL_21590A=true;

  const KEY='aiShogiTournament21540';
  const seenAdvance=new Set(),seenRoundIntro=new Set(),seenBossIntro=new Set();
  let observer=null,raf=0,introTimer=0,bossIntroTimer=0;
  const OPPONENT_LINES={
    'みつき':{reveal:['ここまで来たね。次は私と勝負だよ。','次は私の番。最後まで読んでいくよ。'],battle:['一手ずつ、最後まで読み切るよ。','攻めも受けも丁寧にいくよ。']},
    'みっちゃん':{reveal:['次はみっちゃんだよ。思いっきりいこう！','待ってたよ。次は私と勝負！'],battle:['ここからテンポ上げていくよ！','思い切って攻めていくよ！']},
    'あき王':{reveal:['次は僕だ。落ち着いて一局いこう。','次の相手は僕だよ。丁寧に指そう。'],battle:['終盤まで丁寧に読むよ。','形を崩さず勝ち筋を探すよ。']},
    'おにまま':{reveal:['次はあたしだよ。甘い手は見逃さないよ。','ここからはあたしが相手だよ。本気で来な。'],battle:['勝負所、しっかり読みな。','最後まで気を抜くんじゃないよ。']},
    'まま':{reveal:['次はままと一局ね。落ち着いていこう。','次は私ね。焦らず指そうね。'],battle:['焦らず、盤面をよく見ようね。','一手ずつ丁寧にいこうね。']},
    'ケンシロウ':{reveal:['次は俺だ。自分の読みを信じろ。','ここからは俺が相手だ。最後まで指し切れ。'],battle:['最後まで読みを止めるな。','勝負所を見逃すな。']},
    'ジャギ':{reveal:['次は俺の番だ。簡単には通さないぞ。','ここから先は俺が相手だ。'],battle:['崩せるところから一気にいくぞ。','隙があれば逃さないぞ。']},
    'しんじ':{reveal:['次はぼくだね。よろしく。','ぼくが次の相手だね。落ち着いて指そう。'],battle:['焦らず、一手ずついこう。','まだ決まったわけじゃないよ。']},
    '直江兼続':{reveal:['次は私が相手です。正面から受けます。','次局、お相手します。丁寧にいきましょう。'],battle:['守りを崩さず、機を待ちます。','形を整えてから動きます。']},
    'あやなみ':{reveal:['次は私と指す。','次の対局、私が相手。'],battle:['読みを切らさないで。','結果は一手ずつ決まる。']},
    'バット':{reveal:['次はオレだ。元気よくいこうぜ。','よし、次はオレの番だ！'],battle:['まだまだここからだ！','チャンスが来たら動くぜ。']},
    '伊達政宗':{reveal:['次は俺だ。主導権は譲らない。','次局は俺が相手だ。攻め合おう。'],battle:['攻める好機を逃さない。','先に流れをつかむ。']},
    'あすか':{reveal:['次はあたしよ。手加減しないから。','やっと出番ね。次はあたしが相手よ。'],battle:['迷ってる暇はないわよ。','ここは一気にいくわよ。']},
    'ユリア':{reveal:['次は私ですね。落ち着いて指しましょう。','次局、お相手します。よろしくお願いします。'],battle:['盤面を丁寧に見ています。','急がず、良い形を作ります。']},
    '玉ちゃん':{reveal:['次は玉ちゃんの番だよ。よろしくね。','次は私だよ。楽しく真剣にいこう。'],battle:['楽しくても勝負は真剣だよ。','最後までしっかり指すよ。']},
    'まり':{reveal:['次は私だね。面白い将棋にしよう。','次は私が相手。思い切っていこう。'],battle:['思い切って踏み込むよ。','ここはテンポよくいくよ。']},
    'ぺんぺん':{reveal:['次はぺんぺんだよ。よろしく！','次はこっちの番。じっくりいこう。'],battle:['じっくりチャンスを待つよ。','慌てず進めるよ。']},
    'げんどー':{reveal:['次は私が相手だ。始めよう。','次局はこちらが相手だ。'],battle:['予定通り進める。','盤面を整理して進める。']},
    '前田慶次':{reveal:['次は俺だ。派手に一局いこうか。','次局は俺が相手だ。思い切って来い。'],battle:['勝負所なら思い切っていく。','細かいことより勝負だ。']},
    'シン':{reveal:['次は俺だ。ここから先は譲らない。','次局は俺が相手だ。速く仕掛けるぞ。'],battle:['速さで主導権を取る。','先に仕掛けて流れをつかむ。']},
    'みさとさん':{reveal:['次は私ね。さあ、集中していこう。','次局は私が相手。気を引き締めていこう。'],battle:['ここは勝負どころ。気を抜かないで。','流れを見ながら動くわよ。']},
    'サウザー':{reveal:['次は俺だ。堂々と指してみせろ。','ここからは俺が相手だ。勝負所を逃すな。'],battle:['迷いは勝機を逃すぞ。','受けるだけでは届かん。']},
    'リン':{reveal:['次は私だよ。がんばって指すね。','次は私の番だね。よろしく。'],battle:['最後まであきらめないよ。','一手ずつ大事に指すよ。']},
    'ラオウ':{reveal:['次は俺が相手だ。盤上で力を示せ。','次局、俺が受けて立つ。'],battle:['勝負所から逃げるな。','最後の一手まで力を尽くせ。']},
    'カヲル':{reveal:['次は僕と指そう。楽しみにしているよ。','次の対局は僕だね。君の将棋を見せてほしい。'],battle:['次の一手が楽しみだ。','急がず、でも迷いすぎずに。']},
    '未来からやってきたみつき':{reveal:['次は未来の私が相手だよ。','ここまで来たね。次は未来の私と勝負。'],battle:['先まで読んで、静かに決めるよ。','次の変化まで見て指すよ。']}
  };

  function ensureStyle(){
    if(document.getElementById('tournamentVisual21590Style'))return;
    const s=document.createElement('style');
    s.id='tournamentVisual21590Style';
    s.textContent=`
#tournament21540Panel .tourBracket{background:radial-gradient(circle at 14% 12%,rgba(101,168,255,.10),transparent 30%),radial-gradient(circle at 86% 88%,rgba(255,225,116,.09),transparent 28%),linear-gradient(180deg,#081510 0%,#07110e 100%);border-color:#55482b;box-shadow:inset 0 0 0 1px rgba(255,231,155,.035),0 10px 30px rgba(0,0,0,.18)}
#tournament21540Panel .tourBracketRound{padding:0 2px;box-sizing:border-box}
#tournament21540Panel .tourBracketRoundTitle{position:relative;overflow:hidden;border:1px solid rgba(181,145,62,.36);border-radius:999px;padding:4px 6px;background:linear-gradient(180deg,rgba(45,48,31,.86),rgba(16,28,22,.86));letter-spacing:.04em;text-shadow:0 1px 2px #000}
#tournament21540Panel .tourBracketRoundTitle:after{content:'';position:absolute;inset:0 auto 0 -35%;width:28%;transform:skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent);animation:tour21590RoundShine 5.4s ease-in-out infinite}
#tournament21540Panel .tourBracketSlot{position:relative;overflow:visible;background:linear-gradient(135deg,rgba(16,30,24,.98),rgba(8,18,15,.98));border-color:#4e4630;box-shadow:0 3px 10px rgba(0,0,0,.16),inset 0 0 0 1px rgba(255,255,255,.015);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,opacity .22s ease,filter .22s ease}
#tournament21540Panel .tourBracketSlot:not(.empty):hover{transform:translateY(-1px);border-color:#8d7844;box-shadow:0 5px 15px rgba(0,0,0,.23),inset 0 0 0 1px rgba(255,235,168,.05)}
#tournament21540Panel .tourAvatar{width:40px;height:40px;flex:0 0 40px;border-radius:10px;border:1px solid #8b7538;background:#142019;box-shadow:0 2px 8px rgba(0,0,0,.3);position:relative;z-index:2;overflow:hidden}
#tournament21540Panel .tourAvatar img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.02);transition:transform .28s ease,filter .28s ease}
#tournament21540Panel .tourBracketSlot:not(.empty):hover .tourAvatar img{transform:scale(1.08)}
#tournament21540Panel .tourSlotName{font-size:11px;line-height:1.2;text-shadow:0 1px 2px #000}
#tournament21540Panel .tourSlotMeta{min-height:14px}
#tournament21540Panel .tourBracketSlot.player{background:linear-gradient(135deg,#112a48,#0a1929);box-shadow:0 0 0 1px rgba(101,168,255,.22) inset,0 3px 12px rgba(37,106,190,.14)}
#tournament21540Panel .tourBracketSlot.current,#tournament21540Panel .tourBracketSlot.currentOpp{z-index:5;animation:tour21590CurrentPulse 1.65s ease-in-out infinite}
#tournament21540Panel .tourBracketSlot.currentOpp.tourNextOpponentGlow21592{border-color:#ffe174!important;box-shadow:0 0 0 2px rgba(255,225,116,.28),0 0 26px rgba(255,199,50,.32)!important}
#tournament21540Panel .tourBracketSlot.tourAdvanced{border-color:#b99a43!important;background:linear-gradient(135deg,#273016,#101a11)!important;box-shadow:0 0 0 1px rgba(255,225,116,.20) inset,0 0 14px rgba(230,190,70,.16)}
#tournament21540Panel .tourBracketSlot.tourAdvanced .tourAvatar{border-color:#e5bd4c;box-shadow:0 0 0 2px rgba(255,225,116,.08),0 2px 10px rgba(0,0,0,.3)}
#tournament21540Panel .tourBracketSlot.tourVisualAdvance21590{animation:tour21590Advance .7s cubic-bezier(.18,.78,.25,1.08)}
#tournament21540Panel .tourBracketSlot.tourEliminated .tourAvatar img{filter:saturate(.45) brightness(.72)}
#tournament21540Panel .tourBracketSlot.champion{border-color:#ffe174!important;background:linear-gradient(135deg,#3a3210,#17190d)!important;box-shadow:0 0 0 1px rgba(255,235,140,.32) inset,0 0 22px rgba(255,205,68,.18)}
#tournament21540Panel .tourBracketSlot.champion .tourAvatar{width:46px;height:46px;flex-basis:46px;border-color:#ffe174;box-shadow:0 0 14px rgba(255,213,76,.23)}
#tournament21540Panel .tourBracketSlot[data-tour-visual-pair='a']:after{content:'VS';position:absolute;left:50%;bottom:-10px;transform:translateX(-50%);z-index:7;font-size:7px;line-height:14px;width:18px;height:14px;text-align:center;border-radius:999px;background:#111b16;border:1px solid #6f6036;color:#d9c37f;font-weight:900;pointer-events:none}
#tournament21540Panel .tourVisualBossGate21590{display:grid;grid-template-columns:58px minmax(0,1fr);gap:9px;align-items:center;border:1px solid rgba(210,165,55,.58);border-radius:12px;padding:8px;margin:7px 0;background:linear-gradient(135deg,rgba(45,34,12,.84),rgba(9,22,17,.95));box-shadow:inset 0 0 0 1px rgba(255,232,140,.05);animation:tour21590BossGate .68s cubic-bezier(.18,.78,.25,1.08) both}
#tournament21540Panel .tourVisualBossGate21590 .tourAvatar{width:54px;height:54px;flex-basis:54px;border-radius:12px;border-color:#e1b548}
#tournament21540Panel .tourVisualBossGateTitle21590{font-size:10px;color:#ceb66f;font-weight:900;letter-spacing:.05em}
#tournament21540Panel .tourVisualBossGateName21590{font-size:13px;color:#ffe38a;font-weight:900;margin-top:2px}
#tournament21540Panel .tourVisualBossGateNote21590{font-size:9px;color:#b9ad8a;margin-top:2px;line-height:1.35}
#tournament21540Panel .tourRoundIntro21590,#tournament21540Panel .tourBossIntro21590{position:absolute;inset:0;z-index:60;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at 50% 48%,rgba(24,48,37,.72),rgba(4,11,9,.82));animation:tour21590IntroBackdrop 2.15s ease both}
#tournament21540Panel .tourRoundIntroCard21590,#tournament21540Panel .tourBossIntroCard21590{min-width:min(82%,410px);padding:15px 18px;border:1px solid rgba(235,199,92,.58);border-radius:16px;text-align:center;background:linear-gradient(145deg,rgba(32,45,29,.97),rgba(9,20,16,.98));box-shadow:0 12px 38px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,238,166,.06);animation:tour21590IntroCard 2.15s cubic-bezier(.18,.78,.25,1.08) both}
#tournament21540Panel .tourBossIntroCard21590{border-color:rgba(255,204,73,.76);background:radial-gradient(circle at 50% 0,rgba(121,74,12,.35),transparent 52%),linear-gradient(145deg,rgba(45,34,14,.98),rgba(9,20,16,.98))}
#tournament21540Panel .tourRoundIntroKicker21590,#tournament21540Panel .tourBossIntroKicker21590{font-size:9px;letter-spacing:.16em;color:#bda45f;font-weight:900}
#tournament21540Panel .tourRoundIntroTitle21590,#tournament21540Panel .tourBossIntroTitle21590{margin-top:3px;font-size:20px;line-height:1.1;color:#ffe58a;font-weight:950;text-shadow:0 2px 8px #000}
#tournament21540Panel .tourRoundIntroSub21590,#tournament21540Panel .tourBossIntroSub21590{margin-top:5px;font-size:10px;color:#d7d1b8}
#tournament21540Panel .tourNextOpponent21592{display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px;align-items:center;text-align:left;margin-top:10px;padding:10px;border:1px solid rgba(255,225,116,.28);border-radius:13px;background:rgba(0,0,0,.18)}
#tournament21540Panel .tourNextOpponentPortrait21592{width:72px;height:72px;border-radius:14px;overflow:hidden;border:2px solid #e3ba4b;background:#101a15;box-shadow:0 0 20px rgba(235,190,66,.2)}#tournament21540Panel .tourNextOpponentPortrait21592 img{width:100%;height:100%;object-fit:cover;display:block}
#tournament21540Panel .tourNextOpponentName21592{font-size:15px;font-weight:950;color:#ffe79b}.tourNextOpponentMeta21592{font-size:9px;color:#baaE88;margin-top:2px}.tourNextOpponentSpeech21592{font-size:11px;line-height:1.45;color:#f2ead4;margin-top:5px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.055)}
#tournament21540Panel .tourOpponentDialogue21592{display:grid;grid-template-columns:70px minmax(0,1fr);gap:10px;align-items:center;border-color:#4f8dbd!important;background:linear-gradient(135deg,rgba(14,34,45,.98),rgba(8,20,17,.98))!important}#tournament21540Panel .tourOpponentDialogue21592 .tourDialoguePortrait{border-color:#67a9d8!important}
@keyframes tour21590Advance{0%{transform:translateX(-8px) scale(.95);opacity:.48;filter:brightness(1.7)}55%{transform:translateX(2px) scale(1.04);opacity:1}100%{transform:none;filter:none}}
@keyframes tour21590CurrentPulse{0%,100%{box-shadow:0 0 0 1px rgba(101,168,255,.16),0 0 8px rgba(101,168,255,.12)}50%{box-shadow:0 0 0 2px rgba(255,211,89,.26),0 0 18px rgba(255,195,56,.18)}}
@keyframes tour21590RoundShine{0%,72%,100%{left:-35%}86%{left:115%}}
@keyframes tour21590IntroBackdrop{0%{opacity:0}12%,80%{opacity:1}100%{opacity:0}}
@keyframes tour21590IntroCard{0%{opacity:0;transform:scale(.82) translateY(10px)}14%,80%{opacity:1;transform:scale(1) translateY(0)}100%{opacity:0;transform:scale(1.03) translateY(-3px)}}
@keyframes tour21590BossGate{0%{opacity:0;transform:translateY(8px);filter:brightness(1.6)}100%{opacity:1;transform:none;filter:none}}
@media(max-width:520px){#tournament21540Panel:not(.tourFireFit) .tourAvatar{width:36px;height:36px;flex-basis:36px}#tournament21540Panel:not(.tourFireFit) .tourBracketSlot.champion .tourAvatar{width:40px;height:40px;flex-basis:40px}#tournament21540Panel .tourNextOpponent21592{grid-template-columns:58px minmax(0,1fr);gap:8px;padding:7px}#tournament21540Panel .tourNextOpponentPortrait21592{width:54px;height:54px}.tourNextOpponentSpeech21592{font-size:10px}}
#tournament21540Panel.tourFireFit .tourBracketSlot[data-tour-visual-pair='a']:after{display:none}
#tournament21540Panel.tourFireFit .tourVisualBossGate21590{grid-template-columns:42px minmax(0,1fr);padding:5px;gap:6px;margin:4px 0}#tournament21540Panel.tourFireFit .tourVisualBossGate21590 .tourAvatar{width:40px!important;height:40px!important;flex-basis:40px!important}
#tournament21540Panel.tourFireFit .tourRoundIntroCard21590,#tournament21540Panel.tourFireFit .tourBossIntroCard21590{padding:8px 10px;min-width:68%}#tournament21540Panel.tourFireFit .tourRoundIntroTitle21590,#tournament21540Panel.tourFireFit .tourBossIntroTitle21590{font-size:13px}#tournament21540Panel.tourFireFit .tourRoundIntroSub21590,#tournament21540Panel.tourFireFit .tourBossIntroSub21590{font-size:8px}#tournament21540Panel.tourFireFit .tourNextOpponent21592{grid-template-columns:44px minmax(0,1fr);gap:6px;padding:5px;margin-top:5px}#tournament21540Panel.tourFireFit .tourNextOpponentPortrait21592{width:42px;height:42px;border-radius:9px}#tournament21540Panel.tourFireFit .tourNextOpponentName21592{font-size:11px}#tournament21540Panel.tourFireFit .tourNextOpponentSpeech21592{font-size:8px;line-height:1.3;padding:4px 5px}
@media(prefers-reduced-motion:reduce){#tournament21540Panel .tourBracketRoundTitle:after,#tournament21540Panel .tourBracketSlot.current,#tournament21540Panel .tourBracketSlot.currentOpp,#tournament21540Panel .tourBracketSlot.tourVisualAdvance21590,#tournament21540Panel .tourRoundIntro21590,#tournament21540Panel .tourRoundIntroCard21590,#tournament21540Panel .tourBossIntro21590,#tournament21540Panel .tourBossIntroCard21590,#tournament21540Panel .tourVisualBossGate21590{animation:none!important}#tournament21540Panel .tourBracketSlot,#tournament21540Panel .tourAvatar img{transition:none!important}}
`;
    document.head.appendChild(s);
  }

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function cleanName(slot){return String(slot?.querySelector('.tourSlotName')?.textContent||'').replace(/[👑🏆]/gu,'').trim()}
  function roundIndex(slot){const round=slot?.closest('.tourBracketRound');return Number(round?.dataset?.round??-1)}
  function slotIndex(slot){const body=slot?.parentElement;if(!body)return-1;return [...body.children].filter(x=>x.classList?.contains('tourBracketSlot')).indexOf(slot)}
  function readActive(){try{return JSON.parse(localStorage.getItem(KEY)||'null')?.active||null}catch(e){return null}}
  function attemptKey(){const a=readActive();return String(a?.cupId||'')+':'+String(a?.startedAt||'')}
  function chars(){try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}}
  function ratingOf(name){const c=chars().find(x=>x?.name===name);return Number(c?.rating)||null}
  function currentOpponentSlot(){return document.querySelector('#tournament21540Panel .tourBracketSlot.currentOpp')}
  function portraitSrc(slot){const img=slot?.querySelector('.tourAvatar img');return img?.currentSrc||img?.src||''}
  function lineFor(name,mode,key){const p=OPPONENT_LINES[name]||{reveal:['次は私が相手です。よろしく。'],battle:['最後まで集中して指します。']},arr=p[mode]||p.battle;let h=0;for(const c of String(key||name))h=(h*31+c.charCodeAt(0))>>>0;return arr[h%arr.length]}
  function markPairs(){document.querySelectorAll('#tournament21540Panel .tourBracketRound').forEach(round=>{const r=Number(round.dataset.round||0);if(r>=4)return;const slots=[...round.querySelectorAll('.tourBracketSlot')];slots.forEach((slot,i)=>{if(i%2===0&&i+1<slots.length)slot.dataset.tourVisualPair='a';else delete slot.dataset.tourVisualPair})})}
  function animateAdvances(){document.querySelectorAll('#tournament21540Panel .tourBracketSlot.tourAdvanced').forEach(slot=>{const name=cleanName(slot),r=roundIndex(slot),i=slotIndex(slot);if(!name||r<0||i<0)return;const key=r+':'+i+':'+name;if(seenAdvance.has(key))return;seenAdvance.add(key);slot.classList.add('tourVisualAdvance21590');setTimeout(()=>slot.classList.remove('tourVisualAdvance21590'),780)})}
  function activeRound(){const slots=[...document.querySelectorAll('#tournament21540Panel .tourBracketSlot.current,#tournament21540Panel .tourBracketSlot.currentOpp')];const rounds=slots.map(roundIndex).filter(r=>r>=0&&r<4);return rounds.length?Math.max(...rounds):-1}
  function syncOpponentDialogue(){
    const panel=document.getElementById('tournament21540Panel'),a=readActive(),original=document.getElementById('tourDialogue21547'),opp=currentOpponentSlot();if(!panel)return null;
    const bossStatus=a?.bossChallenge?.status,bossPhase=['pending','active','won','lost','draw'].includes(bossStatus),name=cleanName(opp);
    let card=document.getElementById('tourOpponentDialogue21592');
    if(bossPhase||!opp||!name){card?.remove();if(original)original.style.removeProperty('display');return null}
    if(original)original.style.setProperty('display','none','important');
    if(!card){card=document.createElement('section');card.id='tourOpponentDialogue21592';card.className='tourDialogue21547 tourOpponentDialogue21592';card.setAttribute('aria-live','polite');const root=panel.querySelector('.tourActive')||panel;const anchor=original?.parentElement===root?original:root.querySelector('.tourCurrentMatch')||root.querySelector('.tourActiveTitle');if(anchor)anchor.insertAdjacentElement('afterend',card);else root.prepend(card)}
    const r=Math.max(0,activeRound()),round=['1回戦','準々決勝','準決勝','決勝'][r]||'大会',src=portraitSrc(opp),rating=ratingOf(name),sig=[attemptKey(),r,name,a?.pending||'',a?.status||''].join('|');
    if(card.dataset.sig===sig&&card.querySelector('img')?.src===src)return card;card.dataset.sig=sig;card.dataset.speaker=name;card.dataset.role='対戦相手';card.dataset.context='round_opponent';
    card.innerHTML='<div class="tourDialoguePortrait">'+(src?'<img src="'+esc(src)+'" alt="'+esc(name)+'">':'')+'</div><div class="tourDialogueBody"><div class="tourDialogueTop"><span class="tourDialogueStatus">'+esc(round)+'・対局中</span><span class="tourDialogueRole">対戦相手</span></div><div class="tourDialogueName">'+esc(name)+(rating?'　R'+rating:'')+'</div><div class="tourDialogueBubble">'+esc(lineFor(name,'battle',sig))+'</div></div>';
    return card;
  }
  function roundIntro(){
    const panel=document.getElementById('tournament21540Panel'),r=activeRound(),opp=currentOpponentSlot();if(!panel||r<0||!opp)return;
    const name=cleanName(opp);if(!name)return;const key=attemptKey()+':'+r+':'+name;if(seenRoundIntro.has(key))return;seenRoundIntro.add(key);
    const titles=['1回戦','準々決勝','準決勝','決勝'],subs=['ROUND OF 16','QUARTERFINAL','SEMIFINAL','FINAL'],src=portraitSrc(opp),rating=ratingOf(name),line=lineFor(name,'reveal',key);
    panel.querySelector('.tourRoundIntro21590')?.remove();opp.classList.add('tourNextOpponentGlow21592');setTimeout(()=>opp.classList.remove('tourNextOpponentGlow21592'),2300);
    const veil=document.createElement('div');veil.className='tourRoundIntro21590';veil.setAttribute('aria-hidden','true');veil.dataset.nextOpponent=name;veil.innerHTML='<div class="tourRoundIntroCard21590"><div class="tourRoundIntroKicker21590">NEXT OPPONENT</div><div class="tourRoundIntroTitle21590">'+titles[r]+'</div><div class="tourRoundIntroSub21590">'+subs[r]+' · 次の対戦相手</div><div class="tourNextOpponent21592"><div class="tourNextOpponentPortrait21592">'+(src?'<img src="'+esc(src)+'" alt="'+esc(name)+'">':'')+'</div><div><div class="tourNextOpponentName21592">'+esc(name)+(rating?'　R'+rating:'')+'</div><div class="tourNextOpponentMeta21592">対戦相手</div><div class="tourNextOpponentSpeech21592">「'+esc(line)+'」</div></div></div></div>';
    panel.appendChild(veil);clearTimeout(introTimer);introTimer=setTimeout(()=>veil.remove(),2200);
  }
  function bossGate(){
    const active=document.querySelector('#tournament21540Panel .tourActive');if(!active)return null;
    const existing=active.querySelector('.tourVisualBossGate21590'),boss=active.querySelector('.tourBoss21546');if(!boss){existing?.remove();return null}if(existing)return existing;
    const row=boss.querySelector('.tourBoss21546Row'),img=row?.querySelector('img'),name=row?.querySelector('b')?.textContent?.replace('👑','').trim()||'杯ボス';
    const card=document.createElement('div');card.className='tourVisualBossGate21590';card.dataset.bossName=name;card.setAttribute('aria-label','トーナメント優勝後のボス戦');const portrait=document.createElement('span');portrait.className='tourAvatar';
    if(img?.src){const clone=document.createElement('img');clone.src=img.currentSrc||img.src;clone.alt='';clone.loading='eager';portrait.appendChild(clone)}else portrait.textContent='👑';
    const text=document.createElement('div');text.innerHTML='<div class="tourVisualBossGateTitle21590">FINAL BOSS · トーナメント優勝後</div><div class="tourVisualBossGateName21590">👑 '+esc(name)+'</div><div class="tourVisualBossGateNote21590">4勝で優勝したあとに挑む、ブラケット外の別5戦目です。</div>';card.append(portrait,text);boss.insertAdjacentElement('afterend',card);return card;
  }
  function bossIntro(gate){
    const panel=document.getElementById('tournament21540Panel');if(!panel||!gate)return;
    const boss=String(gate.dataset.bossName||'杯ボス'),champion=cleanName(panel.querySelector('.tourBracketSlot.champion'))||'あなた';
    const key=attemptKey()+':'+champion+':'+boss;if(seenBossIntro.has(key))return;seenBossIntro.add(key);
    panel.querySelector('.tourBossIntro21590')?.remove();
    const img=gate.querySelector('.tourAvatar img'),src=img?.currentSrc||img?.src||'',rating=ratingOf(boss),line=lineFor(boss,'reveal',key+':boss');
    const veil=document.createElement('div');veil.className='tourBossIntro21590';veil.setAttribute('aria-hidden','true');veil.innerHTML='<div class="tourBossIntroCard21590"><div class="tourBossIntroKicker21590">TOURNAMENT CHAMPION</div><div class="tourBossIntroTitle21590">🏆 4勝・優勝</div><div class="tourBossIntroSub21590">EXTRA MATCH · 👑 '+esc(boss)+' へ</div><div class="tourNextOpponent21592"><div class="tourNextOpponentPortrait21592">'+(src?'<img src="'+esc(src)+'" alt="'+esc(boss)+'">':'')+'</div><div><div class="tourNextOpponentName21592">'+esc(boss)+(rating?'　R'+rating:'')+'</div><div class="tourNextOpponentMeta21592">杯ボス・別5戦目</div><div class="tourNextOpponentSpeech21592">「'+esc(line)+'」</div></div></div></div>';
    panel.appendChild(veil);clearTimeout(bossIntroTimer);bossIntroTimer=setTimeout(()=>veil.remove(),2200);
  }
  function decorate(){ensureStyle();markPairs();animateAdvances();syncOpponentDialogue();roundIntro();const gate=bossGate();bossIntro(gate);const panel=document.getElementById('tournament21540Panel');if(panel)panel.dataset.visualVersion='21590a'}
  function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;decorate()})}
  function observe(){const panel=document.getElementById('tournament21540Panel');if(!panel)return false;observer?.disconnect();observer=new MutationObserver(muts=>{if(muts.every(m=>m.target?.closest?.('.tourVisualBossGate21590,.tourRoundIntro21590,.tourBossIntro21590,.tourOpponentDialogue21592')))return;schedule()});observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});decorate();return true}
  let tries=0;const boot=setInterval(()=>{if(observe()||++tries>120)clearInterval(boot)},100);setInterval(syncOpponentDialogue,320);window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(schedule,120),{passive:true});
  window.AI_SHOGI_TOURNAMENT_VISUAL={version:'21590a',refresh:decorate,audit:()=>{const panel=document.getElementById('tournament21540Panel'),slots=[...document.querySelectorAll('#tournament21540Panel .tourBracketSlot')],portraits=slots.filter(s=>s.querySelector('.tourAvatar img')).length,fallbacks=slots.filter(s=>s.querySelector('.tourAvatarFallback')&&cleanName(s)&&cleanName(s)!=='—').length,opp=document.getElementById('tourOpponentDialogue21592');return{ok:!!panel,version:panel?.dataset.visualVersion||'',slots:slots.length,portraits,fallbacks,advanced:slots.filter(s=>s.classList.contains('tourAdvanced')).length,current:slots.filter(s=>s.classList.contains('current')||s.classList.contains('currentOpp')).length,bossGate:!!panel?.querySelector('.tourVisualBossGate21590'),roundIntro:!!panel?.querySelector('.tourRoundIntro21590'),bossIntro:!!panel?.querySelector('.tourBossIntro21590'),nextOpponent:panel?.querySelector('.tourRoundIntro21590')?.dataset.nextOpponent||'',opponentSpeaker:opp?.dataset.speaker||'',opponentRole:opp?.dataset.role||'',attemptKey:attemptKey(),fireFit:!!panel?.classList.contains('tourFireFit')}}};
})();