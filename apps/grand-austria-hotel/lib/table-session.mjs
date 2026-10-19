// Optional table conveniences. Snapshots stay server-side; public views are explicit.
const check=(ok,message)=>{if(!ok)throw Object.assign(new Error(message),{status:400});};
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const actor=s=>s.effects?.[0]?.playerId||s.turn?.playerId||null;
const turnKey=s=>s.phase==='turn'?`${s.round}:${s.turn?.number}:${actor(s)}`:null;
const core=s=>{const {tableSession,...game}=s;return structuredClone(game);};
const defaults=()=>({serial:0,history:[],pending:null,notice:null,clock:{enabled:false,durationSeconds:120,warningSeconds:15,autoStart:true,autoSkip:false,theme:'sand',status:'paused',remainingMs:120000,deadline:null,key:null}});
const session=s=>s.tableSession||defaults();
const clockLeft=(c,now)=>c.status==='running'&&Number.isFinite(c.deadline)?Math.max(0,c.deadline-now):Math.max(0,c.remainingMs);
const canReroll=s=>s.phase==='turn'&&s.turn?.number===1&&!s.roundPlayStarted&&!s.turn.touched&&!s.effects?.length&&s.dice.length===s.players.length*2+6&&s.slots.every(x=>!x.done&&!x.passed);
const clockCopy=(c,now)=>({...c,remainingMs:clockLeft(c,now),deadline:null});
function resume(c,now){return{...c,deadline:c.status==='running'?now+c.remainingMs:null};}
function syncClock(c,s,now){
  const key=turnKey(s);
  if(key!==c.key){c.key=key;c.remainingMs=c.durationSeconds*1000;c.status=c.enabled&&c.autoStart&&key?'running':'paused';c.deadline=c.status==='running'?now+c.remainingMs:null;}
  return c;
}
export function synchronizeAutomaticClock(s,now){if(s.tableSession)syncClock(s.tableSession.clock,s,now);return s;}
const label=a=>({die:'取骰主动作',resolve:'处理奖励或处罚',attract:'迎接客人',serve:'从厨房上菜',checkin:'安排客人入住',activate:'使用员工',claim:'领取公共目标',endTurn:'结束回合',pass:'跳过回合'}[a.type]||'上一步操作');
function note(s,c,text,now){c.notice={id:++c.serial,text,at:now};s.log.push({round:s.round||0,text});if(s.log.length>160)s.log.shift();}
function remember(c,s,playerId,text,clock,now){c.history.push({id:++c.serial,playerId,label:text,before:core(s),clock:clockCopy(clock,now)});c.history=c.history.slice(-12);}
const controlTypes=new Set(['clock-config','clock-pause','clock-resume','clock-reset','table-request','table-vote','table-cancel']);

export function applyTableAction(state,playerId,action,{applyRule,now,rng}){
  const player=state.players.find(p=>p.id===playerId);check(player,'你不是本局玩家');check(action&&typeof action.type==='string','缺少操作');
  let c=structuredClone(session(state));syncClock(c.clock,state,now);
  if(!controlTypes.has(action.type)){
    check(action.type!=='__clock-expire','此操作仅由计时服务执行');
    check(!c.pending,'请先完成桌上协商，或取消申请');
    const next=applyRule(core(state),playerId,action);
    if(state.phase==='turn'&&next.round===state.round)next.roundPlayStarted=true;
    if(['turn','emperor'].includes(state.phase))remember(c,state,playerId,label(action),c.clock,now);
    else c.history=[];
    syncClock(c.clock,next,now);next.tableSession=c;return next;
  }
  let s=core(state);
  if(action.type.startsWith('clock-')){
    check(!c.pending,'协商期间计时已暂停');
    if(action.type==='clock-config'){
      check(playerId===s.hostId,'只有房主可以修改倒计时设置');
      check(typeof action.enabled==='boolean'&&typeof action.autoStart==='boolean'&&typeof action.autoSkip==='boolean','计时开关无效');
      check(integer(action.durationSeconds,5,3600)&&integer(action.warningSeconds,0,action.durationSeconds),'时长需为5–3600秒，提醒阈值不能超过时长');
      check(['sand','mint','rose'].includes(action.theme),'未知计时颜色');
      c.clock={enabled:action.enabled,durationSeconds:action.durationSeconds,warningSeconds:action.warningSeconds,autoStart:action.autoStart,autoSkip:action.autoSkip,theme:action.theme,key:turnKey(s),remainingMs:action.durationSeconds*1000,status:action.enabled&&action.autoStart&&turnKey(s)?'running':'paused',deadline:null};
      c.clock=resume(c.clock,now);note(s,c,`${player.name}${action.enabled?`将每回合倒计时设为${action.durationSeconds}秒`:'关闭了倒计时'}。`,now);
    }else{
      check(playerId===s.hostId||playerId===actor(s),'只有房主或当前行动玩家可以控制计时');check(c.clock.enabled&&turnKey(s),'当前没有可用的回合倒计时');
      c.clock=clockCopy(c.clock,now);
      if(action.type==='clock-pause')c.clock.status='paused';
      if(action.type==='clock-resume')c.clock.status='running';
      if(action.type==='clock-reset')c.clock.remainingMs=c.clock.durationSeconds*1000;
      c.clock=resume(c.clock,now);
    }
  }else if(action.type==='table-request'){
    check(!c.pending,'已有一项协商正在进行');check(['undo','reroll'].includes(action.kind),'未知协商类型');
    const last=c.history.at(-1);
    if(action.kind==='undo')check(last?.playerId===playerId,'只能申请撤销自己最近一步，且其后尚无人操作');
    else check(canReroll(s),'只能在本轮第一位玩家开始行动前重置全部骰子');
    c.pending={id:`proposal-${++c.serial}`,kind:action.kind,requesterId:playerId,approved:[playerId],createdAt:now,targetId:last?.id,label:action.kind==='undo'?`撤销「${last.label}」`:`重置本轮全部${s.players.length*2+6}枚骰子`,before:core(s),clock:clockCopy(c.clock,now)};
    c.clock={...clockCopy(c.clock,now),status:'paused'};
  }else{
    const q=c.pending;check(q&&action.proposalId===q.id,'这项申请已结束或发生变化');
    if(action.type==='table-cancel'){
      check(q.requesterId===playerId,'只能取消自己的申请');c.pending=null;c.clock=resume(q.clock,now);note(s,c,`${player.name}取消了${q.label}的申请。`,now);
    }else{
      check(typeof action.approve==='boolean','请选择同意或拒绝');check(q.requesterId!==playerId&&!q.approved.includes(playerId),'你已表态，或是申请发起人');
      if(!action.approve){c.pending=null;c.clock=resume(q.clock,now);note(s,c,`${player.name}拒绝了${q.label}的申请，局面保持原样。`,now);}
      else{
        q.approved.push(playerId);
        if(s.players.every(p=>q.approved.includes(p.id))){
          if(q.kind==='undo'){
            const last=c.history.at(-1);check(last?.id===q.targetId,'可撤销的操作已发生变化');s=structuredClone(last.before);c.history.pop();c.clock={...c.clock,key:last.clock.key,remainingMs:Math.min(last.clock.remainingMs,c.clock.durationSeconds*1000),status:'paused',deadline:null};
          }else{
            remember(c,q.before,q.requesterId,'重置本轮全部骰子',q.clock,now);
            s.dice=Array.from({length:s.players.length*2+6},()=>rng(6)+1);c.clock=resume(q.clock,now);
          }
          c.pending=null;note(s,c,`全员同意：${s.players.find(p=>p.id===q.requesterId).name}${q.label}。`,now);syncClock(c.clock,s,now);
        }
      }
    }
  }
  s.tableSession=c;return s;
}

export function viewTableControls(s,playerId,now=Date.now()){
  const c=session(s),last=c.history.at(-1),q=c.pending;
  const clock=syncClock({...c.clock},s,now);
  return{serverNow:now,clock:{...clock,remainingMs:clockLeft(clock,now)},canConfigure:playerId===s.hostId,canControlClock:playerId===s.hostId||playerId===actor(s),canUndo:Boolean(!q&&last?.playerId===playerId),undoLabel:last?.playerId===playerId?last.label:null,canReroll:!q&&canReroll(s),pending:q?{id:q.id,kind:q.kind,requesterId:q.requesterId,approved:[...q.approved],createdAt:q.createdAt,label:q.label}:null,notice:c.notice};
}

export function advanceTableClock(state,{applyRule,now}){
  const c=state.tableSession;if(!c||c.pending||!c.clock.enabled||!c.clock.autoSkip||c.clock.status!=='running'||state.phase!=='turn'||state.effects.length||clockLeft(c.clock,now)>0)return state;
  const next=applyRule(core(state),actor(state),{type:'__clock-expire'}),copy=structuredClone(c);
  remember(copy,state,actor(state),'超时结束回合',c.clock,now);
  if(next.round===state.round)next.roundPlayStarted=true;
  note(next,copy,`${state.players.find(p=>p.id===actor(state)).name}倒计时结束，自动结束本回合。`,now);
  syncClock(copy.clock,next,now);next.tableSession=copy;return next;
}
