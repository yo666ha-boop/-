/* AI将棋先生 v2.15.20 - 26人目「未来からやってきたみつき」YaneuraOu WASM test */
(function installFutureMitsuki21520(){
  const VERSION='2.15.20';
  const FUTURE_INDEX=25;
  const FUTURE_NAME='未来からやってきたみつき';
  const FUTURE_RATING=3400;
  const ENGINE_BASE='/engine/';

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
  CHAR_META[FUTURE_INDEX]={style:'未来型・超深読み',feature:'やねうら王 HalfKP / 本格USIエンジン'};
  STYLE[FUTURE_INDEX]={...(STYLE[0]||{atk:1,def:1,pos:1,end:1}),atk:1.16,def:1.18,pos:1.20,end:1.24};
  TEMP_DIALOGUES[FUTURE_INDEX-5]=FUTURE_DIALOGUE;
  if(stats&&Array.isArray(stats.chars)){
    while(stats.chars.length<C.length)stats.chars.push({w:0,l:0,d:0});
    try{saveStats()}catch(e){}
  }

  const rankTextBase21520=rankText;
  rankText=function(i){return i===FUTURE_INDEX?'未来・やねうら王':rankTextBase21520(i)};

  const portraitHTMLBase21520=portraitHTML;
  portraitHTML=function(i,c){
    if(i===FUTURE_INDEX)return '<img alt="'+FUTURE_NAME+'" src="'+FIXED_IMG[0]+'" style="box-shadow:inset 0 0 0 3px #75e7ff,0 0 18px #4fd8ff88"><span class="oppFixed" style="background:#07526a;color:#d9fbff">FUTURE・やねうら王</span>';
    return portraitHTMLBase21520(i,c);
  };

  function addFutureCard21520(){
    const box=document.getElementById('chars');
    if(!box||box.querySelector('[data-future-mitsuki="1"]'))return;
    const b=document.createElement('button');
    b.className='ch';b.dataset.futureMitsuki='1';
    b.style.cssText='border-color:#39caef;box-shadow:0 0 0 1px #39caef55,0 0 18px #39caef33';
    b.innerHTML='<img class="chPic" alt="'+FUTURE_NAME+'" src="'+FIXED_IMG[0]+'"><span class="chFixed" style="background:#07526a;color:#d9fbff">未来</span><div class="chName">'+FUTURE_NAME+'</div><div class="chRating">R'+FUTURE_RATING+'・やねうら王</div><div class="chStyle">未来型・超深読み</div><div class="futureEngineState" style="font-size:10px;color:#72dff6;margin-top:4px">ENGINE：未起動</div>';
    b.title=FUTURE_NAME+'｜R'+FUTURE_RATING+'｜やねうら王 HalfKP';
    b.onclick=()=>{ci=FUTURE_INDEX;lastSpeech='';speechMood='start';initFutureEngine21520().catch(()=>{});newGame()};
    box.appendChild(b);
  }
  addFutureCard21520();

  function setEngineState21520(text,ok=false){
    document.querySelectorAll('.futureEngineState').forEach(e=>{e.textContent='ENGINE：'+text;e.style.color=ok?'#7dffb2':'#72dff6'});
    window.AI_SHOGI_YANEURAOU_FUTURE=window.AI_SHOGI_YANEURAOU_FUTURE||{};
    window.AI_SHOGI_YANEURAOU_FUTURE.state=text;
  }

  function sfenPiece21520(p){
    if(!p)return'';
    let k=p.k||'',prom=k[0]==='+',base=prom?k.slice(1):k;
    let ch=p.o===S?base:base.toLowerCase();
    return (prom?'+':'')+ch;
  }
  function handSfen21520(s){
    const order=['R','B','G','S','N','L','P'];
    let out='';
    for(const side of [S,G])for(const k of order){
      const n=(s.h?.[side]?.[k]||0);if(!n)continue;
      const ch=side===S?k:k.toLowerCase();out+=(n>1?String(n):'')+ch;
    }
    return out||'-';
  }
  function toSFEN21520(s){
    const rows=[];
    for(let y=0;y<9;y++){
      let row='',empty=0;
      for(let x=0;x<9;x++){
        const p=s.b[idx(x,y)];
        if(!p){empty++;continue}
        if(empty){row+=empty;empty=0}
        row+=sfenPiece21520(p);
      }
      if(empty)row+=empty;rows.push(row);
    }
    return rows.join('/')+' '+(s.t===S?'b':'w')+' '+handSfen21520(s)+' '+Math.max(1,(s.log?.length||0)+1);
  }

  let engine21520=null,enginePromise21520=null,engineReady21520=false,engineInitError21520='';
  let waiters21520=[],latestInfo21520={};
  function onEngineLine21520(raw){
    const line=String(raw||'').trim();
    if(line.startsWith('info ')){
      const d=/\bdepth\s+(\d+)/.exec(line),n=/\bnodes\s+(\d+)/.exec(line),cp=/\bscore\s+cp\s+(-?\d+)/.exec(line),mate=/\bscore\s+mate\s+(-?\d+)/.exec(line);
      latestInfo21520={...latestInfo21520,line,depth:d?+d[1]:latestInfo21520.depth||0,nodes:n?+n[1]:latestInfo21520.nodes||0,cp:cp?+cp[1]:latestInfo21520.cp,mate:mate?+mate[1]:latestInfo21520.mate};
    }
    for(const w of waiters21520.slice()){
      let hit=false;try{hit=w.pred(line)}catch(e){}
      if(hit){waiters21520=waiters21520.filter(x=>x!==w);clearTimeout(w.timer);w.resolve(line)}
    }
  }
  function waitLine21520(pred,timeout=10000){
    return new Promise((resolve,reject)=>{
      const w={pred,resolve,reject,timer:null};
      w.timer=setTimeout(()=>{waiters21520=waiters21520.filter(x=>x!==w);reject(new Error('YaneuraOu timeout'))},timeout);
      waiters21520.push(w);
    });
  }

  async function initFutureEngine21520(){
    if(engineReady21520&&engine21520)return engine21520;
    if(enginePromise21520)return enginePromise21520;
    enginePromise21520=(async()=>{
      try{
        setEngineState21520('起動中…');
        if(!globalThis.crossOriginIsolated)throw new Error('crossOriginIsolated=false');
        const factory=globalThis.YaneuraOu_HalfKP;
        if(typeof factory!=='function')throw new Error('YaneuraOu_HalfKP factory not found');
        const e=await factory({locateFile:(p)=>ENGINE_BASE+p});
        e.addMessageListener(onEngineLine21520);engine21520=e;
        let p=waitLine21520(x=>x==='usiok',15000);e.postMessage('usi');await p;
        const mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent);
        e.postMessage('setoption name Threads value '+(mobile?2:4));
        e.postMessage('setoption name Hash value '+(mobile?64:256));
        e.postMessage('setoption name USI_Ponder value false');
        p=waitLine21520(x=>x==='readyok',30000);e.postMessage('isready');await p;
        e.postMessage('usinewgame');engineReady21520=true;engineInitError21520='';
        setEngineState21520('やねうら王 接続済み',true);
        const badge=document.querySelector('.badge');if(badge)badge.textContent='v2.15.20 26キャラ・未来みつき やねうら王接続OK';
        return e;
      }catch(err){engineInitError21520=String(err&&err.message||err);engineReady21520=false;setEngineState21520('起動失敗');throw err}
    })();
    try{return await enginePromise21520}finally{if(!engineReady21520)enginePromise21520=null}
  }

  async function futureBest21520(s){
    const e=await initFutureEngine21520();
    latestInfo21520={};
    const sfen=toSFEN21520(s);
    e.postMessage('position sfen '+sfen);
    const mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent);
    const endgame=(s.log?.length||0)>=55;
    const ms=mobile?(endgame?9000:6000):(endgame?18000:12000);
    const p=waitLine21520(x=>x.startsWith('bestmove '),ms+8000);
    e.postMessage('go movetime '+ms);
    const line=await p;
    const tok=(line.split(/\s+/)[1]||'').trim();
    if(tok==='resign')return{resign:true,info:{...latestInfo21520,engine:'YaneuraOu HalfKP',ms}};
    if(tok==='win')return{declareWin:true,info:{...latestInfo21520,engine:'YaneuraOu HalfKP',ms}};
    const lm=legal(s),m=lm.find(x=>usi(x)===tok);
    if(!m)throw new Error('YaneuraOu illegal/unmapped bestmove '+tok+' for '+sfen);
    return{move:m,info:{...latestInfo21520,engine:'YaneuraOu HalfKP',usi:tok,ms}};
  }

  const aiMoveBase21520=aiMove;
  aiMove=function(){
    if(ci!==FUTURE_INDEX)return aiMoveBase21520();
    if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;
    thinking=true;showSpeech('think',true);setStatus(FUTURE_NAME+'がやねうら王で未来を読んでいます…');
    const startKey=posKey(st),startCi=ci,startState=clone(st),started=performance.now();
    (async()=>{
      let res=null,usedFallback=false;
      try{res=await futureBest21520(startState)}catch(e){
        usedFallback=true;console.error('Future Mitsuki YaneuraOu fallback',e);
        const fb=chooseAI(clone(startState),0);res={move:fb.move,info:{...(fb.info||{}),engine:'内蔵MAX fallback',error:String(e&&e.message||e)}};
        setEngineState21520('接続失敗・内蔵MAXへ退避');
      }
      if(ci!==startCi||posKey(st)!==startKey||gameCounted){thinking=false;return}
      lastAIInfo={...(res.info||{}),elapsed:Math.round(performance.now()-started),fallback:usedFallback};
      if(res.resign){thinking=false;const delta=recordResult(1);setStatus(FUTURE_NAME+'が投了しました。あなたの勝ちです。');setResult('win','未来みつき投了・勝ち　R '+(delta>=0?'+':'')+delta);speechMood='loss';lastSpeech='';render();renderOpponent(true);return}
      if(res.declareWin){thinking=false;const delta=recordResult(0);setStatus(FUTURE_NAME+'の入玉宣言勝ちです。');setResult('loss','未来みつき宣言勝ち・負け　R '+(delta>=0?'+':'')+delta);speechMood='win';lastSpeech='';render();renderOpponent(true);return}
      if(res.move)push(res.move,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);if(finishIfEnded())return;
      const x=lastAIInfo||{};setStatus('あなたの手番です。やねうら王 '+(x.depth?'深さ'+x.depth+' / ':'')+(x.nodes?Number(x.nodes).toLocaleString()+'局面 / ':'')+(x.fallback?'内蔵MAX退避':'本格エンジン'));
    })();
  };

  const newGameBase21520=newGame;
  newGame=function(){try{if(engine21520){engine21520.postMessage('stop');engine21520.postMessage('usinewgame')}}catch(e){}return newGameBase21520()};
  const undoBase21520=undo;
  undo=function(){try{if(engine21520)engine21520.postMessage('stop')}catch(e){}return undoBase21520()};
  document.getElementById('newBtn').onclick=newGame;document.getElementById('undoBtn').onclick=undo;document.getElementById('fundoBtn').onclick=undo;

  window.AI_SHOGI_YANEURAOU_FUTURE={version:VERSION,index:FUTURE_INDEX,name:FUTURE_NAME,rating:FUTURE_RATING,state:'未起動',init:initFutureEngine21520,toSFEN:toSFEN21520,bestMove:futureBest21520,status:()=>({ready:engineReady21520,error:engineInitError21520,crossOriginIsolated:globalThis.crossOriginIsolated,latestInfo:latestInfo21520})};
  window.AI_SHOGI_FUTURE_AUDIT21520={version:VERSION,characters:C.length,card:!!document.querySelector('[data-future-mitsuki="1"]'),sfenOK:toSFEN21520(initial()).startsWith('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b -'),factory:typeof globalThis.YaneuraOu_HalfKP==='function',crossOriginIsolated:globalThis.crossOriginIsolated};
  const badge=document.querySelector('.badge');if(badge)badge.textContent='v2.15.20 26キャラ・未来みつき やねうら王テスト版';
  render();renderStats();renderOpponent(false);
})();
