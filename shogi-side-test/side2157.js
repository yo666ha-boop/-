/* AI将棋先生 v2.15.7 手番選択テスト。本体6分割を全結合した後、最後のIIFE終了直前へ挿入する。 */
let SIDE2157_GOTE=false;
let SIDE2157_MODE='sente';

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
})();

const SIDE2157_pushBase=push;
push=function(m,mark){
  let shown=mark;
  if(SIDE2157_GOTE){if(mark==='▲')shown='△';else if(mark==='△')shown='▲'}
  return SIDE2157_pushBase(m,shown);
};

jpMove=function(m,s){
  if(!m)return'—';
  let[x,y]=xy(m.to),sq=String(9-x)+'一二三四五六七八九'[y],k=m.drop?m.drop:(s.b[m.f]?s.b[m.f].k:'P');
  const humanTurn=s.t===S;
  const sym=humanTurn?(SIDE2157_GOTE?'△':'▲'):(SIDE2157_GOTE?'▲':'△');
  return sym+sq+KJ[m.prom?PRO(k):k]+(m.drop?'打':m.prom?'成':'');
};

shape=function(score){
  if(!SIDE2157_GOTE){if(score>500)return'先手有利';if(score>160)return'やや先手';if(score<-500)return'後手有利';if(score<-160)return'やや後手';return'互角'}
  if(score>500)return'後手有利';if(score>160)return'やや後手';if(score<-500)return'先手有利';if(score<-160)return'やや先手';return'互角';
};

newGame=function(){
  const sidePicker=document.getElementById('sideSelect2157');
  SIDE2157_MODE=sidePicker&&['sente','gote','random'].includes(sidePicker.value)?sidePicker.value:'sente';
  SIDE2157_GOTE=SIDE2157_MODE==='gote'||(SIDE2157_MODE==='random'&&Math.random()<0.5);
  st=initial();hist=[];repHistory=[];sel=null;drop=null;thinking=false;gameCounted=false;lastHumanBefore=null;lastHumanMove=null;lastSpeech='';speechMood='start';
  if(SIDE2157_GOTE)st.t=G;
  repHistory=[repEntry(st)];
  clearResult();resetTeacher();resetReview();
  const actual=document.getElementById('sideActual2157');if(actual)actual.textContent='今回：'+(SIDE2157_GOTE?'後手':'先手');
  setStatus(SIDE2157_GOTE?('あなたは後手です。'+C[ci][0]+'が先手で考えています…'):'あなたは先手です。駒をタップしてください。');
  render();renderOpponent(true);
  if(SIDE2157_GOTE)setTimeout(()=>aiMove(),180);
};

const SIDE2157_undoBase=undo;
undo=function(){
  SIDE2157_undoBase();
  if(SIDE2157_GOTE&&!gameCounted&&st.t===G&&!thinking&&hist.length){
    setStatus(C[ci][0]+'が考えています…');
    setTimeout(()=>aiMove(),120);
  }
};

document.getElementById('newBtn').onclick=newGame;
document.getElementById('undoBtn').onclick=undo;
document.getElementById('fundoBtn').onclick=undo;

window.AI_SHOGI_SIDE_TEST={
  version:'2.15.7',
  get:()=>({mode:SIDE2157_MODE,actual:SIDE2157_GOTE?'gote':'sente'}),
  set:(mode)=>{if(!['sente','gote','random'].includes(mode))return false;SIDE2157_MODE=mode;const p=document.getElementById('sideSelect2157');if(p)p.value=mode;return true;}
};
