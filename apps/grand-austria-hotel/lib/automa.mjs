// Dinner for One, base-game Leopold. Mechanical facts: official rules pp. 2–6
// and instruction cards 193–212; cross-checked with brdgm's Solo Helper.
export const SOLO_LEVELS={easy:'简单',medium:'标准',hard:'困难'};
const guest=(color,min=0)=>({color,min});
const extra=(kind,value,min=0)=>({kind,value,min});
const row=(id,guests,dice,extras,hand)=>({id,guests,dice,extras,hand});
export const LEOPOLD_CARDS=[
  row(193,[guest('blue')],[1],[extra('objective','any',2)],'right'),
  row(194,[guest('red')],[2],[extra('emperor',1),extra('objective','B')],'left'),
  row(195,[guest('any')],[3],[extra('objective','C')],'right'),
  row(196,[guest('yellow')],[4],[extra('emperor',2),extra('objective','A',1)],'left'),
  row(197,[guest('green',1)],[5],[extra('emperor',3)],'right'),
  row(198,[guest('red')],[6],[extra('staff',1),extra('objective','B',2)],'left'),
  row(199,[guest('blue')],[],[extra('emperor',2),extra('objective','C')],'right'),
  row(200,[guest('any',2)],[],[extra('objective','A')],'left'),
  row(201,[guest('yellow')],[],[extra('emperor',1),extra('staff',1)],'right'),
  row(202,[guest('red')],[],[extra('emperor',3),extra('objective','any',1)],'left'),
  row(203,[guest('green'),guest('any',1)],[],[extra('objective','A')],'right'),
  row(204,[guest('green')],[],[extra('objective','B')],'left'),
  row(205,[guest('blue')],[],[extra('emperor',2),extra('staff',1,1)],'right'),
  row(206,[guest('yellow')],[],[extra('staff',1),extra('emperor',2,1)],'left'),
  row(207,[guest('red'),guest('any',2)],[1,2],[extra('emperor',2),extra('staff',1,2)],'right'),
  row(208,[guest('any')],[3,4],[extra('emperor',1),extra('objective','C',2)],'left'),
  row(209,[guest('green')],[5,6],[extra('emperor',1),extra('objective','A')],'right'),
  row(210,[guest('blue')],[2,3],[extra('emperor',4)],'left'),
  row(211,[guest('any')],[4,5],[extra('objective','B'),extra('emperor',2)],'right'),
  row(212,[guest('yellow'),guest('any')],[1,6],[extra('objective','C')],'left')
];
export function instruction(id,difficulty){
  const card=LEOPOLD_CARDS.find(c=>c.id===id),level=['easy','medium','hard'].indexOf(difficulty);
  if(!card||level<0)throw new Error('未知单人指令');
  return {...card,guests:card.guests.filter(x=>x.min<=level),extras:card.extras.filter(x=>x.min<=level)};
}
// A right-pointing hand scans left-to-right; a left hand scans right-to-left.
const first=(xs,hand)=>hand==='right'?xs[0]:xs.at(-1);
export function selectSoloRoom(p,color){
  return p.rooms.filter(r=>r.state!=='occupied'&&(color==='green'||r.color===color))
    .sort(color==='green'?(a,b)=>b.col-a.col||a.floor-b.floor:(a,b)=>a.floor-b.floor||a.col-b.col)[0];
}
export function selectSoloGuest(s,p,color,hand,guestById){
  const all=s.market.map((id,index)=>({card:guestById[id],index})).filter(x=>x.card&&selectSoloRoom(p,x.card.color));
  const matching=all.filter(x=>x.card.color===color),pool=matching.length?matching:all;
  const max=Math.max(...pool.map(x=>x.card.vp));return first(pool.filter(x=>x.card.vp===max),hand);
}
export function selectSoloDie(dice,preferred,hand){
  const faces=[1,2,3,4,5,6].filter(n=>dice.includes(n));
  const selected=faces.filter(n=>preferred.includes(n)),pool=selected.length?selected:faces;
  const max=Math.max(...pool.map(n=>dice.filter(x=>x===n).length));
  return first(pool.filter(n=>dice.filter(x=>x===n).length===max),hand);
}
export const opponentState=(s,id)=>s.solo?.opponents?.[id]||s.solo;
export function progressSoloObjective(s,category,hand,log,playerId){
  const p=s.players.find(x=>x.id===playerId)||s.players.find(x=>x.bot),solo=opponentState(s,p.id),remaining=s.objectives.filter(o=>!o.claimed.includes(p.id)&&o.claimed.length<o.points.length);
  let target=remaining.find(o=>o.category===category);
  if(!target){const min=Math.min(...remaining.map(o=>solo.progress[o.category]||0));target=first(remaining.filter(o=>(solo.progress[o.category]||0)===min),hand);}
  if(!target)return null;
  const progress=solo.progress[target.category]=(solo.progress[target.category]||0)+1;
  let vp=0;
  if(progress===3){vp=target.points[target.claimed.length]||0;target.claimed.push(p.id);p.vp+=vp;}
  log(s,`${p.name}的${target.category}目标：${progress===3?`领取${vp}分`:progress===1?'Ⅲ → 还需两次':'Ⅱ → 还需一次'}。`);
  return {kind:'objective',category:target.category,progress,vp};
}
export function initializeSolo(s,rng,{shuffle,staffById}){
  const bots=s.players.filter(x=>x.bot),human=s.players.find(x=>!x.bot);
  if(bots.length>1)s.solo.opponents={};
  for(const p of bots){
    p.money=0;p.kitchen={strudel:0,cake:0,wine:0,coffee:0};p.hand=[];
    // The custom multiple-opponent variant uses independent digital staff copies.
    // Only 13 end staff exist, so three five-card private decks cannot share the physical deck.
    const pool=s.solo.opponents?Object.values(staffById).filter(c=>c.end).map(c=>c.id):s.staffDeck.filter(id=>staffById[id].end);
    const privateStaff=shuffle(pool,rng).slice(0,5);
    if(privateStaff.length!==5)throw new Error('自动对手终局员工不足');
    if(!s.solo.opponents)s.staffDeck=shuffle(s.staffDeck.filter(id=>!privateStaff.includes(id)),rng);
    const data={difficulty:s.solo.difficulty,privateStaff,deck:shuffle(LEOPOLD_CARDS.map(x=>x.id),rng),discard:[],progress:{A:0,B:0,C:0},turns:0,lastTurn:null};
    if(s.solo.opponents)s.solo.opponents[p.id]=data;else Object.assign(s.solo,data);
  }
  s.solo.initialStaff=s.staffDeck.splice(0,10);human.hand=[];
}
export function runSolo(s,{rng,shuffle,guestById,drawGuest,addEmperor,finishTurn,log,publishActivity,now=Date.now()}){
  if(!s.solo||s.effects?.length||s.phase!=='turn'||!s.players.find(p=>p.id===s.turn?.playerId)?.bot)return s;
  // Normally exactly 14 instructions are used in seven rounds; persistence keeps
  // the remaining deck private and a bounded loop also covers consecutive turns.
  for(let n=0;n<s.players.length*4&&s.phase==='turn'&&!s.effects.length&&s.players.find(x=>x.id===s.turn?.playerId)?.bot;n++){
    const p=s.players.find(x=>x.id===s.turn.playerId),solo=opponentState(s,p.id),round=s.round,number=s.turn.number;
    if(!solo.deck.length){solo.deck=shuffle(solo.discard,rng);solo.discard=[];}
    const id=solo.deck.shift();solo.discard.push(id);
    const card=instruction(id,solo.difficulty),details=[];
    log(s,`${p.name}翻开指令${id}（${SOLO_LEVELS[solo.difficulty]}）。`);
    for(const choice of card.guests){
      const selected=selectSoloGuest(s,p,choice.color,card.hand,guestById);
      if(!selected){details.push({kind:'guest',skipped:true});continue;}
      const {card:guest,index}=selected,r=selectSoloRoom(p,guest.color);
      p.vp+=guest.vp+r.vp;r.state='occupied';p.completed.push(guest.id);
      s.market.splice(index,1);s.guestDiscard.push(guest.id);s.market.unshift(drawGuest(s));
      details.push({kind:'guest',id:guest.id,name:guest.name,roomId:r.id,vp:guest.vp,roomVp:r.vp});
      log(s,`${p.name}接待${guest.name}，入住${r.floor}0${r.col}，获得${guest.vp+r.vp}分。`);
    }
    const face=selectSoloDie(s.dice,card.dice,card.hand);
    if(face){s.dice.splice(s.dice.indexOf(face),1);details.push({kind:'die',face});log(s,`${p.name}取走${face}点骰，不执行骰面主动作。`);}
    for(const e of card.extras){
      if(e.kind==='emperor'){addEmperor(p,e.value);details.push({kind:'emperor',amount:e.value});log(s,`${p.name}的皇冠前进${e.value}格。`);}
      if(e.kind==='staff'){
        const id=solo.privateStaff.shift();if(id){p.staff.push({id,usedRound:0});details.push({kind:'staff',id});log(s,`${p.name}翻开一张私人终局员工。`);}
      }
      if(e.kind==='objective'){const result=progressSoloObjective(s,e.value,card.hand,log,p.id);if(result)details.push(result);}
    }
    solo.turns++;solo.lastTurn={round:s.round,number:s.turn.number,card,details};
    publishActivity?.(s,p.id,[{kind:'instruction',text:`${p.name}翻开指令${id}（${SOLO_LEVELS[solo.difficulty]}）。`},...details.map(d=>d.kind==='guest'?{kind:'room',guestId:d.id,roomId:d.roomId,text:d.skipped?`${p.name}没有可入住的市场客人。`:`${p.name}接待${d.name}，入住${d.roomId.replace('-','0')}号房，+${d.vp+d.roomVp}分。`}:d.kind==='die'?{kind:'die',face:d.face,text:`${p.name}取走${d.face}点骰。`}:d.kind==='emperor'?{kind:'emperor',text:`${p.name}皇冠前进${d.amount}格。`}:d.kind==='staff'?{kind:'staff',staffId:d.id,text:`${p.name}翻开一张终局员工。`}:{kind:'objective',text:`${p.name}推进${d.category}目标：${d.progress===3?'领取'+d.vp+'分':d.progress===1?'Ⅲ，还需两次':'Ⅱ，还需一次'}。`})],{now,round,number});
    s.roundPlayStarted=true;finishTurn(s);
  }
  return s;
}
export function soloView(s){
  if(!s.solo)return undefined;
  const opponents=s.players.filter(p=>p.bot).map(p=>{const data=opponentState(s,p.id);return {playerId:p.id,name:p.name,bot:'leopold',difficulty:data.difficulty,levelName:SOLO_LEVELS[data.difficulty],progress:{...data.progress},turns:data.turns||0,deckCount:data.deck?.length??20,privateStaffCount:data.privateStaff?.length??5,lastTurn:data.lastTurn?structuredClone(data.lastTurn):null};});
  return {...opponents[0],botCount:opponents.length,variant:opponents.length>1?'multiple':'official',opponents};
}
