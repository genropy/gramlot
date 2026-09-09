// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: typed source and data cross the WSX text envelope via real codecs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const base = pathToFileURL(`${process.argv[2]}/`);
const {Bag} = await import(new URL('genro-bag-js/src/index.js', base));
const {fromTytx, toTytx, isDecimal} = await import(new URL('genro-tytx/js/src/index.js', base));
const {setupDom} = await import(new URL('gramlot-dom/tests/dom.js', base));
const {Application, HtmlBuilder} = await import(new URL('gramlot-dom/src/index.js', base));
const wire = readFileSync(0, 'utf8');
assert.ok(wire.startsWith('WSX://'));
const envelope = JSON.parse(wire.slice(6));
assert.equal(envelope.page_id, 'probe-page');
const payload = fromTytx(envelope.data, 'json');
const source = payload.source;
assert.ok(source instanceof Bag);
assert.ok(payload.data instanceof Bag);
assert.ok(payload.data.getItem('record.when') instanceof Date);
assert.ok(isDecimal(payload.data.getItem('record.amount')));
assert.equal(payload.data.getItem('record.amount').toString(), '1234567890.123456789');
assert.ok(payload.data.getItem('record.branch') instanceof Bag);
assert.equal(payload.data.getItem('record.empty'), null);
assert.ok(payload.binary instanceof Uint8Array);
assert.equal(payload.binary.length, 256);

setupDom();
const builder = new HtmlBuilder('main');
builder.loadSource(source);
const root = document.createElement('div');
const app = new Application(root, builder);
assert.equal(root.querySelector('h1').textContent, 'Hello World');
const input = root.querySelector('input[placeholder]');
input.value = 'Hello Astra';
input.dispatchEvent(new Event('input', {bubbles: true}));
assert.notEqual(app.data.getItem('main.title'), 'Hello Astra');
input.dispatchEvent(new Event('change', {bubbles: true}));
assert.equal(app.data.getItem('main.title'), 'Hello Astra');
const echo = builder.nodeById('title_echo');
assert.equal(root.querySelector(`#${builder.targetId(echo)}`).textContent, 'Hello Astra');
payload.data.setItem('record.phone', '0456');
process.stdout.write('WSX://' + JSON.stringify({
    id: envelope.id, status: 200, data: toTytx(payload, 'json'),
}));
