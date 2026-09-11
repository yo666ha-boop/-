import fs from 'node:fs';
const files=['shogi-v21528/tournament21540.js','preview/tournament-16/index21542b.html'];
const cups=`const CUPS=[\n    {id:'mama',name:'まま杯',boss:'まま',bossRating:2500,min:0,max:2549,label:'中上級'},\n    {id:'onimama',name:'おにまま杯',boss:'おにまま',bossRating:2600,min:2550,max:2649,label:'上級'},\n    {id:'akiou',name:'あき王杯',boss:'あき王',bossRating:2700,min:2650,max:2799,label:'超上級'},\n    {id:'micchan',name:'みっちゃん杯',boss:'みっちゃん',bossRating:2850,min:2800,max:2949,label:'最上級'},\n    {id:'mitsuki',name:'みつき杯',boss:'みつき',bossRating:3000,min:2950,max:3199,label:'最高峰'},\n    {id:'future',name:'未来みつき杯',boss:'未来からやってきたみつき',bossRating:3400,min:3200,max:9999,label:'究極'}\n  ];`;
for(const file of files){
 let s=fs.readFileSync(file,'utf8');
 s=s.replace(/const CUPS=\[[\s\S]*?\n  \];/,cups);
 s=s.replace(/function validCup\(c\)\{[^\n]*\}/,`function validCup(c){return !!(c&&charIndex(c.boss)>=0&&chars().filter(x=>x.name!==c.boss&&Number(x.rating)<c.bossRating).length>=15)}`);
 s=s.replace(/function buildEntrants\(cup,seed\)\{[\s\S]*?\n  \}/,`function buildEntrants(cup,seed){\n    const eligible=chars().filter(ch=>ch.name!==cup.boss&&Number(ch.rating)<cup.bossRating);\n    const chosen=seededShuffle(eligible.map(ch=>ch.name),seed+'|field').slice(0,15);\n    if(chosen.length<15)throw Error('boss-under field incomplete '+cup.id+' '+chosen.length);\n    return seededShuffle([PLAYER,...chosen],seed+'|bracket');\n  }`);
 s=s.replace(/if\(a===cup\.boss\|\|b===cup\.boss\)return cup\.boss;\n/g,'');
 s=s.replace(/store\.active=\{cupId:cup\.id,round:0,playerSlot:0,status:'active'/,`const entrants=buildEntrants(cup,seed),playerSlot=entrants.indexOf(PLAYER);\n    store.active={cupId:cup.id,round:0,playerSlot,status:'active'`);
 s=s.replace(/bracket:buildBracket\(cup,seed\)/,`bracket:{seed,rounds:[entrants,Array(8).fill(null),Array(4).fill(null),Array(2).fill(null),Array(1).fill(null)],results:{}}`);
 s=s.replace(/杯名のキャラは反対側の第1シードで、決勝のてっぺんに待っています。/g,'出場AI15人は全員ボス未満のRから選ばれ、毎大会シャッフルされます。ボスはブラケット外で優勝後に待っています。');
 s=s.replace(/決勝ボス/g,'優勝後ボス');
 fs.writeFileSync(file,s);
}
console.log('PASS_TOURNAMENT21582_BOSS_UNDER_RANDOM_FIELD_MIGRATION');
