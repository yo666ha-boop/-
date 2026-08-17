/* AI将棋先生 v2.15.28 - 26人目「未来からやってきたみつき」Worker安定版 */
(function installFutureMitsuki21528(){
  const VERSION='2.15.28';
  const FUTURE_INDEX=25;
  const FUTURE_NAME='未来からやってきたみつき';
  const FUTURE_RATING=3400;
  const SIDE_BASE=new URL('../shogi-side-test/',location.href).href;
  const WORKER_URL=SIDE_BASE+'future-yaneura-worker21528.js?v=21528w2';

  window.AI_SHOGI_FUNCTIONAL_AUDIT21520=window.AI_SHOGI_FUNCTIONAL_AUDIT21520||{future:true,version:VERSION};

  const FUTURE_DIALOGUE={
    start:['未来から来たよ。ここでは本気で指すね。','この盤面、未来では何度も見てきたよ。','準備できた？　未来の一手を見せるね。','今のみつきより、ずっと先まで読むよ。'],
    normal:['その先まで読んでるよ。','まだ分岐はたくさん残ってる。','未来は一つじゃない。いちばん強い道を選ぶね。','ここから先は読みの勝負だね。','その一手の続き、もう見えてるよ。'],
    winning:['この流れは未来でも変わらないよ。','少しずつ逃げ道を消していくね。','優勢でも最後まで正確に読むよ。','ここからは未来の寄せを見せるね。'],
    losing:['この未来はまだ確定してないよ。','逆転する線を全部探すね。','不利でも読みを止めないよ。','未来を書き換える手はまだある。'],
    critical:['ここは時間を使うね。未来が分かれてる。','一手だけ、いちばん強い道を探す。','ここから先は深く読むよ。','まだ詰みとは決まってない。全部確認するね。'],
    think:['やねうら王で未来を読んでるよ。','少し待ってね。ずっと先まで見てる。','候補手を全部比べてるところ。','未来の分岐を計算中。'],
    win:['未来どおりだったね。でもいい勝負だったよ。','最後まで読ませてくれてありがとう。','また未来を変えにきてね。','次はもっと難しい未来になるかも。'],
    loss:['この未来は読めなかった。すごいね。','未来を変えたね。次はもっと深く読むよ。','負けた未来も記録しておくね。','もう一度なら、違う未来を探す。'],
    undo:['未来を一手戻すんだね。','別の未来を選び直そう。','戻ったところから、もう一度全部読むね。']
  };

  C[FUTURE_INDEX]=[FUTURE_NAME,FUTURE_RATING,'7g7f'];
  CHAR_META[FUTURE_INDEX]={style:'未来型・超深読み',feature:'やねうら王 HalfKP＋水匠5 / Web Worker本格USIエンジン'};
  STYLE[FUTURE_INDEX]={...(STYLE[0]||{atk:1,def:1,pos:1,end:1}),atk:1.16,def:1.18,pos:1.20,end:1.24};
  TEMP_DIALOGUES[FUTURE_INDEX-5]=FUTURE_DIALOGUE;
  if(stats&&Array.isArray(stats.chars)){while(stats.chars.length<C.length)stats.chars.push({w:0,l:0,d:0});try{saveStats()}catch(e){}}

  const futureImage=()=>window.FUTURE_MITSUKI_IMAGE21520||'';
  async function ensureFutureImage(){
    if(window.FUTURE_MITSUKI_IMAGE21520)return true;
    try{const r=await fetch(SIDE_BASE+'future-mitsuki-image21520.js?v=21528w2',{cache:'no-store'});if(!r.ok)throw new Error('future image '+r.status);(0,eval)(await r.text());return !!window.FUTURE_MITSUKI_IMAGE21520}catch(e){console.error('future image',e);return false}
  }
  function refreshFutureImages(){
    const src=futureImage();if(!src)return;
    document.querySelectorAll('[data-future-mitsuki="1"] img,#chars img[alt="'+FUTURE_NAME+'"],#oppPortrait img[alt="'+FUTURE_NAME+'"],#foppPortrait img[alt="'+FUTURE_NAME+'"]').forEach(img=>{if(img.src!==src){img.onerror=null;img.src=src}});
  }

  const rankTextBase=rankText;rankText=function(i){return i===FUTURE_INDEX?'未来・やねうら王':rankTextBase(i)};
  const portraitHTMLBase=portraitHTML;portraitHTML=function(i,c){if(i===FUTURE_INDEX)return '<img alt="'+FUTURE_NAME+'" src="'+futureImage()+'" style="box-shadow:inset 0 0 0 3px #75e7ff,0 0 18px #4fd8ff88"><span class="oppFixed" style="background:#07526a;color:#d9fbff">FUTURE・やねうら王</span>';return portraitHTMLBase(i,c)};

  function addFutureCard(){
    const box=document.getElementById('chars');if(!box||box.querySelector('[data-future-mitsuki="1"]'))return;
    const b=document.createElement('button');b.className='ch';b.dataset.futureMitsuki='1';b.style.cssText='border-color:#39caef;box-shadow:0 0 0 1px #39caef55,0 0 18px #39caef33';
    b.innerHTML='<img class="chPic" alt="'+FUTURE_NAME+'" src="'+futureImage()+'"><span class="chFixed" style="background:#07526a;color:#d9fbff">未来</span><div class="chName">'+FUTURE_NAME+'</div><div class="chRating">R'+FUTURE_RATING+'・やねうら王</div><div class="chStyle">未来型・超深読み</div><div class="futureEngineState" style="font-size:10px;color:#72dff6;margin-top:4px">ENGINE：未起動</div>';
    b.onclick=()=>{ci=FUTURE_INDEX;lastSpeech='';speechMood='start';newGame();ensureFutureImage().then(()=>{refreshFutureImages();try{renderOpponent(false)}catch(e){}})};box.appendChild(b);
  }
  addFutureCard();ensureFutureImage().then(()=>{refreshFutureImages();try{renderOpponent(false)}catch(e){}});

  function setEngineState(text,ok=false){
    document.querySelectorAll('.futureEngineState').forEach(e=>{e.textContent='ENGINE：'+text;e.style.color=ok?'#7dffb2':'#72dff6'});
    window.AI_SHOGI_YANEURAOU_FUTURE=window.AI_SHOGI_YANEURAOU_FUTURE||{};window.AI_SHOGI_YANEURAOU_FUTURE.state=text;window.AI_SHOGI_YANEURAOU_FUTURE.stage=text;
    try{if(ci===FUTURE_INDEX){const s=document.getElementById('status');if(s)s.textContent='未来みつき ENGINE：'+text}}catch(e){}
  }

  function sfenPiece(p){if(!p)return'';const k=p.k||'',prom=k[0]==='+',base=prom?k.slice(1):k;const ch=p.o===S?base:base.toLowerCase();return(prom?'+':'')+ch}
  function handSfen(s){const order=['R','B','G','S','N','L','P'];let out='';for(const side of[S,G])for(const k of order){const n=s.h?.[side]?.[k]||0;if(!n)continue;const ch=side===S?k:k.toLowerCase();out+=(n>1?String(n):'')+ch}return out||'-'}
  function toSFEN(s){const rows=[];for(let y=0;y<9;y++){let row='',empty=0;for(let x=0;x<9;x++){const p=s.b[idx(x,y)];if(!p){empty++;continue}if(empty){row+=empty;empty=0}row+=sfenPiece(p)}if(empty)row+=empty;rows.push(row)}return rows.join('/')+' '+(s.t===S?'b':'w')+' '+handSfen(s)+' '+Math.max(1,(s.log?.length||0)+1)}

  let worker=null,seq=0,pending=new Map(),engineReady=false,engineError='';
  function killWorker(reason){
    try{worker?.terminate()}catch(e){}worker=null;engineReady=false;
    for(const [id,p] of pending){clearTimeout(p.timer);p.reject(new Error(reason||'worker terminated'))}pending.clear();
  }
  function getWorker(){
    if(worker)return worker;
    if(!globalThis.crossOriginIsolated)throw new Error('crossOriginIsolated=false');
    setEngineState('⑤-0 専用Worker起動中');
    const w=new Worker(WORKER_URL);worker=w;
    w.onmessage=ev=>{
      const m=ev.data||{};
      if(m.type==='stage'){setEngineState(m.text,m.text&&m.text.startsWith('⑦'));return}
      if(m.type==='result'){
        const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);
        if(m.ok){if(m.kind==='init')engineReady=true;p.resolve(m)}else{engineError=m.error||'worker error';p.reject(new Error(engineError))}
      }
    };
    w.onerror=e=>{engineError=String(e.message||'YaneuraOu worker error');setEngineState('⑤失敗 '+engineError);killWorker(engineError)};
    return w;
  }
  function callWorker(type,data={},timeout=70000){
    const w=getWorker(),id=++seq;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);engineError=type+' timeout '+timeout+'ms';setEngineState('⑤失敗 '+engineError);try{w.terminate()}catch(e){}worker=null;engineReady=false;reject(new Error(engineError))},timeout);
      pending.set(id,{resolve,reject,timer});w.postMessage({type,id,...data});
    });
  }
  async function initFutureEngine(){if(engineReady&&worker)return true;await callWorker('init',{},75000);engineReady=true;setEngineState('⑤成功 やねうら王＋水匠5 接続済み',true);return true}
  async function futureBest(s){
    const sfen=toSFEN(s),mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent),endgame=(s.log?.length||0)>=55,ms=mobile?(endgame?7000:4500):(endgame?10000:7000);
    const r=await callWorker('bestmove',{sfen,ms},90000);engineReady=true;const tok=String(r.token||'').trim(),info=r.info||{};
    if(tok==='resign')return{resign:true,info};if(tok==='win')return{declareWin:true,info};const lm=legal(s),m=lm.find(x=>usi(x)===tok);if(!m)throw new Error('YaneuraOu illegal/unmapped bestmove '+tok+' for '+sfen);return{move:m,info};
  }

  const aiMoveBase=aiMove;
  aiMove=function(){
    if(ci!==FUTURE_INDEX)return aiMoveBase();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    thinking=true;showSpeech('think',true);setStatus(FUTURE_NAME+'がやねうら王で未来を読んでいます…');
    const startKey=posKey(st),startCi=ci,startState=clone(st),started=performance.now();
    (async()=>{
      let res=null,usedFallback=false;
      try{res=await futureBest(startState)}catch(e){usedFallback=true;engineError=String(e&&e.message||e);console.error('Future Mitsuki worker fallback',e);setEngineState('⑤失敗 → 内蔵MAXへ退避: '+engineError);killWorker(engineError);const fb=chooseAI(clone(startState),0);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵MAX fallback',error:engineError}}}
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback};
      if(res.resign){thinking=false;const delta=recordResult(1);setStatus(FUTURE_NAME+'が投了しました。あなたの勝ちです。');setResult('win','未来みつき投了・勝ち　R '+(delta>=0?'+':'')+delta);speechMood='loss';lastSpeech='';render();renderOpponent(true);refreshFutureImages();return}
      if(res.declareWin){thinking=false;const delta=recordResult(0);setStatus(FUTURE_NAME+'の入玉宣言勝ちです。');setResult('loss','未来みつき宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);refreshFutureImages();return}
      if(res.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);refreshFutureImages();if(finishIfEnded())return;
      const x=lastAIInfo||{};setStatus('あなたの手番です。'+(x.fallback?'内蔵MAX退避':'やねうら王＋水匠5')+(x.depth?' / 深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };

  const newGameBase=newGame;newGame=function(){try{worker?.postMessage({type:'newgame'})}catch(e){}const r=newGameBase();setTimeout(refreshFutureImages,0);return r};
  const undoBase=undo;undo=function(){try{worker?.postMessage({type:'stop'})}catch(e){}const r=undoBase();setTimeout(refreshFutureImages,0);return r};
  document.getElementById('newBtn').onclick=newGame;document.getElementById('undoBtn').onclick=undo;document.getElementById('fundoBtn').onclick=undo;

  window.AI_SHOGI_YANEURAOU_FUTURE={version:VERSION,index:FUTURE_INDEX,name:FUTURE_NAME,rating:FUTURE_RATING,state:'未起動',init:initFutureEngine,toSFEN,bestMove:futureBest,status:()=>({ready:engineReady,error:engineError,crossOriginIsolated:globalThis.crossOriginIsolated,worker:!!worker})};
  window.AI_SHOGI_FUTURE_AUDIT21520={version:VERSION,characters:C.length,card:!!document.querySelector('[data-future-mitsuki="1"]'),sfenOK:toSFEN(initial()).startsWith('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b -'),crossOriginIsolated:globalThis.crossOriginIsolated,workerURL:WORKER_URL};
  const badge=document.querySelector('.badge');if(badge)badge.textContent='v2.15.28 26キャラ・未来みつき Worker版';
  render();renderStats();renderOpponent(false);refreshFutureImages();
})();
