// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
setupDom();
const {fromTytx} = await import('genro-tytx');
const {Application} = await import('gramlot-dom');
const {GramlotBuilder} = await import('../js/pages/src/builder.js');
const builder = new GramlotBuilder('main');
builder.loadSource(fromTytx(readFileSync(0,'utf8'),'json'));
const host = document.body.appendChild(document.createElement('div'));
const app = new Application(host,builder);
for(const field of host.querySelectorAll('[data-value-pointer]')) {
    assert.equal(field.value,null,field.localName);
    assert.equal(field.shadowRoot.querySelector('input').classList.contains('gnr-null-value'),true);
}
const field=host.querySelector('gnr-textbox');
const input=field.shadowRoot.querySelector('input');
input.value=''; input.dispatchEvent(new window.Event('input',{bubbles:true,composed:true}));
input.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(builder.data.getItem('sample.textBox'),'');
input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Backspace',bubbles:true}));
input.dispatchEvent(new window.Event('blur'));
assert.equal(builder.data.getItem('sample.textBox'),null);
const number=host.querySelector('gnr-numbertextbox').shadowRoot.querySelector('input');
number.value='0'; number.dispatchEvent(new window.Event('input',{bubbles:true,composed:true}));
number.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(builder.data.getItem('sample.numberTextBox'),0);
app.dispose();
