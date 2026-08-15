(()=>{'use strict';
const E=window.ShogiEngine,{S,G}=E,$=id=>document.getElementById(id);
const PICS=['https://ai-shogi-face-mitsuki.vercel.app/face.svg?v=290','https://ai-shogi-face-micchan.vercel.app/face.svg?v=290','./akiou.webp?v=2100','https://ai-shogi-face-onimama.vercel.app/face.svg?v=290','https://ai-shogi-face-mama.vercel.app/face.svg?v=290'];
const C=[
{name:'みつき',r:3000,style:'最強・万能型／終盤最強',opening:'万能・局面対応',kind:'master'},
{name:'みっちゃん',r:2850,style:'破天荒・スピード万能型',opening:'急戦・早繰り銀',kind:'speed'},
{name:'あき王',r:2700,style:'万能型＋終盤強め',opening:'角換わり',kind:'universal'},
{name:'おにまま',r:2600,style:'堅実・受け強・ミスに厳しい',opening:'矢倉',kind:'defense'},
{name:'まま',r:2500,style:'バランス型・立て直し型',opening:'雁木',kind:'recovery'},
{name:'柳生 晴明',r:2100,style:'正統派・精密居飛車',opening:'角換わり',kind:'precision'},
{name:'藤堂 楓',r:1450,style:'受け将棋・矢倉党',opening:'矢倉',kind:'defense'},
{name:'天野 蒼太',r:1550,style:'スピード居飛車',opening:'相掛かり',kind:'speed'},
{name:'本多 忠勝',r:1700,style:'豪腕攻め',opening:'棒銀・右四間',kind:'attack'},
{name:'大江 雪乃',r:1800,style:'精密型',opening:'角換わり',kind:'precision'},
{name:'島津 義久',r:1600,style:'美濃囲い型',opening:'四間飛車',kind:'furibisha'},
{name:'伊達 政宗',r:1750,style:'乱戦型',opening:'横歩取り',kind:'chaos'},
{name:'上杉 謙信',r:1900,style:'急戦型',opening:'早繰り銀',kind:'attack'},
{name:'服部 半蔵',r:1680,style:'機動型',opening:'三間飛車・石田流',kind:'mobility'},
{name:'鬼庭 綾子',r:1380,style:'柔軟型',opening:'中飛車',kind:'flex'},
{name:'真田 幸村',r:1950,style:'猛攻型',opening:'ゴキゲン中飛車',kind:'attack'},
{name:'ねね',r:1250,style:'柔軟・奇襲型',opening:'向かい飛車',kind:'trick'},
{name:'竹中 重治',r:2050,style:'策士型',opening:'雁木',kind:'strategy'},
{name:'黒田 長政',r:1820,style:'力戦・実戦型',opening:'力戦',kind:'power'},
{name:'明智 光秀',r:2000,style:'反撃型',opening:'居飛車穴熊',kind:'counter'},
{name:'千 利休',r:1880,style:'持久戦・間合い型',opening:'矢倉',kind:'patient'},
{name:'山本 勘助',r:2180,style:'軍師・万能型',opening:'万能',kind:'universal'},
{name:'出雲 阿国',r:1500,style:'奇襲・自由型',opening:'自由型',kind:'trick'},
{name:'里見 義景',r:2250,style:'終盤型',opening:'振り飛車穴熊',kind:'endgame'},
{name:'月影 千景',r:2400,style:'師範・万能型',opening:'万能',kind:'master'}];
const SAY={0:['落ち着いていこう。','見えてきたよ、勝ち筋が。','終盤は丁寧に。'],1:['るんばー！','みつきーっく！','うどんさんたべたい。','ぺんぎんさんちにいきたいー','じゃんぷ、じゃんぷ！','にゃんびー','かあちゃん、だっこー！！','じゅーすちょうだい。'],2:['一手ずつ整理していきましょう。','ここはよく考えたいですね。','終盤まで正確にいきます。'],3:['そこ、よく見なさい。','まだ甘いわね。','受け切ってから反撃よ。'],4:['あわてずにいこうね。','ここから立て直そう。','大丈夫、まだ指せるよ。']},LOSE_MIC=['大人なのに本気でやるの？','ままーだっこしてーー'];
let ci=0,st=null,sel=null,drop=null,hist=[],thinking=false,gameOver=false;
let stats=JSON.parse(localStorage.getItem('aiShogiStats210')||'{"r":1500,"w":0,"l":0,"d":0}');
function saveHist(){hist.push(E.cp(st));if(hist.length>20)hist.shift()}
function setSpeech(){let score=E.material(st,G),arr=ci===1&&score<-700?LOSE_MIC:(SAY[ci]||['よろしくお願いします。','いい勝負にしましょう。']),s=arr[(Math.random()*arr.length)|0];$('speech').textContent=s;$('fspeech').textContent=s}
function renderPortrait(id){let el=$(id),c=C[ci];el.innerHTML=ci<5?'<img alt="'+c.name+'" src="'+PICS[ci]+'"><span class="fixed">固定</span>':c.name.slice(0,1)}
function strengthLabel(cfg){let trait=cfg.kind==='defense'?'受け・駒損回避':cfg.kind==='speed'?'速度・攻め':cfg.kind==='attack'?'攻撃・王手':cfg.kind==='endgame'?'終盤':cfg.kind==='recovery'?'立て直し':'総合';return'実装棋力：最大'+cfg.depth+'手読み・'+trait+'強化・思考'+cfg.time+'ms'}
function renderOpp(){let c=C[ci],cfg=E.cfgFor(c);for(let pre of['','f']){$(pre+'oppName').textContent=c.name+'　R'+c.r;$(pre+'oppMeta').textContent=c.style+'｜得意戦型 '+c.opening;$(pre+'engineInfo').textContent=strengthLabel(cfg)}renderPortrait('portrait');renderPortrait('fportrait')}
function renderBoard(el){el.innerHTML='';let targets=[];if(sel!=null)targets=E.legal(st,S).filter(m=>!m.drop&&m.from===sel).map(m=>m.to);if(drop)targets=E.legal(st,S).filter(m=>m.drop&&m.k===drop).map(m=>m.to);for(let i=0;i<81;i++){let sq=document.createElement('div');sq.className='sq'+(i===sel?' sel':'')+(targets.includes(i)?' to':'');let p=st.b[i];if(p){let z=document.createElement('div');z.className='pc'+(p.o===G?' g':'');z.textContent=E.label(p);sq.appendChild(z)}sq.addEventListener('click',()=>tap(i),{passive:true});el.appendChild(sq)}}
function renderHand(id,o){let el=$(id);el.innerHTML='<b>'+(o===S?'あなた':'相手')+'</b>';for(let k of['R','B','G','S','N','L','P'])if(st.h[o][k]){let b=document.createElement('button');b.className='hp';b.textContent=E.KJ[k]+'×'+st.h[o][k];if(o===S)b.onclick=()=>{drop=drop===k?null:k;sel=null;render()};el.appendChild(b)}}
function renderStats(){$('statsMain').textContent='あなた R'+stats.r;$('statsSub').textContent=stats.w+'勝 '+stats.l+'敗 '+stats.d+'分　vs '+C[ci].name}
function render(){renderBoard($('board'));renderBoard($('fboard'));renderHand('sHand',S);renderHand('gHand',G);renderHand('fsHand',S);renderHand('fgHand',G);renderOpp();renderStats();document.querySelectorAll('.ch').forEach((e,i)=>e.classList.toggle('on',i===ci));$('moves').innerHTML=st.log.length?st.log.map((x,i)=>'<div>'+(i+1)+'. '+x+'</div>').join(''):'まだ棋譜はありません'}
function status(t){$('status').textContent=t;$('fstatus').textContent=t}
function end(result){gameOver=true;thinking=false;if(result==='win'){stats.w++;stats.r+=Math.max(4,Math.round((C[ci].r-stats.r)/40)+16);status('あなたの勝ちです！')}else if(result==='lose'){stats.l++;stats.r-=Math.max(4,Math.round((stats.r-C[ci].r)/40)+12);status(C[ci].name+'の勝ちです。')}else{stats.d++;status('引き分けです。')}localStorage.setItem('aiShogiStats210',JSON.stringify(stats));renderStats();$('reviewBtn').textContent='対局を振り返る';setSpeech()}
function afterMove(){let lm=E.legal(st,st.t);if(!lm.length){if(st.t===G)end('win');else end('lose');return true}return false}
function humanMove(m){saveHist();let txt=E.moveText(m,st.t,st);st=E.apply(st,m);st.log.push(txt);sel=drop=null;render();if(afterMove())return;status(C[ci].name+'が考えています…');thinking=true;setTimeout(aiMove,30)}
function tap(i){if(thinking||gameOver||st.t!==S)return;let lm=E.legal(st,S);if(drop){let m=lm.find(x=>x.drop&&x.k===drop&&x.to===i);if(m){humanMove(m);return}drop=null;render();return}if(sel!=null){let ms=lm.filter(x=>!x.drop&&x.from===sel&&x.to===i);if(ms.length){let m=ms.length===1?ms[0]:(confirm('成りますか？')?ms.find(x=>x.prom):ms.find(x=>!x.prom));humanMove(m);return}}let p=st.b[i];sel=p&&p.o===S?i:null;render()}
function aiMove(){if(gameOver)return;let cfg=E.cfgFor(C[ci]),pick=E.choose(st,cfg,G);if(!pick){thinking=false;end('win');return}saveHist();let txt=E.moveText(pick,G,st);st=E.apply(st,pick);st.log.push(txt);thinking=false;setSpeech();render();if(afterMove())return;let r=E.getLastSearch();status('あなたの手番です。　'+C[ci].name+'：'+r.depth+'手読み / '+r.nodes+'局面 / '+r.ms+'ms')}
function analyze(){if(thinking)return;let c={...C[24],r:2400,kind:'master',opening:'万能'},cfg=E.cfgFor(c);cfg.time=420;cfg.depth=3;let start=performance.now(),pick=E.choose({...E.cp(st),t:S},cfg,S),sc=E.evaluate(st,S,cfg),pct=Math.max(5,Math.min(95,50+sc/65));$('evalFill').style.width=pct+'%';$('shapeLabel').textContent='形勢：'+(sc>700?'あなたかなり有利':sc>220?'あなた有利':sc<-700?'相手かなり有利':sc<-220?'相手有利':'互角')+'（評価 '+(sc>=0?'+':'')+Math.round(sc)+'）';$('teacherMove').textContent='おすすめ手：'+(pick?E.moveText(pick,S,st).replace('▲',''):'—');$('teacherText').textContent=E.inCheck(st,S)?'王手されています。まず王手を外す手を最優先します。':'AI先生は駒得だけでなく、王の安全・駒のタダ取り・相手の返しまで読んでいます。解析 '+Math.round(performance.now()-start)+'ms。'}
function review(){if(!st.log.length){$('reviewSummary').textContent='まだ振り返れる手がありません。';return}let cfg=E.cfgFor({...C[24],r:2400}),sc=E.evaluate(st,S,cfg),t='ここまで '+st.log.length+'手。現在は'+(sc>220?'あなた有利':sc<-220?'相手有利':'互角')+'。',hr=E.hangingRisk(st,S),or=E.hangingRisk(st,G);if(hr>180)t+='あなた側に取り残された駒があります。駒の逃げ道・受けを確認。';else if(or>180)t+='相手に浮いている駒があります。取り切れるか読んでみましょう。';else if(E.inCheck(st,S))t+='いま王手を受けています。';else t+='王の安全と次の相手の狙いまで確認して進めましょう。';$('reviewSummary').textContent=t}
function newGame(){st=E.fresh();sel=drop=null;hist=[];thinking=gameOver=false;$('shapeLabel').textContent='形勢：—';$('teacherMove').textContent='おすすめ手：解析すると表示';$('reviewSummary').textContent='あなたが1手以上指すと振り返れます。';$('reviewBtn').textContent='ここまで振り返る';setSpeech();render();status('あなたが先手です。駒をタップしてください。')}
let ce=$('chars');C.forEach((c,i)=>{let cfg=E.cfgFor(c),b=document.createElement('button');b.className='ch';b.innerHTML=(i<5?'<img class="chPic" src="'+PICS[i]+'"><span class="chFix">固定</span>':'<span class="chPh">'+c.name[0]+'</span><span class="chTmp">仮絵</span>')+'<div class="chName">'+c.name+'</div><div class="chRating">R'+c.r+'</div><div class="chStyle">'+c.style+'</div><div class="chDepth">最大'+cfg.depth+'手読み</div>';b.onclick=()=>{ci=i;newGame()};ce.appendChild(b)});
$('newBtn').onclick=newGame;$('undoBtn').onclick=()=>{if(hist.length&&!thinking){st=hist.pop();sel=drop=null;gameOver=false;render();status('待ったしました。')}};$('focusBtn').onclick=()=>{$('focus').classList.add('on');render()};$('closeBtn').onclick=()=>$('focus').classList.remove('on');$('analyzeBtn').onclick=analyze;$('reviewBtn').onclick=review;$('resetStats').onclick=()=>{stats={r:1500,w:0,l:0,d:0};localStorage.setItem('aiShogiStats210',JSON.stringify(stats));renderStats()};
newGame();window.AI_SHOGI_BUILD='2.10.0-strength-engine';window.AI_SHOGI_DEBUG={getState:()=>E.cp(st),cfg:i=>E.cfgFor(C[i]),choose:(i=ci)=>E.choose({...E.cp(st),t:G},E.cfgFor(C[i]),G),eval:(o=S,i=ci)=>E.evaluate(st,o,E.cfgFor(C[i])),legal:()=>E.legal(st,st.t).length};
})();