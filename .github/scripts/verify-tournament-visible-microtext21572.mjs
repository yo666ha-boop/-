import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const historyPath='shogi-v21528/tournament-history21567.js';
const gamePath='shogi-v21528/tournament-game-ui21559.js';
const roadPath='shogi-v21528/tournament-road21562.js';

const [history,game,road]=await Promise.all([
  fs.readFile(historyPath,'utf8'),
  fs.readFile(gamePath,'utf8'),
  fs.readFile(roadPath,'utf8')
]);

// 280px / FireFit visible text floor. These selectors are deliberately checked
// at the final override layer so base 5-6px declarations cannot silently return.
const required=[
  ['history head',/tourFireFit \.tourAttemptHistoryHead21567\{font-size:7px/],
  ['history count',/tourFireFit \.tourAttemptHistoryCount21567\{font-size:7px/],
  ['history cup',/tourFireFit \.tourAttemptHistoryCup21567\{font-size:7px/],
  ['history ordinal',/tourFireFit \.tourAttemptHistoryOrdinal21568\{font-size:7px/],
  ['history meta',/tourFireFit \.tourAttemptHistoryMeta21567\{font-size:7px/],
  ['match name',/tourFireFit \.tourMatchName21559\{font-size:8px/],
  ['match meta',/tourFireFit \.tourMatchMeta21559\{font-size:7px/],
  ['VS helper',/tourFireFit \.tourMatchVs21559 small\{font-size:7px/],
  ['boss helper',/tourFireFit \.tourBossHint21559,#tournament21540Panel\.tourFireFit \.tourBossLock21559\{font-size:8px/],
  ['ROAD stage',/tourFireFit \.tourRoadStage21562\{font-size:7px/]
];
for(const [label,re] of required) assert.match(history,re,`${label} must stay at least 7px in final FireFit override`);

// Bracket status stamps are visible microtext too; keep their existing 7px floor.
assert.match(game,/tourGameNow21559:after\{[^}]*font-size:7px/,'NOW stamp must stay at least 7px');
assert.match(game,/tourWinStamp21559\{[^}]*font-size:7px/,'WIN stamp must stay at least 7px');

// ROAD companion must still load the final history/readability override.
assert.match(road,/tournament-history21567\.js\?v=21567/,'ROAD must load tournament-history21567 final override');

// The only intentional sub-7 FireFit text left in game-ui is the portrait fallback
// glyph. In production the 26 real character images are present and existing gates
// require fallback=0; all normal visible labels are covered above.
const fireRules=[...game.matchAll(/#tournament21540Panel\.tourFireFit[^\n]*/g)].map(m=>m[0]).join('\n');
const sub7=[...fireRules.matchAll(/([^{}]+)\{[^{}]*font-size:([0-6](?:\.\d+)?)px[^{}]*\}/g)].map(m=>({selector:m[1].trim(),px:Number(m[2])}));
const unexpected=sub7.filter(x=>!x.selector.endsWith('.tourMatchPortrait21559'));
assert.deepEqual(unexpected,[],`unexpected visible FireFit text below 7px: ${JSON.stringify(unexpected)}`);

console.log('PASS_TOURNAMENT21572_VISIBLE_MICROTEXT_FLOOR '+JSON.stringify({
  minimumVisiblePx:7,
  checked:required.map(([label])=>label).concat(['NOW stamp','WIN stamp']),
  intentionalFallback:sub7,
  invariant:'26 real images / fallback=0 remains covered by existing Fire gate'
}));
