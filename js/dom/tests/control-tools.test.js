import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {ControlTools, getComponentBases} from '../src/index.js';

function standalone() {
    setupDom();
    const host=document.body.appendChild(document.createElement('div'));
    host.attachShadow({mode:'open'});
    const control=host.shadowRoot.appendChild(document.createElement('input'));
    let leaves=0, cancels=0;
    const tools=new ControlTools(host,control,{onLeave:()=>leaves++,onCancel:()=>cancels++});
    tools.connect();
    return {host,control,tools,get leaves(){return leaves;},get cancels(){return cancels;}};
}

test('tools can be installed dynamically and contain multiple popup and action tools', () => {
    const state=standalone(), {host,control,tools}=state;
    assert.equal(control.parentNode,tools.element); assert.equal(tools.element.parentNode,host.shadowRoot);
    const first=tools.add({label:'First',content:document.createElement('input')});
    const second=tools.add({label:'Second',content:document.createElement('button')});
    assert.notEqual(first.popup.id,second.popup.id);
    const oldId=second.popup.id; first.remove();
    const third=tools.add({label:'Third',content:document.createElement('input')});
    assert.notEqual(third.popup.id,oldId);
    let actions=0;
    const action=tools.add({label:'Action',action:()=>actions++});
    assert.equal(action.popup,null); action.button.click(); assert.equal(actions,1);
    second.open(); third.open(); assert.equal(second.isOpen,false); assert.equal(third.isOpen,true);
    host.setAttribute('readonly',''); tools.sync();
    assert.equal(third.isOpen,false); assert.equal(action.button.disabled,true);
    action.button.click(); assert.equal(actions,1); tools.disconnect();
});

test('shared boundary coalesces outside pointer, focus and delayed native dismissal', () => {
    const state=standalone(), {control,tools}=state;
    const content=document.createElement('input'), tool=tools.add({label:'Tool',content});
    control.focus(); tool.button.focus(); tool.open();
    assert.equal(state.leaves,0);
    const outside=document.body.appendChild(document.createElement('button'));
    outside.dispatchEvent(new window.Event('pointerdown',{bubbles:true,composed:true})); outside.focus();
    const toggle=new window.Event('toggle'); Object.defineProperty(toggle,'newState',{value:'closed'});
    tool.popup.dispatchEvent(toggle); assert.equal(state.leaves,1);
    tool.open();
    // A real browser exposes the actual open state even if an old event is queued.
    tool.popup.showPopover=()=>{}; tool.popup.matches=()=>true;
    tool.popup.dispatchEvent(toggle); assert.equal(tool.isOpen,true); assert.equal(state.leaves,1);
    content.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(state.cancels,1); assert.equal(state.leaves,1); assert.equal(tool.isOpen,false);
    tools.disconnect();
    outside.dispatchEvent(new window.Event('pointerdown',{bubbles:true,composed:true})); assert.equal(state.leaves,1);
});

test('ControlElement installs tools after mount without losing input or decoration', () => {
    setupDom(); const {ControlElement}=getComponentBases();
    customElements.define('test-control-tools',class extends ControlElement {});
    const host=document.body.appendChild(document.createElement('test-control-tools'));
    host.setAttribute('lbl','Value'); const input=host.fieldControl;
    const tools=host.installTools({}); tools.add({label:'Action',action:()=>{}});
    assert.equal(host.fieldControl,input); assert.equal(input.isConnected,true);
    assert.equal(tools.element.parentNode,host._content); assert.equal(tools.connected,true);
    host.setAttribute('disabled',''); assert.equal(tools.strip.firstElementChild.disabled,true);
    host.remove(); assert.equal(tools.connected,false);
});
