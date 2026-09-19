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

// 280px / FireFit visible text floor. The final override layer now enforces
// an 8px floor for every visible tournament microtext label covered by 21577.
const required=[
  ['history head',/tourFireFit \.tourAttemptHistoryHead21567\{font-size:8px/],
  ['history count',/tourFireFit \.tourAttemptHistoryCount21567\{font-size:8px/],
  ['history cup',/tourFireFit \.tourAttemptHistoryCup21567\{font-size:8px/],
  ['history ordinal',/tourFireFit \.tourAttemptHistoryOrdinal21568\{font-size:8px/],
  ['history meta',/tourFireFit \.tourAttemptHistoryMeta21567\{font-size:8px/],
  ['match name',/tourFireFit \.tourMatchName21559\{font-size:8px/],
  ['match meta',/tourFireFit \.tourMatchMeta21559\{font-size:8px/],
  ['VS helper',/tourFireFit \.tourMatchVs21559 small\{font-size:8px/],
  ['boss helper',/tourFireFit \.tourBossHint21559,#tournament21540Panel\.tourFireFit \.tourBossLock21559\{font-size:8px/],
  ['ROAD stage',/tourFireFit \.tourRoadStage21562\{font-size:8px/],
  ['NOW/WIN final override',/tourFireFit \.tourBracketSlot\.tourGameNow21559:after,#tournament21540Panel\.tourFireFit \.tourWinStamp21559\{font-size:8px/]
];
for(const [label,re] of required) assert.match(history,re,`${label} must stay at the validated >=8px FireFit floor`);

// The base game stylesheet may remain 7px because the final history/readability
// companion is loaded after it and raises NOW/WIN to the validated 8px floor.
assert.match(game,/tourGameNow21559:after\{[^}]*font-size:7px/,'base NOW stamp declaration changed unexpectedly');
assert.match(game,/tourWinStamp21559\{[^}]*font-size:7px/,'base WIN stamp declaration changed unexpectedly');

// ROAD companion must still load the final history/readability override.
assert.match(road,/tournament-history21567\.js\?v=21567/,'ROAD must load tournament-history21567 final override');

// Base FireFit declarations below 7px are allowed only when a later, explicitly
// asserted final override raises that visible label, or when the glyph is a portrait
// fallback that existing Fire gates require to remain unused (fallback=0).
const fireRules=[...game.matchAll(/#tournament21540Panel\.tourFireFit[^\n]*/g)].map(m=>m[0]).join('\n');
const sub7=[...fireRules.matchAll(/([^{}]+)\{[^{}]*font-size:([0-6](?:\.\d+)?)px[^{}]*\}/g)].map(m=>({selector:m[1].trim(),px:Number(m[2])}));
const allowedBaseDeclarationsBelow7=[
  '.tourMatchPortrait21559',
  '.tourMatchMeta21559',
  '.tourMatchVs21559 small'
];
const unexpected=sub7.filter(x=>!allowedBaseDeclarationsBelow7.some(selector=>x.selector.endsWith(selector)));
assert.deepEqual(unexpected,[],`unexpected base FireFit text below 7px without a validated final override: ${JSON.stringify(unexpected)}`);

console.log('PASS_TOURNAMENT21572_VISIBLE_MICROTEXT_FLOOR '+JSON.stringify({
  minimumVisiblePx:8,
  historyHierarchy21577:{head:8,count:8,cup:8,ordinal:8,meta:8},
  checked:required.map(([label])=>label),
  allowedBaseDeclarationsBelow7:sub7,
  invariant:'final FireFit overrides enforce >=8px visible tournament microtext; 26 real images / fallback=0 remains covered by existing Fire gate'
}));
