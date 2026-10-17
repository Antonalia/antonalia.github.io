import {icon,dieIcon} from './visuals.mjs';
import {renderTable} from './table-view.mjs';
import {renderArrival,previewEntry,renderOnlinePending} from './arrival-view.mjs';
import {initDisplayMode} from './display-mode.mjs';
initDisplayMode();
const R = ['strudel','cake','wine','coffee'];
const N = {strudel:'苹果卷',cake:'蛋糕',wine:'葡萄酒',coffee:'咖啡',red:'红',blue:'蓝',yellow:'黄',green:'绿'};
const timing = {round:'每轮一次',permanent:'持续',immediate:'立即',end:'终局计分'};
const root = document.getElementById('app'), notice = document.getElementById('notice'), connection = document.getElementById('connection');
const esc = s => String(s ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const apiBase = String(window.HOTEL_API_BASE || '').replace(/\/$/,'');
const profile = new URLSearchParams(location.search).get('profile') || 'main';
const storageKey = `gah.session.${profile}`;
let auth = null, room = null, busy = false, health = null, pollTimer, failures = 0, lastUpdated = 0, preview=null, previewModule;
const selections = new Map();
try { auth = JSON.parse(localStorage.getItem(storageKey)); } catch { }
const requestId = () => crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const disabled = value => value ? ' disabled' : '';
function flash(message) { notice.textContent = message; notice.hidden = !message; }
function status(message, offline = false) { connection.textContent = message; connection.classList.toggle('offline',offline); }
async function api(path, { method='GET', body, anonymous=false }={}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${apiBase}/api${path}`, {method,headers:{...(body ? {'Content-Type':'application/json'}:{}),...auth && !anonymous ? {Authorization:`Bearer ${auth.token}`} : {}},body:body ? JSON.stringify(body) : undefined,signal:controller.signal,cache:'no-store',credentials:'omit'});
    const data = await response.json();
    if (!response.ok) { const e = new Error(data.error || '请求失败'); e.status = response.status; throw e; }
    failures = 0; lastUpdated = Date.now(); status('已连接'); return data;
  } catch(e) { if (e.name === 'AbortError') throw new Error('连接超时，请检查网络后重试'); throw e; }
  finally { clearTimeout(timer); }
}
function saveAuth(value) { auth = value; if(value) localStorage.setItem(storageKey,JSON.stringify(value)); else localStorage.removeItem(storageKey); }
function goodChips(values, total) { return `<div class="goods">${R.map(r => {const n=values?.[r]||0, need=total?.[r];return need || !total ? `<span class="good ${r}${need && n >= need ? ' done':''}">${icon(r)}<span>${N[r]}</span><b>${n}${need ? `/${need}`:''}</b></span>`:'';}).join('')}</div>`; }
function effectText(e) {
  if(e.kind==='money')return `获得${e.amount}克朗`;
  if(e.kind==='vp')return `获得${e.amount}分`;
  if(e.kind==='emperor')return `皇帝前进${e.amount}格`;
  if(e.kind==='draw')return `抽${e.amount}张员工`;
  if(e.kind==='staffVp')return `每位已雇员工${e.amount}分`;
  if(e.kind==='goods')return e.counts ? R.filter(r=>e.counts[r]).map(r=>`${N[r]}${e.counts[r]}`).join('、') : `获得最多${e.amount}件${e.pair ? e.pair.map(r=>N[r]).join('/'):'任意食饮'}${e.balanced?'（前者不少于后者）':''}`;
  if(e.kind==='prepare')return `${e.occupied?'准备并直接入住':'准备'}最多${e.amount}间${e.maxFloor?`${e.maxFloor}层以下`:''}房${e.free?'（免费）':e.discount?`（每间减${e.discount}克朗）`:'（付楼层费用）'}`;
  if(e.kind==='hire')return `${e.draw?`抽${e.draw}选一雇用`:'雇用一位手牌员工'}${e.free?'（免费）':`（减${e.discount||0}克朗）`}`;
  if(e.kind==='occupy')return '额外将一间空房标记为入住';
  if(e.kind==='complete')return '免费完成一位客人的订单';
  if(e.kind==='attract')return '免费迎接一位市场客人';
  if(e.kind==='die')return '执行一次额外骰子动作（不取骰、不增强、不触发取骰员工）';
  if(e.kind==='conference')return '可付1克朗免去本次皇帝处罚';
  if(e.kind==='penalty')return {money:`支付${e.amount}克朗，否则扣${e.fallback}分`,discardHand:`将${e.amount}张手牌放回牌库底，否则扣${e.fallback}分`,removePrepared:`从最高可能楼层移除${e.amount}间空房，否则扣${e.fallback}分`,clearKitchen:'清空厨房',clearAllGoods:'清空厨房与客人桌上的食饮',vp:`扣${e.amount}分`,staffVp:`每位已雇员工扣${e.amount}分`,removeOccupied:'最高两个有入住房的楼层各移除一间入住房',removeEndStaff:`移除一位终局员工，否则扣${e.fallback}分`}[e.penalty];
  return '';
}
function staffText(c) {
  const m=c.mechanics;
  if(c.effects?.length)return c.effects.map(effectText).join('；');
  if(m.on==='guestAccommodated')return `${m.guestColor?N[m.guestColor]+'色':'任意'}客人入住${m.minOrderSize?`且订单至少${m.minOrderSize}件`:''}：${m.money?`+${m.money}克朗`:m.emperor?`皇帝+${m.emperor}格`:`+${m.vp}分`}`;
  if(m.freeRoomColor)return `${N[m.freeRoomColor]}色房间准备免费`;
  if(m.on==='dieTaken')return `取实体${m.faces.join('/')}点骰时：${m.vp?'+'+m.vp+'分':m.bothMoneyAndEmperor?'强度同时用于钱与皇帝':m.freeWildcard?'万能骰免费且强度+1':m.discount?'员工折扣额外+'+m.discount:m.power?'食饮强度+1':m.prepareRooms?'可额外付费准备一间房':m.hireStaff?'可额外原价雇一位员工':'皇帝前进2格'}${m.beforeOrAfterMain?'，可选在主动作前/后':''}`;
  if(m.on==='roomOccupied')return '任何方式使房间入住：+1克朗';
  if(m.on==='emperorBonus')return '每次获得皇帝奖励：额外+5分';
  if(m.serveCost===0)return '厨房上菜免费（单次最多3件，可重复）';
  if(m.guestQueueCost===0)return '从市场迎客免费';
  if(m.emperorPenaltyAvoidCost)return '皇帝处罚前可付1克朗免罚';
  if(m.score)return {occupiedColor:`每间已入住${N[m.color]}房+${m.each}分`,occupiedRooms:'每间入住房+1分',playedStaff:'每位已雇员工（包括自己）+2分',preparedOrOccupiedRooms:'每间已准备或入住房+1分',occupiedGroups:'每个完全入住房组+2分',claimedObjectives:'每个已领取目标+5分',emperorPosition:'皇帝每格+2分，无12分上限',occupiedFloors:'每个完全入住楼层+5分',occupiedColumns:'每个完全入住列+5分',minOccupiedColorCount:'每组红、蓝、黄各一间入住房+4分',copyOpponentEndgameStaff:'选择并按自己的酒店计算一位对手的终局员工（自动取最高）'}[m.score];
  return '';
}
function staffCard(c, activate=false) { return `<article class="card staff-card${c.usedRound===room?.game.round?' used':''}"><div class="staff-card-top"><span class="staff-seal" aria-hidden="true">${icon(c.timing==='end'?'vp':c.timing==='round'?'bell':'key')}</span><span class="card-number">EMPLOYEE · ${String(c.id).padStart(2,'0')}</span><span class="card-cost">${c.cost} K</span></div><h3>${esc(c.name)}</h3><small>${timing[c.timing]}</small><p>${esc(staffText(c))}</p>${activate && c.timing==='round' ? `<button data-do="activate" data-id="${c.id}"${disabled(!isMyTurn()||!!room.game.prompt||c.usedRound===room.game.round)}>使用${c.usedRound===room.game.round?'（本轮已用）':''}</button>`:''}</article>`; }
function guestCard(g, index=null, allow=false) { return g ? `<article class="card guest-card ${g.color}"><div class="guest-portrait"><span class="guest-type">${N[g.color]} · ${g.color==='green'?'旅人':'贵宾'}</span><span class="guest-vp">${icon('vp')}${g.vp}</span></div><div class="guest-card-body"><h3><span class="card-number">#${g.id}</span> ${esc(g.name)}</h3>${index!==null?`<small class="market-price">迎客费用 ${[3,2,1,0,0][index]} K</small>`:''}${goodChips(g.served||{},g.needs)}<p>${esc(g.effects.map(effectText).join('；') || '静享入住时光')}</p>${index!==null?`<button data-do="take-guest" data-index="${index}"${disabled(!allow)}>选择这位客人 ${icon('arrow')}</button>`:g.complete?'<span class="badge complete">订单已完成，可入住</span>':''}</div></article>`:'<article class="card empty">客牌已用完</article>'; }
function hotelGrid(p, { chooser=false, mode='closed', max, key='rooms' }={}) {
  const list=[...p.rooms].sort((a,b)=>b.floor-a.floor||a.col-b.col);
  return `<div class="hotel${chooser?' room-chooser':''}" data-room-grid="${esc(key)}">${list.map(r=>`<div class="room ${r.color} ${r.state}"><label>${chooser?`<input type="checkbox" name="rooms" value="${r.id}"${disabled(mode==='closed'?r.state!=='closed':mode==='prepared'?r.state!=='prepared':mode==='occupied'?r.state!=='occupied':false)}>`:''}<strong class="room-number">${r.floor}0${r.col}</strong><span class="room-window" aria-hidden="true"><i></i><i></i><i></i></span><span class="state">${N[r.color]} · ${{closed:'未准备',prepared:'空房',occupied:'已入住'}[r.state]}</span><span class="room-price">${r.state==='closed'?`${r.floor-1} K${r.vp?' / +'+r.vp+'分':''}`:`第${r.group}组`}</span></label></div>`).join('')}</div>${chooser?`<p class="selection-info" data-selection-info="${esc(key)}">${max?`最多选择${max}间，按点击顺序处理`:'按点击顺序处理'}</p>`:''}`;
}
function allocationInputs(p) { return `<div class="allocation"><div class="allocation-row"><span>分配给客人</span>${R.map(r=>`<small>${N[r]}</small>`).join('')}</div>${p.cafe.map(g=>`<div class="allocation-row"><span>#${g.id} ${esc(g.name)}</span>${R.map(r=>`<input aria-label="${esc(g.name)} ${N[r]}数量" type="number" name="alloc:${g.uid}:${r}" value="0" min="0" max="${Math.max(0,(g.needs[r]||0)-(g.served[r]||0))}"${disabled(!(g.needs[r]-(g.served[r]||0)>0))}>`).join('')}</div>`).join('')}</div>`; }
const playerId=()=>preview?.seatId||auth?.player.id;
const me = () => room?.game.players.find(p=>p.id===playerId());
const isMyTurn = () => room?.game.activePlayerId === playerId();
function promptHtml(g) {
  const p=me(), e=g.prompt;
  if(!e)return '';
  if(e.waiting)return `<div class="panel wait">等待 <span class="waiting-name">${esc(g.players.find(p=>p.id===e.playerId)?.name)}</span> 处理奖励或处罚。</div>`;
  const end=`<div class="form-actions"><button type="submit" class="primary">确认处理</button>${e.kind!=='penalty'?`<button type="button" data-do="skip-effect">${e.kind==='conference'?'不支付，执行处罚':'放弃这项奖励'}</button>`:''}</div>`;
  let inputs='';
  if(e.kind==='goods') inputs=`<div class="counter-grid">${R.map(r=>`<label>${N[r]}<input name="count:${r}" type="number" min="0" max="${e.amount||e.counts?.[r]||0}" value="${e.counts?.[r]||0}"${e.counts?' readonly':''}${disabled(e.pair&&!e.pair.includes(r))}></label>`).join('')}</div><p class="hint">下方填写直接送给客人的数量，其余会进入厨房。此处只能分配这次新获得的食饮。</p>${allocationInputs(p)}`;
  if(e.kind==='prepare') inputs=hotelGrid(p,{chooser:true,mode:'closed',max:e.amount,key:e.uid});
  if(e.kind==='moneyEmperor') inputs=`<label>用于前进皇帝的格数（余下获得克朗）<input type="number" name="emperor" min="0" max="${e.amount}" value="0"></label>`;
  if(e.kind==='hire') { const cards=e.drawn||p.hand;inputs=`<label>选择员工<select name="staffId">${e.drawn?'<option value="">不雇用，全部放回牌库底</option>':''}${cards.map(c=>`<option value="${c.id}">#${c.id} ${esc(c.name)} · ${e.free?0:Math.max(0,c.cost-(e.discount||0))}克朗</option>`).join('')}</select></label><div class="staff-list">${cards.map(c=>staffCard(c)).join('')}</div>${e.drawn?'<p class="hint">未雇用的牌按下方顺序放回牌库底，可调整顺序。</p><label>牌库底顺序（牌号，以逗号分隔，已雇牌自动忽略）<input name="returnOrder" type="text" value="'+cards.map(c=>c.id).join(',')+'"></label>':''}`; }
  if(e.kind==='attract') inputs=`<label>选择免费迎接的客人<select name="index">${g.market.map((c,i)=>c?`<option value="${i}">#${c.id} ${esc(c.name)}</option>`:'').join('')}</select></label>`;
  if(e.kind==='complete') inputs=`<label>选择订单<select name="guestId">${p.cafe.filter(c=>!e.color||c.color===e.color).map(c=>`<option value="${c.uid}">#${c.id} ${esc(c.name)}</option>`).join('')}</select></label>`;
  if(e.kind==='occupy') inputs=hotelGrid(p,{chooser:true,mode:'prepared',max:1,key:e.uid});
  if(e.kind==='die') inputs=diceInputs(g,true);
  if(e.kind==='conference') inputs='<label class="check-label"><input type="checkbox" name="pay" checked>支付1克朗免去本次处罚</label>';
  if(e.kind==='penalty') {
    if(e.penalty==='discardHand') inputs=`<div class="stack">${p.hand.map(c=>`<label class="check-label"><input type="checkbox" name="cards" value="${c.id}">#${c.id} ${esc(c.name)}</label>`).join('')}</div><label>返回牌库底顺序（所选牌号，用逗号分隔）<input type="text" name="returnOrder"></label>`;
    if(e.penalty==='removeEndStaff') inputs=`<label>移除终局员工<select name="staffId">${p.staff.filter(c=>c.end).map(c=>`<option value="${c.id}">#${c.id} ${esc(c.name)}</option>`).join('')}</select></label>`;
    if(e.penalty==='removePrepared') inputs=hotelGrid(p,{chooser:true,mode:'prepared',max:e.amount,key:e.uid});
    if(e.penalty==='removeOccupied') inputs=`<p class="hint">按从高到低的楼层顺序选择：${e.floors.join('、')}楼。</p>${hotelGrid(p,{chooser:true,mode:'occupied',max:e.floors.length,key:e.uid})}`;
  }
  return `<section class="panel prompt"><h2>处理${e.kind==='penalty'?'皇帝处罚':'效果'}</h2><p>${esc(effectText(e)||`在${e.amount}格强度中分配钱与皇帝`)}</p><form data-form="resolve" data-key="${e.uid}" class="controls">${inputs}${end}</form></section>`;
}
function diceInputs(g, extra=false) { return `<div class="columns"><label>骰面<select name="face">${[1,2,3,4,5,6].filter(n=>g.dice.includes(n)).map(n=>`<option value="${n}">${n}点 · ${g.dice.filter(x=>x===n).length}枚</option>`).join('')}</select></label><label>6点复制的动作<select name="asFace">${[1,2,3,4,5].map(n=>`<option value="${n}">动作${n}</option>`).join('')}</select></label></div>${!extra?`<label class="check-label"><input type="checkbox" name="boost"${disabled(g.turn?.boostUsed)}>付1克朗，主动作强度+1（每回合一次）</label><label class="check-label"><input type="checkbox" name="staffBefore">骰面员工的附带效果放在主动作之前处理</label>`:''}`; }
function actionPanel(g) {
  const p=me(), mine=isMyTurn(), name=g.players.find(x=>x.id===g.activePlayerId)?.name;
  if(g.phase==='finished')return '<section class="panel"><h2>本局已结束</h2><p>可查看终局明细，或返回大厅创建新对局。</p></section>';
  if(g.prompt)return promptHtml(g);
  if(!mine)return `<section class="panel wait"><h2>等待${esc(name||'其他玩家')}</h2><p>可以查看棋盘与公开信息，页面会自动同步。</p></section>`;
  if(g.phase==='setupGuest')return '<section class="panel prompt"><h2>选择起始客人</h2><p>从市场任选一位客人，起始迎客免费。</p></section>';
  if(g.phase==='setupRooms')return `<section class="panel prompt"><h2>准备起始房间</h2><p>从左下角开始，按顺序选择最多三间相邻房间，并支付楼层费用。</p><form data-form="setupRooms" data-key="setup"><button type="button" data-do="default-rooms">直接准备底层前三间（0克朗）</button>${hotelGrid(p,{chooser:true,max:3,key:'setup'})}<button class="primary">确认起始房间</button></form></section>`;
  return `<section class="panel"><h2>轮到你行动</h2><p class="hint">${g.turn.dieTaken?'主动作已完成，可以执行额外动作或结束回合。':g.turn.guestTaken?'已迎客，接下来取骰。':'可先从市场迎客，再取骰；额外动作可穿插在这些步骤之间。'}</p>${!g.turn.dieTaken?`<form data-form="die" class="stack">${diceInputs(g)}<button class="primary">取骰并执行主动作</button></form>`:''}<div class="form-actions"><button data-do="end-turn" class="primary"${disabled(!g.turn.dieTaken)}>结束回合</button><button data-do="pass"${disabled(g.turn.touched)}>暂时跳过</button></div></section>`;
}
function extraPanel(g) {
  const p=me(), enabled=isMyTurn()&&!g.prompt&&g.phase==='turn';
  return `<section class="panel"><h2>额外动作</h2><details><summary>从厨房上菜</summary><form data-form="serve" class="stack"><p class="hint">每次最多3件，费用${p.staff.some(x=>x.id===24)?0:1}克朗。</p>${allocationInputs(p)}<button${disabled(!enabled)}>确认上菜</button></form></details><details><summary>安排客人入住</summary><form data-form="checkin" class="stack"><label>订单已完成的客人<select name="guestId">${p.cafe.filter(c=>c.complete).map(c=>`<option value="${c.uid}">#${c.id} ${esc(c.name)} · ${N[c.color]}</option>`).join('')}</select></label><label>空房<select name="roomId">${p.rooms.filter(r=>r.state==='prepared').map(r=>`<option value="${r.id}">${r.floor}楼${r.col}号 · ${N[r.color]}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" name="bonusFirst">如果完成房组，先领取房组奖励</label><button${disabled(!enabled||!p.cafe.some(c=>c.complete))}>确认入住</button></form></details><details><summary>我的员工手牌（${p.hand.length}）</summary><div class="staff-list">${p.hand.map(c=>staffCard(c)).join('')||'<p>手牌为空</p>'}</div></details></section>`;
}
function scoreHtml(g) {
  const ps=[...g.players].sort((a,b)=>b.score.total-a.score.total||b.score.tieBreaker-a.score.tieBreaker);
  return `<section class="panel"><h2>终局计分</h2><p>胜者：${(g.winners||[]).map(id=>esc(g.players.find(p=>p.id===id)?.name)).join('、')}${g.winners?.length>1?'（并列）':''}</p><div class="score-wrap"><table class="score-table"><thead><tr>${['玩家','过程','员工','房间','厨房','克朗','咖啡厅','总分'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${ps.map(p=>`<tr><th>${esc(p.name)}</th>${['duringGame','staff','rooms','goods','cash','cafe','total'].map(k=>`<td${k==='total'?' class="score-total"':''}>${p.score[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="hint">同分比较厨房剩余食饮与克朗总和，仍相同则并列。</p></section>`;
}
function renderGame(){
  root.className='view-game';
  const g=room.game,p=me(),active=g.players.find(x=>x.id===g.activePlayerId)?.name;
  const allowTake=isMyTurn()&&!g.prompt&&(g.phase==='setupGuest'||g.phase==='turn'&&!g.turn.dieTaken&&!g.turn.guestTaken);
  root.innerHTML=renderTable(g,p,{room,preview,esc,icon,dieIcon,actionPanel,extraPanel,hotelGrid,goodChips,guestCard,staffCard,effectText,scoreHtml,isMyTurn,disabled,allowTake,active,previewToolbar});
  selections.clear();
}
function renderLobby() {
  const g=room.game;
  root.innerHTML=`<section class="panel"><div class="row spread"><h2>${esc(g.name)}</h2><button data-do="home">返回大厅</button></div><p>房间码 <strong class="roomcode">${esc(room.code)}</strong></p><p>把房间码或链接给好友；好友需要先输入饭店访问密码。</p><div class="player-overview">${g.players.map(p=>`<article><h3>${esc(p.name)}${p.id===g.hostId?' · 房主':''}${p.id===auth.player.id?' · 你':''}</h3>${auth.player.id===g.hostId&&p.id!==g.hostId?`<button data-do="kick" data-id="${esc(p.id)}">移出房间</button>`:''}</article>`).join('')}</div><div class="form-actions"><button data-do="copy-room">复制好友链接</button><button class="primary" data-do="start"${disabled(g.hostId!==auth.player.id||g.players.length<2)}>开始 ${g.players.length} 人对局</button></div><p class="hint">容量 ${g.maxPlayers} 人。开始后仅原玩家可重连；每位玩家应使用自己的浏览器身份。</p></section>`;
}
async function renderHome() {
  root.className='view-home';room=null; clearTimeout(pollTimer); const data=await api('/me');
  root.innerHTML=`<section class="panel row spread"><span class="player-name">${esc(auth.player.name)}，欢迎回来</span><button data-do="logout">退出此玩家</button></section><div class="columns"><section class="panel"><h2>创建好友桌</h2><form data-form="create" class="stack"><label>房间名称<input name="name" value="${esc(auth.player.name)}的饭店" maxlength="40" required></label><label>最多人数<select name="maxPlayers"><option value="4">4人</option><option value="3">3人</option><option value="2">2人</option></select></label><label>酒店版面<select name="hotelMode"><option value="night">标准夜面（相同酒店）</option><option value="day">不同日面（随机分配不同酒店）</option></select></label><button class="primary">创建房间</button></form></section><section class="panel"><h2>加入好友桌</h2><form data-form="join" class="stack"><label>7位房间码<input name="code" type="text" maxlength="7" autocapitalize="characters" autocomplete="off" value="${esc(new URLSearchParams(location.search).get('room')||'')}" required></label><button class="primary">加入房间</button></form><hr><p class="hint">每位玩家使用自己的浏览器身份。刷新和短暂断线后，可以回到同一座位继续。</p></section></div><section class="panel"><h2>我的对局</h2><div class="stack">${data.rooms.map(r=>`<div class="row spread"><span>${esc(r.name)} · ${esc(r.code)} · ${r.players}人 · ${{lobby:'等待开始',finished:'已结束'}[r.phase]||'进行中'}</span><button data-do="open-room" data-code="${esc(r.code)}">回到对局</button></div>`).join('')||'<p class="empty">还没有对局</p>'}</div></section><details><summary>此玩家的重连密钥</summary><div><p class="hint">仅在需要换浏览器恢复同一座位时导出。持有文件的人可以操作你的座位，请自行保管。</p><button data-do="export-session">导出重连文件</button><label>导入已有重连文件<input type="file" id="import-session" accept="application/json,.json"></label></div></details>`;
  root.insertAdjacentHTML('afterbegin',previewEntry());
}
function renderLogin(){root.className='view-arrival';root.innerHTML=renderArrival(health,icon);}
function updateRoom(next) { if(preview)return;if(!room||next.code!==room.code||next.version>=room.version) {room=next; if(room.game.phase==='lobby')renderLobby();else renderGame();} schedulePoll(); }
async function refreshRoom() { if(!room||preview)return; const currentCode=room.code; const next=await api(`/rooms/${currentCode}?since=${room.version}`); if(room?.code===currentCode&&!next.unchanged)updateRoom(next); }
function schedulePoll() { clearTimeout(pollTimer); if(preview||!room||document.hidden)return; pollTimer=setTimeout(async()=>{try{if(!busy)await refreshRoom();}catch(e){failures++;status(`连接中断，正在重试（${failures}）`,true);if(e.status===401){saveAuth(null);room=null;health=await api('/health',{anonymous:true});renderLogin();return;}}schedulePoll();},Math.min(10000,2000*(failures+1))); }
async function action(a) { if(preview){preview.state=preview.module.applyAction(preview.state,preview.seatId,a);if(preview.follow)preview.seatId=preview.module.activeSeat(preview.state);refreshPreview();return;} const current=room;const next=await api(`/rooms/${current.code}/action`,{method:'POST',body:{version:current.version,requestId:requestId(),action:a}});updateRoom(next); }
function previewToolbar(){return `<section class="preview-toolbar"><div class="preview-heading"><span class="badge">单人画面测试</span><p>示例对局，一人控制两席。操作只在本页生效，刷新或重置后恢复。</p></div><div class="preview-controls"><label>场景<select name="previewScene">${[['showcase','饭店营业中'],['opening','新局开场'],['finale','终局计分']].map(([value,label])=>`<option value="${value}"${preview.scene===value?' selected':''}>${label}</option>`).join('')}</select></label><label>酒店版面<select name="previewBoard"><option value="night"${preview.board==='night'?' selected':''}>经典夜面</option><option value="day"${preview.board==='day'?' selected':''}>不同日面</option></select></label><label>当前视角<select name="previewSeat">${preview.state.players.map(p=>`<option value="${p.id}"${preview.seatId===p.id?' selected':''}>${esc(p.name)}的饭店</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" name="previewFollow"${preview.follow?' checked':''}>自动跟随回合</label><button data-do="preview-reset">${icon('reset')} 重置场景</button>${!isMyTurn()&&room.game.phase!=='finished'?'<button data-do="preview-follow">接管当前回合</button>':''}</div></section>`;}
function refreshPreview(){room={code:'PREVIEW',version:0,game:preview.module.viewGame(preview.state,preview.seatId)};status('单人画面测试');renderGame();}
async function openPreview(scene='showcase',board='night'){
  const url=new URL(location.href);url.searchParams.set('preview','1');history.replaceState(null,'',url);
  if(!auth){renderLogin();flash('请先设置访问密码并登录，随后会直接进入单人画面测试。');root.querySelector('input')?.focus();return;}
  if(!preview){try{await api('/me');}catch(e){if(e.status===401){saveAuth(null);renderLogin();flash('请重新登录后进入单人画面测试。');return;}throw e;}}
  clearTimeout(pollTimer);previewModule ||= await import('./preview-engine.mjs');
  const state=previewModule.makePreview(scene,board);preview={module:previewModule,state,scene,board,seatId:previewModule.activeSeat(state),follow:true};
  refreshPreview();
}
async function closePreview(){preview=null;room=null;const url=new URL(location.href);url.searchParams.delete('preview');history.replaceState(null,'',url);if(!health){try{health=await api('/health',{anonymous:true});}catch{health={configured:false,canSetup:false};}}if(auth)await renderHome();else renderLogin();}
async function task(fn) { if(busy)return; busy=true;flash('');try{await fn();}catch(e){flash(e.message);if(e.status===409&&room){try{await refreshRoom();}catch{}}}finally{busy=false;schedulePoll();} }
function alloc(form) {return [...new FormData(form)].filter(([k,v])=>k.startsWith('alloc:')&&Number(v)>0).map(([k,v])=>{const [,guestId,resource]=k.split(':');return{guestId,resource,amount:Number(v)};});}
function chosen(form) {return selections.get(form.dataset.key)||[];}
function readResolve(form) {
  const d=new FormData(form),e=room.game.prompt,a={type:'resolve',promptId:e.uid};
  if(e.kind==='goods'){a.counts=Object.fromEntries(R.map(r=>[r,Number(d.get(`count:${r}`)||0)]));a.allocations=alloc(form);}
  if(e.kind==='moneyEmperor')a.emperor=Number(d.get('emperor'));
  if(e.kind==='prepare'||e.kind==='penalty')a.rooms=chosen(form);
  if(e.kind==='occupy')a.roomId=chosen(form)[0];
  if(e.kind==='hire'||e.kind==='penalty')a.staffId=d.get('staffId')?Number(d.get('staffId')):null;
  if(e.kind==='attract')a.index=Number(d.get('index'));
  if(e.kind==='complete')a.guestId=d.get('guestId');
  if(e.kind==='die'){a.face=Number(d.get('face'));a.asFace=Number(d.get('asFace'));}
  if(e.kind==='conference')a.pay=d.has('pay');
  if(e.kind==='penalty'&&e.penalty==='discardHand')a.cards=d.getAll('cards').map(Number);
  if(d.get('returnOrder'))a.returnOrder=String(d.get('returnOrder')).split(/[,，\s]+/).filter(Boolean).map(Number);
  return a;
}
root.addEventListener('submit',event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();
  task(async()=>{const d=new FormData(form);switch(form.dataset.form){
    case 'setup':if(d.get('password')!==d.get('confirmPassword'))throw new Error('两次密码不一致');await api('/setup',{method:'POST',body:{password:d.get('password')},anonymous:true});health=await api('/health',{anonymous:true});renderLogin();flash('访问密码已保存，请登录。');break;
    case 'login':saveAuth(await api('/login',{method:'POST',body:{name:d.get('name'),password:d.get('password')},anonymous:true}));if(new URLSearchParams(location.search).get('preview')==='1')await openPreview();else await renderHome();break;
    case 'create':updateRoom(await api('/rooms',{method:'POST',body:{name:d.get('name'),maxPlayers:Number(d.get('maxPlayers')),hotelMode:d.get('hotelMode')}}));break;
    case 'join':updateRoom(await api(`/rooms/${String(d.get('code')).trim().toUpperCase()}/join`,{method:'POST',body:{}}));break;
    case 'resolve':await action(readResolve(form));break;
    case 'setupRooms':await action({type:'setupRooms',rooms:chosen(form)});break;
    case 'die':await action({type:'die',face:Number(d.get('face')),asFace:Number(d.get('asFace')),boost:d.has('boost'),staffBefore:d.has('staffBefore')});break;
    case 'serve':await action({type:'serve',allocations:alloc(form)});break;
    case 'checkin':await action({type:'checkin',guestId:d.get('guestId'),roomId:d.get('roomId'),bonusFirst:d.has('bonusFirst')});break;
  }});
});
root.addEventListener('change',event=>{
  const input=event.target;
  if(preview&&['previewScene','previewBoard','previewSeat','previewFollow'].includes(input.name))task(async()=>{if(input.name==='previewScene')await openPreview(input.value,preview.board);if(input.name==='previewBoard')await openPreview(preview.scene,input.value);if(input.name==='previewSeat'){preview.seatId=input.value;preview.follow=false;refreshPreview();}if(input.name==='previewFollow'){preview.follow=input.checked;if(preview.follow)preview.seatId=preview.module.activeSeat(preview.state);refreshPreview();}});
  if(input.name==='rooms'){const form=input.closest('form'),key=form.dataset.key;let list=(selections.get(key)||[]).filter(id=>id!==input.value);if(input.checked)list.push(input.value);selections.set(key,list);const info=form.querySelector('[data-selection-info]');if(info)info.textContent=list.length?`处理顺序：${list.join(' → ')}`:'尚未选择房间';}
  if(input.id==='import-session')task(async()=>{const file=input.files[0];if(!file)return;if(file.size>4096)throw new Error('重连文件无效');const data=JSON.parse(await file.text()),old=auth;if(!/^[A-Za-z0-9_-]{40,100}$/.test(data.token||''))throw new Error('重连文件无效');auth=data;try{const who=await api('/me');saveAuth({...data,player:who.player});await renderHome();}catch(e){auth=old;throw e;}});
});
root.addEventListener('click',event=>{
  const button=event.target.closest('button[data-do]');if(!button)return;
  task(async()=>{switch(button.dataset.do){
    case 'open-preview':await openPreview();break;
    case 'preview-reset':await openPreview(preview.scene,preview.board);break;
    case 'preview-follow':preview.follow=true;preview.seatId=preview.module.activeSeat(preview.state);refreshPreview();break;
    case 'pick-die':{const select=root.querySelector('form[data-form="die"] select[name="face"]');if(select){select.value=button.dataset.face;root.querySelectorAll('.die').forEach(d=>d.classList.toggle('selected',d===button));if(matchMedia('(max-width:900px)').matches)document.getElementById('turn-actions').scrollIntoView({behavior:'smooth',block:'start'});}break;}
    case 'start':await action({type:'start'});break;
    case 'kick':await action({type:'kick',playerId:button.dataset.id});break;
    case 'home':if(preview)await closePreview();else await renderHome();break;
    case 'open-room':updateRoom(await api(`/rooms/${button.dataset.code}`));break;
    case 'copy-room':{const url=new URL(location.href);url.search='';url.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(url.href);flash('好友链接已复制；请另行私下发送访问密码。');}catch{flash(`好友链接：${url.href}`);}break;}
    case 'take-guest':await action({type:room.game.phase==='setupGuest'?'setupGuest':'attract',index:Number(button.dataset.index)});break;
    case 'default-rooms':await action({type:'setupRooms',rooms:['1-1','1-2','1-3']});break;
    case 'skip-effect':{const form=button.closest('form');await action({...readResolve(form),skip:true});break;}
    case 'end-turn':await action({type:'endTurn'});break;
    case 'pass':await action({type:'pass'});break;
    case 'activate':await action({type:'activate',staffId:Number(button.dataset.id)});break;
    case 'claim':await action({type:'claim',objectiveId:Number(button.dataset.id)});break;
    case 'logout':if(confirm('退出会注销当前身份；未结束的对局座位将无法再用此身份恢复。确定退出？')){await api('/logout',{method:'POST',body:{}});saveAuth(null);room=null;renderLogin();}break;
    case 'export-session':{const blob=new Blob([JSON.stringify(auth)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='饭店玩家重连密钥.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
  }});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(pollTimer);else{if(room)task(refreshRoom);schedulePoll();}});
window.addEventListener('online',()=>{if(room)task(refreshRoom);});
async function init(){if(window.HOTEL_ONLINE_PENDING){status('等待公网开门');root.className='view-arrival';root.innerHTML=renderOnlinePending();return;}try{health=await api('/health',{anonymous:true});if(new URLSearchParams(location.search).get('preview')==='1'){await openPreview();return;}if(auth){try{await renderHome();}catch(e){if(e.status===401){saveAuth(null);renderLogin();}else throw e;}}else renderLogin();}catch(e){status('无法连接',true);root.innerHTML='<section class="panel login"><h2>饭店暂时无法连接</h2><p>请稍后刷新重试；本地试玩请确认服务已经启动。</p></section>';flash('连接失败，请检查游戏服务与网络。');}}
init();
