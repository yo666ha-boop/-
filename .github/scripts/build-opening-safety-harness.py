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
  const base=await futureRaw(page,state,{multiPV:ply<24?3:1});
  if(ply>=24||base.resign||base.declareWin||!base.token)return base;
  const rows=(base.info?.candidates||[]).filter(x=>x&&x.token).slice(0,3);
  const tokens=[];
  for(const r of rows)if(!tokens.includes(r.token))tokens.push(r.token);
  if(!tokens.includes(base.token))tokens.unshift(base.token);
  const tested=[];
  for(const token of tokens.slice(0,3)){
    let reply=null,score=-999999;
    try{
      const after=applyMove(state,tokenToMove(token),'safety-candidate');
      reply=await futureRaw(page,after,{ms:2400,multiPV:1});
      const mate=reply.info?.mate,cp=reply.info?.cp;
      if(mate!==undefined&&mate!==null&&Number.isFinite(Number(mate)))score=Number(mate)>0?-100000+Number(mate):100000+Number(mate);
      else if(cp!==undefined&&cp!==null&&Number.isFinite(Number(cp)))score=-Number(cp);
    }catch(e){score=-999999}
    tested.push({token,score,reply:reply?.token||'',replyCp:reply?.info?.cp??null,replyMate:reply?.info?.mate??null});
  }
  tested.sort((a,b)=>b.score-a.score);
  const pick=tested[0]&&tested[0].score>-999999?tested[0]:{token:base.token,score:null};
  console.log('OPENING_SAFETY',JSON.stringify({ply,base:base.token,pick:pick.token,tested}));
  return{...base,token:pick.token,info:{...(base.info||{}),openingSafety:true,safetyBase:base.token,safetyPick:pick.token,safetyScore:pick.score,safetyTested:tested}};
}
'''
s = s.replace(marker, '\n' + wrapper + marker, 1)
p.write_text(s)
