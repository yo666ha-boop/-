const HEAD='7c4873ead72af2276351a2b0c27cfc0ab4f7df37';
const ALLOWED=['shogi-v21528/','shogi/','shogi-side-test/'];

function normalize(value){
  let p=String(value||'').replace(/^\/+/, '');
  try{p=decodeURIComponent(p)}catch{}
  p=p.replace(/^\/+/, '');
  if(!p||p==='shogi-v21528'||p==='shogi-v21528/')return 'shogi-v21528/index.html';
  if(p.includes('..')||p.includes('\\'))return null;
  if(!ALLOWED.some(prefix=>p.startsWith(prefix)))return null;
  if(p.endsWith('/'))p+='index.html';
  return p;
}
function typeFor(path,fallback=''){
  const ext=(path.match(/\.([^.\/]+)$/)||[])[1]?.toLowerCase()||'';
  return ({
    html:'text/html; charset=utf-8',
    js:'text/javascript; charset=utf-8',
    mjs:'text/javascript; charset=utf-8',
    css:'text/css; charset=utf-8',
    json:'application/json; charset=utf-8',
    wasm:'application/wasm',
    bin:'application/octet-stream',
    jpg:'image/jpeg',
    jpeg:'image/jpeg',
    png:'image/png',
    webp:'image/webp',
    svg:'image/svg+xml',
    part:'text/plain; charset=utf-8',
    txt:'text/plain; charset=utf-8'
  })[ext]||fallback||'application/octet-stream';
}
export default async function handler(req,res){
  const path=normalize(req.query?.path);
  if(!path){res.statusCode=400;res.end('bad path');return}
  const url='https://raw.githubusercontent.com/yo666ha-boop/-/'+HEAD+'/'+path;
  const headers={};
  if(req.headers?.range)headers.Range=req.headers.range;
  let upstream;
  try{upstream=await fetch(url,{headers,redirect:'follow',cache:'no-store'})}
  catch(e){res.statusCode=502;res.end('upstream fetch failed');return}
  res.statusCode=upstream.status;
  for(const h of ['content-range','accept-ranges','etag','last-modified']){
    const v=upstream.headers.get(h);if(v)res.setHeader(h,v);
  }
  res.setHeader('Content-Type',typeFor(path,upstream.headers.get('content-type')||''));
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('X-Shogi-Preview-Head',HEAD);
  res.setHeader('X-Shogi-Preview-Path',path);
  const bytes=Buffer.from(await upstream.arrayBuffer());
  res.end(bytes);
}
