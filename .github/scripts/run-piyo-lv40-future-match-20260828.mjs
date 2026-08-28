import { chromium, webkit } from 'playwright';

const PIYO='https://www.studiok-i.net/ps/';
const AI='http://127.0.0.1:4239/shogi-v21528/index-lower8-quality.html?piyoBattle='+Date.now();
const INIT='lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL';
const R='abcdefghi';
const PROMOTED=new Set(['+P','+L','+N','+S','+B','+R']);
const PIECE_FROM_ID={FU:'P',KY:'L',KE:'N',GI:'S',KI:'G',KA:'B',HI:'R',OU:'K',GK:'K',TO:'+P',NY:'+L',NK:'+N',NG:'+S',UM:'+B',RY:'+R'};

function buildSfen(moves){
  const b=new Map(),h={b:{},w:{}};let rr=0;
  for(const row of INIT.split('/')){let f=9,pr=false;for(const c of row){if(c==='+'){pr=true;continue}if(c>='1'&&c<='9'){f-=Number(c);continue}const side=c===c.toUpperCase()?'b':'w';b.set(''+f+R[rr],{side,k:c.toUpperCase(),pr});pr=false;f--}rr++}
  let t='b';
  for(const m of moves){
    if(/^[PLNSGBR]\*/.test(m)){
      const k=m[0],d=m.slice(2);h[t][k]=(h[t][k]||0)-1;b.set(d,{side:t,k,pr:false});
    }else{
      const a=m.slice(0,2),d=m.slice(2,4),p=m.endsWith('+'),pc=b.get(a);if(!pc)throw Error('missing source '+a+' for '+m+' after '+moves.join(' '));const cap=b.get(d);if(cap)h[t][cap.k]=(h[t][cap.k]||0)+1;b.delete(a);b.set(d,{...pc,pr:pc.pr||p});
    }
    t=t==='b'?'w':'b';
  }
  const rows=[];for(let r=0;r<9;r++){let x='',e=0;for(let f=9;f;f--){const pc=b.get(''+f+R[r]);if(!pc){e++;continue}if(e){x+=e;e=0}x+=(pc.pr?'+':'')+(pc.side==='b'?pc.k:pc.k.toLowerCase())}if(e)x+=e;rows.push(x)}
  let hand='';for(const side of['b','w'])for(const k of['R','B','G','S','N','L','P']){const n=h[side][k]||0;if(n>0)hand+=(n>1?n:'')+(side==='b'?k:k.toLowerCase())}
  return rows.join('/')+' '+t+' '+(hand||'-')+' '+(moves.length+1);
}

function samePiece(a,b){return !!a&&!!b&&a.side===b.side&&a.k===b.k}
function basePiece(k){return k?.startsWith('+')?k.slice(1):k}
function deriveOpponentMove(before,after){
  const changed=[];for(let rank=0;rank<9;rank++)for(let file=9;file>=1;file--){const sq=''+file+R[rank],a=before[sq]||null,b=after[sq]||null;if(!samePiece(a,b))changed.push({sq,a,b});}
  const arrivals=changed.filter(x=>x.b?.side==='w' && x.a?.side!=='w');
  const departures=changed.filter(x=>x.a?.side==='w' && x.b?.side!=='w');
  if(arrivals.length!==1)throw Error('cannot derive Piyo arrival '+JSON.stringify(changed));
  const dest=arrivals[0];
  if(departures.length===0){const k=basePiece(dest.b.k);if(!'PLNSGBR'.includes(k))throw Error('bad Piyo drop piece '+JSON.stringify(dest));return k+'*'+dest.sq;}
  if(departures.length!==1)throw Error('cannot derive Piyo departure '+JSON.stringify(changed));
  const src=departures[0];let token=src.sq+dest.sq;
  if(!PROMOTED.has(src.a.k)&&PROMOTED.has(dest.b.k))token+='+';
  return token;
}

async function snapshotBoard(page){
  return page.evaluate(({R,PIECE_FROM_ID})=>{
    const board=document.querySelector('#board_img')?.getBoundingClientRect();if(!board)throw new Error('board missing');
    const out={};
    for(const el of document.querySelectorAll('img.board_koma')){
      const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;const cx=r.x+r.width/2,cy=r.y+r.height/2;if(cx<board.x||cx>board.right||cy<board.y||cy>board.bottom)continue;
      const col=Math.round((cx-(board.x+33.5))/55.5),row=Math.round((cy-(board.y+48.5))/58.8);if(col<0||col>8||row<0||row>8)continue;
      const sq=String(9-col)+R[row];const m=/^(U|D)_([A-Z]+)$/.exec(el.id||'');if(!m)continue;const k=PIECE_FROM_ID[m[2]];if(!k)continue;out[sq]={side:m[1]==='U'?'b':'w',k};
    }
    return out;
  },{R,PIECE_FROM_ID});
}

async function squarePoint(page,sq){
  return page.evaluate(({sq,R})=>{const b=document.querySelector('#board_img').getBoundingClientRect(),file=Number(sq[0]),rank=R.indexOf(sq[1]),col=9-file;return{x:b.x+33.5+55.5*col,y:b.y+48.5+58.8*rank};},{sq,R});
}
async function clickSquare(page,sq){const p=await squarePoint(page,sq);await page.mouse.click(p.x,p.y)}

async function clickHandPiece(page,piece){
  const code={P:'FU',L:'KY',N:'KE',S:'GI',G:'KI',B:'KA',R:'HI'}[piece];if(!code)throw Error('unsupported hand '+piece);
  const boxes=await page.locator('img.board_koma').evaluateAll((els,code)=>els.map((el,i)=>{const r=el.getBoundingClientRect();return{i,id:el.id,x:r.x,y:r.y,w:r.width,h:r.height}}).filter(x=>x.id==='U_'+code&&x.w>0&&x.h>0&&x.y>1200),code);
  if(!boxes.length)throw Error('hand piece not visible '+piece);
  const x=boxes[0];await page.mouse.click(x.x+x.w/2,x.y+x.h/2);
}

async function choosePromotionIfNeeded(page,promote){
  await page.waitForTimeout(150);
  const buttons=page.locator('button:visible,input[type=button]:visible');
  const n=await buttons.count();
  for(let i=0;i<n;i++){
    const el=buttons.nth(i),txt=((await el.innerText().catch(()=>''))||await el.getAttribute('value')||'').trim();
    if(promote && /成る|成ります|成/.test(txt) && !/不成|成ら/.test(txt)){await el.click();return true;}
    if(!promote && /不成|成らない|成らず/.test(txt)){await el.click();return true;}
  }
  return false;
}

async function playOurMove(page,usi){
  const before=await page.locator('#select_kifu option').count();
  if(usi.includes('*')){await clickHandPiece(page,usi[0]);await page.waitForTimeout(120);await clickSquare(page,usi.slice(2,4));}
  else{await clickSquare(page,usi.slice(0,2));await page.waitForTimeout(120);await clickSquare(page,usi.slice(2,4));await choosePromotionIfNeeded(page,usi.endsWith('+'));}
  await page.waitForFunction(n=>document.querySelectorAll('#select_kifu option').length>=n+1,before,{timeout:10000}).catch(()=>{});
  return before;
}

async function resultText(page){return page.evaluate(()=>{const txt=(document.body.innerText||'');const m=txt.match(/(勝ち|負け|投了|詰み|時間切れ|千日手|持将棋|対局終了)[^\n]{0,100}/g);return m?m.slice(-5):[]})}

const piyoBrowser=await chromium.launch({headless:true});
const aiBrowser=await webkit.launch({headless:true});
const piyo=await piyoBrowser.newPage({viewport:{width:1280,height:900},locale:'ja-JP'});
const ai=await aiBrowser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844}});
const moves=[];const audit=[];
try{
  await ai.goto(AI,{waitUntil:'domcontentloaded',timeout:120000});
  await ai.waitForFunction(()=>window.__L8Q&&window.AI_SHOGI_YANEURAOU_FUTURE?.bestMove,{timeout:120000});
  await piyo.goto(PIYO,{waitUntil:'domcontentloaded',timeout:120000});await piyo.waitForTimeout(4500);
  await piyo.locator('#btnNewGame').click();await piyo.waitForTimeout(500);await piyo.locator('#selectLevelGote').selectOption({label:'Lv40 ピヨ帝 (R2610 七段)'});if(await piyo.locator('#chkRatingTarget').isChecked())await piyo.locator('#chkRatingTarget').uncheck();await piyo.locator('#btnDialogGameStart').click();await piyo.waitForTimeout(700);
  let board=await snapshotBoard(piyo);
  for(let ply=1;ply<=160;){
    const sfen=buildSfen(moves);
    const t=Date.now();
    const res=await ai.evaluate(async s=>window.AI_SHOGI_YANEURAOU_FUTURE.bestMove(window.__L8Q.parse(s),{ms:8000,multiPV:1,adaptive:false}),sfen);
    const usi=res?.move?await ai.evaluate(m=>window.__L8Q.usi(m),res.move):String(res?.info?.bestmove||'');
    if(!usi||usi==='resign'||usi==='win')throw Error('Future returned '+usi+' '+JSON.stringify(res?.info||{}));
    const think=Date.now()-t,beforeLen=await piyo.locator('#select_kifu option').count();
    await playOurMove(piyo,usi);moves.push(usi);audit.push({ply,side:'future',usi,think,depth:res?.info?.depth||0,nodes:res?.info?.nodes||0,cp:res?.info?.cp??null,mate:res?.info?.mate??null});console.log('PIYO_MATCH_MOVE '+JSON.stringify(audit.at(-1)));ply++;
    const terminalNow=await resultText(piyo);if(terminalNow.length&&await piyo.locator('#select_kifu option').count()<beforeLen+2){console.log('PIYO_MATCH_RESULT_AFTER_FUTURE '+JSON.stringify(terminalNow));break;}
    await piyo.waitForFunction(n=>document.querySelectorAll('#select_kifu option').length>=n+2,beforeLen,{timeout:90000}).catch(()=>{});
    const after=await snapshotBoard(piyo);let opp='';
    try{opp=deriveOpponentMove(board,after)}catch(e){const terminal=await resultText(piyo);if(terminal.length){console.log('PIYO_MATCH_TERMINAL '+JSON.stringify(terminal));break}throw e}
    moves.push(opp);audit.push({ply,side:'piyo40',usi:opp});console.log('PIYO_MATCH_MOVE '+JSON.stringify(audit.at(-1)));ply++;board=after;
    const terminal=await resultText(piyo);if(terminal.length){console.log('PIYO_MATCH_RESULT '+JSON.stringify(terminal));break;}
  }
  const kifu=await piyo.locator('#select_kifu option').allTextContents();const result=await resultText(piyo);
  console.log('PIYO_LV40_MATCH_SUMMARY '+JSON.stringify({opponent:'Lv40 ピヨ帝 (R2610 七段)',future:'未来からやってきたみつき R3400 proxy 8000ms full-search',plies:moves.length,moves,result,kifu,audit}));
  await piyo.screenshot({path:'/tmp/piyo-lv40-future-match.png',fullPage:true});
  if(moves.length<10)throw Error('match too short without trustworthy completion: '+moves.length+' '+JSON.stringify(result));
}finally{await piyoBrowser.close();await aiBrowser.close()}
