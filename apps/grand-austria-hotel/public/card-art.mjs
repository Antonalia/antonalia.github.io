import {icon} from './visuals.mjs';
import {chineseText} from './chinese.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABEL={strudel:'苹果卷',cake:'蛋糕',wine:'葡萄酒',coffee:'咖啡'};
const GUEST_VARIANTS=[0,0,0,0,1,2,0,1,2,1,0,2,0,1,0,0,2,1,1,0,0,1,1,2,1,1,0,1,1,0,0,0,2,0,0,0,2,1,1,0,2,1,0,1,1,1,1,1,2,1,1,1,1,1,2,1];
const guestFace=card=>(GUEST_VARIANTS[card.id-49]??0)*4+({yellow:0,blue:1,red:2,green:3}[card.color]??0);
export const guestPortraitClass=card=>`portrait-guest face-${guestFace(card)}`;
const STAFF_FACES=[3,3,7,2,0,0,1,4,4,0,5,1,4,5,0,1,2,6,5,4,2,6,4,3,0,4,6,4,6,6,1,4,4,6,0,7,3,0,2,6,6,5,3,2,0,1,0,4];
export const staffPortraitClass=card=>`portrait-staff staff-face-${STAFF_FACES[card.id-1]??4}`;
// The generated atlas rows are not exactly equal. Crop inside their measured
// pixel boundaries so interpolation cannot reveal an adjacent portrait.
// Guest cells use one square display size, retaining every cropped pixel while
// normalizing the atlas row heights by less than 3%; cafe frames stay aligned.
const PORTRAIT_ATLASES={guest:{file:'guest-portraits-v2.png',width:1448,height:1086,rows:[0,360,717,1086]},staff:{file:'staff-portraits.png',width:1774,height:887,rows:[0,443,887]}};
function portraitSvg(kind,cell,fit='slice'){const atlas=PORTRAIT_ATLASES[kind],row=Math.floor(cell/4),column=cell%4,inset=3,cellWidth=atlas.width/4,x=column*cellWidth+inset,y=atlas.rows[row]+inset,width=cellWidth-inset*2,height=atlas.rows[row+1]-atlas.rows[row]-inset*2,displayHeight=kind==='guest'?width:height;return `<svg class="tt-portrait-art" viewBox="0 0 ${width} ${displayHeight}" preserveAspectRatio="xMidYMid ${fit}" aria-hidden="true"><svg width="${width}" height="${displayHeight}" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="none" overflow="hidden"><image href="./assets/${atlas.file}" width="${atlas.width}" height="${atlas.height}" preserveAspectRatio="none"/></svg></svg>`;}
export const guestPortraitArt=(card,{fit='slice'}={})=>portraitSvg('guest',guestFace(card),fit);
export const staffPortraitArt=card=>portraitSvg('staff',STAFF_FACES[card.id-1]??4);
export function foodTokens(counts,needs){return `<span class="tt-goods">${Object.keys(LABEL).filter(r=>needs?needs[r]:counts[r]).map(r=>{const done=Boolean(needs&&(counts[r]||0)>=needs[r]);return `<span class="food-token food-${r}${done?' done':''}" aria-label="${LABEL[r]} ${counts[r]||0}${needs?'/'+needs[r]:''}${done?' 已满足':''}">${icon(r)}<span>${LABEL[r]}</span><b>${counts[r]||0}${needs?'/'+needs[r]:''}</b>${done?'<i class="need-check" aria-hidden="true">✓</i>':''}</span>`;}).join('')}</span>`;}
export function playerScoreboard(g,p){return `<div class="tt-playerbar seats-${g.players.length}" aria-label="所有玩家的分数金钱与皇冠">${g.players.map(player=>`<button type="button" class="tt-player-stats${player.id===p.id?' is-me':''}${player.id===g.activePlayerId?' current':''}" data-ui="other-hotel" data-id="${esc(player.id)}" aria-label="${esc(player.name)}${player.id===p.id?'，你':''}：${player.vp}分，${player.money}克朗，皇冠${player.emperor}格"><strong>${esc(player.name)}${player.id===p.id?'<small>你</small>':player.bot?'<small>自动对手</small>':''}${player.id===g.activePlayerId?'<i aria-label="当前回合"></i>':''}</strong><span class="tt-player-metrics"><span title="胜利分">${icon('vp')}<b>${player.vp}</b></span><span title="金钱">${icon('money')}<b>${player.money}</b></span><span title="皇冠">${icon('emperor')}<b>${player.emperor}</b></span></span></button>`).join('')}</div>`;}
export function seatMarker(player,index){return `<span class="tt-seat-token seat-${index%4}" title="${esc(player.name)}" aria-label="${esc(player.name)}，${index+1}号玩家">${index+1}</span>`;}
export function imperialTrackMarkup(g,p){
  return `<section class="tt-track-overview" aria-label="所有玩家的皇冠位置"><div class="tt-imperial-track">${Array.from({length:14},(_,n)=>`<div class="tt-track-space${p.emperor===n?' is-mine':''}" aria-label="皇冠${n}格"><b>${n}</b><div class="tt-track-tokens">${g.players.map((player,index)=>player.emperor===n?seatMarker(player,index):'').join('')}</div></div>`).join('')}</div><div class="tt-track-legend">${g.players.map((player,index)=>`<span${player.id===p.id?' class="is-me"':''}>${seatMarker(player,index)}<strong>${esc(player.name)}${player.id===p.id?'（你）':''}</strong><b>${player.emperor}格</b></span>`).join('')}</div></section>`;
}
export function roundTimelineMarkup(round){return `<div class="tt-round-line" aria-label="七轮进度，第${round}轮">${Array.from({length:7},(_,i)=>{const n=i+1,scoring=[3,5,7].includes(n);return `<span class="tt-round-step${n<round?' passed':''}${n===round?' current':''}${scoring?' scoring':''}"${n===round?' aria-current="step"':''}><b>${n}</b><small>${scoring?`退${n}格`:'回合'}</small></span>`;}).join('')}</div>`;}
export function objectiveCardMarkup(g,p,o,{canClaim=false}={}){
  const reached=o.achievedBy|| (o.eligible?[p.id]:[]),mine=o.claimed.includes(p.id),next=o.points[o.claimed.length];
  return `<article class="tt-objective-card"><header><small>公共目标</small><strong>${esc(chineseText(o.name))}</strong></header><div class="tt-objective-podium" aria-label="目标领取名次">${o.points.map((points,index)=>{const id=o.claimed[index],player=g.players.find(x=>x.id===id);return `<div class="tt-objective-place${player?' claimed':''}"><b>+${points}分</b>${player?seatMarker(player,g.players.indexOf(player)):`<span class="tt-place-number">${['Ⅰ','Ⅱ','Ⅲ'][index]}</span>`}<small title="${esc(player?.name||'尚未领取')}">${esc(player?.name||'待领取')}</small></div>`;}).join('')}</div><div class="tt-objective-players" aria-label="所有玩家的目标状态">${g.players.map((player,index)=>{const rank=o.claimed.indexOf(player.id),met=reached.includes(player.id);return `<div class="${rank>=0?'claimed':met?'achieved':'pending'}">${seatMarker(player,index)}<strong>${esc(player.name)}</strong><span>${rank>=0?`已领取 · ${o.points[rank]}分`:player.bot?(((g.solo?.opponents?.find(x=>x.playerId===player.id)||g.solo)?.progress[o.category]||0)===0?'尚无标记':((g.solo?.opponents?.find(x=>x.playerId===player.id)||g.solo)?.progress[o.category]||0)===1?'Ⅲ · 还需两次指令':'Ⅱ · 还需一次指令'):met?'已达成未领取':'未达成'}</span></div>`;}).join('')}</div><button type="button" data-ui="objective" data-id="${o.id}"${canClaim?'':' disabled'}>${mine?'你已领取':canClaim?`领取目标 · +${next}分`:next===undefined?'名次已领完':reached.includes(p.id)?'已达成，等待你的行动':'尚未达成'}</button></article>`;
}
// Wallpaper follows the room color; thicker edges follow the factual room group.
export function roomRegion(room,rooms){
  const adjacent={top:[room.floor+1,room.col],right:[room.floor,room.col+1],bottom:[room.floor-1,room.col],left:[room.floor,room.col-1]};
  return {pattern:({blue:0,yellow:1,red:2})[room.color]??0,edges:Object.entries(adjacent).filter(([, [floor,col]])=>!rooms.some(r=>r.floor===floor&&r.col===col&&r.group===room.group)).map(([side])=>side)};
}
// This renderer accepts only the public count, never an opponent's card objects.
export function hiddenHandMarkup(count){
  const n=Number.isSafeInteger(count)&&count>=0?count:0;
  return `<aside class="tt-hidden-hand" aria-label="未公开员工手牌，共${n}张"><strong>未公开手牌</strong><span class="tt-card-back${n?'':' is-empty'}" aria-hidden="true"><span class="tt-card-back-seal">${icon('bell')}</span><b>×${n}</b></span><small>仅展示数量</small></aside>`;
}
export function objectiveArt(o){
  const kind=o.condition.kind;
  if(kind==='money')return `<span class="task-coins">${icon('money')}${icon('money')}${icon('money')}</span>`;
  if(kind==='emperor')return `<span class="task-crown">${icon('emperor')}</span>`;
  if(kind==='staff')return `<span class="task-team">${[0,3,4].map(n=>`<span class="portrait-staff staff-face-${n}">${portraitSvg('staff',n)}</span>`).join('')}</span>`;
  return `<svg class="task-hotel-art" viewBox="0 0 220 145" aria-hidden="true"><path d="m22 32 88-25 88 25v12H22Z" fill="#31564b" stroke="#b29a61" stroke-width="3"/><rect x="32" y="44" width="156" height="95" fill="#e6cc95" stroke="#ad8b4f" stroke-width="3"/>${Array.from({length:12},(_,i)=>{const col=i%4,row=Math.floor(i/4),color=['#2778ad','#c65b4d','#dfa62c'][o.condition.kind==='allColor'?0:col%3];return `<rect x="${45+col*34}" y="${54+row*27}" width="23" height="21" rx="6" fill="${color}" stroke="#f7e8c3" stroke-width="3"/>`;}).join('')}<circle cx="180" cy="29" r="23" fill="#f4bc42" stroke="#9c6c1f" stroke-width="3"/><path d="m169 29 8 8 15-17" fill="none" stroke="#fff9df" stroke-width="5" stroke-linecap="round"/></svg>`;
}
// Render structured effects, keeping caller text escaped and accessible labels intact.
export function effectMarkup(e,text,{compact=false}={}){
  const token=(kind,n,label)=>`<span class="tt-benefit" aria-label="${esc(label)}" title="${esc(label)}">${icon(kind)}<b>${esc(n)}</b></span>`;
  if(['money','vp','emperor'].includes(e.kind))return token({money:'coin',vp:'vp',emperor:'emperor'}[e.kind],`+${e.amount}`,text);
  if(e.kind==='goods'&&e.counts)return Object.entries(LABEL).filter(([r])=>e.counts[r]).map(([r,name])=>token(r,`+${e.counts[r]}`,`${name}${e.counts[r]}`)).join('');
  if(e.kind==='draw')return token('book',`+${e.amount}`,text)+`<span>${compact?'员工':'张员工'}</span>`;
  if(e.kind==='penalty'&&e.penalty==='money')return `支付${token('coin',e.amount,`${e.amount}克朗`)}<span>否则${token('vp',`−${e.fallback}`,`扣${e.fallback}分`)}</span>`;
  if(e.kind==='penalty'&&e.penalty==='vp')return token('vp',`−${e.amount}`,text);
  const short={prepare:`${e.occupied?'备房入住':'备房'}×${e.amount}${e.maxFloor?` ≤${e.maxFloor}层`:''}${e.free?' 免费':e.discount?` 每间减${e.discount}`:' 付楼层费'}`,hire:`${e.draw?`抽${e.draw}选雇1`:'雇员工'}${e.free?' 免费':` 减${e.discount||0}克朗`}`,attract:'免费迎客',occupy:'空房入住',complete:'完成订单'};
  const symbol={prepare:'door',hire:'cards',attract:'invite',occupy:'bed',complete:'bell'}[e.kind];
  return `${symbol?icon(symbol):''}<span>${esc(compact&&short[e.kind]?short[e.kind]:text)}</span>`;
}
// Guest rewards use short sentences, rather than replacing the action with a symbol.
export function guestRewardMarkup(e,fallback=''){
  let text=fallback;
  if(e.kind==='draw')text=`抽${e.amount}张员工卡`;
  if(e.kind==='money')text=`获得${e.amount}克朗`;
  if(e.kind==='emperor')text=`皇冠轨道前进${e.amount}格`;
  if(e.kind==='goods'&&e.counts)text='获得'+Object.entries(LABEL).filter(([r])=>e.counts[r]).map(([r,name])=>`${e.counts[r]}份${name}`).join('、');
  if(e.kind==='prepare')text=`准备最多${e.amount}间${e.maxFloor?`${e.maxFloor}层以下`:''}房${e.occupied?'并入住':''}${e.free?'（免费）':e.discount?`（每间减${e.discount}克朗）`:'（付楼层费）'}`;
  if(e.kind==='hire')text=`${e.draw?`抽${e.draw}张员工卡，选1位雇用`:'雇用1位手牌员工'}${e.free?'（免费）':`（减${e.discount||0}克朗）`}`;
  if(e.kind==='attract')text='免费迎接1位客人';
  if(e.kind==='occupy')text='将1间空房标记为入住';
  if(e.kind==='die')text='额外执行1次骰子动作';
  const symbol={draw:'cards',money:'coin',emperor:'emperor',goods:Object.keys(LABEL).find(r=>e.counts?.[r])||'bell',prepare:'room-bed',hire:'cards',attract:'invite',occupy:'room-resident',die:'bell'}[e.kind];
  return `${symbol?icon(symbol):''}<span>${esc(text)}</span>`;
}
export function resourceTextMarkup(text){
  const raw=String(text??''),pattern=/皇冠(?:前进)?[+＋−-]?\d+格?|[+＋−-]?\d+(?:克朗|分)|(?:苹果卷|蛋糕|葡萄酒|咖啡)[+＋−-]?\d+/g;
  let html='',start=0;
  for(const match of raw.matchAll(pattern)){
    const label=match[0],kind=label.startsWith('皇冠')?'emperor':label.endsWith('克朗')?'coin':label.endsWith('分')?'vp':Object.keys(LABEL).find(r=>label.startsWith(LABEL[r]));
    html+=esc(raw.slice(start,match.index))+`<span class="tt-benefit" aria-label="${esc(label)}">${icon(kind)}<b>${esc(label.match(/[+＋−-]?\d+/)[0])}</b></span>`;start=match.index+label.length;
  }
  return html+esc(raw.slice(start));
}
