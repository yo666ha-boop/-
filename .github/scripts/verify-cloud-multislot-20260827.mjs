import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';

const source = fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');

function makeSave(savedAt=1000, ci=1, ply=0){
  return {version:1,savedAt,ci,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}};
}

function makeEnv({config=null,metaV1=null,metaV2=null,save=null,online=true,prompts=[],confirms=[],fetchImpl}){
  const store=new Map();
  if(config)store.set('aiShogiCloudConfigV1',JSON.stringify(config));
  if(metaV1)store.set('aiShogiCloudMetaV1',JSON.stringify(metaV1));
  if(metaV2)store.set('aiShogiCloudMetaV2',JSON.stringify(metaV2));
  if(save)store.set('aiShogiGameSaveV1',JSON.stringify(save));
  const elements=new Map();
  const controls={id:'controls',children:[],appendChild(el){this.children.push(el);if(el.id)elements.set(el.id,el);el.parentElement=this;return el}};
  const document={
    querySelector(sel){return sel==='.controls'?controls:null},
    createElement(tag){return {tagName:String(tag).toUpperCase(),textContent:'',title:'',disabled:false,parentElement:null}},
    getElementById(id){return elements.get(id)||null},
  };
  const promptCalls=[];let pi=0,ci=0;
  const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const listeners={};
  const window={
    localStorage,
    crypto:webcrypto,
    addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
    dispatchEvent(ev){for(const fn of listeners[ev.type]||[])fn(ev)},
    AI_SHOGI_SAVE:{load(){window.__loaded=(window.__loaded||0)+1}},
  };
  const context={
    window,document,localStorage,navigator:{onLine:online},crypto:webcrypto,TextEncoder,TextDecoder,
    Event:class Event{constructor(type){this.type=type}},
    Headers:globalThis.Headers,Request:globalThis.Request,Response:globalThis.Response,URL,
    btoa:s=>Buffer.from(s,'binary').toString('base64'),
    setTimeout,clearTimeout,
    prompt:(text,def='')=>{promptCalls.push({text,def});return pi<prompts.length?prompts[pi++]:null},
    confirm:()=>ci<confirms.length?confirms[ci++]:false,
    fetch:fetchImpl||(()=>{throw new Error('unexpected fetch')}),
    console,
  };
  window.document=document;window.navigator=context.navigator;window.fetch=context.fetch;window.prompt=context.prompt;window.confirm=context.confirm;
  vm.createContext(context);vm.runInContext(source,context,{filename:'cloud-save21531.js'});
  return {context,window,store,promptCalls,elements,controls};
}

async function settle(){await new Promise(r=>setTimeout(r,20))}

async function testTwoSlotRestore(){
  const calls=[];
  const slots=[
    {slotId:'slot_a',slotName:'パパ',revision:2,updatedAt:2000,savedAt:2000,ply:12},
    {slotId:'slot_b',slotName:'みっちゃん',revision:4,updatedAt:4000,savedAt:4000,ply:34},
  ];
  const beta=makeSave(4000,7,34);
  const env=makeEnv({
    config:{syncKey:'A'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_a',api:'https://example.test/shogi-save',enabled:true,activeSlotId:'',activeSlotName:'',multislotReady:true},
    prompts:['2'],
    fetchImpl:async (url,opts={})=>{
      calls.push({url:String(url),method:opts.method||'GET'});
      if(String(url).includes('mode=list'))return new Response(JSON.stringify({ok:true,slots}),{status:200});
      if(String(url).includes('slot=slot_b'))return new Response(JSON.stringify({ok:true,record:{slotId:'slot_b',slotName:'みっちゃん',revision:4,payload:beta}}),{status:200});
      throw new Error('unexpected '+url);
    }
  });
  await settle();
  await env.window.AI_SHOGI_CLOUD_SAVE.restoreFlow();
  const restored=JSON.parse(env.store.get('aiShogiGameSaveV1'));
  const cfg=JSON.parse(env.store.get('aiShogiCloudConfigV1'));
  assert.equal(restored.savedAt,4000);
  assert.equal(cfg.activeSlotId,'slot_b');
  assert.equal(cfg.activeSlotName,'みっちゃん');
  assert.equal(env.window.__loaded,1);
  assert.match(env.promptCalls.at(-1).text,/1\. パパ/);
  assert.match(env.promptCalls.at(-1).text,/2\. みっちゃん/);
  assert.equal(calls.filter(x=>x.url.includes('mode=list')).length,1);
  assert.equal(calls.filter(x=>x.url.includes('slot=slot_b')).length,1);
}

async function testOneSlotStillRequiresChoice(){
  const prompts=['1'];
  const env=makeEnv({
    config:{syncKey:'B'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_b',api:'https://example.test/shogi-save',enabled:true,activeSlotId:'',activeSlotName:'',multislotReady:true},
    prompts,
    fetchImpl:async (url)=>{
      if(String(url).includes('mode=list'))return new Response(JSON.stringify({ok:true,slots:[{slotId:'slot_only',slotName:'まま',revision:1,updatedAt:3000,savedAt:3000,ply:8}]}),{status:200});
      if(String(url).includes('slot=slot_only'))return new Response(JSON.stringify({ok:true,record:{slotId:'slot_only',slotName:'まま',revision:1,payload:makeSave(3000,3,8)}}),{status:200});
      throw new Error('unexpected '+url);
    }
  });
  await settle();
  await env.window.AI_SHOGI_CLOUD_SAVE.restoreFlow();
  assert.equal(env.promptCalls.length,1,'single save must still ask which save to resume');
  assert.match(env.promptCalls[0].text,/1\. まま/);
}

async function testPushUsesActiveSlot(){
  let sent=null;
  const env=makeEnv({
    config:{syncKey:'C'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_c',api:'https://example.test/shogi-save',enabled:true,activeSlotId:'slot_papa',activeSlotName:'パパ',multislotReady:true},
    metaV2:{slots:{slot_papa:{revision:5,lastSyncedSavedAt:4500,pending:true,lastError:'',updatedAt:1}}},
    save:makeSave(5000,2,20),
    fetchImpl:async (url,opts={})=>{
      if((opts.method||'GET')==='PUT'){
        sent=JSON.parse(opts.body);
        return new Response(JSON.stringify({ok:true,record:{slotId:'slot_papa',slotName:'パパ',revision:6,payload:makeSave(5000,2,20)}}),{status:200});
      }
      if(String(url).includes('slot=slot_papa'))return new Response(JSON.stringify({ok:true,record:{slotId:'slot_papa',slotName:'パパ',revision:5,payload:makeSave(4500,2,19)}}),{status:200});
      throw new Error('unexpected '+url);
    }
  });
  await env.window.AI_SHOGI_CLOUD_SAVE.push();
  assert.equal(sent.slotId,'slot_papa');
  assert.equal(sent.slotName,'パパ');
  assert.equal(sent.baseRevision,5);
}

async function testLegacyMigratesToDefaultSlotWithoutDataLoss(){
  const local=makeSave(6000,4,25);
  const env=makeEnv({
    online:false,
    config:{syncKey:'D'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_d',api:'https://example.test/shogi-save',enabled:true},
    metaV1:{revision:3,lastSyncedSavedAt:5900,pending:false,lastError:'',updatedAt:1},
    save:local,
  });
  await settle();
  const cfg=JSON.parse(env.store.get('aiShogiCloudConfigV1'));
  assert.equal(cfg.activeSlotId,'default');
  assert.equal(cfg.activeSlotName,'これまでの保存');
  assert.equal(cfg.multislotReady,true);
  assert.equal(JSON.parse(env.store.get('aiShogiGameSaveV1')).savedAt,6000);
}

await testTwoSlotRestore();
await testOneSlotStillRequiresChoice();
await testPushUsesActiveSlot();
await testLegacyMigratesToDefaultSlotWithoutDataLoss();

const coi=fs.readFileSync('shogi-v21528/coi-serviceworker.js','utf8');
assert.match(coi,/cloud-save21531\.js\?v=21532a/);
assert.match(coi,/ai-shogi-coi-reload-21532a/);
assert.match(source,/backend:'supabase-edge-cas-multislot-v2'/);
console.log('PASS cloud multislot: selectable restore, single-slot choice, slot push, legacy migration, cache key');
