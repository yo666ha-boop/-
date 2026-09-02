/* みつき将棋 - キャラ杯トーナメント v2.15.40
 * 通常対局を壊さず、プレイヤーRに合う杯をおすすめする3連勝カップ戦。
 * 各杯の最終戦は杯名の看板キャラ固定。大会進行は aiShogiTournament21540 に保存する。
 */
(function installTournament21540(){
  if(window.__AI_SHOGI_TOURNAMENT_21540)return;
  window.__AI_SHOGI_TOURNAMENT_21540=true;

  const KEY='aiShogiTournament21540';
  const VERSION=1;
  const ROUNDS=['1回戦','準決勝','決勝'];
  const CUPS=[
    {id:'shinji',name:'しんじ杯',boss:'しんじ',bossRating:1550,min:0,max:1649,path:['ぺんぺん','玉ちゃん','しんじ'],label:'入門〜初級'},
    {id:'ayanami',name:'あやなみ杯',boss:'あやなみ',bossRating:1800,min:1650,max:1899,path:['バット','ユリア','あやなみ'],label:'初中級'},
    {id:'kenshiro',name:'ケンシロウ杯',boss:'ケンシロウ',bossRating:2100,min:1900,max:2149,path:['前田慶次','まり','ケンシロウ'],label:'中上級'},
    {id:'kaworu',name:'カヲル杯',boss:'カヲル',bossRating:2400,min:2150,max:2449,path:['げんどー','ラオウ','カヲル'],label:'上級'},
    {id:'akiou',name:'あき王杯',boss:'あき王',bossRating:2700,min:2450,max:2749,path:['カヲル','まま','あき王'],label:'超上級'},
    {id:'micchan',name:'みっちゃん杯',boss:'みっちゃん',bossRating:2850,min:2750,max:2899,path:['まま','おにまま','みっちゃん'],label:'最上級'},
    {id:'mitsuki',name:'みつき杯',boss:'みつき',bossRating:3000,min:2900,max:3099,path:['おにまま','あき王','みつき'],label:'最高峰'},
    {id:'future',name:'未来みつき杯',boss:'未来からやってきたみつき',bossRating:3400,min:3100,max:9999,path:['みっちゃん','みつき','未来からやってきたみつき'],label:'究極'}
  ];

  const now=()=>Date.now();
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&x.version===VERSION?x:{version:VERSION,active:null,trophies:{},history:[]}}catch(e){return{version:VERSION,active:null,trophies:{},history:[]}}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch(e){return false}};
  const chars=()=>{try{return window.AIShogiIOS?.characters?.()||[]}catch(e){return[]}};
  const currentStats=()=>{try{return window.AIShogiIOS?.stats?.()||{rating:1500,w:0,l:0,d:0}}catch(e){return{rating:1500,w:0,l:0,d:0}}};
  const currentState=()=>{try{return window.AIShogiIOS?.state?.()||null}catch(e){return null}};
  const cupById=id=>CUPS.find(c=>c.id===id)||null;
  const charIndex=name=>chars().findIndex(c=>c.name===name);
  const ratingOf=name=>chars().find(c=>c.name===name)?.rating??null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function recommendedCup(rating=currentStats().rating){
    const r=Number(rating)||1500;
    return CUPS.find(c=>r>=c.min&&r<=c.max)||CUPS.at(-1);
  }
  function validCup(c){return !!(c&&c.path.length===3&&c.path.every(n=>charIndex(n)>=0));}
  function phaseText(a){
    if(!a)return'';
    if(a.status==='champion')return'優勝！';
    if(a.status==='lost')return'敗退';
    if(a.status==='draw')return ROUNDS[a.round]+'・指し直し';
    if(a.pending==='next')return ROUNDS[Math.max(0,a.round-1)]+'突破';
    return ROUNDS[a.round]||'大会中';
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
.tourActive{border:1px solid #846526;border-radius:11px;padding:9px;margin:8px 0;background:#0e1b17}.tourActiveTitle{font-weight:900;margin-bottom:4px}.tourRoute{display:flex;gap:5px;align-items:stretch;flex-wrap:wrap;margin:7px 0}.tourStep{flex:1 1 105px;border:1px solid #554725;border-radius:9px;padding:6px 7px;background:#0a120f;font-size:11px;line-height:1.35}.tourStep b{display:block;font-size:12px;margin-bottom:2px}.tourStep.done{border-color:#9b7b2c;background:#171c10}.tourStep.current{outline:2px solid #d3a93d;outline-offset:0}.tourStep.boss b::after{content:' 👑'}
.tourActions{display:flex;gap:6px;flex-wrap:wrap}.tourActions .btn{flex:1 1 130px}
.tourGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.tourCup{border:1px solid #4c4329;border-radius:11px;padding:8px;background:#0b1512;min-width:0}.tourCup.recommended{border-color:#d3a93d;box-shadow:0 0 0 1px #d3a93d inset}.tourCup.won{background:#171a0e}.tourCupName{font-weight:900;font-size:13px;display:flex;gap:5px;align-items:center;flex-wrap:wrap}.tourCupMeta{font-size:11px;line-height:1.4;color:#bdb18c;margin:4px 0 7px}.tourCup .btn{width:100%;padding:7px 8px}.tourTag{font-size:10px;border:1px solid currentColor;border-radius:999px;padding:1px 5px}.tourTrophy{color:#ffe174}.tourResult{font-size:12px;font-weight:900;margin:6px 0}.tourSubtle{font-size:11px;color:#a99f80;line-height:1.4}
body.tournament21540Active #chars{opacity:.55}.tourBlockedHint{display:none}body.tournament21540Active .tourBlockedHint{display:block;font-size:11px;color:#d7bd72;margin-top:5px}
@media(max-width:520px){.tourGrid{grid-template-columns:1fr}.tourActions .btn{flex-basis:100%}}
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

  function opponentCard(name,round,a){
    const r=ratingOf(name),done=a&&a.round>round,current=a&&a.round===round&&['active','draw'].includes(a.status);
    return '<div class="tourStep '+(done?'done ':'')+(current?'current ':'')+(round===2?'boss':'')+'"><b>'+esc(ROUNDS[round])+'</b>'+esc(name)+(r?' R'+r:'')+'</div>';
  }

  function renderActive(store){
    const a=store.active;if(!a)return'';
    const cup=cupById(a.cupId);if(!cup)return'';
    const route=cup.path.map((n,i)=>opponentCard(n,i,a)).join('');
    let result='';
    if(a.status==='champion')result='<div class="tourResult tourTrophy">🏆 '+esc(cup.name)+' 優勝！</div>';
    else if(a.status==='lost')result='<div class="tourResult">今回は敗退。もう一度この杯に挑戦できます。</div>';
    else if(a.status==='draw')result='<div class="tourResult">引き分けのため同じ対局を指し直します。</div>';
    else if(a.pending==='next')result='<div class="tourResult">勝ち！ 次は '+esc(ROUNDS[a.round])+' です。</div>';
    else result='<div class="tourResult">'+esc(phaseText(a))+'　vs '+esc(cup.path[a.round]||cup.boss)+'</div>';
    let action='';
    if(a.status==='champion')action='<button class="btn primary" data-tour-retry="'+cup.id+'">もう一度この杯</button><button class="btn" data-tour-exit="1">大会を終える</button>';
    else if(a.status==='lost')action='<button class="btn primary" data-tour-retry="'+cup.id+'">再挑戦</button><button class="btn" data-tour-exit="1">大会を終える</button>';
    else if(a.status==='draw')action='<button class="btn primary" data-tour-replay="1">指し直す</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    else if(a.pending==='next')action='<button class="btn primary" data-tour-next="1">次の対局へ</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    else action='<button class="btn" data-tour-current="1">現在の対局を開く</button><button class="btn" data-tour-exit="1">大会をやめる</button>';
    return '<div class="tourActive"><div class="tourActiveTitle">'+esc(cup.name)+'　'+esc(cup.label)+'</div><div class="tourRoute">'+route+'</div>'+result+'<div class="tourActions">'+action+'</div><div class="tourBlockedHint">大会中は通常のキャラ選択をロックしています。</div></div>';
  }

  function render(){
    if(!ensureUI())return;
    const store=read(),body=document.getElementById('tourBody21540');if(!body)return;
    const rating=Number(currentStats().rating)||1500,rec=recommendedCup(rating);
    document.body.classList.toggle('tournament21540Active',!!store.active&&['active','draw'].includes(store.active.status));
    const btn=document.getElementById('tournament21540Btn');if(btn)btn.innerHTML='🏆 大会モード'+(store.active&&['active','draw'].includes(store.active.status)?'<span class="tourDot"></span>':'');
    const cards=CUPS.map(c=>{
      const wins=Number(store.trophies?.[c.id]||0),recommended=c.id===rec.id;
      return '<div class="tourCup '+(recommended?'recommended ':'')+(wins?'won':'')+'"><div class="tourCupName">'+esc(c.name)+(recommended?'<span class="tourTag">おすすめ</span>':'')+(wins?'<span class="tourTrophy">🏆×'+wins+'</span>':'')+'</div><div class="tourCupMeta">'+esc(c.label)+' ／ 決勝ボス '+esc(c.boss)+' R'+c.bossRating+'<br>1回戦 → 準決勝 → 決勝</div><button class="btn '+(recommended?'primary':'')+'" data-tour-start="'+c.id+'">挑戦する</button></div>';
    }).join('');
    body.innerHTML='<div class="tourLead">あなたは <b>R'+rating+'</b>。現在のおすすめは <span class="tourRecommended">'+esc(rec.name)+'</span>。杯名のキャラが決勝のてっぺんです。強い杯への先取り挑戦もできます。</div>'+renderActive(store)+'<div class="tourGrid">'+cards+'</div>';
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
    store.active={cupId:cup.id,round:0,status:'active',pending:null,matchToken:1,processedToken:0,startedAt:now(),ratingAtStart:Number(currentStats().rating)||1500,lastOpponent:cup.path[0]};
    store.history=Array.isArray(store.history)?store.history:[];store.history.unshift({cupId:cup.id,startedAt:store.active.startedAt,rating:store.active.ratingAtStart});store.history=store.history.slice(0,30);
    write(store);render();return startCurrentMatch();
  }

  function startCurrentMatch(replay=false){
    const store=read(),a=store.active,cup=cupById(a?.cupId);if(!a||!cup)return false;
    if(a.status==='champion'||a.status==='lost')return false;
    if(a.pending==='next')a.pending=null;
    if(a.status==='draw')a.status='active';
    const name=cup.path[a.round];const idx=charIndex(name);if(idx<0)return false;
    if(replay||a.lastOpponent!==name)a.matchToken=(Number(a.matchToken)||0)+1;
    else if(a.processedToken===a.matchToken)a.matchToken++;
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
    a.processedToken=Number(a.matchToken)||1;
    if(kind==='win'){
      if(a.round>=2){
        a.status='champion';a.finishedAt=now();a.pending=null;
        store.trophies=store.trophies||{};store.trophies[cup.id]=(Number(store.trophies[cup.id])||0)+1;
      }else{
        a.round++;a.pending='next';a.status='active';a.lastOpponent=cup.path[a.round];
      }
    }else if(kind==='loss'){
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
    const cup=cupById(a.cupId);if(!cup){store.active=null;write(store);return render()}
    render();
  }

  let boots=0;const timer=setInterval(()=>{ensureUI();installResultObserver();render();if(window.AIShogiIOS&&++boots>10)clearInterval(timer)},180);
  window.addEventListener('ai-shogi-local-save',()=>setTimeout(hydrateFromRestoredStorage,0));
  window.addEventListener('ai-shogi-profile-stats',()=>setTimeout(render,0));

  window.AI_SHOGI_TOURNAMENT={
    version:'21540a',cups:()=>CUPS.map(c=>({...c,path:[...c.path]})),recommended:()=>({...recommendedCup()}),state:()=>JSON.parse(JSON.stringify(read())),start:startCup,next:startCurrentMatch,exit:exitCup,render,
    audit:()=>{const s=read(),r=Number(currentStats().rating)||1500,rec=recommendedCup(r);return{ok:!!window.AIShogiIOS,cups:CUPS.length,rating:r,recommended:rec.id,active:s.active?{...s.active}:null,trophies:{...(s.trophies||{})},charactersReady:CUPS.every(validCup),button:!!document.getElementById('tournament21540Btn'),panel:!!document.getElementById('tournament21540Panel')}}
  };
})();