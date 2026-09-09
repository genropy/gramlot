// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Embryo end-to-end tests: command → SourceBag → renderer → DOM, plus
 * the reactive data slice (^pointer → pointer_map → live() flush → patch).
 *
 * Runs against a real DOM (jsdom, see dom.js) — no hand-written stub.
 * Assertions are on observable outcomes (tags, structure, text, patches),
 * never on the auto-generated labels. A ProbeTarget collects the partial
 * patches, as the TargetWrapper docstring prescribes for tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { Bag } from 'genro-bag-js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';
import { DomTarget } from '../src/target-wrapper.js';
import { wrapSource } from '../src/source-bag.js';

/** Collects partial patches instead of touching a live DOM. */
class ProbeTarget {
    constructor() { this.patches = null; this.document = null; }

    get acceptsPartial() { return true; }

    get renderOpts() { return { includeDatapath: true }; }

    full(document) { this.document = document; }

    partial(patches) { this.patches = patches; }
}

class StaticPage extends HtmlBuilder {
    main(root) {
        const body = root.body();
        body.h1('Hello from JS');
        const ul = body.ul();
        ul.li('primo');
        ul.li('secondo');
        body.p('Una ricetta.', { class_: 'note' });
    }
}

class ReactivePage extends HtmlBuilder {
    setup() {
        this.setData('page.title', 'Hello');
        this.setData('page.message', 'primo messaggio');
    }

    main(root) {
        const pane = root.div({ datapath: 'page', node_id: 'page' });
        pane.h1('^.title');
        pane.p('^.message');
    }
}

// --- tests -----------------------------------------------------------

test('builder command builds a faithful SourceBag', () => {
    const page = new StaticPage('main');
    page.main(wrapSource(page.source));

    const top = page.source.getNodes();
    assert.equal(top.length, 1);
    assert.equal(top[0].nodeTag, 'body');

    const bodyChildren = top[0].value.getNodes();
    assert.deepEqual(bodyChildren.map((n) => n.nodeTag), ['h1', 'ul', 'p']);
    assert.equal(bodyChildren[0].value, 'Hello from JS');
    assert.ok(bodyChildren[1].value instanceof Bag);
    assert.deepEqual(bodyChildren[1].value.getNodes().map((n) => n.value), ['primo', 'secondo']);
    assert.equal(bodyChildren[2].getAttr('class_'), 'note');
});

test('handler mounts, creates and renders to the DOM target', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new StaticPage('main');
    page.setRenderTarget(new DomTarget(root));

    const handler = new BuilderHandler();
    handler.addBuilder(page);
    handler.activate();

    assert.equal(root.children.length, 1);
    const body = root.children[0];
    assert.equal(body.tagName.toLowerCase(), 'body');
    // class_ was canonicalized to class by fixedAttrItems
    assert.equal(body.querySelector('p').getAttribute('class'), 'note');
    assert.equal(body.querySelector('p').textContent, 'Una ricetta.');
    assert.equal(body.querySelectorAll('li').length, 2);
});

test('pull-binding: ^pointer resolves from the datastore at render', () => {
    setupDom();
    const page = new ReactivePage('main');
    page.setRenderTarget(new ProbeTarget());

    const handler = new BuilderHandler({ /* application */ });
    handler.addBuilder(page);
    handler.activate();

    assert.ok(handler.pointerMap.has('main.page.title'));
    assert.ok(handler.pointerMap.has('main.page.message'));

    const h1 = page.source.getNode('div_0.h1_0');
    assert.equal(page.data.getItem('page.title'), 'Hello');
    assert.equal(h1.value, '^.title');   // source keeps the pointer, not the value
});

test('reactivity: a data change flushes a replace patch for the reader', () => {
    setupDom();
    const page = new ReactivePage('main');
    const probe = new ProbeTarget();
    page.setRenderTarget(probe);

    const handler = new BuilderHandler({ /* application */ });
    handler.addBuilder(page);
    handler.activate();

    handler.live(() => page.setData('page.title', 'World'));

    assert.equal(probe.patches.length, 1);
    const [patch] = probe.patches;
    assert.equal(patch.op, 'replace');
    assert.equal(patch.node.tagName.toLowerCase(), 'h1');
    assert.equal(patch.node.textContent, 'World');
    assert.ok(patch.id.startsWith('n'));
});

test('reactivity: changing an unrelated path flushes only its reader', () => {
    setupDom();
    const page = new ReactivePage('main');
    const probe = new ProbeTarget();
    page.setRenderTarget(probe);

    const handler = new BuilderHandler({ /* application */ });
    handler.addBuilder(page);
    handler.activate();

    handler.live(() => page.setData('page.message', 'secondo messaggio'));

    assert.equal(probe.patches.length, 1);
    assert.equal(probe.patches[0].node.tagName.toLowerCase(), 'p');
    assert.equal(probe.patches[0].node.textContent, 'secondo messaggio');
});
