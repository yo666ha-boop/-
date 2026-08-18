const { chromium, webkit, devices } = require('playwright');

const PIYO_URL='https://www.studiok-i.net/ps/';
const LOCAL_URL='http://127.0.0.1:8000/shogi-v21528/';
const MAX_PLIES=180;

function initialState(){
  const b=Array(81).fill(null),back=['L','N','S','G','K','G','S','N','L'];
  for(let x=0;x<9;x++){b[x]={k:back[x],o:-1};b[72+x]={k:back[8-x],o:1};b[18+x]={k:'P',o:-1};b[54+x]={k:'P',o:1}}
  b[10]={k:'R',o:-1};b[16]={k:'B',o:-1};b[64]={k:'B',o:1};b[70]={k:'R',o:1};
  return{b,h:{1:{},'-1':{}},t:1,log:[],last:null};
}
const baseKind=k=>String(k||'').replace(/^\+/, '');
function applyMove(s,m,label='match'){
  const n={b:s.b.map(p=>p?{...p}:null),h:{1:{...(s.h?.[1]||{})},'-1':{...(s.h?.[-1]||{})}},t:s.t,log:[...(s.log||[])],last:m?{...m}:null};
  if(m.drop){
    const have=n.h[s.t][m.drop]||0;if(have<1)throw new Error('illegal drop '+m.drop+' '+JSON.stringify(m));
    n.h[s.t][m.drop]=have-1;n.b[m.to]={k:m.drop,o:s.t};
  }else{
    const p=n.b[m.f];if(!p||p.o!==s.t)throw new Error('source mismatch turn='+s.t+' '+JSON.stringify(m));
    const cap=n.b[m.to];if(cap&&cap.o===s.t)throw new Error('own capture '+JSON.stringify(m));
    n.b[m.f]=null;if(cap){const k=baseKind(cap.k);n.h[s.t][k]=(n.h[s.t][k]||0)+1}
    let k=p.k;if(m.prom&&!String(k).startsWith('+'))k='+'+k;n.b[m.to]={k,o:p.o};
  }
  n.t=-s.t;n.log.push(label);return n;
}
function idxFromFileRank(file,rank){return (rank-1)*9+(9-file)}
function usiSqToIdx(s){const file=Number(s[0]),rank=s.charCodeAt(1)-96;return idxFromFileRank(file,rank)}
function tokenToMove(tok){
  tok=String(tok||'').trim();
  if(/^[PLNSGBR]\*[1-9][a-i]$/.test(tok))return{drop:tok[0],to:usiSqToIdx(tok.slice(2)),prom:false};
  const m=/^([1-9][a-i])([1-9][a-i])(\+)?$/.exec(tok);if(!m)throw new Error('bad USI '+tok);
  return{f:usiSqToIdx(m[1]),to:usiSqToIdx(m[2]),prom:!!m[3],drop:null};
}
const FW='０１２３４５６７８９';
function asciiDigits(s){return String(s).replace(/[０-９]/g,ch=>String(FW.indexOf(ch)))}
const rankKanji={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
const pieceMap={'歩':'P','香':'L','桂':'N','銀':'S','金':'G','角':'B','飛':'R','玉':'K','王':'K','と':'+P','成香':'+L','成桂':'+N','成銀':'+S','馬':'+B','龍':'+R','竜':'+R'};
function parsePiyoKifu(text,lastTo){
  const raw=String(text||'').trim(),a=asciiDigits(raw);
  if(/投了|中断|反則|詰み|切れ負け/.test(a))return{special:a};
  let to=lastTo;
  if(!/同/.test(a)){
    const d=/[▲△☗☖]?\s*([1-9])([一二三四五六七八九])/.exec(a);
    if(!d)throw new Error('cannot parse destination: '+raw);
    to=idxFromFileRank(Number(d[1]),rankKanji[d[2]]);
  }
  if(!Number.isInteger(to))throw new Error('missing 同 destination: '+raw);
  const src=/\(([1-9])([1-9])\)/.exec(a);
  const isDrop=/打/.test(a)||/\(00\)/.test(a);
  let piece='';
  for(const name of ['成香','成桂','成銀','歩','香','桂','銀','金','角','飛','玉','王','と','馬','龍','竜'])if(a.includes(name)){piece=pieceMap[name];break}
  if(isDrop){
    const drop=String(piece||'').replace(/^\+/,'');if(!/^[PLNSGBR]$/.test(drop))throw new Error('cannot parse drop piece: '+raw);
    return{move:{drop,to,prom:false},to,raw};
  }
  if(!src)throw new Error('cannot parse source: '+raw);
  const f=idxFromFileRank(Number(src[1]),Number(src[2]));
  const prom=/(?:歩|香|桂|銀|角|飛)成\s*\(/.test(a)&&!/不成/.test(a);
  return{move:{f,to,prom,drop:null},to,raw,piece};
}

async function prepareFuture(page){
  await page.goto(LOCAL_URL+'?vspiyo='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2500);
  if(!(await page.evaluate(()=>crossOriginIsolated)))await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.AI_SHOGI_YANEURAOU_FUTURE,{timeout:60000});
  const init=await page.evaluate(async()=>{const e=window.AI_SHOGI_YANEURAOU_FUTURE;await e.init();return{coi:crossOriginIsolated,tune:e.strengthTune,budget:e.budget?e.budget({log:[]}):null,status:e.status()}});
  if(!init.coi)throw new Error('Future crossOriginIsolated=false');
  console.log('FUTURE_READY',JSON.stringify(init));
}
async function futureBest(page,state){
  return await page.evaluate(async s=>{
    const e=window.AI_SHOGI_YANEURAOU_FUTURE,r=await e.bestMove(s);
    const sq=i=>String(9-(i%9))+String.fromCharCode(97+Math.floor(i/9));
    const tok=m=>!m?'':m.drop?m.drop+'*'+sq(m.to):sq(m.f)+sq(m.to)+(m.prom?'+':'');
    return{token:tok(r?.move),resign:!!r?.resign,declareWin:!!r?.declareWin,info:r?.info||{}};
  },state);
}

async function startPiyoLv40(page){
  await page.goto(PIYO_URL,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(4500);
  await page.getByRole('button',{name:'新規対局'}).first().click();await page.waitForTimeout(500);
  await page.locator('#dialogGameGameTypeSente0').check();
  await page.locator('#dialogGameGameTypeGote1').check();
  await page.locator('#selectLevelGote').selectOption({index:39});
  await page.locator('#selectTeai').selectOption({label:'平手'});
  await page.locator('#chkFurigoma').uncheck().catch(()=>{});
  await page.locator('#chkRandomBook').uncheck().catch(()=>{});
  await page.locator('#chkRatingTarget').uncheck().catch(()=>{});
  await page.locator('#btnDialogGameStart').click();await page.waitForTimeout(1000);
  const body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
  if(!/後手:Lv40 ピヨ帝\(R2610\)/.test(body))throw new Error('Piyo Lv40 did not start');
  console.log('PIYO_READY Lv40 ピヨ帝 R2610 七段 / 未来みつき先手 / 平手');
}
async function getGeometry(page){
  return await page.evaluate(()=>{
    const board=document.querySelector('#board');if(!board)throw new Error('board missing');const br=board.getBoundingClientRect();
    const pawns=[...document.querySelectorAll('img#U_FU.board_koma')].map(e=>e.getBoundingClientRect()).filter(r=>r.top>=br.top&&r.bottom<=br.bottom).sort((a,b)=>a.left-b.left);
    const backs=[...document.querySelectorAll('img#U_KY.board_koma,img#U_KE.board_koma,img#U_GI.board_koma,img#U_KI.board_koma,img#U_GK.board_koma')].map(e=>e.getBoundingClientRect()).filter(r=>r.top>=br.top&&r.bottom<=br.bottom);
    if(pawns.length<9||!backs.length)throw new Error('initial geometry pieces missing '+pawns.length+'/'+backs.length);
    const xs=pawns.slice(0,9).map(r=>r.left+r.width/2);const yg=pawns[0].top+pawns[0].height/2;const yi=Math.max(...backs.map(r=>r.top+r.height/2));const ystep=(yi-yg)/2;
    return{board:{x:br.x,y:br.y,w:br.width,h:br.height,bottom:br.bottom},xs,yg,ystep};
  });
}
function squarePoint(g,index){const file=9-(index%9),rank=Math.floor(index/9)+1;return{x:g.xs[9-file],y:g.yg+(rank-7)*g.ystep}}
const idByPiece={P:'FU',L:'KY',N:'KE',S:'GI',G:'KI',B:'KA',R:'HI'};
async function clickMoveOnPiyo(page,g,m,side='sente'){
  if(m.drop){
    const id=(side==='sente'?'U_':'D_')+idByPiece[m.drop];
    const hand=await page.locator('img#'+id+'.board_koma').evaluateAll((els,arg)=>els.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}}).filter(r=>arg==='sente'?r.y>document.querySelector('#board').getBoundingClientRect().bottom:r.y+r.h<document.querySelector('#board').getBoundingClientRect().top),side);
    if(!hand.length)throw new Error('hand piece not found '+id);
    await page.mouse.click(hand[0].cx,hand[0].cy);
  }else{
    const p=squarePoint(g,m.f);await page.mouse.click(p.x,p.y);
  }
  await page.waitForTimeout(80);const q=squarePoint(g,m.to);await page.mouse.click(q.x,q.y);await page.waitForTimeout(180);
  const yes=page.getByText('成る',{exact:true}),no=page.getByText('成らない',{exact:true});
  if(m.prom){if(await yes.count()&&await yes.first().isVisible())await yes.first().click();}
  else if(await no.count()&&await no.first().isVisible())await no.first().click();
}
async function kifuOptions(page){return await page.locator('#select_kifu option').allTextContents()}
async function detectResult(page){
  const opts=await kifuOptions(page),last=opts[opts.length-1]||'',body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
  if(/△.*投了|後手.*投了/.test(last+' '+body))return{done:true,result:'future_win',reason:'Piyo resigned',last};
  if(/▲.*投了|先手.*投了/.test(last+' '+body))return{done:true,result:'future_loss',reason:'Future resigned',last};
  if(/先手.*勝ち|先手の勝ち/.test(body))return{done:true,result:'future_win',reason:'Piyo result UI',last};
  if(/後手.*勝ち|後手の勝ち/.test(body))return{done:true,result:'future_loss',reason:'Piyo result UI',last};
  return{done:false,last};
}

(async()=>{
  const futureBrowser=await webkit.launch({headless:true});const futureContext=await futureBrowser.newContext({...devices['iPhone 13']});const futurePage=await futureContext.newPage();
  const piyoBrowser=await chromium.launch({headless:true});const piyoPage=await piyoBrowser.newPage({viewport:{width:1280,height:1000}});
  try{
    await prepareFuture(futurePage);await startPiyoLv40(piyoPage);const geom=await getGeometry(piyoPage);console.log('PIYO_GEOMETRY',JSON.stringify(geom));
    let state=initialState(),lastTo=null,ply=0,result={done:false,result:'incomplete',reason:'ply cap'},record=[];
    while(ply<MAX_PLIES&&!result.done){
      if(state.t!==1)throw new Error('expected Future turn at ply '+ply+' t='+state.t);
      const fr=await futureBest(futurePage,state);
      if(fr.resign){await piyoPage.locator('#btnResign').click();result={done:true,result:'future_loss',reason:'Future engine resign'};break}
      if(fr.declareWin){result={done:true,result:'future_win',reason:'Future engine declareWin'};break}
      if(!fr.token)throw new Error('Future no move at ply '+ply);
      const fm=tokenToMove(fr.token),before=(await kifuOptions(piyoPage)).length;
      await clickMoveOnPiyo(piyoPage,geom,fm,'sente');
      await piyoPage.waitForFunction(n=>document.querySelectorAll('#select_kifu option').length>=n,before+1,{timeout:10000});
      state=applyMove(state,fm,'未来みつき');lastTo=fm.to;ply++;record.push({ply,side:'future',usi:fr.token,depth:fr.info?.depth||0,nodes:fr.info?.nodes||0,ms:fr.info?.ms||0});
      console.log('MOVE',ply,'未来みつき',fr.token,'depth='+String(fr.info?.depth||0),'nodes='+String(fr.info?.nodes||0));
      result=await detectResult(piyoPage);if(result.done)break;
      try{await piyoPage.waitForFunction(n=>document.querySelectorAll('#select_kifu option').length>=n,before+2,{timeout:60000})}catch(e){result=await detectResult(piyoPage);if(result.done)break;throw new Error('Piyo reply timeout after '+fr.token+' opts='+(await kifuOptions(piyoPage)).join(' | '))}
      const opts=await kifuOptions(piyoPage),ptxt=opts[opts.length-1];
      const parsed=parsePiyoKifu(ptxt,lastTo);
      if(parsed.special){result=await detectResult(piyoPage);if(!result.done)result={done:true,result:'future_win',reason:'Piyo special '+parsed.special};break}
      state=applyMove(state,parsed.move,'ピヨ帝');lastTo=parsed.to;ply++;record.push({ply,side:'piyo',kifu:ptxt});console.log('MOVE',ply,'ピヨ帝',ptxt);
      result=await detectResult(piyoPage);
    }
    const tail=(await kifuOptions(piyoPage)).slice(-12);
    const summary={result:result.result,reason:result.reason,plies:ply,futureTune:await futurePage.evaluate(()=>window.AI_SHOGI_YANEURAOU_FUTURE.strengthTune),futureBudget:await futurePage.evaluate(()=>window.AI_SHOGI_YANEURAOU_FUTURE.budget({log:[]})),opponent:'Lv40 ピヨ帝 R2610 七段',futureSide:'先手',tail,record};
    console.log('VS_PIYO_LV40_RESULT',JSON.stringify(summary));
    if(summary.result==='incomplete')throw new Error('match incomplete at '+ply+' plies');
  } finally {await futureBrowser.close();await piyoBrowser.close();}
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
