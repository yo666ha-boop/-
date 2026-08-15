/* AI将棋先生 v2.15.7b 手番選択テスト。後手の待った・全画面・棋譜座標まで対応。 */
let SIDE2157_GOTE=false;
let SIDE2157_MODE='sente';

/* テスト版は /shogi-side-test/ 配下なので、あき王の相対画像だけ本番 /shogi/ を明示する */
const AKIOU_TEST_IMG='../shogi/akiou.webp?v=2157b';
FIXED_IMG[2]=AKIOU_TEST_IMG;
document.querySelectorAll('img[alt="あき王"]').forEach(img=>{img.src=AKIOU_TEST_IMG;});
const SIDE_TEST_BADGE=document.querySelector('.badge');
if(SIDE_TEST_BADGE)SIDE_TEST_BADGE.textContent='v2.15.7b 先手後手テスト・後手対応監査版';

(function installSide2157(){
  const controls=document.querySelector('.side .controls');
  if(!controls||document.getElementById('sideChoice2157'))return;
  const wrap=document.createElement('div');
  wrap.id='sideChoice2157';
  wrap.style.cssText='display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:9px 10px;border:1px solid #6f5a2d;border-radius:12px;background:#0b1512;flex-wrap:wrap';
  wrap.innerHTML='<b style="color:#ead79a;font-size:13px">手番</b><select id="sideSelect2157" style="flex:1;min-width:130px;background:#111b18;color:#f2dda0;border:1px solid #8b6c2f;border-radius:9px;padding:8px 10px;font-weight:800"><option value="sente">先手</option><option value="gote">後手</option><option value="random">ランダム</option></select><span id="sideActual2157" style="font-size:12px;color:#b9aa7d">今回：先手</span>';
  controls.parentNode.insertBefore(wrap,controls);
  const pick=wrap.querySelector('#sideSelect2157');
  try{const saved=localStorage.getItem('aiShogiSideMode2157');if(['sente','gote','random'].includes(saved)){pick.value=saved;SIDE2157_MODE=saved}}catch(e){}
  pick.addEventListener('change',()=>{
    SIDE2157_MODE=pick.value;
    try{localStorage.setItem('aiShogiSideMode2157',SIDE2157_MODE)}catch(e){}
    const a=document.getElementById('sideActual2157');
    if(a)a.textContent='次局：'+(SIDE2157_MODE==='sente'?'先手':SIDE2157_MODE==='gote'?'後手':'ランダム');
  });

  const focusTop=document.querySelector('#focus .focusbar strong');
  if(focusTop&&!document.getElementById('focusSide2157')){
    const b=document.createElement('span');
    b.id='focusSide2157';
    b.style.cssText='margin-left:10px;font-size:12px;color:#d7c58f;font-weight:800';
    b.textContent='あなた：先手';
    focusTop.after(b);
  }
})();

const SIDE2157_pushBase=push;
push=function(m,mark){
  let shown=mark;
  if(SIDE2157_GOTE){if(mark==='▲')shown='△';else if(mark==='△')shown='▲'}
  return SIDE2157_pushBase(m,shown);
};

jpMove=function(m,s){
  if(!m)return'—';
  let[x,y]=xy(m.to);
  const file=SIDE2157_GOTE?String(x+1):String(9-x);
  const ranks=SIDE2157_GOTE?'九八七六五四三二一':'一二三四五六七八九';
  const sq=file+ranks[y];
  const k=m.drop?m.drop:(s.b[m.f]?s.b[m.f].k:'P');
  const humanTurn=s.t===S;
  const sym=humanTurn?(SIDE2157_GOTE?'△':'▲'):(SIDE2157_GOTE?'▲':'△');
  return sym+sq+KJ[m.prom?PRO(k):k]+(m.drop?'打':m.prom?'成':'');
};

shape=function(score){
  if(!SIDE2157_GOTE){if(score>500)return'先手有利';if(score>160)return'やや先手';if(score<-500)return'後手有利';if(score<-160)return'やや後手';return'互角'}
  if(score>500)return'後手有利';if(score>160)return'やや後手';if(score<-500)return'先手有利';if(score<-160)return'やや先手';return'互角';
};

function side2157UpdateLabels(){
  const side=SIDE2157_GOTE?'後手':'先手';
  const actual=document.getElementById('sideActual2157');if(actual)actual.textContent='今回：'+side;
  const f=document.getElementById('focusSide2157');if(f)f.textContent='あなた：'+side;
}

newGame=function(){
  const sidePicker=document.getElementById('sideSelect2157');
  SIDE2157_MODE=sidePicker&&['sente','gote','random'].includes(sidePicker.value)?sidePicker.value:'sente';
  SIDE2157_GOTE=SIDE2157_MODE==='gote'||(SIDE2157_MODE==='random'&&Math.random()<0.5);
  st=initial();hist=[];repHistory=[];sel=null;drop=null;thinking=false;gameCounted=false;lastHumanBefore=null;lastHumanMove=null;lastSpeech='';speechMood='start';
  if(SIDE2157_GOTE)st.t=G;
  repHistory=[repEntry(st)];
  clearResult();resetTeacher();resetReview();
  side2157UpdateLabels();
  setStatus(SIDE2157_GOTE?('あなたは後手です。'+C[ci][0]+'が先手で考えています…'):'あなたは先手です。駒をタップしてください。');
  render();renderOpponent(true);
  if(SIDE2157_GOTE)setTimeout(()=>aiMove(),180);
};

const SIDE2157_undoBase=undo;
undo=function(){
  if(SIDE2157_GOTE&&!gameCounted&&reviewTrail.length===0){
    setStatus('まだあなたは指していません。AIの初手だけは「待った」できません。');
    return;
  }
  SIDE2157_undoBase();
  side2157UpdateLabels();
};

document.getElementById('newBtn').onclick=newGame;
document.getElementById('undoBtn').onclick=undo;
document.getElementById('fundoBtn').onclick=undo;

window.AI_SHOGI_SIDE_TEST={
  version:'2.15.7b',
  get:()=>({mode:SIDE2157_MODE,actual:SIDE2157_GOTE?'gote':'sente'}),
  set:(mode)=>{if(!['sente','gote','random'].includes(mode))return false;SIDE2157_MODE=mode;const p=document.getElementById('sideSelect2157');if(p)p.value=mode;return true;}
};

/* v2.15.9: しんじ・ぺんぺん画像を正しい画像へ更新し、古い画像キャッシュを回避 */
setTimeout(()=>{
  try{
    if(typeof EVA2158_DATA!=='undefined'){
      EVA2158_DATA[7].img='./eva2158/shinji.webp?v=2159';
      EVA2158_DATA[16].img='./eva2158/penpen.webp?v=2159';
      const b=document.querySelector('.badge');if(b)b.textContent='v2.15.9 EVA画像修正版・先手後手テスト';
      if(typeof side2158ApplyCards==='function')side2158ApplyCards();
      render();renderStats();lastSpeech='';renderOpponent(true);
      setTimeout(()=>{if(typeof side2158ApplyCards==='function')side2158ApplyCards();renderOpponent(false)},120);
      setTimeout(()=>{if(typeof side2158ApplyCards==='function')side2158ApplyCards()},500);
      if(window.AI_SHOGI_EVA2158)window.AI_SHOGI_EVA2158.version='2.15.9';
      if(window.AI_SHOGI_SIDE_TEST)window.AI_SHOGI_SIDE_TEST.version='2.15.9';
    }
  }catch(e){console.error('v2.15.9 EVA image fix',e)}
},0);

/* v2.15.10: EVA8人の場面別セリフ増量＋直近4セリフ重複回避を後読み */
(async function loadDialogue21510(){
  try{
    const r=await fetch('./dialogue21510.js?v=21510',{cache:'no-store'});
    if(!r.ok)throw new Error('dialogue21510.js '+r.status);
    const src=await r.text();
    eval(src);
  }catch(e){
    console.error('v2.15.10 dialogue patch load failed',e);
    const b=document.querySelector('.badge');if(b)b.textContent='v2.15.9 EVA画像修正版・セリフ更新失敗';
  }
})();

/* v2.15.14: 京楽・玉ちゃんの定番ボイスを実機系プレミア演出に寄せて再構成 */
setTimeout(()=>{
  try{
    if(typeof TEMP_DIALOGUES==='undefined'||!TEMP_DIALOGUES[9])return;
    const bank={
      start:['ガンバレ！ガンバレ！','一等賞〜！','ガンバレ！ガンバレ！一等賞！','ポンポコポン♪ ガンバレ！ガンバレ！ 一等賞！'],
      normal:['ガンバレ！ガンバレ！','よいしょっ！','まだまだ〜！','いいぞ、いいぞ〜！','もうちょっと〜！','ポンポコポン♪','玉ちゃん、応援中〜！','その調子〜！','元気いっぱい、ガンバレ〜！','いけいけ〜！','あと一歩〜！','チャンスだよ〜！'],
      winning:['一等賞〜！','ガンバレ！ガンバレ！一等賞！','いいぞ、いいぞ〜！','あとちょっと〜！','そのまま、そのまま〜！','ポンポコポン♪ いけいけ〜！','いっとうしょーまであと少し〜！','玉ちゃん、にっこにこ〜！','みんなでガンバレ〜！','もうひと押し〜！'],
      losing:['ガンバレ！ガンバレ！','まだまだ〜！','だいじょうぶ、ガンバレ〜！','ここから、ここから〜！','もう一回いこ〜！','負けないで〜！','玉ちゃん、応援するよ〜！','最後までガンバレ〜！'],
      critical:['ガンバレ！ガンバレ！','ふんばれ〜！','まだだよ〜！','あきらめないで〜！','あと一歩、ガンバレ〜！','ここが勝負だよ〜！','玉ちゃん、全力応援〜！','お願い、つながって〜！'],
      think:['うーん、どっちかな〜？','こっちかな〜？','よーく見て〜！','ちょっと待ってね〜！','ひらめけ〜！','よしっ、これ〜！'],
      win:['一等賞〜！','ガンバレ！ガンバレ！一等賞！','やったー！いっとうしょー！','ばんざーい！','ポンポコポン♪ 一等賞〜！','玉ちゃん、うれしい〜！','みんな、がんばったね〜！','もう一回やろ〜！'],
      loss:['ざんねーん！','次は一等賞〜！','もう一回、ガンバレ〜！','くやしいけど、またね〜！','次も応援するよ〜！'],
      undo:['もう一回〜！','やりなおし〜！','ガンバレ！ガンバレ！','今度こそ〜！']
    };
    TEMP_DIALOGUES[9]=bank;
    if(typeof FINAL21513_DATA!=='undefined'&&FINAL21513_DATA[14]){
      FINAL21513_DATA[14].dialogues=bank;
      FINAL21513_DATA[14].meta={style:'京楽プレミア・応援マスコット型',feature:'「ガンバレ！ガンバレ！」「一等賞！」の定番応援で盛り上げる京楽プレミアキャラ。明るい掛け声中心で、ときどきびっくり一手を放つ。'};
      if(typeof CHAR_META!=='undefined')CHAR_META[14]=FINAL21513_DATA[14].meta;
    }
    const card=document.querySelectorAll('#chars .ch')[14];
    if(card){const st=card.querySelector('.chStyle');if(st)st.textContent='京楽プレミア・応援マスコット型';card.title='玉ちゃん｜R'+C[14][1]+'｜京楽プレミア・応援マスコット型｜ガンバレ！ガンバレ！・一等賞！';}
    if(window.AI_SHOGI_FINAL21513){window.AI_SHOGI_FINAL21513.version='2.15.14';if(window.AI_SHOGI_FINAL21513.counts)window.AI_SHOGI_FINAL21513.counts['玉ちゃん']=Object.fromEntries(Object.entries(bank).map(([k,v])=>[k,v.length]));}
    if(window.AI_SHOGI_SIDE_TEST)window.AI_SHOGI_SIDE_TEST.version='2.15.14';
    window.AI_SHOGI_TAMA21514={version:'2.15.14',verifiedClassics:['ガンバレ！ガンバレ！','一等賞！','ガンバレ！ガンバレ！一等賞！','ポンポコポン']};
    const b=document.querySelector('.badge');if(b)b.textContent='v2.15.14 25キャラ完成・リン画像修正＋玉ちゃん定番ボイス版';
    if(typeof ci!=='undefined'&&C[ci]&&C[ci][0]==='玉ちゃん'&&typeof renderOpponent==='function'){lastSpeech='';speechMood='start';renderOpponent(true);}
  }catch(e){console.error('v2.15.14 玉ちゃん定番ボイス修正',e)}
},40);
