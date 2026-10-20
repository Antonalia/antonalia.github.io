import test from 'node:test';
import assert from 'node:assert/strict';
import {newLobby,startGame,applyAction,viewGame,internals} from '../lib/game.mjs';
import {opponentState,progressSoloObjective} from '../lib/automa.mjs';
import {resolveDefault} from './helpers.mjs';
const host={id:'human',name:'安娜'},rng=n=>n-1;
function setup(count,difficulty='medium'){
  let s=startGame(newLobby(host,{mode:'solo',botCount:count,difficulty}),host.id,rng),e=s.effects[0];
  s=applyAction(s,host.id,{type:'resolve',promptId:e.uid,cards:e.drawn.slice(0,6)},{rng});
  s=applyAction(s,host.id,{type:'setupGuest',index:4},{rng});
  return applyAction(s,host.id,{type:'setupRooms',rooms:['1-1','1-2','1-3']},{rng});
}
test('人机数量1–3与旧单人存档兼容，拒绝越界和非整数',()=>{
  for(const count of [0,4,-1,1.5,'2',null])assert.throws(()=>newLobby(host,{mode:'solo',botCount:count}));
  for(const count of [1,2,3]){
    const lobby=newLobby(host,{mode:'solo',botCount:count});assert.equal(lobby.players.length,count+1);assert.equal(lobby.maxPlayers,count+1);
    const s=setup(count),v=viewGame(s,host.id);assert.equal(v.solo.botCount,count);assert.equal(v.solo.variant,count===1?'official':'multiple');
    assert.equal(s.dice.length,(count+1)*2+6-count);assert.equal(s.turn.playerId,host.id);
    const common=[...s.staffDeck,...s.players.filter(p=>!p.bot).flatMap(p=>[...p.hand,...p.staff.map(c=>c.id)]),...(count===1?opponentState(s,s.players.find(p=>p.bot).id).privateStaff:[])];
    assert.equal(common.length,48);assert.equal(new Set(common).size,48);
    for(const p of s.players.filter(p=>p.bot)){
      const raw=opponentState(s,p.id),publicBot=v.solo.opponents.find(x=>x.playerId===p.id);
      assert.equal(raw.turns,1);assert.equal(raw.deck.length,19);assert.equal(raw.privateStaff.length+p.staff.length,5);
      assert.equal(publicBot.deck,undefined);assert.equal(publicBot.privateStaff,undefined);assert.equal(v.players.find(x=>x.id===p.id).hand,undefined);
    }
  }
});
for(const count of [2,3])for(const difficulty of ['easy','medium','hard'])test(`${count}个人机/${difficulty}各完成十四次行动，可恢复且不串用牌库`,()=>{
  let s=setup(count,difficulty),steps=0;
  while(s.phase!=='finished'){
    assert.ok(++steps<1000);
    if(s.effects.length){s=resolveDefault(s,{skip:true});continue;}
    assert.equal(s.turn.playerId,host.id);
    if(s.turn.dieTaken)s=applyAction(s,host.id,{type:'endTurn'},{rng});
    else{
      const face=s.dice.find(n=>n!==6)||6,h=s.players.find(p=>!p.bot);
      s=applyAction(s,host.id,face===6&&h.money===0?{type:'pass'}:{type:'die',face,asFace:4},{rng});
    }
    if(steps%7===0)s=JSON.parse(JSON.stringify(s));
  }
  const bots=s.players.filter(p=>p.bot),human=s.players.find(p=>!p.bot),best=Math.max(...bots.map(p=>p.score.total));
  for(const p of bots){const data=opponentState(s,p.id);assert.equal(data.turns,14);assert.equal(data.discard.length,14);assert.equal(new Set(data.discard).size,14);assert.equal(p.money,0);assert.equal(p.cafe.length,0);}
  assert.deepEqual(s.winners,human.score.total>best?[host.id]:bots.filter(p=>p.score.total===best).map(p=>p.id));
  assert.ok(s.objectives.every(o=>o.claimed.length<=3));assert.ok(viewGame(s,host.id).activity.events.length<=96);
});
test('多个电脑分别推进目标，分位领完后不添加第四名',()=>{
  const s=setup(3),bots=s.players.filter(p=>p.bot),goal=s.objectives[0];goal.claimed=[];
  for(const p of bots)opponentState(s,p.id).progress={A:0,B:0,C:0};
  for(let i=0;i<3;i++)progressSoloObjective(s,goal.category,'right',()=>{},bots[1].id);
  assert.equal(opponentState(s,bots[0].id).progress[goal.category],0);assert.equal(opponentState(s,bots[1].id).progress[goal.category],3);assert.deepEqual(goal.claimed,[bots[1].id]);
  for(const o of s.objectives)o.claimed=[host.id,bots[0].id,bots[1].id];
  assert.equal(progressSoloObjective(s,'any','right',()=>{},bots[2].id),null);
});
test('多个电脑的反悔表决全部自动通过，恢复所有电脑随后行动和私有牌库',()=>{
  let s=setup(3);
  while(s.turn.number===4||s.turn.number===5){
    s=applyAction(s,host.id,{type:'die',face:s.dice.find(n=>n<6)||6,asFace:4},{rng});
    while(s.effects.length)s=resolveDefault(s,{skip:true});
    if(s.turn.number===5)break;
    s=applyAction(s,host.id,{type:'endTurn'},{rng});
  }
  const before=structuredClone(s),serial=s.activity.serial;
  s=applyAction(s,host.id,{type:'endTurn'},{rng});assert.notDeepEqual(s.solo,before.solo);
  s=applyAction(s,host.id,{type:'table-request',kind:'undo'},{rng});
  assert.equal(s.tableSession.pending,null);assert.deepEqual(s.solo,before.solo);assert.deepEqual(s.dice,before.dice);assert.deepEqual(s.turn,before.turn);assert.ok(s.activity.serial>serial);
});
test('多人机终局同分优先于真人，多个电脑同为最高时全部显示',()=>{
  const s=setup(3);s.round=7;s.emperors[2]={reward:[],penalty:[]};
  for(const p of s.players){p.vp=10;p.emperor=0;p.money=0;p.cafe=[];p.staff=[];p.kitchen={};p.rooms.forEach(r=>r.state='closed');}
  internals.endRound(s);assert.deepEqual(s.winners,s.players.filter(p=>p.bot).map(p=>p.id));
});
