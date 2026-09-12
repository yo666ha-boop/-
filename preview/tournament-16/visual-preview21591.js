/* みつき将棋 外部確認ページ・画像カード/進出演出 21591a + opponent reveal 21592
 * preview専用。大会進行/AI/R/勝敗ロジックは変更しない。
 * 対局中は現在の対戦相手本人を表示し、杯ボスの大会主コメントとは明確に分離する。
 */
(function installTournamentPreviewVisual21591(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_VISUAL_21591A)return;
  window.__TOURNAMENT_PREVIEW_VISUAL_21591A=true;
  let attempt=0,introTimer=0,bossTimer=0;
  const seenRound=new Set(),seenAdvance=new Set();
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
    if(document.getElementById('previewVisual21591Style'))return;
    const s=document.createElement('style');s.id='previewVisual21591Style';s.textContent=`
#stage{position:relative;overflow:hidden}.bracket{background:radial-gradient(circle at 12% 12%,rgba(101,168,255,.10),transparent 28%),radial-gradient(circle at 86% 86%,rgba(255,225,116,.10),transparent 26%),linear-gradient(180deg,#07130f,#050d0b);box-shadow:inset 0 0 0 1px rgba(255,232,161,.035),0 12px 30px rgba(0,0,0,.2)}
.round{padding:0 2px}.roundTitle{position:relative;overflow:hidden;border:1px solid rgba(181,145,62,.42);border-radius:999px;padding:4px 6px!important;background:linear-gradient(180deg,rgba(44,47,30,.92),rgba(14,25,20,.92));letter-spacing:.04em;color:#d8c985!important;text-shadow:0 1px 2px #000}.round.pvCurrentRound21591 .roundTitle{border-color:#e5b94d;color:#ffe58a!important;box-shadow:0 0 13px rgba(229,185,77,.22)}
.slot{min-height:46px!important;padding:4px!important;border-radius:9px!important;background:linear-gradient(135deg,rgba(17,31,25,.98),rgba(7,16,13,.98))!important;border-color:#51472f!important;box-shadow:0 3px 10px rgba(0,0,0,.18),inset 0 0 0 1px rgba(255,255,255,.018);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,filter .22s ease,opacity .22s ease}.slot:not(.empty):hover{transform:translateY(-1px)!important;border-color:#8d7844!important;box-shadow:0 6px 16px rgba(0,0,0,.25)!important}.slot.player{background:linear-gradient(135deg,#112a48,#091827)!important;border-color:#477bb7!important}.slot.pvOpponentGlow21592{border-color:#ffe174!important;box-shadow:0 0 0 2px rgba(255,225,116,.28),0 0 26px rgba(255,199,50,.30)!important}.slot.pvAdvanced21591{border-color:#c7a54b!important;background:linear-gradient(135deg,#273116,#0f1910)!important;box-shadow:0 0 0 1px rgba(255,225,116,.15) inset,0 0 14px rgba(226,185,70,.16)!important}.slot.pvAdvanceAnim21591{animation:pv21591Advance .72s cubic-bezier(.18,.78,.25,1.08)}.slot.eliminated{filter:saturate(.45) brightness(.74)}
.avatar{width:38px!important;height:38px!important;flex:0 0 38px!important;border-radius:10px!important;border:1px solid #8d773c!important;box-shadow:0 2px 8px rgba(0,0,0,.3);overflow:hidden}.avatar img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.02);transition:transform .25s ease}.slot:not(.empty):hover .avatar img{transform:scale(1.08)}.name{font-size:10px;line-height:1.2}.meta{font-size:7px!important}.champion .avatar{width:44px!important;height:44px!important;flex-basis:44px!important;border-color:#ffe174!important;box-shadow:0 0 14px rgba(255,213,76,.24)}
.pvRoundIntro21591,.pvBossIntro21591{position:absolute;inset:0;z-index:80;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at 50% 48%,rgba(26,51,40,.74),rgba(4,11,9,.84));animation:pv21591Backdrop 2.15s ease both}.pvIntroCard21591{min-width:min(82%,410px);padding:15px 18px;border:1px solid rgba(235,199,92,.62);border-radius:16px;text-align:center;background:linear-gradient(145deg,rgba(31,45,29,.98),rgba(8,19,15,.99));box-shadow:0 12px 38px rgba(0,0,0,.48),inset 0 0 0 1px rgba(255,238,166,.06);animation:pv21591Card 2.15s cubic-bezier(.18,.78,.25,1.08) both}.pvBossIntro21591 .pvIntroCard21591{border-color:rgba(255,204,73,.8);background:radial-gradient(circle at 50% 0,rgba(125,75,12,.38),transparent 54%),linear-gradient(145deg,rgba(45,34,14,.99),rgba(8,19,15,.99))}.pvKicker21591{font-size:9px;letter-spacing:.16em;color:#bda45f;font-weight:900}.pvTitle21591{margin-top:3px;font-size:21px;line-height:1.1;color:#ffe58a;font-weight:950;text-shadow:0 2px 8px #000}.pvSub21591{margin-top:5px;font-size:10px;color:#d7d1b8}
.pvNextOpponent21592{display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px;align-items:center;text-align:left;margin-top:10px;padding:10px;border:1px solid rgba(255,225,116,.28);border-radius:13px;background:rgba(0,0,0,.18)}.pvNextPortrait21592{width:72px;height:72px;border-radius:14px;overflow:hidden;border:2px solid #e3ba4b;background:#101a15;box-shadow:0 0 20px rgba(235,190,66,.2)}.pvNextPortrait21592 img{width:100%;height:100%;object-fit:cover;display:block}.pvNextName21592{font-size:15px;font-weight:950;color:#ffe79b}.pvNextRole21592{font-size:9px;color:#bcae88;margin-top:2px}.pvNextSpeech21592{font-size:11px;line-height:1.45;color:#f2ead4;margin-top:5px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.055)}
#opponentDialoguePreview21592{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;border:1px solid #4f8dbd;border-radius:13px;padding:9px;margin:8px 0;background:linear-gradient(135deg,#122634,#081511);box-sizing:border-box;max-width:100%}#opponentDialoguePreview21592 .odImg{width:66px;height:66px;border-radius:12px;overflow:hidden;border:2px solid #67a9d8;background:#0b1512}#opponentDialoguePreview21592 .odImg img{width:100%;height:100%;object-fit:cover;display:block}#opponentDialoguePreview21592 .odTop{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px}#opponentDialoguePreview21592 .odStatus,#opponentDialoguePreview21592 .odRole{font-size:10px;font-weight:900;border:1px solid #5d9bc7;border-radius:999px;padding:2px 7px;color:#bfe2fa}#opponentDialoguePreview21592 .odRole{border-color:#416756;color:#9ccbb4}#opponentDialoguePreview21592 .odName{font-size:12px;font-weight:900;color:#d5edff;margin-bottom:2px}#opponentDialoguePreview21592 .odSpeech{font-size:12px;line-height:1.5;background:rgba(255,255,255,.055);border-radius:9px;padding:7px 8px;color:#f4ead0;overflow-wrap:anywhere}
#bossPreview21546{border-color:#d3a642!important;background:radial-gradient(circle at 0 50%,rgba(114,74,14,.26),transparent 44%),linear-gradient(90deg,#18160d,#0a1512)!important;box-shadow:0 0 16px rgba(211,166,66,.12)}
@keyframes pv21591Advance{0%{transform:translateX(-9px) scale(.94);opacity:.42;filter:brightness(1.75)}58%{transform:translateX(2px) scale(1.035);opacity:1}100%{transform:none;filter:none}}@keyframes pv21591Backdrop{0%{opacity:0}12%,80%{opacity:1}100%{opacity:0}}@keyframes pv21591Card{0%{opacity:0;transform:scale(.82) translateY(10px)}14%,80%{opacity:1;transform:none}100%{opacity:0;transform:scale(1.03) translateY(-3px)}}
@media(max-width:900px){.slot{min-height:42px!important}.avatar{width:34px!important;height:34px!important;flex-basis:34px!important}}@media(max-width:520px){.pvNextOpponent21592{grid-template-columns:58px minmax(0,1fr);gap:8px;padding:7px}.pvNextPortrait21592{width:54px;height:54px}.pvNextSpeech21592{font-size:10px}#opponentDialoguePreview21592{grid-template-columns:58px minmax(0,1fr);gap:8px;padding:7px}#opponentDialoguePreview21592 .odImg{width:54px;height:54px}#opponentDialoguePreview21592 .odSpeech{font-size:11px}}@media(prefers-reduced-motion:reduce){.slot,.avatar img,.pvRoundIntro21591,.pvBossIntro21591,.pvIntroCard21591,.slot.pvAdvanceAnim21591{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function lineFor(name,mode,key){const p=OPPONENT_LINES[name]||{reveal:['次は私が相手です。よろしく。'],battle:['最後まで集中して指します。']},arr=p[mode]||p.battle;let h=0;for(const c of String(key||name))h=(h*31+c.charCodeAt(0))>>>0;return arr[h%arr.length]}
  function opponentSlot(){const r=Math.max(0,Number(active?.round)||0),round=[...document.querySelectorAll('#bracket .round')][r];if(!round)return null;const slots=[...round.querySelectorAll('.slot')],pi=slots.findIndex(s=>s.classList.contains('player'));if(pi<0)return null;const oi=pi%2===0?pi+1:pi-1;const s=slots[oi];return s&&!s.classList.contains('empty')?s:null}
  function opponentInfo(){const slot=opponentSlot(),name=String(slot?.querySelector('.name')?.textContent||'').trim();if(!slot||!name||name==='—')return null;const img=slot.querySelector('.avatar img'),src=img?.currentSrc||img?.src||'',rating=typeof ratingOf==='function'?ratingOf(name):null;return{slot,name,src,rating}}
  function bossPhase(){return ['pending','active','won','lost','draw'].includes(active?.bossChallenge?.status)}
  function syncOpponentDialogue(){const host=document.getElementById('stage'),orig=document.getElementById('dialoguePreview21547'),info=opponentInfo();let card=document.getElementById('opponentDialoguePreview21592');if(!host||bossPhase()||!info){card?.remove();if(orig)orig.style.removeProperty('display');return null}if(orig)orig.style.setProperty('display','none','important');if(!card){card=document.createElement('section');card.id='opponentDialoguePreview21592';card.setAttribute('aria-live','polite');if(orig)orig.insertAdjacentElement('afterend',card);else(document.querySelector('.news')||host.firstChild)?.insertAdjacentElement?.('beforebegin',card)}const r=Math.max(0,Number(active?.round)||0),round=['1回戦','準々決勝','準決勝','決勝'][r]||'大会',sig=[attempt,r,info.name,active?.status||'',active?.pending||''].join('|');if(card.dataset.sig===sig&&card.querySelector('img')?.src===info.src)return card;card.dataset.sig=sig;card.dataset.speaker=info.name;card.dataset.role='対戦相手';card.innerHTML='<div class="odImg">'+(info.src?'<img src="'+esc(info.src)+'" alt="'+esc(info.name)+'">':'')+'</div><div><div class="odTop"><span class="odStatus">'+round+'・対局中</span><span class="odRole">対戦相手</span></div><div class="odName">'+esc(info.name)+(info.rating?'　R'+info.rating:'')+'</div><div class="odSpeech">'+esc(lineFor(info.name,'battle',sig))+'</div></div>';return card}
  function veil(kind,title,sub,info){
    const host=document.getElementById('stage');if(!host)return;
    host.querySelector('.pvRoundIntro21591,.pvBossIntro21591')?.remove();
    const v=document.createElement('div');v.className=kind==='boss'?'pvBossIntro21591':'pvRoundIntro21591';v.setAttribute('aria-hidden','true');if(info?.name)v.dataset.nextOpponent=info.name;
    const kicker=kind==='boss'?'TOURNAMENT CHAMPION':'NEXT OPPONENT',role=kind==='boss'?'杯ボス・別5戦目':'対戦相手',line=info?.name?lineFor(info.name,'reveal',attempt+':'+title+':'+info.name):'';
    const hero=info?.name?'<div class="pvNextOpponent21592"><div class="pvNextPortrait21592">'+(info.src?'<img src="'+esc(info.src)+'" alt="'+esc(info.name)+'">':'')+'</div><div><div class="pvNextName21592">'+esc(info.name)+(info.rating?'　R'+info.rating:'')+'</div><div class="pvNextRole21592">'+role+'</div><div class="pvNextSpeech21592">「'+esc(line)+'」</div></div></div>':'';
    v.innerHTML='<div class="pvIntroCard21591"><div class="pvKicker21591">'+kicker+'</div><div class="pvTitle21591">'+title+'</div><div class="pvSub21591">'+sub+'</div>'+hero+'</div>';
    host.appendChild(v);clearTimeout(kind==='boss'?bossTimer:introTimer);const id=setTimeout(()=>v.remove(),2200);if(kind==='boss')bossTimer=id;else introTimer=id;
  }
  function decorate(){
    ensureStyle();if(!active||!document.getElementById('stage')?.classList.contains('on'))return;
    const rounds=[...document.querySelectorAll('#bracket .round')],r=Math.max(0,Number(active.round)||0);
    rounds.forEach((round,ri)=>round.classList.toggle('pvCurrentRound21591',ri===r&&active.status!=='lost'));
    rounds.forEach((round,ri)=>[...round.querySelectorAll('.slot')].forEach((slot,si)=>{
      if(slot.classList.contains('empty'))return;const name=String(slot.querySelector('.name')?.textContent||'').trim(),state=String(slot.querySelector('.state')?.textContent||'').trim();
      slot.classList.toggle('pvAdvanced21591',state==='勝利'||state==='優勝');
      if(ri>0&&name&&name!=='—'){const k=attempt+':'+ri+':'+si+':'+name;if(!seenAdvance.has(k)){seenAdvance.add(k);slot.classList.add('pvAdvanceAnim21591');setTimeout(()=>slot.classList.remove('pvAdvanceAnim21591'),780)}}
    }));
    syncOpponentDialogue();
    const info=opponentInfo(),roundKey=attempt+':'+r+':'+active.status+':'+(info?.name||'');if(active.status==='playing'&&r<4&&info&&!seenRound.has(roundKey)){seenRound.add(roundKey);const jp=['1回戦','準々決勝','準決勝','決勝'][r],en=['ROUND OF 16','QUARTERFINAL','SEMIFINAL','FINAL'][r];info.slot.classList.add('pvOpponentGlow21592');setTimeout(()=>info.slot.classList.remove('pvOpponentGlow21592'),2300);veil('round',jp,en+' · 次の対戦相手',info)}
    const bp=active.bossChallenge?.status;if(['pending','active','draw'].includes(bp)){const bk=attempt+':boss:'+bp;if(!seenRound.has(bk)){seenRound.add(bk);const boss=String(active.cup?.boss||'杯ボス'),src=IMG?.[boss]||document.querySelector('#bossPreview21546 img')?.src||'',bi={name:boss,src,rating:active.cup?.bossRating||ratingOf?.(boss)||null};veil('boss','🏆 4勝・優勝','EXTRA MATCH · 優勝後ボス戦',bi)}}
  }
  const oldStart=start;start=function(id){attempt++;seenRound.clear();seenAdvance.clear();oldStart(id);requestAnimationFrame(()=>requestAnimationFrame(decorate))};
  const oldRender=renderBracket;renderBracket=function(){oldRender();requestAnimationFrame(()=>requestAnimationFrame(decorate))};
  const mo=new MutationObserver(()=>requestAnimationFrame(decorate));const host=document.getElementById('stage')||document.body;mo.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});setInterval(syncOpponentDialogue,320);
  window.TOURNAMENT_PREVIEW_VISUAL_21591={version:'21591a',refresh:decorate,audit:()=>{const card=document.getElementById('opponentDialoguePreview21592'),intro=document.querySelector('.pvRoundIntro21591');return{version:'21591a',opponentSpeaker:card?.dataset.speaker||'',opponentRole:card?.dataset.role||'',nextOpponent:intro?.dataset.nextOpponent||'',nextPortrait:!!intro?.querySelector('.pvNextPortrait21592 img'),bossPhase:bossPhase()}}};ensureStyle();setTimeout(decorate,0);
})();