// Build a fresh deployment source from explicit inputs. Never traverse the
// development project's private files, local environment, or downloaded sources.
import {cp,copyFile,mkdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../',import.meta.url));
const target=resolve(process.argv[2]||'');
if(!process.argv[2]||target===resolve(source))throw Error('Provide a fresh release directory');
try{await access(target);throw Error('Release directory already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(target,{recursive:true});
for(const file of ['package.json','package-lock.json','vercel.json','.vercelignore'])await copyFile(join(source,file),join(target,file));
for(const dir of ['lib','api','public','preview-src'])await cp(join(source,dir),join(target,dir),{recursive:true});
await mkdir(join(target,'scripts'));
for(const file of ['build.mjs','build-preview.mjs'])await copyFile(join(source,'scripts',file),join(target,'scripts',file));
await mkdir(join(target,'reference'));
await copyFile(join(source,'reference','card-facts-2021.json'),join(target,'reference','card-facts-2021.json'));
await mkdir(join(target,'.vercel'));
await copyFile(join(source,'.vercel','project.json'),join(target,'.vercel','project.json'));
console.log(`Prepared deployment source: ${target}`);
