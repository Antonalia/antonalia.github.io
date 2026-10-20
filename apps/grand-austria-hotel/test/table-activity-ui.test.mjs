import test from 'node:test';
import assert from 'node:assert/strict';
import {createTabletop} from '../public/table-view.mjs';
import {viewGame} from '../lib/game.mjs';
import {ready} from './helpers.mjs';

// Component harness, not a browser/layout test. Keep the production event handlers.
function fixture(t){
  const previous=Object.fromEntries(['document','window','setInterval','setTimeout','clearTimeout'].map(k=>[k,globalThis[k]]));
  const events=new Map(),timers=new Map(),bar={innerHTML:''};let serial=0;
  globalThis.document={activeElement:null,body:{classList:{add(){}}}};
  globalThis.window={addEventListener(){}};
  globalThis.setInterval=()=>0;globalThis.setTimeout=fn=>{timers.set(++serial,fn);return serial;};globalThis.clearTimeout=id=>timers.delete(id);
  const root={className:'view-game',innerHTML:'',addEventListener:(name,fn)=>events.set(name,fn),querySelector:s=>s==='.tt-activity'?bar:null,querySelectorAll:()=>[]};
  const reports=[],sent=[],ui=createTabletop(root,{onAction:a=>sent.push(a),onExit(){},onFlash(){},onActivity:kind=>reports.push(kind)});
  t.after(()=>{ui.reset();for(const [k,v]of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;});
  const context={room:{code:'COMPONENT',version:1},effectText:()=>'',staffText:()=>'',preview:null};
  return {root,bar,reports,sent,ui,update:(g,id)=>ui.update(g,g.players.find(p=>p.id===id),context),
    click:async(ui,extra={})=>{const button={dataset:{ui,...extra},disabled:false};await events.get('click')({target:{classList:{contains:()=>false},closest:()=>button}});},
    drain:()=>{for(let i=0;timers.size&&i<200;i++){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}assert.equal(timers.size,0);}};
}
test('真人选择动作会报告操作状态，观察者活动栏无需重绘选择窗口',async t=>{
  const f=fixture(t),s=ready(),actor=s.turn.playerId,other=s.players.find(p=>p.id!==actor).id,g=viewGame(s,actor);
  f.update(g,actor);await f.click('close');await f.click('pick-die',{face:'4'});assert.equal(f.reports.at(-1),'dice');
  await f.click('close');assert.equal(f.reports.at(-1),'turn');
  f.ui.reset();f.update(viewGame(s,other),other);const original=f.root.innerHTML;
  f.ui.updateActivity({playerId:actor,kind:'dice',expiresAt:Date.now()+12000});
  assert.match(f.bar.innerHTML,/正在选择骰子动作/);assert.match(f.bar.innerHTML,/busy/);assert.equal(f.root.innerHTML,original);
  f.ui.updateActivity(null);assert.match(f.bar.innerHTML,/等待操作/);assert.doesNotMatch(f.bar.innerHTML,/busy/);
});
test('对手动画先呈现，之后再弹出迎客；回放不提交或改变对局',async t=>{
  const f=fixture(t),s=ready(),viewer=s.turn.playerId,other=s.players.find(p=>p.id!==viewer).id,g=viewGame(s,viewer);
  g.activePlayerId=other;g.turn.playerId=other;f.update(g,viewer);
  const next=structuredClone(g),id=next.activity.serial+1;next.activePlayerId=viewer;next.turn.playerId=viewer;next.turn.number++;
  next.activity.events.push({id,group:99,playerId:other,round:1,kind:'die',face:2,text:'对手取走2点骰。'});next.activity.serial=id;
  const before=JSON.stringify(next);f.update(next,viewer);assert.match(f.bar.innerHTML,/行动回放/);assert.match(f.bar.innerHTML,/对手取走2点骰/);assert.doesNotMatch(f.root.innerHTML,/aria-label="回合开始 · 迎接客人"/);
  f.drain();assert.match(f.root.innerHTML,/aria-label="回合开始 · 迎接客人"/);assert.equal(JSON.stringify(next),before);assert.deepEqual(f.sent,[]);
  await f.click('close');await f.click('activity-replay');assert.match(f.bar.innerHTML,/行动回放/);await f.click('activity-stop');assert.doesNotMatch(f.bar.innerHTML,/行动回放/);assert.deepEqual(f.sent,[]);
});
