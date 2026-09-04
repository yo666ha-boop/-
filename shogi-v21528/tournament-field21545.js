/* みつき将棋 大会参加者ルール v2.15.45a
 * 安定済み tournament21541 本体を直接書き換えず、参加者候補だけを開始時に制限する互換レイヤー。
 * - 16人制に必要な14人を確保できる最小R上限を求める
 * - その上限と杯ボスRの大きい方を参加上限にする
 * - R2100以上の杯では、現在の26キャラ構成上、ボスより高Rのキャラを出さない
 * - 低位杯は16人を成立させるために必要な分だけ上限を広げる
 * - キャラR・AI思考・AI同士のElo風勝敗・決勝ボス固定は変更しない
 */
(function installTournamentField21545(){
  'use strict';
  if(window.__AI_SHOGI_TOURNAMENT_FIELD_21545A)return;
  window.__AI_SHOGI_TOURNAMENT_FIELD_21545A=true;

  const CUPS={
    shinji:{id:'shinji',boss:'しんじ',bossRating:1550},
    ayanami:{id:'ayanami',boss:'あやなみ',bossRating:1800},
    kenshiro:{id:'kenshiro',boss:'ケンシロウ',bossRating:2100},
    kaworu:{id:'kaworu',boss:'カヲル',bossRating:2400},
    akiou:{id:'akiou',boss:'あき王',bossRating:2700},
    micchan:{id:'micchan',boss:'みっちゃん',bossRating:2850},
    mitsuki:{id:'mitsuki',boss:'みつき',bossRating:3000},
    future:{id:'future',boss:'未来からやってきたみつき',bossRating:3400}
  };
  const rating=ch=>Number(ch?.rating)||1500;
  let activeCup=null;
  let originalCharacters=null;
  let charactersPatched=false;
  let tournamentPatched=false;

  function ruleFor(cup,all){
    const nonBoss=(Array.isArray(all)?all:[]).filter(ch=>ch?.name!==cup.boss).slice();
    const asc=nonBoss.slice().sort((a,b)=>rating(a)-rating(b)||String(a.name).localeCompare(String(b.name),'ja'));
    const minimumNeeded=rating(asc[Math.min(13,Math.max(0,asc.length-1))]);
    const ceiling=Math.max(Number(cup.bossRating)||1500,minimumNeeded||0);
    const eligible=nonBoss.filter(ch=>rating(ch)<=ceiling);
    const score=ch=>{const d=rating(ch)-cup.bossRating;return d<=0?Math.abs(d):(Math.abs(d)*4+120)};
    const selected=eligible.slice().sort((a,b)=>score(a)-score(b)||rating(a)-rating(b)||String(a.name).localeCompare(String(b.name),'ja')).slice(0,14);
    return{
      cupId:cup.id,boss:cup.boss,bossRating:cup.bossRating,ceiling,minimumNeeded,
      eligible:eligible.map(ch=>ch.name),selected:selected.map(ch=>ch.name),
      selectedMax:selected.length?Math.max(...selected.map(rating)):null,
      overBoss:selected.filter(ch=>rating(ch)>cup.bossRating).map(ch=>ch.name)
    };
  }

  function begin(id){activeCup=CUPS[id]||null;return activeCup}
  function end(cup){if(!cup||activeCup===cup)activeCup=null}

  function patchCharacters(){
    const api=window.AIShogiIOS;
    if(!api||typeof api.characters!=='function')return false;
    if(charactersPatched)return true;
    originalCharacters=api.characters.bind(api);
    const wrapped=function(){
      const all=originalCharacters();
      const cup=activeCup;
      if(!cup||!Array.isArray(all))return all;
      const rule=ruleFor(cup,all),ceiling=rule.ceiling;
      return new Proxy(all,{
        get(target,prop){
          if(prop==='filter')return function(callback,thisArg){
            const filtered=Array.prototype.filter.call(target,callback,thisArg);
            const bossExists=target.some(ch=>ch?.name===cup.boss);
            const bossExcluded=bossExists&&!filtered.some(ch=>ch?.name===cup.boss);
            if(bossExcluded&&filtered.length<=target.length-1)return filtered.filter(ch=>rating(ch)<=ceiling);
            return filtered;
          };
          const value=Reflect.get(target,prop,target);
          return typeof value==='function'?value.bind(target):value;
        }
      });
    };
    wrapped.__tourField21545=true;
    wrapped.__originalCharacters=originalCharacters;
    api.characters=wrapped;
    charactersPatched=true;
    return true;
  }

  function patchTournamentAPI(){
    const t=window.AI_SHOGI_TOURNAMENT;
    if(!t||typeof t.start!=='function')return false;
    if(t.__field21545a){tournamentPatched=true;return true}
    const originalStart=t.start.bind(t);
    t.start=function(id,...args){
      const cup=begin(id);
      try{return originalStart(id,...args)}finally{end(cup)}
    };
    t.fieldRule=function(id){
      const cup=CUPS[id];
      const all=originalCharacters?originalCharacters():(window.AIShogiIOS?.characters?.()||[]);
      return cup?ruleFor(cup,all):null;
    };
    t.__field21545a=true;
    tournamentPatched=true;
    return true;
  }

  document.addEventListener('click',e=>{
    const button=e.target?.closest?.('[data-tour-start],[data-tour-retry]');
    if(!button)return;
    const id=button.dataset.tourStart||button.dataset.tourRetry||'';
    const cup=begin(id);if(!cup)return;
    setTimeout(()=>end(cup),0);
  },true);

  function install(){patchCharacters();patchTournamentAPI()}
  let tries=0;
  const timer=setInterval(()=>{install();if((charactersPatched&&tournamentPatched)||++tries>100)clearInterval(timer)},50);
  install();

  window.AI_SHOGI_TOURNAMENT_FIELD_RULE={
    version:'21545a',
    audit:(id='akiou')=>{
      const cup=CUPS[id]||CUPS.akiou;
      const all=originalCharacters?originalCharacters():(window.AIShogiIOS?.characters?.()||[]);
      const r=ruleFor(cup,all);
      return{ok:charactersPatched&&tournamentPatched,...r,characterCount:Array.isArray(all)?all.length:0};
    },
    cups:()=>Object.keys(CUPS).map(id=>{
      const all=originalCharacters?originalCharacters():(window.AIShogiIOS?.characters?.()||[]);
      return ruleFor(CUPS[id],all);
    })
  };
})();