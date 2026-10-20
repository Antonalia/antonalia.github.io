import { randomInt } from 'node:crypto';
import { STAFF, GUESTS, HOTELS, OBJECTIVES, EMPERORS, EMPEROR_VP, GROUP_BONUS } from './catalog.mjs';
import {applyTableAction,viewTableControls,advanceTableClock,synchronizeAutomaticClock} from './table-session.mjs';
import {SOLO_LEVELS,initializeSolo,runSolo,soloView} from './automa.mjs';
import {publishActivity,publicActivity,recordAction} from './activity.mjs';

export const RESOURCES = ['strudel', 'cake', 'wine', 'coffee'];
export const LABELS = { strudel: '苹果卷', cake: '蛋糕', wine: '葡萄酒', coffee: '咖啡', red: '红', blue: '蓝', yellow: '黄', green: '绿' };
const staffById = Object.fromEntries(STAFF.map(x => [x.id, x]));
const guestById = Object.fromEntries(GUESTS.map(x => [x.id, x]));
const sum = xs => xs.reduce((a, b) => a + b, 0);
const blankGoods = () => Object.fromEntries(RESOURCES.map(x => [x, 0]));
const assert = (condition, message) => { if (!condition) throw Object.assign(new Error(message), { status: 400 }); };
const int = (n, min = 0, max = 100) => Number.isInteger(n) && n >= min && n <= max;
export const shuffle = (xs, rng = randomInt) => {
  const result = [...xs];
  for (let i = result.length - 1; i > 0; i--) { const j = rng(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
export function newLobby(host, { name = '好友饭店', maxPlayers = 4, hotelMode = 'night', mode='friends', difficulty='medium', botCount=1, staffSetup='draft' } = {}) {
  assert(['friends','solo'].includes(mode),'未知对局模式');
  assert(mode!=='solo'||Object.hasOwn(SOLO_LEVELS,difficulty),'未知单人难度');
  if(mode==='solo'){assert(int(botCount,1,3),'人机数量必须为1–3个');maxPlayers=botCount+1;}
  assert(int(maxPlayers, 2, 4), '人数必须为 2–4 人');
  assert(['night', 'day'].includes(hotelMode), '未知酒店版面');
  assert(['draft','random'].includes(staffSetup),'未知起始员工方式');
  return { rules: 'retail-2021', phase: 'lobby', name: String(name).trim().slice(0, 40) || '好友饭店', hostId: host.id,
    maxPlayers, hotelMode, staffSetup, ...(mode==='solo'?{solo:{difficulty,botCount}}:{}), players: [{ id: host.id, name: host.name },...mode==='solo'?Array.from({length:botCount},(_,i)=>({id:i?`automa-leopold-${i+1}`:'automa-leopold',name:botCount===1?'Leopold':`Leopold ${['Ⅰ','Ⅱ','Ⅲ'][i]}`,bot:true})):[]], log: [], revision: 0, promptSerial: 0 };
}
export function joinLobby(state, player) {
  if (state.players.some(p => p.id === player.id)) return state;
  assert(!state.solo,'单人对局不能加入其他玩家');
  assert(state.phase === 'lobby', '对局已开始，只有原玩家可以重新连接');
  assert(state.players.length < state.maxPlayers, '房间已满');
  const s = structuredClone(state); s.players.push({ id: player.id, name: player.name }); return s;
}
const has = (p, key) => p.staff.some(x => staffById[x.id].key === key);
const traits = (p, name) => sum(p.staff.map(x => Number(staffById[x.id].traits?.[name] || 0)));
const log = (s, text) => { s.log.push({ round: s.round || 0, text }); if (s.log.length > 160) s.log.shift(); };
const addMoney = (p, amount) => { p.money = Math.min(20, Math.max(0, p.money + amount)); };
function addEmperor(p, amount) { const n = p.emperor + amount; p.vp += Math.max(0, n - 13); p.emperor = Math.min(13, Math.max(0, n)); }
function spend(p, amount) { assert(p.money >= amount, '克朗不足'); p.money -= amount; }
const occupied = p => p.rooms.filter(x => x.state === 'occupied');
const prepared = p => p.rooms.filter(x => x.state !== 'closed');
const emptyRooms = p => p.rooms.filter(x => x.state === 'prepared');
const roomById = (p, id) => { const r = p.rooms.find(x => x.id === id); assert(r, '房间不存在'); return r; };
const me = (s, id) => { const p = s.players.find(x => x.id === id); assert(p, '你不是本局玩家'); return p; };
const guest = (p, id) => { const g = p.cafe.find(x => x.uid === id); assert(g, '咖啡厅中没有这位客人'); return g; };
const nextUid = s => `e${++s.promptSerial}`;
const queue = (s, p, effects) => { s.effects.unshift(...effects.map(x => ({ ...x, playerId: p.id, uid: nextUid(s) }))); };
function drawGuest(s) {
  if (!s.guestDeck.length && s.guestDiscard.length) { s.guestDeck = shuffle(s.guestDiscard); s.guestDiscard = []; }
  return s.guestDeck.shift() || null;
}
function takeGuest(s, p, index, free = false) {
  assert(int(index, 0, s.market.length - 1) && s.market[index], '请选择仍在市场中的客人');
  assert(p.cafe.length < 3, '咖啡厅已经有 3 位客人');
  // Index 0 is the newest / most expensive slot; guests slide towards the free right end.
  const cost = free || has(p, 'delivery_boy') ? 0 : Math.max(0, [3, 2, 1, 0, 0][index] - traits(p, 'guestDiscount'));
  spend(p, cost);
  const id = s.market.splice(index, 1)[0];
  p.cafe.push({ uid: nextUid(s), id, served: blankGoods() });
  s.market.unshift(drawGuest(s));
  log(s, `${p.name}迎接了${guestById[id].name}。`);
}
function drawStaff(s, n) { return s.staffDeck.splice(0, n); }
function roomCost(p, r, effect = {}) { return effect.free || p.staff.some(x => staffById[x.id].mechanics.freeRoomColor === r.color) ? 0 : Math.max(0, r.floor - 1 - (effect.discount || 0) - traits(p, 'roomDiscount')); }
function adjacent(p, r) { return p.rooms.some(x => x.state !== 'closed' && Math.abs(x.col - r.col) + Math.abs(x.floor - r.floor) === 1); }
function prepareOne(s, p, id, effect = {}) {
  const r = roomById(p, id);
  assert(r.state === 'closed', '该房间已经准备或入住');
  assert(!effect.color || r.color === effect.color, '房间颜色不符合要求');
  assert(!effect.maxFloor || r.floor <= effect.maxFloor, '楼层不符合要求');
  assert(prepared(p).length ? adjacent(p, r) : r.col === 1 && r.floor === 1, '房间必须连接已有房间，首次从左下角开始');
  spend(p, roomCost(p, r, effect)); r.state = 'prepared'; p.vp += r.vp || 0;
  return r;
}
const isComplete = g => RESOURCES.every(r => g.served[r] >= (guestById[g.id].needs[r] || 0));
function missing(g, r) { return Math.max(0, (guestById[g.id].needs[r] || 0) - g.served[r]); }
function groupEffects(s, p, r) {
  const group = p.rooms.filter(x => x.group === r.group);
  if (p.bonuses.includes(r.group) || !group.every(x => x.state === 'occupied')) return [];
  p.bonuses.push(r.group);
  const n = group.length;
  const amount = GROUP_BONUS[r.color][n - 1];
  return [{ kind: r.color === 'blue' ? 'vp' : r.color === 'red' ? 'money' : 'emperor', amount }];
}
function occupancyEffects(s, p, r) { return [...(has(p, 'custodian') ? [{ kind:'money',amount:1 }] : []), ...groupEffects(s,p,r)]; }
function receiveGuest(s, p, uid, roomId, bonusFirst = false) {
  const g = guest(p, uid), c = guestById[g.id], r = roomById(p, roomId);
  assert(isComplete(g), '这位客人的订单还没有完成');
  assert(r.state === 'prepared' && (c.color === 'green' || c.color === r.color), '需要相同颜色的空房，绿色客人可选任意颜色');
  r.state = 'occupied'; p.cafe.splice(p.cafe.indexOf(g), 1); s.guestDiscard.push(g.id);
  p.vp += c.vp; p.completed.push({ id: c.id, color: c.color, vp: c.vp });
  const bonus = occupancyEffects(s, p, r);
  const employee = [];
  for (const card of p.staff) {
    const def = staffById[card.id];
    if (def.trigger?.event === 'checkin' && (!def.trigger.color || def.trigger.color === c.color) && (!def.trigger.minOrderSize || sum(Object.values(c.needs)) >= def.trigger.minOrderSize)) employee.push(...def.trigger.effects);
  }
  const rewards = [...(c.effects || []), ...employee];
  queue(s, p, bonusFirst ? [...bonus, ...rewards] : [...rewards, ...bonus]);
  log(s, `${p.name}安排${c.name}入住 ${r.floor} 楼 ${r.col} 号房，获得 ${c.vp} 分。`);
}
function returnStaff(s, ids, order) {
  const result = order || ids;
  assert(Array.isArray(result) && result.length === ids.length && new Set(result).size === ids.length && result.every(id => ids.includes(id)), '返回牌库顺序必须恰好包含未雇用的牌');
  s.staffDeck.push(...result);
}
function hire(s, p, id, effect = {}, returnOrder) {
  const hand = effect.drawn || p.hand;
  assert(hand.includes(id) && staffById[id], '这张员工牌不可用');
  const card = staffById[id];
  const cost = effect.free ? 0 : Math.max(0, card.cost - (effect.discount || 0) - traits(p, 'staffDiscount'));
  spend(p, cost);
  if (effect.drawn) { const others = effect.drawn.filter(x=>x!==id); returnStaff(s, others, returnOrder?.filter(x=>x!==id)); }
  else p.hand.splice(p.hand.indexOf(id), 1);
  p.staff.push({ id, usedRound: 0 });
  queue(s, p, card.effects || []);
  log(s, `${p.name}雇用了${card.name}（${cost} 克朗）。`);
}
function activePlayer(s) {
  if (s.effects?.length) return s.effects[0].playerId;
  if (s.phase==='setupStaff')return s.staffDraft.order[s.staffDraft.index];
  if (s.phase === 'setupGuest' || s.phase === 'setupRooms') return s.setupOrder[s.setupIndex];
  return s.turn?.playerId || null;
}
export function startGame(state, actor, rng = randomInt) {
  assert(state.phase === 'lobby' && state.hostId === actor, '只有房主可以开始');
  assert(state.players.length >= 2, '至少需要两位玩家');
  const s = structuredClone(state);
  const hotelIds=shuffle(['day1','day2','day3','day4'],rng);
  s.players = (s.solo?[...s.players].sort((a,b)=>Number(!!b.bot)-Number(!!a.bot)):shuffle(s.players, rng)).map((p, i) => ({ ...p, money: 10, emperor: 0, vp: 0,
    kitchen: Object.fromEntries(RESOURCES.map(r => [r, 1])), cafe: [], hand: [], staff: [], completed: [], bonuses: [],
    hotelId:p.bot||s.hotelMode==='night'?'night':hotelIds[i],
    rooms: structuredClone(HOTELS[p.bot||s.hotelMode === 'night' ? 'night' : hotelIds[i]]).map(x => ({ ...x, state: 'closed' })) }));
  s.guestDeck = shuffle(GUESTS.map(x => x.id), rng); s.guestDiscard = [];
  s.staffDeck = shuffle(STAFF.map(x => x.id), rng); s.market = s.guestDeck.splice(0, 5);
  if(s.solo)initializeSolo(s,rng,{shuffle,staffById});
  else if(s.staffSetup==='draft')s.staffDraft={order:s.players.map(p=>p.id),packets:s.players.map(()=>drawStaff(s,6)),round:1,index:0};
  else for (const p of s.players) p.hand = drawStaff(s, 6);
  s.objectives = ['A', 'B', 'C'].map(category => ({ ...shuffle(OBJECTIVES.filter(x => x.category === category), rng)[0], claimed: [] }));
  s.emperors = ['A', 'B', 'C'].map(category => shuffle(EMPERORS.filter(x => x.category === category), rng)[0]);
  s.startIndex = 0; s.round = 1; s.effects = []; s.afterEffects = null; s.turn = null;
  s.phase = 'setupGuest'; s.setupOrder = s.players.filter(p=>!p.bot).map(p => p.id).reverse(); s.setupIndex = 0;
  if(s.staffDraft)s.phase='setupStaff';
  if(s.solo){queue(s,s.players.find(p=>!p.bot),[{kind:'soloDraft',drawn:s.solo.initialStaff}]);delete s.solo.initialStaff;}
  log(s, '2021 基础版开始：逆序选择起始客人，然后准备起始房间。');
  if(s.solo)log(s,`${s.players.filter(p=>p.bot).length>1?'自定义多人机':'官方单人'}模式 · ${s.players.filter(p=>p.bot).length}个Leopold（${SOLO_LEVELS[s.solo.difficulty]}）：先从10张员工中保留6张。`);
  else if(s.staffDraft)log(s,'起始员工轮抽：逐人各保留1张，每轮把余牌传给左侧玩家，共选6张。');
  return s;
}
function pickInitialStaff(s,p,action){
  const d=s.staffDraft,packet=d.packets[d.index];
  assert(action.type==='draftStaff'&&packet.includes(action.staffId),'请从当前收到的员工中选择一张');
  packet.splice(packet.indexOf(action.staffId),1);p.hand.push(action.staffId);
  log(s,`${p.name}保留了第${d.round}张起始员工。`);
  if(++d.index<d.order.length)return;
  if(d.round===6){delete s.staffDraft;s.phase='setupGuest';return;}
  d.packets=d.packets.map((_,i)=>d.packets[(i-1+d.order.length)%d.order.length]);
  d.index=0;d.round++;
}
function beginRound(s) {
  s.roundPlayStarted=false;
  s.phase = 'turn';
  s.dice = Array.from({ length: s.players.length * 2 + 6 }, () => randomInt(6) + 1);
  const order = Array.from({ length: s.players.length }, (_, n) => s.players[(s.startIndex + n) % s.players.length].id);
  s.slots = [...order, ...order.toReversed()].map((playerId, i) => ({ playerId, number: i + 1, done: false, passed: false }));
  beginNextTurn(s); log(s, `第 ${s.round} 轮开始。`);
}
function beginNextTurn(s) {
  const slot = s.slots.find(x => !x.done && !x.passed);
  if (!slot) {
    if (s.slots.every(x => x.done) || s.dice.length <= 1) { endRound(s); return; }
    s.dice.pop(); s.dice = s.dice.map(() => randomInt(6) + 1);
    for (const x of s.slots) x.passed = false;
    log(s, '跳过的玩家重新行动：弃去 1 枚骰子，重掷其余骰子。');
    beginNextTurn(s); return;
  }
  s.turn = { playerId: slot.playerId, number: slot.number, dieTaken: false, guestTaken: false, boostUsed: false, touched: false };
}
function finishTurn(s) {
  const slot = s.slots.find(x => x.number === s.turn.number); slot.done = true; s.turn = null;
  if (!s.dice.length) endRound(s); else beginNextTurn(s);
}
function endRound(s) {
  s.turn = null;
  if ([3, 5, 7].includes(s.round)) {
    const tile = s.emperors[[3, 5, 7].indexOf(s.round)];
    for (const p of s.players) {
      p.vp += EMPEROR_VP[p.emperor]; p.emperor = Math.max(0, p.emperor - s.round);
      log(s, `${p.name}完成皇帝评分，退 ${s.round} 格后位于 ${p.emperor}。`);
    }
    s.phase = 'emperor'; s.effects = [];
    for (let n = 0; n < s.players.length; n++) {
      const p = s.players[(s.startIndex + n) % s.players.length];
      if(p.bot)continue; // Automa scores/retreats normally, but ignores all tile rewards and penalties.
      const es = p.emperor >= 3 ? [...tile.reward, ...(has(p,'gardener') ? [{kind:'vp',amount:5}] : [])] : p.emperor === 0 ? has(p,'conference_manager') && p.money >= 1 ? [{kind:'conference',penalties:tile.penalty}] : tile.penalty : [];
      s.effects.push(...es.map(x => ({ ...x, playerId: p.id, uid: nextUid(s) })));
    }
    s.afterEffects = 'nextRound'; advanceEffects(s);
  } else nextRound(s);
}
function endStaffValue(p, def, s, copying = false) {
  const e = def.end; if (!e) return 0;
  const rooms = occupied(p);
  let count = 0;
  if (e.kind === 'staff') count = p.staff.length;
  if (e.kind === 'rooms') count = rooms.length;
  if (e.kind === 'prepared') count = prepared(p).length;
  if (e.kind === 'color') count = rooms.filter(r => r.color === e.color).length;
  if (e.kind === 'floor') count = rooms.filter(r => r.floor === e.floor).length;
  if (e.kind === 'money') count = p.money;
  if (e.kind === 'emperor') count = p.emperor;
  if (e.kind === 'groups') count = new Set(rooms.filter(r => p.rooms.filter(x => x.group === r.group).every(x => x.state === 'occupied')).map(r => r.group)).size;
  if (e.kind === 'goods') count = sum(Object.values(p.kitchen));
  if (e.kind === 'objectives') count = s.objectives.filter(o=>o.claimed.includes(p.id)).length;
  if (e.kind === 'rows') count = [1,2,3,4].filter(f=>p.rooms.filter(r=>r.floor===f).every(r=>r.state==='occupied')).length;
  if (e.kind === 'columns') count = [1,2,3,4,5].filter(c=>p.rooms.filter(r=>r.col===c).every(r=>r.state==='occupied')).length;
  if (e.kind === 'minColors') count = Math.min(...['red','blue','yellow'].map(c=>rooms.filter(r=>r.color===c).length));
  if (e.kind === 'copy' && !copying) return Math.max(0, ...s.players.filter(x => x.id !== p.id).flatMap(other => other.staff.map(c => endStaffValue(p, staffById[c.id], s, true))));
  return Math.min(e.cap ?? Infinity, count * (e.amount || 1));
}
function nextRound(s) {
  s.effects = []; s.afterEffects = null;
  if (s.round === 7) {
    for (const p of s.players) {
      const staff = sum(p.staff.map(x => endStaffValue(p, staffById[x.id], s)));
      const rooms = sum(occupied(p).map(r => r.floor));
      const goods = sum(Object.values(p.kitchen)), cash = p.money, cafe = -5 * p.cafe.length;
      p.score = { duringGame: p.vp, staff, rooms, goods, cash, cafe, total: p.vp + staff + rooms + goods + cash + cafe, tieBreaker: goods + cash };
    }
    const ranking=[...s.players].sort((a,b)=>b.score.total-a.score.total||b.score.tieBreaker-a.score.tieBreaker),best=ranking[0].score;
    s.winners=s.solo?(s.players.find(p=>!p.bot).score.total>Math.max(...s.players.filter(p=>p.bot).map(p=>p.score.total))?[s.hostId]:s.players.filter(p=>p.bot&&p.score.total===Math.max(...s.players.filter(p=>p.bot).map(p=>p.score.total))).map(p=>p.id)):ranking.filter(p=>p.score.total===best.total&&p.score.tieBreaker===best.tieBreaker).map(p=>p.id);
    s.phase = 'finished'; log(s, '七轮结束，已完成终局计分。');
  } else { s.round++; s.startIndex = (s.startIndex + 1) % s.players.length; beginRound(s); }
}
function objectiveMet(p, condition) {
  const os = occupied(p), cs = color => os.filter(x => x.color === color).length;
  if (condition.kind === 'money') return p.money >= condition.amount;
  if (condition.kind === 'emperor') return p.emperor >= condition.amount;
  if (condition.kind === 'staff') return p.staff.length >= condition.amount;
  if (condition.kind === 'prepared') return prepared(p).length >= condition.amount;
  if (condition.kind === 'rows') return [1, 2, 3, 4].filter(f => p.rooms.filter(r => r.floor === f).every(r => r.state === 'occupied')).length >= condition.amount;
  if (condition.kind === 'columns') return [1, 2, 3, 4, 5].filter(c => p.rooms.filter(r => r.col === c).every(r => r.state === 'occupied')).length >= condition.amount;
  if (condition.kind === 'groups') return new Set(os.map(x => x.group)).size >= condition.amount && new Set(os.filter(r => p.rooms.filter(x => x.group === r.group).every(x => x.state === 'occupied')).map(x => x.group)).size >= condition.amount;
  if (condition.kind === 'allColor') return ['red', 'blue', 'yellow'].some(c => p.rooms.filter(x => x.color === c).every(x => x.state === 'occupied'));
  if (condition.kind === 'colors') return Object.entries(condition.counts).every(([c, n]) => cs(c) >= n);
  return false;
}
function diceAction(s, p, a, extra = false) {
  assert(int(a.face, 1, 6) && s.dice.includes(a.face), '该骰面已经没有骰子');
  let face = a.face, count = s.dice.filter(x => x === face).length;
  assert(!extra || !a.boost, '额外骰子奖励不能付费增强');
  if (a.boost) { assert(!s.turn?.boostUsed, '每回合只能增强一次'); spend(p, 1); s.turn.boostUsed = true; count++; }
  if (face === 6) { const helper = !extra && has(p,'kitchen_hand'); spend(p, helper ? 0 : 1); if(helper)count++; assert(int(a.asFace, 1, 5), '万能骰需要选择动作 1–5'); face = a.asFace; }
  if (!extra) { s.dice.splice(s.dice.indexOf(a.face), 1); s.turn.dieTaken = true; }
  const extraEffects=[];
  if(!extra)for(const c of p.staff){const m=staffById[c.id].mechanics;if(m.on==='dieTaken'&&m.faces.includes(a.face)){
    if(m.power && !m.freeWildcard)count+=m.power;
    if(m.vp)extraEffects.push({kind:'vp',amount:m.vp});
    if(m.emperor)extraEffects.push({kind:'emperor',amount:m.emperor});
    if(m.prepareRooms)extraEffects.push({kind:'prepare',amount:m.prepareRooms});
    if(m.hireStaff)extraEffects.push({kind:'hire',discount:0});
  }}
  const main=[];
  if (face <= 2) main.push({ kind: 'goods', amount: count, pair: face === 1 ? ['strudel', 'cake'] : ['wine', 'coffee'], balanced: true });
  if (face === 3) main.push({ kind: 'prepare', amount: count });
  if (face === 4) main.push(...(!extra && a.face===4 && has(p,'bootblack') ? [{kind:'money',amount:count},{kind:'emperor',amount:count}] : [{ kind: 'moneyEmperor', amount: count }]));
  if (face === 5) main.push({ kind: 'hire', discount: count + (!extra && a.face===5 && has(p,'checker') ? 2:0) });
  if(a.choice!==undefined)planMainChoice(s,p,main,a.choice);
  queue(s,p,a.staffBefore ? [...extraEffects,...main]:[...main,...extraEffects]);
  log(s, `${p.name}使用${extra ? '奖励' : ''}${a.face}点骰执行动作${face}，强度 ${count}。`);
}
// Validate the entire main-action draft before committing its die or payment.
// Only the first main effect can receive these choices; employee rewards remain separate.
function planMainChoice(s,p,main,choice){
  assert(choice&&typeof choice==='object'&&!Array.isArray(choice),'主动作选择无效');
  const effect=main[0],fields={goods:['counts','allocations'],prepare:['rooms'],moneyEmperor:['emperor'],hire:['staffId']}[effect?.kind];
  if(!fields){assert(Object.keys(choice).length===0,'此主动作无需额外选择');return;}
  const allowed=choice.skip===true?['skip']:fields;
  assert(Object.keys(choice).every(k=>allowed.includes(k)),'主动作包含无效选项');
  if(!choice.skip&&effect.kind==='goods'){
    assert(choice.counts&&typeof choice.counts==='object'&&!Array.isArray(choice.counts)&&Object.keys(choice.counts).every(k=>RESOURCES.includes(k)),'请选择正确的食饮数量');
    assert(choice.allocations===undefined||Array.isArray(choice.allocations),'食饮分配无效');
  }
  const probe=structuredClone(s),actor=me(probe,p.id);
  queue(probe,actor,[effect]);resolve(probe,actor,{...choice,promptId:probe.effects[0].uid});
  effect.plannedChoice=structuredClone(choice);
}
function canPrepare(p, e) {
  return p.rooms.some(r => r.state === 'closed' && (!e.color || r.color === e.color) && (!e.maxFloor || r.floor <= e.maxFloor) && (prepared(p).length ? adjacent(p, r) : r.col === 1 && r.floor === 1) && p.money >= roomCost(p, r, e));
}
function penaltyOr(s, p, e) {
  const amount = e.amount || 0;
  let possible = true;
  if (e.penalty === 'money') possible = p.money >= amount;
  if (e.penalty === 'discardHand') possible = p.hand.length >= amount;
  if (e.penalty === 'removePrepared') possible = emptyRooms(p).length >= amount;
  if (e.penalty === 'removeEndStaff') possible = p.staff.some(x => staffById[x.id].end);
  if (!possible) { p.vp -= e.fallback; return true; }
  if (e.penalty === 'money') { p.money -= amount; return true; }
  if (e.penalty === 'clearKitchen') { p.kitchen = blankGoods(); return true; }
  if (e.penalty === 'clearAllGoods') { p.kitchen = blankGoods(); for (const g of p.cafe) g.served = blankGoods(); return true; }
  if (e.penalty === 'vp') { p.vp -= amount; return true; }
  if (e.penalty === 'staffVp') { p.vp -= p.staff.length * amount; return true; }
  if (e.penalty === 'removeOccupied') {
    const floors = [...new Set(occupied(p).map(x => x.floor))].sort((a, b) => b - a).slice(0, 2);
    if (!floors.length) return true;
    e.floors = floors;
  }
  return false;
}
function advanceEffects(s) {
  while (s.effects.length) {
    const e = s.effects[0], p = me(s, e.playerId);
    if(e.plannedChoice){
      const choice=e.plannedChoice;delete e.plannedChoice;
      // A staff-before decision can change cash, rooms or guest needs. If so,
      // retain the main effect for a fresh choice instead of trapping the queue.
      try{const probe=structuredClone(s);resolve(probe,me(probe,p.id),{...choice,promptId:e.uid});}
      catch{e.planChanged=true;log(s,`${p.name}的员工效果改变了局面，请重新确认主动作选择。`);break;}
      resolve(s,p,{...choice,promptId:e.uid});continue;
    }
    if (e.kind === 'money') addMoney(p, e.amount);
    else if (e.kind === 'vp') p.vp += e.amount;
    else if (e.kind === 'emperor') addEmperor(p, e.amount);
    else if (e.kind === 'draw') p.hand.push(...drawStaff(s, e.amount));
    else if (e.kind === 'staffVp') p.vp += p.staff.length * e.amount;
    else if (e.kind === 'penalty') { if (!penaltyOr(s, p, e)) break; }
    else if (e.kind === 'hire' && e.draw && !e.drawn) { e.drawn = drawStaff(s, e.draw); if (e.drawn.length) break; }
    else if (e.kind === 'prepare' && !canPrepare(p, e)) { /* optional benefit cannot be used */ }
    else if (e.kind === 'hire' && !e.drawn && !p.hand.some(id => p.money >= (e.free ? 0 : Math.max(0, staffById[id].cost - (e.discount || 0) - traits(p, 'staffDiscount'))))) { }
    else if (e.kind === 'attract' && (!s.market.some(Boolean) || p.cafe.length >= 3)) { }
    else if (e.kind === 'complete' && !p.cafe.some(g => (!e.color || guestById[g.id].color === e.color) && !isComplete(g))) { }
    else if (e.kind === 'occupy' && !emptyRooms(p).some(r => !e.color || r.color === e.color)) { }
    else if (e.kind === 'die' && !s.dice.length) { }
    else break;
    s.effects.shift();
  }
  if (!s.effects.length && s.afterEffects) {
    const next = s.afterEffects; s.afterEffects = null;
    if (next === 'nextRound') nextRound(s);
  }
}
function distribute(p, counts, allocations = []) {
  const remaining = { ...counts };
  for (const a of allocations) {
    const g = guest(p, a.guestId);
    assert(RESOURCES.includes(a.resource) && int(a.amount, 0, 100), '食饮分配无效');
    assert((remaining[a.resource] || 0) >= a.amount && missing(g, a.resource) >= a.amount, '分配数量超过新获得的食饮或订单所需');
    g.served[a.resource] += a.amount; remaining[a.resource] -= a.amount;
  }
  for (const r of RESOURCES) p.kitchen[r] += remaining[r] || 0;
}
function resolve(s, p, a) {
  const e = s.effects[0]; assert(e && e.uid === a.promptId && e.playerId === p.id, '待处理效果已经变化，请刷新');
  s.effects.shift();
  if (a.skip) {
    assert(e.kind !== 'penalty'&&e.kind!=='soloDraft', '处罚或起始员工选择不能跳过');
    if(e.kind==='conference'){queue(s,p,e.penalties);return;}
    if (e.drawn) returnStaff(s,e.drawn,a.returnOrder); return;
  }
  if(e.kind==='soloDraft'){
    assert(Array.isArray(a.cards)&&a.cards.length===6&&new Set(a.cards).size===6&&a.cards.every(id=>e.drawn.includes(id)),'请选择六张起始员工');
    assert(a.returnOrder===undefined||Array.isArray(a.returnOrder),'归还顺序必须为牌号列表');
    p.hand=[...a.cards];returnStaff(s,e.drawn.filter(id=>!a.cards.includes(id)),a.returnOrder?.filter(id=>!a.cards.includes(id)));
  } else if (e.kind === 'goods') {
    const counts = a.counts || e.counts;
    assert(counts && RESOURCES.every(r => int(counts[r] || 0, 0, 50)), '食饮数量无效');
    if (!e.counts) {
      assert(sum(RESOURCES.map(r => counts[r] || 0)) <= e.amount, '食饮数量超过效果强度');
      assert(!e.pair || RESOURCES.every(r => e.pair.includes(r) || !counts[r]), '食饮类型不符合动作');
      assert(!e.balanced || (counts[e.pair[0]] || 0) >= (counts[e.pair[1]] || 0), '蛋糕不能多于苹果卷，咖啡不能多于葡萄酒');
    } else assert(RESOURCES.every(r => (counts[r] || 0) === (e.counts[r] || 0)), '固定食饮奖励不能更改');
    distribute(p, counts, a.allocations);
  } else if (e.kind === 'prepare') {
    const ids = a.rooms || []; assert(Array.isArray(ids) && new Set(ids).size === ids.length && ids.length <= e.amount, '准备房间数量无效');
    for (const id of ids) { const r = prepareOne(s, p, id, e); if (e.occupied) { r.state = 'occupied'; queue(s, p, occupancyEffects(s, p, r)); } }
  } else if (e.kind === 'moneyEmperor') {
    assert(int(a.emperor, 0, e.amount), '皇帝格数无效'); addEmperor(p, a.emperor); addMoney(p, e.amount - a.emperor);
  } else if (e.kind === 'hire') { if(a.staffId===null && e.drawn)returnStaff(s,e.drawn,a.returnOrder);else hire(s, p, a.staffId, e,a.returnOrder); }
  else if (e.kind === 'attract') takeGuest(s, p, a.index, true);
  else if (e.kind === 'complete') { const g = guest(p, a.guestId); assert(!e.color || guestById[g.id].color === e.color, '客人颜色不符合要求'); for (const r of RESOURCES) g.served[r] = guestById[g.id].needs[r] || 0; }
  else if (e.kind === 'occupy') { const r = roomById(p, a.roomId); assert(r.state === 'prepared' && (!e.color || r.color === e.color), '请选择符合颜色的空房'); r.state = 'occupied'; queue(s, p, occupancyEffects(s, p, r)); }
  else if (e.kind === 'die') diceAction(s, p, a, true);
  else if (e.kind === 'conference') { if(a.pay)spend(p,1);else queue(s,p,e.penalties); }
  else if (e.kind === 'penalty') {
    if (e.penalty === 'discardHand') {
      assert(Array.isArray(a.cards) && a.cards.length === e.amount && new Set(a.cards).size === a.cards.length && a.cards.every(id => p.hand.includes(id)), '请选择足够数量的手牌');
      p.hand = p.hand.filter(id => !a.cards.includes(id)); returnStaff(s,a.cards,a.returnOrder);
    } else if (e.penalty === 'removeEndStaff') {
      assert(p.staff.some(x => x.id === a.staffId && staffById[x.id].end), '请选择一张终局计分员工'); p.staff = p.staff.filter(x => x.id !== a.staffId); s.staffDeck.push(a.staffId);
    } else if (e.penalty === 'removePrepared') {
      assert(Array.isArray(a.rooms) && a.rooms.length === e.amount && new Set(a.rooms).size === a.rooms.length, '请选择正确数量的空房');
      for (const id of a.rooms) { const r = roomById(p, id); assert(r.state === 'prepared' && r.floor === Math.max(...emptyRooms(p).map(x => x.floor)), '必须从当前最高有空房的楼层移除'); r.state = 'closed'; }
    } else if (e.penalty === 'removeOccupied') {
      assert(Array.isArray(a.rooms) && a.rooms.length === e.floors.length, '请选择最高两个有入住房楼层各一间房');
      e.floors.forEach((floor, i) => { const r = roomById(p, a.rooms[i]); assert(r.floor === floor && r.state === 'occupied', '所选房间楼层不符'); r.state = 'closed'; });
    }
  } else throw new Error(`尚未实现的效果 ${e.kind}`);
}
export function applyAction(state,playerId,action,{now=Date.now(),rng=randomInt}={}){
  assert(!state.players.find(p=>p.id===playerId)?.bot,'自动对手不能由客户端操作');
  let next=applyTableAction(state,playerId,action,{applyRule:(s,id,a)=>applyRuleAction(s,id,a,rng),now,rng});
  // The one human may use table tools without waiting for a non-human vote.
  for(const bot of next.solo?next.players.filter(p=>p.bot):[])if(next.tableSession?.pending&&!next.tableSession.pending.approved.includes(bot.id))next=applyTableAction(next,bot.id,{type:'table-vote',proposalId:next.tableSession.pending.id,approve:true},{applyRule:applyRuleAction,now,rng});
  recordAction(state,next,playerId,action,{now});
  return settleSolo(next,rng,now);
}
function settleSolo(s,rng=randomInt,now=Date.now()){
  if(!s.solo||s.phase!=='turn'||s.effects.length||!s.players.find(p=>p.id===s.turn?.playerId)?.bot)return s;
  return synchronizeAutomaticClock(runSolo(structuredClone(s),{rng,shuffle,guestById,drawGuest,addEmperor,finishTurn,log,publishActivity,now}),now);
}
export function advanceTableTime(state,{now=Date.now()}={}){const next=advanceTableClock(state,{applyRule:applyRuleAction,now});if(next!==state)recordAction(state,next,state.turn.playerId,{type:'__clock-expire'},{now});return settleSolo(next,randomInt,now);}
function applyRuleAction(state, playerId, action, rng=randomInt) {
  const s = structuredClone(state), p = me(s, playerId); assert(action && typeof action.type === 'string', '缺少操作');
  if (action.type === 'start') return startGame(s, playerId,rng);
  if (action.type === 'kick') {
    assert(!s.solo&&s.phase === 'lobby' && s.hostId === playerId && action.playerId !== playerId, '只有好友桌房主可以在大厅移除其他玩家');
    s.players = s.players.filter(x => x.id !== action.playerId); return s;
  }
  assert(s.phase !== 'lobby' && s.phase !== 'finished', '当前阶段不能执行此操作');
  assert(activePlayer(s) === playerId, '尚未轮到你');
  if(s.phase==='setupStaff'){pickInitialStaff(s,p,action);return s;}
  if (s.effects.length) { assert(action.type === 'resolve', '请先处理待选奖励或处罚'); resolve(s, p, action); advanceEffects(s); return s; }
  if (s.phase === 'setupGuest') {
    assert(action.type === 'setupGuest', '请选择起始客人'); takeGuest(s, p, action.index, true);
    s.setupIndex++; if (s.setupIndex === s.setupOrder.length) { s.phase = 'setupRooms'; s.setupIndex = 0; s.setupOrder = s.players.filter(x=>!x.bot).map(x => x.id); } return s;
  }
  if (s.phase === 'setupRooms') {
    assert(action.type === 'setupRooms' && Array.isArray(action.rooms) && action.rooms.length <= 3 && new Set(action.rooms).size === action.rooms.length, '请选择最多三间相邻起始房，顺序从左下开始');
    for (const id of action.rooms) prepareOne(s, p, id);
    s.setupIndex++; if (s.setupIndex === s.setupOrder.length) beginRound(s); return s;
  }
  assert(s.phase === 'turn', '当前不在行动阶段');
  if(action.type==='__clock-expire'){finishTurn(s);return s;}
  if (action.type === 'pass') {
    assert(!s.turn.touched && !s.turn.dieTaken && !s.turn.guestTaken, '已经执行动作，不能再跳过');
    for(const slot of s.slots)if(slot.playerId===p.id && !slot.done)slot.passed=true; log(s, `${p.name}暂时跳过，保留行动机会。`); beginNextTurn(s); return s;
  }
  if (action.type === 'endTurn') { assert(s.turn.dieTaken, '必须先执行骰子主动作'); finishTurn(s); return s; }
  s.turn.touched = true;
  if (action.type === 'attract') { assert(!s.turn.guestTaken && !s.turn.dieTaken, '每回合只能在主动作前招待一位市场客人'); takeGuest(s, p, action.index); s.turn.guestTaken = true; }
  else if (action.type === 'die') { assert(!s.turn.dieTaken, '本回合已经执行主动作'); diceAction(s, p, action); }
  else if (action.type === 'serve') {
    assert(Array.isArray(action.allocations) && action.allocations.length, '请选择要上桌的食饮');
    const n = sum(action.allocations.map(x => x.amount)); assert(int(n, 1, 3), '每次付费最多移动三件食饮'); spend(p, has(p, 'chief_waiter') ? 0 : 1);
    for (const a of action.allocations) {
      const g = guest(p, a.guestId); assert(RESOURCES.includes(a.resource) && int(a.amount, 1, 3), '食饮类型或数量无效');
      assert(p.kitchen[a.resource] >= a.amount && missing(g, a.resource) >= a.amount, '厨房不足或订单无需这么多');
      p.kitchen[a.resource] -= a.amount; g.served[a.resource] += a.amount;
    }
  } else if (action.type === 'checkin') receiveGuest(s, p, action.guestId, action.roomId, !!action.bonusFirst);
  else if (action.type === 'activate') {
    const c = p.staff.find(x => x.id === action.staffId), d = c && staffById[c.id];
    assert(c && d.timing === 'round' && c.usedRound !== s.round, '员工本轮不可再次使用');
    c.usedRound = s.round; queue(s, p, d.effects || []);
  } else if (action.type === 'claim') {
    const o = s.objectives.find(x => x.id === action.objectiveId); assert(o && o.claimed.length<3 && !o.claimed.includes(p.id) && objectiveMet(p, o.condition), '尚不符合目标、已经领取，或三个分位已经领完');
    const points = o.points[o.claimed.length] || 0; o.claimed.push(p.id); p.vp += points; log(s, `${p.name}完成目标「${o.name}」，获得 ${points} 分。`);
  } else assert(false, '未知游戏操作');
  advanceEffects(s); return s;
}
function cardStaff(id) { return structuredClone(staffById[id]); }
function cardGuest(g) { const instance=typeof g==='object'&&g!==null; return g ? { ...structuredClone(guestById[instance ? g.id : g]), ...(instance ? { uid:g.uid,served:{...g.served},complete:isComplete(g) } : {}) } : null; }
export function viewGame(s, playerId) {
  assert(s.players.some(x => x.id === playerId), '你不是本局成员');
  if (s.phase === 'lobby') return { rules: s.rules, phase: s.phase, name: s.name, hostId: s.hostId, maxPlayers: s.maxPlayers, hotelMode: s.hotelMode,staffSetup:s.staffSetup||'random',solo:soloView(s), players: s.players.map(p => ({ id: p.id, name: p.name,bot:p.bot })), log: s.log,tableControls:viewTableControls(s,playerId) };
  const prompt = s.phase==='setupStaff'?{kind:'staffDraft',playerId:activePlayer(s),uid:`staff-draft-${s.staffDraft.round}-${s.staffDraft.index}`,round:s.staffDraft.round,drawn:s.staffDraft.packets[s.staffDraft.index]}:s.effects[0];
  return { rules: s.rules, phase: s.phase, name: s.name, hostId: s.hostId, round: s.round,solo:soloView(s),winners:s.winners, activePlayerId: activePlayer(s),activity:publicActivity(s),tableControls:viewTableControls(s,playerId),
    market: s.market.map(cardGuest), dice: [...(s.dice || [])], slots: s.slots || [], turn: s.turn, guestDeckCount: s.guestDeck.length, staffDeckCount: s.staffDeck.length,
    draft:s.staffDraft?{round:s.staffDraft.round,total:6,picks:s.players.map(p=>({playerId:p.id,count:p.hand.length}))}:undefined,
    objectives: s.objectives.map(o => ({ ...o, eligible: o.claimed.length<3 && objectiveMet(me(s, playerId), o.condition), achievedBy: s.players.filter(player => player.bot?o.claimed.includes(player.id):objectiveMet(player, o.condition)).map(player => player.id) })), emperors: s.emperors,
    prompt: prompt ? prompt.playerId === playerId ? { ...prompt, drawn: prompt.drawn?.map(cardStaff) } : { playerId: prompt.playerId, waiting: true } : null,
    players: s.players.map(p => ({ id: p.id, name: p.name,bot:p.bot,hotelId:p.hotelId, money: p.money, emperor: p.emperor, vp: p.vp, kitchen: p.kitchen, rooms: p.rooms, cafe: p.cafe.map(cardGuest),
      staff: p.staff.map(c => ({ ...cardStaff(c.id), usedRound: c.usedRound })), handCount: p.hand.length, hand: p.id === playerId ? p.hand.map(cardStaff) : undefined,
      bonuses: p.bonuses, completedCount: p.completed.length, score: p.score })), log: s.log };
}
export const internals = { objectiveMet, endStaffValue, prepareOne, receiveGuest, beginRound, endRound, advanceEffects, diceAction, staffById, guestById };
