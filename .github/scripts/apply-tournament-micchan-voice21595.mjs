import fs from 'node:fs';

const bankFile='shogi-v21528/tournament-dialogue-bank21547.js';
const dialogueFile='shogi-v21528/tournament-dialogue21547.js';
let bank=fs.readFileSync(bankFile,'utf8');
let dialogue=fs.readFileSync(dialogueFile,'utf8');

function replaceOnce(src,from,to,label){
  if(src.includes(to))return src;
  if(!src.includes(from))throw new Error('21595 missing anchor: '+label);
  return src.replace(from,to);
}

const oldVoice=`    micchan:{name:'みっちゃん',watch:['いい感じ、ちゃんと見てるよ。','焦らずいつもの将棋でいこう。','ここから面白くなってくるね。','一局ずつ楽しんでいこう。','次の勝負も見逃さないよ。'],pressure:['ここはちょっと大事だよ。','最後まで気を抜かないでね。','勝負所、よく見ていこう。','急がないのも強さだよ。','もうひと読みしてみよう。'],praise:['ナイス勝ち上がり！','いい一局だったね。','また一つ上に進んだね。','その調子でいこう。','決勝が近づいてきたよ。'],challenge:['優勝したら今度はみっちゃんと勝負ね。','最後はこっちで待ってるよ。','トーナメントを取ったら直接指そう。','ここまで来たら最後も楽しもう。','挑戦権、取りにおいで。'],bossWin:['今回はみっちゃんの勝ち！','また優勝して遊びにおいで。','いい勝負だったよ。','次はもっと強くなってそうだね。','挑戦ありがとう、また指そう。'],bossLose:['やったね、完全制覇！','強かった！今日は完敗。','最後までいい将棋だったよ。','この杯は君の勝ち！','優勝からの連勝、お見事！'],draw:['引き分けだね、もう一局！','次で決めよう。','まだ終わらないよ。','もう一回、最初から勝負！','今度こそ決着つけようね。']},`;
const newVoice=`    micchan:{name:'みっちゃん',watch:['にゃんびー！','でんじゃーでんじゃーえまーじぇんしー！','にゃんびー警報、ぴこぴこぴー！','でんじゃー！こまこま大渋滞！','にゃんびー発進、どこいくのー！'],pressure:['でんじゃーでんじゃーえまーじぇんしー！','にゃんびー！盤面がぐるぐるしてる！','えまーじぇんしー、こまがいっぱい！','でんじゃー！右も左もでんじゃー！','にゃんびー、ぴーんちなのかチャンスなのかー！'],praise:['にゃんびー！なんか勝ったー！','でんじゃー解除？まだでんじゃー！','にゃんびーにゃんびー、つぎつぎー！','えまーじぇんしーなのに勝ってるー！','ぴこーん！勝ち上がり受信！'],challenge:['にゃんびー！みっちゃんボスモード！','でんじゃーでんじゃー、ここからえまーじぇんしー！','みっちゃんゾーン、にゃんびー侵入！','えまーじぇんしー最終便、しゅっぱーつ！','でんじゃー！最後はみっちゃんが出るー！'],bossWin:['にゃんびー！みっちゃん勝ったっぽい！','でんじゃー解除ー、たぶん！','えまーじぇんしー終了のおしらせー！','にゃんびー、勝ちが落ちてたー！','でんじゃーでんじゃー、でも勝ったー！'],bossLose:['にゃんびー！みっちゃん負けたっぽい！','でんじゃー！杯がそっち行ったー！','えまーじぇんしー、完全制覇されましたー！','にゃんびーにゃんびー、つよすぎー！','でんじゃー解除できませーん！'],draw:['にゃんびー？もういっかーい！','でんじゃーでんじゃー、引き分けえまーじぇんしー！','えまーじぇんしー延長ー！','にゃんびー、まだ終わってなかったー！','でんじゃー！指し直し発生ー！']},`;
bank=replaceOnce(bank,oldVoice,newVoice,'micchan tournament voice profile');

const oldOpponent=`    const src=portrait(d.opp),speech=(document.getElementById('charSpeech')?.textContent||'').trim()||'いい勝負にしよう。',round=String(Number(d.a.round)||0),oldImg=box.querySelector('img'),oldBubble=(box.querySelector('.tourDialogueBubble')?.textContent||'').trim();`;
const newOpponent=`    const baseSpeech=(document.getElementById('charSpeech')?.textContent||'').trim()||'いい勝負にしよう。';
    const micchanLines21595=['にゃんびー！','でんじゃーでんじゃーえまーじぇんしー！','にゃんびー警報、ぴこぴこぴー！','でんじゃー！こまこま大渋滞！','えまーじぇんしー！将棋が飛んでる！','にゃんびーにゃんびー、こまこまこま！'];
    const speech=d.opp==='みっちゃん'?micchanLines21595[(Math.max(0,Number(d.a.round)||0)+Math.max(0,moveCount()))%micchanLines21595.length]:baseSpeech;
    const src=portrait(d.opp),round=String(Number(d.a.round)||0),oldImg=box.querySelector('img'),oldBubble=(box.querySelector('.tourDialogueBubble')?.textContent||'').trim();`;
dialogue=replaceOnce(dialogue,oldOpponent,newOpponent,'micchan opponent speech override');

const micchan=(bank.match(/    micchan:\{[\s\S]*?\n    mitsuki:/)||[])[0]||'';
if(!micchan)throw new Error('21595 micchan profile not found after patch');
if(/わたし|私/.test(micchan))throw new Error('21595 forbidden micchan first-person pronoun');
for(const phrase of['にゃんびー','でんじゃーでんじゃーえまーじぇんしー'])if(!micchan.includes(phrase))throw new Error('21595 missing micchan phrase '+phrase);
if(!dialogue.includes("d.opp==='みっちゃん'?micchanLines21595"))throw new Error('21595 opponent override missing');
if(/わたし|私/.test((dialogue.match(/const micchanLines21595=\[[^\n]+/)||[])[0]||''))throw new Error('21595 forbidden opponent pronoun');

fs.writeFileSync(bankFile,bank);
fs.writeFileSync(dialogueFile,dialogue);
console.log('PASS_TOURNAMENT21595_MICCHAN_NONSENSE_VOICE');