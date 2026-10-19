import test from 'node:test';
import assert from 'node:assert/strict';
import {newLobby,joinLobby,startGame,applyAction,viewGame,advanceTableTime,internals} from '../lib/game.mjs';
import {LEOPOLD_CARDS,instruction,selectSoloRoom,selectSoloGuest,selectSoloDie,progressSoloObjective} from '../lib/automa.mjs';
import {STAFF,GUESTS,OBJECTIVES,EMPERORS,EMPEROR_VP} from '../lib/catalog.mjs';
import {resolveDefault} from './helpers.mjs';
const rng=max=>max-1;
const human={id:'human',name:'安娜'};
const action=(s,a,now=10000)=>applyAction(s,human.id,a,{rng,now});
function setup(difficulty='medium',hotelMode='night',card=193){
  let s=startGame(newLobby(human,{mode:'solo',difficulty,hotelMode}),human.id,rng);
  const e=s.effects[0],keep=e.drawn.slice(0,6);
  s=action(s,{type:'resolve',promptId:e.uid,cards:keep,returnOrder:e.drawn.slice(6).toReversed()});
  s=action(s,{type:'setupGuest',index:4});
  s.solo.deck=[card,...s.solo.deck.filter(id=>id!==card)];
  return action(s,{type:'setupRooms',rooms:['1-1','1-2','1-3']});
}
const bot=s=>s.players.find(p=>p.bot);
test('all twenty official cards have unique IDs and exact easy/medium/hard symbol gates',()=>{
  assert.deepEqual(LEOPOLD_CARDS.map(x=>x.id),Array.from({length:20},(_,n)=>193+n));
  for(const [level,expected]of Object.entries({easy:[19,3,24,9],medium:[21,4,26,11],hard:[23,5,26,14]})){
    const cards=LEOPOLD_CARDS.map(c=>instruction(c.id,level)),extras=cards.flatMap(c=>c.extras);
    assert.deepEqual([cards.flatMap(c=>c.guests).length,extras.filter(e=>e.kind==='staff').length,extras.filter(e=>e.kind==='emperor').reduce((n,e)=>n+e.value,0),extras.filter(e=>e.kind==='objective').length],expected);
  }
  assert.equal(instruction(205,'hard').guests[0].color,'blue');assert.equal(instruction(206,'hard').hand,'left');
});
test('solo setup reserves five hidden end staff, human chooses six of ten and returns four in order',()=>{
  let s=startGame(newLobby(human,{mode:'solo',difficulty:'easy',hotelMode:'day'}),human.id,rng);
  const p=bot(s),e=s.effects[0];assert.equal(p.hotelId,'night');assert.notEqual(s.players.find(x=>!x.bot).hotelId,'night');
  assert.equal(p.money,0);assert.equal(Object.values(p.kitchen).reduce((a,b)=>a+b,0),0);assert.equal(p.cafe.length,0);assert.equal(p.rooms.filter(r=>r.state!=='closed').length,0);
  assert.equal(s.solo.privateStaff.length,5);assert.ok(s.solo.privateStaff.every(id=>STAFF.find(c=>c.id===id).end));assert.equal(e.drawn.length,10);
  const cards=e.drawn.slice(2,8),returned=e.drawn.filter(id=>!cards.includes(id)).toReversed();
  s=action(s,{type:'resolve',promptId:e.uid,cards,returnOrder:returned});
  assert.deepEqual(s.staffDeck.slice(-4),returned);assert.deepEqual(s.players.find(x=>!x.bot).hand,cards);
  const all=[...s.staffDeck,...s.solo.privateStaff,...cards];assert.equal(new Set(all).size,48);assert.equal(all.length,48);
  assert.deepEqual(s.setupOrder,[human.id]);
});
test('solo rejects joining, invalid difficulty, skipped/invalid draft, bot impersonation; failure is immutable',()=>{
  assert.throws(()=>newLobby(human,{mode:'solo',difficulty:'impossible'}));assert.throws(()=>newLobby(human,{mode:'invented'}));
  const lobby=newLobby(human,{mode:'solo'});assert.throws(()=>joinLobby(lobby,{id:'intruder',name:'乙'}));
  const s=startGame(lobby,human.id,rng),before=structuredClone(s),e=s.effects[0];
  for(const a of [{skip:true},{cards:e.drawn.slice(0,5)},{cards:Array(6).fill(e.drawn[0])},{cards:e.drawn.slice(0,6),returnOrder:[999]}])assert.throws(()=>action(s,{type:'resolve',promptId:e.uid,...a}));
  assert.throws(()=>applyAction(s,bot(s).id,{type:'pass'}));assert.deepEqual(s,before);
});
test('guest/room selection follows printed VP, directional ties, color-full fallback and green placement',()=>{
  const s=setup(),p=bot(s);p.rooms.forEach(r=>r.state='closed');
  const guests={1:{id:1,color:'red',vp:2},2:{id:2,color:'red',vp:2},3:{id:3,color:'blue',vp:9},4:{id:4,color:'green',vp:1}};
  s.market=[1,3,2,4];assert.equal(selectSoloGuest(s,p,'red','right',guests).index,0);assert.equal(selectSoloGuest(s,p,'red','left',guests).index,2);
  assert.equal(selectSoloGuest(s,p,'yellow','left',guests).card.id,3);
  for(const r of p.rooms)if(r.color==='red')r.state='occupied';
  assert.equal(selectSoloGuest(s,p,'red','left',guests).card.id,3);
  assert.equal(selectSoloRoom(p,'blue').id,'1-1');assert.equal(selectSoloRoom(p,'green').id,'1-5');
  p.rooms.find(r=>r.id==='1-5').state='occupied';assert.equal(selectSoloRoom(p,'green').id,'2-5');
  p.rooms.forEach(r=>r.state='occupied');assert.equal(selectSoloGuest(s,p,'red','right',guests),undefined);
});
test('die priority prefers pictured faces then counts, fallback to largest pool and hand-direction ties',()=>{
  const dice=[1,1,2,2,3,3,3,6];
  assert.equal(selectSoloDie(dice,[1,2],'right'),1);assert.equal(selectSoloDie(dice,[1,2],'left'),2);
  assert.equal(selectSoloDie(dice,[4,5],'left'),3);assert.equal(selectSoloDie(dice,[],'right'),3);assert.equal(selectSoloDie(dice,[6],'left'),6);
});
test('automa immediately accommodates, takes one die, ignores guest/group rewards and pays nothing',()=>{
  const s=setup('hard','night',198),p=bot(s),turn=s.solo.lastTurn;
  assert.equal(turn.card.id,198);assert.equal(p.cafe.length,0);assert.equal(p.money,0);assert.equal(p.staff.length,1);assert.equal(p.hand.length,0);
  assert.equal(s.solo.privateStaff.length,4);assert.equal(s.effects.length,0);assert.equal(s.dice.length,9);
  assert.equal(p.vp,turn.details.filter(d=>d.kind==='guest').reduce((n,d)=>n+d.vp+d.roomVp,0));assert.deepEqual(p.bonuses,[]);
  assert.equal(s.turn.playerId,human.id);assert.equal(s.turn.number,2);assert.equal(s.solo.turns,1);
});
test('difficulty executes no easy guest on197, no easy/medium guest on200, and two guests on hard207',()=>{
  assert.equal(bot(setup('easy','night',197)).completed.length,0);assert.equal(bot(setup('medium','night',197)).completed.length,1);
  assert.equal(bot(setup('medium','night',200)).completed.length,0);assert.equal(bot(setup('hard','night',200)).completed.length,1);
  assert.equal(bot(setup('easy','night',207)).completed.length,1);assert.equal(bot(setup('hard','night',207)).completed.length,2);
});
test('objectives use three instructions ignoring requirements, least progress fallback, real claimed order',()=>{
  const s=setup(),p=bot(s);s.objectives=['A','B','C'].map(category=>({...OBJECTIVES.find(o=>o.category===category),claimed:[]}));s.solo.progress={A:0,B:0,C:0};
  s.objectives[0].claimed=[human.id];p.money=0;
  for(let i=0;i<3;i++)progressSoloObjective(s,'A','right',()=>{});
  assert.equal(s.solo.progress.A,3);assert.deepEqual(s.objectives[0].claimed,[human.id,p.id]);
  progressSoloObjective(s,'A','left',()=>{});assert.equal(s.solo.progress.C,1);
  progressSoloObjective(s,'any','left',()=>{});assert.equal(s.solo.progress.B,1);
  assert.equal(viewGame(s,human.id).objectives[1].achievedBy.includes(p.id),false);
});
test('all emperor tiles score/retreat automa normally, but never reward or penalize it',()=>{
  for(const tile of EMPERORS)for(const emperor of [0,13]){
    const s=setup(),p=bot(s),h=s.players.find(x=>!x.bot);s.round=tile.category==='A'?3:tile.category==='B'?5:7;s.emperors[[3,5,7].indexOf(s.round)]=tile;
    p.emperor=emperor;h.emperor=s.round+1;const vp=p.vp,rooms=structuredClone(p.rooms),staff=structuredClone(p.staff);
    const round=s.round;internals.endRound(s);assert.equal(p.vp,vp+EMPEROR_VP[emperor]);assert.equal(p.emperor,Math.max(0,emperor-round));assert.equal(p.money,0);assert.deepEqual(p.rooms,rooms);assert.deepEqual(p.staff,staff);
    assert.ok(s.effects.every(e=>e.playerId!==p.id));
  }
});
test('staff29/32/34/40 score only revealed staff, actual occupied rooms and claimed objectives',()=>{
  const s=setup(),p=bot(s),h=s.players.find(x=>!x.bot),def=id=>STAFF.find(c=>c.id===id);
  p.staff=[{id:29},{id:32},{id:34},{id:40}];p.rooms.forEach((r,i)=>r.state=i<3?'occupied':'closed');s.objectives.forEach(o=>o.claimed=[]);s.objectives[0].claimed=[p.id];s.solo.progress={A:3,B:2,C:1};
  assert.equal(internals.endStaffValue(p,def(32),s),8);assert.equal(internals.endStaffValue(p,def(34),s),3);assert.equal(internals.endStaffValue(p,def(40),s),5);
  h.staff=[];assert.equal(internals.endStaffValue(p,def(29),s),0);h.staff=[{id:34}];assert.equal(internals.endStaffValue(p,def(29),s),3);
});
test('solo final scoring ties always favor Leopold, even if human tie-break resources are higher',()=>{
  for(const difference of [0,1]){
    const s=setup(),p=bot(s),h=s.players.find(x=>!x.bot);s.round=7;s.emperors[2]={reward:[],penalty:[]};s.players.forEach(x=>{x.staff=[];x.cafe=[];x.emperor=0;x.rooms.forEach(r=>r.state='closed');x.vp=0;x.kitchen={strudel:0,cake:0,wine:0,coffee:0};});
    h.money=1;p.vp=1-difference;internals.endRound(s);assert.equal(s.phase,'finished');assert.deepEqual(s.winners,[difference?human.id:p.id]);
  }
});
test('private instruction order and private end-staff identities never enter any public view',()=>{
  const s=setup('hard'),v=viewGame(s,human.id);assert.equal(v.solo.deck,undefined);assert.equal(v.solo.privateStaff,undefined);assert.equal(v.tableControls.history,undefined);
  assert.equal(v.players.find(p=>p.bot).hand,undefined);assert.equal(v.solo.lastTurn.card.id,s.solo.lastTurn.card.id);
  assert.deepEqual(advanceTableTime(s),s); // no implicit mutation during a normal human turn
});
test('every instruction can execute at each difficulty without adding money, goods, or optional effects',()=>{
  for(const difficulty of ['easy','medium','hard'])for(const card of LEOPOLD_CARDS){
    const s=setup(difficulty,'night',card.id),p=bot(s),resolved=instruction(card.id,difficulty);
    assert.equal(s.solo.lastTurn.card.id,card.id);assert.equal(p.completed.length,resolved.guests.length);assert.equal(p.money,0);assert.equal(s.effects.length,0);assert.equal(p.cafe.length,0);
    assert.ok(Object.values(p.kitchen).every(n=>n===0));assert.equal(p.staff.length,resolved.extras.filter(e=>e.kind==='staff').length);
  }
});
test('countdown is synchronized to the human turn after consecutive automatic turns and timeout',()=>{
  let s=setup(),now=30000;
  s=action(s,{type:'clock-config',enabled:true,durationSeconds:10,warningSeconds:2,autoStart:true,autoSkip:true,theme:'sand'},now);
  // Human slot2, then3, then bot4 before next round human1.
  s=advanceTableTime(s,{now:now+=11000});assert.equal(s.turn.number,3);
  const before=structuredClone(s);s=advanceTableTime(s,{now:now+=11000});
  assert.equal(s.round,2);assert.equal(s.turn.playerId,human.id);assert.equal(s.turn.number,1);assert.equal(s.tableSession.clock.key,`2:1:${human.id}`);assert.equal(s.tableSession.clock.deadline,now+10000);
  assert.equal(before.round,1);assert.equal(before.solo.turns,1);assert.equal(s.solo.turns,2);
  s=action(s,{type:'table-request',kind:'reroll'},now);assert.equal(s.tableSession.pending,null);assert.equal(s.dice.length,10);
});
test('solo tools approve immediately; undo restores a human action together with consequent bot turns',()=>{
  let s=setup();s=action(s,{type:'die',face:s.dice.find(n=>n!==6)||6,asFace:4});
  while(s.effects.length)s=resolveDefault(s,{skip:true});s=action(s,{type:'endTurn'});
  s=action(s,{type:'die',face:s.dice.find(n=>n!==6)||6,asFace:4});while(s.effects.length)s=resolveDefault(s,{skip:true});
  const before=structuredClone(s);s=action(s,{type:'endTurn'});assert.ok(s.solo.turns>before.solo.turns);
  s=action(s,{type:'table-request',kind:'undo'});assert.equal(s.tableSession.pending,null);assert.deepEqual(s.solo,before.solo);assert.deepEqual(s.dice,before.dice);assert.deepEqual(s.turn,before.turn);
});
for(const difficulty of ['easy','medium','hard'])for(const hotelMode of ['night','day'])test(`full seven-round solo game ${difficulty}/${hotelMode} automates all fourteen turns and survives save/restore`,()=>{
  let s=setup(difficulty,hotelMode),steps=0;
  while(s.phase!=='finished'){
    assert.ok(++steps<1000,'must finish');
    if(s.effects.length){s=resolveDefault(s,{skip:true});continue;}
    assert.equal(s.turn.playerId,human.id);
    if(s.turn.dieTaken){s=action(s,{type:'endTurn'});continue;}
    const h=s.players.find(p=>!p.bot),face=s.dice.find(n=>n!==6)||6;
    if(face===6&&h.money===0){s=action(s,{type:'pass'});continue;}
    s=action(s,{type:'die',face,asFace:4});
    if(steps%5===0)s=JSON.parse(JSON.stringify(s));
  }
  assert.equal(s.solo.turns,14);assert.equal(s.solo.discard.length,14);assert.equal(s.solo.deck.length,6);assert.equal(new Set(s.solo.discard).size,14);
  assert.equal(bot(s).money,0);assert.equal(bot(s).cafe.length,0);assert.equal(bot(s).staff.length+s.solo.privateStaff.length,5);
  const h=s.players.find(p=>!p.bot);assert.deepEqual(s.winners,[h.score.total>bot(s).score.total?h.id:bot(s).id]);
});
