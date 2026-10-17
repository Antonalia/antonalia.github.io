import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
export function createHttpHandler(api,{configScript}={}){return async(req,res)=>{
  if(req.url.startsWith('/api/'))return api(req,res);
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=resolve(publicDir,`.${pathname==='/'?'/index.html':pathname}`);
    if(!file.startsWith(publicDir)||!types[extname(file)]||!['GET','HEAD'].includes(req.method)||!file.startsWith(publicDir.endsWith(sep)?publicDir:publicDir+sep))throw Error();
    const data=pathname==='/config.js'&&configScript!==undefined?configScript:await readFile(file);res.setHeader('Content-Type',types[extname(file)]);res.setHeader('Cache-Control','no-cache');res.end(req.method==='HEAD'?undefined:data);
  }catch{res.statusCode=404;res.end('Not found');}
};}
export function createHttpServer(api,options){return createServer(createHttpHandler(api,options));}
