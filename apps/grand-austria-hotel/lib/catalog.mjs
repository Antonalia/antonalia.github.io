import facts from '../reference/card-facts-2021.json' with { type: 'json' };
import {GUEST_NAMES} from '../public/chinese.mjs';

const goods = ['strudel', 'cake', 'wine', 'coffee'];
export const STAFF_NAMES = ['早餐侍者','女侍者','调酒师','副厨师长','行李员','马夫','按摩师','导游','管家','司机','花艺师','客房主管','餐厅经理','装潢师','擦鞋匠','洗衣员','厨房助手','稽核员','室内建筑师','侦探','主厨','人事经理','管理员','领班侍者','送货员','会议经理','预订经理','礼宾员','秘书','接待员','女房务员','副经理','男楼层管家','前台主管','门童','侍酒师','客房服务员','搬运工','糕点师','市场总监','接线员','园丁','咖啡师','冷菜厨师','泳池管理员','女楼层管家','电梯员','饭店经理'];
const key = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/, '');
function convertReward(r) {
  if (r.type === 'gain') return [...goods.some(k => r[k]) ? [{ kind: 'goods', counts: Object.fromEntries(goods.filter(k => r[k]).map(k => [k, r[k]])) }] : [],
    ...r.anyFood ? [{ kind: 'goods', amount: r.anyFood }] : [], ...['money','emperor','vp'].filter(k => r[k]).map(kind => ({ kind, amount: r[kind] }))];
  if (r.type === 'drawStaff') return [{ kind: 'draw', amount: r.count }];
  if (r.type === 'prepare') return [{ kind: 'prepare', amount: r.count, free: !!r.free, discount: r.discount || 0, maxFloor: r.maxFloor }];
  if (r.type === 'drawHire') return [{ kind: 'hire', draw: r.draw, discount: r.discount || 0, free: !!r.free }];
  if (r.type === 'hire') return Array.from({ length: r.count }, () => ({ kind: 'hire', discount: r.discount || 0, free: !!r.free }));
  if (r.type === 'occupy') return Array.from({ length: r.count }, () => ({ kind: 'occupy' }));
  if (r.type === 'takeGuest') return Array.from({ length: r.count }, () => ({ kind: 'attract' }));
  if (r.type === 'bonusDieAction') return [{ kind: 'die', noBoost: true }];
  throw new Error(`Unknown factual reward ${r.type}`);
}
function staffEffects(m) {
  return [...m.gain ? [{ kind: 'goods', counts: m.gain }] : [], ...m.emperor && !m.on ? [{ kind: 'emperor', amount: m.emperor }] : [],
    ...m.occupyRooms ? Array.from({ length: m.occupyRooms }, () => ({ kind: 'occupy' })) : [], ...m.completeGuestOrder ? [{ kind: 'complete' }] : []];
}
function endEffect(m) {
  if (!m.score) return null;
  const kinds = { occupiedColor:'color',occupiedRooms:'rooms',playedStaff:'staff',preparedOrOccupiedRooms:'prepared',occupiedGroups:'groups',claimedObjectives:'objectives',emperorPosition:'emperor',occupiedFloors:'rows',occupiedColumns:'columns',minOccupiedColorCount:'minColors',copyOpponentEndgameStaff:'copy' };
  return { kind: kinds[m.score], amount: m.each || 1, color: m.color, cap: m.cap ?? undefined };
}
export const STAFF = facts.staff.map(c => ({ id: c.id, key: key(c.name), englishName: c.name, name: STAFF_NAMES[c.id - 1], cost: c.cost,
  timing: c.timing === 'endgame' ? 'end' : c.timing, mechanics: c.mechanics, effects: staffEffects(c.mechanics), end: endEffect(c.mechanics),
  trigger: c.mechanics.on === 'guestAccommodated' ? { event: 'checkin', color: c.mechanics.guestColor, minOrderSize: c.mechanics.minOrderSize,
    effects: ['money','emperor','vp'].filter(k => c.mechanics[k]).map(kind => ({ kind, amount: c.mechanics[kind] })) } : undefined }));
export const GUESTS = facts.guests.map(c => ({ id: c.id, name: GUEST_NAMES[c.id-49], englishName:c.name, color: c.color, needs: c.order, vp: c.vp, effects: c.reward.flatMap(convertReward) }));

const COLORS = { B:'blue',Y:'yellow',R:'red' };
function makeHotel(board) { return board.colorsBottomToTop.flatMap((row,f)=>[...row].map((c,i)=>({
  id:`${f+1}-${i+1}`,floor:f+1,col:i+1,color:COLORS[c],
  group:board.groups.findIndex(group=>group.some(([floor,col])=>floor===f+1&&col===i+1))+1,
  vp:board.preparationVP[`${f+1},${i+1}`]||0
}))); }
export const HOTELS = {night:makeHotel(facts.standardHotel),...Object.fromEntries(facts.alternateHotels.map((b,i)=>[`day${i+1}`,makeHotel(b)]))};
export const GROUP_BONUS = facts.standardHotel.occupancyGroupBonuses;
export const EMPEROR_VP = facts.emperorTrackVP;

const objective = (id, category, name, condition, points) => ({ id, category, name, condition, points });
export const OBJECTIVES = [
  objective(105,'A','持有20克朗',{kind:'money',amount:20},[15,10,5,0]),
  objective(106,'A','皇帝轨达到10格',{kind:'emperor',amount:10},[15,10,5,0]),
  objective(107,'A','雇用6名员工',{kind:'staff',amount:6},[15,10,5,0]),
  objective(108,'A','准备或入住12间房',{kind:'prepared',amount:12},[15,10,5,0]),
  objective(109,'B','住满两整层',{kind:'rows',amount:2},[15,10,5,0]),
  objective(110,'B','住满两整列',{kind:'columns',amount:2},[15,10,5,0]),
  objective(111,'B','住满6个房组',{kind:'groups',amount:6},[15,10,5,0]),
  objective(112,'B','住满一种颜色的所有房间',{kind:'allColor'},[15,10,5,0]),
  objective(113,'C','红蓝黄各入住3间',{kind:'colors',counts:{red:3,blue:3,yellow:3}},[15,10,5,0]),
  objective(114,'C','入住4红3黄',{kind:'colors',counts:{red:4,yellow:3}},[15,10,5,0]),
  objective(115,'C','入住4黄3蓝',{kind:'colors',counts:{yellow:4,blue:3}},[15,10,5,0]),
  objective(116,'C','入住4蓝3红',{kind:'colors',counts:{blue:4,red:3}},[15,10,5,0])
].map(o=>({...o,points:[15,10,5]}));
const penalty = (type, amount, fallback) => ({ kind:'penalty',penalty:type,amount,fallback });
export const EMPERORS = [
  {id:'A1',category:'A',name:'A1 · 资助',reward:[{kind:'money',amount:3}],penalty:[penalty('money',3,5)]},
  {id:'A2',category:'A',name:'A2 · 补给',reward:[{kind:'goods',amount:2}],penalty:[penalty('clearKitchen')]},
  {id:'A3',category:'A',name:'A3 · 招募',reward:[{kind:'hire',draw:3,discount:3}],penalty:[penalty('discardHand',2,5)]},
  {id:'A4',category:'A',name:'A4 · 建房',reward:[{kind:'prepare',amount:1,free:true}],penalty:[penalty('removePrepared',1,5)]},
  {id:'B1',category:'B',name:'B1 · 盛宴',reward:[{kind:'goods',counts:{strudel:1,cake:1,wine:1,coffee:1}}],penalty:[penalty('clearAllGoods')]},
  {id:'B2',category:'B',name:'B2 · 金库',reward:[{kind:'money',amount:5}],penalty:[penalty('money',5,7)]},
  {id:'B3',category:'B',name:'B3 · 人才',reward:[{kind:'hire',draw:3,free:true}],penalty:[penalty('discardHand',3,7)]},
  {id:'B4',category:'B',name:'B4 · 扩建',reward:[{kind:'prepare',amount:1,free:true,maxFloor:2,occupied:true}],penalty:[penalty('removePrepared',2,7)]},
  {id:'C1',category:'C',name:'C1 · 荣誉',reward:[{kind:'vp',amount:8}],penalty:[penalty('vp',8)]},
  {id:'C2',category:'C',name:'C2 · 入住',reward:[{kind:'prepare',amount:1,free:true,occupied:true}],penalty:[penalty('removeOccupied')]},
  {id:'C3',category:'C',name:'C3 · 团队',reward:[{kind:'staffVp',amount:2}],penalty:[penalty('staffVp',2)]},
  {id:'C4',category:'C',name:'C4 · 聘任',reward:[{kind:'hire',free:true}],penalty:[penalty('removeEndStaff',1,10)]}
];
