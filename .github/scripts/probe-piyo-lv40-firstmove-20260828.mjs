import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},locale:'ja-JP'});
const R='abcdefghi';
async function squarePoint(sq){return page.evaluate(({sq,R})=>{const b=document.querySelector('#board_img')?.getBoundingClientRect();if(!b)throw new Error('board missing');const file=Number(sq[0]),rank=R.indexOf(sq[1]),col=9-file;return{x:b.x+33.5+55.5*col,y:b.y+48.5+58.8*rank,board:{x:b.x,y:b.y,w:b.width,h:b.height}}},{sq,R})}
try{
 await page.goto('https://www.studiok-i.net/ps/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForTimeout(4000);
 await page.locator('#btnNewGame').click();await page.waitForTimeout(500);
 await page.locator('#selectLevelGote').selectOption({label:'Lv40 ピヨ帝 (R2610 七段)'});
 if(await page.locator('#chkRatingTarget').isChecked())await page.locator('#chkRatingTarget').uncheck();
 await page.locator('#btnDialogGameStart').click();await page.waitForTimeout(1000);
 const a=await squarePoint('7g'),d=await squarePoint('7f');console.log('PIYO_BOARD_GEOMETRY '+JSON.stringify(a.board));await page.mouse.click(a.x,a.y);await page.waitForTimeout(150);await page.mouse.click(d.x,d.y);
 await page.waitForFunction(()=>document.querySelector('#select_kifu')?.options?.length>=3,null,{timeout:90000});await page.waitForTimeout(500);
 const out=await page.evaluate(()=>({
   kifu:[...document.querySelector('#select_kifu').options].map(o=>o.text),
   selected:document.querySelector('#select_kifu')?.value||'',
   turnText:(document.body.innerText||'').match(/先手[^\n]*番|後手[^\n]*番/)?.[0]||'',
   pieces:[...document.querySelectorAll('img.board_koma')].map(el=>{const r=el.getBoundingClientRect();return{id:el.id,alt:el.alt,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w&&x.h)
 }));
 console.log('PIYO_LV40_FIRSTMOVE '+JSON.stringify(out));
 await page.screenshot({path:'/tmp/piyo-lv40-firstmove.png',fullPage:true});
}finally{await browser.close()}
