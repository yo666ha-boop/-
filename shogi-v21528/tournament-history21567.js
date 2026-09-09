/* Tournament recent-attempt history v2.15.67
 * Display-only. Reads existing tournament history; does not mutate tournament, AI, rating, bracket, or persistence format.
 */
(function installTournamentAttemptHistory21567(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_HISTORY_21567)return;
  window.__AI_SHOGI_TOURNAMENT_HISTORY_21567=true;
  const api=()=>window.AI_SHOGI_TOURNAMENT;
  const state=()=>{try{return api()?.state?.()||null}catch(e){return null}};
  const active=()=>state()?.active||null;
  const cups=()=>{try{return api()?.cups?.()||[]}catch(e){return[]}};
  const cupName=id=>cups().find(c=>c?.id===id)?.name||String(id||'大会');
  const history=()=>{const h=state()?.history;return Array.isArray(h)?h:[]};
  const recent=()=>history().slice(0,3);
  const timeLabel=ts=>{const d=new Date(Number(ts)||0);if(!Number.isFinite(d.getTime())||d.getTime()<=0)return'';const p=n=>String(n).padStart(2,'0');return (d.getMonth()+1)+'/'+d.getDate()+' '+p(d.getHours())+':'+p(d.getMinutes())};
  const span=(className,text)=>{const el=document.createElement('span');el.className=className;el.textContent=String(text??'');return el};

  function ensureStyle(){
    if(document.getElementById('tournamentAttemptHistory21567Style'))return;
    const s=document.createElement('style');s.id='tournamentAttemptHistory21567Style';s.textContent=`
#tournament21540Panel .tourAttemptHistory21567{margin:4px 0 7px;padding:6px 7px;border:1px solid #344a42;border-radius:10px;background:linear-gradient(90deg,#081511,#0d1914);min-width:0;overflow:hidden}
#tournament21540Panel .tourAttemptHistoryHead21567{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;margin-bottom:4px;color:#d7c894;font-size:8px;font-weight:900;letter-spacing:.04em}
#tournament21540Panel .tourAttemptHistoryCount21567{color:#928a70;font-size:7px;font-weight:800;white-space:nowrap}
#tournament21540Panel .tourAttemptHistoryList21567{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;min-width:0}
#tournament21540Panel .tourAttemptHistoryItem21567{min-width:0;padding:4px 5px;border:1px solid #283b34;border-radius:7px;background:#0a1713;overflow:hidden}
#tournament21540Panel .tourAttemptHistoryItem21567.current{border-color:#a98232;background:#19180f;box-shadow:inset 0 0 0 1px rgba(225,177,62,.08)}
#tournament21540Panel .tourAttemptHistoryCup21567{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e7dfc1;font-size:8px;font-weight:900}
#tournament21540Panel .tourAttemptHistoryMeta21567{display:flex;gap:4px;align-items:center;min-width:0;margin-top:2px;color:#938b72;font-size:7px;font-weight:700;white-space:nowrap;overflow:hidden}
#tournament21540Panel .tourAttemptHistoryState21567{margin-left:auto;color:#aaa083;overflow:hidden;text-overflow:ellipsis}.tourAttemptHistoryItem21567.current .tourAttemptHistoryState21567{color:#f1ca6a}
#tournament21540Panel.tourFireFit .tourAttemptHistory21567{margin:1px 0 3px;padding:3px 4px;border-radius:7px}#tournament21540Panel.tourFireFit .tourAttemptHistoryHead21567{font-size:6px;margin-bottom:2px}#tournament21540Panel.tourFireFit .tourAttemptHistoryCount21567{font-size:5px}#tournament21540Panel.tourFireFit .tourAttemptHistoryList21567{gap:2px}#tournament21540Panel.tourFireFit .tourAttemptHistoryItem21567{padding:2px 3px;border-radius:5px}#tournament21540Panel.tourFireFit .tourAttemptHistoryCup21567{font-size:6px}#tournament21540Panel.tourFireFit .tourAttemptHistoryMeta21567{font-size:5px;gap:2px;margin-top:1px}
@media(max-width:320px){#tournament21540Panel .tourAttemptHistory21567{padding-left:4px;padding-right:4px}#tournament21540Panel .tourAttemptHistoryList21567{gap:2px}#tournament21540Panel .tourAttemptHistoryItem21567{padding-left:3px;padding-right:3px}}
`;
    document.head.appendChild(s);
  }

  function render(){
    ensureStyle();
    const a=active(),panel=document.getElementById('tournament21540Panel'),root=panel?.querySelector('.tourActive');
    panel?.querySelectorAll('.tourAttemptHistory21567').forEach(x=>x.remove());
    const rows=recent();if(!a||!root||!rows.length)return false;
    const box=document.createElement('section');box.className='tourAttemptHistory21567';box.dataset.historyUi='21567';box.setAttribute('aria-label','最近の大会挑戦');
    const head=document.createElement('div');head.className='tourAttemptHistoryHead21567';head.append(span('', '最近の挑戦'),span('tourAttemptHistoryCount21567','履歴 '+history().length+'件'));box.appendChild(head);
    const list=document.createElement('div');list.className='tourAttemptHistoryList21567';
    rows.forEach(row=>{
      const current=row?.cupId===a.cupId&&Number(row?.startedAt)>0&&Number(row.startedAt)===Number(a.startedAt),rating=Number(row?.rating),when=timeLabel(row?.startedAt);
      const item=document.createElement('div');item.className='tourAttemptHistoryItem21567'+(current?' current':'');item.dataset.cupId=String(row?.cupId||'');item.dataset.current=current?'1':'0';
      item.appendChild(span('tourAttemptHistoryCup21567',cupName(row?.cupId)));
      const meta=document.createElement('span');meta.className='tourAttemptHistoryMeta21567';meta.appendChild(span('', 'R'+(Number.isFinite(rating)?rating:'—')));if(when)meta.appendChild(span('',when));meta.appendChild(span('tourAttemptHistoryState21567',current?'進行中':'挑戦'));item.appendChild(meta);list.appendChild(item);
    });
    box.appendChild(list);
    const road=root.querySelector('.tourRoad21562'),hero=root.querySelector('.tourGameHero21559'),anchor=road||hero;if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box);return true;
  }

  function install(){
    const base=window.AI_SHOGI_TOURNAMENT_GAME_UI;if(!base||base.__history21567)return false;
    base.__history21567=true;const oldRender=base.render.bind(base),oldAudit=base.audit.bind(base);
    base.render=()=>{const out=oldRender();render();return out};
    base.audit=()=>{render();const out=oldAudit(),box=document.querySelector('#tournament21540Panel .tourAttemptHistory21567'),items=box?[...box.querySelectorAll('.tourAttemptHistoryItem21567')]:[];return{...out,history21567:!!box,historyCount21567:items.length,historySourceCount21567:history().length,historyCurrent21567:items.filter(x=>x.dataset.current==='1').length,historyItems21567:items.map(x=>x.dataset.cupId||''),historyOverflow21567:box?Math.max(0,box.scrollWidth-box.clientWidth):0}};
    render();return true;
  }
  let installed=false,tries=0;const timer=setInterval(()=>{if(!installed)installed=install();if(installed&&render())clearInterval(timer);else if(++tries>100)clearInterval(timer)},100);
  window.addEventListener('ai-shogi-local-save',render);window.addEventListener('resize',render,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(render,120),{passive:true});
})();