// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * storeTree — data-widget (model B) fed by a Bag branch (GnrStoreBag port).
 *
 * The renderer hands the resolved branch as the `.storeBag` property (the
 * data-widget hook); the widget draws the hierarchy, keeps its own expand
 * state, and redraws on Bag change. It is kept OUT of the pointer_map, so
 * the engine never re-renders it (its internal state survives mutations).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Bag } from 'genro-bag-js';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { Application } from '../src/application.js';
import '../src/collections/storetree.js';   // registers 'storeTree'

class TreePage extends HtmlBuilder {
    static wc_requires = ['storeTree'];

    setup() {
        this.data.setItem('fs.docs', new Bag(), { caption: 'Documents' });
        this.data.setItem('fs.docs.readme', 'text', { caption: 'Readme.txt' });
        this.data.setItem('fs.images', new Bag(), { caption: 'Images' });
    }

    main(root) {
        root.storeTree({
            store: '^fs', labelAttribute: 'caption',
            selectedPath: '^ui.selected', node_id: 'tr',
        });
    }
}

function mount() {
    setupDom();
    const root = document.createElement('div');
    document.body.appendChild(root);   // connect so connectedCallback runs
    const genro = new Application(root, new TreePage('main'));
    return { genro, el: root.querySelector('gnr-storetree') };
}

test('the data-widget receives the Bag branch as the .storeBag property', () => {
    const { el } = mount();
    assert.ok(el, 'storeTree projected as <gnr-storetree>');
    assert.ok(el.storeBag instanceof Bag, '.storeBag is the resolved Bag (not a string)');
    assert.equal(el.getAttribute('store'), null, 'the store branch is not stringified as an attribute');
});

test('renders one row per node, captions from labelAttribute', () => {
    const { el } = mount();
    const text = el.shadowRoot.textContent;
    assert.match(text, /Documents/);
    assert.match(text, /Images/);
    assert.match(text, /Readme.txt/);   // nested under Documents, in the DOM
});

test('a Bag-valued node is an expandable branch; a plain value is a leaf', () => {
    const { el } = mount();
    const branches = el.shadowRoot.querySelectorAll('details');
    assert.equal(branches.length, 2, 'docs and images are branches');
    const leaves = el.shadowRoot.querySelectorAll('.leaf');
    assert.equal(leaves.length, 1, 'readme is a leaf');
});

test('toggling a branch does not touch the datastore', () => {
    const { genro, el } = mount();
    const details = el.shadowRoot.querySelector('details');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    // the datastore is unchanged: expansion is widget-internal state
    assert.ok(genro.data.getItem('main.fs.docs') instanceof Bag);
    assert.equal(genro.data.getItem('main.fs.docs').getNodes().length, 1);
});

test('mutating a node under the branch redraws the tree', () => {
    const { genro, el } = mount();
    assert.doesNotMatch(el.shadowRoot.textContent, /NewFile/);
    genro.live(() => {
        genro.data.setItem('main.fs.docs.newfile', 'x', { caption: 'NewFile' });
    });
    assert.match(el.shadowRoot.textContent, /NewFile/, 'the widget redrew on Bag change');
});

test('adding a top-level node adds a row', () => {
    const { genro, el } = mount();
    genro.live(() => {
        genro.data.setItem('main.fs.music', new Bag(), { caption: 'Music' });
    });
    assert.match(el.shadowRoot.textContent, /Music/);
    assert.equal(el.shadowRoot.querySelectorAll('details').length, 3);
});

test('clicking a branch writes its path into selectedPath', () => {
    const { genro, el } = mount();
    const docs = el.shadowRoot.querySelector('summary');   // first branch = docs
    docs.click();
    assert.equal(genro.data.getItem('main.ui.selected'), 'docs');
});

test('clicking a leaf writes its store-relative path', () => {
    const { genro, el } = mount();
    const readme = el.shadowRoot.querySelector('.leaf');   // readme, under docs
    readme.click();
    assert.equal(genro.data.getItem('main.ui.selected'), 'docs.readme');
});

test('the selected row carries the selected class', () => {
    const { el } = mount();
    const docs = el.shadowRoot.querySelector('summary');
    docs.click();
    assert.ok(docs.classList.contains('selected'));
});

test('a reader of selectedPath updates on selection', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['storeTree'];

        setup() {
            this.data.setItem('fs.docs', new Bag(), { caption: 'Documents' });
        }

        main(root) {
            const d = root.div({ datapath: 'ui' });
            d.storeTree({ store: '^fs', selectedPath: '^.sel', node_id: 'tr' });
            d.span('^.sel');
        }
    }
    const root = document.createElement('div');
    document.body.appendChild(root);
    const genro = new Application(root, new Page('main'));

    root.querySelector('gnr-storetree').shadowRoot.querySelector('summary').click();
    assert.equal(genro.data.getItem('main.ui.sel'), 'docs');
    assert.match(root.querySelector('span').textContent, /docs/, 'the reader re-rendered');
});
