import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank=fs.readFileSync('shogi-v21528/tournament-dialogue-bank21547.js','utf8');
const dialogue=fs.readFileSync('shogi-v21528/tournament-dialogue21547.js','utf8');
const profile=(key,next)=>((bank.match(new RegExp(`    ${key}:\\{[\\s\\S]*?\\n    ${next}:`))||[])[0]||'');
const raoh=profile('raoh','mama');
const onimama=profile('onimama','shinji');
const akiou=profile('akiou','micchan');
assert.ok(raoh && onimama && akiou,'21596 voice profiles must exist');
assert.match(raoh,/余が見届けよう|余が待つ|余の勝ち|余が制した/,'raoh must preserve canonical 余 voice');
assert.match(raoh,/くれぬ|終わらぬ/,'raoh must preserve archaic negative endings');
assert.doesNotMatch(onimama,/しな。|来な。|あんた/,'onimama must not drift into rough generic speech');
assert.match(onimama,/なさい|わよ|ですよ|ですね/,'onimama must preserve directive/polite feminine voice');
assert.doesNotMatch(akiou,/王座|王の壁/,'akiou must not drift into invented king persona');
assert.match(akiou,/見ています|進みましょう|おめでとうございます|受けて立ちます|待っています|指しましょう/,'akiou must preserve calm polite voice');
assert.ok(bank.includes('にゃんびー') && bank.includes('でんじゃーでんじゃーえまーじぇんしー'),'21595 micchan voice must remain protected');

// 21597: ordinary tournament opponents must keep the normal-game character voice.
// tournament-dialogue21547 may special-case Micchan because her canonical nonsense voice
// previously drifted, but every other character must inherit the live base-game charSpeech.
const voiceBlock=((dialogue.match(/  function renderOpponentVoice\(\)\{[\s\S]*?\n  \}\n\n  function audit\(\)/)||[])[0]||'');
assert.ok(voiceBlock,'opponent voice renderer must exist');
assert.match(voiceBlock,/document\.getElementById\('charSpeech'\)\?\.textContent/,'ordinary opponent voice must source canonical live charSpeech');
assert.match(voiceBlock,/const speech=d\.opp==='みっちゃん'\?micchanLines21595\[[\s\S]*?\]:baseSpeech;/,'Micchan may be the only explicit tournament opponent voice override');
const explicitOpponentOverrides=[...voiceBlock.matchAll(/d\.opp===['"]([^'"]+)['"]/g)].map(m=>m[1]);
assert.deepEqual([...new Set(explicitOpponentOverrides)],['みっちゃん'],'all non-Micchan opponents must inherit normal-game charSpeech without tournament-specific persona overrides');
assert.match(voiceBlock,/box\.dataset\.speaker=d\.opp/,'rendered speaker must remain the actual tournament opponent');
assert.match(voiceBlock,/esc\(speech\)/,'rendered bubble must use the inherited/special-cased opponent speech');

console.log('PASS_TOURNAMENT21596_CHARACTER_VOICE_ALIGNMENT',JSON.stringify({raoh:true,onimama:true,akiou:true,micchan21595Protected:true}));
console.log('PASS_TOURNAMENT21597_OPPONENT_VOICE_INHERITANCE',JSON.stringify({canonicalCharSpeech:true,onlyExplicitOverride:'みっちゃん',actualOpponentSpeaker:true}));
