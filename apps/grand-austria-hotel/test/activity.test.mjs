import test from 'node:test';
import assert from 'node:assert/strict';
import {ready} from './helpers.mjs';
import {applyAction,viewGame} from '../lib/game.mjs';
import {liveActivity} from '../lib/activity.mjs';
import {createActionPlayer} from '../public/action-player.mjs';

test('公开动作回执只包含已执行动作，食物和房间有具体结果，私有抽牌不进入动画',()=>{
  let s=ready();const actor=s.turn.playerId;s.dice=[1,1,1];
  s=applyAction(s,actor,{type:'die',face:1,choice:{counts:{strudel:2,cake:1}}});
  const v=viewGame(s,'p2'),frames=v.activity.events.filter(e=>e.playerId===actor),last=frames.slice(-2);
  assert.equal(last[0].kind,'die');assert.equal(last[1].kind,'food');assert.match(last[1].text,/苹果卷×2、蛋糕×1/);
  assert.ok(v.activity.events.every(e=>!('drawn'in e)&&!('hand'in e)&&!('choice'in e)&&!('deck'in e)));
  assert.equal(v.players.find(p=>p.id===actor).hand,undefined);
  const count=s.activity.serial;assert.throws(()=>applyAction(s,actor,{type:'die',face:1}));assert.equal(s.activity.serial,count);
});
test('实时状态过期、换人或对局版本变化后隐藏',()=>{
  const game=ready(),id=game.turn.playerId,room={version:4,game,liveActivity:{playerId:id,kind:'dice',expiresAt:12000,version:4}};
  assert.equal(liveActivity(room,10000).kind,'dice');assert.equal(liveActivity(room,12000),null);
  assert.equal(liveActivity({...room,version:5},10000),null);
  assert.equal(liveActivity({...room,liveActivity:{...room.liveActivity,playerId:'p2'}},10000),null);
});
test('动画按序播放其他人动作，不重复同步、不改局面，支持回放与停止',()=>{
  const shown=[],timers=new Map();let id=0;
  const p=createActionPlayer({onFrame:e=>shown.push(e.id),setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:n=>timers.delete(n)});
  const step=()=>{const [key,fn]=timers.entries().next().value||[];if(fn){timers.delete(key);fn();}};
  const events=[{id:1,group:1,playerId:'other'},{id:2,group:1,playerId:'other'},{id:3,group:2,playerId:'me'}];
  p.accept({serial:0,events:[]},'me','room');p.accept({serial:3,events},'me','room');assert.deepEqual(shown,[1]);
  p.accept({serial:3,events},'me','room');step();step();assert.deepEqual(shown,[1,2]);assert.equal(p.frame,null);
  assert.ok(p.replay('me'));step();assert.deepEqual(shown,[1,2,1,2]);p.stop();assert.equal(timers.size,0);
  p.accept({serial:3,events},'me','new-room');assert.equal(p.frame,null);assert.deepEqual(shown,[1,2,1,2]);
  const before=JSON.stringify(events);p.replay('me');p.reset();assert.equal(JSON.stringify(events),before);assert.equal(timers.size,0);
});
