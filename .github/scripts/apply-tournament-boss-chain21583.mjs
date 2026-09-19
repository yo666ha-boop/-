import fs from 'node:fs';
const file='shogi-v21528/tournament-boss21546.js';
let s=fs.readFileSync(file,'utf8');
const cups=`  const CUPS={
    kenshiro:{id:'kenshiro',name:'ケンシロウ杯',boss:'ケンシロウ',bossRating:2100},
    souther:{id:'souther',name:'サウザー杯',boss:'サウザー',bossRating:2180},
    raoh:{id:'raoh',name:'ラオウ杯',boss:'ラオウ',bossRating:2250},
    kaworu:{id:'kaworu',name:'カヲル杯',boss:'カヲル',bossRating:2400},
    mama:{id:'mama',name:'まま杯',boss:'まま',bossRating:2500},
    onimama:{id:'onimama',name:'おにまま杯',boss:'おにまま',bossRating:2600},
    akiou:{id:'akiou',name:'あき王杯',boss:'あき王',bossRating:2700},
    micchan:{id:'micchan',name:'みっちゃん杯',boss:'みっちゃん',bossRating:2850},
    mitsuki:{id:'mitsuki',name:'みつき杯',boss:'みつき',bossRating:3000},
    future:{id:'future',name:'未来みつき杯',boss:'未来からやってきたみつき',bossRating:3400}
  };`;
s=s.replace(/  const CUPS=\{[\s\S]*?\n  \};/,cups);
s=s.replace(/  function rewriteTournament\(id,baselineTrophy\)\{[\s\S]*?\n  \}\n\n  function promoteTournamentChampion/,`  function rewriteTournament(id,baselineTrophy){
    const t=window.AI_SHOGI_TOURNAMENT,store=read(),a=store?.active,cup=CUPS[id];
    if(!t||!a||!cup)return false;
    const r0=a?.bracket?.rounds?.[0]||[];
    const ai=r0.filter(x=>x&&x!==PLAYER);
    if(r0.length!==16||ai.length!==15||r0.includes(cup.boss)){
      console.error('tournament boss21546 field invalid',id,r0);return false;
    }
    const all=chars();
    const invalid=ai.filter(name=>{const ch=all.find(c=>c?.name===name);return !ch||Number(ch.rating)>=cup.bossRating});
    if(invalid.length){console.error('tournament boss21546 boss-under violation',id,invalid);return false}
    a.bossChallenge={version:2,boss:cup.boss,bossRating:cup.bossRating,status:'locked',baselineTrophy:Number(baselineTrophy)||0,attempt:0,processedAttempt:0};
    a.news=Array.isArray(a.news)?a.news:[];addNews(a,cup.name+' 開幕。16人トーナメント優勝後に '+cup.boss+' への挑戦権を獲得できます。','start');
    if(Array.isArray(store.history)&&store.history[0]&&store.history[0].cupId===id){store.history[0].format='16-player-then-boss';store.history[0].bossSeparate=true}
    write(store);renderAndDecorate();return true;
  }

  function promoteTournamentChampion`);
s=s.replace("version:'21546a'","version:'21583'");
fs.writeFileSync(file,s);
console.log('PASS_TOURNAMENT21583_SEPARATE_BOSS_CHAIN');
