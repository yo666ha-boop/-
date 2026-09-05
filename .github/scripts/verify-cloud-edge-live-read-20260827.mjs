import assert from 'node:assert/strict';

const url='https://htvfcdktdjtyoyzrohji.supabase.co/functions/v1/shogi-save';
const key='LIVE_READ_SMOKE_20260827_abcdefghijklmnop';
const vercelOrigin='https://ai-shogi-yaneuraou-iphone.vercel.app';
const fireOrigin='http://127.0.0.1:43123';

const authHeaders=origin=>({Authorization:'Bearer '+key,Origin:origin});

async function verifyOrigin(origin){
  const headers=authHeaders(origin);
  const list=await fetch(url+'?mode=list',{headers,cache:'no-store'});
  const listJson=await list.json();
  assert.equal(list.status,200,'list status for '+origin);
  assert.equal(listJson.ok,true,'list ok for '+origin);
  assert.ok(Array.isArray(listJson.slots),'slots array for '+origin);
  assert.equal(list.headers.get('access-control-allow-origin'),origin,'CORS echo for '+origin);

  const preflight=await fetch(url+'?mode=list',{
    method:'OPTIONS',
    headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'},
    cache:'no-store'
  });
  assert.equal(preflight.status,204,'preflight status for '+origin);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origin,'preflight CORS for '+origin);
}

await verifyOrigin(vercelOrigin);
await verifyOrigin(fireOrigin);

const fireHeaders={...authHeaders(fireOrigin),'Content-Type':'application/json'};
const slotId='fire_smoke_'+Date.now();
const slotName='Fire cloud smoke';
const payload={
  version:1,
  savedAt:Date.now(),
  st:{b:Array(81).fill(null),h:{S:{},G:{}},log:[]}
};

try {
  const put=await fetch(url,{method:'PUT',headers:fireHeaders,cache:'no-store',body:JSON.stringify({slotId,slotName,baseRevision:0,deviceId:'fire_smoke_device_20260828',payload})});
  const putJson=await put.json();
  assert.equal(put.status,200,'Fire PUT status');
  assert.equal(putJson.ok,true,'Fire PUT ok');
  assert.equal(putJson.record?.slotId,slotId,'Fire PUT slot id');
  assert.equal(put.headers.get('access-control-allow-origin'),fireOrigin,'Fire PUT CORS');

  const get=await fetch(url+'?slot='+encodeURIComponent(slotId),{headers:authHeaders(fireOrigin),cache:'no-store'});
  const getJson=await get.json();
  assert.equal(get.status,200,'Fire GET slot status');
  assert.equal(getJson.ok,true,'Fire GET slot ok');
  assert.equal(getJson.record?.slotId,slotId,'Fire GET slot id');
  assert.equal(getJson.record?.slotName,slotName,'Fire GET slot name');

  const listAfterPut=await fetch(url+'?mode=list',{headers:authHeaders(fireOrigin),cache:'no-store'});
  const listAfterPutJson=await listAfterPut.json();
  assert.equal(listAfterPut.status,200,'Fire list after PUT');
  assert.ok(listAfterPutJson.slots.some(s=>s?.slotId===slotId),'Fire list contains new slot');

  const del=await fetch(url,{method:'DELETE',headers:fireHeaders,cache:'no-store',body:JSON.stringify({mode:'slot',slotId})});
  const delJson=await del.json();
  assert.equal(del.status,200,'Fire DELETE status');
  assert.equal(delJson.ok,true,'Fire DELETE ok');
  assert.equal(delJson.mode,'slot','Fire DELETE mode');
  assert.ok(Number(delJson.deleted)>=1,'Fire DELETE removed row');
  assert.equal(del.headers.get('access-control-allow-origin'),fireOrigin,'Fire DELETE CORS');

  const getAfterDelete=await fetch(url+'?slot='+encodeURIComponent(slotId),{headers:authHeaders(fireOrigin),cache:'no-store'});
  const getAfterDeleteJson=await getAfterDelete.json();
  assert.equal(getAfterDelete.status,200,'Fire GET after delete status');
  assert.equal(getAfterDeleteJson.ok,true,'Fire GET after delete ok');
  assert.equal(getAfterDeleteJson.record,null,'Fire slot removed');
} finally {
  await fetch(url,{method:'DELETE',headers:fireHeaders,cache:'no-store',body:JSON.stringify({mode:'slot',slotId})}).catch(()=>{});
}

const headers=authHeaders(vercelOrigin);
const legacy=await fetch(url,{headers,cache:'no-store'});
const legacyJson=await legacy.json();
assert.equal(legacy.status,200);
assert.equal(legacyJson.ok,true);

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

console.log('PASS live edge Fire cloud: preflight + list + PUT + GET + list + DELETE + GET-empty; Vercel compatibility retained; LAN origin rejected');
