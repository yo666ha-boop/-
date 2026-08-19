import { webkit, chromium } from 'playwright';
import fs from 'fs';
const mode=process.env.PLATFORM||'desktop';
const cfg={
  iphone:{type:webkit,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',viewports:[{width:390,height:844},{width:844,height:390}]},
  fire:{type:chromium,ua:'Mozilla/5.0 (Linux; U; en-US; KFMAWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/124.5.3 like Chrome/124.0 Safari/535.19',viewports:[{width:800,height:1280},{width:1280,height:800}]},
  desktop:{type:chromium,ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',viewports:[{width:1440,height:900}]}
}[mode];if(!cfg)throw Error('bad platform '+mode);
let launch={headless:true};if(mode!=='iphone'){const exe=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);if(!exe)throw Error('system Chrome missing');launch.executablePath=exe;}
const browser=await cfg.type.launch(launch);
try{
  const page=await browser.newPage({userAgent:cfg.ua,viewport:cfg.viewports[0]});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:4217/shogi-v21528/index.html?finalAudit='+mode+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:120000});
  await page.waitForTimeout(1800);
  const base=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('#chars .ch')],names=cards.map(c=>(c.querySelector('.chName')?.textContent||c.querySelector('img')?.alt||'').trim());
    const badImages=cards.map((c,i)=>({i,name:names[i],img:c.querySelector('img')})).filter(x=>!x.img?.complete||x.img.naturalWidth<1).map(x=>x.name||String(x.i));
    const sound=window.AI_SHOGI_PIECE_SOUND?.audit?.()||null,save=window.AI_SHOGI_GAME_SAVE||null,side=document.getElementById('sideSelect2157');
    return{cards:cards.length,names,unique:new Set(names).size,badImages,coi:crossOriginIsolated,webAudit:window.AI_SHOGI_WEB_AUDIT||null,sound,save:{api:!!save,version:save?.version||'',saveBtn:!!document.getElementById('saveGameBtn21530'),resumeBtn:!!document.getElementById('resumeGameBtn21530')},side:{exists:!!side,values:side?[...side.options].map(o=>o.value):[]},futureApi:!!window.AI_SHOGI_YANEURAOU_FUTURE};
  });
  const expectedNames=['みつき','みっちゃん','あき王','おにまま','まま'];for(let i=0;i<5;i++)if(base.names[i]!==expectedNames[i])throw Error('top name '+i+' '+base.names[i]);if(base.names[25]!=='未来からやってきたみつき')throw Error('Future slot '+base.names[25]);
  if(base.cards!==26||base.unique!==26||base.badImages.length||!base.coi||!base.futureApi)throw Error('base '+JSON.stringify(base));
  if(base.sound?.enabled!==true||base.sound?.buttons!==2)throw Error('sound '+JSON.stringify(base.sound));
  if(!base.save.api||!base.save.saveBtn||!base.save.resumeBtn)throw Error('save '+JSON.stringify(base.save));
  if(!base.side.exists||JSON.stringify(base.side.values)!==JSON.stringify(['sente','gote','random']))throw Error('side '+JSON.stringify(base.side));
  const rankTargets=[[25,'強さ1位・未来最強'],[0,'強さ2位・現代最強'],[1,'強さ3位'],[2,'強さ4位'],[3,'強さ5位'],[4,'強さ6位']];const ranks=[];
  for(const [i,want] of rankTargets){await page.locator('#chars .ch').nth(i).click();await page.waitForTimeout(90);const got=await page.locator('#oppRank').textContent();ranks.push({i,got:String(got||'').trim()});if(String(got||'').trim()!==want)throw Error('rank '+i+' want='+want+' got='+got);}
  const layouts=[];
  for(const vp of cfg.viewports){await page.setViewportSize(vp);await page.waitForTimeout(180);const normal=await page.evaluate(()=>{const b=document.getElementById('board')?.getBoundingClientRect(),p=document.getElementById('oppPortrait')?.getBoundingClientRect();return{vw:innerWidth,vh:innerHeight,board:b&&{l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width,h:b.height},portrait:p&&{w:p.width,h:p.height},scrollW:document.documentElement.scrollWidth}});if(!normal.board||normal.board.w<120||normal.board.h<120||normal.board.l<-2||normal.board.r>normal.vw+2)throw Error('normal layout '+JSON.stringify({mode,vp,normal}));await page.locator('#focusBtn').click();await page.waitForTimeout(150);const focus=await page.evaluate(()=>{const root=document.getElementById('focus'),b=document.getElementById('fboard')?.getBoundingClientRect(),p=document.getElementById('foppPortrait')?.getBoundingClientRect();return{display:root?getComputedStyle(root).display:'none',vw:innerWidth,vh:innerHeight,board:b&&{l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width,h:b.height},portrait:p&&{w:p.width,h:p.height}}});if(focus.display==='none'||!focus.board||focus.board.w<120||focus.board.h<120||focus.board.l<-2||focus.board.r>focus.vw+2||!focus.portrait||focus.portrait.w<20)throw Error('focus layout '+JSON.stringify({mode,vp,focus}));await page.locator('#closeBtn').click();await page.waitForTimeout(80);layouts.push({vp,normal,focus});}
  if(errors.length)throw Error('pageerrors '+errors.join(' | '));
  console.log('PASS_FINAL_APP_COVERAGE '+JSON.stringify({platform:mode,base:{cards:base.cards,unique:base.unique,badImages:base.badImages,coi:base.coi,sound:base.sound,save:base.save,side:base.side},ranks,layouts}));
}finally{await browser.close()}
