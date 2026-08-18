/* AI将棋先生 v2.15.33 prep-correct1: 現在の公開版でR6〜R10の実キャラを共通やねうら王＋水匠5へ段階接続するための検証レイヤー。公開対局の指し手はまだ変更しない。 */
(function installNext5YaneuraPrep21533(){
  if(window.AI_SHOGI_YANEURAOU_NEXT5_PREP)return;

  // 現在の公開版で、上位5人の次にレートが高い実キャラ。
  // 24 カヲル R2400 / 23 ラオウ R2250 / 21 サウザー R2180 / 5 ケンシロウ R2100 / 17 げんどー R2050
  const TARGETS=[24,23,21,5,17];
  const TARGET_SET=new Set(TARGETS);
  const EXPECTED={
    24:{name:'カヲル',rating:2400,style:'師範・静謐万能型'},
    23:{name:'ラオウ',rating:2250,style:'覇道・圧倒王者型'},
    21:{name:'サウザー',rating:2180,style:'孤高の帝王・変則支配型'},
    5:{name:'ケンシロウ',rating:2100,style:'静かな闘志・正統決着型'},
    17:{name:'げんどー',rating:2050,style:'雁木・策士指揮型'}
  };

  // ここではまだ強さを確定しない。検索時間と候補手取得だけ仮置きし、
  // 実局面のcp差・詰み精度・棋風の残り方を測ってからmaxLoss等を決める。
  const PROFILES={
    24:{label:'R2400・静謐万能',personality:'calm-master',multiPV:4,desktopMs:1900,mobileMs:1250},
    23:{label:'R2250・覇道王者',personality:'power',multiPV:4,desktopMs:1650,mobileMs:1100},
    21:{label:'R2180・変則支配',personality:'control',multiPV:4,desktopMs:1450,mobileMs:950},
    5:{label:'R2100・正統決着',personality:'precise',multiPV:4,desktopMs:1250,mobileMs:850},
    17:{label:'R2050・雁木策士',personality:'strategist',multiPV:4,desktopMs:1100,mobileMs:750}
  };

  function isMobile(){return /iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent)}
  function profileFor(who){return TARGET_SET.has(Number(who))?PROFILES[Number(who)]:null}
  function sharedEngine(){return window.AI_SHOGI_YANEURAOU_FUTURE}
  function publicRoster(){
    try{
      const x=window.AIShogiIOS&&typeof window.AIShogiIOS.characters==='function'?window.AIShogiIOS.characters():null;
      return Array.isArray(x)?x:null;
    }catch(e){return null}
  }

  function verifyRoster(){
    const issues=[],pub=publicRoster();
    for(const who of TARGETS){
      const exp=EXPECTED[who];
      let name='',rating=NaN,style='';
      if(pub&&pub[who]){
        name=String(pub[who].name||'');rating=Number(pub[who].rating);style=String(pub[who].style||'');
      }else if(typeof C!=='undefined'&&Array.isArray(C)&&C[who]){
        name=String(C[who][0]||'');rating=Number(C[who][1]);style=String((typeof CHAR_META!=='undefined'&&CHAR_META[who]?.style)||'');
      }else{issues.push('missing index '+who);continue}
      if(name!==exp.name)issues.push('name mismatch '+who+': '+name+' != '+exp.name);
      if(rating!==exp.rating)issues.push('rating mismatch '+who+': '+rating+' != '+exp.rating);
      if(style&&style!==exp.style)issues.push('style mismatch '+who+': '+style+' != '+exp.style);
      if(who>=0&&who<=4)issues.push('top5 overlap '+who);
    }
    return{ok:issues.length===0,issues,targets:TARGETS.slice(),expected:{...EXPECTED},profiles:{...PROFILES},source:pub?'AIShogiIOS':'lexical-roster'};
  }

  async function probe(state,who,options={}){
    who=Number(who);
    if(!TARGET_SET.has(who))throw new Error('next5対象外 index='+who);
    const p=PROFILES[who],shared=sharedEngine();
    if(!shared||typeof shared.init!=='function'||typeof shared.bestMove!=='function')throw new Error('shared YaneuraOu worker unavailable');
    const ms=Math.max(250,Number(options.ms)||((isMobile()?p.mobileMs:p.desktopMs)));
    const multiPV=Math.max(2,Math.min(4,Number(options.multiPV)||p.multiPV));
    await shared.init();
    const started=performance.now();
    const res=await shared.bestMove(state,{ms,multiPV});
    const raw=Array.isArray(res?.info?.candidates)?res.info.candidates:[];
    const candidates=raw.map((c,i)=>({
      rank:Number(c?.rank)||i+1,
      token:String(c?.token||''),
      cp:Number.isFinite(c?.cp)?c.cp:null,
      mate:c?.mate??null,
      depth:Number(c?.depth)||0,
      nodes:Number(c?.nodes)||0
    }));
    return{
      who,name:EXPECTED[who].name,rating:EXPECTED[who].rating,style:EXPECTED[who].style,
      profile:{...p},ms,multiPV,elapsed:Math.round(performance.now()-started),
      bestToken:String(candidates[0]?.token||''),info:res?.info||{},candidates,
      resign:!!res?.resign,declareWin:!!res?.declareWin
    };
  }

  window.AI_SHOGI_YANEURAOU_NEXT5_PREP={
    version:'2.15.33-prep-correct1',enabled:false,liveOverride:false,
    targets:TARGETS.slice(),expected:{...EXPECTED},profiles:{...PROFILES},
    profileFor,verifyRoster,probe
  };
})();
