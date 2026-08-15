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
