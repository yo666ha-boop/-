import fs from 'node:fs';

const visual=fs.readFileSync('shogi-v21528/tournament-visual21590.js','utf8');
const loader=fs.readFileSync('shogi-v21528/rating-progress21536.js','utf8');
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};

need(loader.includes("./tournament-visual21590.js?v=21590a"),'21590 visual loader missing');
need(visual.includes("version:'21590a'"),'visual audit version missing');
need(visual.includes('.tourBracketSlot.tourAdvanced'),'winner/advance visual missing');
need(visual.includes('tourVisualAdvance21590'),'advance animation marker missing');
need(visual.includes('FINAL BOSS · トーナメント優勝後'),'boss gate visual missing');
need(visual.includes('prefers-reduced-motion:reduce'),'reduced-motion support missing');
need(visual.includes('#tournament21540Panel.tourFireFit'),'Fire fit override missing');
need(visual.includes("querySelector('.tourAvatar img')"),'portrait audit missing');
need(!/AIShogiIOS\.(?:select|stats|characters)\s*=/.test(visual),'visual layer must not mutate core AIShogiIOS API');
need(!/localStorage\.setItem/.test(visual),'visual layer must not mutate tournament/save state');

console.log('PASS_TOURNAMENT21590_IMAGE_VISUAL_STATIC',JSON.stringify({
  loader:true,
  imageCards:true,
  advanceMotion:true,
  bossGate:true,
  reducedMotion:true,
  fireFit:true,
  stateWrites:0
}));
