import assert from 'node:assert/strict';
import { firefox } from 'playwright';

const browser=await firefox.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  page.on('dialog',async d=>d.accept());
  const url='http://127.0.0.1:8000/shogi-v21528/?historyFullapp21567='+Date.now();
  const boot=async()=>{
    await page.waitForFunction(()=>document.querySelectorAll('#chars .ch').length===26,{timeout:60000});
    await page.waitForFunction(()=>window.AI_SHOGI_TOURNAMENT?.cups?.().length===8&&window.AI_SHOGI_TOURNAMENT_GAME_UI&&window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh&&window.__AI_SHOGI_TOURNAMENT_HISTORY_21567,null,{timeout:60000});
  };
  const transientNavigation=e=>{
    const text=String(e?.stack||e?.message||e||'');
    return text.includes('Execution context was destroyed')||text.includes('Navigation interrupted by another one')||text.includes('NS_BINDING_ABORTED');
  };
  const restorePanel=async()=>{
    await boot();
    await page.evaluate(()=>{
      document.getElementById('tournament21540Panel')?.classList.add('on');
      window.AI_SHOGI_TOURNAMENT?.render?.();
      window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();
      window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh?.();
    });
  };
  const reloadAndRestore=async()=>{
    let lastError;
    for(let attempt=1;attempt<=4;attempt++){
      try{
        await page.reload({waitUntil:'domcontentloaded',timeout:60000});
        await restorePanel();
        return;
      }catch(error){
        lastError=error;
        if(!transientNavigation(error)||attempt===4)throw error;
        await page.waitForLoadState('domcontentloaded',{timeout:60000}).catch(()=>{});
        try{await restorePanel();return}catch(resyncError){
          lastError=resyncError;
          if(!transientNavigation(resyncError)&&attempt===4)throw resyncError;
        }
      }
    }
    throw lastError;
  };
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await boot();

  await page.evaluate(async()=>{
    const t=window.AI_SHOGI_TOURNAMENT,delay=ms=>new Promise(r=>setTimeout(r,ms));
    localStorage.removeItem('aiShogiTournament21540');t.render?.();await delay(80);
    for(const id of ['shinji','ayanami','mitsuki','future']){
      if(t.state()?.active)t.exit();await delay(40);
      if(!t.start(id))throw new Error('start failed '+id);
      t.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();await delay(120);
    }
    document.getElementById('tournament21540Panel')?.classList.add('on');
    window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();
    window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh?.();
  });

  const read=async(requireConnectors=true,expectedSource=4)=>{
    for(let attempt=1;attempt<=5;attempt++){
      try{
        await restorePanel();
        return await page.waitForFunction(({needConnectors,expectedSource})=>{
          window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh?.();
          const a=window.AI_SHOGI_TOURNAMENT_GAME_UI?.audit?.();
          const history=document.querySelector('#tournament21540Panel .tourAttemptHistory21567');
          if(!a?.history21567||!history||a.historySourceCount21567!==expectedSource||a.historyCount21567!==3||a.historyCurrent21567!==1||(needConnectors&&a.connectors!==30)||a.roster!==26||a.bossInBracket!==false)return false;
          return {...a,historyText21567:history.innerText};
        },{needConnectors:requireConnectors,expectedSource},{timeout:60000}).then(h=>h.jsonValue());
      }catch(error){
        if(!transientNavigation(error)||attempt===5)throw error;
        await page.waitForLoadState('domcontentloaded',{timeout:60000}).catch(()=>{});
      }
    }
  };

  const before=await read();
  assert.deepEqual(before.historyItems21567,['future','mitsuki','ayanami']);
  assert.equal(before.historyOverflow21567,0);assert.equal(before.sideOverflow,0);assert.equal(before.docOverflow,0);
  assert.equal(before.connectors,30);assert.equal(before.roster,26);assert.equal(before.bossInBracket,false);
  const textBefore=before.historyText21567;
  assert.match(textBefore,/最近の挑戦/);assert.match(textBefore,/履歴 4件/);assert.match(textBefore,/未来みつき杯/);assert.match(textBefore,/みつき杯/);assert.match(textBefore,/あやなみ杯/);assert.doesNotMatch(textBefore,/しんじ杯/);assert.match(textBefore,/進行中/);assert.doesNotMatch(textBefore,/勝利|敗北/);

  await reloadAndRestore();
  const reloaded=await read(true);
  assert.deepEqual(reloaded.historyItems21567,['future','mitsuki','ayanami']);
  assert.equal(reloaded.historyOverflow21567,0);assert.equal(reloaded.sideOverflow,0);assert.equal(reloaded.docOverflow,0);
  assert.equal(reloaded.connectors,30);assert.equal(reloaded.roster,26);assert.equal(reloaded.bossInBracket,false);
  assert.equal(reloaded.historyResumeUi21578,true);assert.equal(reloaded.historyResumable21578,1);assert.deepEqual(reloaded.historyResumeLabels21578,['続きへ']);
  const textReloaded=reloaded.historyText21567;
  assert.match(textReloaded,/履歴 4件/);assert.match(textReloaded,/未来みつき杯/);assert.match(textReloaded,/進行中/);assert.match(textReloaded,/続きへ/);

  const resumeBefore=await page.evaluate(()=>{const s=window.AI_SHOGI_TOURNAMENT.state(),a=s.active;return{cupId:a?.cupId||'',startedAt:Number(a?.startedAt)||0,round:Number(a?.round)||0,history:s.history?.length||0,panelOpen:!!document.getElementById('tournament21540Panel')?.classList.contains('on')}});
  const resumeClick=await page.evaluate(()=>{
    document.getElementById('tournament21540Panel')?.classList.add('on');
    window.AI_SHOGI_TOURNAMENT?.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();
    const item=document.querySelector('#tournament21540Panel .tourAttemptHistoryItem21567.current[data-resumable="1"]');
    const out={found:!!item,role:item?.getAttribute('role')||'',aria:item?.getAttribute('aria-label')||'',label:item?.querySelector('.tourAttemptHistoryResume21578')?.textContent||''};
    item?.click();return out;
  });
  assert.equal(resumeClick.found,true);assert.equal(resumeClick.role,'button');assert.equal(resumeClick.aria,'未来みつき杯 1回目 進行中 続きへ');assert.equal(resumeClick.label,'続きへ');
  await page.waitForFunction(()=>!document.getElementById('tournament21540Panel')?.classList.contains('on'),null,{timeout:5000});
  const resumed=await page.evaluate(()=>{const s=window.AI_SHOGI_TOURNAMENT.state(),a=s.active;return{cupId:a?.cupId||'',startedAt:Number(a?.startedAt)||0,round:Number(a?.round)||0,history:s.history?.length||0,panelOpen:!!document.getElementById('tournament21540Panel')?.classList.contains('on'),board:!!document.getElementById('board')}});
  assert.deepEqual({cupId:resumed.cupId,startedAt:resumed.startedAt,round:resumed.round,history:resumed.history},{cupId:resumeBefore.cupId,startedAt:resumeBefore.startedAt,round:resumeBefore.round,history:resumeBefore.history});
  assert.equal(resumed.panelOpen,false);assert.equal(resumed.board,true);
  const afterResume=await read(true);
  assert.equal(afterResume.historySourceCount21567,4);assert.equal(afterResume.historyCurrent21567,1);assert.equal(afterResume.historyResumable21578,1);assert.deepEqual(afterResume.historyResumeLabels21578,['続きへ']);assert.equal(afterResume.connectors,30);assert.equal(afterResume.roster,26);assert.equal(afterResume.bossInBracket,false);

  const completedBefore=await page.evaluate(()=>{
    const key='aiShogiTournament21540',s=JSON.parse(localStorage.getItem(key)||'{}');
    s.active.status='lost';s.active.pending=null;s.active.finishedAt=Date.now();localStorage.setItem(key,JSON.stringify(s));
    document.getElementById('tournament21540Panel')?.classList.add('on');window.AI_SHOGI_TOURNAMENT.render?.();window.AI_SHOGI_TOURNAMENT_GAME_UI?.render?.();window.AI_SHOGI_TOURNAMENT_BRACKET_UI?.refresh?.();
    return{cupId:s.active.cupId,startedAt:Number(s.active.startedAt)||0,history:s.history.length,oldHistory0:JSON.stringify(s.history[0])};
  });
  const completed=await read(true,4);
  assert.equal(completed.historyRetryUi21579,true);assert.equal(completed.historyResumable21578,0);assert.equal(completed.historyRetryable21579,1);assert.deepEqual(completed.historyRetryLabels21579,['再挑戦']);assert.equal(completed.historyStateLabels21579[0],'敗退');assert.match(completed.historyText21567,/敗退/);assert.match(completed.historyText21567,/再挑戦/);
  const retryClick=await page.evaluate(()=>{
    const item=document.querySelector('#tournament21540Panel .tourAttemptHistoryItem21567.current[data-retryable="1"]');
    const out={found:!!item,role:item?.getAttribute('role')||'',aria:item?.getAttribute('aria-label')||'',label:item?.querySelector('.tourAttemptHistoryRetry21579')?.textContent||''};item?.click();return out;
  });
  assert.equal(retryClick.found,true);assert.equal(retryClick.role,'button');assert.match(retryClick.aria,/敗退 同じ杯に再挑戦$/);assert.equal(retryClick.label,'再挑戦');
  const afterRetry=await read(true,5);
  const retried=await page.evaluate(()=>{const s=window.AI_SHOGI_TOURNAMENT.state(),a=s.active;return{cupId:a?.cupId||'',startedAt:Number(a?.startedAt)||0,status:a?.status||'',round:Number(a?.round)||0,history:s.history?.length||0,history0:s.history?.[0]||null,history1:s.history?.[1]||null}});
  assert.equal(retried.cupId,completedBefore.cupId);assert.notEqual(retried.startedAt,completedBefore.startedAt);assert.equal(retried.history,completedBefore.history+1);assert.equal(retried.history0.cupId,completedBefore.cupId);assert.equal(Number(retried.history0.startedAt),retried.startedAt);assert.equal(JSON.stringify(retried.history1),completedBefore.oldHistory0);assert.equal(afterRetry.historyRetryable21579,0);assert.equal(afterRetry.historyResumable21578,1);assert.equal(afterRetry.historyCurrent21567,1);assert.equal(afterRetry.connectors,30);assert.equal(afterRetry.roster,26);assert.equal(afterRetry.bossInBracket,false);assert.equal(afterRetry.historyOverflow21567,0);assert.equal(afterRetry.sideOverflow,0);assert.equal(afterRetry.docOverflow,0);
  assert.equal(errors.length,0);

  console.log('PASS_TOURNAMENT21567_RECENT_ATTEMPT_HISTORY_FULLAPP '+JSON.stringify({before:{source:before.historySourceCount21567,items:before.historyItems21567,current:before.historyCurrent21567,overflow:before.historyOverflow21567},reloaded:{source:reloaded.historySourceCount21567,items:reloaded.historyItems21567,current:reloaded.historyCurrent21567,overflow:reloaded.historyOverflow21567},connectors:before.connectors,reloadedConnectors:reloaded.connectors,roster:reloaded.roster,bossInBracket:reloaded.bossInBracket,pageErrors:errors}));
  console.log('PASS_TOURNAMENT21578_HISTORY_RESUME_FULLAPP '+JSON.stringify({click:resumeClick,before:resumeBefore,resumed,after:{source:afterResume.historySourceCount21567,current:afterResume.historyCurrent21567,resumable:afterResume.historyResumable21578,labels:afterResume.historyResumeLabels21578},connectors:afterResume.connectors,roster:afterResume.roster,bossInBracket:afterResume.bossInBracket,pageErrors:errors}));
  console.log('PASS_TOURNAMENT21579_COMPLETED_HISTORY_RETRY_FULLAPP '+JSON.stringify({completedBefore,completed:{retryable:completed.historyRetryable21579,state:completed.historyStateLabels21579[0],label:completed.historyRetryLabels21579[0]},click:retryClick,retried,after:{source:afterRetry.historySourceCount21567,current:afterRetry.historyCurrent21567,retryable:afterRetry.historyRetryable21579,resumable:afterRetry.historyResumable21578,overflow:afterRetry.historyOverflow21567},connectors:afterRetry.connectors,roster:afterRetry.roster,bossInBracket:afterRetry.bossInBracket,pageErrors:errors}));
}finally{await browser.close()}
