/* AI将棋先生 v2.15.33 prep2: 6〜10位を共通やねうら王＋水匠5へ段階接続するための検証レイヤー。公開対局の指し手はまだ変更しない。 */
(function installNext5YaneuraPrep21533(){
  if(window.AI_SHOGI_YANEURAOU_NEXT5_PREP)return;

  const TARGETS=[24,23,21,5,17];
  const TARGET_SET=new Set(TARGETS);
  const EXPECTED={
    24:{name:'月影 千景',rating:2400},
    23:{name:'里見 義景',rating:2250},
    21:{name:'山本 勘助',rating:2180},
    5:{name:'柳生 晴明',rating:2100},
    17:{name:'竹中 重治',rating:2050}
  };

  // まずは「検索時間」と「候補手を何本取るか」だけを仮置きする。
  // maxLoss は実測してから決めるため、この段階では本番の指し手選択に使わない。
  const PROFILES={
    24:{label:'R2400・師範万能型',personality:'master-lite',multiPV:5,desktopMs:1900,mobileMs:1250},
    23:{label:'R2250・振り飛車穴熊・終盤型',personality:'anaguma',multiPV:5,desktopMs:1650,mobileMs:1100},
    21:{label:'R2180・軍師万能型',personality:'strategist',multiPV:5,desktopMs:1450,mobileMs:950},
    5:{label:'R2100・正統派精密居飛車',personality:'precise',multiPV:5,desktopMs:1250,mobileMs:850},
    17:{label:'R2050・雁木策士型',personality:'gangi',multiPV:5,desktopMs:1100,mobileMs:750}
  };

  function isMobile(){return /iPhone|iPad|iPod|Android|Silk/i.test(navigator.userAgent)}
  function profileFor(who){return TARGET_SET.has(who)?PROFILES[who]:null}
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
      let name='',rating=NaN;
      if(pub&&pub[who]){name=String(pub[who].name||'');rating=Number(pub[who].rating)}
      else if(typeof C!=='undefined'&&Array.isArray(C)&&C[who]){name=String(C[who][0]||'');rating=Number(C[who][1])}
      else{issues.push('missing index '+who);continue}
      if(name!==exp.name)issues.push('name mismatch '+who+': '+name+' != '+exp.name);
      if(rating!==exp.rating)issues.push('rating mismatch '+who+': '+rating+' != '+exp.rating);
      if(who>=0&&who<=4)issues.push('top5 overlap '+who);
    }
    return{ok:issues.length===0,issues,targets:TARGETS.slice(),profiles:{...PROFILES},source:pub?'AIShogiIOS':'lexical-roster'};
  }

  async function probe(state,who,options={}){
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
      depth:Number(c?.depth)||0
    }));
    return{
      who,
      name:EXPECTED[who].name,
      rating:EXPECTED[who].rating,
      profile:{...p},
      ms,
      multiPV,
      elapsed:Math.round(performance.now()-started),
      bestToken:String(candidates[0]?.token||''),
      info:res?.info||{},
      candidates,
      resign:!!res?.resign,
      declareWin:!!res?.declareWin
    };
  }

  window.AI_SHOGI_YANEURAOU_NEXT5_PREP={
    version:'2.15.33-prep2',
    enabled:false,
    liveOverride:false,
    targets:TARGETS.slice(),
    expected:{...EXPECTED},
    profiles:{...PROFILES},
    profileFor,
    verifyRoster,
    probe
  };
})();
