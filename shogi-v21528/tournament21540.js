/* みつき将棋 - キャラ杯トーナメント v2.15.40b
 * 16人制・4勝優勝のシンプル大会版。
 * プレイヤーは左の山、杯名の看板キャラは反対側の第1シードとして決勝まで進む。
 * AI同士は表示Rを基準に自動進行し、大会表・優勝回数・進行は aiShogiTournament21540 に保存する。
 */
(function installTournament21540(){
  if(window.__AI_SHOGI_TOURNAMENT_21540)return;
  window.__AI_SHOGI_TOURNAMENT_21540=true;

  const KEY='aiShogiTournament21540';
  const VERSION=2;
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
      if(x&&x.version===1)return{version:VERSION,active:null,trophies:x.trophies||{},history:Array.isArray(x.history)?x.history:[]};
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
  function random01(seed,key){return hash32(String(seed)+'|'+String(key))/4294967296}
  function seededShuffle(list,seed){
    const a=list.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(random01(seed,'shuffle-'+i)*(i+1));[a[i],a[j]]=[a[j],a[i]]}
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
  function simulatedWinner(a,b,cup,seed,round,match){
    if(a===cup.boss||b===cup.boss)return cup.boss;
    const ra=Number(ratingOf(a))||1500,rb=Number(ratingOf(b))||1500;
    const p=1/(1+Math.pow(10,(rb-ra)/400));
    return random01(seed,'match-'+round+'-'+match+'-'+a+'-'+b)<p?a:b;
  }
  function simulateKnownMatches(bracket,cup){
    if(!bracket||!Array.isArray(bracket.rounds))return bracket;
    bracket.results=bracket.results||{};
    for(let round=0;round<ROUNDS.length;round++){
      const src=bracket.rounds[round],dst=bracket.rounds[round+1];
      if(!Array.isArray(src)||!Array.isArray(dst))continue;
      for(let match=0;match<src.length/2;match++){
        if(dst[match])continue;
        const a=src[match*2],b=src[match*2+1];
        if(!a||!b||a===PLAYER||b===PLAYER)continue;
        const winner=simulatedWinner(a,b,cup,bracket.seed,round,match);
        dst[match]=winner;
        bracket.results[resultKey(round,match)]={a,b,winner,kind:'ai'};
      }
    }
    return bracket;
  }
  function buildBracket(cup,seed){
    const bracket={seed,rounds:[buildEntrants(cup,seed),Array(8).fill(null),Array(4).fill(null),Array(2).fill(null),Array(1).fill(null)],results:{}};
    return simulateKnownMatches(bracket,cup);
  }
  function currentOpponent(a){
    const row=a?.bracket?.rounds?.[a.round];
    if(!Array.isArray(row))return null;
    return row[(Number(a.playerSlot)||0)^1]||null;
  }
  function recordPlayerResult(a,cup,kind){
    const round=Number(a.round)||0,slot=Number(a.playerSlot)||0,match=Math.floor(slot/2),opponent=currentOpponent(a),key=resultKey(round,match);
    if(!opponent)return false;
    a.bracket.results=a.bracket.results||{};
    if(kind==='draw')a.bracket.results[key]={a:PLAYER,b:opponent,winner:null,kind:'draw'};
    else a.bracket.results[key]={a:PLAYER,b:opponent,winner:kind==='win'?PLAYER:opponent,kind:'player'};
    return true;
  }

  function ensureStyle(){
    if(document.getElementById('tournament21540Style'))return;
    const s=document.createElement('style');s.id='tournament21540Style';s.textContent=`
#tournament21540Btn{position:relative}
#tournament21540Btn .tourDot{display:inline-block;width:7px;height:7px;border-radius:999px;background:currentColor;margin-left:5px;vertical-align:1px}
#tournament21540Panel{margin:10px 0 12px;border:1px solid #8b6c2f;border-radius:14px;background:#091411;padding:10px;color:#f1dfa6;display:none}
#tournament21540Panel.on{display:block}
.tourHead{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}.tourHead strong{font-size:15px}.tourHead .miniBtn{white-space:nowrap}
.tourLead{font-size:12px;line-height:1.5;color:#cfc39e;margin-bottom:8px}.tourRecommended{font-weight:900;color:#ffe49a}
.tourActive{border:1px solid #846526;border-radius:11px;padding:9px;margin:8px 0;background:#0e1b17}.tourActiveTitle{font-weight:900;margin-bottom:4px}.tourCurrentMatch{font-size:12px;font-weight:900;margin:7px 0}.tourCurrentMatch .bossMark{color:#ffe174}
.tourActions{display:flex;gap:6px;flex-wrap:wrap}.tourActions .btn{flex:1 1 130px}
.tourGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.tourCup{border:1px solid #4c4329;border-radius:11px;padding:8px;background:#0b1512;min-width:0}.tourCup.recommended{border-color:#d3a93d;box-shadow:0 0 0 1px #d3a93d inset}.tourCup.won{background:#171a0e}.tourCupName{font-weight:900;font-size:13px;display:flex;gap:5px;align-items:center;flex-wrap:wrap}.tourCupMeta{font-size:11px;line-height:1.4;color:#bdb18c;margin:4px 0 7px}.tourCup .btn{width:100%;padding:7px 8px}.tourTag{font-size:10px;border:1px solid currentColor;border-radius:999px;padding:1px 5px}.tourTrophy{color:#ffe174}.tourResult{font-size:12px;font-weight:900;margin:6px 0}.tourSubtle{font-size:11px;color:#a99f80;line-height:1.4}
.tourBracketWrap{margin:8px 0 10px}.tourBracketCaption{display:flex;justify-content:space-between;gap:8px;align-items:end;font-size:11px;color:#cfc39e;margin-bottom:5px}.tourBracketScroll{overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:5px}.tourBracket{display:flex;gap:6px;min-width:760px;border:1px solid #3f3827;border-radius:11px;background:#07100e;padding:7px}.tourBracketRound{width:140px;flex:0 0 140px;min-width:0}.tourBracketRoundTitle{text-align:center;font-size:11px;font-weight:900;color:#e6ce82;margin-bottom:4px}.tourBracketRoundBody{height:590px;display:flex;flex-direction:column;justify-content:space-around;gap:2px}.tourBracketSlot{min-height:26px;border:1px solid #423c2a;border-radius:7px;background:#0b1512;padding:4px 6px;font-size:10px;line-height:1.25;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tourBracketSlot span{overflow:hidden;text-overflow:ellipsis}.tourBracketSlot.player{border-color:#65a8ff;background:#102034;color:#dbeeff;font-weight:900}.tourBracketSlot.boss{border-color:#c99c32;background:#1b180e}.tourBracketSlot.current{outline:2px solid #65a8ff;outline-offset:1px}.tourBracketSlot.currentOpp{outline:2px solid #d3a93d;outline-offset:1px}.tourBracketSlot.champion{border-color:#ffe174;background:#25200e;color:#ffe9a3;font-weight:900}.tourBracketSlot.empty{opacity:.45}.tourBracketRating{font-size:9px;opacity:.78;margin-left:auto}
body.tournament21540Active #chars{opacity:.55}.tourBlockedHint{display:none}body.tournament21540Active .tourBlockedHint{display:block;font-size:11px;color:#d7bd72;margin-top:5px}
@media(max-width:520px){.tourGrid{grid-template-columns:1fr}.tourActions .btn{flex-basis:100%}.tourBracketRoundBody{height:540px}.tourBracket{min-width:720px}.tourBracketRound{width:132px;flex-basis:132px}}
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
    if(charsBox&&!charsBox.dataset.tourGuard21540){
      charsBox.dataset.tourGuard21540='1';
      charsBox.addEventListener('click',e=>{
        const a=read().active;if(!a||!['active','draw'].includes(a.status))return;
        e.preventDefault();e.stopPropagation();
        const st=document.getElementById('status');if(st)st.textContent='大会中は対戦相手が決まっています。大会をやめると通常の相手選択に戻れます。';
      },true);
    }
    return true;
  }

  function bracketSlot(name,round,slot,a,cup){
    const current=round===a.round&&slot===a.playerSlot&&['active','draw'].includes(a.status),opp=round===a.round&&slot===(a.playerSlot^1)&&['active','draw'].includes(a.status),champion=round===4&&!!name;
    const cls=['tourBracketSlot',!name?'empty':'',name===PLAYER?'player':'',name===cup.boss?'boss':'',current?'current':'',opp?'currentOpp':'',champion?'champion':''].filter(Boolean).join(' ');
    if(!name)return'<div class="'+cls+'"><span>—</span></div>';
    const r=ratingOf(name),boss=name===cup.boss?' 👑':'',trophy=champion?' 🏆':'';
    return'<div class="'+cls+'"><span>'+esc(displayName(name))+boss+trophy+'</span>'+(r?'<small class="tourBracketRating">R'+r+'</small>':'')+'</div>';
  }
  function renderBracket(a,cup){
    if(!a?.bracket?.rounds)return'';
    const cols=a.bracket.rounds.map((row,round)=>'<div class="tourBracketRound" data-round="'+round+'"><div class="tourBracketRoundTitle">'+esc(BRACKET_LABELS[round])+'</div><div class="tourBracketRoundBody">'+row.map((name,slot)=>bracketSlot(name,round,slot,a,cup)).join('')+'</div></div>').join('');
    return'<div class="tourBracketWrap"><div class="tourBracketCaption"><b>16人トーナメント表</b><span>横にスクロールできます</span></div><div class="tourBracketScroll"><div class="tourBracket">'+cols+'</div></div></div>';
  }

  function renderActive(store){
    const a=store.active;if(!a)return'';
    const cup=cupById(a.cupId);if(!cup)return'';
    const opponent=currentOpponent(a),champion=a.bracket?.rounds?.[4]?.[0];
    let result='';
    if(a.status==='champion')result='<div class="tourResult tourTrophy">🏆 '+esc(cup.name)+' 優勝！ 4連勝で頂点です。</div>';
    else if(a.status==='lost')result='<div class="tourResult">今回は敗退。大会優勝は '+esc(displayName(champion||cup.boss))+'。</div>';
    else if(a.status==='draw')result='<div class="tourResult">引き分けのため同じ対局を指し直します。</div>';
    else if(a.pending==='next')result='<div class="tourResult">勝ち！ 次は '+esc(ROUNDS[a.round])+' です。</div>';
    else result='<div class="tourResult">'+esc(phaseText(a))+'</div>';
    const bossMark=opponent===cup.boss?'<span class="bossMark"> 👑 決勝ボス</span>':'';
    const current=opponent&&['active','draw'].includes(a.status)?'<div class="tourCurrentMatch">次の相手：'+esc(opponent)+' R'+(ratingOf(opponent)||'—')+bossMark+'</div>':'';
    let action='';
    if(a.status==='champion')action='<button class="btn primary" data-tour-retry="'+cup.id+'">もう一度この杯</button><button class="btn" data-tour-exit="1">大会を終える</button>';
    else if(a.status==='lost')action='<button class="btn primary" data-tour-retry="'+cup.id+'">再挑戦</button><button class="btn" data-tour-exit="1">大会を終える</button>';
    else if(a.status==='draw')action='<button class="btn primary" data-tour-replay="1">指し直す</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    else if(a.pending==='next')action='<button class="btn primary" data-tour-next="1">次の対局へ</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    else action='<button class="btn" data-tour-current="1">現在の対局を開く</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    return'<div class="tourActive"><div class="tourActiveTitle">'+esc(cup.name)+'　'+esc(cup.label)+'　16人制</div>'+current+result+renderBracket(a,cup)+'<div class="tourActions">'+action+'</div><div class="tourBlockedHint">大会中は通常のキャラ選択をロックしています。</div></div>';
  }

  function render(){
    if(!ensureUI())return;
    const store=read(),body=document.getElementById('tourBody21540');if(!body)return;
    const rating=Number(currentStats().rating)||1500,rec=recommendedCup(rating);
    document.body.classList.toggle('tournament21540Active',!!store.active&&['active','draw'].includes(store.active.status));
    const btn=document.getElementById('tournament21540Btn');if(btn)btn.innerHTML='🏆 大会モード'+(store.active&&['active','draw'].includes(store.active.status)?'<span class="tourDot"></span>':'');
    const cards=CUPS.map(c=>{
      const wins=Number(store.trophies?.[c.id]||0),recommended=c.id===rec.id;
      return'<div class="tourCup '+(recommended?'recommended ':'')+(wins?'won':'')+'"><div class="tourCupName">'+esc(c.name)+(recommended?'<span class="tourTag">おすすめ</span>':'')+(wins?'<span class="tourTrophy">🏆×'+wins+'</span>':'')+'</div><div class="tourCupMeta">'+esc(c.label)+' ／ 決勝ボス '+esc(c.boss)+' R'+c.bossRating+'<br>16人・4勝で優勝</div><button class="btn '+(recommended?'primary':'')+'" data-tour-start="'+c.id+'">挑戦する</button></div>';
    }).join('');
    body.innerHTML='<div class="tourLead">あなたは <b>R'+rating+'</b>。現在のおすすめは <span class="tourRecommended">'+esc(rec.name)+'</span>。16人トーナメントを4勝すると優勝。杯名のキャラは反対側の第1シードで、決勝のてっぺんに待っています。</div>'+renderActive(store)+'<div class="tourGrid">'+cards+'</div>';
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
    store.active={cupId:cup.id,round:0,playerSlot:0,status:'active',pending:null,matchToken:1,processedToken:0,startedAt,ratingAtStart:rating,bracket:buildBracket(cup,seed)};
    store.active.lastOpponent=currentOpponent(store.active);
    store.history=Array.isArray(store.history)?store.history:[];store.history.unshift({cupId:cup.id,startedAt,rating,format:'16-player'});store.history=store.history.slice(0,30);
    write(store);render();return startCurrentMatch();
  }

  function startCurrentMatch(replay=false){
    const store=read(),a=store.active,cup=cupById(a?.cupId);if(!a||!cup)return false;
    if(a.status==='champion'||a.status==='lost')return false;
    if(a.pending==='next')a.pending=null;
    if(a.status==='draw')a.status='active';
    const name=currentOpponent(a),idx=charIndex(name);if(!name||idx<0)return false;
    if(replay||Number(a.processedToken)===Number(a.matchToken))a.matchToken=(Number(a.matchToken)||0)+1;
    a.processedToken=0;a.lastOpponent=name;write(store);
    try{window.AIShogiIOS.select(idx)}catch(e){console.error('tournament select failed',e);return false}
    const p=document.getElementById('tournament21540Panel');if(p)p.classList.remove('on');
    const status=document.getElementById('status');if(status)status.textContent=cup.name+' '+ROUNDS[a.round]+'：'+name+' と対局します。';
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
    recordPlayerResult(a,cup,kind);
    if(kind==='win'){
      if(a.round>=ROUNDS.length-1){
        a.bracket.rounds[4][0]=PLAYER;a.status='champion';a.finishedAt=now();a.pending=null;
        store.trophies=store.trophies||{};store.trophies[cup.id]=(Number(store.trophies[cup.id])||0)+1;
      }else{
        const nextSlot=Math.floor(a.playerSlot/2);
        a.bracket.rounds[a.round+1][nextSlot]=PLAYER;
        a.round++;a.playerSlot=nextSlot;a.pending='next';a.status='active';
        simulateKnownMatches(a.bracket,cup);a.lastOpponent=currentOpponent(a);
      }
    }else if(kind==='loss'){
      if(a.round<ROUNDS.length){
        const nextSlot=Math.floor(a.playerSlot/2);
        a.bracket.rounds[a.round+1][nextSlot]=opponent;
        simulateKnownMatches(a.bracket,cup);
      }
      a.status='lost';a.finishedAt=now();a.pending=null;
    }else{
      a.status='draw';a.pending=null;
    }
    write(store);render();
    const panel=document.getElementById('tournament21540Panel');if(panel)panel.classList.add('on');
  }

  function installResultObserver(){
    const rb=document.getElementById('resultBanner');if(!rb||rb.dataset.tourObserve21540)return;
    rb.dataset.tourObserve21540='1';
    const check=()=>{
      if(!rb.classList.contains('on'))return;
      if(rb.classList.contains('result-win'))handleResult('win');
      else if(rb.classList.contains('result-loss'))handleResult('loss');
      else if(rb.classList.contains('result-draw'))handleResult('draw');
    };
    new MutationObserver(check).observe(rb,{attributes:true,childList:true,characterData:true,subtree:true});
    setTimeout(check,0);
  }

  function hydrateFromRestoredStorage(){
    const store=read(),a=store.active;if(!a)return render();
    const cup=cupById(a.cupId);if(!cup||!a.bracket?.rounds?.[0]||a.bracket.rounds[0].length!==16){store.active=null;write(store);return render()}
    simulateKnownMatches(a.bracket,cup);write(store);render();
  }

  let boots=0;const timer=setInterval(()=>{ensureUI();installResultObserver();render();if(window.AIShogiIOS&&++boots>10)clearInterval(timer)},180);
  window.addEventListener('ai-shogi-local-save',()=>setTimeout(hydrateFromRestoredStorage,0));
  window.addEventListener('ai-shogi-profile-stats',()=>setTimeout(render,0));

  window.AI_SHOGI_TOURNAMENT={
    version:'21540b',cups:()=>CUPS.map(c=>({...c})),recommended:()=>({...recommendedCup()}),state:()=>JSON.parse(JSON.stringify(read())),start:startCup,next:startCurrentMatch,exit:exitCup,render,
    audit:()=>{const s=read(),r=Number(currentStats().rating)||1500,rec=recommendedCup(r),a=s.active,cup=cupById(a?.cupId);return{ok:!!window.AIShogiIOS,cups:CUPS.length,rating:r,recommended:rec.id,format:'16-player',bracketSize:16,rounds:4,active:a?JSON.parse(JSON.stringify(a)):null,currentOpponent:a?currentOpponent(a):null,finalBossSeeded:!!(a&&cup&&a.bracket?.rounds?.[3]?.includes(cup.boss)),trophies:{...(s.trophies||{})},charactersReady:CUPS.every(validCup),button:!!document.getElementById('tournament21540Btn'),panel:!!document.getElementById('tournament21540Panel'),bracketUI:!!document.querySelector('.tourBracket')}}
  };
})();
