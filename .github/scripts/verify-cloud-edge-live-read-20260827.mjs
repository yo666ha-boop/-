import assert from 'node:assert/strict';

const url='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const key='LIVE_READ_SMOKE_20260827_abcdefghijklmnop';

async function verifyOrigin(origin){
  const headers={Authorization:'Bearer '+key,Origin:origin};
  const list=await fetch(url+'?mode=list',{headers,cache:'no-store'});
  const listJson=await list.json();
  assert.equal(list.status,200,'list status for '+origin);
  assert.equal(listJson.ok,true,'list ok for '+origin);
  assert.deepEqual(listJson.slots,[],'empty smoke slots for '+origin);
  assert.equal(list.headers.get('access-control-allow-origin'),origin,'CORS echo for '+origin);

  const preflight=await fetch(url+'?mode=list',{
    method:'OPTIONS',
    headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'},
    cache:'no-store'
  });
  assert.equal(preflight.status,204,'preflight status for '+origin);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origin,'preflight CORS for '+origin);
}

await verifyOrigin('https://ai-shogi-yaneuraou-iphone.vercel.app');
await verifyOrigin('http://127.0.0.1:43123');

const headers={Authorization:'Bearer '+key,Origin:'https://ai-shogi-yaneuraou-iphone.vercel.app'};
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

const rejected=await fetch(url+'?mode=list',{
  headers:{Authorization:'Bearer '+key,Origin:'http://192.168.1.10:43123'},
  cache:'no-store'
});
assert.equal(rejected.status,403);
const rejectedJson=await rejected.json();
assert.equal(rejectedJson.error,'origin_not_allowed');

console.log('PASS live edge read smoke: Vercel + Fire 127.0.0.1 CORS/preflight, legacy GET, invalid slot, LAN origin rejected');
