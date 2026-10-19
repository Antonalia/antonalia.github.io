'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const MARKER='<!-- friends-hotel-search-entry -->';
const PUBLIC_FILES=['index.html','style.css','app.mjs','config.js','visuals.mjs','table-view.mjs','arrival-view.mjs','display-mode.mjs','tabletop.css','polish.css','board-layout.css','chinese.mjs','interaction-rules.mjs','card-art.mjs','preview-engine.mjs','assets/hotel-vienna.png','assets/guest-portraits.png','assets/guest-portraits-v2.png','assets/staff-portraits.png'];
function projectDir(){
  if(process.env.GAH_PROJECT_DIR)return process.env.GAH_PROJECT_DIR;
  // Preserve this computer's existing local save; CI uses the checked-in project.
  const local=path.join(os.homedir(),'Documents','ChatGPT','CRworld','work','grand-austria-hotel');
  return fs.existsSync(path.join(local,'package.json'))?local:path.join(__dirname,'..','apps','grand-austria-hotel');
}
const basePath=root=>(String(root||'/').replace(/\/+$/,'')+'/friends-hotel');
const xmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

function appendSearchEntry(xml,root='/'){
  if(xml.includes(MARKER))return xml;
  if(!xml.includes('</search>'))throw new Error('Search index is not a Fluid search document');
  const url=xmlEscape(basePath(root)+'/');
  const entry=`${MARKER}\n<entry><title>奥地利大饭店 · 好友联机</title><link href="${url}"/><url>${url}</url><content type="html"><![CDATA[奥地利大饭店 Grand Austria Hotel 好友联机桌游。输入好友访问密码后创建或加入房间。]]></content></entry>\n`;
  return xml.replace('</search>',entry+'</search>');
}
function configScript(root='/',apiOrigin=''){
  let base=basePath(root);
  if(apiOrigin){const u=new URL(apiOrigin);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('GAH_PUBLIC_API_ORIGIN must be a credential-free HTTPS origin');base=u.origin;}
  return `window.HOTEL_API_BASE = ${JSON.stringify(base)};\n`;
}
function publicRoutes(dir,root='/',apiOrigin=''){
  const route=basePath(root).replace(/^\//,'');
  if(!PUBLIC_FILES.every(file=>fs.existsSync(path.join(dir,'public',file))))return [{path:route+'/index.html',data:'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>奥地利大饭店</title><h1>奥地利大饭店</h1><p>好友饭店尚未上线。请在电脑本地启动博客预览，并确认游戏项目目录已配置。</p></html>'}];
  return PUBLIC_FILES.map(file=>({path:route+'/'+file,data:file==='config.js'?configScript(root,apiOrigin)+(apiOrigin?'':'window.HOTEL_ONLINE_PENDING = true;\n'):fs.readFileSync(path.join(dir,'public',file))}));
}
async function localMiddleware(dir,root='/'){
  // This import stays in a real Node module, outside Hexo's plugin VM.
  const {createBlogGame}=await import(pathToFileURL(path.join(dir,'integrations','hexo.mjs')).href);
  return createBlogGame({basePath:basePath(root)});
}
function install(hexo){
  hexo.extend.generator.register('friends_hotel_page',function(){return publicRoutes(projectDir(),this.config.root,process.env.GAH_PUBLIC_API_ORIGIN);});
  hexo.extend.filter.register('after_generate',async function(){
    const cfg=this.theme.config.search;
    if(!cfg?.enable)return;
    const filename=String(cfg.generate_path||'/local-search.xml').replace(/^\/+/,''),stream=this.route.get(filename);
    if(!stream)return;
    let xml='';for await(const chunk of stream)xml+=chunk.toString();
    this.route.set(filename,appendSearchEntry(xml,this.config.root));
  },20);
  hexo.extend.filter.register('server_middleware',async function(app){
    const mount=basePath(this.config.root);
    try{app.use(mount,await localMiddleware(projectDir(),this.config.root));this.log.info(`好友饭店已接入：${mount}/（博客搜索“奥地利大饭店”）`);}
    catch{this.log.warn('好友饭店本地模块未加载。请检查GAH_PROJECT_DIR；博客其他页面继续可用。');}
  },1);
}
module.exports={install,appendSearchEntry,publicRoutes,configScript,localMiddleware,projectDir,basePath};
