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
const PASSWORD='246813579'; // Fictional nine-character administrator password; never a deployed credential.
async function fixture({limited=false,setup=false}={}){
  const store=new LocalStore(),api=createApi({store,passwordHash:setup?undefined:await hashPassword(PASSWORD),allowLocalSetup:setup,rateLimiter:new RateLimiter({disabled:!limited})});
  const server=createHttpServer(api);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(path,{token,body,method=body?'POST':'GET',headers={}}={}){const res=await fetch(base+path,{method,headers:{...body?{'Content-Type':'application/json'}:{},...token?{Authorization:`Bearer ${token}`}:{},...headers},body:body?JSON.stringify(body):undefined});return{status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text(),headers:res.headers};}
  return{store,base,call,close:()=>new Promise(resolve=>server.close(resolve))};
}

test('联机桌上工具：全员表态、并发通过一次、反悔同步和过期计时CAS',async t=>{
  const f=await fixture();t.after(f.close);
  const a=(await f.call('/api/login',{body:{name:'甲',password:PASSWORD}})).body,b=(await f.call('/api/login',{body:{name:'乙',password:PASSWORD}})).body;
  let r=(await f.call('/api/rooms',{token:a.token,body:{maxPlayers:2}})).body;
  r=(await f.call(`/api/rooms/${r.code}/join`,{token:b.token,body:{}})).body;
  const byId={[a.player.id]:a,[b.player.id]:b};
  const send=(who,action,{version=r.version,requestId=randomUUID()}={})=>f.call(`/api/rooms/${r.code}/action`,{token:who.token,body:{action,version,requestId}});
  const commit=async(who,action)=>{const res=await send(who,action);assert.equal(res.status,200,JSON.stringify(res.body));r=res.body;return r;};
  await commit(a,{type:'start'});
  while(r.game.phase==='setupGuest')await commit(byId[r.game.activePlayerId],{type:'setupGuest',index:4});
  while(r.game.phase==='setupRooms')await commit(byId[r.game.activePlayerId],{type:'setupRooms',rooms:['1-1','1-2','1-3']});
  const owner=byId[r.game.activePlayerId],other=owner===a?b:a,initialDice=[...r.game.dice];
  await commit(owner,{type:'table-request',kind:'reroll'});
  const proposal=r.game.tableControls.pending;assert.equal(proposal.before,undefined);assert.deepEqual(r.game.dice,initialDice);
  assert.equal((await send(owner,{type:'attract',index:4})).status,400);
  const version=r.version,requestId=randomUUID(),approval={type:'table-vote',proposalId:proposal.id,approve:true};
  const responses=await Promise.all([send(other,approval,{version,requestId}),send(other,approval,{version})]);
  assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);r=responses.find(x=>x.status===200).body;
  assert.equal(r.version,version+1);assert.equal(r.game.tableControls.pending,null);assert.equal(r.game.dice.length,10);
  // Whichever racing request won, fetching the current state cannot expose checkpoints.
  const sync=(await f.call(`/api/rooms/${r.code}`,{token:other.token})).body;
  assert.deepEqual(sync.game.dice,r.game.dice);assert.equal(sync.game.tableControls.history,undefined);
  const before=structuredClone(r.game);await commit(owner,{type:'attract',index:4});
  assert.equal(r.game.tableControls.canReroll,false);await commit(owner,{type:'table-request',kind:'undo'});
  await commit(other,{type:'table-vote',proposalId:r.game.tableControls.pending.id,approve:true});
  assert.deepEqual(r.game.market,before.market);assert.deepEqual(r.game.players.map(p=>p.cafe),before.players.map(p=>p.cafe));assert.deepEqual(r.game.dice,before.dice);
  await commit(a,{type:'clock-config',enabled:true,durationSeconds:5,warningSeconds:1,autoStart:true,autoSkip:true,theme:'rose'});
  const stored=await f.store.room(r.code);stored.game.tableSession.clock.deadline=Date.now()-1;assert.equal(await f.store.saveRoom(stored,stored.version),true);
  const timeoutVersion=r.version;
  const reads=await Promise.all([f.call(`/api/rooms/${r.code}`,{token:a.token}),f.call(`/api/rooms/${r.code}`,{token:b.token})]);
  assert.deepEqual(reads.map(x=>x.body.version),[timeoutVersion+1,timeoutVersion+1]);assert.ok(reads.every(x=>x.body.game.activePlayerId===other.player.id));
  assert.equal((await send(owner,{type:'attract',index:4},{version:timeoutVersion})).status,409);
});
test('official solo room is saved, rejects human joins and hidden bot seats, and commits automatic actions once',async t=>{
  const f=await fixture();t.after(f.close);
  const a=(await f.call('/api/login',{body:{name:'单人甲',password:PASSWORD}})).body,b=(await f.call('/api/login',{body:{name:'乙',password:PASSWORD}})).body;
  let r=(await f.call('/api/rooms',{token:a.token,body:{mode:'solo',difficulty:'hard',hotelMode:'day'}})).body;
  assert.equal(r.game.solo.difficulty,'hard');assert.equal(r.game.players.filter(p=>p.bot).length,1);
  assert.equal((await f.call(`/api/rooms/${r.code}/join`,{token:b.token,body:{}})).status,400);
  assert.equal((await f.call('/api/room-login',{body:{name:'丙',code:r.code}})).status,400);
  assert.equal((await f.call(`/api/rooms/${r.code}`,{token:b.token})).status,403);
  async function commit(action,requestId=randomUUID(),version=r.version){const result=await f.call(`/api/rooms/${r.code}/action`,{token:a.token,body:{action,requestId,version}});assert.equal(result.status,200,JSON.stringify(result.body));r=result.body;return r;}
  await commit({type:'start'});const e=r.game.prompt;assert.equal(e.kind,'soloDraft');assert.equal(e.drawn.length,10);
  assert.equal(r.game.solo.privateStaff,undefined);assert.equal(r.game.solo.deck,undefined);
  await commit({type:'resolve',promptId:e.uid,cards:e.drawn.slice(0,6).map(c=>c.id),returnOrder:e.drawn.slice(6).map(c=>c.id)});
  await commit({type:'setupGuest',index:4});const requestId=randomUUID(),version=r.version;
  await commit({type:'setupRooms',rooms:['1-1','1-2','1-3']},requestId,version);assert.equal(r.game.solo.turns,1);assert.equal(r.game.activePlayerId,a.player.id);
  const after=structuredClone(r);await commit({type:'setupRooms',rooms:['1-1','1-2','1-3']},requestId,version);assert.equal(r.version,after.version);assert.equal(r.game.solo.turns,1);
  const read=(await f.call(`/api/rooms/${r.code}`,{token:a.token})).body;assert.deepEqual(read.game.solo,r.game.solo);assert.deepEqual(read.game.market,r.game.market);
  const rooms=(await f.call('/api/me',{token:a.token})).body.rooms;assert.equal(rooms.find(x=>x.code===r.code).mode,'solo');
});

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

test('四位邀请码可直接进入指定房间，不能创建房间、跨房间或升级管理员权限',async t=>{
  const f=await fixture();t.after(f.close);
  const admin=(await f.call('/api/login',{body:{name:'房主',password:PASSWORD}})).body;
  assert.equal(admin.access,'admin');
  let room=(await f.call('/api/rooms',{token:admin.token,body:{maxPlayers:2}})).body;
  const other=(await f.call('/api/rooms',{token:admin.token,body:{}})).body;
  assert.match(room.code,/^[1-9]\d{3}$/);
  const response=await f.call('/api/room-login',{body:{name:'受邀好友',code:room.code,access:'admin'}});
  assert.equal(response.status,200);const invited=response.body;room=invited.room;
  assert.equal(invited.access,'room');assert.equal(room.game.players.length,2);
  assert.equal((await f.call('/api/rooms',{token:invited.token,body:{}})).status,403);
  for(const path of [`/api/rooms/${other.code}`,`/api/rooms/${other.code}/join`])assert.equal((await f.call(path,{token:invited.token,...path.endsWith('join')?{body:{}}:{}})).status,403);
  const who=(await f.call('/api/me',{token:invited.token})).body;
  assert.equal(who.access,'room');assert.deepEqual(who.rooms.map(r=>r.code),[room.code]);
  const count=Object.keys(f.store.data.sessions).length;
  assert.equal((await f.call('/api/room-login',{body:{name:'第三人',code:room.code}})).status,400);
  assert.equal(Object.keys(f.store.data.sessions).length,count);
  const byId={[admin.player.id]:admin,[invited.player.id]:invited};
  const act=(session,action)=>f.call(`/api/rooms/${room.code}/action`,{token:session.token,body:{version:room.version,requestId:randomUUID(),action}});
  assert.equal((await act(invited,{type:'start'})).status,400);
  room=(await act(admin,{type:'start'})).body;
  assert.equal((await f.call('/api/room-login',{body:{name:'晚到好友',code:room.code}})).status,400);
  while(room.game.phase==='setupGuest'){const r=await act(byId[room.game.activePlayerId],{type:'setupGuest',index:4});assert.equal(r.status,200);room=r.body;}
  while(room.game.phase==='setupRooms'){const r=await act(byId[room.game.activePlayerId],{type:'setupRooms',rooms:['1-1','1-2','1-3']});assert.equal(r.status,200);room=r.body;}
  const restored=(await f.call(`/api/rooms/${room.code}`,{token:invited.token})).body;
  assert.equal(restored.game.phase,'turn');assert.equal(restored.game.players.find(p=>p.id===invited.player.id).hand.length,6);
  assert.equal(restored.game.players.find(p=>p.id===admin.player.id).hand,undefined);
  await f.store.mutate(data=>{data.rooms[room.code].instanceId='replacement-room';});
  assert.equal((await f.call(`/api/rooms/${room.code}`,{token:invited.token})).status,403);
});

test('邀请码格式、有效期和入口尝试次数由服务端检查',async t=>{
  const f=await fixture();t.after(f.close);
  for(const code of ['123','12a4','12345'])assert.equal((await f.call('/api/room-login',{body:{name:'好友',code}})).status,400);
  assert.equal((await f.call('/api/room-login',{body:{name:'好友',code:'0000'}})).status,401);
  const admin=(await f.call('/api/login',{body:{name:'房主',password:PASSWORD}})).body;
  const room=(await f.call('/api/rooms',{token:admin.token,body:{}})).body;
  await f.store.mutate(data=>{data.rooms[room.code].expiresAt=Date.now()-1;});
  assert.equal((await f.call('/api/room-login',{body:{name:'好友',code:room.code}})).status,401);
  const limited=await fixture({limited:true});t.after(limited.close);
  for(let i=0;i<8;i++)assert.equal((await limited.call('/api/room-login',{body:{name:'好友',code:'0000'}})).status,401);
  assert.equal((await limited.call('/api/room-login',{body:{name:'好友',code:'0000'}})).status,429);
});

test('创建四位房间码遇到占用会重试；过期码复用后旧请求不能覆盖新房间',async t=>{
  const f=await fixture();t.after(f.close);const create=f.store.createRoom.bind(f.store);let attempts=0;
  f.store.createRoom=room=>++attempts===1?false:create(room);
  const admin=(await f.call('/api/login',{body:{name:'房主',password:PASSWORD}})).body;
  const response=await f.call('/api/rooms',{token:admin.token,body:{}});assert.equal(response.status,201);assert.equal(attempts,2);assert.match(response.body.code,/^[1-9]\d{3}$/);
  const store=new LocalStore(),old={code:'1234',instanceId:'old',version:0,expiresAt:Date.now()-1,game:{players:[]}},fresh={...old,instanceId:'new',expiresAt:Date.now()+60000};
  assert.equal(await store.createRoom(old),true);assert.equal(await store.createRoom(fresh),true);assert.equal(await store.createRoom(fresh),false);
  assert.equal(await store.saveRoom({...old,version:1},0),false);assert.equal((await store.room('1234')).instanceId,'new');
});
test('本地存档重启后保留会话与对局',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'gah-store-'));
  try{const path=join(dir,'state.json'),a=new LocalStore(path);await a.setInitialPassword('hash');await a.createSession('tokenhash',{id:'p',expiresAt:Date.now()+60000});await a.createRoom({code:'ABCDEFG',version:0,expiresAt:Date.now()+60000,game:{players:[{id:'p'}]}});
    const b=new LocalStore(path);assert.equal(await b.setting('passwordHash'),'hash');assert.equal((await b.session('tokenhash')).id,'p');assert.equal((await b.room('ABCDEFG')).version,0);
  }finally{await rm(join(dir,'state.json'),{force:true});await rmdir(dir);}
});
