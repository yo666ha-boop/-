/* みつき将棋 16人大会・外部確認ページ専用ブラケット補正 21543b */
(function installStandaloneBracket21543(){
  if(window.__TOURNAMENT_PREVIEW_BRACKET_21543B)return;
  window.__TOURNAMENT_PREVIEW_BRACKET_21543B=true;

  const oldRenderBracket=renderBracket;
  const oldSlotHtml=slotHtml;
  let raf=0;

  function cleanName(node){return String(node?.querySelector?.('.name')?.textContent||'').replace(/[👑🏆]/gu,'').trim()}
  function unitHash(text){let h=2166136261>>>0;for(const ch of String(text)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0}return (h%1000000)/1000000}
  function aiWinner(a,b,round,match){
    if(!a)return b;if(!b)return a;
    if(a===active.cup.boss)return a;if(b===active.cup.boss)return b;
    const ra=ratingOf(a),rb=ratingOf(b),pa=1/(1+Math.pow(10,(rb-ra)/400));
    return unitHash(active.cup.id+'|'+round+'|'+match+'|'+a+'|'+b)<pa?a:b;
  }
  function resolveRound(playerWins){
    if(!active||active.round<0||active.round>3)return false;
    const r=active.round,src=active.rounds[r],dst=active.rounds[r+1];
    dst.fill(null);
    let aiResolved=0;
    for(let m=0;m<dst.length;m++){
      const a=src[m*2],b=src[m*2+1];let winner=null;
      if(a===PLAYER||b===PLAYER){winner=playerWins?PLAYER:(a===PLAYER?b:a)}
      else{winner=aiWinner(a,b,r,m);aiResolved++}
      dst[m]=winner;
    }
    active.resolved=aiResolved;active.running=0;
    return true;
  }

  stateFor=function(col,i,name){
    if(!name)return'待機';
    if(col===4)return active?.status==='champion'&&name===active?.rounds?.[4]?.[0]?'優勝':'待機';
    const next=active?.rounds?.[col+1],winner=next?.[Math.floor(i/2)];
    if(winner)return winner===name?'勝利':'敗退';
    if(col===active?.round&&active?.status==='playing')return'対局中';
    return'待機';
  };

  slotHtml=function(name,col,i){
    if(!name)return`<div class="slot empty" data-round="${col}" data-slot="${i}"><div class="main"><span class="name">—</span><div class="meta"><span class="state">未定</span></div></div></div>`;
    const player=name===PLAYER,boss=name===active.cup.boss,state=stateFor(col,i,name),src=player?'':IMG[name];
    const stateCls=state==='対局中'?'running':state==='勝利'||state==='優勝'?'win':state==='敗退'?'loss':'';
    return`<div class="slot ${player?'player':''} ${boss?'boss':''} ${state==='敗退'?'eliminated':''} ${active.status==='champion'&&col===4&&player?'champion':''}" data-round="${col}" data-slot="${i}">${player?'':`<div class="avatar">${src?`<img src="${src}" alt="">`:''}</div>`}<div class="main"><span class="name">${player?'あなた':name}</span><div class="meta"><span>R${ratingOf(name)}</span><span class="state ${stateCls}">${state}</span></div></div></div>`;
  };

  function ensureStyle(){
    if(document.getElementById('previewBracket21543Style'))return;
    const s=document.createElement('style');s.id='previewBracket21543Style';s.textContent=`
.bracket{position:relative}.roundBody{position:relative!important}.state.loss{opacity:.58}.slot.eliminated{opacity:.58}.previewBracketLines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3}.previewBracketLines path{fill:none;stroke:#665f47;stroke-width:1;opacity:.38;vector-effect:non-scaling-stroke}.previewBracketLines path.advanced{stroke:#d7bd72;stroke-width:1.7;opacity:.9}.previewBracketLines path.playerAdvanced{stroke:#65a8ff;stroke-width:2.2;opacity:1}.round,.slot{position:relative;z-index:4}
`;
    document.head.appendChild(s);
  }

  function rounds(){return[...document.querySelectorAll('#bracket .round')].map(r=>[...r.querySelectorAll('.slot')])}
  function clearGeometry(rs){
    for(const row of rs){
      const body=row[0]?.closest('.roundBody');body?.style.removeProperty('height');body?.style.removeProperty('display');
      for(const slot of row){slot.style.removeProperty('position');slot.style.removeProperty('left');slot.style.removeProperty('right');slot.style.removeProperty('top');slot.style.removeProperty('transform');slot.style.removeProperty('width')}
    }
  }
  function alignSlots(){
    ensureStyle();const rs=rounds();if(!rs.length)return 0;clearGeometry(rs);
    const bodies=rs.map(r=>r[0]?.closest('.roundBody')).filter(Boolean);if(!bodies.length)return 0;
    let h=Math.max(...bodies.map(b=>b.getBoundingClientRect().height||0),0);
    for(const row of rs){if(!row.length)continue;const sh=Math.max(...row.map(s=>s.getBoundingClientRect().height||0),0);h=Math.max(h,sh*row.length+8)}
    h=Math.max(1,Math.ceil(h));
    for(const row of rs){const body=row[0]?.closest('.roundBody');if(!body||!row.length)continue;body.style.setProperty('height',h+'px','important');body.style.setProperty('display','block','important');body.style.setProperty('position','relative','important');const n=row.length;row.forEach((slot,i)=>{slot.style.setProperty('position','absolute','important');slot.style.setProperty('left','0','important');slot.style.setProperty('right','0','important');slot.style.setProperty('width','auto','important');slot.style.setProperty('top',(((i+.5)/n)*100).toFixed(6)+'%','important');slot.style.setProperty('transform','translateY(-50%)','important')})}
    bodies[0]?.getBoundingClientRect();return h;
  }
  function alignmentAudit(){
    const rs=rounds();let checks=0,alignmentErrors=0,maxAlignmentError=0;
    for(let r=0;r<Math.min(4,rs.length-1);r++){const src=rs[r],dst=rs[r+1];for(let i=0;i<dst.length;i++){const a=src[i*2],b=src[i*2+1],d=dst[i];if(!a||!b||!d)continue;const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dr=d.getBoundingClientRect();const expected=((ar.top+ar.bottom)/2+(br.top+br.bottom)/2)/2,actual=(dr.top+dr.bottom)/2,err=Math.abs(expected-actual);checks++;maxAlignmentError=Math.max(maxAlignmentError,err);if(err>1.25)alignmentErrors++}}
    return{alignmentChecks:checks,alignmentErrors,maxAlignmentError:Number(maxAlignmentError.toFixed(3))};
  }

  function drawLines(){
    ensureStyle();
    const root=document.getElementById('bracket');if(!root)return 0;
    root.querySelector('.previewBracketLines')?.remove();
    const box=root.getBoundingClientRect();if(!box.width||!box.height)return 0;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','previewBracketLines');svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);svg.setAttribute('preserveAspectRatio','none');
    const rs=[...root.querySelectorAll('.round')];let count=0;
    for(let r=0;r<Math.min(4,rs.length-1);r++){
      const src=[...rs[r].querySelectorAll('.slot')],dst=[...rs[r+1].querySelectorAll('.slot')];
      for(let i=0;i<src.length;i++){
        const target=dst[Math.floor(i/2)];if(!target)continue;
        const a=src[i].getBoundingClientRect(),b=target.getBoundingClientRect();
        const x1=a.right-box.left,y1=(a.top+a.bottom)/2-box.top,x2=b.left-box.left,y2=(b.top+b.bottom)/2-box.top,mid=(x1+x2)/2;
        const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`);
        const srcName=cleanName(src[i]),dstName=cleanName(target),advanced=srcName&&dstName&&srcName!=='—'&&srcName===dstName;
        if(advanced)p.classList.add('advanced');if(advanced&&srcName==='あなた')p.classList.add('playerAdvanced');
        p.dataset.fromRound=String(r);p.dataset.fromSlot=String(i);p.dataset.toSlot=String(Math.floor(i/2));svg.appendChild(p);count++;
      }
    }
    root.appendChild(svg);return count;
  }
  function refreshGeometry(){alignSlots();const connectors=drawLines();return{connectors,...alignmentAudit()}}
  function requestRefresh(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;refreshGeometry()})}

  renderBracket=function(){oldRenderBracket();requestRefresh()};

  advanceRound=function(){
    if(!active||active.status!=='won')return;
    active.round++;
    active.status='playing';
    active.running=Math.max(0,(active.rounds[active.round]?.length||0)/2-1);
    active.resolved=0;
    news.textContent=LABELS[active.round]+'が始まりました。AI戦も同じ回戦で進行中です。';
    nextBtn.hidden=true;renderBracket();
  };

  const winBtn=document.getElementById('winBtn'),lossBtn=document.getElementById('lossBtn'),resetBtn=document.getElementById('resetBtn');
  winBtn.onclick=()=>{
    if(!active||active.status!=='playing'||active.round>3)return;
    const r=active.round;resolveRound(true);
    if(r===3){active.round=4;active.status='champion';active.running=0;active.resolved=0;news.textContent='あなたが決勝に勝利し、優勝しました。';nextBtn.hidden=true;renderBracket();return}
    active.status='won';statusEl.textContent=LABELS[r]+' 勝利。各対戦の勝者だけが次の枠へ進みました。';news.textContent='あなたが勝利。AI戦も1組ずつ勝者が確定しました。';nextBtn.hidden=false;renderBracket();
  };
  nextBtn.onclick=()=>{if(active?.status==='won')advanceRound()};
  lossBtn.onclick=()=>{
    if(!active||active.status!=='playing'||active.round>3)return;
    const r=active.round;resolveRound(false);active.status='lost';active.running=0;statusEl.textContent='敗退';news.textContent=LABELS[r]+'で敗退。ほかの対戦は正しい勝者を次の枠へ反映しました。';nextBtn.hidden=true;renderBracket();
  };
  resetBtn.onclick=()=>{active=null;stage.classList.remove('on')};

  function audit(){
    const rs=[...document.querySelectorAll('#bracket .round')];let pairingErrors=0,invalidWins=0;
    for(let r=0;r<Math.min(4,rs.length-1);r++){
      const src=[...rs[r].querySelectorAll('.slot')],dst=[...rs[r+1].querySelectorAll('.slot')];
      for(let i=0;i<dst.length;i++){
        const dn=cleanName(dst[i]);if(!dn||dn==='—')continue;
        const a=src[i*2],b=src[i*2+1],an=cleanName(a),bn=cleanName(b);
        if(dn!==an&&dn!==bn)pairingErrors++;
        for(const node of [a,b]){
          if(!node)continue;const n=cleanName(node);if(!n||n==='—')continue;
          const label=String(node.querySelector('.state')?.textContent||'').trim(),expected=n===dn?'勝利':'敗退';if(label!==expected)invalidWins++;
        }
      }
    }
    const geometry=refreshGeometry();
    return{ok:true,version:'preview21543b',pairingErrors,invalidWins,...geometry};
  }

  window.AI_SHOGI_TOURNAMENT_BRACKET_UI={version:'preview21543b',audit,draw:drawLines,align:alignSlots};
  window.addEventListener('resize',requestRefresh,{passive:true});
  ensureStyle();requestRefresh();
})();