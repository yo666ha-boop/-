/* みつき将棋 大会ボス戦 v2.15.46a
 * 16人トーナメントから杯ボスを完全に外し、4勝でトーナメント優勝後に別の5戦目としてボスへ挑戦する。
 * 既存 tournament21541 の対局/AI進行/保存を再利用し、安定済みcoreを大改造しない互換レイヤー。
 */
(function installTournamentBoss21546(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_BOSS_21546A)return;
  window.__AI_SHOGI_TOURNAMENT_BOSS_21546A=true;

  const KEY='aiShogiTournament21540';
  const PLAYER='__PLAYER__';
  const CUPS={
    shinji:{id:'shinji',name:'しんじ杯',boss:'しんじ',bossRating:1550},
    ayanami:{id:'ayanami',name:'あやなみ杯',boss:'あやなみ',bossRating:1800},
    kenshiro:{id:'kenshiro',name:'ケンシロウ杯',boss:'ケンシロウ',bossRating:2100},
    kaworu:{id:'kaworu',name:'カヲル杯',boss:'カヲル',bossRating:2400},
    akiou:{id:'akiou',name:'あき王杯',boss:'あき王',bossRating:2700},
    micchan:{id:'micchan',name:'みっちゃん杯',boss:'みっちゃん',bossRating:2850},
    mitsuki:{id:'mitsuki',name:'みつき杯',boss:'みつき',bossRating:3000},
    future:{id:'future',name:'未来みつき杯',boss:'未来からやってきたみつき',bossRating:3400}
  };
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch(e){return false}};
  const chars=()=>{try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cupOf=a=>CUPS[a?.cupId]||null;
  let patched=false,observer=null,resultObserver=null,decorating=false;

  function portrait(name){
    const all=chars(),idx=all.findIndex(c=>c?.name===name),cards=[...document.querySelectorAll('#chars .ch')];
    let card=cards.find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===name);
    if(!card&&idx>=0)card=cards[idx];
    const img=card?.querySelector('img');return img?.currentSrc||img?.src||'';
  }
  function bossCard(cup){
    const src=portrait(cup.boss);
    return '<div class="tourBoss21546"><div class="tourBoss21546Label">トーナメント優勝者だけが挑戦できる杯ボス</div><div class="tourBoss21546Row">'+(src?'<span class="tourAvatar boss"><img src="'+esc(src)+'" alt=""></span>':'')+'<div><b>👑 '+esc(cup.boss)+'</b><div>R'+cup.bossRating+'　※トーナメントには参加しません</div></div></div></div>';
  }
  function addNews(a,text,kind='result'){
    a.news=Array.isArray(a.news)?a.news:[];a.news.unshift({at:Date.now(),text,kind});a.news=a.news.slice(0,8);
  }

  function ensureStyle(){
    if(document.getElementById('tournamentBoss21546Style'))return;
    const s=document.createElement('style');s.id='tournamentBoss21546Style';s.textContent=`
#tournament21540Panel .tourBoss21546{border:1px solid #c99c32;border-radius:10px;background:linear-gradient(135deg,#19170d,#0d1713);padding:8px;margin:7px 0;box-shadow:0 0 0 1px rgba(255,225,116,.08) inset}
#tournament21540Panel .tourBoss21546Label{font-size:10px;color:#d7bd72;margin-bottom:5px;font-weight:800}
#tournament21540Panel .tourBoss21546Row{display:flex;gap:8px;align-items:center;font-size:11px;color:#cfc39e}
#tournament21540Panel .tourBoss21546Row b{display:block;color:#ffe174;font-size:13px;margin-bottom:2px}
#tournament21540Panel .tourResult.bossPending{color:#ffe174}#tournament21540Panel .tourResult.bossLost{color:#e3a59a}
body.tournamentBoss21546Lock #chars{opacity:.55}
`;
    document.head.appendChild(s);
  }

  function resetOldActiveIfNeeded(){
    const s=read();if(!s?.active||s.active.bossChallenge)return false;
    s.active=null;write(s);return true;
  }

  function rewriteTournament(id,baselineTrophy){
    const t=window.AI_SHOGI_TOURNAMENT,store=read(),a=store?.active,cup=CUPS[id];
    if(!t||!a||!cup)return false;
    const rule=t.fieldRule?.(id),selected=Array.isArray(rule?.selected)?rule.selected.slice(0,15):[];
    if(selected.length!==15||selected.includes(cup.boss)){
      console.error('tournament boss21546 field invalid',id,selected);return false;
    }
    a.round=0;a.playerSlot=0;a.status='active';a.pending=null;a.processedToken=0;a.matchToken=(Number(a.matchToken)||0)+1;
    a.bracket=a.bracket||{};
    a.bracket.rounds=[[PLAYER,...selected],Array(8).fill(null),Array(4).fill(null),Array(2).fill(null),Array(1).fill(null)];
    a.bracket.matches={};a.bracket.results={};
    a.bossChallenge={version:1,boss:cup.boss,bossRating:cup.bossRating,status:'locked',baselineTrophy:Number(baselineTrophy)||0,attempt:0,processedAttempt:0};
    a.news=[];addNews(a,cup.name+' 開幕。16人トーナメント優勝後に '+cup.boss+' への挑戦権を獲得できます。','start');
    if(Array.isArray(store.history)&&store.history[0]&&store.history[0].cupId===id){store.history[0].format='16-player-then-boss';store.history[0].bossSeparate=true}
    write(store);
    try{t.render?.()}catch(e){}
    return true;
  }

  function promoteTournamentChampion(){
    const t=window.AI_SHOGI_TOURNAMENT,store=read(),a=store?.active,cup=cupOf(a),b=a?.bossChallenge;
    if(!t||!a||!cup||!b||b.status!=='locked'||a.status!=='champion')return false;
    store.trophies=store.trophies||{};store.trophies[cup.id]=Number(b.baselineTrophy)||0;
    a.status='boss_pending';b.status='pending';b.tournamentWonAt=Date.now();
    addNews(a,'🏆 16人トーナメント優勝。次は杯ボス '+cup.boss+' に挑戦！','result');
    write(store);renderAndDecorate();return true;
  }

  function startBoss(replay=false){
    const store=read(),a=store?.active,cup=cupOf(a),b=a?.bossChallenge;if(!a||!cup||!b)return false;
    if(!['pending','draw'].includes(b.status))return false;
    const idx=chars().findIndex(c=>c?.name===cup.boss);if(idx<0)return false;
    b.status='active';b.attempt=(Number(b.attempt)||0)+1;b.processedAttempt=0;b.startedAt=Date.now();a.status='boss_active';a.pending=null;
    addNews(a,'👑 ボス戦：'+cup.boss+' への挑戦開始','start');write(store);
    try{window.AIShogiIOS.select(idx)}catch(e){console.error('boss challenge select failed',e);b.status=replay?'draw':'pending';a.status=replay?'boss_draw':'boss_pending';write(store);return false}
    document.getElementById('tournament21540Panel')?.classList.remove('on');
    const st=document.getElementById('status');if(st)st.textContent=cup.name+' 完全制覇戦：'+cup.boss+' R'+cup.bossRating+' に挑戦中';
    return true;
  }

  function bossResult(kind){
    const store=read(),a=store?.active,cup=cupOf(a),b=a?.bossChallenge;if(!a||!cup||!b||b.status!=='active')return false;
    if(Number(b.processedAttempt)===Number(b.attempt)&&Number(b.attempt)>0)return false;
    b.processedAttempt=Number(b.attempt)||1;b.finishedAt=Date.now();
    if(kind==='win'){
      b.status='won';a.status='champion';store.trophies=store.trophies||{};store.trophies[cup.id]=(Number(b.baselineTrophy)||0)+1;a.finishedAt=Date.now();
      addNews(a,'🏆 '+cup.boss+' を撃破。'+cup.name+' 完全制覇！','result');
    }else if(kind==='loss'){
      b.status='lost';a.status='boss_lost';a.finishedAt=Date.now();store.trophies=store.trophies||{};store.trophies[cup.id]=Number(b.baselineTrophy)||0;
      addNews(a,'杯ボス '+cup.boss+' に敗北。トーナメント優勝、完全制覇ならず。','result');
    }else{
      b.status='draw';a.status='boss_draw';addNews(a,'杯ボス '+cup.boss+' と引き分け。ボス戦を指し直します。','result');
    }
    write(store);renderAndDecorate();document.getElementById('tournament21540Panel')?.classList.add('on');return true;
  }

  function decorate(){
    if(decorating)return;decorating=true;
    try{
      ensureStyle();const store=read(),a=store?.active,cup=cupOf(a),b=a?.bossChallenge;
      document.querySelectorAll('#tournament21540Panel .tourCupMeta').forEach(el=>{if(el.innerHTML.includes('決勝ボス'))el.innerHTML=el.innerHTML.replace('決勝ボス','優勝後ボス')});
      const lock=!!b&&['pending','active','draw'].includes(b.status);document.body.classList.toggle('tournamentBoss21546Lock',lock);
      if(!a||!cup||!b)return;
      const root=document.querySelector('#tournament21540Panel .tourActive');if(!root)return;
      root.querySelector('.tourBoss21546')?.remove();
      const result=root.querySelector('.tourResult'),actions=root.querySelector('.tourActions');
      if(result)result.insertAdjacentHTML('afterend',bossCard(cup));
      if(!result||!actions)return;
      if(b.status==='pending'){
        result.className='tourResult bossPending';result.innerHTML='🏆 16人トーナメント優勝！　<b>杯ボスへの挑戦権獲得</b>';
        actions.innerHTML='<button class="btn primary" data-boss21546-start="1">👑 '+esc(cup.boss)+' に挑戦</button><button class="btn" data-boss21546-exit="1">大会を終える</button>';
      }else if(b.status==='active'){
        result.className='tourResult bossPending';result.innerHTML='👑 完全制覇戦：'+esc(cup.boss)+' R'+cup.bossRating+' と対局中';
        actions.innerHTML='<button class="btn primary" data-boss21546-board="1">現在のボス戦を開く</button><button class="btn" data-boss21546-exit="1">大会をやめる</button>';
      }else if(b.status==='draw'){
        result.className='tourResult bossPending';result.innerHTML='引き分け。'+esc(cup.boss)+' とのボス戦を指し直します。';
        actions.innerHTML='<button class="btn primary" data-boss21546-start="1">👑 ボス戦を指し直す</button><button class="btn" data-boss21546-exit="1">大会を終える</button>';
      }else if(b.status==='lost'){
        result.className='tourResult bossLost';result.innerHTML='トーナメント優勝。杯ボス '+esc(cup.boss)+' には敗北。完全制覇は次回へ。';
        actions.innerHTML='<button class="btn primary" data-boss21546-retry="'+cup.id+'">トーナメントから再挑戦</button><button class="btn" data-boss21546-exit="1">大会を終える</button>';
      }else if(b.status==='won'){
        result.className='tourResult tourTrophy';result.innerHTML='🏆 '+esc(cup.name)+' 完全制覇！　16人トーナメント優勝 ＋ '+esc(cup.boss)+' 撃破';
        actions.innerHTML='<button class="btn primary" data-boss21546-retry="'+cup.id+'">もう一度この杯</button><button class="btn" data-boss21546-exit="1">大会を終える</button>';
      }
      actions.querySelectorAll('[data-boss21546-start]').forEach(x=>x.onclick=()=>startBoss(b.status==='draw'));
      actions.querySelectorAll('[data-boss21546-retry]').forEach(x=>x.onclick=()=>window.AI_SHOGI_TOURNAMENT?.start?.(x.dataset.boss21546Retry,true));
      actions.querySelectorAll('[data-boss21546-exit]').forEach(x=>x.onclick=()=>window.AI_SHOGI_TOURNAMENT?.exit?.());
      actions.querySelectorAll('[data-boss21546-board]').forEach(x=>x.onclick=()=>{document.getElementById('tournament21540Panel')?.classList.remove('on');document.getElementById('board')?.scrollIntoView?.({block:'center'})});
    }finally{decorating=false}
  }
  function renderAndDecorate(){try{window.AI_SHOGI_TOURNAMENT?.render?.()}catch(e){}setTimeout(decorate,0)}

  function patchAPI(){
    const t=window.AI_SHOGI_TOURNAMENT;if(!t||patched||typeof t.start!=='function')return false;
    const originalStart=t.start.bind(t),originalNext=t.next?.bind(t),originalAudit=t.audit?.bind(t);
    t.start=function(id,...args){
      const before=read(),baseline=Number(before?.trophies?.[id])||0,result=originalStart(id,...args);
      if(!rewriteTournament(id,baseline))return result;
      try{originalNext?.()}catch(e){}
      renderAndDecorate();return true;
    };
    t.challengeBoss=()=>startBoss(false);
    t.bossState=()=>JSON.parse(JSON.stringify(read()?.active?.bossChallenge||null));
    t.audit=function(){
      const base=originalAudit?originalAudit():{},s=read(),a=s?.active,b=a?.bossChallenge,cup=cupOf(a),r0=a?.bracket?.rounds?.[0]||[];
      return{...base,format:'16-player-then-boss',bossSeparate:true,bossInBracket:!!(cup&&r0.includes(cup.boss)),bossChallenge:b?JSON.parse(JSON.stringify(b)):null,tournamentChampion:!!(a?.bracket?.rounds?.[4]?.[0]===PLAYER)};
    };
    t.__boss21546a=true;patched=true;
    resetOldActiveIfNeeded();renderAndDecorate();return true;
  }

  function installObservers(){
    const rb=document.getElementById('resultBanner');
    if(rb&&!rb.dataset.bossObserve21546){
      rb.dataset.bossObserve21546='1';resultObserver=new MutationObserver(()=>{
        if(!rb.classList.contains('on'))return;
        const b=read()?.active?.bossChallenge;if(b?.status==='active'){
          if(rb.classList.contains('result-win'))bossResult('win');
          else if(rb.classList.contains('result-loss'))bossResult('loss');
          else if(rb.classList.contains('result-draw'))bossResult('draw');
        }else setTimeout(promoteTournamentChampion,0);
      });resultObserver.observe(rb,{attributes:true,childList:true,subtree:true});
    }
    const panel=document.getElementById('tournament21540Panel');
    if(panel&&!observer){observer=new MutationObserver(()=>{if(!decorating)setTimeout(decorate,0)});observer.observe(panel,{childList:true,subtree:true})}
    const charsBox=document.getElementById('chars');
    if(charsBox&&!charsBox.dataset.bossGuard21546){charsBox.dataset.bossGuard21546='1';charsBox.addEventListener('click',e=>{const b=read()?.active?.bossChallenge;if(!b||!['pending','active','draw'].includes(b.status))return;e.preventDefault();e.stopPropagation();const st=document.getElementById('status');if(st)st.textContent='杯の途中です。トーナメント優勝後は杯ボスとの対局が決まっています。'},true)}
  }

  let tries=0;const timer=setInterval(()=>{patchAPI();installObservers();promoteTournamentChampion();decorate();if(patched&&++tries>20)clearInterval(timer)},80);
  setInterval(()=>{if(!patched)patchAPI();installObservers();promoteTournamentChampion();decorate()},500);
  patchAPI();installObservers();

  window.AI_SHOGI_TOURNAMENT_BOSS={
    version:'21546a',challenge:()=>startBoss(false),state:()=>JSON.parse(JSON.stringify(read()?.active?.bossChallenge||null)),
    audit:()=>{const a=read()?.active,cup=cupOf(a),r0=a?.bracket?.rounds?.[0]||[],b=a?.bossChallenge;return{ok:patched,version:'21546a',bossSeparate:true,boss:cup?.boss||null,bossInBracket:!!(cup&&r0.includes(cup.boss)),entrants:r0.length,bossStatus:b?.status||null,tournamentChampion:a?.bracket?.rounds?.[4]?.[0]===PLAYER,trophy:cup?Number(read()?.trophies?.[cup.id]||0):0}}
  };
})();