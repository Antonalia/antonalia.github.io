import test from 'node:test';
import assert from 'node:assert/strict';
import {changeFood,canChangeFood,allocationLimit,selectableRooms,turnIdentity,shouldOfferGuest,missingFoods,servingResources,turnEndIntent,dicePlan} from '../public/interaction-rules.mjs';
import {makePreview} from '../preview-src/preview.mjs';
import {viewGame,applyAction} from '../lib/game.mjs';
import {GUESTS} from '../lib/catalog.mjs';
import {chineseText} from '../public/chinese.mjs';
import {draftGuest,guestSelection} from '../public/interaction-rules.mjs';
import {foodTokens,guestPortraitClass,staffPortraitClass,playerScoreboard,effectMarkup,resourceTextMarkup,guestRewardMarkup,roomRegion,hiddenHandMarkup} from '../public/card-art.mjs';
import {STAFF,HOTELS} from '../lib/catalog.mjs';
import {imperialTrackMarkup,roundTimelineMarkup,objectiveCardMarkup} from '../public/card-art.mjs';
const state=makePreview(),g=viewGame(state,'preview-anna'),p=g.players[0];
test('food buttons enforce combined power, permitted types and balanced pairs before submission',()=>{
  const e={kind:'goods',amount:3,pair:['strudel','cake'],balanced:true};let counts={strudel:0,cake:0,wine:0,coffee:0};
  assert.equal(canChangeFood(e,counts,'cake',1),false);
  counts=changeFood(e,counts,'strudel',1);counts=changeFood(e,counts,'cake',1);
  assert.equal(canChangeFood(e,counts,'strudel',-1),false);
  counts=changeFood(e,counts,'strudel',1);
  assert.deepEqual(changeFood(e,counts,'cake',1),counts);assert.deepEqual(changeFood(e,counts,'wine',1),counts);
  assert.equal(canChangeFood(e,counts,'strudel',1),false);
});
test('many increment/decrement sequences cannot exceed food strength or violate balance',()=>{
  const e={amount:5,pair:['wine','coffee'],balanced:true};let counts={wine:0,coffee:0};
  for(let i=0;i<800;i++){counts=changeFood(e,counts,['wine','coffee','cake'][i%3],i%5===0?-1:1);assert.ok(counts.wine+counts.coffee<=5);assert.ok(counts.wine>=counts.coffee);assert.ok(counts.wine>=0&&counts.coffee>=0);}
});
test('fixed rewards cannot be changed by increment buttons',()=>{
  const e={counts:{coffee:2}},counts={coffee:2};assert.deepEqual(changeFood(e,counts,'coffee',-1),counts);
});
test('allocating food accounts for all guests, remaining stock, order demand and the three-item serve limit',()=>{
  const player={cafe:[{uid:'a',needs:{wine:2},served:{}},{uid:'b',needs:{wine:3},served:{}}]},stock={wine:3};
  const allocations=[{guestId:'a',resource:'wine',amount:2}];
  assert.equal(allocationLimit(player,stock,allocations,'b','wine'),1);assert.equal(allocationLimit(player,stock,allocations,'a','wine'),0);
  assert.equal(allocationLimit(player,stock,[...allocations,{guestId:'b',resource:'wine',amount:1}],'b','wine',{limit:3}),0);
});
test('serving choices follow the selected guest and preserve reductions after fulfilling a need',()=>{
  const player={cafe:[{uid:'a',needs:{wine:2,cake:1},served:{wine:1,cake:1}},{uid:'b',needs:{coffee:2},served:{coffee:0}}]};
  assert.deepEqual(servingResources(player,'a'),['wine']);assert.deepEqual(servingResources(player,'b'),['coffee']);
  const allocations=[{guestId:'a',resource:'wine',amount:1}];
  assert.equal(missingFoods(player.cafe[0],allocations).wine,0);
  assert.deepEqual(servingResources(player,'a',allocations),['wine']);
  assert.deepEqual(servingResources(player,'missing'),[]);
});
test('one end-turn control retains the official pass window and mandatory main action',()=>{
  assert.deepEqual(turnEndIntent({...g,prompt:null,turn:{dieTaken:false,touched:false,guestTaken:false}}),{type:'pass'});
  assert.deepEqual(turnEndIntent({...g,prompt:null,turn:{dieTaken:true,touched:true}}),{type:'endTurn'});
  assert.equal(turnEndIntent({...g,prompt:null,turn:{dieTaken:false,touched:true}}),null);
  assert.equal(turnEndIntent({...g,prompt:{kind:'goods'},turn:{dieTaken:true}}),null);
});
test('dice planner quotes copying plus enhancement jointly and matches authoritative food strength',()=>{
  for(const staffIds of [[],[13],[17],[13,17]])for(const face of [1,2,6])for(const boost of [false,true]){
    const source=makePreview();source.players[0].staff=staffIds.map(id=>({id,usedRound:0}));source.players[0].money=10;
    const game=viewGame(source,'preview-anna'),player=game.players[0],selection={face,asFace:2,boost};
    const quote=dicePlan(game,player,selection),after=applyAction(source,player.id,{type:'die',...selection});
    const prompt=viewGame(after,player.id).prompt;
    assert.equal(quote.valid,true);assert.equal(prompt.kind,'goods');assert.equal(prompt.amount,quote.strength);
    assert.equal(after.players[0].money,player.money-quote.cost);
  }
  const broke={...p,money:1,staff:[]};assert.equal(dicePlan(g,broke,{face:6,asFace:1,boost:true}).valid,false);
  assert.equal(dicePlan(g,{...broke,money:2},{face:6,asFace:1,boost:true}).cost,2);
  assert.equal(dicePlan({...g,turn:{boostUsed:true}},p,{face:1,boost:true}).valid,false);
  const extra=dicePlan(g,{...broke,staff:[STAFF.find(c=>c.id===17)]},{face:6,asFace:2},{extra:true});
  assert.equal(extra.cost,1);assert.equal(extra.strength,g.dice.filter(n=>n===6).length);
});
test('room clicking highlights only connected and affordable preparations, including chained selections',()=>{
  const player={money:0,staff:[],rooms:[{id:'1-1',floor:1,col:1,state:'closed',color:'blue'},{id:'1-2',floor:1,col:2,state:'closed',color:'red'},{id:'2-1',floor:2,col:1,state:'closed',color:'blue'}]};
  assert.deepEqual(selectableRooms(player,{kind:'prepare',amount:3}),['1-1']);
  assert.deepEqual(selectableRooms(player,{kind:'prepare',amount:3},['1-1']),['1-2']);
  assert.deepEqual(selectableRooms(player,{kind:'prepare',amount:3,free:true},['1-1']),['1-2','2-1']);
});
test('check-in highlights matching empty rooms, with green guests accepting any color',()=>{
  const guest=p.cafe.find(c=>c.complete);const ids=selectableRooms(p,{kind:'occupy'},[],guest);
  assert.ok(ids.length>0);assert.ok(ids.every(id=>p.rooms.find(r=>r.id===id).state==='prepared'&&p.rooms.find(r=>r.id===id).color===guest.color));
  assert.equal(selectableRooms(p,{kind:'occupy'},[],{color:'green'}).length,p.rooms.filter(r=>r.state==='prepared').length);
});
test('emperor removal choices preserve highest-floor and one-per-floor order',()=>{
  const e={kind:'penalty',penalty:'removeOccupied',floors:[3,1]};
  assert.deepEqual(selectableRooms(p,e),['3-1']);assert.ok(selectableRooms(p,e,['3-1']).every(id=>id.startsWith('1-')));
});
test('welcome opens only before taking a guest or die, with a new identity per player turn and round',()=>{
  assert.equal(shouldOfferGuest(g,p),true);
  assert.equal(shouldOfferGuest({...g,turn:{...g.turn,dieTaken:true}},p),false);
  assert.equal(shouldOfferGuest({...g,turn:{...g.turn,guestTaken:true}},p),false);
  assert.notEqual(turnIdentity(g,'TEST',p.id),turnIdentity({...g,round:g.round+1},'TEST',p.id));
  assert.notEqual(turnIdentity(g,'TEST',p.id),turnIdentity({...g,turn:{...g.turn,number:2}},'TEST',p.id));
});
test('every guest has a Chinese name and historical English log text can be translated',()=>{
  assert.equal(GUESTS.length,56);for(const c of GUESTS)assert.doesNotMatch(c.name,/[A-Za-z]/);
  assert.equal(chineseText('安娜迎接了Knight of the Empire。'),'安娜迎接了帝国骑士。');
});
test('selecting and reselecting guests only creates a draft and never charges or adds a guest',()=>{
  const before=structuredClone(g);let selected=draftGuest(g,0);selected=draftGuest(g,1);
  assert.equal(guestSelection(g,p,selected).card.id,g.market[1].id);assert.deepEqual(g,before);
  assert.equal(guestSelection(g,p,null).valid,false);
});
test('guest confirmation rejects stale selection, insufficient cash, full cafe and an already-used turn',()=>{
  const selected=draftGuest(g,0);
  assert.equal(guestSelection(g,p,selected).valid,true);
  assert.equal(guestSelection({...g,market:[g.market[1],...g.market.slice(1)]},p,selected).valid,false);
  assert.equal(guestSelection(g,{...p,money:0},selected).valid,false);
  assert.equal(guestSelection(g,{...p,cafe:[...p.cafe,p.cafe[0]]},selected).valid,false);
  assert.equal(guestSelection({...g,turn:{...g.turn,guestTaken:true}},p,selected).valid,false);
});

test('满座直接跳过自动迎客，起始与普通回合仍保留未满座时的选择',()=>{
  const full={...p,cafe:[p.cafe[0],p.cafe[1],p.cafe[0]]};
  assert.equal(shouldOfferGuest(g,full),false);
  assert.equal(shouldOfferGuest({...g,phase:'setupGuest'},full),false);
  assert.equal(shouldOfferGuest({...g,phase:'setupGuest'},p),true);
});

test('皇冠轨道显示全部玩家，重合位置保留各自标记，姓名安全转义',()=>{
  const players=[{id:'one',name:'安娜',emperor:8},{id:'two',name:'约瑟夫',emperor:8},{id:'three',name:'<img onerror=test>',emperor:8},{id:'four',name:'第四位',emperor:13}];
  const html=imperialTrackMarkup({players},players[0]);
  assert.equal((html.match(/class="tt-track-space/g)||[]).length,14);
  for(const name of ['安娜','约瑟夫','第四位'])assert.ok(html.includes(name));
  for(let index=0;index<4;index++)assert.ok(html.includes('seat-'+index));
  assert.match(html,/&lt;img onerror=test&gt;/);assert.doesNotMatch(html,/<img/);
  assert.match(roundTimelineMarkup(5),/aria-current="step"/);assert.equal((roundTimelineMarkup(5).match(/class="tt-round-step/g)||[]).length,7);
});

test('目标公开当前达成者和既往领取者，不因花掉钱而丢失领取记录',()=>{
  const state=makePreview('overview'),view=viewGame(state,'preview-anna'),objective=view.objectives[0];
  assert.deepEqual(objective.achievedBy,['preview-anna']);assert.deepEqual(objective.claimed,['preview-josef']);
  const html=objectiveCardMarkup(view,view.players[0],objective,{canClaim:true});
  assert.match(html,/已领取 · 15分/);assert.match(html,/已达成未领取/);assert.match(html,/领取目标 · \+10分/);
  assert.ok(html.includes('安娜'));assert.ok(html.includes('约瑟夫'));
  const other=viewGame(state,'preview-josef').objectives[0];assert.deepEqual(other.achievedBy,objective.achievedBy);
});
test('the start guest and reward guest use zero cost but still require a valid confirmed draft',()=>{
  const selected=draftGuest(g,0),poor={...p,money:0};
  assert.equal(guestSelection({...g,phase:'setupGuest'},poor,selected).cost,0);
  const reward={...g,prompt:{kind:'attract',playerId:p.id}};
  assert.equal(guestSelection(reward,poor,selected).valid,true);assert.equal(guestSelection(reward,poor,selected).cost,0);
});
test('satisfied food requirements get a visible check while incomplete requirements remain distinct',()=>{
  const html=foodTokens({cake:1,coffee:0},{cake:1,coffee:2});
  assert.match(html,/food-cake done/);assert.match(html,/蛋糕 1\/1 已满足/);assert.match(html,/need-check/);assert.doesNotMatch(html,/food-coffee done/);
  assert.doesNotMatch(foodTokens({cake:1}),/need-check/);
});
test('all guest and employee cards map to the available original portrait atlas cells',()=>{
  const guests=new Set(GUESTS.map(guestPortraitClass));assert.equal(guests.size,12);
  for(const c of GUESTS)assert.match(guestPortraitClass(c),/face-(?:[0-9]|1[01])$/);
  const staff=new Set(STAFF.map(staffPortraitClass));assert.equal(staff.size,8);
  for(const c of STAFF)assert.match(staffPortraitClass(c),/staff-face-[0-7]$/);
});
test('the score strip shows every player public score with crown labels and escapes names',()=>{
  const publicGame={...g,players:[...g.players.map(x=>({...x})),{id:'third',name:'<script>test</script>',vp:107,money:20,emperor:13},{id:'fourth',name:'第四位',vp:88,money:8,emperor:5}]};
  const html=playerScoreboard(publicGame,p);assert.match(html,/seats-4/);assert.match(html,/107分，20克朗，皇冠13格/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/皇帝/);
  assert.equal(chineseText('皇帝前进3格'),'皇冠前进3格');
});
test('effect icons preserve resource amounts and keep reward and penalty signs distinct',()=>{
  const reward=effectMarkup({kind:'goods',counts:{wine:2,coffee:1}},'饮料奖励');
  assert.match(reward,/葡萄酒2/);assert.match(reward,/咖啡1/);assert.match(reward,/>\+2</);
  const penalty=effectMarkup({kind:'penalty',penalty:'money',amount:3,fallback:5},'支付3克朗，否则扣5分');
  assert.match(penalty,/支付/);assert.match(penalty,/否则/);assert.match(penalty,/>−5</);assert.doesNotMatch(penalty,/>\+5</);
});
test('effect icon fallback text and accessible labels escape markup',()=>{
  const text='<img src=x onerror="alert(1)">';
  for(const effect of [{kind:'money',amount:3},{kind:'prepare',amount:1},{kind:'unknown'}]){
    const html=effectMarkup(effect,text);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
  }
  const staff=resourceTextMarkup('入住：+1克朗、皇冠+2格、蛋糕3。<img src=x>');
  assert.match(staff,/icon-coin/);assert.match(staff,/icon-emperor/);assert.match(staff,/icon-cake/);assert.match(staff,/&lt;img/);assert.doesNotMatch(staff,/<img/);
});
test('guest reward sentences preserve quantities, payment conditions and floor restrictions',()=>{
  const prepare=guestRewardMarkup({kind:'prepare',amount:2,maxFloor:2,free:true});
  assert.match(prepare,/准备最多2间2层以下房/);assert.match(prepare,/免费/);assert.doesNotMatch(prepare,/付楼层费/);
  assert.match(guestRewardMarkup({kind:'prepare',amount:1}),/付楼层费/);
  assert.match(guestRewardMarkup({kind:'hire',discount:3}),/减3克朗/);
  assert.match(guestRewardMarkup({kind:'draw',amount:2}),/抽2张员工卡/);
  assert.match(guestRewardMarkup({kind:'emperor',amount:3}),/皇冠轨道前进3格/);
  assert.match(guestRewardMarkup({kind:'attract'}),/icon-invite/);
  assert.doesNotMatch(guestRewardMarkup({kind:'unknown'},'<img src=x>'),/<img/);
  assert.match(effectMarkup({kind:'prepare',amount:1},'',{compact:true}),/付楼层费/);
  assert.match(effectMarkup({kind:'prepare',amount:1,maxFloor:2,free:true},'',{compact:true}),/≤2层 免费/);
  assert.match(effectMarkup({kind:'prepare',amount:2,discount:1},'',{compact:true}),/每间减1/);
  assert.match(effectMarkup({kind:'hire',draw:3,discount:2},'',{compact:true}),/抽3选雇1 减2克朗/);
});
test('wallpaper joins the factual L-shaped and square room groups, including alternate hotels',()=>{
  const region=id=>roomRegion(HOTELS.night.find(r=>r.id===id),HOTELS.night);
  assert.deepEqual(region('1-1').edges,['top','right','bottom','left']);
  assert.deepEqual(region('2-2').edges,['top','right']);
  assert.deepEqual(region('2-3').edges,['top','left']);
  assert.deepEqual(region('1-4').edges,['right','bottom']);
  for(const rooms of Object.values(HOTELS)){
    for(const color of ['blue','red','yellow'])assert.equal(new Set(rooms.filter(r=>r.color===color).map(r=>roomRegion(r,rooms).pattern)).size,1);
    for(const group of new Set(rooms.map(r=>r.group))){
      const members=rooms.filter(r=>r.group===group);
      assert.equal(new Set(members.map(r=>roomRegion(r,rooms).pattern)).size,1);
      assert(members.every(r=>roomRegion(r,rooms).pattern>=0&&roomRegion(r,rooms).pattern<4));
    }
  }
});
test('opponent card backs show the public hand count without receiving private card identities',()=>{
  const other=g.players.find(x=>x.id!==p.id),privatePlayer=state.players.find(x=>x.id===other.id);
  assert.equal(other.hand,undefined);assert.equal(other.handCount,privatePlayer.hand.length);
  const html=hiddenHandMarkup(other.handCount);
  assert.match(html,/未公开员工手牌，共6张/);assert.match(html,/×6/);assert.match(html,/tt-card-back/);
  assert.doesNotMatch(html,/data-id=|早餐侍者|女侍者/);
  assert.match(hiddenHandMarkup(0),/×0/);assert.match(hiddenHandMarkup('<img src=x>'),/×0/);
  assert.doesNotMatch(hiddenHandMarkup('<img src=x>'),/<img/);
});
