import {createActionPlayer,ACTIVITY_TEXT} from './action-player.mjs';
import {icon,dieIcon} from './visuals.mjs';
import {guestName,chineseText} from './chinese.mjs';
import {FOODS,changeFood,canChangeFood,allocationLimit,selectableRooms,turnIdentity,shouldOfferGuest,draftGuest,guestSelection,missingFoods,servingResources,turnEndIntent,dicePlan,diceMainEffect,roomPreparationCost} from './interaction-rules.mjs';
import {guestPortraitClass,staffPortraitClass,guestPortraitArt,staffPortraitArt,foodTokens,playerScoreboard,imperialTrackMarkup,roundTimelineMarkup,objectiveCardMarkup,effectMarkup,resourceTextMarkup,guestRewardMarkup,roomRegion,hiddenHandMarkup} from './card-art.mjs';
const LABEL={strudel:'苹果卷',cake:'蛋糕',wine:'葡萄酒',coffee:'咖啡',coin:'克朗',emperor:'皇冠',red:'红',blue:'蓝',yellow:'黄',green:'绿'};
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sum=counts=>FOODS.reduce((n,r)=>n+(counts[r]||0),0);
const empty=()=>Object.fromEntries(FOODS.map(r=>[r,0]));
const off=b=>b?' disabled':'';
const roomEffect=e=>e&&(e.kind==='prepare'||e.kind==='occupy'||e.kind==='penalty'&&['removePrepared','removeOccupied'].includes(e.penalty));
export function createTabletop(root,{onAction,onExit,onFlash,onLayout=()=>{},onActivity=()=>{}}){
  let g,p,ctx,turnKey='',promptKey='',pending=false,lastOverlay,clockOffset=0;
  let state=fresh(),live=null;
  const actionPlayer=createActionPlayer({onFrame:()=>paintActivity(),onIdle:playbackEnded});
  const opponent=id=>g.solo?.opponents?.find(x=>x.playerId===id)||g.solo;
  function activityMarkup(){
    const frame=actionPlayer.frame,who=g.players.find(x=>x.id===(frame?.playerId||g.activePlayerId)),recent=[...(g.activity?.events||[])].reverse().find(e=>e.playerId!==p.id),busy=live&&live.playerId===who?.id&&live.expiresAt>Date.now()+clockOffset;
    const title=frame?`${who?.name||'同桌'} · 行动回放`:g.phase==='finished'?'本局已结束':who?.id===p.id?'轮到你行动':`${who?.name||'同桌'} · ${busy?ACTIVITY_TEXT[live.kind]||'等待操作':'等待操作'}`;
    const message=frame?frame.text:recent?.text||'同桌提交动作后，会在这里展示行动过程。',kind=frame?.kind;
    return `<span class="tt-activity-icon${frame?' playing':busy?' busy':''}" aria-hidden="true">${kind==='die'?dieIcon(frame.face):icon(({room:'door',staff:'cards',food:'strudel',guest:'invite',emperor:'emperor',objective:'vp',instruction:'cards',money:'coin',vp:'vp'})[kind]||'bell')}</span><span class="tt-activity-copy"><strong>${esc(title)}</strong><span>${esc(chineseText(message))}</span></span><span class="tt-activity-buttons">${frame?button('结束回放','activity-stop'):recent?button('回放','activity-replay'):''}${frame?button('看饭店','other-hotel',`data-id="${esc(frame.playerId)}"`):button('动态','activity-log')}</span>`;
  }
  function paintActivity(){
    if(!g||root.className!=='view-game')return;
    const bar=root.querySelector('.tt-activity');if(!bar)return;
    const markup=activityMarkup();if(bar.innerHTML!==markup)bar.innerHTML=markup;
    const frame=actionPlayer.frame,actorId=frame?.playerId||(live&&live.expiresAt>Date.now()+clockOffset?live.playerId:null);
    for(const el of root.querySelectorAll('.tt-player-stats'))el.classList.toggle('is-acting',el.dataset.id===actorId);
    for(const el of root.querySelectorAll('[data-ui="pick-die"]'))el.classList.toggle('receipt-pulse',frame?.kind==='die'&&Number(el.dataset.face)===frame.face);
    for(const el of root.querySelectorAll('.tt-modal [data-ui="room"]'))el.classList.toggle('receipt-pulse',state.overlay==='other-hotel'&&state.other===frame?.playerId&&el.dataset.id===frame?.roomId);
  }
  function playbackEnded(){
    if(!g||!ctx||root.className!=='view-game')return;
    if(!state.overlay&&state.deferredEffect&&state.deferredEffect===effect()?.uid){state.deferredEffect=null;state.overlay='effect';draw();return;}
    if(!state.overlay&&g.phase==='finished'&&turnKey!==state.finishedKey){state.finishedKey=turnKey;state.overlay='scores';draw();return;}
    if(!state.overlay&&shouldOfferGuest(g,p)&&!state.seen.has(turnKey)){state.seen.add(turnKey);state.overlay='welcome';draw();return;}
    paintActivity();
  }
  function reportActivity(){
    if(!mine()||ctx.preview||g.phase==='finished'){onActivity('idle');return;}
    let kind='turn',e=effect();
    if(e)kind=['staffDraft','soloDraft','hire'].includes(e.kind)?'staff':e.kind==='goods'?'food':roomEffect(e)?'rooms':e.kind==='attract'?'guest':'dice';
    else if(state.overlay==='dice')kind=state.dieStage==='allocate'?'food':'dice';
    else if(state.overlay==='serve'||state.serviceGuest)kind='food';
    else if(state.checkin||g.phase==='setupRooms')kind='rooms';
    else if(state.overlay==='welcome'||g.phase==='setupGuest')kind='guest';
    onActivity(kind);
  }
  const railOffsets=new Map();
  const verticalOffsets=new Map();
  function fresh(){return {view:'hotel',overlay:null,staff:'hand',seen:new Set(),counts:empty(),allocations:[],guest:null,serviceGuest:null,serviceCounts:empty(),marketDraft:null,rooms:[],staffId:null,cards:[],returnOrder:[],face:1,asFace:1,boost:false,before:false,emperor:0,goodsStep:'choose',bonusFirst:false,pay:true,other:null};}
  function reset(){actionPlayer.reset();live=null;state=fresh();turnKey='';promptKey='';railOffsets.clear();verticalOffsets.clear();}
  function resetDiceDraft(){state.dieCounts=empty();state.dieAllocations=[];state.dieGuest=p?.cafe.find(c=>!c.complete)?.uid||p?.cafe[0]?.uid;state.dieRooms=[];state.dieEmperor=0;state.dieStaffId=null;state.dieSkipStaff=false;state.dieStage='choose';}
  const isExtraDice=()=>effect()?.kind==='die';
  const mainEffect=()=>diceMainEffect(g,p,state,{extra:isExtraDice()});
  function normalizeDiceDraft(){
    const e=mainEffect();
    if(e.kind==='goods'){
      let counts=empty();for(const r of e.pair)for(let i=0;i<(state.dieCounts?.[r]||0);i++){if(!canChangeFood(e,counts,r,1))break;counts=changeFood(e,counts,r,1);}
      state.dieCounts=counts;state.dieAllocations=[];
    }
    state.dieRooms=[];state.dieEmperor=Math.min(state.dieEmperor||0,e.amount||0);
  }
  function diceChoicePayload(){
    const e=mainEffect();
    if(e.kind==='goods')return {counts:state.dieCounts,allocations:state.dieAllocations};
    if(e.kind==='prepare')return {rooms:state.dieRooms};
    if(e.kind==='moneyEmperor')return {emperor:state.dieEmperor};
    if(e.kind==='hire')return state.dieSkipStaff?{skip:true}:{staffId:state.dieStaffId};
    return {};
  }
  function validDiceDraft(){
    if(!dicePlan(g,p,state,{extra:isExtraDice()}).valid)return false;
    const e=mainEffect();
    if(e.kind==='goods')return sum(state.dieCounts||{})>0;
    if(e.kind==='hire')return state.dieSkipStaff||p.hand.some(c=>c.id===state.dieStaffId&&Math.max(0,c.cost-e.discount)<=p.money-dicePlan(g,p,state,{extra:isExtraDice()}).cost);
    return true;
  }
  function dicePayment(){const e=mainEffect();return dicePlan(g,p,state,{extra:isExtraDice()}).cost+(e.kind==='hire'&&!state.dieSkipStaff?Math.max(0,(p.hand.find(c=>c.id===state.dieStaffId)?.cost||0)-e.discount):e.kind==='prepare'?state.dieRooms.reduce((n,id)=>n+roomPreparationCost(p,p.rooms.find(r=>r.id===id),e),0):0);}
  const mine=()=>g.activePlayerId===p.id;
  const extra=()=>mine()&&!g.prompt&&!g.tableControls?.pending&&g.phase==='turn';
  const effect=()=>g.prompt&&!g.prompt.waiting?g.prompt:null;
  const prepareEffect=()=>g.phase==='setupRooms'&&mine()?{kind:'prepare',amount:3}:roomEffect(effect())?effect():null;
  const guestFee=i=>g.phase==='setupGuest'||effect()?.kind==='attract'||p.staff.some(c=>c.mechanics?.guestQueueCost===0)?0:[3,2,1,0,0][i];
  const countFor=(uid,r)=>state.allocations.find(a=>a.guestId===uid&&a.resource===r)?.amount||0;
  const canCheckin=c=>Boolean(c&&extra()&&c.complete&&selectableRooms(p,{kind:'occupy'},[],c).length>0);
  function button(label,action,data='',disabled=false,klass=''){return `<button type="button" class="${klass}" data-ui="${action}" ${data}${off(disabled)}>${label}</button>`;}
  function open(kind){if(kind==='welcome'&&state.overlay!=='welcome')state.marketDraft=null;if(kind==='clock')state.clockDraft={...g.tableControls?.clock};state.serviceGuest=null;state.serviceCounts=empty();state.overlay=kind;draw();}
  const clockLeft=()=>{const c=g?.tableControls?.clock;return c?.status==='running'?Math.max(0,c.deadline-(Date.now()+clockOffset)):c?.remainingMs||0;};
  const clockText=()=>{const n=Math.ceil(clockLeft()/1000);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
  function clockBadge(){const c=g.tableControls?.clock;return c?.enabled&&g.phase==='turn'?`<span class="tt-clock-wrap"><button type="button" data-ui="clock" class="tt-clock-badge theme-${c.theme}" aria-label="设置回合倒计时"><span data-clock-text>${clockText()}</span><small data-clock-state>${c.status==='paused'?'暂停':''}</small></button>${button(c.status==='running'?'Ⅱ':'▶',c.status==='running'?'clock-pause':'clock-resume',`aria-label="${c.status==='running'?'暂停计时':'继续计时'}"`,!g.tableControls.canControlClock||!!g.tableControls.pending,'tt-clock-toggle')}</span>`:'';}
  function tableTools(){const t=g.tableControls;return t?`<div class="tt-table-tools">${button('倒计时设置','clock')}${button('申请重置本轮全部骰子','request-reroll','',!t.canReroll)}<small>仅限本轮第一位玩家开始行动前。${g.solo?'单人模式直接执行。':'须其余玩家全部同意。'}</small>${button(t.canUndo?`申请反悔：${esc(t.undoLabel)}`:'申请撤销上一步','request-undo','',!t.canUndo)}<small>${g.solo?'撤销自己的最近一步（包括随后的自动对手行动）。':'撤销自己最近一步；之后尚无人操作，且其余玩家全部同意。'}</small>${t.pending?button('查看桌上协商','consent'):''}</div>`:'';}
  function clockPanel(){
    const t=g.tableControls,c=state.clockDraft||t.clock,locked=!t.canConfigure;
    return `<form data-table-clock class="tt-clock-form"><label class="check-label"><input type="checkbox" name="enabled"${c.enabled?' checked':''}${off(locked)}>启用回合倒计时</label><label>每回合时长（秒）<input type="number" name="durationSeconds" min="5" max="3600" value="${c.durationSeconds}" required${off(locked)}></label><label>最后多少秒提醒<input type="number" name="warningSeconds" min="0" max="3600" value="${c.warningSeconds}" required${off(locked)}></label><label>超时处理<select name="autoSkip"${off(locked)}><option value="false"${!c.autoSkip?' selected':''}>仅提醒</option><option value="true"${c.autoSkip?' selected':''}>自动结束当前回合</option></select></label><label>显示颜色<select name="theme"${off(locked)}>${[['sand','暖金'],['mint','薄荷绿'],['rose','玫瑰红']].map(([v,n])=>`<option value="${v}"${c.theme===v?' selected':''}>${n}</option>`).join('')}</select></label><label class="check-label"><input name="autoStart" type="checkbox"${c.autoStart?' checked':''}${off(locked)}>新回合自动开始</label><p>${locked?'房主可修改设置；当前行动玩家和房主可暂停或继续。':'保存会按新时长重新计时。'}有待处理的奖励或处罚时，自动结束会等待选择完成。</p><button type="submit" class="primary"${off(locked||!!t.pending)}>保存倒计时设置</button></form>`;
  }
  const chips=foodTokens;
  function marketFooter(){const selection=guestSelection(g,p,state.marketDraft);return `<span class="tt-market-summary">${selection.valid?`已选${esc(guestName(selection.card))} · ${selection.cost}克朗`:esc(selection.reason)}</span>${button(selection.valid?`确认迎接${esc(guestName(selection.card))}`:'确认迎接','confirm-market','',!selection.valid,'primary')}`;}
  function guestCard(card,{market=false,index=0,select=false,alloc=false,publicView=false}={}){
    const selected=market?state.marketDraft?.index===index&&state.marketDraft?.guestId===card.id:state.guest===card.uid||state.serviceGuest===card.uid||state.checkin===card.uid;
    const served={...card.served};if(alloc)for(const r of FOODS)served[r]=(served[r]||0)+countFor(card.uid,r);
    const unavailable=market&&(p.cafe.length>=3||p.money<guestFee(index));
    const label=market?`选择客人${guestName(card)}`:select?`选择${guestName(card)}`:`选择客人${guestName(card)}`;
    const price=market?`<span class="tt-guest-price tt-fee-plaque${unavailable?' unavailable':''}" aria-label="迎客费用${guestFee(index)}克朗" title="迎客费用（克朗）">${icon('coin')}<b>${guestFee(index)}</b></span>`:'';
    const rewards=card.effects.length?card.effects.map(e=>`<span class="tt-effect-line">${guestRewardMarkup(e,ctx.effectText(e))}</span>`).join(''):'<span class="tt-effect-line">无额外奖励</span>';
    return `<button type="button" class="tt-guest ${card.color}${market?' tt-guest-market':' tt-guest-contain'}${selected?' picked':''}${!market&&card.complete?' order-complete':''}" data-ui="${market?'market-card':'guest-card'}" data-id="${esc(card.uid||'')}" data-index="${index}" aria-label="${esc(label)}"${market?` aria-pressed="${selected}"`:''}><span class="tt-guest-meta"><span class="tt-guest-kind">${LABEL[card.color]} · ${card.color==='green'?'旅人':'贵宾'}</span><span class="guest-vp" aria-label="${card.vp}分">${icon('vp')}<b>${card.vp}</b></span></span><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card,{fit:market||publicView?'slice':'meet'})}${!market&&card.complete?'<span class="tt-order-check" aria-label="订单已完成">✓</span>':''}</span><span class="tt-guest-info"><strong>${esc(guestName(card))}<small>客人${card.id}</small></strong>${chips(served,card.needs)}<span class="tt-reward tt-effects">${rewards}</span>${!market&&!publicView?`<span class="tt-status">${card.complete?'需求已满足 · 可安排入住':'点击客人查看卡片'}</span>`:''}</span>${price}${selected?'<span class="tt-guest-selection" aria-hidden="true">✓</span>':''}</button>`;
  }
  function staffCard(card,select=false,{publicView=false}={}){
    const planning=!publicView&&(state.overlay==='dice'||state.overlay==='effect'&&isExtraDice());
    const selected=planning?state.dieStaffId===card.id:state.staffId===card.id||state.cards.includes(card.id);
    const e=planning?mainEffect():effect(),fee=e?.kind==='hire'?(e.free?0:Math.max(0,card.cost-(e.discount||0))):card.cost;
    const price=`<span class="tt-staff-price">${icon('money')}${fee}</span>`;
    return `<button type="button" class="tt-staff${selected?' picked':''}" data-ui="staff-card" data-id="${card.id}" aria-label="${select?'选择':'查看'}员工${esc(card.name)}">${publicView?`<span class="tt-public-staff-meta"><span>已雇员工</span>${price}</span>`:''}<span class="tt-staff-portrait ${staffPortraitClass(card)}">${staffPortraitArt(card)}${publicView?'':price}</span><span class="tt-staff-info"><span class="tt-staff-top">员工${card.id} · ${{end:'终局计分',immediate:'立即生效',permanent:'持续生效',round:'每轮一次'}[card.timing]}</span><strong>${esc(card.name)}</strong><span class="tt-reward">${card.effects?.length?card.effects.map(e=>`<span class="tt-effect-line">${effectMarkup(e,ctx.effectText(e))}</span>`).join(''):resourceTextMarkup(ctx.staffText(card))}</span>${selected?'<span class="tt-status">✓ 已选择</span>':''}</span></button>`;
  }
  function gallery(cards,render,emptyText='暂无内容'){
    if(!cards.length)return `<div class="tt-empty">${emptyText}</div>`;
    const content=cards.map(render).join(''),staff=content.includes('class="tt-staff'),rail=!staff&&cards.length>5;
    // Opening a dialog must not change the identity of the background card list.
    const railKey=cards.map(c=>typeof c==='object'?c.uid||c.id||'entry':c).join(',');
    if(staff)return `<div class="tt-staff-grid" data-scroll-key="${esc('staff:'+railKey)}" tabindex="0" aria-label="员工卡，每行两张">${content}</div>`;
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
      return `<button type="button" class="tt-cafe-brief ${card.color}${card.complete?' ready':''}${state.checkin===card.uid||state.serviceGuest===card.uid?' picked':''}" data-ui="guest-card" data-id="${esc(card.uid)}" aria-label="选择客人${esc(guestName(card))}"><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card)}</span><span class="tt-cafe-brief-copy"><span class="tt-cafe-brief-title"><strong>${esc(guestName(card))}</strong><span aria-label="${card.vp}分">${icon('vp')}<b>${card.vp}</b></span></span>${chips(card.served||{},card.needs)}<span class="tt-cafe-brief-effects">${rewards}</span><small>${card.complete?'✓ 可入住':'待上菜'}</small></span>${state.checkin===card.uid||state.serviceGuest===card.uid?'<span class="tt-guest-selection" aria-hidden="true">✓</span>':''}</button>`;
    }).join('')}</div></section>`;
  }

  function cafeSlots(){return `<div class="tt-gallery tt-cafe-slots cols-3" aria-label="咖啡厅三个客人席位">${Array.from({length:3},(_,index)=>p.cafe[index]?guestCard(p.cafe[index]):`<article class="tt-cafe-empty" aria-label="咖啡厅第${index+1}席，空位"><span class="tt-cafe-seat">第${index+1}席</span><span class="tt-cafe-empty-art" aria-hidden="true">${icon('coffee')}</span><span class="tt-cafe-empty-copy"><strong>空位</strong><small>等待迎接客人</small></span></article>`).join('')}</div>`;}
  const serviceCard=()=>p.cafe.find(card=>card.uid===state.serviceGuest);
  const serviceAllocations=()=>FOODS.filter(r=>state.serviceCounts[r]>0).map(resource=>({guestId:state.serviceGuest,resource,amount:state.serviceCounts[resource]}));
  function inlineServing(){
    const card=serviceCard();if(!card)return '';
    return `<section class="tt-inline-serving" aria-label="为${esc(guestName(card))}上菜"><strong>${esc(guestName(card))}</strong>${card.complete?'<p>订单已满足，需准备合适空房后入住。</p>':servingResources(p,card.uid,serviceAllocations()).map(r=>counter(r,state.serviceCounts[r]||0,state.serviceCounts[r]>0,allocationLimit(p,p.kitchen,serviceAllocations(),card.uid,r,{limit:3})>0,'service-food',`需${Math.max(0,(card.needs[r]||0)-(card.served[r]||0)-(state.serviceCounts[r]||0))} · 库存${p.kitchen[r]||0}`)).join('')}<small>已选 ${sum(state.serviceCounts)} / 3份</small></section>`;
  }
  function hotel(player=p,interactive=true,drafting=false){
    const e=drafting?mainEffect():prepareEffect(),guest=drafting?null:p.cafe.find(c=>c.uid===state.checkin),selection=drafting?state.dieRooms:state.rooms;
    const chooser=drafting?{...p,money:p.money-dicePlan(g,p,state,{extra:isExtraDice()}).cost}:p;
    const eligible=interactive?(e?selectableRooms(chooser,e,selection):guest?selectableRooms(p,{kind:'occupy'},[],guest):[]):[];
    return `<section class="tt-hotel"><div class="tt-building"><div class="tt-roof">${button('?','room-bonuses','aria-label="房组奖励说明" title="展开房组奖励"',false,'tt-room-help')}<span>✦ 奥地利大饭店 ✦</span><span aria-hidden="true"></span></div><div class="tt-room-grid">${[...player.rooms].sort((a,b)=>b.floor-a.floor||a.col-b.col).map(r=>{
      const picked=interactive&&(selection.includes(r.id)||!drafting&&state.roomId===r.id),region=roomRegion(r,player.rooms);
      return `<button type="button" class="tt-room ${r.color} ${r.state} wall-${region.pattern} ${region.edges.map(side=>'region-'+side).join(' ')}${picked?' picked':''}${eligible.includes(r.id)?' eligible':''}" data-ui="room" data-id="${r.id}" data-group="${r.group}" aria-label="${r.floor}层${r.col}号房 ${LABEL[r.color]}色 ${{closed:'未准备',prepared:'空房',occupied:'已入住'}[r.state]}${picked?' 已选择':''}"${off(interactive&&(e||guest)&&!picked&&!eligible.includes(r.id))}><span class="tt-room-wall wall-col-${r.col} wall-floor-${r.floor}" aria-hidden="true"></span><span class="tt-room-door" aria-hidden="true"><span class="tt-room-number">${r.floor}0${r.col}</span><span class="tt-room-symbol">${icon(r.state==='closed'?'room-lock':r.state==='occupied'?'room-resident':'room-bed')}</span></span><span class="tt-room-corners">${r.state==='closed'?`<span class="tt-room-price" aria-label="准备费用${Math.max(0,r.floor-1)}克朗">${icon('coin')}<b>${Math.max(0,r.floor-1)}</b></span>`:''}${r.state==='closed'&&r.vp?`<span class="tt-room-points" aria-label="准备奖励${r.vp}分">${icon('vp')}<b>${r.vp}</b></span>`:''}</span>${picked?'<span class="tt-room-choice" aria-hidden="true">✓</span>':''}</button>`;
    }).join('')}</div></div></section>`;
  }
  function stage(){
    if(state.view==='hotel')return `<div class="tt-hotel-scene">${marketStrip()}${hotel()}${cafeSummary()}</div>`;
    if(state.view==='cafe')return `<section class="tt-card-stage tt-cafe-stage"><div class="tt-section-title"><strong>咖啡厅 · ${p.cafe.length} / 3位</strong><span>点客人查看卡片，选择上菜或入住</span></div>${cafeSlots()}</section>`;
    if(state.view==='staff')return `<section class="tt-card-stage"><div class="tt-section-title"><strong>饭店员工</strong><div class="tt-switch">${button(`手牌${p.hand.length}`,'staff-tab','data-value="hand"',false,state.staff==='hand'?'chosen':'')}${button(`已雇${p.staff.length}`,'staff-tab','data-value="played"',false,state.staff==='played'?'chosen':'')}</div></div>${gallery(state.staff==='hand'?p.hand:p.staff,c=>staffCard(c),'暂无员工')}</section>`;
    if(state.view==='objectives')return `<section class="tt-card-stage tt-objectives-stage"><div class="tt-section-title"><strong>公共目标</strong><span>全员进度 · 按领取顺序获得分数</span></div><div class="tt-objectives-grid">${g.objectives.map(o=>objectiveCardMarkup(g,p,o,{canClaim:extra()&&o.eligible&&!o.claimed.includes(p.id)})).join('')}</div></section>`;
    if(state.view==='imperial')return `<section class="tt-card-stage tt-crown-stage"><div class="tt-section-title"><strong>回合信息 · 皇冠轨道</strong>${button('评分规则','legend')}</div><div class="tt-crown-cards">${g.emperors.map(e=>`<article class="tt-imperial"><header><strong>第${{A:3,B:5,C:7}[e.category]}轮</strong><span>${esc(chineseText(e.name))}</span></header><section class="tt-crown-reward"><h3>${icon('reward')}奖励</h3>${e.reward.map(x=>`<p>${effectMarkup(x,ctx.effectText(x))}</p>`).join('')}</section><section class="tt-crown-penalty"><h3>${icon('penalty')}处罚</h3>${e.penalty.map(x=>`<p>${effectMarkup(x,ctx.effectText(x))}</p>`).join('')}</section></article>`).join('')}</div>${roundTimelineMarkup(g.round)}${imperialTrackMarkup(g,p)}</section>`;
    return '';
  }
  function statusText(){
    if(g.phase==='finished')return g.solo?(g.winners.includes(p.id)?'你战胜了全部人机，可查看计分':'人机获胜，可查看计分'):'本局已结束，可点击查看计分';
    if(g.prompt?.waiting)return `等待${g.players.find(x=>x.id===g.prompt.playerId)?.name}处理效果`;
    if(!mine())return `等待${g.players.find(x=>x.id===g.activePlayerId)?.name}行动`;
    if(state.serviceGuest)return '直接在右侧选择食饮并确认上菜';
    if(state.checkin)return state.roomId?'已选空房，确认后入住':'点亮起的空房安排入住';
    if(prepareEffect())return `已选${state.rooms.length} / ${prepareEffect().amount??prepareEffect().floors?.length??1}间，按点击顺序处理`;
    if(effect()?.kind==='staffDraft')return `第${effect().round}/6轮，每人轮流保留1张员工`;
    if(effect())return ctx.effectText(effect())||'选择钱与皇冠的分配';
    if(g.phase==='setupGuest')return '请先选择一位起始客人';
    return g.turn?.dieTaken?'主动作完成，可上菜、入住或结束回合':p.cafe.length>=3?'咖啡厅满座，直接选择骰子主动作':g.turn?.guestTaken?'迎客已完成，点骰子选择主动作':'点客人迎接，或直接点骰子选择主动作';
  }
  function footer(){
    if(g.tableControls?.pending)return button('查看桌上协商','consent','','','primary');
    if(g.phase==='finished')return button('查看终局计分','scores','','','primary');
    if(g.prompt?.waiting||!mine())return button('查看同桌','players');
    if(state.serviceGuest){const fee=p.staff.some(c=>c.id===24)?0:1;return `${button('取消上菜','cancel-service')}${button(`确认上菜 · ${fee}克朗`,'confirm-service','',!sum(state.serviceCounts)||p.money<fee,'primary')}`;}
    if(state.checkin)return `${button('取消入住','cancel-checkin')}${button(state.bonusFirst?'先房组奖励':'先客人奖励','bonus-order')}${button(state.roomId?`确认入住${state.roomId.replace('-','0')}号房`:'请点空房','confirm-checkin','',!state.roomId,'primary')}`;
    if(prepareEffect())return `${g.phase==='setupRooms'?button('清空选择','clear-rooms'):prepareEffect().kind==='penalty'?'':button('放弃奖励','skip-effect')}${button('确认房间','confirm-rooms','',prepareEffect().kind==='penalty'&&state.rooms.length!==(prepareEffect().amount??prepareEffect().floors?.length)||prepareEffect().kind==='occupy'&&!state.rooms.length,'primary')}`;
    if(effect())return button('继续处理效果','effect','','','primary');
    if(g.phase==='setupGuest')return button('选择起始客人','welcome','','','primary');
    const ending=turnEndIntent(g);
    return `${button('迎客','welcome','',!shouldOfferGuest(g,p))}${button('上菜','serve','',!p.cafe.length||!sum(p.kitchen))}${button('结束回合','end',`title="${g.turn?.dieTaken?'结束当前回合':'未行动时暂缓，按规则保留重掷后的行动机会'}"`,!ending,'primary')}`;
  }
  function counter(resource,value,minus,plus,prefix='food',hint=''){
    return `<div class="tt-counter">${icon(resource)}<strong>${LABEL[resource]||'皇冠'}</strong>${hint?`<small class="tt-counter-hint">${hint}</small>`:''}<div>${button('−',prefix,`data-resource="${resource}" data-delta="-1" aria-label="减少${LABEL[resource]||'皇冠'}"`,!minus)}<output>${value}</output>${button('+',prefix,`data-resource="${resource}" data-delta="1" aria-label="增加${LABEL[resource]||'皇冠'}"`,!plus)}</div></div>`;
  }
  function needStrip(card,allocations=[]){const missing=missingFoods(card,allocations);return `<span class="tt-need-strip">${FOODS.filter(r=>missing[r]).map(r=>`<span aria-label="还需${LABEL[r]}${missing[r]}份">${icon(r)}<b>${missing[r]}</b></span>`).join('')||'<small>✓ 已满足</small>'}</span>`;}
  function foodContext(allocations=[]){
    return `<section class="tt-food-context" aria-label="咖啡厅需求与厨房库存"><div class="tt-order-overview"><h3>咖啡厅还需</h3>${p.cafe.map(card=>`<article class="${card.color}"><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card)}</span><div><strong>${esc(guestName(card))}</strong>${needStrip(card,allocations)}</div></article>`).join('')||'<p>暂无客人，可先把食饮放进厨房。</p>'}</div><aside class="tt-stock-overview"><h3>厨房库存</h3><div>${FOODS.map(r=>`<span class="food-${r}" aria-label="厨房${LABEL[r]}${p.kitchen[r]||0}份">${icon(r)}<span>${LABEL[r]}</span><b>${p.kitchen[r]||0}</b></span>`).join('')}</div></aside></section>`;
  }
  function allocationBody(serve=false){
    const available=serve?p.kitchen:state.counts,selected=p.cafe.find(x=>x.uid===state.guest),n=state.allocations.reduce((a,b)=>a+b.amount,0);
    const resources=servingResources(p,state.guest,state.allocations);
    return `<div class="tt-allocate tt-food-operation">${foodContext(state.allocations)}<div class="tt-targets" aria-label="选择上菜客人，图标为剩余需求">${p.cafe.map(card=>`<button class="tt-target ${card.color}${state.guest===card.uid?' picked':''}" data-ui="allocation-guest" data-id="${esc(card.uid)}"><span class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card)}</span><strong>${esc(guestName(card))}</strong>${needStrip(card,state.allocations)}<small>已选上桌 ${state.allocations.filter(a=>a.guestId===card.uid).reduce((a,b)=>a+b.amount,0)}件</small></button>`).join('')||'<p>没有客人，本次食饮全部进入厨房。</p>'}</div><p class="tt-inline-hint">${selected?`给${esc(guestName(selected))}上菜`:'先选择一位客人'}${serve?` · 本次已选 ${n} / 3件`:''}</p><div class="tt-counters">${resources.map(r=>{const stock=(available[r]||0)-state.allocations.filter(a=>a.resource===r).reduce((a,b)=>a+b.amount,0);return counter(r,countFor(state.guest,r),countFor(state.guest,r)>0,selected&&allocationLimit(p,available,state.allocations,state.guest,r,{limit:serve?3:Infinity})>0,'allocation',`还需${Math.max(0,(selected.needs[r]||0)-(selected.served[r]||0)-countFor(state.guest,r))} · 可用${stock}`);}).join('')||'<p class="tt-inline-hint">这位客人的需求已满足，可选择其他客人。</p>'}</div><div class="tt-kitchen-result"><span>${serve?'厨房剩余':'本次剩余入库'}</span>${chips(Object.fromEntries(FOODS.map(r=>[r,(available[r]||0)-state.allocations.filter(a=>a.resource===r).reduce((n,a)=>n+a.amount,0)])))}</div></div>`;
  }
  function effectBody(){
    const e=effect();if(!e)return '<p>当前无需处理效果</p>';
    if(e.kind==='staffDraft')return `<section class="tt-draft-progress"><strong>第${e.round} / 6轮 · ${esc(p.name)}选1张</strong><p>每人依次保留1张，再把余牌传给左侧玩家。你已保留 ${p.hand.length} / 6张。</p><div>${g.draft.picks.map(x=>`<span>${esc(g.players.find(p=>p.id===x.playerId).name)} <b>${x.count}/6</b></span>`).join('')}</div></section>${gallery(e.drawn,c=>staffCard(c,true))}`;
    if(e.kind==='soloDraft')return `<p class="tt-inline-hint">起始员工 · 已选 ${state.cards.length} / 6张。未选的4张放回牌库底，可调整顺序。</p>${gallery(e.drawn,c=>staffCard(c,true))}`;
    if(e.kind==='goods'){
      if(state.goodsStep==='allocate')return allocationBody();
      return `<div class="tt-food-operation">${foodContext()}<p class="tt-inline-hint">本次拿取 ${sum(state.counts)} / ${e.amount}件${e.balanced?` · ${LABEL[e.pair[1]]}不多于${LABEL[e.pair[0]]}`:''}</p><div class="tt-counters">${(e.pair||FOODS).map(r=>counter(r,state.counts[r]||0,canChangeFood(e,state.counts,r,-1),canChangeFood(e,state.counts,r,1),'food',`厨房已有 ${p.kitchen[r]||0}`)).join('')}</div><p class="tt-inline-hint">新拿取的食饮可免费直接上桌，其余进入厨房。</p></div>`;
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
    if(e.kind==='staffDraft')return button('保留这张员工，交给下一位','confirm-draft','',!state.staffId,'primary');
    if(e.kind==='soloDraft')return `${button('调整归还顺序','order')}${button(`保留这${state.cards.length}张员工`,'confirm-effect','',state.cards.length!==6,'primary')}`;
    const skip=e.kind!=='penalty'?button(e.kind==='conference'?'执行处罚':'放弃奖励','skip-effect'):'';
    if(e.kind==='goods')return state.goodsStep==='choose'?`${skip}${button('下一步：分配给客人','goods-next','',sum(state.counts)===0,'primary')}`:`${!e.counts?button('返回食物选择','goods-back'):skip}${button('确认分配','confirm-effect','','','primary')}`;
    if(e.kind==='attract')return `${skip}${marketFooter()}`;
    if(e.kind==='die')return diceFooter();
    let disabled=e.kind==='hire'&&!state.staffId||e.kind==='complete'&&!state.guest||e.kind==='penalty'&&e.penalty==='discardHand'&&state.cards.length!==e.amount||e.kind==='penalty'&&e.penalty==='removeEndStaff'&&!state.staffId;
    return `${e.drawn||e.penalty==='discardHand'?button('调整归还顺序','order'):''}${skip}${button('确认处理','confirm-effect','',disabled,'primary')}`;
  }
  function diceDraftInputs(){
    const e=mainEffect(),plan=dicePlan(g,p,state,{extra:isExtraDice()});
    if(e.kind==='goods'){
      if(state.dieStage==='allocate')return `<section class="tt-die-allocation"><div class="tt-die-targets">${p.cafe.map(c=>button(`${esc(guestName(c))}${needStrip(c,state.dieAllocations)}`,'die-guest',`data-id="${esc(c.uid)}"`,false,c.uid===state.dieGuest?'chosen':'')).join('')}</div><p class="tt-inline-hint">免费直接上菜，未分配的放入厨房。</p><div class="tt-counters">${servingResources(p,state.dieGuest,state.dieAllocations).map(r=>counter(r,state.dieAllocations.find(a=>a.guestId===state.dieGuest&&a.resource===r)?.amount||0,state.dieAllocations.some(a=>a.guestId===state.dieGuest&&a.resource===r&&a.amount>0),allocationLimit(p,state.dieCounts,state.dieAllocations,state.dieGuest,r)>0,'die-allocation',`本次拿取 ${state.dieCounts[r]||0}`)).join('')||'<p>需求已满足，可换一位客人。</p>'}</div></section>`;
      return `<div class="tt-die-food"><p class="tt-inline-hint">本次拿取 ${sum(state.dieCounts)} / ${e.amount}件 · ${LABEL[e.pair[1]]}不多于${LABEL[e.pair[0]]}</p><div class="tt-counters">${e.pair.map(r=>counter(r,state.dieCounts[r]||0,canChangeFood(e,state.dieCounts,r,-1),canChangeFood(e,state.dieCounts,r,1),'die-food',`厨房已有 ${p.kitchen[r]||0}`)).join('')}</div></div>`;
    }
    if(e.kind==='moneyEmperor')return `<div class="tt-die-money"><p class="tt-inline-hint">共${e.amount}格强度，获得${e.amount-state.dieEmperor}克朗，皇冠前进${state.dieEmperor}格。</p><div class="tt-counters">${counter('coin',e.amount-state.dieEmperor,state.dieEmperor<e.amount,state.dieEmperor>0,'die-cash')}${counter('emperor',state.dieEmperor,state.dieEmperor>0,state.dieEmperor<e.amount,'die-emperor')}</div></div>`;
    if(e.kind==='bothMoneyEmperor')return `<p class="tt-die-both">${icon('coin')} 获得${e.amount}克朗 ＋ ${icon('emperor')} 皇冠前进${e.amount}格</p>`;
    if(e.kind==='prepare')return `<div class="tt-die-rooms"><p class="tt-inline-hint">已选 ${state.dieRooms.length} / ${e.amount}间 · 按点击顺序准备</p>${hotel(p,true,true)}</div>`;
    return `<div class="tt-die-hire"><p class="tt-inline-hint">雇用1位员工，每张减 ${e.discount}克朗。</p>${button(`${state.dieSkipStaff?'✓ ':''}本次不雇用`,'die-no-hire',`aria-pressed="${state.dieSkipStaff}"`,false,state.dieSkipStaff?'chosen':'')}${gallery(p.hand,c=>staffCard(c,true),'暂无员工手牌')}</div>`;
  }
  function diceFooter(){
    const e=mainEffect(),food=e.kind==='goods';
    return `${food?button(state.dieStage==='allocate'?'返回数量选择':'分配给客人（可选）','die-stage',`data-value="${state.dieStage==='allocate'?'choose':'allocate'}"`,!p.cafe.length||!sum(state.dieCounts)):''}<span class="tt-die-footer-note">${food?`已分配 ${state.dieAllocations.reduce((n,a)=>n+a.amount,0)}件，其余入厨房`:e.kind==='prepare'?`本次准备${state.dieRooms.length}间房`:e.kind==='hire'?(state.dieSkipStaff?'本次放弃雇用':'先选择一位员工'):''}</span>${button('执行行动','confirm-die','',!validDiceDraft(),'primary')}`;
  }
  function diceChoice(extra=false){
    const plan=dicePlan(g,p,state,{extra}),copyQuote=dicePlan(g,p,{...state,face:6},{extra}),names=['','甜点','饮料','房间','钱与皇冠','员工'];
    const hasStaffEffect=!extra&&p.staff.some(c=>c.mechanics?.on==='dieTaken'&&c.mechanics.faces?.includes(state.face)&&['vp','emperor','prepareRooms','hireStaff'].some(k=>c.mechanics[k]));
    const note=mainEffect().kind==='bothMoneyEmperor'?'员工使钱与皇冠同时获得。':['','拿取苹果卷和蛋糕，蛋糕不能多于苹果卷。','拿取葡萄酒和咖啡，咖啡不能多于葡萄酒。','选择相邻房间，仍需支付楼层费用。','将强度分配为克朗和皇冠前进格数。','选择要雇用的员工，按强度减免费用。'][plan.actionFace];
    return `<div class="tt-dice-planner tt-unified-dice"><div class="tt-action-tabs" aria-label="切换骰子动作">${[1,2,3,4,5].map(n=>button(`${dieIcon(n)}<strong>${names[n]}</strong><small>×${g.dice.filter(x=>x===n).length}</small>`,'action-face',`data-face="${n}" aria-pressed="${plan.actionFace===n}"`,!plan.copy&&!g.dice.includes(n),plan.actionFace===n?'chosen':'')).join('')}</div><div class="tt-action-options">${button(`${plan.copy?'✓':'○'} 6号骰复制${copyQuote.copyFee?' · 1克朗':' · 免费'}`,'copy-action',`aria-pressed="${plan.copy}"`,plan.copy?!g.dice.some(n=>n<6):!g.dice.includes(6)||p.money<copyQuote.cost,plan.copy?'chosen':'')}${button(`${state.boost?'✓':'○'} 强度加一 · 1克朗`,'boost',`aria-pressed="${state.boost}"`,extra||!state.boost&&(g.turn?.boostUsed||p.money<plan.copyFee+1),state.boost?'chosen':'')}${button(`${state.before?'✓':'○'} 先处理员工效果`,'before',`aria-pressed="${state.before}"`,!hasStaffEffect,state.before?'chosen':'')}</div><section class="tt-action-summary"><h3>${names[plan.actionFace]} · 强度 <b>×${plan.strength}</b></h3><p>${esc(extra?'额外行动，不移除骰子':`使用${state.face}点骰`)}${plan.copy?`，复制${names[plan.actionFace]}行动`:''}${plan.staffPower?` · 员工加成 +${plan.staffPower}`:''}</p><p>${note}</p></section><div class="tt-dice-content"><div class="tt-dice-context">${foodContext()}</div><div class="tt-dice-inputs">${diceDraftInputs()}</div></div><div class="tt-action-payment">${icon('coin')}<span>现有 <b>${p.money}</b> 克朗 · 本次支付 <b>${dicePayment()}</b> 克朗</span>${extra?button('放弃奖励','skip-effect','','','tt-die-decline'):`<strong>${!plan.valid?esc(plan.reason):'确认前不扣钱、不移除骰子'}</strong>`}</div></div>`;
  }
  function modal(){
    const kind=state.overlay;if(!kind)return '';
    let title='',body='',foot='';
    if(kind==='welcome'){
      title=g.phase==='setupGuest'?'选择起始客人':'回合开始 · 迎接客人';
      body=`<p class="tt-inline-hint">${g.phase==='setupGuest'?'起始迎客免费，点选后按确认迎接。':p.cafe.length>=3?'咖啡厅已满，可先返回安排入住或直接取骰':'先点选客人，再确认迎接；可以随时改选。'}</p>${gallery(g.market.map((c,i)=>c?({...c,index:i}):null).filter(Boolean),card=>guestCard(card,{market:true,index:card.index}))}`;
      foot=`${g.phase==='setupGuest'?'':button('先不迎客','close')}${marketFooter()}`;
    }else if(kind==='dice'){title='执行骰子主动作';body=diceChoice();foot=diceFooter();}
    else if(kind==='effect'){title=effect()?.kind==='staffDraft'?'起始员工 · 轮流选牌':effect()?.kind==='soloDraft'?'起始员工 · 十选六':effect()?.kind==='penalty'?'皇冠处罚':effect()?.kind==='goods'?(state.goodsStep==='choose'?'选择食物':'分配食物'):effect()?.kind==='hire'?'点击选择员工':'处理效果';body=effectBody();foot=effectFooter();}
    else if(kind==='serve'){title='从厨房上菜';body=allocationBody(true);foot=button('确认上菜','confirm-serve','',!state.allocations.length||p.money<(p.staff.some(c=>c.id===24)?0:1),'primary');}
    else if(kind==='guest'){
      const card=p.cafe.find(x=>x.uid===state.detailId);if(!card)return '';
      const rewards=card.effects.length?card.effects.map(e=>`<span class="tt-effect-line">${guestRewardMarkup(e,ctx.effectText(e))}</span>`).join(''):'<span class="tt-effect-line">无额外奖励</span>';
      return `<div class="tt-modal-mask tt-guest-focus-mask"><section class="tt-modal tt-guest-spotlight ${card.color}" role="dialog" aria-modal="true" aria-label="${esc(guestName(card))}"><header><span>${LABEL[card.color]} · ${card.color==='green'?'旅人':'贵宾'}</span><span class="tt-focus-vp" aria-label="${card.vp}分">${icon('vp')}<b>${card.vp}</b></span>${button('×','close','aria-label="关闭弹窗" title="关闭"')}</header><div class="guest-portrait ${guestPortraitClass(card)}">${guestPortraitArt(card,{fit:'slice'})}</div><div class="tt-focus-info"><h2>${esc(guestName(card))}</h2>${chips(card.served||{},card.needs)}<div class="tt-focus-rewards">${rewards}</div></div><footer>${extra()?`${button('从厨房上菜','guest-serve',`data-id="${esc(card.uid)}"`,card.complete||!sum(p.kitchen))}${button('安排入住','start-checkin',`data-id="${esc(card.uid)}"`,!canCheckin(card),'primary')}`:'<span>等待你的回合操作</span>'}</footer></section></div>`;
    }else if(kind==='staff-detail'){
      const card=[...p.hand,...p.staff].find(x=>x.id===state.detailId);if(!card)return '';
      const action=p.staff.some(x=>x.id===card.id)&&card.timing==='round'?button('使用这位员工','activate',`data-id="${card.id}"`,!extra()||card.usedRound===g.round,'primary'):'';
      return `<div class="tt-modal-mask tt-guest-focus-mask"><section class="tt-modal tt-guest-spotlight tt-staff-spotlight" role="dialog" aria-modal="true" aria-label="${esc(card.name)}"><header><span>${{end:'终局计分',immediate:'立即生效',permanent:'持续生效',round:'每轮一次'}[card.timing]}</span><span class="tt-focus-vp" aria-label="费用${card.cost}克朗">${icon('coin')}<b>${card.cost}</b></span>${button('×','close','aria-label="关闭弹窗" title="关闭"')}</header><div class="guest-portrait ${staffPortraitClass(card)}">${staffPortraitArt(card)}</div><div class="tt-focus-info"><h2>${esc(card.name)}</h2><div class="tt-focus-rewards">${card.effects?.length?card.effects.map(e=>`<span class="tt-effect-line">${effectMarkup(e,ctx.effectText(e))}</span>`).join(''):resourceTextMarkup(ctx.staffText(card))}</div></div>${action?`<footer>${action}</footer>`:''}</section></div>`;
    }else if(kind==='room'){
      const r=p.rooms.find(x=>x.id===state.detailId);title=`${r.floor}0${r.col}号房`;
      const group=p.rooms.filter(x=>x.group===r.group),n=group.length,amount=(r.color==='blue'?[2,5,9,15]:[1,3,6,10])[n-1],reward=icon(r.color==='blue'?'vp':r.color==='red'?'coin':'emperor');
      body=`<div class="tt-room-detail"><h3>${LABEL[r.color]}色 · ${{closed:'未准备',prepared:'空房',occupied:'已入住'}[r.state]}</h3><div class="tt-room-detail-facts"><span>${icon('coin')}准备 ${r.floor-1}克朗</span><span>${icon('vp')}准备得 ${r.vp||0}分</span></div><p>第${r.group}房组 · 已入住 ${group.filter(x=>x.state==='occupied').length} / ${n}</p><p class="tt-room-group-reward">全组住满奖励 ${reward}<b>${amount}</b>${r.color==='blue'?'分':r.color==='red'?'克朗':'格'}</p></div>`;
      foot=r.state==='prepared'?button('去选择已完成订单的客人','cafe','','','primary'):'';
    }else if(kind==='room-bonuses'){
      title='房组奖励';body=`<section class="tt-bonus-guide"><p>同一房组全部入住后，领取一次对应颜色的奖励。</p><table><thead><tr><th scope="col">房间数</th><th scope="col" class="blue">蓝房组${icon('vp')}</th><th scope="col" class="red">红房组${icon('coin')}</th><th scope="col" class="yellow">黄房组${icon('emperor')}</th></tr></thead><tbody>${[1,2,3,4].map((n,i)=>`<tr><th scope="row">${n}间</th><td>${[2,5,9,15][i]}分</td><td>${[1,3,6,10][i]}克朗</td><td>${[1,3,6,10][i]}格</td></tr>`).join('')}</tbody></table><p class="tt-bonus-note">房间右上角为准备费用，星号为准备房间时获得的分数。</p></section>`;
    }else if(kind==='settings'){

      title='饭店设置';body=`<div class="tt-settings">${ctx.preview?ctx.previewToolbar():g.solo?`<p>${g.solo.botCount>1?'自定义多人机':'官方基础版单人'}对局 · 自动保存</p>`:`<p>房间码：${esc(ctx.room.code)}</p>${button('复制好友链接','copy')}`}${g.solo?button(g.solo.botCount+'个人机 · '+g.solo.levelName+' · 查看自动行动','automa'):''}${tableTools()}${button('查看同桌酒店','players')}${button('查看最近日志','log')}${button('查看规则说明','legend')}${button(ctx.preview?'退出单人画面测试':'返回大厅','exit')}</div>`;
    }else if(kind==='automa'){
      const solo=opponent(state.opponent)||g.solo,turn=solo.lastTurn;title=`${solo.name||'Leopold'} · ${solo.levelName}`;
      const text=d=>d.kind==='guest'?(d.skipped?'没有可入住的市场客人':`${d.name} → ${d.roomId.replace('-','0')}号房，+${d.vp+d.roomVp}分`):d.kind==='die'?`取走${d.face}点骰（不执行主动作）`:d.kind==='emperor'?`皇冠前进${d.amount}格`:d.kind==='staff'?`翻开员工${d.id}`:`${d.category}目标：${d.progress===3?'领取'+d.vp+'分':d.progress===1?'Ⅲ，还需两次':'Ⅱ，还需一次'}`;
      body=`<div class="tt-solo-rules">${g.solo.opponents?.length>1?`<div class="tt-opponent-tabs">${g.solo.opponents.map(x=>button(x.name,'automa-seat',`data-id="${esc(x.playerId)}"`,false,x.playerId===solo.playerId?'chosen':'')).join('')}</div><p>自定义多人机玩法；各电脑独立执行Leopold指令。</p>`:''}<p>已行动${solo.turns} / 14次 · 指令牌剩余${solo.deckCount}张 · 私人员工剩余${solo.privateStaffCount}张</p>${turn?`<h3>第${turn.round}轮 · 指令${turn.card.id}</h3><ol>${turn.details.map(d=>`<li>${esc(text(d))}</li>`).join('')}</ol><p>平手按${turn.card.hand==='right'?'从左到右':'从右到左'}选取。</p>`:'<p>完成起始员工、客人和房间选择后，人机将自动先行动。</p>'}<hr><p>简单忽略银边、金边；标准忽略金边；困难执行全部指令。</p><p>Leopold不跳过、不执行骰面动作，也不领取客人、房组及皇冠板块奖惩。目标用Ⅲ → Ⅱ → Ⅰ三次指令领取，忽略条件。</p><p>需严格高于每个人机的总分才获胜；同分由人机获胜。</p></div>`;
    }else if(kind==='clock'){
      const t=g.tableControls,c=t.clock;title='回合倒计时';body=clockPanel();foot=`${button(c.status==='running'?'暂停计时':'继续计时',c.status==='running'?'clock-pause':'clock-resume','',!c.enabled||g.phase!=='turn'||!t.canControlClock||!!t.pending)}${button('重置本回合计时','clock-reset','',!c.enabled||g.phase!=='turn'||!t.canControlClock||!!t.pending)}`;
    }else if(kind==='consent'){
      const q=g.tableControls?.pending;if(!q)return '';
      title='桌上协商';body=`<section class="tt-consent"><h3>${esc(g.players.find(x=>x.id===q.requesterId)?.name)}申请${esc(q.label)}</h3><p>其余玩家全部同意后执行。协商期间暂停计时和游戏行动。</p>${q.kind==='undo'?'<p>牌面等已知信息无法收回；同意后恢复这一步之前的局面，倒计时暂停。</p>':'<p>重新投掷本轮全部骰子，不改变其他局面。</p>'}<div class="tt-consent-voters">${g.players.map(player=>`<span><strong>${esc(player.name)}</strong><b>${q.approved.includes(player.id)?'✓ 已同意':'等待表态'}</b></span>`).join('')}</div></section>`;
      foot=q.requesterId===p.id?button('取消申请','table-cancel'):q.approved.includes(p.id)?'<span>已同意，等待其他玩家</span>':`${button('拒绝','table-reject')}${button('同意','table-approve','','','primary')}`;
    }else if(kind==='legend'){
      title='操作与规则';body=`<div class="tt-rules"><p>点击骰子执行主动作，强度等于同面骰的枚数。万能骰付1克朗复制其他动作。</p><p>回合开始可迎接一位客人；点击客人查看卡片，完成订单后选择安排入住，再点同色空房。绿色客人可入住任意颜色。</p><p>第3、5、7轮皇冠评分：先按当前位置得分，再退3、5、7格。退后至少3格得奖，1至2格无事，0格受罚。</p><p>同一房组全部入住领取一次奖励。蓝色1至4间给2、5、9、15分；红黄给1、3、6、10克朗或皇冠格数。</p></div>`;
    }else if(kind==='players'){
      title='同桌的友人';body=gallery(g.players,x=>`<article class="tt-player"><strong>${esc(x.name)}${x.id===p.id?' · 你':''}</strong><p>${x.vp}分 · ${x.money}克朗 · 皇冠${x.emperor}格</p><p>员工手牌${x.handCount}张 · 已雇${x.staff.length}位</p>${button('查看公开酒店','other-hotel',`data-id="${esc(x.id)}"`)}</article>`);
    }else if(kind==='other-hotel'){
      const other=g.players.find(x=>x.id===state.other);title=`${other.name}的公开酒店`;body=(other.bot?'<p class="tt-inline-hint">Leopold不支付房费；空格视为可入住。不领取客人、房组或皇冠板块奖惩。</p>':'')+hotel(other,false);foot=button('查看其客人与员工','other-cards');
    }else if(kind==='other-cards'){
      const other=g.players.find(x=>x.id===state.other);title=`${other.name}的公开卡牌`;body=`<div class="tt-public-cards">${other.bot?'<p class="tt-inline-hint">私人终局员工在指令要求时翻开。</p>':''}<section class="tt-public-grid" aria-label="公开客人与已雇员工，未公开手牌在最后">${other.cafe.map(card=>guestCard(card,{publicView:true})).join('')}${other.staff.map(card=>staffCard(card,false,{publicView:true})).join('')}${hiddenHandMarkup(other.bot?opponent(other.id).privateStaffCount:other.handCount)}</section></div>`;
    }else if(kind==='activity-log'){
      title='同桌行动记录';body=`<ol class="tt-activity-history">${[...(g.activity?.events||[])].slice(-40).reverse().map(e=>`<li><small>第${e.round}轮 · ${esc(g.players.find(x=>x.id===e.playerId)?.name)}</small><p>${esc(chineseText(e.text))}</p></li>`).join('')||'<li>尚无公开行动。</li>'}</ol>`;
    }else if(kind==='log'){
      title='饭店日志';const logs=g.log.slice(-24).reverse();body=gallery(logs,entry=>`<article class="tt-log"><span>第${entry.round}轮</span><p>${esc(chineseText(entry.text))}</p></article>`);
    }else if(kind==='scores'){
      title='终局计分';body=gallery([...g.players].sort((a,b)=>b.score.total-a.score.total),x=>`<article class="tt-score"><strong>${esc(x.name)} · ${x.score.total}分${g.winners?.includes(x.id)?' · 胜者':''}</strong>${[['过程分','duringGame'],['员工','staff'],['房间','rooms'],['厨房','goods'],['克朗','cash'],['咖啡厅','cafe']].map(([name,k])=>`<p><span>${name}</span><b>${x.score[k]}</b></p>`).join('')}</article>`);
    }else if(kind==='order'){
      title='调整放回牌库底的顺序';const e=effect(),cards=e?.drawn||p.hand,ids=(e?.penalty==='discardHand'?state.cards:state.returnOrder.filter(id=>e?.kind==='soloDraft'?!state.cards.includes(id):id!==state.staffId));
      body=gallery(ids,id=>`<article class="tt-order"><strong>${esc(cards.find(c=>c.id===id)?.name)}</strong><p>当前第${ids.indexOf(id)+1}张，越前越先放回。</p>${button('向前移','order-move',`data-id="${id}" data-step="-1"`,ids.indexOf(id)===0)}${button('向后移','order-move',`data-id="${id}" data-step="1"`,ids.indexOf(id)===ids.length-1)}</article>`);foot=button('完成排序','effect','','','primary');
    }
    const operation=kind==='dice'||kind==='serve'||kind==='effect'&&['goods','moneyEmperor','die'].includes(effect()?.kind);
    return `<div class="tt-modal-mask"><section class="tt-modal${operation?' tt-operation-modal':''}${kind==='dice'||kind==='effect'&&isExtraDice()?' tt-dice-modal':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2>${button('关闭','close','aria-label="关闭弹窗"')}</header><div class="tt-modal-body">${body}</div><footer class="tt-modal-actions">${foot}</footer></section></div>`;
  }
  function draw(){
    if(!g||root.className!=='view-game')return;
    const editing=document.activeElement?.closest('[data-table-clock]')?document.activeElement.name:null;
    for(const rail of root.querySelectorAll('[data-rail]'))railOffsets.set(rail.dataset.rail,rail.scrollLeft);
    for(const grid of root.querySelectorAll('[data-scroll-key]'))verticalOffsets.set(grid.dataset.scrollKey,grid.scrollTop);
    document.body.classList.add('is-tabletop');
    root.innerHTML=`<section class="tabletop"><header class="tt-topbar"><h1>奥地利大饭店</h1><span>第${g.round} / 7轮${ctx.preview?' · 单人测试':''}</span>${clockBadge()}<div class="tt-topbar-actions"><span data-display-slot="game"></span>${button('设置','settings')}</div></header>${playerScoreboard(g,p)}<div class="tt-dice">${[1,2,3,4,5,6].map(n=>button(`${dieIcon(n)}<span class="tt-dice-summary"><span class="tt-dice-label">${['','甜点','饮料','房间','钱/<wbr>皇冠','员工','万能'][n]}</span><b class="tt-dice-multiplier">×${g.dice.filter(x=>x===n).length}</b></span>`,'pick-die',`data-face="${n}" aria-label="选择${n}点骰"`,!mine()||!!g.prompt||!!g.tableControls?.pending||g.phase!=='turn'||g.turn?.dieTaken||!g.dice.includes(n))).join('')}</div><div class="tt-workspace"><aside class="tt-activity" aria-label="同桌行动动态" aria-live="polite">${activityMarkup()}</aside><section class="tt-stage" aria-label="当前游戏区域">${stage()}</section><aside class="tt-command-rail" aria-label="厨房与回合操作"><section class="tt-kitchen"><h2>厨房</h2><div class="tt-kitchen-stock">${FOODS.map(r=>`<span class="food-token food-${r}" aria-label="${LABEL[r]}${p.kitchen[r]||0}">${icon(r)}<span>${LABEL[r]}</span><b>${p.kitchen[r]||0}</b></span>`).join('')}</div></section><div class="tt-dock"><p role="status">${esc(statusText())}</p>${g.solo?button((g.solo.lastTurn?'人机记录 · ':'人机规则 · ')+g.solo.botCount,'automa',`aria-label="查看${g.solo.botCount}个人机的${g.solo.lastTurn?'最近行动':'规则'}"`,'','tt-solo-last'):''}${inlineServing()}<div>${footer()}</div></div></aside></div><nav class="tt-nav" aria-label="游戏区域">${[['hotel','酒店'],['cafe','咖啡厅'],['staff','员工'],['imperial','皇冠'],['objectives','目标']].map(([key,name])=>button(name,'view',`data-view="${key}"`,false,state.view===key?'chosen':'')).join('')}</nav></section>${modal()}`;
    onLayout(root.querySelector('[data-display-slot="game"]'),Boolean(state.overlay));
    paintActivity();reportActivity();
    for(const rail of root.querySelectorAll('[data-rail]'))rail.scrollLeft=railOffsets.get(rail.dataset.rail)||0;
    for(const grid of root.querySelectorAll('[data-scroll-key]'))grid.scrollTop=verticalOffsets.get(grid.dataset.scrollKey)||0;
    if(state.overlay!==lastOverlay){lastOverlay=state.overlay;if(state.overlay)root.querySelector('.tt-modal button:not(:disabled)')?.focus({preventScroll:true});}
    if(editing&&state.overlay==='clock')[...root.querySelectorAll('[data-table-clock] input,[data-table-clock] select')].find(field=>field.name===editing)?.focus({preventScroll:true});
  }
  function update(next,player,context){
    g=next;p=player;ctx=context;live=context.room.liveActivity||null;actionPlayer.accept(g.activity,p.id,ctx.room.code);clockOffset=(g.tableControls?.serverNow||Date.now())-Date.now();
    const notice=g.tableControls?.notice;if(notice&&notice.id!==state.noticeSeen){state.noticeSeen=notice.id;state.overlay=null;state.serviceGuest=null;state.serviceCounts=empty();state.checkin=null;state.rooms=[];state.roomId=null;state.marketDraft=null;onFlash(notice.text);}
    const key=turnIdentity(g,ctx.room.code,p.id),e=effect(),pk=e?.uid||'';
    if(key!==turnKey){turnKey=key;state.checkin=null;state.serviceGuest=null;state.serviceCounts=empty();state.rooms=[];state.roomId=null;state.marketDraft=null;state.overlay=null;}
    if(pk!==promptKey){promptKey=pk;state.marketDraft=null;state.rooms=[];state.staffId=null;state.guest=null;state.cards=[];state.allocations=[];state.counts={...empty(),...e?.counts};state.emperor=0;state.face=g.dice.find(n=>n<6)||6;state.returnOrder=e?.drawn?.map(x=>x.id)||[];state.goodsStep=e?.counts?'allocate':'choose';state.pay=p.money>=1;
      if(e){if(e.kind==='die'){state.boost=false;state.before=false;resetDiceDraft();}if(e.kind==='goods'&&e.counts)state.guest=p.cafe.find(c=>!c.complete)?.uid||p.cafe[0]?.uid;state.overlay=roomEffect(e)?null:'effect';if(roomEffect(e))state.view='hotel';if(e.planChanged)onFlash('员工效果改变了局面，请重新确认主动作选择。');}else if(['effect','order'].includes(state.overlay))state.overlay=null;
    }
    if(g.phase==='setupRooms'&&mine())state.view='hotel';
    if(state.checkin&&!p.cafe.some(c=>c.uid===state.checkin)){state.checkin=null;state.roomId=null;}
    if(state.serviceGuest&&(!extra()||!serviceCard())){state.serviceGuest=null;state.serviceCounts=empty();}
    if(mine()&&g.phase==='turn'&&p.cafe.length>=3)state.seen.add(key);
    if(state.overlay==='welcome'&&!shouldOfferGuest(g,p))state.overlay=null;
    if(state.marketDraft&&g.market[state.marketDraft.index]?.id!==state.marketDraft.guestId)state.marketDraft=null;
    if(state.overlay==='dice'&&g.turn?.dieTaken&&!e)state.overlay=null;
    if(!actionPlayer.frame&&shouldOfferGuest(g,p)&&!state.seen.has(key)){state.seen.add(key);state.overlay='welcome';}
    if(!actionPlayer.frame&&g.phase==='finished'&&key!==state.finishedKey){state.finishedKey=key;state.overlay='scores';}
    const proposal=g.tableControls?.pending,voteKey=proposal?`${proposal.id}:${p.id}`:'';if(proposal&&state.voteSeen!==voteKey){state.voteSeen=voteKey;state.overlay='consent';state.serviceGuest=null;state.serviceCounts=empty();}else if(!proposal&&state.overlay==='consent')state.overlay=null;
    if(actionPlayer.frame&&state.overlay==='effect'){state.deferredEffect=e?.uid;state.overlay=null;}
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
    if(event.target.classList.contains('tt-modal-mask')){if(state.overlay==='welcome'||effect()?.kind==='attract')state.marketDraft=null;state.overlay=null;draw();return;}
    const b=event.target.closest('button[data-ui]');if(!b||b.disabled||!g)return;
    const d=b.dataset,e=effect();onFlash('');
    switch(d.ui){
      case 'request-undo':await send({type:'table-request',kind:'undo'});return;
      case 'request-reroll':await send({type:'table-request',kind:'reroll'});return;
      case 'table-approve':case 'table-reject':await send({type:'table-vote',proposalId:g.tableControls.pending.id,approve:d.ui==='table-approve'});return;
      case 'table-cancel':await send({type:'table-cancel',proposalId:g.tableControls.pending.id});return;
      case 'clock-pause':case 'clock-resume':case 'clock-reset':await send({type:d.ui});return;
      case 'view':state.view=d.view;state.serviceGuest=null;state.serviceCounts=empty();break;
      case 'activity-log':case 'automa':case 'clock':case 'consent':case 'settings':case 'welcome':case 'effect':case 'players':case 'log':case 'legend':case 'scores':case 'order':case 'room-bonuses':open(d.ui);return;
      case 'close':if(state.overlay==='welcome'||e?.kind==='attract')state.marketDraft=null;state.overlay=null;break;
      case 'activity-stop':actionPlayer.stop();return;
      case 'activity-replay':actionPlayer.replay(p.id);return;
      case 'automa-seat':state.opponent=d.id;break;
      case 'exit':await onExit();return;
      case 'copy':ctx.copyRoom();return;
      case 'staff-tab':state.staff=d.value;break;
      case 'market-card':state.marketDraft=draftGuest(g,Number(d.index));break;
      case 'market-preview':if(g.tableControls?.pending){open('consent');return;}if(p.cafe.length>=3){onFlash('咖啡厅已满，可先安排入住或直接取骰。');break;}state.marketDraft=draftGuest(g,Number(d.index));state.overlay=e?.kind==='attract'?'effect':'welcome';break;
      case 'confirm-market':{const selection=guestSelection(g,p,state.marketDraft);if(!selection.valid){onFlash(selection.reason);break;}await send(e?.kind==='attract'?resolveAction({index:selection.index}):{type:g.phase==='setupGuest'?'setupGuest':'attract',index:selection.index});return;}
      case 'pick-die':state.face=Number(d.face);state.boost=false;state.before=false;resetDiceDraft();open('dice');return;
      case 'action-face':if(state.face===6)state.asFace=Number(d.face);else state.face=Number(d.face);resetDiceDraft();break;
      case 'copy-action':if(state.face===6)state.face=g.dice.includes(state.asFace)?state.asFace:g.dice.find(n=>n<6);else{state.asFace=state.face;state.face=6;}normalizeDiceDraft();break;
      case 'boost':state.boost=!state.boost;normalizeDiceDraft();break;
      case 'before':state.before=!state.before;break;
      case 'die-food':state.dieCounts=changeFood(mainEffect(),state.dieCounts,d.resource,Number(d.delta));state.dieAllocations=[];break;
      case 'die-emperor':state.dieEmperor=Math.max(0,Math.min(mainEffect().amount,state.dieEmperor+Number(d.delta)));break;
      case 'die-cash':state.dieEmperor=Math.max(0,Math.min(mainEffect().amount,state.dieEmperor-Number(d.delta)));break;
      case 'die-no-hire':state.dieSkipStaff=!state.dieSkipStaff;state.dieStaffId=null;break;
      case 'die-stage':state.dieStage=d.value;break;
      case 'die-guest':state.dieGuest=d.id;break;
      case 'die-allocation':{const delta=Number(d.delta);if(delta>0&&allocationLimit(p,state.dieCounts,state.dieAllocations,state.dieGuest,d.resource)<1)break;let a=state.dieAllocations.find(a=>a.guestId===state.dieGuest&&a.resource===d.resource);if(!a&&delta<0)break;if(!a){a={guestId:state.dieGuest,resource:d.resource,amount:0};state.dieAllocations.push(a);}a.amount=Math.max(0,a.amount+delta);state.dieAllocations=state.dieAllocations.filter(a=>a.amount);break;}
      case 'confirm-die':{if(!validDiceDraft())break;const choice=diceChoicePayload();await send(isExtraDice()?resolveAction({face:state.face,asFace:state.asFace,choice}):{type:'die',face:state.face,asFace:state.asFace,boost:state.boost,staffBefore:state.before,choice});return;}
      case 'food':state.counts=changeFood(e,state.counts,d.resource,Number(d.delta));state.allocations=[];break;
      case 'goods-next':state.goodsStep='allocate';state.guest=p.cafe.find(c=>!c.complete)?.uid||p.cafe[0]?.uid;break;
      case 'goods-back':state.goodsStep='choose';break;
      case 'allocation-guest':state.guest=d.id;break;
      case 'allocation':adjustAllocation(d.resource,Number(d.delta));break;
      case 'emperor':state.emperor=Math.max(0,Math.min(e.amount,state.emperor+Number(d.delta)));break;
      case 'conference':state.pay=d.pay==='yes';break;
      case 'serve':state.guest=state.detailId&&p.cafe.some(c=>c.uid===state.detailId&&!c.complete)?state.detailId:p.cafe.find(c=>!c.complete)?.uid||p.cafe[0]?.uid;state.allocations=[];open('serve');return;
      case 'confirm-serve':await send({type:'serve',allocations:state.allocations});state.overlay=null;break;
      case 'guest-card':
        if(state.overlay==='other-cards')break;
        if(e?.kind==='complete'){state.guest=d.id;break;}
        state.detailId=d.id;state.checkin=null;state.roomId=null;open('guest');return;
      case 'guest-serve':state.serviceGuest=d.id;state.serviceCounts=empty();state.overlay=null;break;
      case 'service-food':{if(!extra()||!serviceCard())break;const delta=Number(d.delta);if(delta>0&&allocationLimit(p,p.kitchen,serviceAllocations(),state.serviceGuest,d.resource,{limit:3})<1)break;state.serviceCounts[d.resource]=Math.max(0,(state.serviceCounts[d.resource]||0)+delta);break;}
      case 'cancel-service':state.serviceGuest=null;state.serviceCounts=empty();break;
      case 'confirm-service':{const allocations=serviceAllocations();if(!extra()||!allocations.length)break;await send({type:'serve',allocations});state.serviceCounts=empty();if(canCheckin(serviceCard())){state.checkin=state.serviceGuest;state.serviceGuest=null;state.roomId=null;state.view='hotel';}break;}
      case 'start-checkin':state.checkin=d.id;state.roomId=null;state.overlay=null;state.view='hotel';break;
      case 'cancel-checkin':state.checkin=null;state.roomId=null;break;
      case 'bonus-order':state.bonusFirst=!state.bonusFirst;break;
      case 'clear-rooms':state.rooms=[];break;
      case 'cafe':state.overlay=null;state.view='cafe';break;
      case 'room':{
        if(state.overlay==='other-hotel')break;
        if((state.overlay==='dice'||isExtraDice())&&mainEffect().kind==='prepare'){const i=state.dieRooms.indexOf(d.id),picker={...p,money:p.money-dicePlan(g,p,state,{extra:isExtraDice()}).cost};if(i>=0)state.dieRooms=state.dieRooms.slice(0,i);else if(selectableRooms(picker,mainEffect(),state.dieRooms).includes(d.id))state.dieRooms.push(d.id);}
        else if(prepareEffect()){const i=state.rooms.indexOf(d.id);if(i>=0)state.rooms=state.rooms.slice(0,i);else if(selectableRooms(p,prepareEffect(),state.rooms).includes(d.id))state.rooms.push(d.id);}
        else if(state.checkin)state.roomId=d.id;
        else{state.detailId=d.id;open('room');return;}break;
      }
      case 'confirm-rooms':await send(g.phase==='setupRooms'?{type:'setupRooms',rooms:state.rooms}:resolveAction(e.kind==='occupy'?{roomId:state.rooms[0]}:{rooms:state.rooms}));return;
      case 'confirm-checkin':await send({type:'checkin',guestId:state.checkin,roomId:state.roomId,bonusFirst:state.bonusFirst});return;
      case 'staff-card':{
        if(state.overlay==='other-cards')break;
        const id=Number(d.id);
        if((state.overlay==='dice'||isExtraDice())&&mainEffect().kind==='hire'){state.dieStaffId=state.dieStaffId===id?null:id;state.dieSkipStaff=false;}
        else if(e?.kind==='staffDraft')state.staffId=state.staffId===id?null:id;
        else if(e?.penalty==='discardHand'||e?.kind==='soloDraft'){const index=state.cards.indexOf(id);if(index>=0)state.cards.splice(index,1);else if(state.cards.length<(e.kind==='soloDraft'?6:e.amount))state.cards.push(id);}
        else if(e?.kind==='hire'||e?.penalty==='removeEndStaff')state.staffId=state.staffId===id?null:id;
        else{state.detailId=id;open('staff-detail');return;}break;
      }
      case 'activate':await send({type:'activate',staffId:Number(d.id)});if(!effect())state.overlay=null;break;
      case 'objective':await send({type:'claim',objectiveId:Number(d.id)});return;
      case 'end':{const intent=turnEndIntent(g);if(intent)await send(intent);return;}
      case 'skip-effect':await send(resolveAction({skip:true,...e?.drawn?{returnOrder:state.returnOrder}:{}}));return;
      case 'order-move':{
        const list=e.penalty==='discardHand'?state.cards:e.kind==='soloDraft'?state.returnOrder.filter(id=>!state.cards.includes(id)):state.returnOrder,id=Number(d.id),at=list.indexOf(id),other=at+Number(d.step);if(other>=0&&other<list.length)[list[at],list[other]]=[list[other],list[at]];if(e.kind==='soloDraft')state.returnOrder=[...state.cards,...list];break;
      }
      case 'other-hotel':state.other=d.id;open('other-hotel');return;
      case 'other-cards':open('other-cards');return;
      case 'confirm-draft':await send({type:'draftStaff',staffId:state.staffId});return;
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
        if(e.kind==='soloDraft')a.cards=state.cards;
        await send(a);return;
      }
    }
    draw();
  });
  root.addEventListener('input',event=>{
    if(event.target.closest('[data-table-clock]')){state.clockDraft||={...g.tableControls.clock};state.clockDraft[event.target.name]=event.target.type==='checkbox'?event.target.checked:event.target.value;}
  });
  root.addEventListener('submit',async event=>{
    if(!event.target.matches('[data-table-clock]'))return;event.preventDefault();const form=new FormData(event.target);
    await send({type:'clock-config',enabled:form.has('enabled'),durationSeconds:Number(form.get('durationSeconds')),warningSeconds:Number(form.get('warningSeconds')),autoStart:form.has('autoStart'),autoSkip:form.get('autoSkip')==='true',theme:form.get('theme')});state.overlay=null;draw();
  });
  setInterval(()=>{
    if(!g||root.className!=='view-game')return;if(live&&live.expiresAt<=Date.now()+clockOffset){live=null;paintActivity();}const c=g.tableControls?.clock;if(!c?.enabled)return;
    const text=root.querySelector('[data-clock-text]'),status=root.querySelector('[data-clock-state]'),badge=root.querySelector('.tt-clock-badge');
    if(text)text.textContent=clockText();if(status)status.textContent=c.status==='paused'?'暂停':clockLeft()===0?'超时':'';
    badge?.classList.toggle('is-warning',c.status==='running'&&clockLeft()<=c.warningSeconds*1000);
    if(c.status==='running'&&c.autoSkip&&clockLeft()===0)ctx.previewTick?.();
  },500);
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state.overlay){if(state.overlay==='welcome'||effect()?.kind==='attract')state.marketDraft=null;state.overlay=null;draw();return;}
    if(event.key==='Tab'&&state.overlay){const focus=[...root.querySelectorAll('.tt-modal button:not(:disabled),.tt-modal input,.tt-modal select')];if(!focus.length)return;const at=focus.indexOf(document.activeElement);if(event.shiftKey&&at===0){event.preventDefault();focus.at(-1).focus();}else if(!event.shiftKey&&at===focus.length-1){event.preventDefault();focus[0].focus();}}
  });
  let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(draw);});
  return {update,updateActivity(value){live=value;paintActivity();},reset};
}
