(function(){
const CHAR_BOOK=['master','quick','kakugawari','yagura','gangi','kakugawari','yagura','aigakari','bougin','kakugawari','shiken','yokofu','quick','sangen','nakabisha','gokigen','mukaibisha','gangi','rikisen','ibisha_anaguma','yagura','master','offbeat','furiana','master'];
const BOOK_LABEL={master:'万能・局面対応',quick:'急戦・早繰り銀',kakugawari:'角換わり',yagura:'矢倉',gangi:'雁木',aigakari:'相掛かり',bougin:'棒銀・右四間',shiken:'四間飛車',yokofu:'横歩取り',sangen:'三間飛車・石田流',nakabisha:'中飛車',gokigen:'ゴキゲン中飛車',mukaibisha:'向かい飛車',rikisen:'力戦',ibisha_anaguma:'居飛車穴熊',offbeat:'奇襲・自由型',furiana:'振り飛車穴熊'};
const BOOK_PLAN={
master:[['3c3d','8c8d','5c5d'],['8c8d','4a3b','7a6b'],['4a3b','7a6b','5a4b'],['5a4b','8d8e','6a5b']],
quick:[['3c3d'],['7a6b','8c8d'],['6b5c','8c8d'],['8c8d','5a4b']],
kakugawari:[['3c3d'],['2b8h+','8c8d'],['8c8d','4a3b'],['7a6b','5a4b']],
yagura:[['3c3d'],['4a3b','6a5b'],['5a4b','7a6b'],['7a6b','6a5b']],
gangi:[['3c3d'],['4a3b'],['7a6b','6a5b'],['5a4b','6b5c']],
aigakari:[['8c8d'],['8d8e','3c3d'],['3c3d','7a7b'],['7a7b','4a3b']],
bougin:[['8c8d'],['7a7b','3c3d'],['7b8c','3c3d'],['8c7d','4a3b']],
shiken:[['3c3d'],['4c4d'],['8b4b'],['5a6b','7a6b']],
yokofu:[['3c3d'],['8c8d'],['8d8e','4a3b'],['8b8d','7a6b']],
sangen:[['3c3d'],['8b3b'],['4c4d','7a6b'],['5a6b','3b4b']],
nakabisha:[['5c5d'],['8b5b'],['3c3d'],['5a6b','7a6b']],
gokigen:[['5c5d'],['8b5b'],['3c3d'],['5a6b','4c4d']],
mukaibisha:[['3c3d'],['2b8h+','8c8d'],['8b2b','4c4d'],['5a6b','7a6b']],
rikisen:[['3c3d','8c8d','5c5d'],['4a3b','7a6b','8d8e'],['5a4b','6a5b'],['7a6b','4c4d']],
ibisha_anaguma:[['3c3d'],['8c8d'],['4a3b'],['5a4b','7a6b']],
offbeat:[['5c5d','1c1d','9c9d'],['8b5b','3c3d','8c8d'],['1c1d','9c9d','4a3b'],['7a6b','5a6b']],
furiana:[['3c3d'],['4c4d'],['8b4b'],['5a6b','4b3b']]
};
const openingLabel=i=>BOOK_LABEL[CHAR_BOOK[i]||'master']||'万能';
const levelText=i=>i<5?rankText(i):(C[i][1]>=2300?'最上級':C[i][1]>=2100?'上級':C[i][1]>=1850?'中上級':C[i][1]>=1600?'中級':C[i][1]>=1400?'初中級':'入門〜初級');
function bookCandidatesV294(s,idx,lm){
  if(incheck(s,s.t)||s.log.length>=9)return[];
  let ownPly=Math.floor(s.log.length/2),kind=CHAR_BOOK[idx]||'master',plan=BOOK_PLAN[kind]||BOOK_PLAN.master,cands=(plan[ownPly]||[]).slice();
  if(kind==='master'&&ownPly===0&&s.last){let u=usi(s.last);if(u==='2g2f')cands=['8c8d','3c3d'];else if(u==='5g5f')cands=['5c5d','3c3d'];else if(u==='7g7f')cands=['3c3d','8c8d'];}
  let out=[];for(let u of cands){let m=lm.find(x=>usi(x)===u);if(m)out.push(m)}return out;
}
let ttHitsV294=0,searchTTV294=new Map(),killersV294=[],historyV294=new Map();const TT_MAX_V294=60000;
moveScore=function(s,m){let sc=0,q=s.b[m.to];if(q)sc+=10000+VAL[q.k]-(m.f!=null&&s.b[m.f]?VAL[s.b[m.f].k]/10:0);if(m.prom)sc+=1800;if(m.drop)sc+=30;if(m.f!=null){let p=s.b[m.f];if(p&&(p.k==='R'||p.k==='B'||p.k==='+R'||p.k==='+B'))sc+=30}return sc};
function orderValueV294(s,m,ply=0,ttBest=null){let u=usi(m),v=moveScore(s,m);if(ttBest===u)v+=1000000;if(killersV294[ply]?.includes(u))v+=4500;v+=(historyV294.get(s.t+':'+u)||0);return v}
ordered=function(s,lm,ply=0,ttBest=null){return lm.slice().sort((a,b)=>orderValueV294(s,b,ply,ttBest)-orderValueV294(s,a,ply,ttBest))};
function ttPutV294(k,e){if(searchTTV294.size>=TT_MAX_V294){let n=0;for(let x of searchTTV294.keys()){searchTTV294.delete(x);if(++n>=3000)break}}searchTTV294.set(k,e)}
let activeSearchV214={top:false,qMax:0,qCheckLayers:0,matePly:1,mateMs:0};
function givesCheckV214(s,m){let n=apply(s,m);return incheck(n,n.t)}
function phaseV214(s){let z=0;for(let p of s.b)if(p&&p.k!=='K')z+=VAL[p.k];return z}
qsearch=function(s,a,b,ply,qlim,sty){
  qnodes++;if((qnodes&127)===0&&performance.now()>deadline)throw 'TIME';
  let lm=legal(s);if(!lm.length)return incheck(s,s.t)?-999999+ply:0;
  let chk=incheck(s,s.t),stand=evals(s,s.t,sty);
  if(!chk){if(stand>=b)return b;if(stand>a)a=stand;if(qlim<=0)return a}
  let tactical=chk?lm:lm.filter(m=>s.b[m.to]||m.prom);
  if(!chk&&activeSearchV214.top&&activeSearchV214.qCheckLayers>0&&qlim===activeSearchV214.qMax&&phaseV214(s)<4200){
    let seen=new Set(tactical.map(usi)),checks=[];
    for(let m of lm){let u=usi(m);if(!seen.has(u)&&givesCheckV214(s,m))checks.push(m)}
    checks=ordered(s,checks,ply).slice(0,4);tactical.push(...checks)
  }
  if(!tactical.length)return a;
  tactical=ordered(s,tactical,ply).slice(0,chk?(activeSearchV214.top?32:24):(activeSearchV214.top?18:14));
  for(let m of tactical){let v=-qsearch(apply(s,m),-b,-a,ply+1,qlim-1,sty);if(v>=b)return b;if(v>a)a=v}
  return a
};
function quietMoveV214(s,m){return !m.drop&&!m.prom&&!s.b[m.to]}
nsearch=function(s,d,a,b,ply,qlim,sty){
  nodes++;if((nodes&127)===0&&performance.now()>deadline)throw 'TIME';
  if(d<=0)return qsearch(s,a,b,ply,qlim,sty);
  let key=posKey(s),oa=a,ob=b,e=searchTTV294.get(key),ttBest=null;
  if(e&&e.depth>=d){ttHitsV294++;ttBest=e.best||null;if(e.flag==='E')return e.val;if(e.flag==='L')a=Math.max(a,e.val);else if(e.flag==='U')b=Math.min(b,e.val);if(a>=b)return e.val}else if(e)ttBest=e.best||null;
  let lm=legal(s);if(!lm.length)return incheck(s,s.t)?-999999+ply:0;
  let checked=incheck(s,s.t);lm=ordered(s,lm,ply,ttBest);let best=-1e9,bm=null;
  for(let i=0;i<lm.length;i++){
    let m=lm[i],child=apply(s,m),v,newDepth=d-1;
    if(i===0){v=-nsearch(child,newDepth,-b,-a,ply+1,qlim,sty)}
    else{
      let reduction=(activeSearchV214.top&&!checked&&d>=4&&i>=5&&quietMoveV214(s,m))?1:0;
      let rd=Math.max(0,newDepth-reduction);
      v=-nsearch(child,rd,-a-1,-a,ply+1,qlim,sty);
      if(reduction&&v>a&&performance.now()<=deadline)v=-nsearch(child,newDepth,-a-1,-a,ply+1,qlim,sty);
      if(v>a&&v<b&&performance.now()<=deadline)v=-nsearch(child,newDepth,-b,-a,ply+1,qlim,sty)
    }
    if(v>best){best=v;bm=m}if(v>a)a=v;
    if(a>=b){let u=usi(m);if(!killersV294[ply])killersV294[ply]=[];if(!killersV294[ply].includes(u))killersV294[ply]=[u,...killersV294[ply]].slice(0,2);historyV294.set(s.t+':'+u,(historyV294.get(s.t+':'+u)||0)+d*d*8);break}
  }
  let flag=best<=oa?'U':best>=ob?'L':'E';ttPutV294(key,{depth:d,val:best,flag,best:bm?usi(bm):null});return best
};
findMate1=function(s){for(let m of ordered(s,legal(s))){let n=apply(s,m);if(incheck(n,n.t)&&legal(n).length===0)return m}return null};
aiSettings=function(r,who=ci){
  let mobile=/iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent);
  if(who===0)return{maxDepth:12,think:mobile?4500:7200,q:8,matePly:7,mateMs:mobile?700:1100,qCheckLayers:3};
  if(who===1)return{maxDepth:11,think:mobile?3900:6200,q:8,matePly:7,mateMs:mobile?620:950,qCheckLayers:3};
  if(who===2)return{maxDepth:11,think:mobile?3400:5500,q:7,matePly:5,mateMs:mobile?520:820,qCheckLayers:2};
  if(who===3)return{maxDepth:10,think:mobile?3000:4800,q:7,matePly:5,mateMs:mobile?460:720,qCheckLayers:2};
  if(who===4)return{maxDepth:10,think:mobile?2600:4200,q:6,matePly:5,mateMs:mobile?400:650,qCheckLayers:2};
  let d,t,q;if(r<1350){d=2;t=90;q=1}else if(r<1550){d=3;t=160;q=2}else if(r<1750){d=4;t=250;q=2}else if(r<1950){d=5;t=390;q=3}else if(r<2150){d=6;t=600;q=3}else if(r<2300){d=6;t=650;q=4}else{d=7;t=mobile?700:1050;q=4}
  return{maxDepth:d,think:t,q,matePly:1,mateMs:0,qCheckLayers:0}
};
function findMateNV214(s,maxPly,ms){
  if(maxPly<=1)return findMate1(s);
  let stop=performance.now()+Math.max(20,ms||0),seen=new Map(),mateNodes=0;
  function attack(p,rem){
    if(performance.now()>stop||++mateNodes>26000)throw 'MATE_TIME';
    let key=posKey(p)+'|'+rem,hit=seen.get(key);if(hit!==undefined)return hit;
    let lm=ordered(p,legal(p));
    for(let m of lm){
      let n=apply(p,m);if(!incheck(n,n.t))continue;
      let replies=legal(n);
      if(!replies.length){seen.set(key,m);return m}
      if(rem>=3){let forced=true;for(let r of replies){let a=apply(n,r);if(!attack(a,rem-2)){forced=false;break}}if(forced){seen.set(key,m);return m}}
    }
    seen.set(key,null);return null
  }
  try{return attack(s,maxPly)}catch(e){return null}
}
function weakChoiceV294(scored,r,idx){if(!scored.length)return{item:null,rank:1,loss:0};if(idx<5||r>=1950)return{item:scored[0],rank:1,loss:0};let n=r<1400?4:r<1600?3:r<1800?2:2,tol=r<1400?420:r<1600?300:r<1800?190:110,pool=scored.slice(0,n).filter(x=>scored[0].v-x.v<=tol);if(pool.length<2)return{item:scored[0],rank:1,loss:0};let roll=Math.random(),pick=roll<.62?0:Math.min(pool.length-1,1+Math.floor(Math.random()*(pool.length-1))),item=pool[pick];return{item,rank:scored.indexOf(item)+1,loss:Math.max(0,Math.round(scored[0].v-item.v))}}
function repeatPenaltyV213(s,m){let n=apply(s,m),k=posKey(n),count=0,last=-999;for(let i=0;i<repHistory.length;i++){if(repHistory[i].key===k){count++;last=i}}let dist=last<0?999:repHistory.length-last;if(count>=3)return 900000;if(count===2)return 12000;if(count===1&&dist<=12)return 2800;if(count===1)return 900;return 0}
chooseAI=function(s,idx=ci,budgetOverride=null){
  let start=performance.now(),r=C[idx][1],cfg=aiSettings(r,idx),sty=STYLE[idx],lm=legal(s);
  if(!lm.length)return{move:null,info:{depth:0,nodes:0,qnodes:0,ms:0,score:incheck(s,s.t)?-999999:0,ttHits:0,choiceRank:1}};
  activeSearchV214={top:idx<5,qMax:cfg.q||0,qCheckLayers:cfg.qCheckLayers||0,matePly:cfg.matePly||1,mateMs:cfg.mateMs||0};
  let mate=(idx<5&&cfg.matePly>1)?findMateNV214(s,cfg.matePly,cfg.mateMs):findMate1(s);
  if(mate)return{move:mate,info:{depth:1,nodes:1,qnodes:0,ms:Math.round(performance.now()-start),mate1:cfg.matePly<=1,matePly:cfg.matePly,score:999999,ttHits:0,choiceRank:1,forcingMate:true}};
  let bm=bookCandidatesV294(s,idx,lm);if(bm.length){let pick=bm[0];return{move:pick,info:{depth:0,nodes:0,qnodes:0,ms:Math.round(performance.now()-start),book:true,bookName:openingLabel(idx),score:Math.round(evals(apply(s,pick),s.t,sty)),ttHits:0,choiceRank:1}}}
  deadline=start+(budgetOverride??cfg.think);nodes=0;qnodes=0;ttHitsV294=0;searchTTV294=new Map();killersV294=[];historyV294=new Map();
  let best=ordered(s,lm)[0],done=0,root=ordered(s,lm),bestScore=Math.round(evals(s,s.t,sty)),lastScored=[];
  for(let depth=1;depth<=cfg.maxDepth;depth++){
    try{let scored=[],alpha=-1e9;for(let j=0;j<root.length;j++){let m=root[j];if(performance.now()>deadline)throw 'TIME';let v;if(j===0)v=-nsearch(apply(s,m),depth-1,-1e9,1e9,1,cfg.q,sty);else{v=-nsearch(apply(s,m),depth-1,-alpha-1,-alpha,1,cfg.q,sty);if(v>alpha&&performance.now()<=deadline)v=-nsearch(apply(s,m),depth-1,-1e9,-alpha,1,cfg.q,sty)}v-=repeatPenaltyV213(s,m);scored.push({m,v});if(v>alpha)alpha=v}scored.sort((a,b)=>b.v-a.v);if(scored.length){lastScored=scored;best=scored[0].m;bestScore=scored[0].v;root=scored.map(x=>x.m);done=depth}}catch(e){break}
  }
  let ch=weakChoiceV294(lastScored,r,idx);if(ch.item){best=ch.item.m;bestScore=ch.item.v}
  return{move:best,info:{depth:done,nodes,qnodes,ms:Math.round(performance.now()-start),mate1:false,matePly:0,score:Math.round(bestScore),ttHits:ttHitsV294,choiceRank:ch.rank||1,choiceLoss:ch.loss||0,pvs:true,strongTop5:idx<5}}
};
aiMove=function(){
  if(st.t!=G||thinking||gameCounted)return;if(finishIfEnded())return;thinking=true;if(ci<5)showSpeech('think',true);setStatus(C[ci][0]+'が考えています…');const startKey=posKey(st),startCi=ci;
  setTimeout(()=>{if(posKey(st)!==startKey||ci!==startCi){thinking=false;return}let res=chooseAI(st,startCi),best=res.move;lastAIInfo=res.info||{};if(best)push(best,'△');thinking=false;speechMood='auto';lastSpeech='';render();renderOpponent(true);if(finishIfEnded())return;let x=lastAIInfo;setStatus('あなたの手番です。'+(x.book?' 定跡（'+(x.bookName||openingLabel(ci))+'）':x.forcingMate?(' '+(x.matePly||1)+'手以内の強制詰み読了'):x.mate1?' 1手詰め':' 探索深さ'+(x.depth||0)+'＋戦術延長'+aiSettings(C[ci][1],ci).q+' / '+(((x.nodes||0)+(x.qnodes||0)).toLocaleString())+'局面 / '+(x.ms||0)+'ms'))},100)
};
window.AI_SHOGI_ENGINE={base:'v2.15.1-top5-max-strength',top5MaxStrength:true,forcingMateSearch:true,internalPVS:true,top5LMR:true,restored:'2.15.5'};window.AI_SHOGI_BUILD='2.15.5-strong-ai-restored';
try{document.title='AI将棋先生 v2.15.5 強AI復帰版';let b=document.querySelector('.badge');if(b)b.textContent='v2.15.5 強AI復帰版'}catch(e){}
})();
