import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.wasm':'application/wasm','.bin':'application/octet-stream','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
http.createServer((q,s)=>{
  let n=decodeURIComponent(new URL(q.url,'http://x').pathname);
  if(n.endsWith('/'))n+='index.html';
  const f=path.resolve(root,'.'+n);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end('404')}
  s.setHeader('Cross-Origin-Opener-Policy','same-origin');
  s.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  s.setHeader('Cross-Origin-Resource-Policy','same-origin');
  s.setHeader('Cache-Control','no-store');
  s.setHeader('Content-Type',mime[path.extname(f).toLowerCase()]||'application/octet-stream');
  fs.createReadStream(f).pipe(s);
}).listen(4239,'127.0.0.1',()=>console.log('lower8 quality server 4239'));
