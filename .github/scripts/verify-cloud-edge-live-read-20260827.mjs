import assert from 'node:assert/strict';

const url='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const key='LIVE_READ_SMOKE_20260827_abcdefghijklmnop';
const origin='https://ai-shogi-yaneuraou-iphone.vercel.app';
const headers={Authorization:'Bearer '+key,Origin:origin};

const list=await fetch(url+'?mode=list',{headers,cache:'no-store'});
const listJson=await list.json();
assert.equal(list.status,200);
assert.equal(listJson.ok,true);
assert.deepEqual(listJson.slots,[]);
assert.equal(list.headers.get('access-control-allow-origin'),origin);

const legacy=await fetch(url,{headers,cache:'no-store'});
const legacyJson=await legacy.json();
assert.equal(legacy.status,200);
assert.equal(legacyJson.ok,true);
assert.equal(legacyJson.record,null);

const bad=await fetch(url+'?slot=bad%21',{headers,cache:'no-store'});
const badJson=await bad.json();
assert.equal(bad.status,400);
assert.equal(badJson.ok,false);
assert.equal(badJson.error,'invalid_slot_id');

console.log('PASS live edge read smoke: multislot list, legacy GET, invalid slot, CORS');
