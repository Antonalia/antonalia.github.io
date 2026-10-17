import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';
import { createHttpServer } from '../lib/http.mjs';
import { LocalStore } from '../lib/store.mjs';
import { hashPassword,RateLimiter } from '../lib/auth.mjs';
import { randomUUID } from 'node:crypto';
const PASSWORD='test-only-strong-password';
async function fixture({limited=false,setup=false}={}){
  const store=new LocalStore(),api=createApi({store,passwordHash:setup?undefined:await hashPassword(PASSWORD),allowLocalSetup:setup,rateLimiter:new RateLimiter({disabled:!limited})});
  const server=createHttpServer(api);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(path,{token,body,method=body?'POST':'GET',headers={}}={}){const res=await fetch(base+path,{method,headers:{...body?{'Content-Type':'application/json'}:{},...token?{Authorization:`Bearer ${token}`}:{},...headers},body:body?JSON.stringify(body):undefined});return{status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text(),headers:res.headers};}
  return{store,base,call,close:()=>new Promise(resolve=>server.close(resolve))};
}
test('密码保护与来源限制：未登录不可列/建/读房间，错误密码拒绝',async t=>{
  const f=await fixture();t.after(f.close);
  assert.equal((await f.call('/api/me')).status,401);assert.equal((await f.call('/api/rooms',{body:{}})).status,401);
  assert.equal((await f.call('/api/login',{body:{name:'甲',password:'wrong'}})).status,401);
  assert.equal((await f.call('/api/health',{headers:{Origin:'https://evil.example'}})).status,403);
  const login=await f.call('/api/login',{body:{name:'甲',password:PASSWORD}});assert.equal(login.status,200);assert.ok(login.body.token);
  assert.equal((await f.call('/api/me',{token:login.body.token})).status,200);
  await f.call('/api/logout',{token:login.body.token,body:{}});assert.equal((await f.call('/api/me',{token:login.body.token})).status,401);
});
test('初始化密码仅一次，密码哈希不在health/静态文件中',async t=>{
  const f=await fixture({setup:true});t.after(f.close);
  assert.equal((await f.call('/api/setup',{body:{password:'short'}})).status,400);
  assert.equal((await f.call('/api/setup',{body:{password:PASSWORD}})).status,201);
  assert.equal((await f.call('/api/setup',{body:{password:PASSWORD}})).status,409);
  const health=await f.call('/api/health');assert.equal(health.body.configured,true);assert.ok(!JSON.stringify(health.body).includes('scrypt'));
  for(const path of ['/.env','/.private/local-state.json','/lib/game.mjs','/reference/card-facts-2021.json','/../package.json'])assert.equal((await f.call(path)).status,404,path);
  const page=await f.call('/');assert.equal(page.status,200);assert.ok(page.headers.get('content-security-policy').includes("script-src 'self'"));
});
test('三个真实HTTP客户端：创建、加入、成员权限、初始化、同步、刷新与重复请求',async t=>{
  const f=await fixture();t.after(f.close);
  const sessions=[];
  for(const name of ['甲','乙','外人'])sessions.push((await f.call('/api/login',{body:{name,password:PASSWORD}})).body);
  const [a,b,c]=sessions,byId=Object.fromEntries(sessions.map(s=>[s.player.id,s]));
  let r=(await f.call('/api/rooms',{token:a.token,body:{maxPlayers:2}})).body;assert.ok(r.code);
  assert.equal((await f.call(`/api/rooms/${r.code}`,{token:c.token})).status,403);
  r=(await f.call(`/api/rooms/${r.code}/join`,{token:b.token,body:{}})).body;
  assert.equal((await f.call(`/api/rooms/${r.code}/join`,{token:c.token,body:{}})).status,400);
  async function act(s,action,requestId=randomUUID(),version=r.version){return f.call(`/api/rooms/${r.code}/action`,{token:s.token,body:{action,requestId,version}});}
  assert.equal((await act(b,{type:'start'})).status,400);
  r=(await act(a,{type:'start'})).body;
  while(r.game.phase==='setupGuest'){const owner=byId[r.game.activePlayerId];r=(await act(owner,{type:'setupGuest',index:4})).body;}
  while(r.game.phase==='setupRooms'){const owner=byId[r.game.activePlayerId];r=(await act(owner,{type:'setupRooms',rooms:['1-1','1-2','1-3']})).body;}
  const owner=byId[r.game.activePlayerId],other=owner===a?b:a;
  assert.equal(r.game.phase,'turn');assert.equal((await act(other,{type:'endTurn'})).status,400);
  r=(await f.call(`/api/rooms/${r.code}`,{token:owner.token})).body;assert.equal(r.game.players.find(p=>p.id===owner.player.id).hand.length,6);assert.equal(r.game.players.find(p=>p.id===other.player.id).hand,undefined);
  const requestId=randomUUID(),version=r.version;
  let response=await act(owner,{type:'die',face:r.game.dice[0],asFace:4},requestId);assert.equal(response.status,200);r=response.body;
  response=await act(owner,{type:'die',face:4},requestId,version);assert.equal(response.status,200);assert.equal(response.body.version,r.version);
  const reloaded=(await f.call(`/api/rooms/${r.code}`,{token:other.token})).body;assert.equal(reloaded.version,r.version);assert.deepEqual(reloaded.game.dice,r.game.dice);
  assert.equal((await act(owner,{type:'endTurn'},randomUUID(),version)).status,409);
  assert.equal((await f.call(`/api/rooms/${r.code}?since=${r.version}`,{token:other.token})).body.unchanged,true);
});
test('同版本并发提交只生效一次，不覆盖其他请求',async t=>{
  const f=await fixture();t.after(f.close);
  const a=(await f.call('/api/login',{body:{name:'甲',password:PASSWORD}})).body;
  const b=(await f.call('/api/login',{body:{name:'乙',password:PASSWORD}})).body;
  let r=(await f.call('/api/rooms',{token:a.token,body:{}})).body;
  r=(await f.call(`/api/rooms/${r.code}/join`,{token:b.token,body:{}})).body;
  const results=await Promise.all([1,2].map(()=>f.call(`/api/rooms/${r.code}/action`,{token:a.token,body:{version:r.version,requestId:randomUUID(),action:{type:'start'}}})));
  assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  assert.equal((await f.call(`/api/rooms/${r.code}`,{token:a.token})).body.version,r.version+1);
});
test('登录防暴力尝试与创建房间限额',async t=>{
  const f=await fixture({limited:true});t.after(f.close);
  for(let i=0;i<8;i++)assert.equal((await f.call('/api/login',{body:{name:'甲',password:'wrong'}})).status,401);
  assert.equal((await f.call('/api/login',{body:{name:'甲',password:PASSWORD}})).status,429);
  const g=await fixture({limited:true});t.after(g.close);
  const player=(await g.call('/api/login',{body:{name:'甲',password:PASSWORD}})).body;
  for(let i=0;i<5;i++)assert.equal((await g.call('/api/rooms',{token:player.token,body:{}})).status,201);
  assert.equal((await g.call('/api/rooms',{token:player.token,body:{}})).status,429);
});
test('内部存储异常不泄漏给客户端，过大JSON请求被拒绝',async t=>{
  const f=await fixture();t.after(f.close);
  assert.equal((await f.call('/api/login',{body:{name:'甲',password:'x'.repeat(33000)}})).status,413);
  f.store.createSession=async()=>{throw new Error('internal connection details: synthetic-private-value');};
  const response=await f.call('/api/login',{body:{name:'甲',password:PASSWORD}});
  assert.equal(response.status,500);assert.deepEqual(response.body,{error:'服务暂时不可用，请稍后重试'});
});
test('本地存档重启后保留会话与对局',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'gah-store-'));
  try{const path=join(dir,'state.json'),a=new LocalStore(path);await a.setInitialPassword('hash');await a.createSession('tokenhash',{id:'p',expiresAt:Date.now()+60000});await a.createRoom({code:'ABCDEFG',version:0,expiresAt:Date.now()+60000,game:{players:[{id:'p'}]}});
    const b=new LocalStore(path);assert.equal(await b.setting('passwordHash'),'hash');assert.equal((await b.session('tokenhash')).id,'p');assert.equal((await b.room('ABCDEFG')).version,0);
  }finally{await rm(join(dir,'state.json'),{force:true});await rmdir(dir);}
});
