import test from 'node:test';
import assert from 'node:assert/strict';
import { GUESTS,STAFF,EMPERORS } from '../lib/catalog.mjs';
import { applyAction,internals } from '../lib/game.mjs';
import { ready,drain,putStaff } from './helpers.mjs';

test('56位客人的全部奖励链都能完成，订单/颜色/客人计分实际生效',()=>{
  for(const card of GUESTS){
    let s=ready(),p=s.players[0];p.money=20;s.dice=[1,2,3,4,5,6];
    p.cafe=[{id:card.id,uid:'guest-under-test',served:Object.fromEntries(['strudel','cake','wine','coffee'].map(r=>[r,card.needs[r]||0]))}];
    const room=p.rooms.find(r=>r.state==='prepared'&&(card.color==='green'||r.color===card.color));
    s=drain(applyAction(s,p.id,{type:'checkin',guestId:'guest-under-test',roomId:room.id}));
    assert.equal(s.effects.length,0,`guest ${card.id}`);assert.ok(s.players[0].completed.some(c=>c.id===card.id));assert.ok(s.players[0].vp>=card.vp);
  }
});
test('48名员工都能从手牌实际雇用，立即/每轮收益能结算，不丢牌',()=>{
  for(const card of STAFF){
    let s=ready(),p=s.players[0];p.money=20;p.hand=[card.id];s.staffDeck=s.staffDeck.filter(id=>id!==card.id);s.effects=[{kind:'hire',uid:'hire-test',playerId:p.id}];
    s=applyAction(s,p.id,{type:'resolve',promptId:'hire-test',staffId:card.id});s=drain(s);assert.ok(s.players[0].staff.some(c=>c.id===card.id),card.name);
    if(card.timing==='round'){
      s=drain(applyAction(s,p.id,{type:'activate',staffId:card.id}));assert.throws(()=>applyAction(s,p.id,{type:'activate',staffId:card.id}));
    }
  }
});
test('12种皇帝奖励与12种处罚都可完整结算，不遗留无人能处理的效果',()=>{
  for(const tile of EMPERORS)for(const bonus of [true,false]){
    let s=ready();s.round={A:3,B:5,C:7}[tile.category];s.emperors[['A','B','C'].indexOf(tile.category)]=tile;
    for(const p of s.players){p.emperor=bonus?13:0;p.money=10;p.rooms.find(r=>r.id==='2-1').state='occupied';p.rooms.find(r=>r.id==='3-1').state='occupied';}
    internals.endRound(s);s=drain(s);assert.equal(s.effects.length,0,tile.id);assert.equal(s.phase,tile.category==='C'?'finished':'turn',tile.id);
  }
});
test('所有13种终局员工按同一完成酒店计算出预期值',()=>{
  const s=ready(),p=s.players[0];p.rooms.forEach(r=>r.state='occupied');p.emperor=13;
  s.objectives.forEach(o=>o.claimed=[p.id]);
  const expected={27:21,28:21,30:18,31:20,32:2,34:20,37:20,40:15,41:26,46:20,47:25,48:24};
  for(const [id,points]of Object.entries(expected)){const d=STAFF.find(c=>c.id===Number(id));p.staff=[{id:d.id,usedRound:0}];assert.equal(internals.endStaffValue(p,d,s),points,d.name);}
  putStaff(s,s.players[1],47);assert.equal(internals.endStaffValue(p,STAFF.find(c=>c.id===29),s),25);
});
test('餐厅经理、装潢师与各骰面触发奖励，以及4种入住颜色触发',()=>{
  let s=ready();putStaff(s,s.players[0],13);putStaff(s,s.players[0],14);s.dice=[1,1,4];s=applyAction(s,'p1',{type:'die',face:1,staffBefore:true});assert.equal(s.effects[0].kind,'prepare');assert.equal(s.effects[1].amount,3);
  const checks=[[5,77,'1-3','money',3],[6,65,'1-1','emperor',1],[7,49,'1-2','money',1],[8,92,'1-2','vp',2]];
  for(const [staffId,guestId,roomId,property,amount]of checks){let x=ready(),p=x.players[0];putStaff(x,p,staffId);const c=internals.guestById[guestId];p.cafe=[{id:guestId,uid:'checkin',served:{strudel:0,cake:0,wine:0,coffee:0,...c.needs}}];const before=p[property];x=drain(applyAction(x,p.id,{type:'checkin',guestId:'checkin',roomId}));const printed=property==='vp'?c.vp:0;const group=property==='vp'&&roomId==='1-1'?2:0;assert.equal(x.players[0][property]-before,amount+printed+group,`staff ${staffId}`);}
});
