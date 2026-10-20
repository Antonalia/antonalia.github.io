'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {appendSearchEntry,publicRoutes,configScript,projectDir}=require('../lib/friends-hotel.cjs');

test('在原有搜索索引追加好友入口，不重复、保留文章、支持博客子目录',()=>{
  const original='<search><entry><title>原文章</title></entry></search>';
  const result=appendSearchEntry(original,'/blog/');
  assert.match(result,/<title>原文章<\/title>/);assert.match(result,/奥地利大饭店/);assert.match(result,/Grand Austria Hotel/);assert.match(result,/<url>\/blog\/friends-hotel\/<\/url>/);
  assert.equal(appendSearchEntry(result,'/blog/'),result);
});
test('只生成公开前端、示例规则包与原创插画，不打包认证、密码、存档或资料',()=>{
  const routes=publicRoutes(projectDir());
  assert.deepEqual(routes.map(r=>r.path),['index.html','manifest.webmanifest','style.css','app.mjs','action-player.mjs','config.js','visuals.mjs','table-view.mjs','arrival-view.mjs','display-mode.mjs','tabletop.css','polish.css','board-layout.css','chinese.mjs','interaction-rules.mjs','card-art.mjs','preview-engine.mjs','assets/hotel-vienna.png','assets/guest-portraits.png','assets/guest-portraits-v2.png','assets/staff-portraits.png','assets/icon-180.png','assets/icon-192.png','assets/icon-512.png'].map(f=>'friends-hotel/'+f));
  assert.match(routes[0].data.toString(),/noindex,nofollow/);
  assert.match(routes.find(r=>r.path.endsWith('config.js')).data,/HOTEL_API_BASE = "\/friends-hotel"/);
  for(const r of routes)assert.doesNotMatch(r.path,/\.private|\.env|lib\/|reference\/|api\//);
});
test('公网配置只允许无凭据的HTTPS API地址；本地默认同源子路径',()=>{
  assert.match(configScript('/blog/'),/\/blog\/friends-hotel/);
  assert.match(configScript('/','https://game-api.example'),/https:\/\/game-api.example/);
  for(const value of ['http://game-api.example','https://user:secret@example.test','https://example.test/path','https://example.test/?secret=x'])assert.throws(()=>configScript('/',value));
});
test('未安装游戏项目时生成说明页，原博客仍可构建',()=>{
  const routes=publicRoutes('missing-fixture-project');assert.equal(routes.length,1);assert.match(routes[0].data,/尚未上线/);
});
test('静态博客缺少公网API时明确显示待开门，配置API后恢复服务端登录',()=>{
  const pending=publicRoutes(projectDir()).find(r=>r.path.endsWith('config.js')).data;
  assert.match(pending,/HOTEL_ONLINE_PENDING = true/);
  const live=publicRoutes(projectDir(),'/','https://game-api.example').find(r=>r.path.endsWith('config.js')).data;
  assert.doesNotMatch(live,/HOTEL_ONLINE_PENDING/);
  assert.doesNotMatch(configScript('/'),/HOTEL_ONLINE_PENDING/,'local middleware must keep the existing password login');
});
