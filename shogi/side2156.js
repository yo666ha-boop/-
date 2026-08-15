/* v2.15.6 先手・後手・ランダム選択。strong213_05.part の後、06.part の前でIIFE内に連結する */
let userActualGote=false;
let sideMode='sente';

(function installSideSelector(){
  const controls=document.querySelector('.side .controls');
  if(!controls||document.getElementById('sideChoice'))return;
  const wrap=document.createElement('div');
  wrap.id='sideChoice';
  wrap.style.cssText='display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:9px 10px;border:1px solid #6f5a2d;border-radius:12px;background:#0b1512;flex-wrap:wrap';
  wrap.innerHTML='<b style="color:#ead79a;font-size:13px">手番</b><select id="sideSelect" style="flex:1;min-width:130px;background:#111b18;color:#f2dda0;border:1px solid #8b6c2f;border-radius:9px;padding:8px 10px;font-weight:800"><option value="sente">先手</option><option value="gote">後手</option><option value="random">ランダム</option></select><span id="sideActual" style="font-size:12px;color:#b9aa7d">今回：先手</span>';
  controls.parentNode.insertBefore(wrap,controls);
  const sel=wrap.querySelector('#sideSelect');
  try{const saved=localStorage.getItem('aiShogiSideMode');if(['sente','gote','random'].includes(saved)){sel.value=saved;sideMode=saved}}catch(e){}
  sel.addEventListener('change',()=>{sideMode=sel.value;try{localStorage.setItem('aiShogiSideMode',sideMode)}catch(e){};const a=document.getElementById('sideActual');if(a)a.textContent='次局：'+(sideMode==='sente'?'先手':sideMode==='gote'?'後手':'ランダム')});
})();

const _pushSide2156=push;
push=function(m,mark){
  let shown=mark;
  if(userActualGote){if(mark==='▲')shown='△';else if(mark==='△')shown='▲'}
  return _pushSide2156(m,shown);
};

jpMove=function(m,s){
  if(!m)return'—';
  let[x,y]=xy(m.to),sq=String(9-x)+'一二三四五六七八九'[y],k=m.drop?m.drop:(s.b[m.f]?s.b[m.f].k:'P');
  let humanTurn=s.t===S,sym=humanTurn?(userActualGote?'△':'▲'):(userActualGote?'▲':'△');
  return sym+sq+KJ[m.prom?PRO(k):k]+(m.drop?'打':m.prom?'成':'');
};

shape=function(score){
  if(!userActualGote){if(score>500)return'先手有利';if(score>160)return'やや先手';if(score<-500)return'後手有利';if(score<-160)return'やや後手';return'互角'}
  if(score>500)return'後手有利';if(score>160)return'やや後手';if(score<-500)return'先手有利';if(score<-160)return'やや先手';return'互角';
};

newGame=function(){
  const sel=document.getElementById('sideSelect');
  sideMode=sel&&['sente','gote','random'].includes(sel.value)?sel.value:'sente';
  userActualGote=sideMode==='gote'||(sideMode==='random'&&Math.random()<0.5);
  st=initial();hist=[];sel=null;drop=null;thinking=false;gameCounted=false;lastHumanBefore=null;lastHumanMove=null;lastSpeech='';speechMood='start';
  if(userActualGote)st.t=G;
  repHistory=[repEntry(st)];
  clearResult();resetTeacher();resetReview();
  const actual=document.getElementById('sideActual');if(actual)actual.textContent='今回：'+(userActualGote?'後手':'先手');
  setStatus(userActualGote?('あなたは後手です。'+C[ci][0]+'が先手で考えています…'):'あなたは先手です。駒をタップしてください。');
  render();renderOpponent(true);
  if(userActualGote)setTimeout(()=>aiMove(),160);
};

const _undoSide2156=undo;
undo=function(){
  _undoSide2156();
  if(userActualGote&&!gameCounted&&st.t===G&&!thinking){setStatus(C[ci][0]+'が考えています…');setTimeout(()=>aiMove(),120)}
};

document.getElementById('newBtn').onclick=newGame;
document.getElementById('undoBtn').onclick=undo;
document.getElementById('fundoBtn').onclick=undo;

window.AIShogiIOS={...window.AIShogiIOS,
  side:()=>({mode:sideMode,actual:userActualGote?'gote':'sente'}),
  setSide:(mode)=>{if(!['sente','gote','random'].includes(mode))return false;sideMode=mode;const s=document.getElementById('sideSelect');if(s)s.value=mode;return true}
};
