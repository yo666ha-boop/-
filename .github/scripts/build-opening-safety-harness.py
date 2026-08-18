from pathlib import Path

p = Path('/tmp/future-opening-safety.js')
s = p.read_text()
s = s.replace('const MAX_PLIES=12;', 'const MAX_PLIES=120;', 1)
old = 'async function futureBest(page,state,opts={}){'
if old not in s:
    raise SystemExit('futureBest marker missing')
s = s.replace(old, 'async function futureRaw(page,state,opts={}){', 1)
marker = '\nasync function startPiyoLv40(page){'
if marker not in s:
    raise SystemExit('startPiyo marker missing')
wrapper = r'''
async function futureBest(page,state,opts={}){
  if(opts&&Number.isFinite(Number(opts.ms)))return futureRaw(page,state,opts);
  const ply=(state.log||[]).length;
  // Preserve the real Future Mitsuki move: full opening budget, MultiPV=1.
  const base=await futureRaw(page,state,{multiPV:1});
  if(ply>=24||base.resign||base.declareWin||!base.token)return base;

  // A separate shorter search is used only to discover alternatives.
  let alt=null;
  try{alt=await futureRaw(page,state,{ms:6000,multiPV:3});}catch(e){}
  const tokens=[base.token];
  for(const r of (alt?.info?.candidates||[])){
    if(r&&r.token&&!tokens.includes(r.token))tokens.push(r.token);
    if(tokens.length>=3)break;
  }

  // Check the opponent's best reply to each candidate. These shallow scores are
  // noisy, so never replace the full-budget base move on a small difference.
  const tested=[];
  for(const token of tokens){
    let reply=null,score=-999999;
    try{
      const after=applyMove(state,tokenToMove(token),'safety-candidate');
      reply=await futureRaw(page,after,{ms:3000,multiPV:1});
      const mate=reply.info?.mate,cp=reply.info?.cp;
      if(mate!==undefined&&mate!==null&&Number.isFinite(Number(mate)))score=Number(mate)>0?-100000+Number(mate):100000+Number(mate);
      else if(cp!==undefined&&cp!==null&&Number.isFinite(Number(cp)))score=-Number(cp);
    }catch(e){score=-999999}
    tested.push({token,score,reply:reply?.token||'',replyCp:reply?.info?.cp??null,replyMate:reply?.info?.mate??null});
  }

  const baseRow=tested.find(x=>x.token===base.token);
  let pick=baseRow||{token:base.token,score:-999999};
  const best=[...tested].sort((a,b)=>b.score-a.score)[0];
  const threshold=60;
  if(baseRow&&best&&best.token!==base.token&&best.score>=baseRow.score+threshold)pick=best;
  console.log('OPENING_SAFETY',JSON.stringify({mode:'conservative60',ply,base:base.token,pick:pick.token,threshold,baseScore:baseRow?.score??null,bestScore:best?.score??null,tested}));
  return{...base,token:pick.token,info:{...(base.info||{}),openingSafety:true,safetyMode:'conservative60',safetyBase:base.token,safetyPick:pick.token,safetyScore:pick.score,safetyTested:tested}};
}
'''
s = s.replace(marker, '\n' + wrapper + marker, 1)
p.write_text(s)
