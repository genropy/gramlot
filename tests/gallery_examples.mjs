// Hydrate every gallery case and verify that its advertised component renders.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {Application} from 'gramlot-dom';
import {fromTytx} from 'genro-tytx';
setupDom();
window.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 0);
window.cancelAnimationFrame = clearTimeout;
const errors = [];
window.addEventListener('error', event => errors.push(event.error || event.message));
const {GramlotBuilder} = await import('../js/pages/src/builder.js');
const {PlaygroundBuilder} = await import('../js/pages/src/playground-page.js');
const root = process.argv[2];
const catalogue = JSON.parse(readFileSync(join(root, 'catalogue.json'), 'utf8'));
let count = 0;
for (const collection of catalogue.collections) {
    for (const component of collection.components) {
        const folder = join(root, collection.name, component.name);
        const cases = readdirSync(folder).filter(name => /^\d+$/.test(name));
        assert.ok(cases.length >= 2, `${component.name}: needs multiple cases`);
        for (const name of cases) {
            const builder = new (collection.name === 'labEditors' ? PlaygroundBuilder : GramlotBuilder)('example');
            builder.loadSource(fromTytx(readFileSync(join(folder, name, 'recipe.tytx'), 'utf8'), 'json'));
            const host = document.body.appendChild(document.createElement('div'));
            const app = new Application(host, builder, {inspector:false});
            await new Promise(resolve => setTimeout(resolve, 0));
            assert.ok(host.querySelector(component.tag)?.shadowRoot, `${component.name}/${name}: component not mounted`);
            if (component.name === 'stackButtons') {
                app.publish('pages_switchPage', 'history');
                await new Promise(resolve => setTimeout(resolve, 0));
                assert.equal(app.data.getItem('example.selected'), 'history');
                assert.equal(app.data.getItem('example.visible'), 'history');
            }
            app.dispose(); host.remove(); count++;
        }
    }
}
assert.deepEqual(errors, [], 'No component lifecycle errors');
console.log(`${count} gallery cases hydrated`);
