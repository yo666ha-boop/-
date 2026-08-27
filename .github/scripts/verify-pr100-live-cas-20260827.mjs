import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const API='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const FAMILY_SALT='AI_SHOGI_FAMILY_CODE_V1';
const stamp=Date.now();
const familyCode=`pr100検証${stamp}`;
const slotId=`pr100_${stamp}`;
const slotName='家族切替検証';
const deviceA=`pr100_a_${stamp}`;
const deviceB=`pr100_b_${stamp}`;

const enc=new TextEncoder();
const material=await webcrypto.subtle.importKey('raw',enc.encode(familyCode.normalize('NFKC')),'PBKDF2',false,['deriveBits']);
const bits=await webcrypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(FAMILY_SALT),iterations:120000},material,256);
const syncKey=Buffer.from(bits).toString('base64url');
assert.equal(syncKey.length,43);

const headers={'Authorization':`Bearer ${syncKey}`,'Content-Type':'application/json'};
const makeSave=(savedAt,ply,tag)=>({version:1,savedAt,ci:2,validationTag:tag,st:{b:Array(81).fill(null),h:{},log:Array.from({length:ply},(_,i)=>({i}))}});
async function jsonFetch(url,opts={}){
  const r=await fetch(url,{...opts,headers:{...headers,...(opts.headers||{})},cache:'no-store'});
  const j=await r.json().catch(()=>({ok:false,error:'invalid_response'}));return {r,j};
}

const first=await jsonFetch(API,{method:'PUT',body:JSON.stringify({slotId,slotName,baseRevision:0,deviceId:deviceA,payload:makeSave(stamp,4,'A')})});
assert.equal(first.r.status,200);assert.equal(first.j.ok,true);assert.equal(Number(first.j.record?.revision),1);assert.equal(first.j.record?.slotId,slotId);

const stale=await jsonFetch(API,{method:'PUT',body:JSON.stringify({slotId,slotName,baseRevision:0,deviceId:deviceB,payload:makeSave(stamp+1,8,'STALE')})});
assert.equal(stale.r.status,409);assert.equal(stale.j.error,'revision_conflict');assert.equal(Number(stale.j.record?.revision),1);

const second=await jsonFetch(API,{method:'PUT',body:JSON.stringify({slotId,slotName,baseRevision:1,deviceId:deviceB,payload:makeSave(stamp+2,22,'B')})});
assert.equal(second.r.status,200);assert.equal(second.j.ok,true);assert.equal(Number(second.j.record?.revision),2);

const got=await jsonFetch(`${API}?slot=${encodeURIComponent(slotId)}`);
assert.equal(got.r.status,200);assert.equal(got.j.ok,true);assert.equal(Number(got.j.record?.revision),2);assert.equal(got.j.record?.payload?.validationTag,'B');assert.equal(got.j.record?.payload?.st?.log?.length,22);

const listed=await jsonFetch(`${API}?mode=list`);
assert.equal(listed.r.status,200);assert.equal(listed.j.ok,true);assert.ok(Array.isArray(listed.j.slots));
const found=listed.j.slots.find(x=>x.slotId===slotId);assert.ok(found);assert.equal(found.slotName,slotName);assert.equal(Number(found.revision),2);assert.equal(Number(found.ply),22);

console.log('PASS_PR100_LIVE_SUPABASE_CAS',JSON.stringify({familyCode,slotId,deviceA,deviceB,revision1:1,conflictProtected:true,revision2:2,ply:22,derivedKeyLength:syncKey.length}));
