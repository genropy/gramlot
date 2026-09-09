// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Structural reactivity — JS port of test_partial_render.py (structure).
 *
 * The full render is the oracle: applying a live section's patches to
 * the previous document must yield the same document a fresh full render
 * produces. Runs against a real DOM (jsdom): the real DomTarget applies
 * the patches; a CapturingTarget records the batch so op/id/before can
 * be asserted too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';
import { DomTarget } from '../src/target-wrapper.js';

/** DomTarget that also records the last batch (for assertions). */
class CapturingTarget extends DomTarget {
    partial(patches) { this.lastPatches = patches; super.partial(patches); }
}

class ListPage extends HtmlBuilder {
    main(root) {
        const body = root.body();
        const ul = body.ul({ node_id: 'list' });
        ul.li('alpha');
        ul.li('beta');
    }
}

function mounted() {
    setupDom();
    const root = document.createElement('div');
    const page = new ListPage('p');
    const target = new CapturingTarget(root);
    page.setRenderTarget(target);
    const handler = new BuilderHandler({ /* application */ });
    handler.addBuilder(page);
    handler.activate();
    return { handler, page, target, root };
}

/** A fresh full render of the current source state (the oracle). */
function freshHtml(page) {
    const holder = document.createElement('div');
    holder.appendChild(page.render({ target: null, includeDatapath: true }));
    return holder.innerHTML;
}

// --- tests -----------------------------------------------------------

test('source append emits one insert (append), siblings untouched', () => {
    const { handler, page, target, root } = mounted();
    handler.live(() => page.nodeById('list').li('gamma'));

    const batch = target.lastPatches;
    assert.equal(batch.length, 1);
    assert.equal(batch[0].op, 'insert');
    assert.equal(batch[0].id, page.targetId(page.nodeById('list')));
    assert.equal(batch[0].before, null);
    assert.equal(root.innerHTML, freshHtml(page));   // patched == fresh (the oracle)
    assert.ok(root.textContent.includes('gamma'));
});

test('positioned insert carries the anchor (before)', () => {
    const { handler, page, target, root } = mounted();
    const firstLi = page.source.getNode('body_0.ul_0.li_0');
    handler.live(() => page.nodeById('list').li('first', { node_position: '<' }));

    const batch = target.lastPatches;
    assert.equal(batch.length, 1);
    assert.equal(batch[0].op, 'insert');
    assert.equal(batch[0].before, page.targetId(firstLi));
    assert.equal(root.innerHTML, freshHtml(page));
});

test('source delete emits one remove', () => {
    const { handler, page, target, root } = mounted();
    const li1Id = page.targetId(page.source.getNode('body_0.ul_0.li_1'));
    handler.live(() => page.nodeById('list').value.pop('li_1'));

    assert.deepEqual(target.lastPatches, [{ id: li1Id, op: 'remove' }]);
    assert.equal(root.innerHTML, freshHtml(page));
    assert.ok(!root.textContent.includes('beta'));
});

test('ephemeral node (born + died in one section) nets to nothing', () => {
    const { handler, page, target, root } = mounted();
    const before = root.innerHTML;
    handler.live(() => {
        const ghost = page.nodeById('list').li('ghost');
        page.nodeById('list').value.pop(ghost.label);
    });
    assert.deepEqual(target.lastPatches, []);
    assert.equal(root.innerHTML, before);
});

test('delete + reinsert travels as remove + insert', () => {
    const { handler, page, target, root } = mounted();
    handler.live(() => {
        page.nodeById('list').value.pop('li_0');
        page.nodeById('list').li('omega');
    });
    assert.deepEqual(target.lastPatches.map((p) => p.op), ['remove', 'insert']);
    assert.equal(root.innerHTML, freshHtml(page));
    assert.ok(root.textContent.includes('omega') && !root.textContent.includes('alpha'));
});
