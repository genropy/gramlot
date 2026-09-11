// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fromTytx} from 'genro-tytx';
import {Application, HtmlBuilder} from '../js/dom/src/index.js';
import {setupDom} from '../js/dom/tests/dom.js';
import {PriceRecipe} from '../docs/examples/logical-blocks/recipe.js';
setupDom();
const imported = new HtmlBuilder('example');
imported.loadSource(fromTytx(readFileSync(0, 'utf8'), 'json'));
for (const builder of [imported, new PriceRecipe('example')]) {
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, builder, {inspector: false});
    assert.equal(app.data.getItem('example.order.total'), 10);
    assert.equal(host.querySelector('span').textContent, '10');
    assert.equal(host.querySelector('p').textContent, 'Total: 10');
    app.live(() => app.data.setItem('example.order.price', 7));
    assert.equal(app.data.getItem('example.order.total'), 10, 'passive price does not trigger');
    app.live(() => app.data.setItem('example.order.quantity', 3));
    assert.equal(app.data.getItem('example.order.total'), 21);
    assert.equal(host.querySelector('span').textContent, '21');
    assert.equal(host.querySelector('p').textContent, 'Total: 21');
    app.dispose();
}
console.log('Local logic: imported Python and native JS have matching startup and reactive behavior');
