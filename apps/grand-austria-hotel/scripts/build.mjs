import { mkdir,cp,readFile,writeFile,readdir,rm } from 'node:fs/promises';
import { resolve,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import './build-preview.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),target=resolve(root,'dist');
if(relative(root,target)!=='dist')throw new Error('Build target must stay inside the project dist directory');
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});await cp(resolve(root,'public'),target,{recursive:true});
// A static bundle contains only the explicit public directory. Never package local saves or env files.
const apiOrigin=process.env.PUBLIC_GAME_API_ORIGIN;
if(apiOrigin){const parsed=new URL(apiOrigin);if(parsed.protocol!=='https:'||parsed.pathname!=='/'||parsed.username||parsed.password)throw new Error('PUBLIC_GAME_API_ORIGIN must be a credential-free HTTPS origin');await writeFile(resolve(target,'config.js'),`window.HOTEL_API_BASE = ${JSON.stringify(parsed.origin)};\n`);}
await writeFile(resolve(target,'.nojekyll'),'');
const files=await readdir(target);if(files.some(x=>['.private','.env','lib','node_modules','reference'].includes(x)))throw Error('Unexpected private file in static output');
const html=await readFile(resolve(target,'index.html'),'utf8');if(!html.includes('noindex,nofollow'))throw Error('Missing robots meta');
console.log(`Static bundle ready: ${target}`);
