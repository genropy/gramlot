import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../js/dom/tests/dom.js';
import {Application, SourceBag, wrapSource} from 'gramlot-dom';
import {fromTytx} from 'genro-tytx';
import {messageBoxRecipe} from '../docs/examples/recipes/recipe.js';

setupDom();
const {GramlotBuilder} = await import('../js/pages/src/builder.js');
const builder = new GramlotBuilder('example');
builder.loadSource(fromTytx(readFileSync(0, 'utf8'), 'json'));
const host = document.body.appendChild(document.createElement('main'));
const app = new Application(host, builder, {inspector: false});
app.live(() => {
    for (const key of ['first', 'second']) {
        messageBoxRecipe(wrapSource(builder.source), {datapath: `javascript.${key}`, showDetail: '^showDetail'});
    }
});
const boxes = builder.source.getNodes();
assert.equal(boxes.length, 4);
for (const box of boxes) {
    assert.equal(box.nodeTag, 'div');
    assert.ok(box.value instanceof SourceBag);
    const component = box.value.getNodes().find(node => node.nodeTag === 'textBox');
    assert.ok(component);
    assert.equal(component.value instanceof SourceBag, false, 'component internals must not expand in Source');
}
const fields = [...host.querySelectorAll('gnr-textbox')];
for (let i = 0; i < fields.length; i++) {
    const input = fields[i].shadowRoot.querySelector('input');
    input.value = `Edited ${i}`;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
}
const paths = ['python.first', 'python.second', 'javascript.first', 'javascript.second'];
paths.forEach((path, i) => assert.equal(app.data.getItem(`example.${path}.message`), `Edited ${i}`));
const tags = box => box.value.getNodes().map(node => node.nodeTag);
const originalInputs = fields.map(field => field.shadowRoot.querySelector('input'));
for (let cycle = 0; cycle < 3; cycle++) {
    app.live(() => app.data.setItem('example.showDetail', true));
    for (const box of boxes.slice(2)) assert.equal(tags(box).filter(tag => tag === 'p').length, 1);
    assert.deepEqual([...host.querySelectorAll('.detail')].map(el => el.textContent), ['Edited 1', 'Edited 2', 'Edited 3']);
    app.live(() => app.data.setItem('example.showDetail', false));
    for (const box of boxes.slice(2)) assert.equal(tags(box).includes('p'), false);
    assert.equal(tags(boxes[1]).includes('p'), true, 'Python build-time node remains');
}
fields.forEach((field, i) => assert.equal(field.shadowRoot.querySelector('input'), originalInputs[i]));
host.querySelectorAll('button')[2].click();
assert.equal(app.data.getItem('example.javascript.first.message'), 'Hello');
assert.equal(app.data.getItem('example.javascript.second.message'), 'Edited 3');
app.live(() => builder.source.pop(boxes[2].label));
assert.equal(app.data.getItem('example.javascript.first.message'), 'Hello', 'Source removal retains Data');
app.live(() => app.data.setItem('example.showDetail', true));
assert.equal(host.querySelectorAll('.message-box').length, 3);
assert.equal(host.querySelectorAll('.detail').length, 2, 'removed recipe must not resurrect');
app.dispose();
console.log('Recipe expansion, Python bindings, isolated instances, live structure and cleanup passed.');
