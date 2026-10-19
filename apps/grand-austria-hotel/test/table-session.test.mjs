import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,advanceTableTime,viewGame} from '../lib/game.mjs';
import {viewTableControls} from '../lib/table-session.mjs';
import {ready,drain} from './helpers.mjs';
const config={type:'clock-config',enabled:true,durationSeconds:60,warningSeconds:10,autoStart:true,autoSkip:false,theme:'mint'};
const act=(s,id,a,now=1000)=>applyAction(s,id,a,{now,rng:()=>5});
const vote=(s,id,approve=true,now=1100)=>act(s,id,{type:'table-vote',proposalId:s.tableSession.pending.id,approve},now);

test('clock settings validate ownership, booleans, duration and style; internal expiry cannot be forged',()=>{
  const s=ready();assert.throws(()=>act(s,'p2',config));
  for(const bad of [{durationSeconds:0},{durationSeconds:3601},{warningSeconds:61},{autoSkip:'true'},{enabled:1},{theme:'url(x)'}])assert.throws(()=>act(s,'p1',{...config,...bad}));
  assert.throws(()=>act(s,'p1',{type:'__clock-expire'}));assert.throws(()=>act(s,'stranger',config));
  assert.equal(s.tableSession.clock.enabled,false);
});

test('clock pause, resume and reset preserve server elapsed time and current-player permission',()=>{
  let s=act(ready(),'p1',config);assert.equal(s.tableSession.clock.deadline,61000);
  assert.throws(()=>act(s,'p2',{type:'clock-pause'},5000));
  s=act(s,'p1',{type:'clock-pause'},11000);assert.equal(s.tableSession.clock.remainingMs,50000);
  assert.equal(viewTableControls(s,'p1',50000).clock.remainingMs,50000);
  s=act(s,'p1',{type:'clock-resume'},51000);assert.equal(s.tableSession.clock.deadline,101000);
  s=act(s,'p1',{type:'clock-reset'},52000);assert.equal(s.tableSession.clock.deadline,112000);
});

test('new turns reset a configured clock; manual-start mode stays paused',()=>{
  let s=act(ready(),'p1',config);s=act(s,'p1',{type:'pass'},10000);
  assert.equal(s.turn.playerId,'p2');assert.equal(s.tableSession.clock.deadline,70000);
  s=act(s,'p1',{...config,autoStart:false},11000);s=act(s,'p2',{type:'pass'},12000);
  assert.equal(s.tableSession.clock.status,'paused');assert.equal(s.tableSession.clock.remainingMs,60000);
});

test('expiry only reminds by default; auto-end finishes a slot without choosing a die or guest',()=>{
  let s=act(ready(),'p1',{...config,durationSeconds:5,warningSeconds:2});
  assert.equal(advanceTableTime(s,{now:10000}),s);
  s=act(s,'p1',{...config,durationSeconds:5,warningSeconds:2,autoSkip:true});
  const before=structuredClone(s),next=advanceTableTime(s,{now:6000});
  assert.equal(next.slots[0].done,true);assert.equal(next.turn.playerId,'p2');assert.deepEqual(next.dice,before.dice);
  assert.deepEqual(next.players,before.players);assert.equal(next.tableSession.clock.deadline,11000);assert.deepEqual(s,before);
  assert.equal(advanceTableTime(next,{now:6000}),next);
});

test('auto-end defers mandatory effect choices and ends after they are resolved',()=>{
  let s=act(ready(),'p1',{...config,durationSeconds:5,warningSeconds:1,autoSkip:true});s.dice=[1,4,4];
  s=act(s,'p1',{type:'die',face:1},2000);assert.ok(s.effects.length);
  assert.equal(advanceTableTime(s,{now:9000}),s);
  s=act(s,'p1',{type:'resolve',promptId:s.effects[0].uid,counts:{strudel:1},allocations:[]},9000);
  assert.equal(s.effects.length,0);s=advanceTableTime(s,{now:9001});assert.equal(s.turn.playerId,'p2');
});

test('reroll needs every other player, freezes actions, and creates a fresh full dice pool only before play',()=>{
  let s=ready(4);const original=[...s.dice];
  s=act(s,'p1',{type:'table-request',kind:'reroll'});assert.deepEqual(s.dice,original);
  assert.throws(()=>act(s,'p1',{type:'attract',index:4}));assert.throws(()=>vote(s,'p1'));assert.throws(()=>act(s,'p2',{type:'table-vote',proposalId:'stale',approve:true}));
  s=vote(s,'p2');assert.throws(()=>vote(s,'p2'));s=vote(s,'p3');assert.deepEqual(s.dice,original);
  s=vote(s,'p4');assert.equal(s.tableSession.pending,null);assert.deepEqual(s.dice,Array(14).fill(6));assert.equal(s.turn.number,1);
  s=act(s,'p1',{type:'attract',index:4});assert.equal(viewTableControls(s,'p1').canReroll,false);assert.throws(()=>act(s,'p1',{type:'table-request',kind:'reroll'}));
});

test('even a pass closes the first-action reroll window',()=>{
  let s=act(ready(),'p1',{type:'pass'});assert.throws(()=>act(s,'p2',{type:'table-request',kind:'reroll'}));
});

test('veto or requester cancellation leaves dice intact and resumes only the frozen remaining time',()=>{
  let s=act(ready(),'p1',config);s=act(s,'p1',{type:'table-request',kind:'reroll'},11000);
  const dice=[...s.dice];assert.equal(s.tableSession.clock.status,'paused');
  s=vote(s,'p2',false,91000);assert.deepEqual(s.dice,dice);assert.equal(s.tableSession.clock.deadline,141000);
  s=act(s,'p1',{type:'table-request',kind:'reroll'},92000);assert.throws(()=>act(s,'p2',{type:'table-cancel',proposalId:s.tableSession.pending.id}));
  s=act(s,'p1',{type:'table-cancel',proposalId:s.tableSession.pending.id},100000);assert.deepEqual(s.dice,dice);assert.equal(s.tableSession.clock.deadline,149000);
});

test('consensual undo restores cards, deck order, resources and turn; the clock resumes paused',()=>{
  let s=act(ready(),'p1',config),before=structuredClone(s);s=act(s,'p1',{type:'attract',index:0},2000);
  assert.equal(s.players[0].money,before.players[0].money-3);const changed=structuredClone(s);
  assert.throws(()=>act(s,'p2',{type:'table-request',kind:'undo'}));
  s=act(s,'p1',{type:'table-request',kind:'undo'},3000);s=vote(s,'p2',false,4000);assert.deepEqual(s.market,changed.market);
  s=act(s,'p1',{type:'table-request',kind:'undo'},5000);s=vote(s,'p2',true,6000);
  for(const field of ['players','market','guestDeck','staffDeck','turn','dice','effects'])assert.deepEqual(s[field],before[field],field);
  assert.equal(s.tableSession.clock.status,'paused');assert.equal(s.tableSession.clock.remainingMs,59000);assert.equal(s.tableSession.history.length,0);
});

test('undo is unavailable once another player has acted',()=>{
  let s=act(ready(),'p1',{type:'pass'});s=act(s,'p2',{type:'attract',index:4});
  assert.equal(viewTableControls(s,'p1').canUndo,false);assert.throws(()=>act(s,'p1',{type:'table-request',kind:'undo'}));
});

test('undo preserves newer countdown settings while restoring the turn in a paused state',()=>{
  let s=act(ready(),'p1',config);s=act(s,'p1',{type:'attract',index:4},2000);
  s=act(s,'p1',{...config,durationSeconds:30,theme:'rose',autoSkip:true},3000);
  s=act(s,'p1',{type:'table-request',kind:'undo'},4000);s=vote(s,'p2',true,5000);
  assert.equal(s.tableSession.clock.durationSeconds,30);assert.equal(s.tableSession.clock.theme,'rose');assert.equal(s.tableSession.clock.autoSkip,true);
  assert.equal(s.tableSession.clock.remainingMs,30000);assert.equal(s.tableSession.clock.status,'paused');
});

test('history and proposal snapshots never enter player views, including hidden cards and deck order',()=>{
  let s=act(ready(),'p1',{type:'attract',index:4});s=act(s,'p1',{type:'table-request',kind:'undo'});
  assert.ok(s.tableSession.history[0].before.staffDeck);assert.ok(s.tableSession.pending.before.guestDeck);
  for(const id of ['p1','p2']){const v=viewGame(s,id);assert.equal(v.tableSession,undefined);assert.equal(v.tableControls.history,undefined);assert.equal(v.tableControls.pending.before,undefined);assert.equal(v.tableControls.pending.clock,undefined);assert.equal(v.players.find(p=>p.id!==id).hand,undefined);assert.equal(v.staffDeck,undefined);}
});

test('old saved games without convenience metadata remain playable and snapshots are bounded',()=>{
  let s=ready();delete s.tableSession;assert.equal(viewTableControls(s,'p1').clock.enabled,false);
  s=act(s,'p1',{type:'attract',index:4});assert.equal(s.tableSession.history.length,1);
  // Repeated all-player approved pre-play rerolls exercise the bounded history without rule mutations.
  s=ready();for(let i=0;i<20;i++){s=act(s,'p1',{type:'table-request',kind:'reroll'});s=vote(s,'p2');}
  assert.equal(s.tableSession.history.length,12);assert.ok(s.tableSession.history.every(h=>!h.before.tableSession));
});
