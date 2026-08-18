from pathlib import Path

p = Path('/tmp/future-deep-budget.js')
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
  const ms=ply<24?20000:(ply>=55?18000:15000);
  const out=await futureRaw(page,state,{ms,multiPV:1});
  console.log('DEEP_BUDGET',JSON.stringify({ply,ms,token:out?.token||'',depth:out?.info?.depth||0,nodes:out?.info?.nodes||0,cp:out?.info?.cp??null,mate:out?.info?.mate??null}));
  return out;
}
'''
s = s.replace(marker, '\n' + wrapper + marker, 1)
p.write_text(s)
