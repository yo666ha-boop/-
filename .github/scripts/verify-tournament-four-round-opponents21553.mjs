import { firefox } from 'playwright';
const browser=await firefox.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errs=[];page.on('pageerror',e=>errs.push(String(e?.message||e)));page.on('dialog',async d=>d.accept());
 await page.goto('http://127.0.0.1:8000/shogi-v21528/?opponentRounds='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
 await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:20000});
 const rows=await page.evaluate(async()=>{
  const t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(r=>setTimeout(r,ms)),out=[];
  const result=async()=>{const b=document.getElementById('resultBanner');b.className='resultBanner';void b.offsetWidth;b.className='resultBanner on result-win';b.textContent='win';await delay(240)};
  const canon=s=>{if(!s)return'';try{const u=new URL(s,location.href);return u.origin+u.pathname}catch{return String(s).split('?')[0]}};
  const cardSrc=name=>{const c=[...document.querySelectorAll('#chars .ch')].find(x=>(x.querySelector('.chName')?.textContent||x.querySelector('img')?.alt||'').trim()===name),i=c?.querySelector('img');return canon(i?.currentSrc||i?.src||'')};
  const snap=()=>{d.render();const a=t.state()?.active,row=a?.bracket?.rounds?.[a?.round],opp=row?.[(Number(a?.playerSlot)||0)^1]||'',box=document.getElementById('tourOpponentVoice21549'),img=box?.querySelector('img'),r=box?.getBoundingClientRect?.()||{};return{round:Number(a?.round),expectedOpponent:opp,speaker:box?.dataset.speaker||'',role:box?.dataset.role||'',actual:canon(img?.currentSrc||img?.src||''),expected:cardSrc(opp),complete:!!img?.complete,w:Number(img?.naturalWidth)||0,h:Number(r.height)||0,docked:box?.classList.contains('tourRoundBattleDock21550')===true,parent:box?.parentElement?.classList?.contains('side')?'side':'other',text:(box?.querySelector('.tourDialogueBubble')?.textContent||'').trim()};};
  if(t.state()?.active)t.exit();if(!t.start('shinji'))throw new Error('start');await delay(3500);out.push(snap());
  for(let round=0;round<3;round++){await result();t.next();await delay(250);out.push(snap())}
  t.exit();return out;
 });
 const f=[];for(const x of rows){if(!x.expectedOpponent||x.speaker!==x.expectedOpponent||x.role!=='対戦相手・トーナメント参加者'||!x.actual||x.actual!==x.expected||!x.complete||x.w<1||x.h<1||!x.docked||x.parent!=='side'||!x.text)f.push(JSON.stringify(x))}
 if(rows.length!==4||new Set(rows.map(x=>x.speaker)).size!==4)f.push('round/opponent uniqueness '+JSON.stringify(rows.map(x=>x.speaker)));if(errs.length)f.push('errors '+JSON.stringify(errs));if(f.length)throw new Error(f.join('|'));
 console.log('PASS_TOURNAMENT21553_FOUR_ROUND_OPPONENT_PORTRAITS '+JSON.stringify({rows,pageErrors:errs}));
}finally{await browser.close()}
