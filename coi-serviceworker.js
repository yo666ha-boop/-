/* AI将棋先生 - Vercel root compatibility shim.
   The public Vercel root proxies shogi-v21528/index.html, so its relative
   ./coi-serviceworker.js request lands at the repository root. Load the
   canonical runtime synchronously before the game bootstrap starts. */
if(typeof window==='undefined'){
  importScripts('./shogi-v21528/coi-serviceworker.js?v=21536b');
}else if(!window.__AI_SHOGI_ROOT_COI_SHIM_21536B){
  window.__AI_SHOGI_ROOT_COI_SHIM_21536B=true;
  document.write('<script src="/shogi-v21528/coi-serviceworker.js?v=21536b"><\/script>');
}
