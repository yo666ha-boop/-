/* みつき将棋 大会10杯・外部確認ページ同期 21589 */
(function syncPreviewCups21589(){
  'use strict';
  if(window.__TOURNAMENT_PREVIEW_CUPS_21589)return;
  window.__TOURNAMENT_PREVIEW_CUPS_21589=true;
  const next=[
    ['kenshiro','ケンシロウ杯','ケンシロウ',2100,0,2149,'中級への登竜門'],
    ['souther','サウザー杯','サウザー',2180,2150,2219,'中上級'],
    ['raoh','ラオウ杯','ラオウ',2250,2220,2349,'中上級＋'],
    ['kaworu','カヲル杯','カヲル',2400,2350,2449,'上級'],
    ['mama','まま杯','まま',2500,2450,2549,'上級＋'],
    ['onimama','おにまま杯','おにまま',2600,2550,2649,'超上級入口'],
    ['akiou','あき王杯','あき王',2700,2650,2799,'超上級'],
    ['micchan','みっちゃん杯','みっちゃん',2850,2800,2949,'最上級'],
    ['mitsuki','みつき杯','みつき',3000,2950,3199,'最高峰'],
    ['future','未来みつき杯','未来からやってきたみつき',3400,3200,9999,'究極']
  ].map(x=>({id:x[0],name:x[1],boss:x[2],bossRating:x[3],min:x[4],max:x[5],label:x[6]}));
  if(!Array.isArray(CUPS))throw new Error('preview CUPS unavailable');
  CUPS.splice(0,CUPS.length,...next);
})();
