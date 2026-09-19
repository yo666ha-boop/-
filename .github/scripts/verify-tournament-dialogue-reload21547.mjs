import { firefox } from 'playwright';
const browser=await firefox.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8000/shogi-v21528/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d',{timeout:60000});
 const before=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.()||null);
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.version==='21547d',{timeout:60000});
 const after=await page.evaluate(()=>window.AI_SHOGI_TOURNAMENT_DIALOGUE?.audit?.()||null);
 console.log('PASS_TOURNAMENT21547_RELOAD_BOOT '+JSON.stringify({before,after}));
}finally{await browser.close();}
