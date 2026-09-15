import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank=fs.readFileSync('shogi-v21528/tournament-dialogue-bank21547.js','utf8');
const dialogue=fs.readFileSync('shogi-v21528/tournament-dialogue21547.js','utf8');
const mic=(bank.match(/    micchan:\{[\s\S]*?\n    mitsuki:/)||[])[0]||'';
assert.ok(mic,'micchan voice profile must exist');
assert.ok(mic.includes('にゃんびー'),'micchan must contain にゃんびー');
assert.ok(mic.includes('でんじゃーでんじゃーえまーじぇんしー'),'micchan must contain danger/emergency catchphrase');
assert.doesNotMatch(mic,/わたし|私/,'micchan must not use ordinary first-person watashi');
for(const stale of['いい感じ、ちゃんと見てるよ。','焦らずいつもの将棋でいこう。','ナイス勝ち上がり！'])assert.ok(!mic.includes(stale),'stale conventional micchan line remains: '+stale);
const opponent=(dialogue.match(/const micchanLines21595=\[[^\n]+/)||[])[0]||'';
assert.ok(opponent,'micchan opponent override must exist');
assert.ok(opponent.includes('にゃんびー'),'opponent override must contain にゃんびー');
assert.ok(opponent.includes('でんじゃーでんじゃーえまーじぇんしー'),'opponent override must contain canonical emergency phrase');
assert.doesNotMatch(opponent,/わたし|私/,'micchan opponent override must not use watashi');
assert.ok(dialogue.includes("d.opp==='みっちゃん'?micchanLines21595"),'micchan must bypass generic #charSpeech');
assert.ok(dialogue.includes(':baseSpeech;'),'non-micchan opponents must preserve existing #charSpeech path');
console.log('PASS_TOURNAMENT21595_MICCHAN_NONSENSE_VOICE',JSON.stringify({hostBoss:true,opponent:true,nyanbee:true,dangerEmergency:true,watashi:false,genericOthersPreserved:true}));