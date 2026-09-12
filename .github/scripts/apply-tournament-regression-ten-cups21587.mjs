import fs from 'node:fs';
const files=['.github/scripts/verify-tournament-all-boss-terminal-fullapp21547.mjs'];
for(const file of files){
  let s=fs.readFileSync(file,'utf8');
  s=s.replace(/cups\?\.\(\)\.length===8/g,'cups?.().length===10');
  s=s.replace(/cups\(\)\.length===8/g,'cups().length===10');
  s=s.replace(/id==='shinji'/g,"id==='kenshiro'");
  s=s.replace(/start\('shinji'\)/g,"start('kenshiro')");
  s=s.replace(/rows\.length!==40/g,'rows.length!==50');
  fs.writeFileSync(file,s);
}
console.log('PASS_TOURNAMENT21587_TEN_CUP_REGRESSION_MIGRATION');
