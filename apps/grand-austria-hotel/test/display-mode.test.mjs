import test from 'node:test';
import assert from 'node:assert/strict';
import {initDisplayMode} from '../public/display-mode.mjs';

function fixture(){
  class Element extends EventTarget{constructor(){super();this.attrs={};this.textContent='';this.hidden=true;this.disabled=false;}setAttribute(k,v){this.attrs[k]=v;}focus(){this.focused=true;}}
  const nodes=Object.fromEntries(['toggle-fullscreen','fullscreen-label','fullscreen-hint'].map(k=>[k,new Element()]));
  const classes=new Set(),doc=new EventTarget();
  doc.getElementById=k=>nodes[k];doc.documentElement={};
  doc.body={classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}}};
  return {doc,nodes,classes};
}
test('unsupported browsers enter and exit immersive layout without losing the exit control',async()=>{
  const f=fixture(),mode=initDisplayMode(f.doc);
  await mode.toggle();assert.ok(f.classes.has('display-active'));assert.equal(f.nodes['fullscreen-label'].textContent,'退出沉浸');assert.equal(f.nodes['toggle-fullscreen'].attrs['aria-pressed'],'true');assert.match(f.nodes['fullscreen-hint'].textContent,/添加到主屏幕/);
  await mode.toggle();assert.ok(!f.classes.has('display-active'));assert.equal(f.nodes['fullscreen-label'].textContent,'全屏');mode.dispose();
});
test('native fullscreen follows browser exit events',async()=>{
  const f=fixture();f.doc.documentElement.requestFullscreen=async()=>{f.doc.fullscreenElement=f.doc.documentElement;f.doc.dispatchEvent(new Event('fullscreenchange'));};
  f.doc.exitFullscreen=async()=>{f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));};
  const mode=initDisplayMode(f.doc);await mode.toggle();assert.ok(f.classes.has('display-active'));await mode.toggle();assert.ok(!f.classes.has('display-active'));
  await mode.toggle();f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(f.nodes['toggle-fullscreen'].attrs['aria-pressed'],'false');mode.dispose();
});
test('a rejected native request falls back and Escape restores the normal page',async()=>{
  const f=fixture();f.doc.documentElement.requestFullscreen=async()=>{throw new Error('Not allowed');};
  const mode=initDisplayMode(f.doc);await mode.toggle();assert.ok(f.classes.has('display-active'));assert.equal(f.nodes['toggle-fullscreen'].disabled,false);
  const key=new Event('keydown');Object.defineProperty(key,'key',{value:'Escape'});f.doc.dispatchEvent(key);assert.ok(!f.classes.has('display-active'));mode.dispose();
});
test('prefixed Safari fullscreen calls keep their document/element receiver',async()=>{
  const f=fixture();f.doc.documentElement.webkitRequestFullscreen=function(){assert.equal(this,f.doc.documentElement);f.doc.webkitFullscreenElement=this;f.doc.dispatchEvent(new Event('webkitfullscreenchange'));};
  f.doc.webkitExitFullscreen=function(){assert.equal(this,f.doc);this.webkitFullscreenElement=null;this.dispatchEvent(new Event('webkitfullscreenchange'));};
  const mode=initDisplayMode(f.doc);await mode.toggle();assert.ok(f.classes.has('display-active'));await mode.toggle();assert.ok(!f.classes.has('display-active'));mode.dispose();
});

test('repainting the game header moves the same fullscreen control and preserves its state and listener',()=>{
  const f=fixture(),home={append(node){node.parentElement=this;}},first={append:home.append},redrawn={append:home.append};
  const controls={parentElement:home};f.nodes['display-controls']=controls;
  const mode=initDisplayMode(f.doc);mode.mount(first);assert.equal(controls.parentElement,first);
  f.nodes['toggle-fullscreen'].dispatchEvent(new Event('click'));assert.ok(f.classes.has('display-active'));
  mode.mount(redrawn,{hidden:true});assert.equal(controls.parentElement,redrawn);assert.equal(controls.hidden,true);assert.equal(f.nodes['toggle-fullscreen'].attrs['aria-pressed'],'true');
  mode.mount(redrawn);assert.equal(controls.hidden,false);
  f.nodes['toggle-fullscreen'].dispatchEvent(new Event('click'));assert.ok(!f.classes.has('display-active'));
  mode.mount();assert.equal(controls.parentElement,home);mode.dispose();
});

test('iPhone fallback keeps home-screen instructions open until dismissed',async()=>{
  const f=fixture(),Element=f.nodes['toggle-fullscreen'].constructor;
  f.nodes['display-help']=new Element();f.nodes['display-help-close']=new Element();
  const controls={parentElement:{append(){}},hidden:false};f.nodes['display-controls']=controls;
  const mode=initDisplayMode(f.doc);await mode.toggle();
  assert.equal(f.nodes['display-help'].hidden,false);assert.equal(controls.hidden,true);
  assert.ok(f.nodes['display-help-close'].focused);
  f.nodes['display-help-close'].dispatchEvent(new Event('click'));
  assert.equal(f.nodes['display-help'].hidden,true);assert.equal(controls.hidden,false);
  assert.ok(f.classes.has('display-active'));
  mode.dispose();
});

test('home-screen launches hide the redundant fullscreen control across header remounts',()=>{
  const f=fixture(),win=new EventTarget();win.navigator={standalone:true};f.doc.defaultView=win;
  const controls={parentElement:{append(){}},hidden:false};f.nodes['display-controls']=controls;
  const mode=initDisplayMode(f.doc);assert.ok(f.classes.has('display-standalone'));assert.equal(controls.hidden,true);
  mode.mount({append(){}});assert.equal(controls.hidden,true);mode.dispose();
});

test('mobile table tracks visual viewport resizing and leaves pinch zoom alone',()=>{
  const f=fixture(),win=new EventTarget(),viewport=new EventTarget(),values={};
  Object.assign(win,{innerHeight:844,visualViewport:viewport});Object.assign(viewport,{height:660,scale:1});
  f.doc.defaultView=win;f.doc.documentElement.style={setProperty(k,v){values[k]=v;}};
  const mode=initDisplayMode(f.doc);assert.equal(values['--game-viewport-height'],'660px');
  viewport.height=740;viewport.dispatchEvent(new Event('resize'));assert.equal(values['--game-viewport-height'],'740px');
  viewport.scale=2;viewport.height=370;viewport.dispatchEvent(new Event('resize'));assert.equal(values['--game-viewport-height'],'740px');
  mode.dispose();viewport.scale=1;viewport.height=600;viewport.dispatchEvent(new Event('resize'));assert.equal(values['--game-viewport-height'],'740px');
});
