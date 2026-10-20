// Public, bounded action receipts. Never copy actions, effects or private cards.
import {GUESTS,STAFF} from './catalog.mjs';
const names={strudel:'苹果卷',cake:'蛋糕',wine:'葡萄酒',coffee:'咖啡'};
const guestNames=Object.fromEntries(GUESTS.map(c=>[c.id,c.name])),staffNames=Object.fromEntries(STAFF.map(c=>[c.id,c.name]));
export const ACTIVITY_KINDS={guest:'正在挑选客人',dice:'正在选择骰子动作',food:'正在分配食物',staff:'正在挑选员工',rooms:'正在选择房间',turn:'正在查看饭店',idle:'等待操作'};
export function publishActivity(s,playerId,steps,{now=Date.now(),round=s.round,number=s.turn?.number}={}){
  if(!steps.length)return;
  s.activity||={serial:0,batch:0,events:[]};const a=s.activity,group=++a.batch;
  for(const step of steps)a.events.push({...step,id:++a.serial,group,playerId,round,number,at:now});
  a.events=a.events.slice(-96);
}
export function publicActivity(s){
  const a=s.activity;return a?{serial:a.serial,events:structuredClone(a.events)}:{serial:0,events:[]};
}
export function recordAction(before,after,playerId,action,{now=Date.now()}={}){
  // Undo restores the board, not the public receipt sequence or already-known information.
  after.activity=structuredClone(before.activity||{serial:0,batch:0,events:[]});
  const p=after.players.find(p=>p.id===playerId),old=before.players.find(p=>p.id===playerId),steps=[];
  const add=(kind,text,fields={})=>steps.push({kind,text,...fields});
  if(action.type==='start')add('turn',`${p.name}开始了对局。`);
  else if(action.type==='draftStaff')add('staff',`${p.name}保留了第${p.hand.length}张起始员工。`);
  else if(action.type==='resolve'&&before.effects?.[0]?.kind==='soloDraft')add('staff',`${p.name}保留了六张起始员工。`);
  else if(action.type==='table-vote'||action.type==='table-request'){
    if(after.tableSession?.notice?.id!==before.tableSession?.notice?.id&&after.tableSession?.notice)add('turn',after.tableSession.notice.text);
  }else if(action.type==='pass')add('turn',`${p.name}暂缓行动，保留本轮机会。`);
  else if(action.type==='endTurn'||action.type==='__clock-expire')add('turn',`${p.name}${action.type==='endTurn'?'结束了回合':'倒计时结束，本回合已结束'}。`);
  else if(!action.type.startsWith('clock-')&&!action.type.startsWith('table-')){
    if(action.type==='die'||action.type==='resolve'&&before.effects?.[0]?.kind==='die')add('die',`${p.name}${action.type==='resolve'?'执行奖励骰子行动':'取走'+action.face+'点骰'}${action.face===6?'，复制动作'+action.asFace:''}${action.boost?'，强度加一':''}。`,{face:action.face});
    for(const guest of p.cafe||[]){
      const previous=old.cafe?.find(g=>g.uid===guest.uid);
      if(!previous){add('guest',`${p.name}迎接了${guestNames[guest.id]}。`,{guestId:guest.id});}
      else{
        const foods=Object.keys(names).filter(r=>guest.served[r]>previous.served[r]).map(r=>`${names[r]}×${guest.served[r]-previous.served[r]}`);
        if(foods.length)add('food',`${p.name}给${guestNames[guest.id]}上菜：${foods.join('、')}。`,{guestId:guest.id});
      }
    }
    for(const room of p.rooms||[]){
      const prev=old.rooms?.find(r=>r.id===room.id);if(!prev||prev.state===room.state)continue;
      add('room',`${p.name}${room.state==='occupied'?'安排客人入住':room.state==='prepared'?'准备了':'移除了'}${room.id.replace('-','0')}号房。`,{roomId:room.id});
    }
    for(const staff of p.staff||[])if(!old.staff?.some(c=>c.id===staff.id))add('staff',`${p.name}雇用了${staffNames[staff.id]}。`,{staffId:staff.id});
    if(action.type==='activate')add('staff',`${p.name}使用了${staffNames[action.staffId]}的能力。`,{staffId:action.staffId});
    for(const o of after.objectives||[])if(o.claimed.includes(playerId)&&!before.objectives?.find(x=>x.id===o.id)?.claimed.includes(playerId))add('objective',`${p.name}领取了目标「${o.name}」。`);
    const foods=Object.keys(names).filter(r=>p.kitchen?.[r]>old.kitchen?.[r]).map(r=>`${names[r]}×${p.kitchen[r]-old.kitchen[r]}`);
    if(foods.length)add('food',`${p.name}的厨房获得${foods.join('、')}。`);
    if(p.money!==old.money)add('money',`${p.name}的克朗${old.money} → ${p.money}。`);
    if(p.vp!==old.vp)add('vp',`${p.name}的分数${old.vp} → ${p.vp}。`);
    if(p.emperor!==old.emperor)add('emperor',`${p.name}的皇冠${old.emperor} → ${p.emperor}格。`);
    if(!steps.length&&action.type==='resolve')add('turn',`${p.name}处理了奖励或处罚。`);
  }
  publishActivity(after,playerId,steps,{now,round:before.round||after.round,number:before.turn?.number});
}
export function liveActivity(room,now=Date.now()){
  const a=room.liveActivity;if(!a||a.expiresAt<=now||a.version!==room.version||!Object.hasOwn(ACTIVITY_KINDS,a.kind))return null;
  const g=room.game,actor=g.phase==='setupStaff'?g.staffDraft?.order[g.staffDraft.index]:g.effects?.[0]?.playerId||(['setupGuest','setupRooms'].includes(g.phase)?g.setupOrder[g.setupIndex]:g.turn?.playerId);
  return a.playerId===actor?{playerId:a.playerId,kind:a.kind,expiresAt:a.expiresAt}:null;
}
