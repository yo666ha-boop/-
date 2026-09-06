/* みつき将棋 - キャラ杯トーナメント v2.15.41a
 * 16人制・4勝優勝。実キャラ画像を再利用し、AI同士の勝敗は開始時に確定しない。
 * プレイヤー対局と同じ回戦のAI戦を段階進行させ、大会表・速報・優勝回数を保存する。
 */
(function installTournament21541(){
  if(window.__AI_SHOGI_TOURNAMENT_21541)return;
  window.__AI_SHOGI_TOURNAMENT_21541=true;

  const KEY='aiShogiTournament21540';
  const VERSION=3;
  const PLAYER='__PLAYER__';
  const ROUNDS=['1回戦','準々決勝','準決勝','決勝'];
  const BRACKET_LABELS=[...ROUNDS,'優勝'];
  const CUPS=[
    {id:'shinji',name:'しんじ杯',boss:'しんじ',bossRating:1550,min:0,max:1649,label:'入門〜初級'},
    {id:'ayanami',name:'あやなみ杯',boss:'あやなみ',bossRating:1800,min:1650,max:1899,label:'初中級'},
    {id:'kenshiro',name:'ケンシロウ杯',boss:'ケンシロウ',bossRating:2100,min:1900,max:2149,label:'中上級'},
    {id:'kaworu',name:'カヲル杯',boss:'カヲル',bossRating:2400,min:2150,max:2449,label:'上級'},
    {id:'akiou',name:'あき王杯',boss:'あき王',bossRating:2700,min:2450,max:2749,label:'超上級'},
    {id:'micchan',name:'みっちゃん杯',boss:'みっちゃん',bossRating:2850,min:2750,max:2899,label:'最上級'},
    {id:'mitsuki',name:'みつき杯',boss:'みつき',bossRating:3000,min:2900,max:3099,label:'最高峰'},
    {id:'future',name:'未来みつき杯',boss:'未来からやってきたみつき',bossRating:3400,min:3100,max:9999,label:'究極'}
  ];

  const now=()=>Date.now();
  const fresh=()=>({version:VERSION,active:null,trophies:{},history:[]});
  const read=()=>{
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'null');
      if(x&&x.version===VERSION)return x;
      if(x&&(x.version===1||x.version===2))return{version:VERSION,active:null,trophies:x.trophies||{},history:Array.isArray(x.history)?x.history:[]};
      return fresh();
    }catch(e){return fresh()}
  };
  const write=s=>{try{s.version=VERSION;localStorage.setItem(KEY,JSON.stringify(s));return true}catch(e){return false}};
  const chars=()=>{try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}};
  const currentStats=()=>{try{return window.AIShogiIOS?.stats?.()||{rating:1500,w:0,l:0,d:0}}catch(e){return{rating:1500,w:0,l:0,d:0}}};
  const currentState=()=>{try{return window.AIShogiIOS?.state?.()||null}catch(e){return null}};
  const cupById=id=>CUPS.find(c=>c.id===id)||null;
  const charIndex=name=>chars().findIndex(c=>c.name===name);
  const ratingOf=name=>name===PLAYER?(Number(currentStats().rating)||1500):(chars().find(c=>c.name===name)?.rating??null);
  const displayName=name=>name===PLAYER?'あなた':name;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function cardName(card){return (card?.querySelector?.('.chName')?.textContent||card?.querySelector?.('img')?.alt||'').trim()}
  function avatarFor(name){
    if(!name||name===PLAYER)return'';
    try{
      const card=[...document.querySelectorAll('#chars .ch')].find(c=>cardName(c)===name);
      const img=card?.querySelector('img');
      return img?.currentSrc||img?.src||'';
    }catch(e){return''}
  }
  function avatarHtml(name){
    if(name===PLAYER)return'<span class="tourAvatar tourAvatarPlayer" aria-hidden="true">あ</span>';
    const src=avatarFor(name);
    if(src)return'<span class="tourAvatar"><img src="'+esc(src)+'" alt="" loading="lazy"></span>';
    const initial=Array.from(String(name||'?'))[0]||'?';
    return'<span class="tourAvatar tourAvatarFallback" aria-hidden="true">'+esc(initial)+'</span>';
  }

  function recommendedCup(rating=currentStats().rating){
    const r=Number(rating)||1500;
    return CUPS.find(c=>r>=c.min&&r<=c.max)||CUPS.at(-1);
  }
  function validCup(c){return !!(c&&charIndex(c.boss)>=0&&chars().filter(x=>x.name!==c.boss).length>=14)}
  function phaseText(a){
    if(!a)return'';
    if(a.status==='champion')return'優勝！';
    if(a.status==='lost')return'敗退';
    if(a.status==='draw')return ROUNDS[a.round]+'・指し直し';
    if(a.pending==='next')return ROUNDS[Math.max(0,a.round-1)]+'突破';
    return ROUNDS[a.round]||'大会中';
  }

  function hash32(text){
    let h=2166136261>>>0;
    for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    h^=h<<13;h^=h>>>17;h^=h<<5;return h>>>0;
  }
  function seeded01(seed,key){return hash32(String(seed)+'|'+String(key))/4294967296}
  function seededShuffle(list,seed){
    const a=list.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(seeded01(seed,'shuffle-'+i)*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  function fieldScore(ch,bossRating){
    const r=Number(ch.rating)||1500,d=r-bossRating;
    return d<=0?Math.abs(d):(Math.abs(d)*4+120);
  }
  function buildEntrants(cup,seed){
    const available=chars().filter(ch=>ch.name!==cup.boss).slice().sort((a,b)=>fieldScore(a,cup.bossRating)-fieldScore(b,cup.bossRating)||(Number(a.rating)||0)-(Number(b.rating)||0)||String(a.name).localeCompare(String(b.name),'ja'));
    const chosen=seededShuffle(available.slice(0,14).map(ch=>ch.name),seed+'|field');
    return[PLAYER,...chosen,cup.boss];
  }
  function resultKey(round,match){return round+':'+match}
  function buildBracket(cup,seed){
    return{seed,rounds:[buildEntrants(cup,seed),Array(8).fill(null),Array(4).fill(null),Array(2).fill(null),Array(1).fill(null)],matches:{},results:{}};
  }
  function currentOpponent(a){
    const row=a?.bracket?.rounds?.[a.round];
    if(!Array.isArray(row))return null;
    return row[(Number(a.playerSlot)||0)^1]||null;
  }
  function addNews(a,text,kind='result'){
    a.news=Array.isArray(a.news)?a.news:[];
    a.news.unshift({at:now(),text,kind});
    a.news=a.news.slice(0,8);
  }
  function liveWinner(a,b,cup){
    if(a===cup.boss||b===cup.boss)return cup.boss;
    const ra=Number(ratingOf(a))||1500,rb=Number(ratingOf(b))||1500;
    const p=1/(1+Math.pow(10,(rb-ra)/400));
    let roll;
    try{const u=new Uint32Array(1);crypto.getRandomValues(u);roll=u[0]/4294967296}catch(e){roll=Math.random()}
    return roll<p?a:b;
  }
  function scheduleDelay(round,match){
    const base=[9000,8000,7000,6000][round]||7000;
    return base+((match*1700+Math.floor(Math.random()*3500))%9000);
  }
  function scheduleRoundAI(a,cup,round){
    const src=a?.bracket?.rounds?.[round];
    if(!Array.isArray(src))return 0;
    a.bracket.matches=a.bracket.matches||{};
    let started=0;
    for(let match=0;match<src.length/2;match++){
      const key=resultKey(round,match),p1=src[match*2],p2=src[match*2+1];
      if(!p1||!p2||p1===PLAYER||p2===PLAYER||a.bracket.rounds[round+1]?.[match])continue;
      const old=a.bracket.matches[key];
      if(old?.status==='running'||old?.status==='done')continue;
      const startedAt=now(),dueAt=startedAt+scheduleDelay(round,match);
      a.bracket.matches[key]={round,match,a:p1,b:p2,status:'running',startedAt,dueAt,winner:null,resolvedAt:null};
      addNews(a,ROUNDS[round]+'：'+displayName(p1)+' vs '+displayName(p2)+' 対局開始','start');
      started++;
    }
    return started;
  }
  function resolveAIMatch(a,cup,key,force=false){
    const m=a?.bracket?.matches?.[key];
    if(!m||m.status!=='running'||(!force&&Number(m.dueAt)>now()))return false;
    const dst=a.bracket.rounds[m.round+1];
    if(!Array.isArray(dst))return false;
    const winner=liveWinner(m.a,m.b,cup);
    m.status='done';m.winner=winner;m.resolvedAt=now();dst[m.match]=winner;
    a.bracket.results[key]={a:m.a,b:m.b,winner,kind:'ai',resolvedAt:m.resolvedAt};
    addNews(a,ROUNDS[m.round]+'：'+displayName(winner)+'が勝利','result');
    return true;
  }
  function advanceAIProgress(store,forceRound=null){
    const a=store?.active,cup=cupById(a?.cupId);if(!a||!cup)return false;
    let changed=false;
    const round=forceRound===null?Number(a.round)||0:Number(forceRound);
    scheduleRoundAI(a,cup,round);
    for(const [key,m] of Object.entries(a.bracket.matches||{})){
      if(m.status!=='running')continue;
      if(a.status!=='lost'&&m.round!==round)continue;
      if(resolveAIMatch(a,cup,key,forceRound!==null))changed=true;
    }
    if(a.status==='lost'){
      for(let r=0;r<ROUNDS.length;r++){
        const row=a.bracket.rounds[r];if(!Array.isArray(row))continue;
        const allParticipants=row.every(Boolean);
        if(!allParticipants)break;
        if(r===ROUNDS.length-1&&a.bracket.rounds[4][0])break;
        scheduleRoundAI(a,cup,r);
        const running=Object.values(a.bracket.matches||{}).some(m=>m.round===r&&m.status==='running');
        if(running)break;
      }
    }
    if(changed)write(store);
    return changed;
  }
  function settleRoundAI(store,round){
    const a=store.active,cup=cupById(a?.cupId);if(!a||!cup)return;
    scheduleRoundAI(a,cup,round);
    for(const [key,m] of Object.entries(a.bracket.matches||{}))if(m.round===round&&m.status==='running')resolveAIMatch(a,cup,key,true);
  }
  function recordPlayerResult(a,kind){
    const round=Number(a.round)||0,slot=Number(a.playerSlot)||0,match=Math.floor(slot/2),opponent=currentOpponent(a),key=resultKey(round,match);
    if(!opponent)return false;
    a.bracket.results=a.bracket.results||{};
    if(kind==='draw')a.bracket.results[key]={a:PLAYER,b:opponent,winner:null,kind:'draw'};
    else a.bracket.results[key]={a:PLAYER,b:opponent,winner:kind==='win'?PLAYER:opponent,kind:'player',resolvedAt:now()};
    return true;
  }

  function ensureStyle(){
    if(document.getElementById('tournament21541Style'))return;
    const s=document.createElement('style');s.id='tournament21541Style';s.textContent=`
#tournament21540Btn{position:relative}#tournament21540Btn .tourDot{display:inline-block;width:7px;height:7px;border-radius:999px;background:currentColor;margin-left:5px;vertical-align:1px}
#tournament21540Panel{margin:10px 0 12px;border:1px solid #8b6c2f;border-radius:14px;background:#091411;padding:10px;color:#f1dfa6;display:none}#tournament21540Panel.on{display:block}
.tourHead{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}.tourHead strong{font-size:15px}.tourHead .miniBtn{white-space:nowrap}.tourLead{font-size:12px;line-height:1.5;color:#cfc39e;margin-bottom:8px}.tourRecommended{font-weight:900;color:#ffe49a}
.tourActive{border:1px solid #846526;border-radius:11px;padding:9px;margin:8px 0;background:#0e1b17}.tourActiveTitle{font-weight:900;margin-bottom:4px}.tourCurrentMatch{font-size:12px;font-weight:900;margin:7px 0}.tourCurrentMatch .bossMark{color:#ffe174}.tourActions{display:flex;gap:6px;flex-wrap:wrap}.tourActions .btn{flex:1 1 130px}
.tourGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.tourCup{border:1px solid #4c4329;border-radius:11px;padding:8px;background:#0b1512;min-width:0}.tourCup.recommended{border-color:#d3a93d;box-shadow:0 0 0 1px #d3a93d inset}.tourCup.won{background:#171a0e}.tourCupName{font-weight:900;font-size:13px;display:flex;gap:5px;align-items:center;flex-wrap:wrap}.tourCupMeta{font-size:11px;line-height:1.4;color:#bdb18c;margin:4px 0 7px}.tourCup .btn{width:100%;padding:7px 8px}.tourTag{font-size:10px;border:1px solid currentColor;border-radius:999px;padding:1px 5px}.tourTrophy{color:#ffe174}.tourResult{font-size:12px;font-weight:900;margin:6px 0}.tourSubtle{font-size:11px;color:#a99f80;line-height:1.4}
.tourNews{border:1px solid #365147;border-radius:9px;background:#07110e;padding:6px 8px;margin:7px 0}.tourNewsTitle{font-size:11px;font-weight:900;color:#f0d47e;margin-bottom:3px}.tourNewsItem{font-size:10px;line-height:1.45;color:#c7c0a7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tourNewsItem.start::before{content:'● ';color:#ef9d31}.tourNewsItem.result::before{content:'✓ ';color:#77c96b}
.tourBracketWrap{margin:8px 0 10px}.tourBracketCaption{display:flex;justify-content:space-between;gap:8px;align-items:end;font-size:11px;color:#cfc39e;margin-bottom:5px}.tourBracketScroll{overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:5px}.tourBracket{display:flex;gap:6px;min-width:880px;border:1px solid #3f3827;border-radius:11px;background:#07100e;padding:7px}.tourBracketRound{width:164px;flex:0 0 164px;min-width:0}.tourBracketRoundTitle{text-align:center;font-size:11px;font-weight:900;color:#e6ce82;margin-bottom:4px}.tourBracketRoundBody{height:650px;display:flex;flex-direction:column;justify-content:space-around;gap:2px}
.tourBracketSlot{min-height:40px;border:1px solid #423c2a;border-radius:8px;background:#0b1512;padding:4px 5px;font-size:10px;line-height:1.15;display:flex;align-items:center;gap:5px;min-width:0}.tourAvatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;overflow:hidden;border:1px solid #786431;background:#17201b;display:grid;place-items:center;font-weight:900}.tourAvatar img{width:100%;height:100%;object-fit:cover;display:block}.tourAvatarPlayer{background:#153866;border-color:#65a8ff;color:white}.tourAvatarFallback{font-size:13px}.tourSlotMain{min-width:0;flex:1}.tourSlotName{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800}.tourSlotMeta{display:flex;gap:4px;align-items:center;margin-top:2px}.tourBracketRating{font-size:9px;opacity:.74}.tourMatchState{font-size:9px;border-radius:999px;padding:1px 4px;border:1px solid #625a43;color:#bdb393}.tourMatchState.running{border-color:#c77c26;color:#ffc06f}.tourMatchState.win{border-color:#4a8c46;color:#9ee896}.tourMatchState.loss{opacity:.7}.tourMatchState.wait{opacity:.65}
.tourBracketSlot.player{border-color:#65a8ff;background:#102034;color:#dbeeff;font-weight:900}.tourBracketSlot.boss{border-color:#c99c32;background:#1b180e}.tourBracketSlot.current{outline:2px solid #65a8ff;outline-offset:1px}.tourBracketSlot.currentOpp{outline:2px solid #d3a93d;outline-offset:1px}.tourBracketSlot.champion{border-color:#ffe174;background:#25200e;color:#ffe9a3;font-weight:900}.tourBracketSlot.empty{opacity:.42}
body.tournament21540Active #chars{opacity:.55}.tourBlockedHint{display:none}body.tournament21540Active .tourBlockedHint{display:block;font-size:11px;color:#d7bd72;margin-top:5px}
@media(max-width:520px){.tourGrid{grid-template-columns:1fr}.tourActions .btn{flex-basis:100%}.tourBracketRoundBody{height:620px}.tourBracket{min-width:820px}.tourBracketRound{width:152px;flex-basis:152px}}
`;document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyle();
    const controls=document.querySelector('.side .controls');if(!controls)return false;
    let btn=document.getElementById('tournament21540Btn');
    if(!btn){
      btn=document.createElement('button');btn.className='btn';btn.id='tournament21540Btn';btn.type='button';btn.innerHTML='🏆 大会モード';
      btn.addEventListener('click',()=>{const p=document.getElementById('tournament21540Panel');p?.classList.toggle('on');render()});
      controls.appendChild(btn);
    }
    let panel=document.getElementById('tournament21540Panel');
    if(!panel){
      panel=document.createElement('section');panel.id='tournament21540Panel';panel.innerHTML='<div class="tourHead"><strong>🏆 キャラクター杯</strong><button class="miniBtn" id="tourClose21540">閉じる</button></div><div id="tourBody21540"></div>';
      controls.insertAdjacentElement('afterend',panel);
      panel.querySelector('#tourClose21540')?.addEventListener('click',()=>panel.classList.remove('on'));
    }
    const charsBox=document.getElementById('chars');
    if(charsBox&&!charsBox.dataset.tourGuard21541){
      charsBox.dataset.tourGuard21541='1';
      charsBox.addEventListener('click',e=>{
        const a=read().active;if(!a||!['active','draw'].includes(a.status))return;
        e.preventDefault();e.stopPropagation();
        const st=document.getElementById('status');if(st)st.textContent='大会中は対戦相手が決まっています。大会をやめると通常の相手選択に戻れます。';
      },true);
    }
    return true;
  }

  function slotState(a,name,round,slot){
    if(!name)return{label:'未定',cls:'wait'};
    if(round===4)return{label:'優勝',cls:'win'};
    if(round===a.round&&['active','draw'].includes(a.status)&&(name===PLAYER||slot===(a.playerSlot^1)))return{label:'対局中',cls:'running'};
    const match=Math.floor(slot/2),key=resultKey(round,match),m=a.bracket.matches?.[key],r=a.bracket.results?.[key];
    if((name===PLAYER||r?.kind==='player')&&r){
      if(r.winner===name)return{label:'勝利',cls:'win'};
      if(r.kind==='draw')return{label:'指し直し',cls:'running'};
      return{label:'敗退',cls:'loss'};
    }
    if(m?.status==='running')return{label:'対局中',cls:'running'};
    if(m?.status==='done')return m.winner===name?{label:'勝利',cls:'win'}:{label:'敗退',cls:'loss'};
    if(round<a.round)return{label:'勝利',cls:'win'};
    return{label:'待機',cls:'wait'};
  }
  function bracketSlot(name,round,slot,a,cup){
    const current=round===a.round&&slot===a.playerSlot&&['active','draw'].includes(a.status),opp=round===a.round&&slot===(a.playerSlot^1)&&['active','draw'].includes(a.status),champion=round===4&&!!name;
    const cls=['tourBracketSlot',!name?'empty':'',name===PLAYER?'player':'',name===cup.boss?'boss':'',current?'current':'',opp?'currentOpp':'',champion?'champion':''].filter(Boolean).join(' ');
    if(!name)return'<div class="'+cls+'"><span class="tourAvatar tourAvatarFallback">?</span><div class="tourSlotMain"><span class="tourSlotName">—</span><div class="tourSlotMeta"><small class="tourMatchState wait">未定</small></div></div></div>';
    const r=ratingOf(name),boss=name===cup.boss?' 👑':'',trophy=champion?' 🏆':'',state=slotState(a,name,round,slot);
    return'<div class="'+cls+'">'+avatarHtml(name)+'<div class="tourSlotMain"><span class="tourSlotName">'+esc(displayName(name))+boss+trophy+'</span><div class="tourSlotMeta">'+(r?'<small class="tourBracketRating">R'+r+'</small>':'')+'<small class="tourMatchState '+state.cls+'">'+state.label+'</small></div></div></div>';
  }
  function renderBracket(a,cup){
    if(!a?.bracket?.rounds)return'';
    const cols=a.bracket.rounds.map((row,round)=>'<div class="tourBracketRound" data-round="'+round+'"><div class="tourBracketRoundTitle">'+esc(BRACKET_LABELS[round])+'</div><div class="tourBracketRoundBody">'+row.map((name,slot)=>bracketSlot(name,round,slot,a,cup)).join('')+'</div></div>').join('');
    return'<div class="tourBracketWrap"><div class="tourBracketCaption"><b>16人トーナメント表</b><span>他の山も同じ回戦を進行中</span></div><div class="tourBracketScroll"><div class="tourBracket">'+cols+'</div></div></div>';
  }
  function renderNews(a){
    const news=(a?.news||[]).slice(0,5);
    if(!news.length)return'';
    return'<div class="tourNews"><div class="tourNewsTitle">📣 大会速報</div>'+news.map(n=>'<div class="tourNewsItem '+esc(n.kind||'result')+'">'+esc(n.text)+'</div>').join('')+'</div>';
  }
  function renderActive(store){
    const a=store.active;if(!a)return'';
    const cup=cupById(a.cupId);if(!cup)return'';
    const opponent=currentOpponent(a),champion=a.bracket?.rounds?.[4]?.[0];
    let result='';
    if(a.status==='champion')result='<div class="tourResult tourTrophy">🏆 '+esc(cup.name)+' 優勝！ 4連勝で頂点です。</div>';
    else if(a.status==='lost')result='<div class="tourResult">今回は敗退。大会はそのまま進行しています。'+(champion?' 優勝：'+esc(displayName(champion)):'')+'</div>';
    else if(a.status==='draw')result='<div class="tourResult">引き分けのため同じ対局を指し直します。</div>';
    else if(a.pending==='next')result='<div class="tourResult">勝ち！ 他の山も結果が出て、次は '+esc(ROUNDS[a.round])+' です。</div>';
    else result='<div class="tourResult">'+esc(phaseText(a))+'　他のAI戦も同時進行中</div>';
    const bossMark=opponent===cup.boss?'<span class="bossMark"> 👑 優勝後ボス</span>':'';
    const current=opponent&&['active','draw'].includes(a.status)?'<div class="tourCurrentMatch">あなたの相手：'+esc(opponent)+' R'+(ratingOf(opponent)||'—')+bossMark+'</div>':'';
    let action='';
    if(a.status==='champion')action='<button class="btn primary" data-tour-retry="'+cup.id+'">もう一度この杯</button><button class="btn" data-tour-exit="1">大会を終える</button>';
    else if(a.status==='lost')action='<button class="btn primary" data-tour-retry="'+cup.id+'">再挑戦</button><button class="btn" data-tour-exit="1">大会を終える</button>';
    else if(a.status==='draw')action='<button class="btn primary" data-tour-replay="1">指し直す</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    else if(a.pending==='next')action='<button class="btn primary" data-tour-next="1">次の対局へ</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    else action='<button class="btn" data-tour-current="1">現在の対局を開く</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    return'<div class="tourActive"><div class="tourActiveTitle">'+esc(cup.name)+'　'+esc(cup.label)+'　16人制</div>'+current+result+renderNews(a)+renderBracket(a,cup)+'<div class="tourActions">'+action+'</div><div class="tourBlockedHint">大会中は通常のキャラ選択をロックしています。</div></div>';
  }

  function render(){
    if(!ensureUI())return;
    const store=read(),body=document.getElementById('tourBody21540');if(!body)return;
    const rating=Number(currentStats().rating)||1500,rec=recommendedCup(rating);
    document.body.classList.toggle('tournament21540Active',!!store.active&&['active','draw'].includes(store.active.status));
    const btn=document.getElementById('tournament21540Btn');if(btn)btn.innerHTML='🏆 大会モード'+(store.active&&['active','draw'].includes(store.active.status)?'<span class="tourDot"></span>':'');
    const cards=CUPS.map(c=>{
      const wins=Number(store.trophies?.[c.id]||0),recommended=c.id===rec.id;
      return'<div class="tourCup '+(recommended?'recommended ':'')+(wins?'won':'')+'"><div class="tourCupName">'+esc(c.name)+(recommended?'<span class="tourTag">おすすめ</span>':'')+(wins?'<span class="tourTrophy">🏆×'+wins+'</span>':'')+'</div><div class="tourCupMeta">'+esc(c.label)+' ／ 優勝後ボス '+esc(c.boss)+' R'+c.bossRating+'<br>16人・4勝で優勝</div><button class="btn '+(recommended?'primary':'')+'" data-tour-start="'+c.id+'">挑戦する</button></div>';
    }).join('');
    body.innerHTML='<div class="tourLead">あなたは <b>R'+rating+'</b>。現在のおすすめは <span class="tourRecommended">'+esc(rec.name)+'</span>。他のAI同士もあなたと同じ回戦をリアルタイム進行し、勝者は最初から決まっていません。</div>'+renderActive(store)+'<div class="tourGrid">'+cards+'</div>';
    body.querySelectorAll('[data-tour-start]').forEach(b=>b.addEventListener('click',()=>startCup(b.dataset.tourStart)));
    body.querySelectorAll('[data-tour-retry]').forEach(b=>b.addEventListener('click',()=>startCup(b.dataset.tourRetry,true)));
    body.querySelector('[data-tour-next]')?.addEventListener('click',()=>startCurrentMatch());
    body.querySelector('[data-tour-replay]')?.addEventListener('click',()=>startCurrentMatch(true));
    body.querySelector('[data-tour-current]')?.addEventListener('click',()=>{document.getElementById('tournament21540Panel')?.classList.remove('on');document.getElementById('board')?.scrollIntoView?.({block:'center'})});
    body.querySelectorAll('[data-tour-exit]').forEach(b=>b.addEventListener('click',exitCup));
  }

  function startCup(id,retry=false){
    const cup=cupById(id);if(!validCup(cup)){alert('この杯のキャラクター設定を確認できませんでした。');return false}
    const st=currentState(),store=read();
    if(!retry&&st&&Array.isArray(st.log)&&st.log.length>0&&!document.getElementById('resultBanner')?.classList.contains('on')){
      if(!confirm('今の対局を中断して '+cup.name+' を始めますか？'))return false;
    }
    const startedAt=now(),rating=Number(currentStats().rating)||1500,seed=cup.id+'-'+startedAt+'-'+rating;
    store.active={cupId:cup.id,round:0,playerSlot:0,status:'active',pending:null,matchToken:1,processedToken:0,startedAt,ratingAtStart:rating,bracket:buildBracket(cup,seed),news:[]};
    addNews(store.active,cup.name+' 開幕。1回戦8試合がスタート','start');
    scheduleRoundAI(store.active,cup,0);
    store.active.lastOpponent=currentOpponent(store.active);
    store.history=Array.isArray(store.history)?store.history:[];store.history.unshift({cupId:cup.id,startedAt,rating,format:'16-player-live'});store.history=store.history.slice(0,30);
    write(store);render();return startCurrentMatch();
  }
  function startCurrentMatch(replay=false){
    const store=read(),a=store.active,cup=cupById(a?.cupId);if(!a||!cup)return false;
    if(a.status==='champion'||a.status==='lost')return false;
    if(a.pending==='next')a.pending=null;
    if(a.status==='draw')a.status='active';
    scheduleRoundAI(a,cup,a.round);
    const name=currentOpponent(a),idx=charIndex(name);if(!name||idx<0)return false;
    if(replay||Number(a.processedToken)===Number(a.matchToken))a.matchToken=(Number(a.matchToken)||0)+1;
    a.processedToken=0;a.lastOpponent=name;write(store);
    try{window.AIShogiIOS.select(idx)}catch(e){console.error('tournament select failed',e);return false}
    const p=document.getElementById('tournament21540Panel');if(p)p.classList.remove('on');
    const status=document.getElementById('status');if(status)status.textContent=cup.name+' '+ROUNDS[a.round]+'：'+name+' と対局。ほかのAI戦も同時進行中です。';
    render();return true;
  }
  function exitCup(){
    const store=read();if(store.active&&['active','draw'].includes(store.active.status)){
      if(!confirm('大会を途中でやめて通常対局に戻りますか？'))return false;
    }
    store.active=null;write(store);render();return true;
  }

  function handleResult(kind){
    const store=read(),a=store.active,cup=cupById(a?.cupId);if(!a||!cup||a.status!=='active'||a.pending)return;
    if(Number(a.processedToken)===Number(a.matchToken)&&Number(a.matchToken)>0)return;
    const opponent=currentOpponent(a);if(!opponent)return;
    a.processedToken=Number(a.matchToken)||1;
    settleRoundAI(store,a.round);
    recordPlayerResult(a,kind);
    if(kind==='win'){
      addNews(a,ROUNDS[a.round]+'：あなたが '+displayName(opponent)+' に勝利','result');
      if(a.round>=ROUNDS.length-1){
        a.bracket.rounds[4][0]=PLAYER;a.status='champion';a.finishedAt=now();a.pending=null;
        store.trophies=store.trophies||{};store.trophies[cup.id]=(Number(store.trophies[cup.id])||0)+1;
        addNews(a,cup.name+' 優勝！','result');
      }else{
        const oldRound=a.round,nextSlot=Math.floor(a.playerSlot/2);
        a.bracket.rounds[oldRound+1][nextSlot]=PLAYER;
        a.round++;a.playerSlot=nextSlot;a.pending='next';a.status='active';a.lastOpponent=currentOpponent(a);
      }
    }else if(kind==='loss'){
      addNews(a,ROUNDS[a.round]+'：あなたは '+displayName(opponent)+' に敗退','result');
      if(a.round<ROUNDS.length){a.bracket.rounds[a.round+1][Math.floor(a.playerSlot/2)]=opponent}
      a.status='lost';a.finishedAt=now();a.pending=null;
      scheduleRoundAI(a,cup,a.round+1);
    }else{
      a.status='draw';a.pending=null;addNews(a,ROUNDS[a.round]+'：引き分け・指し直し','result');
    }
    write(store);render();
    const panel=document.getElementById('tournament21540Panel');if(panel)panel.classList.add('on');
  }

  function installResultObserver(){
    const rb=document.getElementById('resultBanner');if(!rb||rb.dataset.tourObserve21541)return;
    rb.dataset.tourObserve21541='1';
    const check=()=>{
      if(!rb.classList.contains('on'))return;
      if(rb.classList.contains('result-win'))handleResult('win');
      else if(rb.classList.contains('result-loss'))handleResult('loss');
      else if(rb.classList.contains('result-draw'))handleResult('draw');
    };
    new MutationObserver(check).observe(rb,{attributes:true,childList:true,subtree:true});
  }
  function hydrateFromRestoredStorage(){
    const store=read(),a=store.active;if(!a)return render();
    const cup=cupById(a.cupId);
    if(!cup||!a.bracket?.rounds?.[0]||a.bracket.rounds[0].length!==16){store.active=null;write(store);return render()}
    a.bracket.matches=a.bracket.matches||{};a.bracket.results=a.bracket.results||{};a.news=Array.isArray(a.news)?a.news:[];
    if(['active','draw'].includes(a.status))scheduleRoundAI(a,cup,a.round);
    write(store);render();
  }

  let boots=0;const timer=setInterval(()=>{ensureUI();installResultObserver();render();if(window.AIShogiIOS&&++boots>10)clearInterval(timer)},180);
  setInterval(()=>{const store=read(),a=store.active;if(!a)return;const cup=cupById(a.cupId);if(!cup)return;const before=JSON.stringify(a.bracket.rounds)+JSON.stringify(a.bracket.matches);advanceAIProgress(store);if(JSON.stringify(a.bracket.rounds)+JSON.stringify(a.bracket.matches)!==before){write(store);render()}},900);
  window.addEventListener('ai-shogi-local-save',()=>setTimeout(hydrateFromRestoredStorage,0));
  window.addEventListener('ai-shogi-profile-stats',()=>setTimeout(render,0));

  window.AI_SHOGI_TOURNAMENT={
    version:'21541a',cups:()=>CUPS.map(c=>({...c})),recommended:()=>({...recommendedCup()}),state:()=>JSON.parse(JSON.stringify(read())),start:startCup,next:startCurrentMatch,exit:exitCup,render,
    tick:()=>{const store=read();advanceAIProgress(store);write(store);render();return JSON.parse(JSON.stringify(store.active))},
    settleCurrentRound:()=>{const store=read();if(store.active)settleRoundAI(store,store.active.round);write(store);render();return JSON.parse(JSON.stringify(store.active))},
    audit:()=>{const s=read(),r=Number(currentStats().rating)||1500,rec=recommendedCup(r),a=s.active,cup=cupById(a?.cupId),matches=Object.values(a?.bracket?.matches||{}),portraitNames=[...new Set((a?.bracket?.rounds?.flat?.()||[]).filter(n=>n&&n!==PLAYER))];return{ok:!!window.AIShogiIOS,cups:CUPS.length,rating:r,recommended:rec.id,format:'16-player-live',bracketSize:16,rounds:4,active:a?JSON.parse(JSON.stringify(a)):null,currentOpponent:a?currentOpponent(a):null,bossSeeded:!!(a&&cup&&a.bracket?.rounds?.[0]?.[15]===cup.boss),runningAI:matches.filter(m=>m.status==='running').length,resolvedAI:matches.filter(m=>m.status==='done').length,liveProgress:true,portraits:portraitNames.filter(n=>!!avatarFor(n)).length,newsCount:a?.news?.length||0,charactersReady:CUPS.every(validCup),button:!!document.getElementById('tournament21540Btn'),panel:!!document.getElementById('tournament21540Panel'),bracketUI:!!document.querySelector('.tourBracket')}}
  };
})();