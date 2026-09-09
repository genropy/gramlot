// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {Application, HtmlBuilder} from 'gramlot-dom';
import '/_assets/dom/collections/inputs.js';
import '/_assets/dom/collections/colorpicker.js';
import {fromTytx} from 'genro-tytx';

setupDom();
const message = JSON.parse(readFileSync(0, 'utf8'));
const bytes = Buffer.from(message.payload, 'base64');
const source = fromTytx(message.transport === 'json' ? bytes.toString() : bytes, message.transport);
class Widgets extends HtmlBuilder {
    static wc_requires = ['inputs', 'colorpicker'];
    setup() { this.setData('caption', 'MyText'); this.setData('position', 'TL'); }
}
const builder = new Widgets('main');
builder.loadSource(source);
const host = document.body.appendChild(document.createElement('div'));
const app = new Application(host, builder);
const field = host.querySelector('gnr-textbox');
const control = field.shadowRoot.querySelector('input');
const label = field.shadowRoot.querySelector('label');
assert.equal(control.value, 'Hello World');
assert.equal(control.readOnly, true);
assert.equal(label.control, control);
assert.equal(label.textContent, 'MyText');
assert.equal(label.style.color, 'gray');
assert.equal(label.parentElement.style.padding, '8px');
assert.equal(label.parentElement.style.flexDirection, 'column');
control.focus();
app.live(() => { app.data.setItem('main.caption', 'Changed'); app.data.setItem('main.position', 'BR'); });
assert.equal(host.querySelector('gnr-textbox'), field);
assert.equal(field.shadowRoot.activeElement, control);
assert.equal(label.textContent, 'Changed');
assert.equal(label.parentElement.style.flexDirection, 'column-reverse');
assert.equal(label.style.textAlign, 'right');
const picker = host.querySelector('gnr-colorpicker');
assert.equal(picker.shadowRoot.querySelector('label').control, picker.shadowRoot.querySelector('input'));
app.dispose();
assert.equal(host.children.length, 0);
console.log(JSON.stringify({readonly: control.readOnly, label: label.textContent, position: 'BR'}));
