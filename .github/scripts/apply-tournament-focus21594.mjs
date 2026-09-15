import fs from 'node:fs';

const coreFile='shogi-v21528/tournament21541.js';
let core=fs.readFileSync(coreFile,'utf8');

function replaceOnce(src,from,to,label){
  if(src.includes(to))return src;
  if(!src.includes(from))throw new Error('21594 missing anchor: '+label);
  return src.replace(from,to);
}

core=replaceOnce(core,
`    body.innerHTML='<div class="tourLead">あなたは <b>R'+rating+'</b>。現在のおすすめは <span class="tourRecommended">'+esc(rec.name)+'</span>。出場AI15人は全員ボス未満のRから毎大会ランダム選出・配置。AI同士も同じ回戦をリアルタイム進行し、ボスは優勝後の別5戦目です。</div>'+renderActive(store)+'<div class="tourGrid">'+cards+'</div>';`,
`    const activeCup=store.active?cupById(store.active.cupId):null;
    const selection='<div class="tourLead">あなたは <b>R'+rating+'</b>。現在のおすすめは <span class="tourRecommended">'+esc(rec.name)+'</span>。出場AI15人は全員ボス未満のRから毎大会ランダム選出・配置。AI同士も同じ回戦をリアルタイム進行し、ボスは優勝後の別5戦目です。</div><div class="tourGrid">'+cards+'</div>';
    const focus=activeCup?'<div class="tourLead tourFocusLead"><b>'+esc(activeCup.name)+'</b> を進行中。杯選択は大会を終えるまで隠し、トーナメント表に集中して表示します。</div>'+renderActive(store):selection;
    body.innerHTML=focus;`,
'active cup focus rendering');

core=replaceOnce(core,`version:'21592'`,`version:'21594'`,'version marker');

fs.writeFileSync(coreFile,core);
console.log('PASS_APPLY_TOURNAMENT21594_ACTIVE_CUP_FOCUS');
