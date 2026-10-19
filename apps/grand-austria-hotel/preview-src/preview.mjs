import { newLobby,joinLobby,startGame,applyAction,viewGame,internals } from '../lib/game.mjs';
import { STAFF,GUESTS,OBJECTIVES,EMPERORS } from '../lib/catalog.mjs';
export { applyAction,viewGame,advanceTableTime } from '../lib/game.mjs';
const GOODS=['strudel','cake','wine','coffee'];
const guestById=Object.fromEntries(GUESTS.map(c=>[c.id,c]));
const stock=(n=0)=>Object.fromEntries(GOODS.map(r=>[r,n]));
function guest(id,uid,complete=false){return{id,uid,served:complete?{...stock(),...guestById[id].needs}:stock()};}
export function makePreview(scene='showcase',hotelMode='night'){
  if(!['showcase','opening','finale','overview'].includes(scene)||!['night','day'].includes(hotelMode))throw new Error('未知示例场景');
  const host={id:'preview-anna',name:'安娜'},friend={id:'preview-josef',name:'约瑟夫'};
  let lobby=joinLobby(newLobby(host,{name:'维也纳 · 单人画面测试',maxPlayers:scene==='overview'?4:2,hotelMode}),friend);
  if(scene==='overview')for(const player of [{id:'preview-matilda',name:'玛蒂尔达'},{id:'preview-franz',name:'弗朗茨'}])lobby=joinLobby(lobby,player);
  let s=startGame(lobby,host.id,max=>max-1);
  while(s.phase==='setupGuest')s=applyAction(s,s.setupOrder[s.setupIndex],{type:'setupGuest',index:4});
  while(s.phase==='setupRooms')s=applyAction(s,s.setupOrder[s.setupIndex],{type:'setupRooms',rooms:['1-1','1-2','1-3']});
  s.dice=[1,1,1,2,2,3,3,4,5,6,...(scene==='overview'?[1,2,4,5]:[])];
  if(scene==='opening')return s;
  s.round=3;
  const a=s.players[0],b=s.players[1];
  for(const [i,p]of s.players.entries()){
    p.money=i?11:15;p.emperor=i?5:8;p.vp=i?28:36;p.kitchen={strudel:3,cake:2,wine:3,coffee:2};
    for(const r of p.rooms){r.state=r.floor<=2?'prepared':'closed';if(r.floor===1&&r.col<=3)r.state='occupied';}
    p.bonuses=p.rooms.filter(r=>p.rooms.filter(q=>q.group===r.group).every(q=>q.state==='occupied')).map(r=>r.group).filter((x,i,all)=>all.indexOf(x)===i);
  }
  a.rooms.find(r=>r.id==='3-1').state='occupied';a.rooms.find(r=>r.id==='3-2').state='prepared';
  a.hand=[1,17,22,40,46,48];a.staff=[12,23,24,36].map(id=>({id,usedRound:0}));
  b.hand=[2,11,18,27,32,41];b.staff=[9,15,42].map(id=>({id,usedRound:0}));
  a.cafe=[guest(65,'preview-a-1',true),guest(60,'preview-a-2')];a.cafe[1].served.cake=1;
  if(scene==='overview'){
    a.cafe.push(guest(55,'preview-a-3'));a.money=20;
    const assigned=new Set([a,b].flatMap(p=>[...p.hand,...p.staff.map(c=>c.id)]));
    for(const player of s.players.slice(2)){
      player.hand=STAFF.filter(c=>!assigned.has(c.id)).slice(0,6).map(c=>c.id);player.hand.forEach(id=>assigned.add(id));
      player.staff=[];player.cafe=[];
    }
    s.players.forEach(player=>{player.emperor=a.emperor;});
  }
  b.cafe=[guest(74,'preview-b-1'),guest(79,'preview-b-2',true)];
  s.market=[50,63,84,96,101];s.guestDiscard=[];
  s.guestDeck=GUESTS.map(c=>c.id).filter(id=>!s.market.includes(id)&&!s.players.some(p=>p.cafe.some(g=>g.id===id)));
  s.staffDeck=STAFF.map(c=>c.id).filter(id=>!s.players.some(p=>p.hand.includes(id)||p.staff.some(c=>c.id===id)));
  s.objectives=[105,109,113].map(id=>({...OBJECTIVES.find(o=>o.id===id),claimed:[]}));
  if(scene==='overview')s.objectives[0].claimed=[b.id];
  s.emperors=['A1','B4','C2'].map(id=>EMPERORS.find(c=>c.id===id));
  s.log=[{round:3,text:'单人画面测试：可操作两个示例座位；所有操作只在此页面生效。'}];
  if(scene==='finale'){
    s.round=7;s.players.forEach(p=>{p.emperor=2;s.guestDeck.push(...p.cafe.map(g=>g.id));p.cafe=[];});s.emperors[2]={...s.emperors[2],penalty:[]};
    internals.endRound(s);
  }
  return s;
}
export function activeSeat(state){return (state.tableSession?.pending?state.players.find(p=>!state.tableSession.pending.approved.includes(p.id))?.id:null)||state.effects[0]?.playerId||state.turn?.playerId||state.players[0].id;}
