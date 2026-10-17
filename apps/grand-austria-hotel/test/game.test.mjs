import test from 'node:test';
import assert from 'node:assert/strict';
import { STAFF,GUESTS,HOTELS,OBJECTIVES,EMPERORS,EMPEROR_VP,GROUP_BONUS } from '../lib/catalog.mjs';
import { applyAction,viewGame,internals,RESOURCES } from '../lib/game.mjs';
import { ready,drain,resolveDefault,putStaff,playFullGame } from './helpers.mjs';

test('完整基础版牌库及五种酒店版面的数量、组和坐标有效',()=>{
  assert.equal(STAFF.length,48);assert.equal(GUESTS.length,56);assert.equal(OBJECTIVES.length,12);assert.equal(EMPERORS.length,12);
  for(const deck of [STAFF,GUESTS])assert.equal(new Set(deck.map(x=>x.id)).size,deck.length);
  for(const h of Object.values(HOTELS)){assert.equal(h.length,20);assert.equal(new Set(h.map(r=>r.group)).size,10);assert.equal(new Set(h.map(r=>r.id)).size,20);for(const group of new Set(h.map(r=>r.group))){const rs=h.filter(r=>r.group===group);assert.equal(new Set(rs.map(r=>r.color)).size,1);assert.ok(rs.length<=4);}}
  assert.deepEqual(EMPEROR_VP,[0,1,2,3,3,4,4,5,5,6,6,7,8,9]);assert.deepEqual(GROUP_BONUS.blue,[2,5,9,15]);
  assert.equal(GUESTS.find(c=>c.id===49).vp,0);assert.equal(GUESTS.find(c=>c.id===55).vp,7);assert.equal(GUESTS.find(c=>c.id===74).vp,10);
});
test('setup：每人6张隐藏手牌、起始食饮、三间免费房；蛇形顺序',()=>{
  const s=ready(3);assert.equal(s.dice.length,12);assert.deepEqual(s.slots.map(x=>x.playerId),['p1','p2','p3','p3','p2','p1']);
  for(const p of s.players){assert.equal(p.hand.length,6);assert.equal(p.cafe.length,1);assert.equal(p.rooms.filter(r=>r.state==='prepared').length,3);assert.equal(p.money,10);assert.deepEqual(Object.values(p.kitchen),[1,1,1,1]);}
});
test('对手看不到手牌、牌堆顺序、待选员工；非本局玩家不能读',()=>{
  const s=ready();const v=viewGame(s,'p1');assert.equal(v.players[1].hand,undefined);assert.equal(v.staffDeck,undefined);assert.equal(v.guestDeck,undefined);assert.throws(()=>viewGame(s,'intruder'));
  s.effects=[{kind:'hire',drawn:[1,2,3],playerId:'p2',uid:'private'}];assert.deepEqual(viewGame(s,'p1').prompt,{playerId:'p2',waiting:true});
});
test('拒绝非当前玩家动作；非法动作不改变原状态',()=>{const s=ready(),before=structuredClone(s);assert.throws(()=>applyAction(s,'p2',{type:'die',face:s.dice[0]}));assert.throws(()=>applyAction(s,'p1',{type:'die',face:99}));assert.deepEqual(s,before);});
test('骰子强度看取骰前数量，蛋糕不能多于苹果卷；只移除一枚',()=>{
  let s=ready();s.dice=[1,1,1,4];s=applyAction(s,'p1',{type:'die',face:1});assert.deepEqual(s.dice,[1,1,4]);assert.equal(s.effects[0].amount,3);
  assert.throws(()=>applyAction(s,'p1',{type:'resolve',promptId:s.effects[0].uid,counts:{cake:2,strudel:1}}));
  s=applyAction(s,'p1',{type:'resolve',promptId:s.effects[0].uid,counts:{cake:1,strudel:2}});assert.equal(s.players[0].kitchen.cake,2);
});
test('万能骰按6点池强度，可复制空骰面；厨房助手只作用于实体6',()=>{
  let s=ready(),p=s.players[0];putStaff(s,p,17);putStaff(s,p,13);s.dice=[6,6,4];
  s=applyAction(s,'p1',{type:'die',face:6,asFace:1,boost:true});assert.equal(s.effects[0].amount,4);assert.equal(s.players[0].money,9);
});
test('取骰员工看实体骰面；可安排人事经理在建房之前雇管家',()=>{
  let s=ready();putStaff(s,s.players[0],22);s.dice=[3,3,4];s=applyAction(s,'p1',{type:'die',face:3,staffBefore:true});assert.equal(s.effects[0].kind,'hire');
  let x=ready();putStaff(x,x.players[0],19);x.dice=[6,6];x=applyAction(x,'p1',{type:'die',face:6,asFace:3});assert.equal(x.players[0].vp,0);
});
test('擦鞋匠4点钱和皇帝都拿，洗衣员额外4VP',()=>{let s=ready();putStaff(s,s.players[0],15);putStaff(s,s.players[0],16);s.dice=[4,4,4];s=applyAction(s,'p1',{type:'die',face:4});assert.equal(s.players[0].money,13);assert.equal(s.players[0].emperor,3);assert.equal(s.players[0].vp,4);assert.equal(s.effects.length,0);});
test('稽核员5点额外减2；蓝房管家免准备费；送货员免迎客费',()=>{
  let s=ready();putStaff(s,s.players[0],18);s.dice=[5,5,1];s=applyAction(s,'p1',{type:'die',face:5});if(s.effects.length)assert.equal(s.effects[0].discount,4);
  s=ready();putStaff(s,s.players[0],9);s.players[0].money=0;internals.prepareOne(s,s.players[0],'2-1',{free:true});internals.prepareOne(s,s.players[0],'3-1');assert.equal(s.players[0].money,0);
  s=ready();putStaff(s,s.players[0],25);s.players[0].money=0;s=applyAction(s,'p1',{type:'attract',index:0});assert.equal(s.players[0].money,0);
});
test('pass不消耗行动且本轮后一个号码也暂缓；重掷后恢复最小号码',()=>{
  let s=ready();s.dice=[4,4,4,4,4,4,4,4,4,4];s=applyAction(s,'p1',{type:'pass'});assert.deepEqual(s.slots.filter(x=>x.playerId==='p1').map(x=>x.passed),[true,true]);
  for(let i=0;i<2;i++){s=applyAction(s,'p2',{type:'die',face:4});s=drain(s);s=applyAction(s,'p2',{type:'endTurn'});}
  assert.equal(s.turn.playerId,'p1');assert.equal(s.turn.number,1);assert.equal(s.dice.length,7);assert.equal(s.round,1);
});
test('所有玩家pass时弃1重掷，骰池耗尽结束轮；不能额外行动后pass',()=>{let s=ready();s.dice=[4];s=applyAction(s,'p1',{type:'pass'});s=applyAction(s,'p2',{type:'pass'});assert.equal(s.round,2);s=ready();s=applyAction(s,'p1',{type:'attract',index:4});assert.throws(()=>applyAction(s,'p1',{type:'pass'}));});
test('免费分配仅限本次新资源；厨房付1移最多3件，领班免费用',()=>{
  let s=ready();const g=s.players[0].cafe[0];g.id=49;s.dice=[2,4];s=applyAction(s,'p1',{type:'die',face:2});s=applyAction(s,'p1',{type:'resolve',promptId:s.effects[0].uid,counts:{wine:1},allocations:[{guestId:g.uid,resource:'wine',amount:1}]});assert.equal(s.players[0].kitchen.wine,1);assert.equal(s.players[0].cafe[0].served.wine,1);
  s=ready();s.players[0].cafe[0].id=49;const uid=s.players[0].cafe[0].uid;s=applyAction(s,'p1',{type:'serve',allocations:[{guestId:uid,resource:'wine',amount:1}]});assert.equal(s.players[0].money,9);
  s=ready();putStaff(s,s.players[0],24);s.players[0].cafe[0].id=49;s=applyAction(s,'p1',{type:'serve',allocations:[{guestId:s.players[0].cafe[0].uid,resource:'wine',amount:1}]});assert.equal(s.players[0].money,10);
});
test('入住颜色校验、腾出咖啡厅、客人回收；房组只奖励一次',()=>{
  let s=ready(),p=s.players[0];p.cafe[0].id=65;p.cafe[0].served.coffee=1;const uid=p.cafe[0].uid;
  assert.throws(()=>applyAction(s,'p1',{type:'checkin',guestId:uid,roomId:'1-2'}));
  s=applyAction(s,'p1',{type:'checkin',guestId:uid,roomId:'1-1'});assert.equal(s.players[0].vp,5);assert.equal(s.players[0].cafe.length,0);assert.ok(s.players[0].bonuses.includes(1));
});
test('管理员任何方式入住都触发；男楼层管家不限制颜色',()=>{
  let s=ready(),p=s.players[0];putStaff(s,p,23);s.effects=[{kind:'occupy',uid:'x',playerId:p.id}];s=applyAction(s,p.id,{type:'resolve',promptId:'x',roomId:'1-1'});assert.equal(s.players[0].money,11);
  s=ready();p=s.players[0];putStaff(s,p,33);p.cafe[0].id=104;p.cafe[0].served={strudel:2,cake:2,wine:0,coffee:0};s=drain(applyAction(s,p.id,{type:'checkin',guestId:p.cafe[0].uid,roomId:'1-1'}));assert.equal(s.players[0].vp,8); // 2 printed + 4 staff + 2 blue group
});
test('E.Gizia额外动作不取骰、不触发员工、不允许增强',()=>{
  let s=ready();putStaff(s,s.players[0],16);s.dice=[4,4];s.effects=[{kind:'die',uid:'x',playerId:'p1'}];
  assert.throws(()=>applyAction(s,'p1',{type:'resolve',promptId:'x',face:4,boost:true}));
  s=applyAction(s,'p1',{type:'resolve',promptId:'x',face:4});assert.equal(s.dice.length,2);assert.equal(s.players[0].vp,0);assert.equal(s.effects[0].amount,2);
});
test('抽3选1雇用，未选牌可指定回库底顺序；不雇也可排序',()=>{
  let s=ready();s.staffDeck=[1,2,3,4,5];s.effects=[{kind:'hire',draw:3,free:true,uid:'x',playerId:'p1'}];internals.advanceEffects(s);s=applyAction(s,'p1',{type:'resolve',promptId:'x',staffId:1,returnOrder:[3,2]});assert.deepEqual(s.staffDeck.slice(-2),[3,2]);
  s=ready();s.staffDeck=[1,2,3,4,5];s.effects=[{kind:'hire',draw:3,free:true,uid:'x',playerId:'p1'}];internals.advanceEffects(s);s=applyAction(s,'p1',{type:'resolve',promptId:'x',staffId:null,returnOrder:[3,1,2]});assert.deepEqual(s.staffDeck.slice(-3),[3,1,2]);
});
test('钱上限20；皇帝溢出每格1VP；一次增强限制',()=>{
  let s=ready();s.players[0].money=20;s.players[0].emperor=12;s.dice=[4,4,4];s=applyAction(s,'p1',{type:'die',face:4,boost:true});s=applyAction(s,'p1',{type:'resolve',promptId:s.effects[0].uid,emperor:4});assert.equal(s.players[0].emperor,13);assert.equal(s.players[0].vp,3);
});
test('皇帝先按退前轨道计分，再退格；花园员工+5，会议经理可付1免罚',()=>{
  let s=ready();s.round=3;s.emperors[0]=EMPERORS.find(x=>x.id==='A1');s.players[0].emperor=8;s.players[1].emperor=0;putStaff(s,s.players[0],42);putStaff(s,s.players[1],26);
  internals.endRound(s);assert.equal(s.players[0].vp,10);assert.equal(s.players[0].emperor,5);assert.equal(s.players[0].money,13);assert.equal(s.effects[0].kind,'conference');
  s=applyAction(s,'p2',{type:'resolve',promptId:s.effects[0].uid,pay:true});assert.equal(s.players[1].money,9);assert.equal(s.round,4);
});
test('会议经理跳过提示必须执行处罚，不能免费免罚',()=>{let s=ready();s.effects=[{kind:'conference',uid:'x',playerId:'p1',penalties:[{kind:'penalty',penalty:'money',amount:3,fallback:5}]}];s=applyAction(s,'p1',{type:'resolve',promptId:'x',skip:true});assert.equal(s.players[0].money,7);});
test('皇帝实物处罚必须完整支付，否则仅扣分；必须从最高空房移除',()=>{
  let s=ready();s.effects=[{kind:'penalty',penalty:'removePrepared',amount:4,fallback:7,uid:'x',playerId:'p1'}];internals.advanceEffects(s);assert.equal(s.players[0].vp,-7);assert.equal(s.players[0].rooms.filter(r=>r.state==='prepared').length,3);
  s=ready();s.players[0].rooms.find(r=>r.id==='2-1').state='prepared';s.effects=[{kind:'penalty',penalty:'removePrepared',amount:1,fallback:5,uid:'x',playerId:'p1'}];assert.throws(()=>applyAction(s,'p1',{type:'resolve',promptId:'x',rooms:['1-1']}));
});
test('目标手动领取、同一人不能重复、只有三个分位',()=>{let s=ready(4);s.objectives=[{...OBJECTIVES.find(o=>o.id===105),claimed:['p2','p3','p4']}];s.players[0].money=20;assert.throws(()=>applyAction(s,'p1',{type:'claim',objectiveId:105}));s.objectives[0].claimed=[];s=applyAction(s,'p1',{type:'claim',objectiveId:105});assert.equal(s.players[0].vp,15);assert.throws(()=>applyAction(s,'p1',{type:'claim',objectiveId:105}));});
test('终局每种员工评分器均有定义；接线员可超过12分',()=>{
  const s=ready(),p=s.players[0];p.emperor=13;assert.equal(internals.endStaffValue(p,STAFF.find(c=>c.id===41),s),26);
  for(const d of STAFF.filter(c=>c.end))assert.ok(Number.isFinite(internals.endStaffValue(p,d,s)),d.name);
});
for(const n of [2,3,4])for(const mode of ['night','day'])test(`${n}人${mode}可完成完整七轮，所有终局分数一致`,()=>{
  for(let i=0;i<5;i++){const {s}=playFullGame(n,mode);assert.equal(s.phase,'finished');assert.equal(s.round,7);for(const p of s.players){const x=p.score;assert.equal(x.total,x.duringGame+x.staff+x.rooms+x.goods+x.cash+x.cafe);assert.ok(Number.isFinite(x.total));assert.ok(p.money<=20);assert.ok(p.emperor<=13);}}
});
