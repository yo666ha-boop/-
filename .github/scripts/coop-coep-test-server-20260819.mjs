import http from 'http';
import fs from 'fs';
import path from 'path';
const root=process.cwd();
const port=Number(process.env.TEST_PORT||4184);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.bin':'application/octet-stream','.db':'application/octet-stream','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/')u='/shogi-v21528/index.html';
  let f=path.join(root,u);
  try{f=fs.realpathSync(f)}catch{}
  if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end('404')}
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('TEST_SERVER_READY '+port));
