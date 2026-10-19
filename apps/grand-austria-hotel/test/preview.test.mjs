import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makePreview,applyAction,viewGame,activeSeat } from '../preview-src/preview.mjs';

for(const board of ['night','day'])for(const scene of ['opening','showcase','finale','overview'])test(`单人示例 ${board}/${scene} 可直接进入，手牌与卡牌保持唯一`,()=>{
  const s=makePreview(scene,board),v=viewGame(s,s.players[0].id);assert.equal(v.players.length,scene==='overview'?4:2);assert.equal(s.phase,scene==='finale'?'finished':'turn');
  assert.equal(s.effects.length,0);assert.equal(v.players[0].hand.length,6);
  if(scene!=='finale')assert.equal(s.dice.length,v.players.length*2+6);
  const guests=[...s.market,...s.guestDeck,...s.players.flatMap(p=>p.cafe.map(c=>c.id))];assert.equal(new Set(guests).size,56);
  const staff=[...s.staffDeck,...s.players.flatMap(p=>[...p.hand,...p.staff.map(c=>c.id)])];assert.equal(staff.length,48);assert.equal(new Set(staff).size,48);
  if(scene==='finale')assert.ok(v.players.every(p=>Number.isFinite(p.score.total)));
});
test('单人示例使用真实规则：取骰、结算、交接后可控制另一个示例座位；重置不保存改动',()=>{
  let s=makePreview();s=applyAction(s,activeSeat(s),{type:'die',face:4});s=applyAction(s,activeSeat(s),{type:'resolve',promptId:s.effects[0].uid,emperor:1});s=applyAction(s,activeSeat(s),{type:'endTurn'});
  assert.equal(activeSeat(s),'preview-josef');s=applyAction(s,activeSeat(s),{type:'die',face:1});assert.equal(s.effects[0].kind,'goods');
  const fresh=makePreview();assert.equal(fresh.players[0].emperor,8);assert.equal(fresh.players[0].money,15);
});
test('单人示例中的完整订单可以入住，样例不会与真实对局混用',()=>{
  const s=makePreview(),p=s.players[0],room=p.rooms.find(r=>r.state==='prepared'&&r.color==='blue');
  const next=applyAction(s,p.id,{type:'checkin',guestId:'preview-a-1',roomId:room.id});assert.equal(next.players[0].cafe.length,1);assert.equal(s.players[0].cafe.length,2);
  assert.throws(()=>applyAction(s,'real-player',{type:'endTurn'}));
});
test('浏览器测试包不包含认证、数据库或服务端会话代码',async()=>{
  const bundle=await readFile(new URL('../public/preview-engine.mjs',import.meta.url),'utf8');
  for(const secret of ['passwordHash','GAME_DATABASE_URL','createApi','NeonStore','token_hash','node:crypto'])assert.ok(!bundle.includes(secret),secret);
});
