// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: edit actual application Bags through the Python-authored inspector.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
setupDom();
const {fromTytx} = await import('genro-tytx');
const {Bag} = await import('genro-bag-js');
const {Application} = await import('gramlot-dom');
const {mountInspector} = await import('../js/pages/src/inspector.js');
const {GramlotBuilder} = await import('../js/pages/src/builder.js');
class Example extends GramlotBuilder {
    setup() { this.setData('amount', 12.5); this.setData('color', 'red'); }
    main(root) {
        root.div('^amount', {color:'^color'});
        root.input({value:'^amount', type:'number'});
        root.textBox({value:'^amount', lbl:'Amount', lbl_position:'TL'});
    }
}
const pageHost = document.createElement('div');
const host = document.createElement('div');
document.body.append(pageHost, host);
const builder = process.env.INSPECTOR_PAGE_SOURCE ? new GramlotBuilder('page') : new Example('page');
if (process.env.INSPECTOR_PAGE_SOURCE) builder.loadSource(fromTytx(process.env.INSPECTOR_PAGE_SOURCE, 'json'));
const page = new Application(pageHost, builder);
page.live(() => { builder.data.setItem('amount', 12.5); builder.data.setItem('color', 'red'); });
const originalRecipe = readFileSync(0, 'utf8');
const tool = mountInspector(host, fromTytx(originalRecipe, 'json'), page);
host.querySelector('[data-inspector="toggle"]').click();
assert.equal(host.querySelector('[data-inspector="data-editor"]').hasAttribute('aria-disabled'), false,
    'empty selection must not disable the tree through inherited ARIA');
const select = (kind, path) => tool.app.live(() => tool.app.builder.data.setItem(kind + 'Path', path));
const editor = kind => host.querySelector(`[data-inspector="${kind}-editor"]`);
const rows = kind => editor(kind).querySelector('[data-field="rows"]').shadowRoot;
const field = (kind, name) => editor(kind).querySelector(`[data-field="${name}"]`) || rows(kind).querySelector(`[data-field="${name}"]`);
const fill = (kind, name, value) => {
    const input = field(kind, name);
    if (!input) return;
    if(input.type==='checkbox')input.checked=value==='true';else input.value = value;
    input.dispatchEvent(new window.Event('input', {bubbles:true, composed:true}));
};
const click = (kind, name) => {
    if (name === 'apply') {field(kind, 'value').dispatchEvent(new window.FocusEvent('focusout',{bubbles:true,composed:true}));return;}
    if (name === 'reload') {const path=tool.app.builder.data.getItem(kind+'Path');select(kind,'');select(kind,path);return;}
    editor(kind).querySelector(`[data-command="${name}"]`).click();
};
const attributeRow = (kind, name) => Array.from(rows(kind).querySelectorAll('[data-property="attribute"]'))
    .find(row => row.querySelector('[data-cell="name"]').value === name);
const editCell = (row, cell, value) => {
    const input = row.querySelector(`[data-cell="${cell}"]`);
    if (!input) return;
    if(input.type==='checkbox')input.checked=value==='true';else input.value = value;
    input.dispatchEvent(new window.Event('input', {bubbles:true, composed:true}));
};
// Same Bag contracts, exercised through the new directly editable property cells.
const stage = (kind, name, type, text) => {
    let row = attributeRow(kind, name);
    if (!row) {
        click(kind, 'add');
        row = rows(kind).querySelector('[data-property="attribute"]:last-child');
        editCell(row, 'name', name);
    }
    editCell(row, 'type', type==='null'?'string':type);
    editCell(row, 'value', text);
    if(type==='null')row.querySelector('[data-cell="value"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true}));
};
const removeAttribute = (kind, name) => attributeRow(kind, name).querySelector('[data-cell="remove"]').click();
select('data', 'amount');
assert.equal(field('data', 'value').type, 'number');
assert.equal(field('data', 'value-type'),null);
fill('data', 'value', '1234.56');
assert.equal(builder.data.getItem('amount'), 12.5, 'explicit Apply required');
for (let i = 0; i < 2; i++) document.dispatchEvent(new window.KeyboardEvent('keydown', {
    key:'D', ctrlKey:true, shiftKey:true, bubbles:true, cancelable:true}));
assert.equal(field('data', 'value').value, '1234.56', 'draft survives palette toggle');
click('data', 'apply');
assert.equal(builder.data.getItem('amount'), 1234.56);
assert.equal(pageHost.querySelector('div').textContent, '1234.56');
// The reverse direction uses normal input write-back, then inspector observation.
const input = pageHost.querySelector('input');
input.value = '88';
input.dispatchEvent(new window.Event('change', {bubbles:true}));
assert.equal(field('data', 'value').value, '88');
for (const [initial, text, expected] of [[false,'false',false],[null,null,null],['0042','0042','0042'],[0,'0',0]]) {
    page.live(()=>builder.data.setItem('amount',initial));
    if(text!==null){fill('data','value',text);click('data','apply');}
    assert.equal(builder.data.getItem('amount'),expected);
}
stage('data', 'nullable', 'null', '');
stage('data', 'enabled', 'boolean', 'true');
click('data', 'apply');
assert.equal(builder.data.getNode('amount').attr.nullable, null);
assert.equal(builder.data.getNode('amount').attr.enabled, true);
removeAttribute('data', 'enabled');
click('data', 'apply');
assert.equal(Object.hasOwn(builder.data.getNode('amount').attr, 'enabled'), false);
// A bad staged attribute cannot partially commit a valid value or attribute.
fill('data', 'value', '32');
stage('data', 'good', 'string', 'valid');
stage('data', 'bad', 'number', 'not a number');
click('data', 'apply');
assert.equal(builder.data.getItem('amount'), 0);
assert.equal(Object.hasOwn(builder.data.getNode('amount').attr, 'good'), false);
assert.match(field('data', 'status').textContent, /Invalid number/);
click('data', 'reload');
fill('data', 'value', '51');
page.live(() => builder.data.setItem('amount', 50));
assert.equal(field('data', 'value').value, '51');
assert.match(field('data', 'status').textContent, /outside this draft/);
click('data', 'apply');
assert.equal(builder.data.getItem('amount'), 50);
click('data', 'reload');
assert.equal(field('data', 'value').value, '50');
// Source attributes use the runtime, including deleting an actual rendered style.
const resultNode = builder.source.getNode('div_0');
assert.ok(resultNode);
select('source', 'div_0');
stage('source', 'color', 'string', 'blue');
click('source', 'apply');
assert.equal(pageHost.querySelector('div').style.color, 'blue');
removeAttribute('source', 'color');
click('source', 'apply');
assert.equal(pageHost.querySelector('div').style.color, '');
// Binding replacement is an intentional Source edit.
stage('source', 'color', 'string', 'green');
click('source', 'apply');
page.live(() => builder.data.setItem('amount', 70));
page.live(() => builder.data.setItem('color', 'orange'));
assert.equal(pageHost.querySelector('div').style.color, 'green');

fill('source', 'value', 'Static source text');
click('source', 'apply');
assert.equal(pageHost.querySelector('div').textContent, 'Static source text');
// Render-time errors restore the selected node through ordinary Bag APIs.
select('source', 'textBox_0');
const priorWidget = pageHost.querySelector('gnr-textbox');
const widgetSource = builder.source.getNode('textBox_0');
const priorAttributes = {...widgetSource.attr};
stage('source', 'lbl_position', 'string', 'diagonal');
click('source', 'apply');
assert.deepEqual(widgetSource.attr, priorAttributes);
assert.match(field('source', 'status').textContent, /previous node was restored/);
assert.equal(pageHost.querySelector('gnr-textbox'), priorWidget);
assert.equal(priorWidget.shadowRoot.querySelector('.labledBox_label').textContent, 'Amount');
assert.equal(priorWidget.getAttribute('lbl_position'), 'TL');
// Complex node values and attributes cannot be edited or removed.
page.live(() => builder.data.setItem('complex', new Bag({child: 'kept'}), {object: {nested:true}}));
select('data', 'complex');
assert.equal(field('data', 'value').disabled, true);
const complexRow = attributeRow('data', 'object');
assert.equal(complexRow.querySelector('[data-cell="value"]').disabled, true);
assert.equal(complexRow.querySelector('[data-cell="remove"]').disabled, true);
// Attribute-only concurrent changes also invalidate the draft.
select('data', 'amount');
fill('data', 'value', '80');
page.live(() => builder.data.getNode('amount').setAttr({external:true}));
click('data', 'apply');
assert.equal(builder.data.getItem('amount'), 70);
click('data', 'reload');
fill('data', 'value', '90');
page.live(() => builder.data.popNode('amount'));
assert.equal(editor('data').disabled, true);
assert.match(field('data', 'status').textContent, /removed/);
page.live(() => builder.data.setItem('amount', 100));
assert.match(field('data', 'status').textContent, /outside this draft/);
// Reload remains reachable when a replacement node appears.
assert.equal(editor('data').disabled, false);
click('data', 'reload');
assert.equal(field('data', 'value').value, '100');
// Leaving a property row commits without Apply and updates both native/custom fields.
const leave = kind => field(kind, 'value').dispatchEvent(new window.FocusEvent('focusout', {
    bubbles:true, composed:true, relatedTarget:pageHost.querySelector('input')}));
fill('data', 'value', '246');
leave('data');
assert.equal(builder.data.getItem('amount'), 246, 'focus-out commits the typed value');
assert.equal(pageHost.querySelector('input').value, '246');
assert.equal(pageHost.querySelector('gnr-textbox').shadowRoot.querySelector('input').value, '246');
fill('data', 'value', 'invalid');
leave('data');
assert.equal(builder.data.getItem('amount'), 246, 'invalid blur preserves the store');
assert.match(field('data', 'status').textContent, /Invalid number/);
fill('data', 'value', '247');
leave('data');
assert.equal(builder.data.getItem('amount'), 247, 'correction commits on the next blur');
select('source', 'div_0');
stage('source', 'color', 'string', 'purple');
attributeRow('source', 'color').querySelector('[data-cell="value"]').dispatchEvent(
    new window.FocusEvent('focusout', {bubbles:true, composed:true}));
assert.equal(pageHost.querySelector('div').style.color, 'purple', 'Source blur updates rendering');
tool.dispose();
page.live(() => builder.data.setItem('amount', 101));
assert.equal(host.children.length, 0);
page.dispose();
console.log('Inspector editing contract passed.');
