import { chromium } from 'playwright';

const MAX=50;
const R='abcdefghi';
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';

function sfen(ms){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){
    let f=9,pr=false;
    for(const c of row){
      if(c==='+'){pr=true;continue}
      if(/\d/.test(c)){f-=+c;continue}
      const side=c===c.toUpperCase()?'b':'w';
      b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--;
    }
    rr++;
  }
  let t='b';
  for(const m of ms){
    if(/^[PLNSGBR]\*/.test(m)){
      const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false});
    }else{
      const a=m.slice(0,2),d=m.slice(2,4),pc=b.get(a);
      if(!pc)throw Error('apply '+m+' missing '+a);
      const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;
      b.delete(a);b.set(d,{...pc,pr:pc.pr||m.endsWith('+')});
    }
    t=t==='b'?'w':'b';
  }
  const rows=[];
  for(let r=0;r<9;r++){
    let x='',e=0;
    for(let f=9;f;f--){
      const pc=b.get(''+f+R[r]);
      if(!pc){e++;continue}
      if(e){x+=e;e=0}
      x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase());
    }
    if(e)x+=e;rows.push(x);
  }
  let hand='';
  for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){
    const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase());
  }
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(ms.length+1);
}

const piyoBrowser=await chromium.launch({headless:true,channel:'chrome'});
const p=await piyoBrowser.newPage({viewport:{width:1280,height:1000}});
await p.goto('https://www.studiok-i.net/ps/',{waitUntil:'domcontentloaded',timeout:120000});
await p.waitForSelector('#btnNewGame',{timeout:120000});
await p.waitForTimeout(1500);
await p.click('#btnNewGame');
await p.waitForFunction(()=>document.querySelector('#selectLevelGote')?.options.length>0,{timeout:30000});
await p.check('#dialogGameGameTypeSente0');
await p.check('#dialogGameGameTypeGote1');
const lv=await p.evaluate(()=>{
  const s=document.querySelector('#selectLevelGote');
  const o=[...s.options].find(o=>/^\s*Lv40\b/.test(o.textContent));
  if(!o)return null;
  s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));
  return o.textContent.trim();
});
if(!lv||!lv.includes('R2610'))throw Error('not Lv40 '+lv);
console.log('PBOOK_PIYO '+lv);
await p.uncheck('#chkFurigoma').catch(()=>{});
await p.uncheck('#chkRandomBook').catch(()=>{});
await p.uncheck('#chkRatingTarget').catch(()=>{});
await p.click('#btnDialogGameStart');
await p.waitForTimeout(700);

async function optionCount(){return p.locator('#select_kifu option').count()}
async function lastKifuText(){const a=await p.locator('#select_kifu option').allTextContents();return(a.at(-1)||'').trim()}
async function boardSquare(s){
  const br=await p.locator('#board_img').boundingBox();
  if(!br)throw Error('board missing');
  return{x:br.x+((9-+s[0])+.5)*br.width/9,y:br.y+(s.charCodeAt(1)-97+.5)*br.height/9};
}
async function exportMoves(){
  await p.locator('img[alt="メニュー"]').first().click();
  await p.waitForTimeout(100);
  await p.click('#menuKifu');
  await p.waitForTimeout(100);
  await p.check('#dialogKifType2');
  await p.waitForTimeout(70);
  const txt=(await p.locator('#dialogKifBox').textContent()||'').trim();
  await p.click('#btnDialogKifClose');
  const m=/^position startpos(?: moves\s+(.+))?$/s.exec(txt);
  if(!m)throw Error('export '+txt);
  return m[1]?m[1].trim().split(/\s+/):[];
}
async function clickMove(u){
  if(/^[PLNSGBR]\*/.test(u)){
    const jp={P:'歩',L:'香',N:'桂',S:'銀',G:'金',B:'角',R:'飛'}[u[0]];
    const pt=await p.evaluate(jp=>{
      const a=[...document.querySelectorAll('#komadai_u img')].map(i=>{const r=i.getBoundingClientRect();return{alt:i.alt.trim(),x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}}).filter(x=>x.w&&x.h&&x.alt===jp);
      return a[0]||null;
    },jp);
    if(!pt)throw Error('hand '+u);
    await p.mouse.click(pt.x,pt.y);
    const d=await boardSquare(u.slice(2));
    await p.mouse.click(d.x,d.y);
    return;
  }
  const a=await boardSquare(u.slice(0,2)),d=await boardSquare(u.slice(2,4));
  await p.mouse.click(a.x,a.y);
  await p.waitForTimeout(80);
  await p.mouse.click(d.x,d.y);
  await p.waitForTimeout(120);
  if(u.endsWith('+')){
    await p.locator('#btnDialogNari1').click({force:true,timeout:1200}).catch(()=>{});
  }else if(await p.locator('#dialogNari').isVisible().catch(()=>false)){
    await p.click('#btnDialogNari2');
  }
}
async function playAndConfirm(u,beforeCount){
  for(let attempt=1;attempt<=2;attempt++){
    await clickMove(u);
    try{
      await p.waitForFunction(c=>document.querySelector('#select_kifu')?.options.length>c,beforeCount,{timeout:4000});
      console.log('PBOOK_INPUT '+JSON.stringify({u,attempt,ok:true,count:await optionCount()}));
      return true;
    }catch(e){
      console.log('PBOOK_INPUT '+JSON.stringify({u,attempt,ok:false,count:await optionCount(),last:await lastKifuText()}));
      if(attempt===1)await p.waitForTimeout(500);
    }
  }
  return false;
}
async function waitPiyoReply(afterOwnCount){
  const ended=/投了|詰み|反則|千日手|持将棋|中断/;
  try{
    await p.waitForFunction(({c})=>{
      const s=document.querySelector('#select_kifu');if(!s)return false;
      const last=(s.options[s.options.length-1]?.textContent||'').trim();
      return s.options.length>c||/投了|詰み|反則|千日手|持将棋|中断/.test(last);
    },{c:afterOwnCount},{timeout:120000,polling:250});
    return{ok:true,last:await lastKifuText(),count:await optionCount()};
  }catch(e){
    const last=await lastKifuText();
    return{ok:ended.test(last),last,count:await optionCount()};
  }
}

const futureBrowser=await chromium.launch({headless:true,channel:'chrome'});
const f=await futureBrowser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'});
await f.goto('http://127.0.0.1:4183/shogi-v21528/index.html',{waitUntil:'domcontentloaded',timeout:120000});
if(!await f.evaluate(()=>crossOriginIsolated))throw Error('COI');
const prof=await f.evaluate(async()=>{
  const w=new Worker('./bookpractical/future-worker.js?v='+Date.now());let n=0,P=new Map();
  w.onmessage=e=>{const m=e.data||{},q=P.get(m.id);if(!q||m.type!=='result')return;P.delete(m.id);clearTimeout(q.t);m.ok?q.r(m):q.j(Error(m.error||'worker'))};
  const call=(type,x={})=>new Promise((r,j)=>{const id=++n,t=setTimeout(()=>j(Error(type+' timeout')),180000);P.set(id,{r,j,t});w.postMessage({type,id,...x})});
  window.__w=w;window.__call=call;return call('init');
});
if(prof.threads!==1||prof.hashMB!==32||!prof.mobileWebKit)throw Error('profile '+JSON.stringify(prof));
console.log('PBOOK_PROFILE '+JSON.stringify(prof));
const search=(pos,ms=4500,pv=1)=>f.evaluate(({pos,ms,pv})=>window.__call('bestmove',{sfen:pos,ms,multiPV:pv}),{pos,ms,pv});

let ms=[],result=MAX+'-ply reached',bookMoves=0,validated=0;
try{
  while(ms.length<MAX){
    if(ms.length%2)throw Error('turn '+ms.length);
    const ply=ms.length+1,pos=sfen(ms),t=Date.now(),r=await search(pos),elapsed=Date.now()-t,u=String(r.token||''),bookLikely=elapsed<1000&&(r.info?.nodes||0)===0;
    if(bookLikely)bookMoves++;
    console.log('PBOOK_FUTURE '+JSON.stringify({ply,u,elapsed,bookLikely,cp:r.info?.cp,mate:r.info?.mate,depth:r.info?.depth,nodes:r.info?.nodes}));
    if(u==='resign'||u==='win'){result='Future '+u;break}

    const beforeMoves=ms.length,beforeCount=await optionCount();
    const accepted=await playAndConfirm(u,beforeCount);
    if(!accepted){result='Future input failed at ply '+ply;break}
    const ownCount=await optionCount();
    const reply=await waitPiyoReply(ownCount);
    console.log('PBOOK_WAIT '+JSON.stringify({ply,ownCount,...reply}));
    if(!reply.ok){result='Piyo reply timeout after ply '+ply;break}

    const got=await exportMoves();
    const last=reply.last;
    if(got[beforeMoves]!==u)throw Error('USI DIVERGENCE '+ply+' '+u+' '+got[beforeMoves]+' seq='+got.join(' '));
    if(got.length<beforeMoves+2&&!/投了|詰み|反則|千日手|持将棋|中断/.test(last)){
      result='Piyo reply missing after ply '+ply;break;
    }
    ms=got;validated=ms.length;
    console.log('PBOOK_REPLY '+JSON.stringify({plies:ms.length,last,tail:ms.slice(-4)}));
    if(/投了|詰み|反則|千日手|持将棋|中断/.test(last)||ms.length%2){result=last||'ended';break}
  }
}catch(e){
  result='ERROR '+String(e?.message||e);console.log('PBOOK_ERROR '+String(e?.stack||e));
}

let final=null;
if(ms.length%2===0){
  try{
    const r=await search(sfen(ms),12000,4);
    final={token:r.token,cp:r.info?.cp,mate:r.info?.mate,depth:r.info?.depth,nodes:r.info?.nodes,candidates:r.candidates?.slice(0,4).map(x=>({rank:x.rank,token:x.token,cp:x.cp,mate:x.mate}))};
  }catch(e){final={error:String(e?.message||e)}}
}
const sum={piyo:lv,plies:ms.length,validated,result,bookMoves,final,tail:ms.slice(-12)};
console.log('PBOOK_SUMMARY '+JSON.stringify(sum));
await f.evaluate(()=>window.__w?.terminate()).catch(()=>{});
await futureBrowser.close();
await piyoBrowser.close();
