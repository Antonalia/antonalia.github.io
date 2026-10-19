import {icon,dieIcon} from './visuals.mjs';
import {guestName,chineseText} from './chinese.mjs';
import {FOODS,changeFood,canChangeFood,allocationLimit,selectableRooms,turnIdentity,shouldOfferGuest,draftGuest,guestSelection} from './interaction-rules.mjs';
import {guestPortraitClass,staffPortraitClass,guestPortraitArt,staffPortraitArt,foodTokens,playerScoreboard,objectiveArt,effectMarkup,resourceTextMarkup,guestRewardMarkup,roomRegion,hiddenHandMarkup} from './card-art.mjs';
const LABEL={strudel:'苹果卷',cake:'蛋糕',wine:'葡萄酒',coffee:'咖啡',red:'红',blue:'蓝',yellow:'黄',green:'绿'};
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sum=counts=>FOODS.reduce((n,r)=>n+(counts[r]||0),0);
const empty=()=>Object.fromEntries(FOODS.map(r=>[r,0]));
const off=b=>b?' disabled':'';
const roomEffect=e=>e&&(e.kind==='prepare'||e.kind==='occupy'||e.kind==='penalty'&&['removePrepared','removeOccupied'].includes(e.penalty));
export function createTabletop(root,{onAction,onExit,onFlash}){
  let g,p,ctx,turnKey='',promptKey='',pending=false,lastOverlay;
  let state=fresh();
  const railOffsets=new Map();
  function fresh(){return {view:'hotel',overlay:null,staff:'hand',seen:new Set(),counts:empty(),allocations:[],guest:null,marketDraft:null,rooms:[],staffId:null,cards:[],returnOrder:[],face:1,asFace:1,boost:false,before:false,emperor:0,goodsStep:'choose',bonusFirst:false,pay:true,other:null};}
  function reset(){state=fresh();turnKey='';promptKey='';railOffsets.clear();}
  const mine=()=>g.activePlayerId===p.id;
  const extra=()=>mine()&&!g.prompt&&g.phase==='turn';
  const effect=()=>g.prompt&&!g.prompt.waiting?g.prompt:null;
  const prepareEffect=()=>g.phase==='setupRooms'&&mine()?{kind:'prepare',amount:3}:roomEffect(effect())?effect():null;
  const guestFee=i=>g.phase==='setupGuest'||effect()?.kind==='attract'||p.staff.some(c=>c.mechanics?.guestQueueCost===0)?0:[3,2,1,0,0][i];
  const countFor=(uid,r)=>state.allocations.find(a=>a.guestId===uid&&a.resource===r)?.amount||0;
  const canCheckin=c=>Boolean(c&&extra()&&c.complete&&selectableRooms(p,{kind:'occupy'},[],c).length>0);
  function button(label,action,data='',disabled=false,klass=''){return `<button type="button" class="${klass}" data-ui="${action}" ${data}${off(disabled)}>${label}</button>`;}
  function open(kind){if(kind==='welcome'&&state.overlay!=='welcome')state.marketDraft=null;state.overlay=kind;draw();}
  const chips=foodTokens;
  function marketFooter(){const selection=guestSelection(g,p,state.marketDraft);return `<span class="tt-market-summary">${selection.valid?`已选${esc(guestName(selection.card))} · ${selection.cost}克朗`:esc(selection.reason)}</span>${button(selection.valid?`确认迎接${esc(guestName(selection.card))}`:'确认迎接','confirm-market','',!selection.valid,'primary')}`;}
  function guestCard(card,{market=false,index=0,select=false,alloc=false}={}){
    const selected=market?state.marketDraft?.index===index&&state.marketDraft?.guestId===card.id:state.guest===card.uid;
    const served={...card.served};if(alloc)for(const r of FOODS)served[r]=(served[r]||0)+countFor(card.uid,r);
    const unavailable=market&&(p.cafe.length>=3||p.money<guestFee(index));
    const label=market?`选择客人${guestName(card)}`:select?`选择${guestName(card)}`:`查看客人${guestName(card)}`;
    const price=market?`<span class="tt-guest-price tt-fee-plaque${unavailable?' unavailable':''}" aria-label="迎客费用${guestFee(index)}克朗" title="迎客费用（克朗）">${icon('coin')}<b>${guestFee(index)}</b></span>`:'';
    const rewards=card.effects.length?card.effects.map(e=>`<span class="tt-effect-line">${guestRewardMarkup(e,ctx.effectText(e))}</span>`).join(''):'<span class="tt-effect-line">无额外奖励</span>';
    return `<button type="button" class="tt-guest ${card.color}${market?' tt-guest-market':' tt-guest-contain'}${selected?' picked':''}${!market&&card.complete?' order-complete':''}" data-ui="${market?'market-card':'guest-card'}" data-id="${esc(card.uid||'')}" data-index="${index}" aria-label="${esc(label)}"${market?` aria-pressed="${selected}"`:''}><span class="tt-guest-meta"><span class="tt-guest-kind">${LABEL[card.color]} · ${card.color==='green'?'旅人':'贵宾'}</span><span class="guest-vp" aria-label="${card.vp}分">${icon('vp')}<b>${card.vp}</b></span></span><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card,{fit:market?'slice':'meet'})}${!market&&card.complete?'<span class="tt-order-check" aria-label="订单已完成">✓</span>':''}</span><span class="tt-guest-info"><strong>${esc(guestName(card))}<small>客人${card.id}</small></strong>${chips(served,card.needs)}<span class="tt-reward tt-effects">${rewards}</span>${!market?`<span class="tt-status">${card.complete?'需求已满足 · 可安排入住':'点击客人上菜'}</span>`:''}</span>${price}${selected?'<span class="tt-guest-selection" aria-hidden="true">✓</span>':''}</button>`;
  }
  function staffCard(card,select=false){
    const selected=state.staffId===card.id||state.cards.includes(card.id);
    const e=effect(),fee=e?.kind==='hire'?(e.free?0:Math.max(0,card.cost-(e.discount||0))):card.cost;
    return `<button type="button" class="tt-staff${selected?' picked':''}" data-ui="staff-card" data-id="${card.id}" aria-label="${select?'选择':'查看'}员工${esc(card.name)}"><span class="tt-staff-portrait ${staffPortraitClass(card)}">${staffPortraitArt(card)}<span class="tt-staff-price">${icon('money')}${fee}</span></span><span class="tt-staff-info"><span class="tt-staff-top">员工${card.id} · ${{end:'终局计分',immediate:'立即生效',permanent:'持续生效',round:'每轮一次'}[card.timing]}</span><strong>${esc(card.name)}</strong><span class="tt-reward">${card.effects?.length?card.effects.map(e=>`<span class="tt-effect-line">${effectMarkup(e,ctx.effectText(e))}</span>`).join(''):resourceTextMarkup(ctx.staffText(card))}</span>${selected?'<span class="tt-status">✓ 已选择</span>':''}</span></button>`;
  }
  function gallery(cards,render,emptyText='暂无内容'){
    if(!cards.length)return `<div class="tt-empty">${emptyText}</div>`;
    const content=cards.map(render).join(''),rail=content.includes('class="tt-staff')||cards.length>5;
    // Opening a dialog must not change the identity of the background card list.
    const railKey=cards.map(c=>typeof c==='object'?c.uid||c.id||'entry':c).join(',');
    return `<div class="tt-gallery ${rail?'tt-rail':`cols-${cards.length}`}${content.includes('class="tt-guest ')?' tt-guest-collection':''}${content.includes(' tt-guest-market')?' tt-invite-cards':''}"${rail?` data-rail="${esc(railKey)}" tabindex="0" aria-label="横向卡牌列表，可左右滑动"`:''}>${content}</div>${rail?'<span class="tt-swipe-hint">左右滑动查看更多</span>':''}`;
  }
  function marketStrip(){return `<section class="tt-market-strip" aria-label="之后可以迎接的市场客人"><div class="tt-market-row">${g.market.map((card,index)=>card?`<button type="button" class="tt-market-mini ${card.color}" data-ui="market-preview" data-index="${index}" aria-label="选择${esc(guestName(card))}，${guestFee(index)}克朗，${card.vp}分"><span class="tt-mini-top"><strong>${esc(guestName(card))}</strong><span>${icon('vp')}${card.vp}</span></span><span class="tt-mini-body"><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card)}</span><span class="tt-mini-copy"><span class="tt-mini-needs">${FOODS.filter(r=>card.needs[r]).map(r=>`<span title="${LABEL[r]}${card.needs[r]}" aria-label="${LABEL[r]}${card.needs[r]}">${icon(r)}<b>${card.needs[r]}</b></span>`).join('')}</span><span class="tt-mini-effects">${card.effects.length?card.effects.map(e=>`<span>${guestRewardMarkup(e,ctx.effectText(e))}</span>`).join(''):'无额外奖励'}</span></span></span><span class="mini-fee" aria-label="迎客费用${guestFee(index)}克朗">${icon('coin')}${guestFee(index)}</span></button>`:'<span class="tt-market-mini empty-slot">暂无客人</span>').join('')}</div></section>`;}
  function cafeSummary(){
    return `<section class="tt-cafe-summary" aria-label="酒店页咖啡厅简况"><header><strong>咖啡厅 <span>${p.cafe.length} / 3</span></strong></header><div class="tt-cafe-briefs">${Array.from({length:3},(_,index)=>{
      const card=p.cafe[index];if(!card)return `<article class="tt-cafe-brief tt-cafe-brief-empty" aria-label="咖啡厅第${index+1}席，空位">${icon('coffee')}<span>空位</span></article>`;
      const invites=card.effects.filter(e=>e.kind==='attract').length;
      const rewards=card.effects.length?card.effects.map((e,i)=>{
        if(e.kind==='attract'&&invites>1)return card.effects.findIndex(x=>x.kind==='attract')===i?`<span>${icon('invite')}免费迎客×${invites}</span>`:'';
        return `<span>${effectMarkup(e,ctx.effectText(e),{compact:true})}</span>`;
      }).join(''):'<span>无额外奖励</span>';
      return `<button type="button" class="tt-cafe-brief ${card.color}${card.complete?' ready':''}${state.checkin===card.uid?' picked':''}" data-ui="guest-card" data-id="${esc(card.uid)}" aria-label="查看客人${esc(guestName(card))}"><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card)}</span><span class="tt-cafe-brief-copy"><span class="tt-cafe-brief-title"><strong>${esc(guestName(card))}</strong><span aria-label="${card.vp}分">${icon('vp')}<b>${card.vp}</b></span></span>${chips(card.served||{},card.needs)}<span class="tt-cafe-brief-effects">${rewards}</span><small>${card.complete?'✓ 可入住':'待上菜'}</small></span>${state.checkin===card.uid?'<span class="tt-guest-selection" aria-hidden="true">✓</span>':''}</button>`;
    }).join('')}</div></section>`;
  }

  function cafeSlots(){return `<div class="tt-gallery tt-cafe-slots cols-3" aria-label="咖啡厅三个客人席位">${Array.from({length:3},(_,index)=>p.cafe[index]?guestCard(p.cafe[index]):`<article class="tt-cafe-empty" aria-label="咖啡厅第${index+1}席，空位"><span class="tt-cafe-seat">第${index+1}席</span><span class="tt-cafe-empty-art" aria-hidden="true">${icon('coffee')}</span><span class="tt-cafe-empty-copy"><strong>空位</strong><small>等待迎接客人</small></span></article>`).join('')}</div>`;}
  function hotel(player=p,interactive=true){
    const e=prepareEffect(),guest=p.cafe.find(c=>c.uid===state.checkin);
    const eligible=interactive?(e?selectableRooms(p,e,state.rooms):guest?selectableRooms(p,{kind:'occupy'},[],guest):[]):[];
    return `<section class="tt-hotel"><div class="tt-building"><div class="tt-roof">${button('?','room-bonuses','aria-label="房组奖励说明" title="展开房组奖励"',false,'tt-room-help')}<span>✦ 奥地利大饭店 ✦</span><span aria-hidden="true"></span></div><div class="tt-room-grid">${[...player.rooms].sort((a,b)=>b.floor-a.floor||a.col-b.col).map(r=>{
      const picked=interactive&&(state.rooms.includes(r.id)||state.roomId===r.id),region=roomRegion(r,player.rooms);
      return `<button type="button" class="tt-room ${r.color} ${r.state} wall-${region.pattern} ${region.edges.map(side=>'region-'+side).join(' ')}${picked?' picked':''}${eligible.includes(r.id)?' eligible':''}" data-ui="room" data-id="${r.id}" data-group="${r.group}" aria-label="${r.floor}层${r.col}号房 ${LABEL[r.color]}色 ${{closed:'未准备',prepared:'空房',occupied:'已入住'}[r.state]}${picked?' 已选择':''}"${off(interactive&&(e||guest)&&!picked&&!eligible.includes(r.id))}><span class="tt-room-wall wall-col-${r.col} wall-floor-${r.floor}" aria-hidden="true"></span><span class="tt-room-door" aria-hidden="true"><span class="tt-room-number">${r.floor}0${r.col}</span><span class="tt-room-symbol">${icon(r.state==='closed'?'room-lock':r.state==='occupied'?'room-resident':'room-bed')}</span></span><span class="tt-room-corners">${r.state==='closed'?`<span class="tt-room-price" aria-label="准备费用${Math.max(0,r.floor-1)}克朗">${icon('coin')}<b>${Math.max(0,r.floor-1)}</b></span>`:''}${r.state==='closed'&&r.vp?`<span class="tt-room-points" aria-label="准备奖励${r.vp}分">${icon('vp')}<b>${r.vp}</b></span>`:''}</span>${picked?'<span class="tt-room-choice" aria-hidden="true">✓</span>':''}</button>`;
    }).join('')}</div></div></section>`;
  }
  function stage(){
    if(state.view==='hotel')return `<div class="tt-hotel-scene">${marketStrip()}${hotel()}${cafeSummary()}</div>`;
    if(state.view==='cafe')return `<section class="tt-card-stage tt-cafe-stage"><div class="tt-section-title"><strong>咖啡厅 · ${p.cafe.length} / 3位</strong><span>订单完成后点客人，再点房间入住</span></div>${cafeSlots()}</section>`;
    if(state.view==='staff')return `<section class="tt-card-stage"><div class="tt-section-title"><strong>饭店员工</strong><div class="tt-switch">${button(`手牌${p.hand.length}`,'staff-tab','data-value="hand"',false,state.staff==='hand'?'chosen':'')}${button(`已雇${p.staff.length}`,'staff-tab','data-value="played"',false,state.staff==='played'?'chosen':'')}</div></div>${gallery(state.staff==='hand'?p.hand:p.staff,c=>staffCard(c),'暂无员工')}</section>`;
    if(state.view==='objectives')return `<section class="tt-card-stage"><div class="tt-section-title"><strong>公共目标</strong><span>达成后点卡片领取</span></div>${gallery(g.objectives,o=>`<button class="tt-objective" data-ui="objective" data-id="${o.id}"${off(!extra()||!o.eligible||o.claimed.includes(p.id))}><span class="tt-task-art">${objectiveArt(o)}</span><strong>${esc(chineseText(o.name))}</strong><span class="tt-objective-points">${o.points.join(' / ')}分</span><span>${o.claimed.includes(p.id)?'你已领取':o.eligible?'点击领取目标':'尚未达成'}</span><small>已领取：${o.claimed.map(id=>esc(g.players.find(x=>x.id===id)?.name)).join('、')||'暂无'}</small></button>`)}</section>`;
    if(state.view==='imperial')return `<section class="tt-card-stage tt-crown-stage"><div class="tt-section-title"><strong>皇冠轨道 · 当前${p.emperor}格</strong>${button('查看评分规则','legend')}</div><div class="tt-imperial-track">${Array.from({length:14},(_,n)=>`<span class="${p.emperor===n?'current':''}">${n}</span>`).join('')}</div><div class="tt-crown-cards">${g.emperors.map(e=>`<article class="tt-imperial"><header><strong>第${{A:3,B:5,C:7}[e.category]}轮</strong><span>${esc(chineseText(e.name))}</span></header><section class="tt-crown-reward"><h3>${icon('reward')}奖励</h3>${e.reward.map(x=>`<p>${effectMarkup(x,ctx.effectText(x))}</p>`).join('')}</section><section class="tt-crown-penalty"><h3>${icon('penalty')}处罚</h3>${e.penalty.map(x=>`<p>${effectMarkup(x,ctx.effectText(x))}</p>`).join('')}</section></article>`).join('')}</div></section>`;
    return '';
  }
  function statusText(){
    if(g.phase==='finished')return '本局已结束，可点击查看计分';
    if(g.prompt?.waiting)return `等待${g.players.find(x=>x.id===g.prompt.playerId)?.name}处理效果`;
    if(!mine())return `等待${g.players.find(x=>x.id===g.activePlayerId)?.name}行动`;
    if(state.checkin)return state.roomId?'已选空房，确认后入住':'点亮起的空房安排入住';
    if(prepareEffect())return `已选${state.rooms.length} / ${prepareEffect().amount??prepareEffect().floors?.length??1}间，按点击顺序处理`;
    if(effect())return ctx.effectText(effect())||'选择钱与皇冠的分配';
    if(g.phase==='setupGuest')return '请先选择一位起始客人';
    return g.turn?.dieTaken?'主动作完成，可上菜、入住或结束回合':g.turn?.guestTaken?'迎客已完成，点骰子选择主动作':'点客人迎接，或直接点骰子选择主动作';
  }
  function footer(){
    if(g.phase==='finished')return button('查看终局计分','scores','','','primary');
    if(g.prompt?.waiting||!mine())return button('查看同桌','players');
    if(state.checkin)return `${button('取消入住','cancel-checkin')}${button(state.bonusFirst?'先房组奖励':'先客人奖励','bonus-order')}${button(state.roomId?`确认入住${state.roomId.replace('-','0')}号房`:'请点空房','confirm-checkin','',!state.roomId,'primary')}`;
    if(prepareEffect())return `${g.phase==='setupRooms'?button('清空选择','clear-rooms'):prepareEffect().kind==='penalty'?'':button('放弃奖励','skip-effect')}${button('确认房间','confirm-rooms','',prepareEffect().kind==='penalty'&&state.rooms.length!==(prepareEffect().amount??prepareEffect().floors?.length)||prepareEffect().kind==='occupy'&&!state.rooms.length,'primary')}`;
    if(effect())return button('继续处理效果','effect','','','primary');
    if(g.phase==='setupGuest')return button('选择起始客人','welcome','','','primary');
    return `${button('迎客','welcome','',!shouldOfferGuest(g,p))}${button('上菜','serve','',!p.cafe.length||!sum(p.kitchen))}${button('跳过','pass','',g.turn?.touched)}${button('结束回合','end','',!g.turn?.dieTaken,'primary')}`;
  }
  function counter(resource,value,minus,plus,prefix='food'){
    return `<div class="tt-counter">${icon(resource)}<strong>${LABEL[resource]||'皇冠'}</strong><div>${button('−',prefix,`data-resource="${resource}" data-delta="-1" aria-label="减少${LABEL[resource]||'皇冠'}"`,!minus)}<output>${value}</output>${button('+',prefix,`data-resource="${resource}" data-delta="1" aria-label="增加${LABEL[resource]||'皇冠'}"`,!plus)}</div></div>`;
  }
  function allocationBody(serve=false){
    const available=serve?p.kitchen:state.counts,selected=p.cafe.find(x=>x.uid===state.guest),n=state.allocations.reduce((a,b)=>a+b.amount,0);
    return `<div class="tt-allocate"><div class="tt-targets">${p.cafe.map(card=>`<button class="tt-target ${card.color}${state.guest===card.uid?' picked':''}" data-ui="allocation-guest" data-id="${esc(card.uid)}"><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card)}</span><strong>${esc(guestName(card))}</strong><small>已选上桌${state.allocations.filter(a=>a.guestId===card.uid).reduce((a,b)=>a+b.amount,0)}件</small></button>`).join('')||'<p>没有客人，本次食饮全部进入厨房。</p>'}</div><p class="tt-inline-hint">${selected?`分配给${esc(guestName(selected))}，点加减选择食物`:'先点击一位客人'}${serve?` · 已选${n} / 3件`:''}</p><div class="tt-counters">${FOODS.filter(r=>available[r]).map(r=>counter(r,countFor(state.guest,r),countFor(state.guest,r)>0,selected&&allocationLimit(p,available,state.allocations,state.guest,r,{limit:serve?3:Infinity})>0,'allocation')).join('')||'<p>暂无可分配食饮</p>'}</div><div class="tt-kitchen-result"><span>${serve?'厨房剩余':'其余放入厨房'}</span>${chips(Object.fromEntries(FOODS.map(r=>[r,(available[r]||0)-state.allocations.filter(a=>a.resource===r).reduce((n,a)=>n+a.amount,0)])))}</div></div>`;
  }
  function effectBody(){
    const e=effect();if(!e)return '<p>当前无需处理效果</p>';
    if(e.kind==='goods'){
      if(state.goodsStep==='allocate')return allocationBody();
      return `<p class="tt-inline-hint">已选${sum(state.counts)} / ${e.amount}件${e.balanced?' · 蛋糕不多于苹果卷，咖啡不多于葡萄酒':''}</p><div class="tt-counters">${(e.pair||FOODS).map(r=>counter(r,state.counts[r]||0,canChangeFood(e,state.counts,r,-1),canChangeFood(e,state.counts,r,1))).join('')}</div><p class="tt-inline-hint">达到总数上限后，加号会立即禁用。</p>`;
    }
    if(e.kind==='moneyEmperor')return `<p class="tt-inline-hint">共${e.amount}格强度，分给皇冠${state.emperor}格，获得${e.amount-state.emperor}克朗。</p><div class="tt-counters">${counter('emperor',state.emperor,state.emperor>0,state.emperor<e.amount,'emperor')}</div>`;
    if(e.kind==='hire')return gallery(e.drawn||p.hand,c=>staffCard(c,true));
    if(e.kind==='attract')return gallery(g.market.map((c,i)=>({...c,index:i})).filter(c=>c.id),card=>guestCard(card,{market:true,index:card.index}));
    if(e.kind==='complete')return gallery(p.cafe.filter(c=>!c.complete&&(!e.color||c.color===e.color)),c=>guestCard(c,{select:true}));
    if(e.kind==='die')return diceChoice(true);
    if(e.kind==='conference')return `<p>可以支付1克朗免罚；也可以执行皇冠处罚。</p><div class="tt-choice-buttons">${button('支付1克朗免罚','conference','data-pay="yes"',p.money<1,state.pay?'chosen':'')}${button('不支付，执行处罚','conference','data-pay="no"',false,!state.pay?'chosen':'')}</div>`;
    if(e.kind==='penalty'&&e.penalty==='discardHand')return `<p class="tt-inline-hint">点员工卡选择需弃置的${e.amount}张，已选${state.cards.length}张。</p>${gallery(p.hand,c=>staffCard(c,true))}`;
    if(e.kind==='penalty'&&e.penalty==='removeEndStaff')return gallery(p.staff.filter(c=>c.end),c=>staffCard(c,true));
    return '<p>请在酒店画面点选亮起的房间。</p>';
  }
  function effectFooter(){
    const e=effect();if(!e)return '';
    const skip=e.kind!=='penalty'?button(e.kind==='conference'?'执行处罚':'放弃奖励','skip-effect'):'';
    if(e.kind==='goods')return state.goodsStep==='choose'?`${skip}${button('下一步：分配给客人','goods-next','',sum(state.counts)===0,'primary')}`:`${!e.counts?button('返回食物选择','goods-back'):skip}${button('确认分配','confirm-effect','','','primary')}`;
    if(e.kind==='attract')return `${skip}${marketFooter()}`;
    let disabled=e.kind==='hire'&&!state.staffId||e.kind==='complete'&&!state.guest||e.kind==='penalty'&&e.penalty==='discardHand'&&state.cards.length!==e.amount||e.kind==='penalty'&&e.penalty==='removeEndStaff'&&!state.staffId;
    return `${e.drawn||e.penalty==='discardHand'?button('调整归还顺序','order'):''}${skip}${button('确认处理','confirm-effect','',disabled,'primary')}`;
  }
  function diceChoice(extra=false){return `<div class="tt-dice-choices">${extra?`<p>选择一次额外骰子动作</p><div class="tt-wildcard">${[1,2,3,4,5,6].filter(n=>g.dice.includes(n)).map(n=>button(`${dieIcon(n)}${n}点`,'die-face',`data-face="${n}"`,false,state.face===n?'chosen':'')).join('')}</div>`:`<p>选择${state.face}点骰 · 动作强度 ×${g.dice.filter(x=>x===state.face).length}</p>`}${state.face===6?`<p>万能骰复制哪种动作？</p><div class="tt-wildcard">${[1,2,3,4,5].map(n=>button(['','甜点','饮料','准备房间','钱与皇冠','雇员工'][n],'wildcard',`data-face="${n}"`,false,state.asFace===n?'chosen':'')).join('')}</div>`:''}${!extra?`<div class="tt-choice-buttons">${button(`${state.boost?'✓ ':''}付1克朗，强度加一`,'boost','',g.turn?.boostUsed||p.money<1,state.boost?'chosen':'')}${button(`${state.before?'✓ ':''}先处理骰面员工效果`,'before','',false,state.before?'chosen':'')}</div>`:''}</div>`;}
  function modal(){
    const kind=state.overlay;if(!kind)return '';
    let title='',body='',foot='';
    if(kind==='welcome'){
      title=g.phase==='setupGuest'?'选择起始客人':'回合开始 · 迎接客人';
      body=`<p class="tt-inline-hint">${g.phase==='setupGuest'?'起始迎客免费，点选后按确认迎接。':p.cafe.length>=3?'咖啡厅已满，可先返回安排入住或直接取骰':'先点选客人，再确认迎接；可以随时改选。'}</p>${gallery(g.market.map((c,i)=>c?({...c,index:i}):null).filter(Boolean),card=>guestCard(card,{market:true,index:card.index}))}`;
      foot=`${g.phase==='setupGuest'?'':button('先不迎客','close')}${marketFooter()}`;
    }else if(kind==='dice'){title='执行骰子主动作';body=diceChoice();foot=button('确认取骰','confirm-die','','','primary');}
    else if(kind==='effect'){title=effect()?.kind==='penalty'?'皇冠处罚':effect()?.kind==='goods'?(state.goodsStep==='choose'?'选择食物':'分配食物'):effect()?.kind==='hire'?'点击选择员工':'处理效果';body=effectBody();foot=effectFooter();}
    else if(kind==='serve'){title='从厨房上菜';body=allocationBody(true);foot=button('确认上菜','confirm-serve','',!state.allocations.length||p.money<(p.staff.some(c=>c.id===24)?0:1),'primary');}
    else if(kind==='guest'){
      const card=p.cafe.find(x=>x.uid===state.detailId);if(!card)return '';
      title=guestName(card);body=`<div class="tt-guest-detail">${guestCard(card)}</div>`;
      foot=extra()?`${button('从厨房上菜','serve','',!sum(p.kitchen))}${button('安排入住','start-checkin',`data-id="${esc(card.uid)}"`,!canCheckin(card),'primary')}`:'';
    }else if(kind==='staff-detail'){
      const card=[...p.hand,...p.staff].find(x=>x.id===state.detailId);if(!card)return '';
      title=card.name;body=`<div class="tt-guest-detail">${staffCard(card)}</div>`;foot=p.staff.some(x=>x.id===card.id)&&card.timing==='round'?button('使用这位员工','activate',`data-id="${card.id}"`,!extra()||card.usedRound===g.round,'primary'):'';
    }else if(kind==='room'){
      const r=p.rooms.find(x=>x.id===state.detailId);title=`${r.floor}0${r.col}号房`;
      const group=p.rooms.filter(x=>x.group===r.group),n=group.length,amount=(r.color==='blue'?[2,5,9,15]:[1,3,6,10])[n-1],reward=icon(r.color==='blue'?'vp':r.color==='red'?'coin':'emperor');
      body=`<div class="tt-room-detail"><h3>${LABEL[r.color]}色 · ${{closed:'未准备',prepared:'空房',occupied:'已入住'}[r.state]}</h3><div class="tt-room-detail-facts"><span>${icon('coin')}准备 ${r.floor-1}克朗</span><span>${icon('vp')}准备得 ${r.vp||0}分</span></div><p>第${r.group}房组 · 已入住 ${group.filter(x=>x.state==='occupied').length} / ${n}</p><p class="tt-room-group-reward">全组住满奖励 ${reward}<b>${amount}</b>${r.color==='blue'?'分':r.color==='red'?'克朗':'格'}</p></div>`;
      foot=r.state==='prepared'?button('去选择已完成订单的客人','cafe','','','primary'):'';
    }else if(kind==='room-bonuses'){
      title='房组奖励';body=`<section class="tt-bonus-guide"><p>同一房组全部入住后，领取一次对应颜色的奖励。</p><table><thead><tr><th scope="col">房间数</th><th scope="col" class="blue">蓝房组${icon('vp')}</th><th scope="col" class="red">红房组${icon('coin')}</th><th scope="col" class="yellow">黄房组${icon('emperor')}</th></tr></thead><tbody>${[1,2,3,4].map((n,i)=>`<tr><th scope="row">${n}间</th><td>${[2,5,9,15][i]}分</td><td>${[1,3,6,10][i]}克朗</td><td>${[1,3,6,10][i]}格</td></tr>`).join('')}</tbody></table><p class="tt-bonus-note">房间右上角为准备费用，星号为准备房间时获得的分数。</p></section>`;
    }else if(kind==='settings'){

      title='饭店设置';body=`<div class="tt-settings">${ctx.preview?ctx.previewToolbar():`<p>房间码：${esc(ctx.room.code)}</p>${button('复制好友链接','copy')}`}${button('查看同桌酒店','players')}${button('查看最近日志','log')}${button('查看规则说明','legend')}${button(ctx.preview?'退出单人画面测试':'返回大厅','exit')}</div>`;
    }else if(kind==='legend'){
      title='操作与规则';body=`<div class="tt-rules"><p>点击骰子执行主动作，强度等于同面骰的枚数。万能骰付1克朗复制其他动作。</p><p>回合开始可迎接一位客人；先点客人画像，订单完成后再点同色空房入住。绿色客人可入住任意颜色。</p><p>第3、5、7轮皇冠评分：先按当前位置得分，再退3、5、7格。退后至少3格得奖，1至2格无事，0格受罚。</p><p>同一房组全部入住领取一次奖励。蓝色1至4间给2、5、9、15分；红黄给1、3、6、10克朗或皇冠格数。</p></div>`;
    }else if(kind==='players'){
      title='同桌的友人';body=gallery(g.players,x=>`<article class="tt-player"><strong>${esc(x.name)}${x.id===p.id?' · 你':''}</strong><p>${x.vp}分 · ${x.money}克朗 · 皇冠${x.emperor}格</p><p>员工手牌${x.handCount}张 · 已雇${x.staff.length}位</p>${button('查看公开酒店','other-hotel',`data-id="${esc(x.id)}"`)}</article>`);
    }else if(kind==='other-hotel'){
      const other=g.players.find(x=>x.id===state.other);title=`${other.name}的公开酒店`;body=hotel(other,false);foot=button('查看其客人与员工','other-cards');
    }else if(kind==='other-cards'){
      const other=g.players.find(x=>x.id===state.other);title=`${other.name}的公开卡牌`;body=`<div class="tt-other-cards">${hiddenHandMarkup(other.handCount)}<section class="tt-other-public" aria-label="公开客人与已雇员工">${gallery([...other.cafe,...other.staff],card=>card.color?guestCard(card):staffCard(card))}</section></div>`;
    }else if(kind==='log'){
      title='饭店日志';const logs=g.log.slice(-24).reverse();body=gallery(logs,entry=>`<article class="tt-log"><span>第${entry.round}轮</span><p>${esc(chineseText(entry.text))}</p></article>`);
    }else if(kind==='scores'){
      title='终局计分';body=gallery([...g.players].sort((a,b)=>b.score.total-a.score.total),x=>`<article class="tt-score"><strong>${esc(x.name)} · ${x.score.total}分</strong>${[['过程分','duringGame'],['员工','staff'],['房间','rooms'],['厨房','goods'],['克朗','cash'],['咖啡厅','cafe']].map(([name,k])=>`<p><span>${name}</span><b>${x.score[k]}</b></p>`).join('')}</article>`);
    }else if(kind==='order'){
      title='调整放回牌库底的顺序';const e=effect(),cards=e?.drawn||p.hand,ids=(e?.penalty==='discardHand'?state.cards:state.returnOrder.filter(id=>id!==state.staffId));
      body=gallery(ids,id=>`<article class="tt-order"><strong>${esc(cards.find(c=>c.id===id)?.name)}</strong><p>当前第${ids.indexOf(id)+1}张，越前越先放回。</p>${button('向前移','order-move',`data-id="${id}" data-step="-1"`,ids.indexOf(id)===0)}${button('向后移','order-move',`data-id="${id}" data-step="1"`,ids.indexOf(id)===ids.length-1)}</article>`);foot=button('完成排序','effect','','','primary');
    }
    return `<div class="tt-modal-mask"><section class="tt-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2>${button('关闭','close','aria-label="关闭弹窗"')}</header><div class="tt-modal-body">${body}</div><footer class="tt-modal-actions">${foot}</footer></section></div>`;
  }
  function draw(){
    if(!g||root.className!=='view-game')return;
    for(const rail of root.querySelectorAll('[data-rail]'))railOffsets.set(rail.dataset.rail,rail.scrollLeft);
    document.body.classList.add('is-tabletop');
    root.innerHTML=`<section class="tabletop"><header class="tt-topbar"><h1>奥地利大饭店</h1><span>第${g.round} / 7轮${ctx.preview?' · 单人测试':''}</span>${button('设置','settings')}</header>${playerScoreboard(g,p)}<div class="tt-dice">${[1,2,3,4,5,6].map(n=>button(`${dieIcon(n)}<span class="tt-dice-summary"><span class="tt-dice-label">${['','甜点','饮料','房间','钱/<wbr>皇冠','员工','万能'][n]}</span><b class="tt-dice-multiplier">×${g.dice.filter(x=>x===n).length}</b></span>`,'pick-die',`data-face="${n}" aria-label="选择${n}点骰"`,!mine()||!!g.prompt||g.phase!=='turn'||g.turn?.dieTaken||!g.dice.includes(n))).join('')}</div><div class="tt-workspace"><section class="tt-stage" aria-label="当前游戏区域">${stage()}</section><aside class="tt-command-rail" aria-label="厨房与回合操作"><section class="tt-kitchen"><h2>厨房</h2><div class="tt-kitchen-stock">${FOODS.map(r=>`<span class="food-token food-${r}" aria-label="${LABEL[r]}${p.kitchen[r]||0}">${icon(r)}<span>${LABEL[r]}</span><b>${p.kitchen[r]||0}</b></span>`).join('')}</div></section><div class="tt-dock"><p role="status">${esc(statusText())}</p><div>${footer()}</div></div></aside></div><nav class="tt-nav" aria-label="游戏区域">${[['hotel','酒店'],['cafe','咖啡厅'],['staff','员工'],['imperial','皇冠'],['objectives','目标']].map(([key,name])=>button(name,'view',`data-view="${key}"`,false,state.view===key?'chosen':'')).join('')}</nav></section>${modal()}`;
    for(const rail of root.querySelectorAll('[data-rail]'))rail.scrollLeft=railOffsets.get(rail.dataset.rail)||0;
    if(state.overlay!==lastOverlay){lastOverlay=state.overlay;if(state.overlay)root.querySelector('.tt-modal button:not(:disabled)')?.focus({preventScroll:true});}
  }
  function update(next,player,context){
    g=next;p=player;ctx=context;
    const key=turnIdentity(g,ctx.room.code,p.id),e=effect(),pk=e?.uid||'';
    if(key!==turnKey){turnKey=key;state.checkin=null;state.rooms=[];state.roomId=null;state.marketDraft=null;state.overlay=null;}
    if(pk!==promptKey){promptKey=pk;state.marketDraft=null;state.rooms=[];state.staffId=null;state.guest=null;state.cards=[];state.allocations=[];state.counts={...empty(),...e?.counts};state.emperor=0;state.face=g.dice.find(n=>n<6)||6;state.returnOrder=e?.drawn?.map(x=>x.id)||[];state.goodsStep=e?.counts?'allocate':'choose';state.pay=p.money>=1;
      if(e){state.overlay=roomEffect(e)?null:'effect';if(roomEffect(e))state.view='hotel';}else if(['effect','order'].includes(state.overlay))state.overlay=null;
    }
    if(g.phase==='setupRooms'&&mine())state.view='hotel';
    if(state.checkin&&!p.cafe.some(c=>c.uid===state.checkin)){state.checkin=null;state.roomId=null;}
    if(state.overlay==='welcome'&&!shouldOfferGuest(g,p))state.overlay=null;
    if(state.marketDraft&&g.market[state.marketDraft.index]?.id!==state.marketDraft.guestId)state.marketDraft=null;
    if(state.overlay==='dice'&&g.turn?.dieTaken&&!e)state.overlay=null;
    if(shouldOfferGuest(g,p)&&!state.seen.has(key)){state.seen.add(key);state.overlay='welcome';}
    if(g.phase==='finished'&&key!==state.finishedKey){state.finishedKey=key;state.overlay='scores';}
    draw();
  }
  async function send(a){if(pending)return;pending=true;try{await onAction(a);}finally{pending=false;draw();}}
  function resolveAction(extra={}){return {type:'resolve',promptId:effect().uid,...extra};}
  function adjustAllocation(resource,delta){
    const serve=state.overlay==='serve',available=serve?p.kitchen:state.counts;
    if(delta>0&&allocationLimit(p,available,state.allocations,state.guest,resource,{limit:serve?3:Infinity})<1)return;
    let item=state.allocations.find(a=>a.guestId===state.guest&&a.resource===resource);
    if(delta<0&&!item)return;if(!item){item={guestId:state.guest,resource,amount:0};state.allocations.push(item);}
    item.amount=Math.max(0,item.amount+delta);state.allocations=state.allocations.filter(a=>a.amount>0);
  }
  root.addEventListener('click',async event=>{
    const b=event.target.closest('button[data-ui]');if(!b||b.disabled||!g)return;
    const d=b.dataset,e=effect();onFlash('');
    switch(d.ui){
      case 'view':state.view=d.view;break;
      case 'settings':case 'welcome':case 'effect':case 'players':case 'log':case 'legend':case 'scores':case 'order':case 'room-bonuses':open(d.ui);return;
      case 'close':if(state.overlay==='welcome'||e?.kind==='attract')state.marketDraft=null;state.overlay=null;break;
      case 'exit':await onExit();return;
      case 'copy':ctx.copyRoom();return;
      case 'staff-tab':state.staff=d.value;break;
      case 'market-card':state.marketDraft=draftGuest(g,Number(d.index));break;
      case 'market-preview':state.marketDraft=draftGuest(g,Number(d.index));state.overlay=e?.kind==='attract'?'effect':'welcome';break;
      case 'confirm-market':{const selection=guestSelection(g,p,state.marketDraft);if(!selection.valid){onFlash(selection.reason);break;}await send(e?.kind==='attract'?resolveAction({index:selection.index}):{type:g.phase==='setupGuest'?'setupGuest':'attract',index:selection.index});return;}
      case 'pick-die':state.face=Number(d.face);state.boost=false;state.before=false;open('dice');return;
      case 'die-face':state.face=Number(d.face);break;
      case 'wildcard':state.asFace=Number(d.face);break;
      case 'boost':state.boost=!state.boost;break;
      case 'before':state.before=!state.before;break;
      case 'confirm-die':await send({type:'die',face:state.face,asFace:state.asFace,boost:state.boost,staffBefore:state.before});return;
      case 'food':state.counts=changeFood(e,state.counts,d.resource,Number(d.delta));state.allocations=[];break;
      case 'goods-next':state.goodsStep='allocate';state.guest=p.cafe[0]?.uid;break;
      case 'goods-back':state.goodsStep='choose';break;
      case 'allocation-guest':state.guest=d.id;break;
      case 'allocation':adjustAllocation(d.resource,Number(d.delta));break;
      case 'emperor':state.emperor=Math.max(0,Math.min(e.amount,state.emperor+Number(d.delta)));break;
      case 'conference':state.pay=d.pay==='yes';break;
      case 'serve':state.guest=state.detailId&&p.cafe.some(c=>c.uid===state.detailId)?state.detailId:p.cafe[0]?.uid;state.allocations=[];open('serve');return;
      case 'confirm-serve':await send({type:'serve',allocations:state.allocations});state.overlay=null;break;
      case 'guest-card':
        if(state.overlay==='other-cards')break;
        if(e?.kind==='complete'){state.guest=d.id;break;}
        if(canCheckin(p.cafe.find(c=>c.uid===d.id))){state.checkin=d.id;state.roomId=null;state.overlay=null;state.view='hotel';break;}
        state.detailId=d.id;open('guest');return;
      case 'start-checkin':state.checkin=d.id;state.roomId=null;state.overlay=null;state.view='hotel';break;
      case 'cancel-checkin':state.checkin=null;state.roomId=null;break;
      case 'bonus-order':state.bonusFirst=!state.bonusFirst;break;
      case 'clear-rooms':state.rooms=[];break;
      case 'cafe':state.overlay=null;state.view='cafe';break;
      case 'room':{
        if(state.overlay==='other-hotel')break;
        if(prepareEffect()){const i=state.rooms.indexOf(d.id);if(i>=0)state.rooms=state.rooms.slice(0,i);else if(selectableRooms(p,prepareEffect(),state.rooms).includes(d.id))state.rooms.push(d.id);}
        else if(state.checkin)state.roomId=d.id;
        else{state.detailId=d.id;open('room');return;}break;
      }
      case 'confirm-rooms':await send(g.phase==='setupRooms'?{type:'setupRooms',rooms:state.rooms}:resolveAction(e.kind==='occupy'?{roomId:state.rooms[0]}:{rooms:state.rooms}));return;
      case 'confirm-checkin':await send({type:'checkin',guestId:state.checkin,roomId:state.roomId,bonusFirst:state.bonusFirst});return;
      case 'staff-card':{
        if(state.overlay==='other-cards')break;
        const id=Number(d.id);
        if(e?.penalty==='discardHand'){const index=state.cards.indexOf(id);if(index>=0)state.cards.splice(index,1);else if(state.cards.length<e.amount)state.cards.push(id);}
        else if(e?.kind==='hire'||e?.penalty==='removeEndStaff')state.staffId=state.staffId===id?null:id;
        else{state.detailId=id;open('staff-detail');return;}break;
      }
      case 'activate':await send({type:'activate',staffId:Number(d.id)});if(!effect())state.overlay=null;break;
      case 'objective':await send({type:'claim',objectiveId:Number(d.id)});return;
      case 'end':await send({type:'endTurn'});return;
      case 'pass':await send({type:'pass'});return;
      case 'skip-effect':await send(resolveAction({skip:true,...e?.drawn?{returnOrder:state.returnOrder}:{}}));return;
      case 'order-move':{
        const list=e.penalty==='discardHand'?state.cards:state.returnOrder,id=Number(d.id),at=list.indexOf(id),other=at+Number(d.step);if(other>=0&&other<list.length)[list[at],list[other]]=[list[other],list[at]];break;
      }
      case 'other-hotel':state.other=d.id;open('other-hotel');return;
      case 'other-cards':open('other-cards');return;
      case 'confirm-effect':{
        const a=resolveAction();
        if(e.kind==='goods'){a.counts=state.counts;a.allocations=state.allocations;}
        if(e.kind==='moneyEmperor')a.emperor=state.emperor;
        if(e.kind==='hire'||e.penalty==='removeEndStaff')a.staffId=state.staffId;
        if(e.drawn)a.returnOrder=state.returnOrder;
        if(e.kind==='complete')a.guestId=state.guest;
        if(e.kind==='die'){a.face=state.face;a.asFace=state.asFace;}
        if(e.kind==='conference')a.pay=state.pay;
        if(e.penalty==='discardHand'){a.cards=state.cards;a.returnOrder=state.cards;}
        await send(a);return;
      }
    }
    draw();
  });
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state.overlay){if(state.overlay==='welcome'||effect()?.kind==='attract')state.marketDraft=null;state.overlay=null;draw();return;}
    if(event.key==='Tab'&&state.overlay){const focus=[...root.querySelectorAll('.tt-modal button:not(:disabled),.tt-modal input,.tt-modal select')];if(!focus.length)return;const at=focus.indexOf(document.activeElement);if(event.shiftKey&&at===0){event.preventDefault();focus.at(-1).focus();}else if(!event.shiftKey&&at===focus.length-1){event.preventDefault();focus[0].focus();}}
  });
  let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(draw);});
  return {update,reset};
}
