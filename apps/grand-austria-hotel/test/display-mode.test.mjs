import test from 'node:test';
import assert from 'node:assert/strict';
import {initDisplayMode} from '../public/display-mode.mjs';

function fixture(){
  class Element extends EventTarget{constructor(){super();this.attrs={};this.textContent='';this.hidden=true;this.disabled=false;}setAttribute(k,v){this.attrs[k]=v;}}
  const nodes=Object.fromEntries(['toggle-fullscreen','fullscreen-label','fullscreen-hint'].map(k=>[k,new Element()]));
  const classes=new Set(),doc=new EventTarget();
  doc.getElementById=k=>nodes[k];doc.documentElement={};
  doc.body={classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}}};
  return {doc,nodes,classes};
}
test('unsupported browsers enter and exit immersive layout without losing the exit control',async()=>{
  const f=fixture(),mode=initDisplayMode(f.doc);
  await mode.toggle();assert.ok(f.classes.has('display-active'));assert.equal(f.nodes['fullscreen-label'].textContent,'退出全屏');assert.equal(f.nodes['toggle-fullscreen'].attrs['aria-pressed'],'true');assert.match(f.nodes['fullscreen-hint'].textContent,/地址栏/);
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
