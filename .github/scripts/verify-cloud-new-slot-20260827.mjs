import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';

const cloudSource=fs.readFileSync('shogi-v21528/cloud-save21531.js','utf8');
const slotSource=fs.readFileSync('shogi-v21528/cloud-save-slot-ui21532b.js','utf8');
const coiSource=fs.readFileSync('shogi-v21528/coi-serviceworker.js','utf8');

const makeSave=(savedAt=1000,ply=12)=>({version:1,savedAt,ci:1,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});
const store=new Map();
store.set('aiShogiCloudConfigV1',JSON.stringify({syncKey:'A'.repeat(32),familyCode:'家族',codeMode:'family',deviceId:'dev_newslot',api:'https://example.test/shogi-save',enabled:true,activeSlotId:'slot_first',activeSlotName:'1局目',multislotReady:true}));
store.set('aiShogiCloudMetaV2',JSON.stringify({slots:{slot_first:{revision:4,lastSyncedSavedAt:4000,pending:false,lastError:'',updatedAt:4000}}}));
store.set('aiShogiGameSaveV1',JSON.stringify(makeSave(5000,22)));

const elements=new Map();
const controls={id:'controls',children:[],appendChild(el){this.children.push(el);if(el.id)elements.set(el.id,el);el.parentElement=this;return el}};
const document={
  querySelector(sel){return sel==='.controls'?controls:null},
  createElement(tag){return {tagName:String(tag).toUpperCase(),textContent:'',title:'',disabled:false,parentElement:null}},
  getElementById(id){return elements.get(id)||null},
};
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const listeners={};
const window={
  localStorage,crypto:webcrypto,document,
  addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
  dispatchEvent(ev){for(const fn of listeners[ev.type]||[])fn(ev)},
  AI_SHOGI_SAVE:{load(){}},
};
const promptCalls=[];
const prompts=['2局目'];
let promptIndex=0;
let sent=null;
const fetchImpl=async (url,opts={})=>{
  const u=String(url),method=opts.method||'GET';
  if(method==='GET'&&u.includes('mode=list')){
    return new Response(JSON.stringify({ok:true,slots:[{slotId:'slot_first',slotName:'1局目',revision:4,updatedAt:4000,savedAt:4000,ply:12}]}),{status:200});
  }
  if(method==='PUT'){
    sent=JSON.parse(opts.body);
    assert.notEqual(sent.slotId,'slot_first','new save must use a fresh slot id');
    assert.equal(sent.slotName,'2局目');
    assert.equal(sent.baseRevision,0);
    return new Response(JSON.stringify({ok:true,record:{slotId:sent.slotId,slotName:sent.slotName,revision:1,payload:makeSave(5000,22)}}),{status:200});
  }
  throw new Error('unexpected fetch '+method+' '+u);
};
const navigator={onLine:true};
const context={
  window,document,localStorage,navigator,crypto:webcrypto,TextEncoder,TextDecoder,
  Event:class Event{constructor(type){this.type=type}},Headers:globalThis.Headers,Request:globalThis.Request,Response:globalThis.Response,URL,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  setTimeout,clearTimeout,setInterval,clearInterval,
  prompt:(text,def='')=>{promptCalls.push({text,def});return promptIndex<prompts.length?prompts[promptIndex++]:null},
  confirm:()=>false,fetch:fetchImpl,console,
};
window.navigator=navigator;window.fetch=fetchImpl;window.prompt=context.prompt;window.confirm=context.confirm;
vm.createContext(context);
vm.runInContext(cloudSource,context,{filename:'cloud-save21531.js'});
vm.runInContext(slotSource,context,{filename:'cloud-save-slot-ui21532b.js'});

await new Promise(r=>setTimeout(r,180));
const api=window.AI_SHOGI_CLOUD_SAVE;
assert.equal(typeof api.createNewSlot,'function');
const button=document.getElementById('cloudNewSlotBtn');
assert.ok(button,'new slot button must be installed');
assert.equal(button.textContent,'新しい保存を作る');

const before=JSON.parse(store.get('aiShogiCloudMetaV2'));
assert.equal(before.slots.slot_first.revision,4);
const ok=await api.createNewSlot();
assert.equal(ok,true);
assert.ok(sent,'new slot must be pushed');

const cfg=JSON.parse(store.get('aiShogiCloudConfigV1'));
assert.equal(cfg.activeSlotName,'2局目');
assert.notEqual(cfg.activeSlotId,'slot_first');
const after=JSON.parse(store.get('aiShogiCloudMetaV2'));
assert.equal(after.slots.slot_first.revision,4,'first save must remain untouched');
assert.ok(after.slots[cfg.activeSlotId],'second slot metadata must exist');
assert.equal(after.slots[cfg.activeSlotId].revision,1);
assert.equal(after.slots[cfg.activeSlotId].pending,false);
assert.match(promptCalls[0].text,/新しい保存の名前/);

assert.match(coiSource,/cloud-save-slot-ui21532b\.js\?v=21532b/);
assert.match(coiSource,/cloud-save21531\.js\?v=21532a/);
assert.match(coiSource,/ai-shogi-coi-reload-21532a/);
console.log('PASS cloud new slot: first slot preserved, second slot created with fresh id, active sync target moved to second slot');
