import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank=fs.readFileSync('shogi-v21528/tournament-dialogue-bank21547.js','utf8');
const profile=(key,next)=>((bank.match(new RegExp(`    ${key}:\\{[\\s\\S]*?\\n    ${next}:`))||[])[0]||'');
const raoh=profile('raoh','mama');
const onimama=profile('onimama','shinji');
const akiou=profile('akiou','mitsuki');
assert.ok(raoh && onimama && akiou,'21596 voice profiles must exist');
assert.match(raoh,/余が見届けよう|余が待つ|余の勝ち|余が制した/,'raoh must preserve canonical 余 voice');
assert.match(raoh,/くれぬ|終わらぬ/,'raoh must preserve archaic negative endings');
assert.doesNotMatch(onimama,/しな。|来な。|あんた/,'onimama must not drift into rough generic speech');
assert.match(onimama,/なさい|わよ|ですよ|ですね/,'onimama must preserve directive/polite feminine voice');
assert.doesNotMatch(akiou,/王座|王の壁/,'akiou must not drift into invented king persona');
assert.match(akiou,/見ています|進みましょう|おめでとうございます|受けて立ちます/,'akiou must preserve calm polite voice');
assert.ok(bank.includes('にゃんびー') && bank.includes('でんじゃーでんじゃーえまーじぇんしー'),'21595 micchan voice must remain protected');
console.log('PASS_TOURNAMENT21596_CHARACTER_VOICE_ALIGNMENT',JSON.stringify({raoh:true,onimama:true,akiou:true,micchan21595Protected:true}));
