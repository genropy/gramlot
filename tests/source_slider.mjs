import assert from 'node:assert/strict';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {Application} from 'gramlot-dom';
import {readFileSync} from 'node:fs';
import {fromTytx} from 'genro-tytx';
import {Bag} from 'genro-bag-js';
import {install} from '../docs/examples/teaching/assets/contact-data.js';

setupDom();
install(window);
const {GramlotBuilder} = await import('../js/pages/src/builder.js');
const host = document.body.appendChild(document.createElement('div'));
const builder = new GramlotBuilder('example');
builder.loadSource(fromTytx(readFileSync(0, 'utf8'), 'json'));
const app = new Application(host, builder, {inspector: false});
// jsdom disables native script execution; browser verification separately checks
// that the actual Python-authored script element executes when mounted.
new Function('window', host.querySelector('script').textContent)(window);
const cards = () => [...host.querySelectorAll('.contact-card')];
function slide(count) {
    const slider = host.querySelector('gnr-horizontalslider');
    slider.value = count;
    slider.dispatchEvent(new window.Event('input', {bubbles: true, composed: true}));
    assert.equal(app.data.getItem('example.visibleContacts'), count);
    assert.equal(cards().length, Math.min(count, app.data.getItem('example.contacts')?.length || 0));
}
function enter(widget, value) {
    widget._input.value = value;
    widget._input.dispatchEvent(new window.Event('input', {bubbles: true}));
    widget._input.dispatchEvent(new window.Event('change', {bubbles: true}));
}
assert.equal(cards().length, 0);
const initialContacts = new Bag();
for (let index = 1; index <= 10; index++) initialContacts.setItem(`c${index}`, new Bag());
app.live(() => app.data.setItem('example.contacts', initialContacts));
assert.equal(cards().length, 10); // Data trigger uses Bag length, not slider zero.
slide(3);
const original = cards();
assert.equal(host.querySelectorAll('gnr-textbox').length, 15);
const saved = ['Lovelace', 'Ada', 'London', '12345', 'ada@example.test'];
original[2].querySelectorAll('gnr-textbox').forEach((widget, index) => enter(widget, saved[index]));
const contact = app.data.getItem('example.contacts.c3');
assert.deepEqual(['surname', 'name', 'address', 'phone', 'email'].map(key => contact.getItem(key)), saved);
slide(1);
assert.strictEqual(cards()[0], original[0]);
assert.equal(original[2].isConnected, false);
assert.strictEqual(app.data.getItem('example.contacts.c3'), contact);
slide(3);
assert.strictEqual(cards()[0], original[0]);
assert.notStrictEqual(cards()[2], original[2]);
assert.deepEqual([...cards()[2].querySelectorAll('gnr-textbox')].map(widget => widget.value), saved);
for (let cycle = 0; cycle < 3; cycle++) { slide(0); slide(6); }
assert.deepEqual([...cards()[2].querySelectorAll('gnr-textbox')].map(widget => widget.value), saved);
const retained = cards()[0].querySelector('gnr-textbox');
retained._input.focus();
retained._input.value = 'Uncommitted draft';
slide(5);
assert.strictEqual(cards()[0].querySelector('gnr-textbox'), retained);
assert.equal(retained._input.value, 'Uncommitted draft');
assert.strictEqual(retained.shadowRoot.activeElement, retained._input);
const nativeRandom = Math.random;
try {
    // Both endpoints, then a repeated count: Data must refresh even without
    // a count change, and the previous larger dataset must be replaced.
    for (const random of [0.999, 0, 0.05]) {
        Math.random = () => random;
        const previousContacts = app.data.getItem('example.contacts');
        // Separate user actions, outside the 200ms immediate-button guard.
        await new Promise(resolve => setTimeout(resolve, 210));
        host.querySelector('button[data-command-node]').click();
        const count = 1 + Math.floor(random * 10);
        assert.equal(cards().length, count);
        assert.equal(app.data.getItem('example.visibleContacts'), count);
        const generated = app.data.getItem('example.contacts');
        assert.notStrictEqual(generated, previousContacts);
        assert.equal(generated.getNodes().length, count);
        const firstName = generated.getItem('c1.name');
        assert.ok(firstName);
        assert.equal(cards()[0].querySelectorAll('gnr-textbox')[1].value, firstName);
        assert.match(generated.getItem('c1.email'), /@example\.test$/);
    }
} finally { Math.random = nativeRandom; }
slide(2);
assert.equal(cards().length, 1); // Iteration never invents rows outside the Bag.
enter(cards()[0].querySelector('gnr-textbox'), 'Preserved');
slide(0);
slide(1);
assert.equal(cards()[0].querySelector('gnr-textbox').value, 'Preserved');
app.dispose();
console.log('Source slider preserves contact Data, retained DOM identity and focused drafts.');
