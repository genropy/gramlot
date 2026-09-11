// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import {dataScopeJson} from '../src/components/data-scope.js';
import '../src/collections/layout.js';
import '../src/collections/inputs.js';
import '../src/collections/clipboard.js';

function mount(options = {}) {
    setupDom();
    let groupNode;
    class Page extends HtmlBuilder {
        static wc_requires = ['layout','inputs'];
        setup() {
            const selection=new Bag({note:'Initial',nested:new Bag({value:42}),empty:null});
            selection.setItem('day',new Date('2026-03-21T00:00:00Z'));
            this.setData('selection',selection);
            this.setData('private',new Bag({secret:'Excluded'}));
        }
        main(root) {
            groupNode=root.groupBox({lbl:'Result',datapath:'selection',copy:true,draggable:true,...options});
            groupNode.textBox({value:'^selection.note'});
        }
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('group'));
    return {app,host,groupNode,group:host.querySelector('gnr-groupbox')};
}
function drag(target) {
    const values=new Map();
    const event=new Event('dragstart',{bubbles:true,composed:true,cancelable:true});
    Object.defineProperty(event,'dataTransfer',{value:{setData:(type,value)=>values.set(type,value)}});
    target.dispatchEvent(event);
    return {event,values};
}

test('group copy reads the entire current scoped Bag independently of visible fields', async () => {
    const {app,group}=mount();let text;
    Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async value=>{text=value;}}});
    assert.equal(group.decoration.label.style.textAlign,'center');
    assert.equal(group.decoration.label.textContent,'Result');
    assert.equal(group.decoration.labelRegion,group._header);
    assert.equal(group._copy.hidden,false);
    app.live(()=>app.data.setItem('group.selection.unshown','Included'));
    await group.copyData();
    assert.deepEqual(JSON.parse(text),{day:'2026-03-21T00:00:00.000Z',note:'Initial',nested:{value:42},empty:null,unshown:'Included'});
    assert.equal(text.includes('Excluded'),false);
    app.dispose();
});

test('shared decoration and runtime patches retain focused children and refresh scope', async () => {
    const {app,group,groupNode,host}=mount();let text;
    Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async value=>{text=value;}}});
    const input=group.querySelector('gnr-textbox').fieldControl;
    input.focus(); input.value='Draft';
    app.live(()=>groupNode.setAttr({lbl:'Changed',lbl_variant:'underline'}));
    assert.equal(host.querySelector('gnr-groupbox'),group);
    assert.equal(group.querySelector('gnr-textbox').fieldControl,input);
    assert.equal(input.value,'Draft');
    await Promise.resolve();
    assert.equal(group.decoration.label.textContent,'Changed');
    assert.equal(group.decoration.label.hasAttribute('variant'),false);
    app.live(()=>groupNode.setAttr({datapath:'private'}));
    await group.copyData();assert.deepEqual(JSON.parse(text),{secret:'Excluded'});
    app.dispose();
});

test('missing, unresolved and scalar scopes reject actions without clipboard writes', async () => {
    for (const datapath of [null,'','.','selection.note']) {
        const {app,group}=mount({datapath});let writes=0,errors=0;
        Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async()=>writes++}});
        group.addEventListener('gnr-copy-error',()=>errors++);
        await group.copyData();
        assert.equal(writes,0);assert.equal(errors,1);
        assert.equal(drag(group._header).event.defaultPrevented,true);
        app.dispose();
    }
});

test('only enabled header drag supplies group metadata and JSON; never moves data', () => {
    const {app,group}=mount();
    const {event,values}=drag(group._header);
    assert.equal(event.defaultPrevented,false);
    assert.equal(event.dataTransfer.effectAllowed,'copy');
    const payload=JSON.parse(values.get('application/x-gramlot-group+json'));
    assert.equal(payload.datapath,'group.selection');assert.ok(payload.sourceId);
    assert.equal(payload.data.note,'Initial');
    assert.equal(app.data.getItem('group.selection.note'),'Initial');
    assert.equal(drag(group).event.defaultPrevented,true);
    assert.equal(drag(group._copy).event.defaultPrevented,true);
    assert.equal(drag(group.querySelector('gnr-textbox').fieldControl).event.defaultPrevented,true);
    group.setAttribute('draggable','false');
    assert.equal(drag(group._header).event.defaultPrevented,true);
    app.dispose();
});

test('copy is optional, respects disabled and ignores completion after disconnect', async () => {
    const {app,group}=mount({copy:false});let writes=0,finish;
    Object.defineProperty(window.navigator,'clipboard',{value:{writeText:()=>{writes++;return new Promise(resolve=>finish=resolve);}}});
    assert.equal(group._copy.hidden,true);await group.copyData();assert.equal(writes,0);
    group.setAttribute('copy','');group.setAttribute('disabled','');await group.copyData();assert.equal(writes,0);
    group.removeAttribute('disabled');const pending=group.copyData();assert.equal(writes,1);
    let copied=0;group.addEventListener('gnr-copied',()=>copied++);group.remove();finish();await pending;
    assert.equal(copied,0);assert.equal(group._busy,false);
    document.body.append(group);assert.ok(group.decoration.observer);
    app.dispose();group.remove();
});

test('values-only JSON rejects ambiguous or unsupported values and omits Bag attributes', () => {
    const bag=new Bag();bag.setItem('value',2,{caption:'Not a value'});
    assert.equal(dataScopeJson(bag),'{\n  "value": 2\n}');
    for(const value of [undefined,NaN,Infinity,1n,new Map(),()=>{}, {bad:undefined}]) {
        assert.throws(()=>dataScopeJson(value),/Unsupported/);
    }
    const cycle={};cycle.self=cycle;assert.throws(()=>dataScopeJson(cycle),/Cyclic/);
    const duplicate=new Bag({same:1,other:2});duplicate.getNodes()[1].label='same';
    assert.throws(()=>dataScopeJson(duplicate),/Duplicate/);
});
