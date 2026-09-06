import { firefox } from 'playwright';
const browser=await firefox.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errs=[];page.on('pageerror',e=>errs.push(String(e?.message||e)));page.on('dialog',async d=>d.accept());
 await page.goto('http://127.0.0.1:8000/shogi-v21528/?upset='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
 await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d'&&window.AI_SHOGI_TOURNAMENT?.cups?.().length===8,{timeout:20000});
 const r=await page.evaluate(async()=>{
  const K='aiShogiTournament21540',H='aiShogiTournamentDialogue21547',t=window.AI_SHOGI_TOURNAMENT,d=window.AI_SHOGI_TOURNAMENT_DIALOGUE,delay=ms=>new Promise(x=>setTimeout(x,ms));
  if(t.state()?.active)t.exit();if(!t.start('shinji'))throw new Error('start');await delay(200);
  const cs=window.AIShogiIOS.characters(),rt=n=>Number(cs.find(c=>c.name===n)?.rating)||0,s=JSON.parse(localStorage.getItem(K)),a=s.active;let p;
  for(const [k,m] of Object.entries(a.bracket.matches||{})){if(m.status!=='running')continue;const g=Math.abs(rt(m.a)-rt(m.b));if(g<150)continue;const w=rt(m.a)<rt(m.b)?m.a:m.b,l=w===m.a?m.b:m.a;p={k,m,w,l,wr:rt(w),lr:rt(l)};break}
  if(!p)throw new Error('no pair');const m=a.bracket.matches[p.k],now=Date.now();m.status='done';m.winner=p.w;m.resolvedAt=now;a.bracket.rounds[m.round+1][m.match]=p.w;a.bracket.results[p.k]={a:m.a,b:m.b,winner:p.w,kind:'ai',resolvedAt:now};localStorage.setItem(K,JSON.stringify(s));t.render();await delay(80);d.render();await delay(80);
  const snap=()=>{const b=document.getElementById('tourDialogue21547'),i=b?.querySelector('img'),x=d.audit();let h={};try{h=JSON.parse(localStorage.getItem(H)||'{}')}catch{};return{context:x.context,lineId:b?.dataset.lineId||'',speaker:x.speaker,role:b?.dataset.role||'',status:(b?.querySelector('.tourDialogueStatus')?.textContent||'').trim(),text:(b?.querySelector('.tourDialogueBubble')?.textContent||'').trim(),src:i?.currentSrc||i?.src||'',complete:!!i?.complete,w:Number(i?.naturalWidth)||0,hist:(h.byKey?.['shinji:upset']||[]).slice()}};const one=snap();d.render();await delay(80);const two=snap(),boss=t.cups().find(c=>c.id==='shinji').boss,card=[...document.querySelectorAll('#chars .ch')].find(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim()===boss),ri=card?.querySelector('img'),expected=ri?.currentSrc||ri?.src||'';t.exit();return{p,boss,expected,one,two}
 });
 const good=x=>x.context==='upset'&&x.speaker===r.boss&&x.role==='大会主・トーナメント外'&&x.status==='大会速報・番狂わせ'&&x.text.includes(r.p.w)&&x.src===r.expected&&x.complete&&x.w>0;const f=[];if(!good(r.one)||!good(r.two))f.push('render');if(r.one.lineId===r.two.lineId)f.push('repeat');if(!r.two.hist.includes(r.one.lineId)||!r.two.hist.includes(r.two.lineId))f.push('history');if(r.p.lr-r.p.wr<150)f.push('gap');if(errs.length)f.push('errors');if(f.length)throw new Error(f.join('|')+' '+JSON.stringify(r));console.log('PASS_TOURNAMENT21552_FULLAPP_UPSET '+JSON.stringify({...r,pageErrors:errs}));
}finally{await browser.close()}
