import assert from 'node:assert/strict';
import http from 'node:http';
import { firefox } from 'playwright';
import proxy from '../../preview/fullapp-unified21602-vercel/api/proxy.js';

const EXPECTED_HEAD='b05834a8088fd2e8b73847d74a6aa09df442e81a';

function resAdapter(res){
  return {
    statusCode:200,
    setHeader:(k,v)=>res.setHeader(k,v),
    end:value=>res.end(value)
  };
}
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  let p=u.pathname.replace(/^\/+/, '');
  if(!p||p==='shogi-v21528'||p==='shogi-v21528/')p='shogi-v21528/index.html';
  else if(p.endsWith('/'))p+='index.html';
  try{
    await proxy({query:{path:p},headers:req.headers},resAdapter(res));
  }catch(e){
    res.statusCode=500;
    res.end(String(e?.stack||e));
  }
});
await new Promise(resolve=>server.listen(4199,'127.0.0.1',resolve));

let browser;
try{
  browser=await firefox.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('dialog',d=>d.accept());

  const response=await page.goto('http://127.0.0.1:4199/shogi-v21528/?proxy21602='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  assert.equal(response?.status(),200);
  assert.equal(response?.headers()['x-shogi-preview-head'],EXPECTED_HEAD);

  await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26&&document.getElementById('board')?.children?.length===81&&window.AI_SHOGI_TOURNAMENT?.version==='21594',null,{timeout:180000});
  await page.waitForFunction(()=>document.getElementById('resultBanner')?.dataset?.tourObserve21541==='1',null,{timeout:30000});

  const normal=await page.evaluate(()=>({
    coi:crossOriginIsolated,
    chars:document.querySelectorAll('#chars .ch').length,
    board:document.getElementById('board')?.children?.length||0,
    controls:[...document.querySelectorAll('#newBtn,#undoBtn,#focusBtn')].length,
    cups:window.AI_SHOGI_TOURNAMENT?.cups?.().length||0,
    active:window.AI_SHOGI_TOURNAMENT?.state?.()?.active||null
  }));
  assert.equal(normal.coi,true,JSON.stringify(normal));
  assert.deepEqual({chars:normal.chars,board:normal.board,controls:normal.controls,cups:normal.cups},{chars:26,board:81,controls:3,cups:10});
  assert.equal(normal.active,null,JSON.stringify(normal));

  const started=await page.evaluate(()=>{
    const t=window.AI_SHOGI_TOURNAMENT;
    const ok=t.start('kenshiro');
    const audit=t.audit();
    return{
      ok,
      cup:t.state()?.active?.cupId||'',
      opponent:audit.currentOpponent||'',
      selected:window.AIShogiIOS.char()?.[0]||'',
      board:document.getElementById('board')?.children?.length||0,
      controls:[...document.querySelectorAll('#newBtn,#undoBtn,#focusBtn')].length
    };
  });
  assert.equal(started.ok,true,JSON.stringify(started));
  assert.equal(started.cup,'kenshiro',JSON.stringify(started));
  assert.ok(started.opponent,JSON.stringify(started));
  assert.equal(started.selected,started.opponent,JSON.stringify(started));
  assert.equal(started.board,81);
  assert.equal(started.controls,3);
  assert.deepEqual(pageErrors,[]);

  console.log('PASS_TOURNAMENT21602_FULLAPP_BRANCH_PROXY '+JSON.stringify({normal,started,pageErrors}));
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
