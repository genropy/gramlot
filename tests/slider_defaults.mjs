// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {Application, HtmlBuilder} from 'gramlot-dom';
import '/_assets/dom/collections/inputs.js';
import {fromTytx} from 'genro-tytx';
setupDom();
const message = JSON.parse(readFileSync(0, 'utf8'));
const bytes = Buffer.from(message.payload, 'base64');
class Page extends HtmlBuilder { static wc_requires = ['inputs']; }
const page = new Page('main');
page.loadSource(fromTytx(message.transport === 'json' ? bytes.toString() : bytes, message.transport));
const host = document.body.appendChild(document.createElement('div'));
const app = new Application(host,page);
for (const name of ['horizontalSlider','verticalSlider']) {
    const widget = host.querySelector(`gnr-${name.toLowerCase()}`);
    const input = widget.shadowRoot.querySelector('input');
    assert.equal(input.min, '10'); assert.equal(input.max,'48'); assert.equal(input.step,'1');
    assert.equal(page.data.getItem(`${name}.size`),20);
    assert.equal(input.labels[0].textContent,name);
    input.value = '31'; input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal(page.data.getItem(`${name}.size`),31);
}
assert.equal(page.data.getItem('color'),'red');
assert.equal(host.lastElementChild.style.color,'red');
app.dispose();
assert.equal(host.childNodes.length,0);
console.log('verified');
