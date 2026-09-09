// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: every laboratory page mounts the real collection, not a placeholder.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const base = pathToFileURL(`${process.argv[2]}/`);
const {setupDom} = await import(new URL('gramlot-dom/tests/dom.js', base));
setupDom();
const {Application, HtmlBuilder, getCollection} = await import(new URL('gramlot-dom/src/index.js', base));
const {fromTytx} = await import(new URL('genro-tytx/js/src/index.js', base));
const collections = ['inputs', 'layout', 'colorpicker', 'storeTree', 'palette', 'clipboard'];
for (const name of collections) {
    await import(new URL(`gramlot-dom/src/collections/${name.toLowerCase()}.js`, base));
}
class GramlotBuilder extends HtmlBuilder { static wc_requires = collections; }
const transport = process.argv[3];
const tag = process.argv[4];
assert.ok(tag === 'button' || collections.some(name => getCollection(name).grammar.elements[tag]));
const source = fromTytx(transport === 'msgpack' ? readFileSync(0) : readFileSync(0, 'utf8'), transport);
const root = document.createElement('div');
document.body.appendChild(root);
const builder = new GramlotBuilder('main');
builder.loadSource(source);
new Application(root, builder);
assert.equal(root.querySelectorAll('.widget-test-card').length, 2);
const widgets = root.querySelectorAll(tag === 'button' ? '.widget-test-body button' : `gnr-${tag.toLowerCase()}`);
assert.ok(widgets.length >= 2, root.innerHTML.slice(0, 3500));
if (tag !== 'button') for (const widget of widgets) { assert.ok(widget.shadowRoot); }
await new Promise(resolve => setTimeout(resolve, 0));
const expectedRecipes = JSON.parse(process.argv[5]);
assert.deepEqual(Array.from(root.querySelectorAll('.python-recipe'), el => el.textContent), expectedRecipes);
for (const tabs of root.querySelectorAll('.widget-example-tabs')) {
    const live = tabs.querySelector(':scope > gnr-tab[key="live"]');
    const python = tabs.querySelector(':scope > gnr-tab[key="python"]');
    assert.equal(python.style.display, 'none');
    tabs.shadowRoot.querySelector('button[data-key="python"]').click();
    assert.equal(live.style.display, 'none');
    assert.equal(python.style.display, '');
    assert.ok(python.querySelector('.language-python'));
    assert.match(python.textContent, /def test_0[12]/);
    tabs.shadowRoot.querySelector('button[data-key="live"]').click();
    assert.equal(live.style.display, '');
}
if (tag === 'textBox') {
    const input = widgets[0].shadowRoot.querySelector('input');
    input.value = 'Indipendente';
    input.dispatchEvent(new Event('change', {bubbles: true}));
    const echoes = root.querySelectorAll('.widget-test-body pre');
    assert.equal(echoes[0].textContent, 'Indipendente');
    assert.equal(echoes[1].textContent, 'Hello Genro');
    assert.deepEqual(Array.from(root.querySelectorAll('.python-recipe'), el => el.textContent), expectedRecipes);
}
if (tag === 'button') {
    const buttons = () => [...root.querySelectorAll('.widget-test-body button')];
    buttons().find(button => button.textContent === 'Show message').click();
    assert.equal(root.querySelector('.widget-test-body pre').textContent, 'Hello Genro');
    buttons().find(button => button.textContent === 'Second').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(root.querySelector('gnr-stackcontainer').value, 'second');
    assert.match(root.textContent, /Visible: second/);
    buttons().find(button => button.textContent === 'Publish return').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(root.querySelector('gnr-stackcontainer').value, 'first');
}
console.log(JSON.stringify({tag, widgets: widgets.length}));
