import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.goto('http://127.0.0.1:8000/shogi-v21528/?dialogueFullapp='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
  await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547c',{timeout:20000});

  const audit=await page.evaluate(()=>{
    const api=window.AIShogiIOS;let s=null,stateError='';
    try{s=api?.state?.()||null}catch(e){stateError=String(e?.message||e)}
    const scripts=[...document.scripts].map(x=>x.src).filter(Boolean);
    const dialogueSrc=scripts.find(x=>x.includes('/tournament-dialogue21547.js'))||'';
    const bankSrc=scripts.find(x=>x.includes('/tournament-dialogue-bank21547.js'))||'';
    return{
      dialogueVersion:window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version||null,
      loaderC:!!window.__AI_SHOGI_TOURNAMENT_LOADER_21547C,
      dialogueSrc,
      bankSrc,
      dialogueCacheC:/[?&]v=21547c(?:&|$)/.test(dialogueSrc),
      bankCacheC:/[?&]v=21547c(?:&|$)/.test(bankSrc),
      aiApi:!!api,
      stateFunction:typeof api?.state==='function',
      charactersFunction:typeof api?.characters==='function',
      board:Array.isArray(s?.b),
      boardLength:Array.isArray(s?.b)?s.b.length:0,
      hands:!!s?.h&&typeof s.h==='object',
      handS:!!s?.h?.[1]&&typeof s.h[1]==='object',
      handG:!!s?.h?.[-1]&&typeof s.h[-1]==='object',
      turn:[1,-1].includes(Number(s?.t)),
      log:Array.isArray(s?.log),
      rosterCount:Array.isArray(api?.characters?.())?api.characters().length:0,
      stateError
    };
  });

  const failures=[];
  if(audit.dialogueVersion!=='21547c')failures.push('dialogue version '+audit.dialogueVersion);
  if(!audit.loaderC)failures.push('21547c loader flag missing');
  if(!audit.dialogueCacheC)failures.push('dialogue cache key is not 21547c: '+audit.dialogueSrc);
  if(!audit.bankCacheC)failures.push('bank cache key is not 21547c: '+audit.bankSrc);
  if(!audit.aiApi||!audit.stateFunction||!audit.charactersFunction)failures.push('AIShogiIOS API missing');
  if(!audit.board||audit.boardLength!==81||!audit.hands||!audit.handS||!audit.handG||!audit.turn||!audit.log)failures.push('live state shape incompatible: '+JSON.stringify(audit));
  if(audit.rosterCount!==26)failures.push('rosterCount '+audit.rosterCount);
  if(failures.length)throw new Error(failures.join(' | '));

  console.log('PASS_TOURNAMENT21547C_FULLAPP_API '+JSON.stringify({...audit,pageErrors:errors}));
} finally {
  await browser.close();
}
