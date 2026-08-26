import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const URL='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const ORIGIN='https://yo666ha-boop.github.io';
const code=crypto.randomBytes(24).toString('base64url');
const other=crypto.randomBytes(24).toString('base64url');

function payload(tag,savedAt){return {version:1,savedAt,st:{b:Array(81).fill(null),h:{b:{},w:{}},log:[tag]}}}
async function req(method,key,body,origin=ORIGIN){
  const r=await fetch(URL,{method,headers:{Origin:origin,Authorization:key?`Bearer ${key}`:'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>null);
  return {r,j};
}

let x=await req('GET',code);
assert.equal(x.r.status,200);assert.equal(x.j.ok,true);assert.equal(x.j.record,null);assert.equal(x.r.headers.get('access-control-allow-origin'),ORIGIN);

x=await req('PUT',code,{baseRevision:0,deviceId:'ci_a',payload:payload('A',1000)});
assert.equal(x.r.status,200);assert.equal(x.j.record.revision,1);assert.equal(x.j.record.payload.st.log[0],'A');

x=await req('GET',code);
assert.equal(x.r.status,200);assert.equal(x.j.record.revision,1);

x=await req('PUT',code,{baseRevision:1,deviceId:'ci_b',payload:payload('B',2000)});
assert.equal(x.r.status,200);assert.equal(x.j.record.revision,2);assert.equal(x.j.record.payload.st.log[0],'B');

x=await req('PUT',code,{baseRevision:1,deviceId:'ci_stale',payload:payload('STALE',3000)});
assert.equal(x.r.status,409);assert.equal(x.j.error,'revision_conflict');assert.equal(x.j.record.revision,2);assert.equal(x.j.record.payload.st.log[0],'B');

x=await req('PUT',other,{baseRevision:0,deviceId:'ci_other',payload:payload('OTHER',4000)});
assert.equal(x.r.status,200);assert.equal(x.j.record.revision,1);

x=await req('GET',other);
assert.equal(x.r.status,200);assert.equal(x.j.record.payload.st.log[0],'OTHER');

x=await req('GET','',undefined);
assert.equal(x.r.status,401);assert.equal(x.j.error,'invalid_sync_key');

x=await req('GET',code,undefined,'https://evil.example');
assert.equal(x.r.status,403);assert.equal(x.j.error,'origin_not_allowed');

x=await req('DELETE',code);
assert.equal(x.r.status,405);assert.equal(x.j.error,'method_not_allowed');

console.log('PR87_LIVE_SUPABASE_EDGE '+JSON.stringify({live:true,revisions:[1,2],staleConflict:true,isolatedKeys:true,cors:true,invalidKey:true,badOrigin:true,codeHash:crypto.createHash('sha256').update(code).digest('hex')}));
console.log('PASS_PR87_LIVE_SUPABASE_EDGE_CAS');
