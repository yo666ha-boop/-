import fs from 'node:fs';

const logPath=process.argv[2]||'/tmp/all26.log';
const text=fs.readFileSync(logPath,'utf8');
const line=text.split(/\r?\n/).find(x=>x.startsWith('ALL26_HIERARCHY_SUMMARY '));
if(!line)throw new Error('ALL26_HIERARCHY_SUMMARY not found in '+logPath);
const summary=JSON.parse(line.slice('ALL26_HIERARCHY_SUMMARY '.length));
const order=['future','top5','7-12','13-18','19-26'];
const groups=new Map((summary.groups||[]).map(g=>[g.group,g]));
for(const name of order)if(!groups.has(name))throw new Error('missing group '+name);

const loss=Object.fromEntries(order.map(name=>[name,Number(groups.get(name).meanInternalLoss)]));
for(const name of order)if(!Number.isFinite(loss[name]))throw new Error('bad meanInternalLoss '+name+' '+loss[name]);

// Displayed rating bands must also be measurably separated by how much engine
// evaluation loss their character profiles intentionally permit/choose.
// Forced mates and obvious tactical moves may be identical for every band, so
// this gate uses the already-recorded mean internal cp loss rather than merely
// counting exact-best moves.
const minGap=[
  ['future','top5',1],
  ['top5','7-12',4],
  ['7-12','13-18',8],
  ['13-18','19-26',10],
];
const fail=[];
for(const [upper,lower,gap] of minGap){
  const actual=loss[lower]-loss[upper];
  if(actual<gap)fail.push(`${upper}->${lower} loss gap ${actual}<${gap} (${loss[upper]}->${loss[lower]})`);
}

const by=Array.isArray(summary.by)?summary.by:[];
for(const row of by){
  const maxLoss=Number(String(row.profile||'').match(/R\d+/)?Infinity:Infinity);
  if(!Number.isFinite(Number(row.meanInternalLoss)))fail.push('bad individual loss '+row.name);
  if(Number(row.mateExact)!==1)fail.push('mate regression '+row.name);
}

console.log('RATING_LOSS_HIERARCHY '+JSON.stringify({loss,minGap,fail}));
if(fail.length)throw new Error(fail.join(' | '));
console.log('PASS_RATING_LOSS_HIERARCHY');
