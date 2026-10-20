import test from 'node:test';
import assert from 'node:assert/strict';
import {newLobby,joinLobby,startGame,applyAction,viewGame} from '../lib/game.mjs';
import {makePreview} from '../preview-src/preview.mjs';
import {STAFF} from '../lib/catalog.mjs';
import {ready,putStaff} from './helpers.mjs';

for(const count of [2,3,4])test(`${count}人轮抽：每轮逐人各选一张、左传余牌，六轮后开始迎客`,()=>{
  let lobby=newLobby({id:'p1',name:'甲'});
  for(let i=2;i<=count;i++)lobby=joinLobby(lobby,{id:`p${i}`,name:`玩家${i}`});
  let s=startGame(lobby,'p1',n=>n-1),packets=structuredClone(s.staffDraft.packets),picks=0;
  assert.equal(s.phase,'setupStaff');
  for(let round=1;round<=6;round++){
    for(let seat=0;seat<count;seat++){
      const who=`p${seat+1}`,v=viewGame(s,who),other=viewGame(s,`p${seat===0?2:1}`);
      assert.equal(v.activePlayerId,who);assert.equal(v.prompt.kind,'staffDraft');assert.equal(v.prompt.round,round);
      assert.deepEqual(v.prompt.drawn.map(c=>c.id),packets[seat]);
      assert.equal(v.staffDraft,undefined);assert.equal(other.prompt.drawn,undefined);assert.equal(other.players.find(p=>p.id===who).hand,undefined);
      const before=structuredClone(s);assert.throws(()=>applyAction(s,who,{type:'draftStaff',staffId:999}));assert.deepEqual(s,before);
      if(seat===0)assert.throws(()=>applyAction(s,'p2',{type:'draftStaff',staffId:packets[0][0]}));
      const card=packets[seat].shift();s=applyAction(JSON.parse(JSON.stringify(s)),who,{type:'draftStaff',staffId:card});
      assert.equal(s.players[seat].hand.length,round);picks++;
    }
    packets=packets.map((_,i)=>packets[(i-1+count)%count]);
  }
  assert.equal(picks,6*count);assert.equal(s.phase,'setupGuest');assert.equal(s.staffDraft,undefined);
  assert.deepEqual(s.setupOrder,s.players.map(p=>p.id).reverse());
  const cards=[...s.staffDeck,...s.players.flatMap(p=>p.hand)];assert.equal(cards.length,48);assert.equal(new Set(cards).size,48);
  assert.ok(s.players.every(p=>p.hand.length===6));
});

test('旧大厅及显式随机发牌保持兼容，单人仍十选六',()=>{
  let old=joinLobby(newLobby({id:'a',name:'甲'}),{id:'b',name:'乙'});delete old.staffSetup;
  const s=startGame(old,'a');assert.equal(s.phase,'setupGuest');assert.ok(s.players.every(p=>p.hand.length===6));
  const solo=startGame(newLobby({id:'a',name:'甲'},{mode:'solo'}),'a');assert.equal(solo.effects[0].kind,'soloDraft');assert.equal(solo.effects[0].drawn.length,10);assert.equal(solo.staffDraft,undefined);
});

test('取骰、拿取数量与免费分配在同一动作内原子结算',()=>{
  const s=makePreview(),before=structuredClone(s),p=s.players[0];
  const next=applyAction(s,p.id,{type:'die',face:2,choice:{counts:{wine:2},allocations:[{guestId:'preview-a-2',resource:'wine',amount:2}]}});
  assert.deepEqual(s,before);assert.equal(next.dice.filter(n=>n===2).length,1);assert.equal(next.effects.length,0);
  assert.equal(next.players[0].cafe[1].served.wine,2);assert.equal(next.players[0].kitchen.wine,p.kitchen.wine);
  assert.equal(next.turn.dieTaken,true);assert.equal(next.tableSession.history.length,1);
});

test('非法的联合选择不会消费骰子、金币或留下半完成动作',()=>{
  const s=makePreview(),before=structuredClone(s),id=s.players[0].id;
  for(const choice of [
    {counts:{wine:3}}, {counts:{cake:1}}, {counts:{coffee:1}},
    {counts:{wine:1},allocations:[{guestId:'missing',resource:'wine',amount:1}]},
    {counts:{wine:1},staffId:1}, {counts:[1,2]},
  ])assert.throws(()=>applyAction(s,id,{type:'die',face:2,choice}));
  assert.deepEqual(s,before);
  const poor=structuredClone(s);poor.players[0].money=1;
  assert.throws(()=>applyAction(poor,id,{type:'die',face:6,asFace:2,boost:true,choice:{counts:{wine:2}}}));
  assert.equal(poor.players[0].money,1);assert.equal(poor.dice.filter(n=>n===6).length,1);
});

test('钱与皇冠、房间与员工均可在取骰之前选择并一次提交',()=>{
  let s=ready();s.dice=[4,4,3,3,5];
  const cash=applyAction(s,'p1',{type:'die',face:4,choice:{emperor:1}});
  assert.equal(cash.players[0].money,11);assert.equal(cash.players[0].emperor,1);assert.equal(cash.effects.length,0);
  const rooms=applyAction(s,'p1',{type:'die',face:3,choice:{rooms:['1-4','1-5']}});
  assert.equal(rooms.players[0].rooms.filter(r=>r.state==='prepared').length,5);assert.equal(rooms.effects.length,0);
  const card=STAFF.find(c=>c.id===s.players[0].hand[0]);
  const hired=applyAction(s,'p1',{type:'die',face:5,choice:{staffId:card.id}});
  assert.ok(hired.players[0].staff.some(c=>c.id===card.id));assert.equal(hired.players[0].money,10-Math.max(0,card.cost-1));
});

test('员工先结算使既定选择失效时，退回主动作选择且可继续',()=>{
  let s=ready();const p=s.players[0];putStaff(s,p,22);p.hand=[6];p.money=1;s.dice=[3];
  s=applyAction(s,'p1',{type:'die',face:3,staffBefore:true,choice:{rooms:['2-1']}});
  assert.equal(s.effects[0].kind,'hire');assert.equal(s.players[0].money,1);
  s=applyAction(s,'p1',{type:'resolve',promptId:s.effects[0].uid,staffId:6});
  assert.equal(s.players[0].money,0);assert.equal(s.effects[0].kind,'prepare');assert.equal(s.effects[0].planChanged,true);
  s=applyAction(s,'p1',{type:'resolve',promptId:s.effects[0].uid,rooms:['1-4']});
  assert.equal(s.effects.length,0);assert.equal(s.players[0].rooms.find(r=>r.id==='1-4').state,'prepared');
});

test('额外骰子奖励接受同一份动作草稿，但不移除骰子或允许付费增强',()=>{
  let s=makePreview(),before=[...s.dice];s.effects=[{uid:'extra-die',kind:'die',playerId:s.players[0].id}];
  assert.throws(()=>applyAction(s,s.players[0].id,{type:'resolve',promptId:'extra-die',face:2,boost:true,choice:{counts:{wine:3}}}));
  s=applyAction(s,s.players[0].id,{type:'resolve',promptId:'extra-die',face:2,choice:{counts:{wine:2}}});
  assert.deepEqual(s.dice,before);assert.equal(s.effects.length,0);assert.equal(s.players[0].kitchen.wine,5);
});
