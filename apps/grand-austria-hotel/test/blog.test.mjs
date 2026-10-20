import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createBlogGame } from '../integrations/hexo.mjs';
import { LocalStore } from '../lib/store.mjs';
import { hashPassword } from '../lib/auth.mjs';

test('博客子路径：同源密码接口、独立玩家、公开静态文件与私有路径边界',async t=>{
  const password='blog-fixture-password',handler=createBlogGame({store:new LocalStore(),passwordHash:await hashPassword(password),allowLocalSetup:true});
  const prefix='/friends-hotel';
  const server=createServer((req,res)=>{if(!req.url.startsWith(prefix+'/')){res.statusCode=404;res.end();return;}req.url=req.url.slice(prefix.length);handler(req,res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`,base=origin+prefix;
  assert.equal((await fetch(base+'/')).status,200);
  const manifestResponse=await fetch(base+'/manifest.webmanifest');
  assert.match(manifestResponse.headers.get('content-type'),/application\/manifest\+json/);
  const manifest=await manifestResponse.json();
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
  for(const entry of [...manifest.icons,{src:'./assets/icon-180.png'}]){
    const response=await fetch(base+'/'+entry.src.replace(/^\.\//,''));assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);
  }
  assert.match(await fetch(base+'/config.js').then(r=>r.text()),/HOTEL_API_BASE = "\/friends-hotel"/);
  assert.equal((await fetch(base+'/.private/blog-state.json')).status,404);
  assert.equal((await fetch(base+'/lib/game.mjs')).status,404);
  assert.equal((await fetch(base+'/api/me')).status,401);
  const call=(path,body,token)=>fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...token?{Authorization:`Bearer ${token}`} : {}},body:JSON.stringify(body)});
  assert.equal((await call('/api/login',{name:'甲',password:'wrong'})).status,401);
  const a=await call('/api/login',{name:'甲',password}).then(r=>r.json()),b=await call('/api/login',{name:'乙',password}).then(r=>r.json());
  assert.notEqual(a.player.id,b.player.id);
  const room=await call('/api/rooms',{maxPlayers:2},a.token).then(r=>r.json());
  const joined=await call(`/api/rooms/${room.code}/join`,{},b.token).then(r=>r.json());
  assert.equal(joined.game.players.length,2);
  assert.equal((await fetch(base+'/api/health',{headers:{Origin:'https://untrusted.example'}})).status,403);
});
