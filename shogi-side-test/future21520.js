/* AI将棋先生 v2.15.28 - 26人目「未来からやってきたみつき」Worker安定版 */
(function installFutureMitsuki21528(){
  const VERSION='2.15.28';
  const FUTURE_INDEX=25;
  const FUTURE_NAME='未来からやってきたみつき';
  const FUTURE_RATING=3400;
  const SIDE_BASE=new URL('../shogi-side-test/',location.href).href;
  const WORKER_URL=new URL('./future-yaneura-worker21528.js?v=21528v970d8',location.href).href;

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
  CHAR_META[FUTURE_INDEX]={style:'未来型・超深読み',feature:'やねうら王 V9.70 HalfKP＋水匠5 / Web Worker本格USIエンジン'};
  if(CHAR_META[0]){CHAR_META[0]={...CHAR_META[0],style:'現代最強万能型・終盤最強級',feature:'みっちゃんが成長した現代最強形。攻め・受け・読み・寄せのすべてが現代最高水準。'}}
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

  const rankTextBase=rankText;const FUTURE_RANK_LABELS={25:'強さ1位・未来最強',0:'強さ2位・現代最強',1:'強さ3位',2:'強さ4位',3:'強さ5位',4:'強さ6位'};rankText=function(i){return FUTURE_RANK_LABELS[i]||rankTextBase(i)};
  const portraitHTMLBase=portraitHTML;portraitHTML=function(i,c){if(i===FUTURE_INDEX)return '<img alt="'+FUTURE_NAME+'" src="'+futureImage()+'" style="box-shadow:inset 0 0 0 3px #75e7ff,0 0 18px #4fd8ff88"><span class="oppFixed" style="background:#07526a;color:#d9fbff">FUTURE・V9.70</span>';return portraitHTMLBase(i,c)};

  function addFutureCard(){
    const box=document.getElementById('chars');if(!box||box.querySelector('[data-future-mitsuki="1"]'))return;
    const b=document.createElement('button');b.className='ch';b.dataset.futureMitsuki='1';b.style.cssText='border-color:#39caef;box-shadow:0 0 0 1px #39caef55,0 0 18px #39caef33';
    b.innerHTML='<img class="chPic" alt="'+FUTURE_NAME+'" src="'+futureImage()+'"><span class="chFixed" style="background:#07526a;color:#d9fbff">未来</span><div class="chName">'+FUTURE_NAME+'</div><div class="chRating">R'+FUTURE_RATING+'・V9.70</div><div class="chStyle">未来型・超深読み</div><div class="futureEngineState" style="font-size:10px;color:#72dff6;margin-top:4px">ENGINE：未起動</div>';
    b.onclick=()=>{ci=FUTURE_INDEX;lastSpeech='';speechMood='start';newGame();ensureFutureImage().then(()=>{refreshFutureImages();try{renderOpponent(false)}catch(e){}})};box.appendChild(b);
  }
  addFutureCard();ensureFutureImage().then(()=>{refreshFutureImages();try{renderOpponent(false)}catch(e){}});
  const regularMitsukiCard=document.querySelectorAll('#chars .ch')[0];if(regularMitsukiCard){const style=regularMitsukiCard.querySelector('.chStyle');if(style)style.textContent=CHAR_META[0].style+'｜'+(typeof openingLabel==='function'?openingLabel(0):'万能・局面対応')}

  function setEngineState(text,ok=false){
    document.querySelectorAll('.futureEngineState').forEach(e=>{e.textContent='ENGINE：'+text;e.style.color=ok?'#7dffb2':'#72dff6'});
    window.AI_SHOGI_YANEURAOU_FUTURE=window.AI_SHOGI_YANEURAOU_FUTURE||{};window.AI_SHOGI_YANEURAOU_FUTURE.state=text;window.AI_SHOGI_YANEURAOU_FUTURE.stage=text;
    try{if(ci===FUTURE_INDEX){const s=document.getElementById('status');if(s)s.textContent='未来みつき ENGINE：'+text}}catch(e){}
  }

  /* 駒音: 外部音源なしで木駒の短い打音をWeb Audio生成。設定はlocalStorageに保存。 */
  const PIECE_SOUND_KEY='aiShogiPieceSound21529';
  let pieceSoundEnabled=true,pieceAudioCtx=null;
  try{pieceSoundEnabled=localStorage.getItem(PIECE_SOUND_KEY)!=='0'}catch(e){}
  function getPieceAudio(){if(!pieceSoundEnabled)return null;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{if(!pieceAudioCtx||pieceAudioCtx.state==='closed')pieceAudioCtx=new AC();if(pieceAudioCtx.state==='suspended')pieceAudioCtx.resume().catch(()=>{});return pieceAudioCtx}catch(e){return null}}
  function playPieceSound(level=1){if(!pieceSoundEnabled)return false;const ac=getPieceAudio();if(!ac)return false;try{const t=ac.currentTime+.002,master=ac.createGain();master.gain.setValueAtTime(.34*Math.max(.5,Math.min(1.25,level)),t);master.gain.exponentialRampToValueAtTime(.0001,t+.065);master.connect(ac.destination);const osc=ac.createOscillator(),og=ac.createGain();osc.type='triangle';osc.frequency.setValueAtTime(760,t);osc.frequency.exponentialRampToValueAtTime(330,t+.042);og.gain.setValueAtTime(.44,t);og.gain.exponentialRampToValueAtTime(.0001,t+.05);osc.connect(og);og.connect(master);osc.start(t);osc.stop(t+.052);const n=Math.max(64,Math.floor(ac.sampleRate*.028)),buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.4);const src=ac.createBufferSource(),f=ac.createBiquadFilter(),ng=ac.createGain();f.type='bandpass';f.frequency.value=1450;f.Q.value=.75;ng.gain.setValueAtTime(.62,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.035);src.buffer=buf;src.connect(f);f.connect(ng);ng.connect(master);src.start(t);src.stop(t+.036);return true}catch(e){return false}}
  function unlockPieceSound(){if(pieceSoundEnabled)getPieceAudio()}
  function updatePieceSoundButtons(){document.querySelectorAll('[data-piece-sound-toggle="1"]').forEach(b=>{b.textContent='駒音 '+(pieceSoundEnabled?'ON':'OFF');b.setAttribute('aria-pressed',pieceSoundEnabled?'true':'false');b.title='駒を指したときの音を'+(pieceSoundEnabled?'消す':'鳴らす')})}
  function setPieceSound(v,preview=false){pieceSoundEnabled=!!v;try{localStorage.setItem(PIECE_SOUND_KEY,pieceSoundEnabled?'1':'0')}catch(e){}updatePieceSoundButtons();if(pieceSoundEnabled){unlockPieceSound();if(preview)setTimeout(()=>playPieceSound(1.05),0)}return pieceSoundEnabled}
  function makePieceSoundButton(id){const b=document.createElement('button');b.className='btn';b.id=id;b.dataset.pieceSoundToggle='1';b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();setPieceSound(!pieceSoundEnabled,true)};return b}
  function installPieceSoundUI(){const c=document.querySelector('.controls');if(c&&!document.getElementById('pieceSoundBtn'))c.appendChild(makePieceSoundButton('pieceSoundBtn'));const f=document.getElementById('fundoBtn')?.parentElement;if(f&&!document.getElementById('fpieceSoundBtn'))f.appendChild(makePieceSoundButton('fpieceSoundBtn'));updatePieceSoundButtons()}
  document.addEventListener('pointerdown',unlockPieceSound,{capture:true,passive:true});
  const pushPieceSoundBase=push;push=function(m,mark){const before=st&&st.log?st.log.length:0,r=pushPieceSoundBase(m,mark),after=st&&st.log?st.log.length:0;if(after>before)playPieceSound();return r};
  installPieceSoundUI();
  window.AI_SHOGI_PIECE_SOUND={version:'21529b',play:playPieceSound,setEnabled:setPieceSound,get enabled(){return pieceSoundEnabled},audit:()=>({enabled:pieceSoundEnabled,context:pieceAudioCtx?pieceAudioCtx.state:'none',buttons:document.querySelectorAll('[data-piece-sound-toggle="1"]').length})};

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
  async function initFutureEngine(){if(engineReady&&worker)return true;await callWorker('init',{},75000);engineReady=true;setEngineState('⑤成功 V9.70＋水匠5 接続済み',true);return true}
  async function futureBest(s,opts={}){
    const sfen=toSFEN(s),mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent),endgame=(s.log?.length||0)>=55,defaultMs=mobile?(endgame?7000:4000):(endgame?10000:7000);
    const requested=Number(opts&&opts.ms),ms=Number.isFinite(requested)&&requested>=250?Math.max(250,Math.min(20000,Math.round(requested))):defaultMs;
    const requestedPV=Number(opts&&opts.multiPV),multiPV=Number.isFinite(requestedPV)?Math.max(1,Math.min(4,Math.round(requestedPV))):1;
    const r=await callWorker('bestmove',{sfen,ms,multiPV},90000);engineReady=true;const tok=String(r.token||'').trim(),info=r.info||{};
    if(tok==='resign')return{resign:true,info};if(tok==='win')return{declareWin:true,info};const lm=legal(s),m=lm.find(x=>usi(x)===tok);if(!m)throw new Error('YaneuraOu illegal/unmapped bestmove '+tok+' for '+sfen);return{move:m,info};
  }

  const aiMoveBase=aiMove;
  aiMove=function(){
    if(ci!==FUTURE_INDEX)return aiMoveBase();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    thinking=true;showSpeech('think',true);setStatus(FUTURE_NAME+'がやねうら王V9.70で未来を読んでいます…');
    const startKey=posKey(st),startCi=ci,startState=clone(st),started=performance.now();
    (async()=>{
      let res=null,usedFallback=false;
      try{res=await futureBest(startState)}catch(e){usedFallback=true;engineError=String(e&&e.message||e);console.error('Future Mitsuki worker fallback',e);setEngineState('⑤失敗 → 内蔵MAXへ退避: '+engineError);killWorker(engineError);const fb=chooseAI(clone(startState),0);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵MAX fallback',error:engineError}}}
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback};
      if(res.resign){thinking=false;const delta=recordResult(1);setStatus(FUTURE_NAME+'が投了しました。あなたの勝ちです。');setResult('win','未来みつき投了・勝ち　R '+(delta>=0?'+':'')+delta);speechMood='loss';lastSpeech='';render();renderOpponent(true);refreshFutureImages();return}
      if(res.declareWin){thinking=false;const delta=recordResult(0);setStatus(FUTURE_NAME+'の入玉宣言勝ちです。');setResult('loss','未来みつき宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);refreshFutureImages();return}
      if(res.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);refreshFutureImages();if(finishIfEnded())return;
      const x=lastAIInfo||{};const engineLabel=x.fallback?'内蔵MAX退避（'+String(x.error||engineError||'原因不明').slice(0,80)+'）':'やねうら王V9.70＋水匠5';setStatus('あなたの手番です。'+engineLabel+(x.depth?' / 深さ'+x.depth:'')+(x.nodes?' / '+Number(x.nodes).toLocaleString()+'局面':''));
    })();
  };

  const newGameBase=newGame;newGame=function(){try{worker?.postMessage({type:'newgame'})}catch(e){}const r=newGameBase();if(ci===FUTURE_INDEX&&!engineReady)setTimeout(()=>initFutureEngine().catch(e=>{engineError=String(e&&e.message||e);console.error('Future Mitsuki prewarm',e)}),0);setTimeout(refreshFutureImages,0);return r};
  const undoBase=undo;undo=function(){try{worker?.postMessage({type:'stop'})}catch(e){}const r=undoBase();setTimeout(refreshFutureImages,0);return r};
  document.getElementById('newBtn').onclick=newGame;document.getElementById('undoBtn').onclick=undo;document.getElementById('fundoBtn').onclick=undo;

  window.AI_SHOGI_YANEURAOU_FUTURE={version:VERSION,index:FUTURE_INDEX,name:FUTURE_NAME,rating:FUTURE_RATING,state:'未起動',init:initFutureEngine,toSFEN,bestMove:futureBest,status:()=>({ready:engineReady,error:engineError,crossOriginIsolated:globalThis.crossOriginIsolated,worker:!!worker})};
  window.AI_SHOGI_FUTURE_AUDIT21520={version:VERSION,characters:C.length,card:!!document.querySelector('[data-future-mitsuki="1"]'),sfenOK:toSFEN(initial()).startsWith('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b -'),crossOriginIsolated:globalThis.crossOriginIsolated,workerURL:WORKER_URL};
  const badge=document.querySelector('.badge');if(badge)badge.textContent='v2.15.28 26キャラ・未来みつき V9.70';
  render();renderStats();renderOpponent(false);refreshFutureImages();
})();