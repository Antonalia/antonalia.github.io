// Authorized release acceptance. Password is read once from stdin, never stored
// or printed. Only newly-created acceptance games are changed.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';
import {createRequire} from 'node:module';
const origin='https://grand-austria-hotel.vercel.app';
let request=fetch,proxyDispatcher;
if(process.env.HTTPS_PROXY||process.env.HTTP_PROXY){
  // Node22 fetch does not automatically use the workstation's configured proxy.
  // Optional tooling only: npm install --prefix test-output/network-runtime
  // undici@6 --no-save --package-lock=false --ignore-scripts
  const undici=createRequire(import.meta.url)('../test-output/network-runtime/node_modules/undici');
  proxyDispatcher=new undici.ProxyAgent(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
  request=(url,options)=>undici.fetch(url,{...options,dispatcher:proxyDispatcher});
}
if(process.stdin.isTTY)process.stdin.setRawMode(true);
let password='';for await(const line of createInterface({input:process.stdin,terminal:false})){password=line;break;}
if(process.stdin.isTTY)process.stdin.setRawMode(false);
assert.ok(password,'Supply the existing game administrator password on stdin.');
let token;
async function call(route,body,expected=200){
  const response=await request(origin+route,{method:body?'POST':'GET',headers:{Origin:'https://antonalia.github.io',...body?{'Content-Type':'application/json'}:{},...token?{Authorization:`Bearer ${token}`}:{}} ,body:body?JSON.stringify(body):undefined});
  const data=await response.json();
  assert.equal(response.status,expected,`${route.replace(/\d{4}/g,'room')}: ${response.status} ${data.error||''}`);return data;
}
function resolve(g,p){
  const e=g.prompt,a={type:'resolve',promptId:e.uid};
  if(e.kind==='soloDraft')return {...a,cards:e.drawn.slice(0,6).map(c=>c.id),returnOrder:e.drawn.slice(6).map(c=>c.id).toReversed()};
  if(e.kind==='moneyEmperor')return {...a,emperor:Math.min(e.amount,Math.max(0,Math.min(13,g.round+4)-p.emperor))};
  if(e.kind!=='penalty')return {...a,skip:true,...e.drawn?{returnOrder:e.drawn.map(c=>c.id)}:{}};
  if(e.penalty==='discardHand')return {...a,cards:p.hand.slice(0,e.amount).map(c=>c.id)};
  if(e.penalty==='removeEndStaff')return {...a,staffId:p.staff.find(c=>c.end).id};
  if(e.penalty==='removePrepared')return {...a,rooms:p.rooms.filter(r=>r.state==='prepared').sort((a,b)=>b.floor-a.floor).slice(0,e.amount).map(r=>r.id)};
  if(e.penalty==='removeOccupied')return {...a,rooms:e.floors.map(f=>p.rooms.find(r=>r.floor===f&&r.state==='occupied').id)};
  throw Error(`Unhandled required choice ${e.penalty}`);
}
const result={date:new Date().toISOString(),origin,checks:[],solo:[]};
try{
  const health=await call('/api/health');assert.equal(health.configured,true);assert.equal(health.canSetup,false);result.checks.push('health configured; initial password setup disabled');
  const login=await call('/api/login',{name:'发布验收',password});password='';token=login.token;const id=login.player.id;
  for(const difficulty of ['easy','medium','hard']){
    let room=await call('/api/rooms',{mode:'solo',difficulty,hotelMode:difficulty==='medium'?'day':'night',name:`[发布验收]Leopold-${difficulty}`},201),steps=0;
    const commit=async(action,requestId=randomUUID(),version=room.version)=>room=await call(`/api/rooms/${room.code}/action`,{action,version,requestId});
    await commit({type:'start'});assert.equal(room.game.solo.difficulty,difficulty);assert.equal(room.game.prompt.drawn.length,10);
    await commit(resolve(room.game,room.game.players.find(p=>p.id===id)));
    await commit({type:'setupGuest',index:4});
    const requestId=randomUUID(),version=room.version;
    await commit({type:'setupRooms',rooms:['1-1','1-2','1-3']},requestId,version);
    assert.equal(room.game.solo.turns,1);assert.equal(room.game.activePlayerId,id);
    const after=room.version;await commit({type:'setupRooms',rooms:['1-1','1-2','1-3']},requestId,version);assert.equal(room.version,after);assert.equal(room.game.solo.turns,1);
    const restored=await call(`/api/rooms/${room.code}`);assert.deepEqual(restored.game.solo,room.game.solo);assert.equal(restored.game.solo.privateStaff,undefined);assert.equal(restored.game.solo.deck,undefined);
    assert.equal(restored.game.players.find(p=>p.bot).hand,undefined);
    while(room.game.phase!=='finished'){
      assert.ok(++steps<600,'Solo acceptance did not finish');
      const g=room.game,p=g.players.find(p=>p.id===id);let action;
      if(g.prompt)action=resolve(g,p);
      else if(g.turn.dieTaken)action={type:'endTurn'};
      else{
        assert.equal(g.activePlayerId,id);const face=g.dice.includes(4)?4:g.dice.find(n=>n!==6)||6;
        action=face===6&&p.money===0?{type:'pass'}:{type:'die',face,asFace:4};
      }
      await commit(action);
    }
    const g=room.game,h=g.players.find(p=>!p.bot),b=g.players.find(p=>p.bot);
    assert.equal(g.solo.turns,14);assert.equal(g.solo.deckCount,6);assert.equal(b.money,0);assert.equal(b.cafe.length,0);
    assert.deepEqual(g.winners,[h.score.total>b.score.total?h.id:b.id]);
    result.solo.push({difficulty,rounds:g.round,automaTurns:g.solo.turns,steps,humanScore:h.score.total,automaScore:b.score.total,passed:true});
    console.log(JSON.stringify({completed:difficulty,rounds:g.round,automaTurns:g.solo.turns,steps}));
  }
  result.checks.push('all three difficulties completed seven rounds and fourteen automatic turns','ten-select-six and staff return order','human night/day with fixed automa night board','request replay deduplication and Neon GET persistence','hidden automa deck/staff identities withheld','strict solo victory and final scores');
  console.log(JSON.stringify(result));
}finally{password='';if(token){await call('/api/logout',{});token=undefined;}process.stdin.pause();await proxyDispatcher?.close();}
