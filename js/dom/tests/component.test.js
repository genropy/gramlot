// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * @component + iterate — JS port of the Python expansion (render-time,
 * data-driven). A component is a named node in the source; at render it
 * expands into a throw-away root where the body builds exactly ONE tree.
 * Three forms: explicit params (one block), `store` (one record block),
 * `iterate` (N blocks, one per child of the collection). Ports the shapes
 * of examples/reactive/07_component_live and tests/test_component.py.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Bag } from 'genro-bag-js';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';
import { Application } from '../src/application.js';

class StatesPage extends HtmlBuilder {
    static components = ['stateRow'];

    // the body: builds ONE tree per row; node_label names the row.
    stateRow(root, { node_label }) {
        const row = root.div({ datapath: `.${node_label}`, class_: 'row' });
        row.span('^.name');
        row.span('^.capital');
    }

    setup() {
        this.setData('states.QLD.name', 'Queensland');
        this.setData('states.QLD.capital', 'Brisbane');
        this.setData('states.VIC.name', 'Victoria');
        this.setData('states.VIC.capital', 'Melbourne');
    }

    main(root) {
        root.div({ node_id: 'list' }).stateRow({ iterate: '^states' });
    }
}

test('iterate expands one block per collection child, values from the row', () => {
    setupDom();
    const root = document.createElement('div');
    new Application(root, new StatesPage('main'));   // eslint-disable-line no-new

    const rows = root.querySelectorAll('.row');
    assert.equal(rows.length, 2, 'one block per child');
    assert.equal(rows[0].children[0].textContent, 'Queensland');
    assert.equal(rows[0].children[1].textContent, 'Brisbane');
    assert.equal(rows[1].children[0].textContent, 'Victoria');
});

test('empty collection expands to zero blocks (data-driven stop)', () => {
    setupDom();
    class EmptyPage extends StatesPage {
        setup() { /* no states seeded */ }
    }
    const root = document.createElement('div');
    new Application(root, new EmptyPage('main'));   // eslint-disable-line no-new
    assert.equal(root.querySelectorAll('.row').length, 0);
});

test('store form expands ONE block anchored to the record', () => {
    setupDom();
    class CardPage extends HtmlBuilder {
        static components = ['card'];

        card(root) { root.div('^.label', { class_: 'card' }); }

        setup() { this.setData('rec.label', 'x'); }

        main(root) { root.body().card({ store: '^rec' }); }
    }
    const root = document.createElement('div');
    new Application(root, new CardPage('main'));   // eslint-disable-line no-new

    const cards = root.querySelectorAll('.card');
    assert.equal(cards.length, 1);
    assert.equal(cards[0].textContent, 'x');
});

test('a forest (two roots in the body) raises', () => {
    setupDom();
    class ForestPage extends HtmlBuilder {
        static components = ['twinBlocks'];

        twinBlocks(root) {
            root.div('one');
            root.div('two');   // second root: a forest
        }

        main(root) { root.body().twinBlocks(); }
    }
    const page = new ForestPage('main');
    const handler = new BuilderHandler();
    handler.addBuilder(page);
    assert.throws(() => page.render({ target: null }), /tree, not a forest/);
});

test('reactivity L0: a field change inside the collection refreshes the blocks', () => {
    setupDom();
    const root = document.createElement('div');
    const genro = new Application(root, new StatesPage('main'));

    // no reader registered on this exact path: the component's anchor
    // subscription (main.states) must catch it (CMP.7).
    genro.live(() => genro.data.setItem('main.states.QLD.capital', 'BRISBANE'));

    const rows = root.querySelectorAll('.row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].children[1].textContent, 'BRISBANE');
    assert.equal(rows[1].children[1].textContent, 'Melbourne');   // untouched row intact
});

test('reactivity: adding and removing a collection item adds/removes blocks', () => {
    setupDom();
    const root = document.createElement('div');
    const genro = new Application(root, new StatesPage('main'));

    // A row is born ATOMICALLY (a whole Bag): the ins event on the
    // collection names the row → row_ins. A deep leaf-by-leaf set would
    // classify as cell_upd on a not-yet-rendered row (CMP.7 contract).
    const nsw = new Bag();
    nsw.setItem('name', 'New South Wales');
    nsw.setItem('capital', 'Sydney');
    genro.live(() => genro.data.setItem('main.states.NSW', nsw));
    assert.equal(root.querySelectorAll('.row').length, 3);
    assert.ok(root.textContent.includes('Sydney'));

    genro.live(() => genro.data.pop('main.states.VIC'));
    const rows = root.querySelectorAll('.row');
    assert.equal(rows.length, 2);
    assert.ok(!root.textContent.includes('Melbourne'));
});

test('expansion pointers never register; the anchor does (CMP.7)', () => {
    setupDom();
    class CardPage extends HtmlBuilder {
        static components = ['card'];

        card(root) { root.div('^.label', { class_: 'card' }); }

        setup() { this.setData('rec.label', 'x'); }

        main(root) { root.body().card({ store: '^rec' }); }
    }
    const root = document.createElement('div');
    const genro = new Application(root, new CardPage('main'));

    assert.ok(genro.handler.pointerMap.has('main.rec'), 'the anchor registered');
    assert.ok(!genro.handler.pointerMap.has('main.rec.label'),
        'the expansion pointers did not');
});
