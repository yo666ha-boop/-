import fs from 'node:fs';

const visual=fs.readFileSync('shogi-v21528/tournament-visual21590.js','utf8');
const preview=fs.readFileSync('preview/tournament-16/visual-preview21591.js','utf8');
const loader=fs.readFileSync('shogi-v21528/rating-progress21536.js','utf8');
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};

need(loader.includes("./tournament-visual21590.js?v=21590a"),'21590 visual loader missing');
need(visual.includes("version:'21590a'"),'visual audit version missing');
need(visual.includes('.tourBracketSlot.tourAdvanced'),'winner/advance visual missing');
need(visual.includes('tourVisualAdvance21590'),'advance animation marker missing');
need(visual.includes('tourRoundIntro21590'),'round intro visual missing');
need(visual.includes('TOURNAMENT CHAMPION'),'champion transition title missing');
need(visual.includes('EXTRA MATCH · 👑'),'extra boss match transition missing');
need(visual.includes('tourBossIntro21590'),'boss intro visual missing');
need(visual.includes('tour21590BossGate'),'boss gate entrance animation missing');
need(visual.includes('FINAL BOSS · トーナメント優勝後'),'boss gate visual missing');
need(visual.includes("const KEY='aiShogiTournament21540'"),'tournament visual storage key missing');
need(visual.includes('localStorage.getItem(KEY)'),'attempt scope must read active tournament state');
need(visual.includes("String(a?.cupId||'')+':'+String(a?.startedAt||'')"),'attempt key must use cupId + startedAt');
need(visual.includes("const key=attemptKey()+':'+r+':'+name"),'round intro must be attempt+opponent scoped');
need(visual.includes("const key=attemptKey()+':'+champion+':'+boss"),'boss intro must be attempt scoped');
need(visual.includes('prefers-reduced-motion:reduce'),'reduced-motion support missing');
need(visual.includes('#tournament21540Panel.tourFireFit'),'Fire fit override missing');
need(visual.includes("querySelector('.tourAvatar img')"),'portrait audit missing');

// 21592: the active bracket opponent, not the cup host, owns the in-match dialogue.
need(visual.includes('const OPPONENT_LINES='),'character-specific opponent line bank missing');
need(visual.includes('currentOpponentSlot()'),'current opponent resolver missing');
need(visual.includes('tourOpponentDialogue21592'),'dedicated opponent dialogue card missing');
need(visual.includes("card.dataset.role='対戦相手'"),'opponent role must be explicit');
need(visual.includes('NEXT OPPONENT'),'next opponent reveal title missing');
need(visual.includes('tourNextOpponent21592'),'next opponent reveal card missing');
need(visual.includes('portraitSrc(opp)'),'next opponent portrait must come from actual bracket opponent slot');
need(visual.includes("original.style.setProperty('display','none','important')"),'host card must be suppressed during active opponent dialogue');
need(visual.includes("['pending','active','won','lost','draw'].includes(bossStatus)"),'boss phase separation missing');
need(visual.includes('杯ボス・別5戦目'),'extra-match boss role missing');

// Public preview must mirror the same speaker contract.
need(preview.includes('const OPPONENT_LINES='),'preview opponent line bank missing');
need(preview.includes('function opponentSlot()'),'preview actual opponent resolver missing');
need(preview.includes('opponentDialoguePreview21592'),'preview opponent dialogue card missing');
need(preview.includes("card.dataset.role='対戦相手'"),'preview opponent role must be explicit');
need(preview.includes('NEXT OPPONENT'),'preview next opponent reveal missing');
need(preview.includes('pvNextOpponent21592'),'preview next opponent card missing');
need(preview.includes("orig.style.setProperty('display','none','important')"),'preview host card must be suppressed during bracket match');
need(preview.includes('TOURNAMENT CHAMPION'),'preview champion/boss split missing');

for(const name of ['みつき','みっちゃん','あき王','おにまま','まま','ケンシロウ','ジャギ','しんじ','直江兼続','あやなみ','バット','伊達政宗','あすか','ユリア','玉ちゃん','まり','ぺんぺん','げんどー','前田慶次','シン','みさとさん','サウザー','リン','ラオウ','カヲル','未来からやってきたみつき']){
  need(visual.includes("'"+name+"':{reveal:"),'main opponent voice missing: '+name);
  need(preview.includes("'"+name+"':{reveal:"),'preview opponent voice missing: '+name);
}
need(!/AIShogiIOS\.(?:select|stats|characters)\s*=/.test(visual),'visual layer must not mutate core AIShogiIOS API');
need(!/localStorage\.setItem/.test(visual),'visual layer must not mutate tournament/save state');
need(!/localStorage\.setItem/.test(preview),'preview visual layer must not mutate tournament/save state');

console.log('PASS_TOURNAMENT21590_IMAGE_VISUAL_STATIC',JSON.stringify({
  loader:true,
  imageCards:true,
  advanceMotion:true,
  roundIntro:true,
  nextOpponentReveal:true,
  opponentSpeaker:true,
  opponentVoices:26,
  hostOpponentSeparated:true,
  championBossTransition:true,
  bossGate:true,
  attemptScoped:true,
  reducedMotion:true,
  fireFit:true,
  previewParity:true,
  stateWrites:0
}));