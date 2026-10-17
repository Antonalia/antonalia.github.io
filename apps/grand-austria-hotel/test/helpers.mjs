import { newLobby, joinLobby, startGame, applyAction, viewGame, internals } from '../lib/game.mjs';
import { STAFF } from '../lib/catalog.mjs';
export function ready(n=2, mode='night') {
  let s=newLobby({id:'p1',name:'甲'},{hotelMode:mode});
  for(let i=2;i<=n;i++)s=joinLobby(s,{id:`p${i}`,name:`玩家${i}`});
  s=startGame(s,'p1',max=>max-1);
  while(s.phase==='setupGuest')s=applyAction(s,s.setupOrder[s.setupIndex],{type:'setupGuest',index:4});
  while(s.phase==='setupRooms')s=applyAction(s,s.setupOrder[s.setupIndex],{type:'setupRooms',rooms:['1-1','1-2','1-3']});
  return s;
}
export function active(s){return s.effects[0]?.playerId||s.turn?.playerId;}
export function resolveDefault(s,{skip=false}={}) {
  const e=s.effects[0],p=s.players.find(x=>x.id===e.playerId),a={type:'resolve',promptId:e.uid};
  if(skip&&e.kind!=='penalty'&&e.kind!=='conference')return applyAction(s,p.id,{...a,skip:true});
  if(e.kind==='goods') {
    a.counts=e.counts||Object.fromEntries((e.pair||['strudel']).map((r,i)=>[r,i===0?e.amount:0]));
    a.allocations=[];const left={...a.counts};
    for(const g of p.cafe)for(const [resource,count]of Object.entries(g.served)){
      const need=(internals.guestById[g.id].needs[resource]||0)-count,n=Math.min(need,left[resource]||0);
      if(n>0){a.allocations.push({guestId:g.uid,resource,amount:n});left[resource]-=n;}
    }
  }else if(e.kind==='prepare'){
    a.rooms=[];let copy=structuredClone(s),cp=copy.players.find(x=>x.id===p.id);
    for(let i=0;i<e.amount;i++){
      let found=false;
      for(const r of cp.rooms){try{internals.prepareOne(copy,cp,r.id,e);a.rooms.push(r.id);found=true;break;}catch{}}
      if(!found)break;
    }
  }else if(e.kind==='moneyEmperor')a.emperor=Math.min(e.amount,Math.max(0,Math.min(13,s.round+5)-p.emperor));
  else if(e.kind==='hire'){
    const ids=(e.drawn||p.hand).filter(id=>p.money>=(e.free?0:Math.max(0,internals.staffById[id].cost-(e.discount||0))));
    ids.sort((a,b)=>internals.staffById[a].cost-internals.staffById[b].cost);
    if(ids.length)a.staffId=ids[0];else if(e.drawn)a.staffId=null;else a.skip=true;
  }else if(e.kind==='attract')a.index=4;
  else if(e.kind==='complete')a.guestId=p.cafe.find(g=>!e.color||internals.guestById[g.id].color===e.color).uid;
  else if(e.kind==='occupy')a.roomId=p.rooms.find(r=>r.state==='prepared'&&(!e.color||r.color===e.color)).id;
  else if(e.kind==='die') {a.face=s.dice.find(f=>f!==6)||6;a.asFace=4;}
  else if(e.kind==='conference')a.pay=true;
  else if(e.kind==='penalty') {
    if(e.penalty==='discardHand')a.cards=p.hand.slice(0,e.amount);
    if(e.penalty==='removeEndStaff')a.staffId=p.staff.find(x=>internals.staffById[x.id].end).id;
    if(e.penalty==='removePrepared')a.rooms=p.rooms.filter(r=>r.state==='prepared').sort((a,b)=>b.floor-a.floor).slice(0,e.amount).map(x=>x.id);
    if(e.penalty==='removeOccupied')a.rooms=e.floors.map(f=>p.rooms.find(r=>r.floor===f&&r.state==='occupied').id);
  }
  return applyAction(s,p.id,a);
}
export function drain(s,limit=100) {for(let n=0;s.effects.length;n++){if(n>=limit)throw new Error('effect loop');s=resolveDefault(s);}return s;}
export function putStaff(s,p,id){for(const pl of s.players)pl.hand=pl.hand.filter(x=>x!==id);s.staffDeck=s.staffDeck.filter(x=>x!==id);p.staff.push({id,usedRound:0});}
export function playFullGame(n=2,mode='night'){
  let s=ready(n,mode),steps=0;
  while(s.phase!=='finished'){
    if(++steps>3000)throw new Error('full game stalled');
    if(s.effects.length){s=resolveDefault(s);continue;}
    const id=s.turn.playerId,p=s.players.find(x=>x.id===id),g=viewGame(s,id);
    const affordable=s.dice.some(f=>f!==6)||p.money>=1||p.staff.some(x=>x.id===17);
    if(!s.turn.touched&&!affordable){s=applyAction(s,id,{type:'pass'});continue;}
    const activate=p.staff.find(c=>STAFF.find(d=>d.id===c.id).timing==='round'&&c.usedRound!==s.round);
    if(activate){s=applyAction(s,id,{type:'activate',staffId:activate.id});continue;}
    const complete=g.players.find(x=>x.id===id).cafe.find(c=>c.complete&&p.rooms.some(r=>r.state==='prepared'&&(c.color==='green'||r.color===c.color)));
    if(complete){const r=p.rooms.find(r=>r.state==='prepared'&&(complete.color==='green'||r.color===complete.color));s=applyAction(s,id,{type:'checkin',guestId:complete.uid,roomId:r.id});continue;}
    const eligible=g.objectives.find(o=>o.eligible&&!o.claimed.includes(id));
    if(eligible){s=applyAction(s,id,{type:'claim',objectiveId:eligible.id});continue;}
    const allocations=[],left={...p.kitchen};let count=0;
    for(const c of p.cafe)for(const r of ['strudel','cake','wine','coffee']){const need=(internals.guestById[c.id].needs[r]||0)-c.served[r],take=Math.min(3-count,left[r],need);if(take>0){allocations.push({guestId:c.uid,resource:r,amount:take});left[r]-=take;count+=take;}}
    if(count&&(p.money>0||p.staff.some(c=>c.id===24))){s=applyAction(s,id,{type:'serve',allocations});continue;}
    if(!s.turn.dieTaken){
      const available=[...new Set(s.dice)];let face;
      if(available.includes(4))face=4;
      else if(available.includes(3)&&p.rooms.filter(r=>r.state==='prepared').length<4)face=3;
      else if(available.includes(5)&&p.hand.length)face=5;
      else face=available.find(x=>x!==6)||6;
      s=applyAction(s,id,{type:'die',face,asFace:4});continue;
    }
    s=applyAction(s,id,{type:'endTurn'});
  }
  return {s,steps};
}
