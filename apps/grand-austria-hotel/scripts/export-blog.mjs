// Source export is explicit: never copy local saves, environment files or downloaded art.
import {cp,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
const source=fileURLToPath(new URL('../',import.meta.url));
if(!process.argv[2])throw Error('Usage: node scripts/export-blog.mjs <blog repository>');
const blog=resolve(process.argv[2]),target=join(blog,'apps','grand-austria-hotel');
if(target===source)throw Error('Export destination must differ from the development project');
await mkdir(target,{recursive:true});
for(const name of ['package.json','package-lock.json','README.md','REFERENCE_NOTICES.md','.gitignore','.env.example','server.mjs','vercel.json','启动本地试玩.cmd','启动局域网试玩.cmd'])await copyFile(join(source,name),join(target,name));
for(const name of ['public','lib','api','db','integrations','preview-src','scripts','test','docs','blog-integration'])await cp(join(source,name),join(target,name),{recursive:true});
await mkdir(join(target,'reference'),{recursive:true});
for(const name of ['card-facts-2021.json','guest-order-facts.json','research-notes.md'])await copyFile(join(source,'reference',name),join(target,'reference',name));
for(const [from,to] of [['friends-hotel.cjs','lib/friends-hotel.cjs'],['friends-hotel.js','scripts/friends-hotel.js'],['friends-hotel.test.cjs','test/friends-hotel.test.cjs'],['friends-hotel.md','docs/friends-hotel.md']])await copyFile(join(source,'blog-integration',from),join(blog,to));
console.log(`Exported source and Hexo integration to ${target}`);
