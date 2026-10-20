export const FOODS=['strudel','cake','wine','coffee'];
const total=counts=>FOODS.reduce((n,r)=>n+(counts[r]||0),0);
export function changeFood(effect,counts,resource,delta){
  const next={...counts};if(effect.counts||!FOODS.includes(resource)||effect.pair&&!effect.pair.includes(resource))return next;
  const amount=(next[resource]||0)+delta;
  if(!Number.isInteger(amount)||amount<0)return next;
  next[resource]=amount;
  if(total(next)>effect.amount)return {...counts};
  if(effect.balanced&&next[effect.pair[1]]>next[effect.pair[0]])return {...counts};
  return next;
}
export function canChangeFood(effect,counts,resource,delta){return (changeFood(effect,counts,resource,delta)[resource]||0)!==(counts[resource]||0);}
export function allocationLimit(player,available,allocations,guestId,resource,{limit=Infinity}={}){
  const guest=player.cafe.find(g=>g.uid===guestId);if(!guest)return 0;
  const used=allocations.filter(a=>a.resource===resource).reduce((n,a)=>n+a.amount,0);
  const own=allocations.find(a=>a.guestId===guestId&&a.resource===resource)?.amount||0;
  return Math.max(0,Math.min((available[resource]||0)-used,(guest.needs[resource]||0)-(guest.served[resource]||0)-own,limit-allocations.reduce((n,a)=>n+a.amount,0)));
}
export function missingFoods(guest,allocations=[]){
  return Object.fromEntries(FOODS.map(resource=>[resource,Math.max(0,(guest.needs[resource]||0)-(guest.served[resource]||0)-allocations.filter(a=>a.guestId===guest.uid&&a.resource===resource).reduce((n,a)=>n+a.amount,0))]));
}
export function servingResources(player,guestId,allocations=[]){
  const guest=player.cafe.find(c=>c.uid===guestId);if(!guest)return [];
  const missing=missingFoods(guest);
  // Keep a selected item visible so the player can still reduce it to zero.
  return FOODS.filter(r=>missing[r]>0||allocations.some(a=>a.guestId===guestId&&a.resource===r&&a.amount>0));
}
export function turnEndIntent(game){
  if(game.phase!=='turn'||game.prompt||game.tableControls?.pending||!game.turn)return null;
  if(game.turn.dieTaken)return {type:'endTurn'};
  return !game.turn.touched&&!game.turn.guestTaken?{type:'pass'}:null;
}
// Read-only quote for the action picker. The server still validates the real move.
export function dicePlan(game,player,{face,asFace=1,boost=false},{extra=false}={}){
  const copy=face===6,count=game.dice.filter(n=>n===face).length,actionFace=copy?asFace:face;
  const wildcardHelper=!extra&&copy&&player.staff.some(c=>c.mechanics?.freeWildcard);
  const staffPower=extra?0:player.staff.reduce((n,c)=>n+(c.mechanics?.on==='dieTaken'&&c.mechanics.faces?.includes(face)&&!c.mechanics.freeWildcard?(c.mechanics.power||0):0),0)+(wildcardHelper?1:0);
  const copyFee=copy&&!wildcardHelper?1:0,cost=copyFee+(boost?1:0),strength=count+staffPower+(boost?1:0);
  let reason='';
  if(!count)reason='这个点数没有可用骰子';
  else if(!Number.isInteger(actionFace)||actionFace<1||actionFace>5)reason='请选择一种动作';
  else if(boost&&(extra||game.turn?.boostUsed))reason='本次不能增强行动';
  else if(player.money<cost)reason='克朗不足';
  return {copy,count,actionFace,copyFee,cost,staffPower,strength,valid:!reason,reason};
}
export function diceMainEffect(game,player,selection,{extra=false}={}){
  const plan=dicePlan(game,player,selection,{extra}),amount=plan.strength,face=plan.actionFace;
  if(face<=2)return {kind:'goods',amount,pair:face===1?['strudel','cake']:['wine','coffee'],balanced:true};
  if(face===3)return {kind:'prepare',amount};
  if(face===4)return {kind:!extra&&selection.face===4&&player.staff.some(c=>c.mechanics?.bothMoneyAndEmperor)?'bothMoneyEmperor':'moneyEmperor',amount};
  return {kind:'hire',discount:amount+(!extra&&selection.face===5?player.staff.reduce((n,c)=>n+(c.mechanics?.on==='dieTaken'&&c.mechanics.faces?.includes(5)?c.mechanics.discount||0:0),0):0)};
}
const roomCost=(p,r,e)=>e.free||p.staff.some(c=>c.mechanics?.freeRoomColor===r.color)?0:Math.max(0,r.floor-1-(e.discount||0)-p.staff.reduce((n,c)=>n+(c.traits?.roomDiscount||0),0));
export const roomPreparationCost=roomCost;
export function selectableRooms(player,e,selected=[],checkinGuest=null){
  const rooms=player.rooms.map(r=>({...r})),picked=new Set(selected),mode=e.kind;
  let money=player.money;
  for(const id of selected){const r=rooms.find(x=>x.id===id);if(!r)continue;if(mode==='prepare'){money-=roomCost(player,r,e);r.state='prepared';}else r.state='closed';}
  return rooms.filter(r=>{
    if(picked.has(r.id)||selected.length>=(e.amount??e.floors?.length??1))return false;
    if(checkinGuest)return r.state==='prepared'&&(checkinGuest.color==='green'||r.color===checkinGuest.color);
    if(mode==='prepare')return r.state==='closed'&&(!e.color||r.color===e.color)&&(!e.maxFloor||r.floor<=e.maxFloor)&&money>=roomCost(player,r,e)&&(rooms.some(x=>x.state!=='closed')?rooms.some(x=>x.state!=='closed'&&Math.abs(x.floor-r.floor)+Math.abs(x.col-r.col)===1):r.floor===1&&r.col===1);
    if(mode==='occupy')return r.state==='prepared'&&(!e.color||r.color===e.color);
    if(e.penalty==='removePrepared')return r.state==='prepared'&&r.floor===Math.max(...rooms.filter(x=>x.state==='prepared').map(x=>x.floor));
    if(e.penalty==='removeOccupied')return r.state==='occupied'&&r.floor===e.floors[selected.length];
    return false;
  }).map(r=>r.id);
}
export function turnIdentity(g,code,playerId){return [code,g.round,g.phase,g.activePlayerId,g.turn?.number,playerId].join(':');}
export function shouldOfferGuest(g,p){return !g.tableControls?.pending&&p.cafe.length<3&&g.activePlayerId===p.id&&!g.prompt&&(g.phase==='setupGuest'||g.phase==='turn'&&!g.turn?.dieTaken&&!g.turn?.guestTaken);}

export function draftGuest(g,index){const card=g.market[index];return card?{index,guestId:card.id}:null;}
export function guestSelection(g,p,draft){
  const card=draft&&g.market[draft.index];
  const cost=card&&(g.phase==='setupGuest'||g.prompt?.kind==='attract'||p.staff.some(c=>c.mechanics?.guestQueueCost===0)?0:[3,2,1,0,0][draft.index]);
  let reason='';
  if(!card)reason='请先点选一位客人';
  else if(card.id!==draft.guestId)reason='客人市场已变化，请重新选择';
  else if(g.activePlayerId!==p.id)reason='等待你的回合再迎客';
  else if(!(shouldOfferGuest(g,p)||g.prompt?.kind==='attract'&&g.prompt.playerId===p.id))reason='当前不能迎客';
  else if(p.cafe.length>=3)reason='咖啡厅已满，请先安排入住';
  else if(p.money<cost)reason='克朗不足';
  return {valid:!reason,reason,card,cost,index:draft?.index};
}
