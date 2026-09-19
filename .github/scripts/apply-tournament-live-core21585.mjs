import fs from 'node:fs';
const file='shogi-v21528/tournament21541.js';
let s=fs.readFileSync(file,'utf8');
const cups=`  const CUPS=[
    {id:'kenshiro',name:'ケンシロウ杯',boss:'ケンシロウ',bossRating:2100,min:0,max:2149,label:'中級'},
    {id:'souther',name:'サウザー杯',boss:'サウザー',bossRating:2180,min:2150,max:2219,label:'中上級'},
    {id:'raoh',name:'ラオウ杯',boss:'ラオウ',bossRating:2250,min:2220,max:2349,label:'上級'},
    {id:'kaworu',name:'カヲル杯',boss:'カヲル',bossRating:2400,min:2350,max:2449,label:'上級+'},
    {id:'mama',name:'まま杯',boss:'まま',bossRating:2500,min:2450,max:2549,label:'中上級'},
    {id:'onimama',name:'おにまま杯',boss:'おにまま',bossRating:2600,min:2550,max:2649,label:'上級'},
    {id:'akiou',name:'あき王杯',boss:'あき王',bossRating:2700,min:2650,max:2799,label:'超上級'},
    {id:'micchan',name:'みっちゃん杯',boss:'みっちゃん',bossRating:2850,min:2800,max:2949,label:'最上級'},
    {id:'mitsuki',name:'みつき杯',boss:'みつき',bossRating:3000,min:2950,max:3199,label:'最高峰'},
    {id:'future',name:'未来みつき杯',boss:'未来からやってきたみつき',bossRating:3400,min:3200,max:9999,label:'究極'}
  ];`;
s=s.replace(/  const CUPS=\[[\s\S]*?\n  \];/,cups);
s=s.replace(/  function validCup\(c\)\{[^\n]*\}/,"  function validCup(c){return !!(c&&charIndex(c.boss)>=0&&chars().filter(x=>x.name!==c.boss&&Number(x.rating)<c.bossRating).length>=15)}");
s=s.replace(/  function buildEntrants\(cup,seed\)\{[\s\S]*?\n  \}/,`  function buildEntrants(cup,seed){
    const eligible=chars().filter(ch=>ch.name!==cup.boss&&Number(ch.rating)<cup.bossRating);
    const chosen=seededShuffle(eligible.map(ch=>ch.name),seed+'|field').slice(0,15);
    if(chosen.length<15)throw Error('boss-under field incomplete '+cup.id+' '+chosen.length);
    return seededShuffle([PLAYER,...chosen],seed+'|bracket');
  }`);
s=s.replace(/    if\(a===cup\.boss\|\|b===cup\.boss\)return cup\.boss;\n/,'');
s=s.replace("    store.active={cupId:cup.id,round:0,playerSlot:0,status:'active',pending:null,matchToken:1,processedToken:0,startedAt,ratingAtStart:rating,bracket:buildBracket(cup,seed),news:[]};",`    const bracket=buildBracket(cup,seed),playerSlot=bracket.rounds[0].indexOf(PLAYER);
    store.active={cupId:cup.id,round:0,playerSlot,status:'active',pending:null,matchToken:1,processedToken:0,startedAt,ratingAtStart:rating,bracket,news:[]};`);
s=s.replace(/他のAI同士もあなたと同じ回戦をリアルタイム進行し、勝者は最初から決まっていません。/g,'出場AI15人は全員ボス未満のRから毎大会ランダム選出・配置。AI同士も同じ回戦をリアルタイム進行し、ボスは優勝後の別5戦目です。');
s=s.replace("version:'21541a'","version:'21585'");
fs.writeFileSync(file,s);
console.log('PASS_TOURNAMENT21585_LIVE_CORE_TEN_CUPS');
