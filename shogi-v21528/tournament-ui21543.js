/* みつき将棋 大会ブラケット進行補正 v2.15.43b
 * - 過去ラウンドを一律「勝利」にする表示バグを補正
 * - 進出先の実データから勝利/敗退を判定
 * - 各対戦から次ラウンド枠へのブラケット線を描画
 * - 各ラウンドの勝者枠を元の2人のちょうど中間へ固定して配置ずれを防止
 * - 独立確認ページではAI戦を実際のペア単位で勝敗決定して進行
 */
(function installTournamentBracketUI21543(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_BRACKET_UI_21543B)return;
  window.__AI_SHOGI_TOURNAMENT_BRACKET_UI_21543B=true;

  const NS='http://www.w3.org/2000/svg';
  const clean=s=>String(s||'').replace(/[👑🏆]/gu,'').trim();
  const isEmptyName=s=>!s||s==='—'||s==='?';
  let observer=null,raf=0,refreshing=false;

  function ensureStyle(){
    if(document.getElementById('tournament21543BracketStyle'))return;
    const s=document.createElement('style');
    s.id='tournament21543BracketStyle';
    s.textContent=`
.tourBracket,.bracket{position:relative!important}
.tourBracketRound,.round{position:relative;z-index:2}
.tourBracketRoundBody,.roundBody{position:relative!important}
.tourBracketLines{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;overflow:hidden}
.tourBracketLines path{fill:none;stroke:#706648;stroke-width:1.15;opacity:.38;vector-effect:non-scaling-stroke}
.tourBracketLines path.pending{stroke:#706648;opacity:.32;stroke-dasharray:2.5 2.5}
.tourBracketLines path.advanced{stroke:#d4aa3f;stroke-width:1.7;opacity:.9}
.tourBracketLines path.eliminated{stroke:#5e5b50;opacity:.19}
.tourBracketLines path.playerPath{stroke:#65a8ff;stroke-width:2;opacity:.95}
.tourBracketSlot.tourAdvanced,.slot.tourAdvanced{box-shadow:0 0 0 1px #5b9b50 inset}
.tourBracketSlot.tourEliminated,.slot.tourEliminated{opacity:.48;filter:saturate(.55)}
.tourBracketSlot.tourEliminated .tourMatchState,.slot.tourEliminated .state{border-color:#705653!important;color:#b88780!important}
`;
    document.head.appendChild(s);
  }

  function actualRounds(){return [...document.querySelectorAll('.tourBracket .tourBracketRound')].map(r=>[...r.querySelectorAll('.tourBracketSlot')])}
  function previewRounds(){return [...document.querySelectorAll('.bracket .round')].map(r=>[...r.querySelectorAll('.slot')])}
  function slotName(slot,preview=false){
    const n=slot?.querySelector(preview?'.name':'.tourSlotName');
    return clean(n?.textContent||'');
  }
  function stateNode(slot,preview=false){return slot?.querySelector(preview?'.state':'.tourMatchState')||null}
  function setState(slot,label,preview=false){
    const st=stateNode(slot,preview);if(!st)return;
    st.textContent=label;
    st.classList.remove('win','loss','wait','running');
    if(label==='勝利'||label==='優勝')st.classList.add('win');
    else if(label==='敗退')st.classList.add('loss');
    else if(label==='対局中'||label==='指し直し')st.classList.add('running');
    else st.classList.add('wait');
  }
  function markProgress(rounds,preview=false){
    let winnerStates=0,loserStates=0,invalidWins=0,pairingErrors=0;
    for(let r=0;r<Math.min(4,rounds.length-1);r++){
      const src=rounds[r],dst=rounds[r+1];
      for(let i=0;i<src.length;i++){
        const s=src[i],name=slotName(s,preview),target=dst[Math.floor(i/2)],targetName=slotName(target,preview);
        s?.classList.remove('tourAdvanced','tourEliminated');
        if(isEmptyName(name))continue;
        if(!isEmptyName(targetName)){
          const a=slotName(src[Math.floor(i/2)*2],preview),b=slotName(src[Math.floor(i/2)*2+1],preview);
          if(targetName!==a&&targetName!==b)pairingErrors++;
          if(name===targetName){setState(s,'勝利',preview);s.classList.add('tourAdvanced');winnerStates++}
          else{setState(s,'敗退',preview);s.classList.add('tourEliminated');loserStates++}
        }else{
          const current=String(stateNode(s,preview)?.textContent||'').trim();
          if(current==='勝利'){setState(s,'待機',preview);invalidWins++}
        }
      }
    }
    return{winnerStates,loserStates,invalidWins,pairingErrors};
  }

  function bodyForRound(round,preview=false){return round?.[0]?.closest?.(preview?'.roundBody':'.tourBracketRoundBody')||null}
  function clearGeometry(rounds,preview=false){
    for(const round of rounds){
      const body=bodyForRound(round,preview);
      body?.style.removeProperty('height');body?.style.removeProperty('display');
      for(const slot of round){
        slot.style.removeProperty('position');slot.style.removeProperty('left');slot.style.removeProperty('right');slot.style.removeProperty('top');slot.style.removeProperty('transform');slot.style.removeProperty('width');
      }
    }
  }
  function alignSlots(rounds,preview=false){
    if(!rounds.length)return 0;
    clearGeometry(rounds,preview);
    const bodies=rounds.map(r=>bodyForRound(r,preview)).filter(Boolean);
    if(!bodies.length)return 0;
    let commonHeight=Math.max(...bodies.map(b=>b.getBoundingClientRect().height||0),0);
    for(const round of rounds){
      if(!round.length)continue;
      const maxSlot=Math.max(...round.map(s=>s.getBoundingClientRect().height||0),0);
      commonHeight=Math.max(commonHeight,maxSlot*round.length+8);
    }
    commonHeight=Math.max(1,Math.ceil(commonHeight));
    for(let r=0;r<rounds.length;r++){
      const round=rounds[r],body=bodyForRound(round,preview);if(!body||!round.length)continue;
      body.style.setProperty('height',commonHeight+'px','important');
      body.style.setProperty('display','block','important');
      body.style.setProperty('position','relative','important');
      const n=round.length;
      for(let i=0;i<n;i++){
        const slot=round[i];
        slot.style.setProperty('position','absolute','important');
        slot.style.setProperty('left','0','important');slot.style.setProperty('right','0','important');slot.style.setProperty('width','auto','important');
        slot.style.setProperty('top',(((i+.5)/n)*100).toFixed(6)+'%','important');
        slot.style.setProperty('transform','translateY(-50%)','important');
      }
    }
    bodies[0]?.getBoundingClientRect();
    return commonHeight;
  }
  function alignmentAudit(rounds){
    let checks=0,alignmentErrors=0,maxAlignmentError=0;
    for(let r=0;r<Math.min(4,rounds.length-1);r++){
      const src=rounds[r],dst=rounds[r+1];
      for(let i=0;i<dst.length;i++){
        const a=src[i*2],b=src[i*2+1],d=dst[i];if(!a||!b||!d)continue;
        const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dr=d.getBoundingClientRect();
        const expected=((ar.top+ar.bottom)/2+(br.top+br.bottom)/2)/2,actual=(dr.top+dr.bottom)/2,err=Math.abs(expected-actual);
        checks++;maxAlignmentError=Math.max(maxAlignmentError,err);if(err>1.25)alignmentErrors++;
      }
    }
    return{alignmentChecks:checks,alignmentErrors,maxAlignmentError:Number(maxAlignmentError.toFixed(3))};
  }

  function drawLines(root,rounds,preview=false){
    root.querySelector(':scope > .tourBracketLines')?.remove();
    if(rounds.length<2)return 0;
    const box=root.getBoundingClientRect();if(box.width<=0||box.height<=0)return 0;
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','tourBracketLines');svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);svg.setAttribute('preserveAspectRatio','none');
    let count=0;
    for(let r=0;r<Math.min(4,rounds.length-1);r++){
      const src=rounds[r],dst=rounds[r+1];
      for(let i=0;i<src.length;i++){
        const from=src[i],to=dst[Math.floor(i/2)];if(!from||!to)continue;
        const fr=from.getBoundingClientRect(),tr=to.getBoundingClientRect();
        const x1=fr.right-box.left,y1=fr.top+fr.height/2-box.top,x2=tr.left-box.left,y2=tr.top+tr.height/2-box.top;
        if(!Number.isFinite(x1+y1+x2+y2))continue;
        const mid=x1+(x2-x1)*.48,p=document.createElementNS(NS,'path');
        p.setAttribute('d',`M ${x1.toFixed(1)} ${y1.toFixed(1)} H ${mid.toFixed(1)} V ${y2.toFixed(1)} H ${x2.toFixed(1)}`);
        const fromName=slotName(from,preview),toName=slotName(to,preview);
        let cls='pending';
        if(!isEmptyName(toName))cls=fromName===toName?'advanced':'eliminated';
        if(fromName==='あなた'||toName==='あなた')cls+=' playerPath';
        p.setAttribute('class',cls);svg.appendChild(p);count++;
      }
    }
    root.prepend(svg);return count;
  }

  function genericRefresh(){
    ensureStyle();
    let rounds=actualRounds(),preview=false,root=document.querySelector('.tourBracket');
    if(!root){rounds=previewRounds();preview=true;root=document.querySelector('.bracket')}
    if(!root||rounds.length<2)return{connectors:0,winnerStates:0,loserStates:0,invalidWins:0,pairingErrors:0,alignmentChecks:0,alignmentErrors:0,maxAlignmentError:0,bodyHeight:0,preview};
    const state=markProgress(rounds,preview),bodyHeight=alignSlots(rounds,preview),alignment=alignmentAudit(rounds),connectors=drawLines(root,rounds,preview);
    return{connectors,...state,...alignment,bodyHeight,preview};
  }

  function installPreviewLogic(){
    if(typeof window.TOURNAMENT_PREVIEW_AUDIT!=='function'||window.__TOURNAMENT_PREVIEW_PAIRWISE_21543)return false;
    if(typeof start!=='function'||typeof renderBracket!=='function'||typeof stateFor!=='function')return false;
    window.__TOURNAMENT_PREVIEW_PAIRWISE_21543=true;
    const oldStart=start;
    const hash=text=>{let h=2166136261>>>0;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
    const aiWinner=(a,b,cup,r,m)=>{
      if(a===cup.boss||b===cup.boss)return cup.boss;
      const ra=ratingOf(a),rb=ratingOf(b),p=1/(1+Math.pow(10,(rb-ra)/400)),roll=(hash(`${cup.id}|${r}|${m}|${a}|${b}`)%100000)/100000;
      return roll<p?a:b;
    };
    const settle=(kind)=>{
      if(!active||active.status!=='playing'||active.round>3)return;
      const r=active.round,src=active.rounds[r],dst=active.rounds[r+1];dst.fill(null);active.results=active.results||{};
      for(let m=0;m<src.length/2;m++){
        const a=src[m*2],b=src[m*2+1];if(!a||!b)continue;
        let winner;
        if(a===PLAYER||b===PLAYER)winner=kind==='win'?PLAYER:(a===PLAYER?b:a);
        else winner=aiWinner(a,b,active.cup,r,m);
        dst[m]=winner;active.results[`${r}:${m}`]={a,b,winner};
      }
      active.running=0;active.resolved=Math.max(0,src.length/2-1);
      if(kind==='loss'){
        active.status='lost';statusEl.textContent='敗退';news.textContent='あなたは敗退。ほかの試合結果もこの回戦分だけ確定しました。';nextBtn.hidden=true;
      }else if(r===3){
        active.round=4;active.status='champion';statusEl.textContent=active.cup.name+' 優勝！';news.textContent='あなたが決勝に勝利し、優勝しました。';nextBtn.hidden=true;
      }else{
        active.status='won';statusEl.textContent=LABELS[r]+' 勝利。次の対局へ進めます。';news.textContent='あなたが勝利。同じ回戦のAI戦も結果が出ました。';nextBtn.hidden=false;
      }
      renderBracket();scheduleRefresh();
    };
    start=function(id){oldStart(id);if(active){active.results={};active.playerSlot=0}scheduleRefresh()};
    stateFor=function(col,i,name){
      if(!name)return'待機';
      if(col===4)return active?.status==='champion'?'優勝':'待機';
      const next=active?.rounds?.[col+1]?.[Math.floor(i/2)]||null;
      if(next)return next===name?'勝利':'敗退';
      if(col===active?.round&&active?.status==='playing')return'対局中';
      return'待機';
    };
    const oldSlotHtml=slotHtml;
    slotHtml=function(name,col,i){
      const html=oldSlotHtml(name,col,i);return html.replace('<div class="slot ',`<div data-round="${col}" data-slot="${i}" class="slot `);
    };
    const oldRenderBracket=renderBracket;
    renderBracket=function(){oldRenderBracket();scheduleRefresh()};
    const win=document.getElementById('winBtn'),loss=document.getElementById('lossBtn'),next=document.getElementById('nextBtn');
    if(win)win.onclick=()=>settle('win');
    if(loss)loss.onclick=()=>settle('loss');
    if(next)next.onclick=()=>{
      if(!active||active.status!=='won'||active.round>=3)return;
      active.round++;active.status='playing';active.running=Math.max(0,active.rounds[active.round].length/2-1);active.resolved=0;
      statusEl.textContent=LABELS[active.round]+' 対局中';news.textContent=LABELS[active.round]+'が始まりました。ほかのAI戦も同時進行中です。';nextBtn.hidden=true;renderBracket();
    };
    return true;
  }

  function refresh(){
    if(refreshing)return null;refreshing=true;
    try{observer?.disconnect();installPreviewLogic();return genericRefresh()}
    finally{refreshing=false;observe()}
  }
  function scheduleRefresh(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;refresh()})}
  function observe(){
    const target=document.getElementById('tournament21540Panel')||document.getElementById('stage')||document.body;if(!target)return;
    if(!observer)observer=new MutationObserver(muts=>{
      if(refreshing)return;
      if(muts.every(m=>m.target?.closest?.('.tourBracketLines')))return;
      scheduleRefresh();
    });
    observer.observe(target,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  window.addEventListener('resize',scheduleRefresh,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(scheduleRefresh,80),{passive:true});
  let tries=0;const boot=setInterval(()=>{const ok=!!(document.querySelector('.tourBracket')||document.querySelector('.bracket'));installPreviewLogic();if(ok){clearInterval(boot);refresh()}else if(++tries>120)clearInterval(boot)},100);
  observe();scheduleRefresh();

  window.AI_SHOGI_TOURNAMENT_BRACKET_UI={
    version:'21543b',refresh,
    audit:()=>{
      const x=genericRefresh();
      return{ok:true,version:'21543b',...x};
    }
  };
})();