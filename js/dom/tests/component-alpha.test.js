// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {getComponentBases, Decorated, FieldState, registerComponentCollection,
    getComponentDescriptions, getCollection, builtinComponents} from '../src/index.js';
for (const module of ['inputs','layout','colorpicker','clipboard','palette','storetree','forms']) {
    await import(`../src/collections/${module}.js`);
}

test('every framework collection activates described implementations in independent DOM realms', () => {
    for (let realm = 0; realm < 2; realm++) {
        setupDom();
        for (const name of ['inputs','layout','colorpicker','clipboard','palette','storeTree','forms']) {
            const collection = getCollection(name);
            collection.defineComponents(); collection.defineComponents();
            assert.deepEqual(getComponentDescriptions(name).map(item=>item.name), builtinComponents(name).map(item=>item.name));
            for (const description of collection.components) {
                const implementation = customElements.get(description.tag);
                assert.equal(implementation.gramlotComponent, description);
                assert.equal(collection.grammar.elements[description.name]._meta.render_tag,description.tag);
            }
        }
    }
});

test('external control uses the same registration, decoration and connection contract', () => {
    setupDom();
    const {ControlElement} = getComponentBases();
    let connects = 0, disposes = 0, callbacks = 0;
    class Counter extends ControlElement {
        onConnect() {
            connects++;
            const listener = () => callbacks++;
            this.ownerDocument.addEventListener('sample',listener);
            this.ownConnection(()=>{disposes++;this.ownerDocument.removeEventListener('sample',listener);});
        }
    }
    registerComponentCollection('alpha-external', {
        components:[{name:'alphaCounter',tag:'test-alpha-counter',capabilities:['control']}],
        defineComponents(){if(!customElements.get('test-alpha-counter'))customElements.define('test-alpha-counter',Counter);},
    });
    getCollection('alpha-external').defineComponents();
    const field=document.createElement('test-alpha-counter');
    field.setAttribute('lbl','Count');document.body.append(field);
    field.connectedCallback();
    assert.equal(connects,1);
    field.value=null;assert.equal(field.isNullValue,true);
    field.value='draft';field.fieldControl.focus();
    field.setAttribute('value','server');assert.equal(field.value,'draft');
    field.setFieldState({invalid:true,issues:[{message:'Required'}]});
    assert.equal(field.fieldControl.getAttribute('aria-invalid'),'true');
    assert.match(field.shadowRoot.textContent,/Required/);
    const control=field.fieldControl, decoration=field.decoration;
    field.remove();document.dispatchEvent(new Event('sample'));
    assert.equal(disposes,1);assert.equal(callbacks,0);
    document.body.append(field);document.dispatchEvent(new Event('sample'));
    assert.equal(connects,2);assert.equal(callbacks,1);
    assert.equal(field.fieldControl,control);assert.equal(field.decoration,decoration);
    field.remove();assert.equal(disposes,2);
});

test('description mistakes fail before collection installation', () => {
    assert.throws(()=>registerComponentCollection('invalid-alpha', {
        components:[{name:'valid',tag:'test-valid'},{name:'valid',tag:'test-second'}],defineComponents(){},
    }),/Duplicate/);
    assert.equal(getCollection('invalid-alpha'),undefined);
    assert.throws(()=>registerComponentCollection('invalid-alpha', {
        components:[{name:'valid',tag:'input'}],defineComponents(){},
    }),/Invalid/);
    setupDom();
    registerComponentCollection('missing-alpha',{components:[{name:'missing',tag:'test-missing'}],defineComponents(){}});
    assert.throws(()=>getCollection('missing-alpha').defineComponents(),/did not define/);
});

test('one native input event invalidates its registered field once', async () => {
    setupDom();
    const {Application, HtmlBuilder} = await import('../src/index.js');
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs'];
        main(root) { root.textBox({value:'^name', validate_notnull:true}); }
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('alpha'));
    const widget=host.querySelector('gnr-textbox');
    const field=widget._formField, generation=field.generation;
    widget.fieldControl.value='draft';
    widget.fieldControl.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal(field.generation,generation+1);
    assert.equal(field.editorDirty,true);
    app.dispose();
});
