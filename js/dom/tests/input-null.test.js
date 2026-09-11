// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: null and empty are different values through real widget bindings.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {HtmlBuilder, Application} from '../src/index.js';
import '../src/collections/inputs.js';
import '../src/collections/colorpicker.js';
function mount(tag, value, attrs = {}) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs', 'colorpicker'];
        setup() { this.setData('value', value); }
        main(root) { root[tag]({value:'^value', lbl:'Value', values:'a:Alpha,b:Beta', ...attrs}); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('form'));
    const field = host.firstElementChild;
    return {app, field, input:field.shadowRoot.querySelector('input'), host};
}
const fire = (input, type) => input.dispatchEvent(new window.Event(type, {bubbles:true, composed:true}));
const back = (input, options={}) => input.dispatchEvent(new window.KeyboardEvent('keydown', {
    key:'Backspace', bubbles:true, composed:true, cancelable:true, ...options}));
const tags = ['textBox','passwordbox','numberTextBox','dateTextBox','timeTextBox',
    'comboBox','filteringSelect','checkbox','horizontalSlider','verticalSlider','colorpicker'];
for (const tag of tags) test(`${tag}: renders actual null without a null button`, () => {
    const {app,field,input}=mount(tag,null);
    assert.equal(field.value,null);
    assert.equal(input.classList.contains('gnr-null-value'),true);
    assert.match(input.getAttribute('aria-description'),/Null value/);
    assert.equal(field.shadowRoot.querySelector('button.gnr-null-action'),null);
    assert.equal(app.data.getItem('form.value'),null);
    app.dispose();
});
test('a fresh Backspace on empty commits null on blur, and typing restores a string', () => {
    const {app,field,input}=mount('textBox','');
    back(input,{repeat:true}); assert.equal(field.value,'');
    back(input,{isComposing:true}); assert.equal(field.value,'');
    input.value='x'; back(input); assert.equal(field.value,'x');
    input.value=''; fire(input,'input');
    assert.equal(field.value,'');
    back(input);
    assert.equal(field.value,null);
    assert.equal(app.data.getItem('form.value'),'');
    fire(input,'blur');
    assert.equal(app.data.getItem('form.value'),null);
    input.value='null'; fire(input,'input'); fire(input,'change');
    assert.equal(app.data.getItem('form.value'),'null');
    assert.equal(input.classList.contains('gnr-null-value'),false);
    app.dispose();
});
test('input binding publishes explicit null immediately without losing identity', () => {
    const {app,field,input,host}=mount('textBox','',{updateOn:'input'});
    back(input);
    assert.equal(app.data.getItem('form.value'),null);
    assert.equal(host.firstElementChild,field);
    app.live(()=>app.data.setItem('form.value',''));
    assert.equal(host.firstElementChild.value,'');
    assert.equal(host.firstElementChild.shadowRoot.querySelector('input').classList.contains('gnr-null-value'),false);
    app.dispose();
});
for (const [tag,value,next] of [['numberTextBox',0,42],['checkbox',false,true],
    ['horizontalSlider',0,35],['colorpicker','#000000','#ff0000'],['dateTextBox','2026-09-08','2026-09-09']]) {
    test(`${tag}: Backspace preserves real scalar values on the next interaction`, () => {
        const {app,field,input}=mount(tag,value);
        assert.equal(tag==='dateTextBox' ? field.value.toISOString().slice(0,10) : field.value,value);
        if (!['checkbox','horizontalSlider','colorpicker'].includes(tag)) { input.value=''; fire(input,'input'); }
        back(input);
        if(tag==='dateTextBox') {
            input.focus();
            document.body.appendChild(document.createElement('button')).focus();
        } else fire(input,'blur');
        assert.equal(app.data.getItem('form.value'),null);
        if(tag==='checkbox') input.checked=next;
        else input.value=String(next);
        fire(input,'input'); fire(input,'change');
        if(tag==='dateTextBox') {
            input.focus();
            document.body.appendChild(document.createElement('button')).focus();
        }
        const committed=app.data.getItem('form.value');
        assert.equal(tag==='dateTextBox' ? committed.toISOString().slice(0,10) : committed,next);
        app.dispose();
    });
}
for(const tag of ['filteringSelect','comboBox']) test(`${tag}: Backspace and next option preserve the code`,()=>{
    const {app,field,input}=mount(tag,'a');
    input.value=''; fire(input,'input'); back(input); fire(input,'blur');
    assert.equal(app.data.getItem('form.value'),null);
    field.shadowRoot.querySelector('.choice-toggle').click();
    field.shadowRoot.querySelector('[role=option]').click();
    assert.equal(app.data.getItem('form.value'),tag==='filteringSelect' ? 'a' : 'Alpha');
    app.dispose();
});
for(const attr of ['readonly','disabled']) test(`${attr} prevents null writes`,()=>{
    const {app,field,input}=mount('textBox','',{[attr]:true});
    back(input); fire(input,'blur');
    assert.equal(app.data.getItem('form.value'),'');
    app.dispose();
});

test('dtype does not collapse an explicitly emptied widget to null',()=>{
    const {app,field,input}=mount('numberTextBox',1,{dtype:'L'});
    input.value=''; fire(input,'input'); fire(input,'change');
    assert.equal(app.data.getItem('form.value'),'');
    back(input); fire(input,'blur');
    assert.equal(app.data.getItem('form.value'),null);
    assert.equal(field.value,null);
    app.dispose();
});
