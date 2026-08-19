import { chromium } from 'playwright';
import fs from 'fs';
const core=fs.readFileSync('shogi/strong213_01.part','utf8');
const future=fs.readFileSync('shogi-side-test/future21520.js','utf8');
const expected=[['みつき',3000],['みっちゃん',2850],['あき王',2700],['おにまま',2600],['まま',2500]];
for(const [name,r] of expected){if(!core.includes(`[\"${name}\",${r},`)&&!core.includes(`["${name}",${r},`))throw Error('core rating missing '+name+' '+r)}
if(!future.includes("const FUTURE_RATING=3400"))throw Error('future R3400 missing');
if(!future.includes("i===FUTURE_INDEX?'未来・やねうら王V9.70':rankTextBase(i)"))throw Error('future rank wrapper changed');
const staticOut={core:expected,future:['未来からやってきたみつき',3400],regularMetaStillSaysStrongest:core.includes('最強万能型・終盤最強')&&core.includes('みっちゃんが成長した最強形'),futureRankOverride:'未来・やねうら王V9.70'};
console.log('HIERARCHY_STATIC '+JSON.stringify(staticOut));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36'});
 await page.goto('http://127.0.0.1:4214/shogi-v21528/index.html?hier='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
 const cards=page.locator('#chars .ch');
 const rows=[];
 for(const i of [0,1,2,3,4,25]){
   await cards.nth(i).click();await page.waitForTimeout(120);
   const row=await page.evaluate(i=>{const card=document.querySelectorAll('#chars .ch')[i],name=document.getElementById('oppName'),portrait=document.getElementById('oppPortrait');const pane=name?.parentElement?.parentElement||name?.parentElement;return{i,cardText:String(card?.innerText||'').replace(/\s+/g,' ').trim(),oppName:String(name?.textContent||'').trim(),oppPane:String(pane?.innerText||'').replace(/\s+/g,' ').trim(),portrait:String(portrait?.innerText||'').replace(/\s+/g,' ').trim()};},i);
   rows.push(row);console.log('HIERARCHY_ROW '+JSON.stringify(row));
 }
 console.log('HIERARCHY_SUMMARY '+JSON.stringify({cards:await cards.count(),rows,coi:await page.evaluate(()=>crossOriginIsolated)}));
}finally{await browser.close()}
