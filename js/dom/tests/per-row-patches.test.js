// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Per-row patches — JS port of examples/reactive/15_per_row_patches and
 * builder/base partial_render (CMP.7). An iterate block stops re-rendering
 * wholesale: a data event under the anchor classifies PER ROW (path
 * arithmetic) and the flush patches ONE unit, addressed by derived
 * identity `<base>.<label>.<ordinal>` (the row block is `<base>.<label>.1`).
 *
 * - ONE leaf of a row changes → value-only CELL patches (text/attr);
 * - a row born atomically      → one insert, before the NEXT row's block;
 * - a row dies                 → one remove (derived id), writeback purged;
 * - too many cells of one row  → the row replace (CELLS_PER_ROW_LIMIT = 4);
 * - a structural row flood     → the container replace (ROW_COALESCE_LIMIT = 50).
 *
 * The ORACLE: a patched value/fragment must match the full render of the
 * same state — patching can never diverge from the truth.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bag } from 'genro-bag-js';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';
import { TargetWrapper } from '../src/target-wrapper.js';

/** A partial-accepting target that captures the patch batches instead of
 *  touching a live DOM — the JS counterpart of the Python Probe. */
class Probe extends TargetWrapper {
    constructor() {
        super();
        this.batches = [];
        this.doc = null;
    }

    get acceptsPartial() {
        return true;
    }

    get renderOpts() {
        return { includeDatapath: true };
    }

    full(document) {
        this.doc = document;
    }

    partial(patches) {
        this.batches.push(patches);
    }
}

class OrderPage extends HtmlBuilder {
    static components = ['orderRow'];

    orderRow(root, { node_label }) {
        const row = root.div({ datapath: `.${node_label}`, class_: 'row' });
        row.input({ value: '^.qty' });   // ordinal 2: attr cell
        row.span('^.total');             // ordinal 3: text cell
        row.span('^.converted');         // ordinal 4: text cell
    }

    setup() {
        for (let n = 1; n <= 3; n += 1) {
            this.setData(`rows.r${n}.qty`, n);
            this.setData(`rows.r${n}.total`, n * 10);
            this.setData(`rows.r${n}.converted`, n * 5);
        }
    }

    main(root) {
        const body = root.body();
        body.orderRow({ iterate: '^rows', id: 'blk' });
        body.p('after the rows');
    }
}

/** Mount a page on a Probe with a reactive handler; return {page, probe, handler}. */
function mount(PageClass) {
    setupDom();
    const page = new PageClass('main');
    const probe = new Probe();
    page.setRenderTarget(probe);
    const handler = new BuilderHandler({});   // truthy application → reactive
    handler.addBuilder(page);
    handler.activate();
    return { page, probe, handler };
}

test('cell: one leaf changes → value-only text/attr patches by derived id', () => {
    const { page, probe, handler } = mount(OrderPage);

    handler.live(() => {
        handler.data.setItem('main.rows.r2.qty', 7);
        handler.data.setItem('main.rows.r2.total', 70);
    });

    const batch = probe.batches.at(-1);
    assert.deepEqual(batch.map((p) => p.op).sort(), ['attr', 'text']);
    const byId = Object.fromEntries(batch.map((p) => [p.id, p]));
    assert.equal(byId['blk.r2.2'].value, '7');    // the qty input (attr)
    assert.equal(byId['blk.r2.2'].name, 'value');
    assert.equal(byId['blk.r2.3'].value, '70');   // the total span (text)

    // ORACLE: the patched values are exactly the full render's cells.
    const frag = page.render({ target: null, includeDatapath: true });
    assert.equal(frag.querySelector('[id="blk.r2.2"]').getAttribute('value'), '7');
    assert.equal(frag.querySelector('[id="blk.r2.3"]').textContent, '70');
});

test('cell: no cell touched → other rows untouched (one patch, one row)', () => {
    const { probe, handler } = mount(OrderPage);
    handler.live(() => handler.data.setItem('main.rows.r1.total', 999));
    const batch = probe.batches.at(-1);
    assert.equal(batch.length, 1);
    assert.equal(batch[0].id, 'blk.r1.3');
    assert.equal(batch[0].op, 'text');
    assert.equal(batch[0].value, '999');
});

test('row born atomically → one insert before the NEXT row block', () => {
    const { page, probe, handler } = mount(OrderPage);

    const fresh = new Bag();
    fresh.setItem('qty', 9);
    fresh.setItem('total', 90);
    fresh.setItem('converted', 45);
    // node_position '<r2' inserts before r2 in bag order.
    handler.live(() => handler.data.setItem('main.rows.rX', fresh, null, '<r2'));

    const batch = probe.batches.at(-1);
    assert.equal(batch.length, 1);
    assert.equal(batch[0].op, 'insert');
    assert.equal(batch[0].before, 'blk.r2.1');   // before the next row's block
    assert.equal(batch[0].node.id, 'blk.rX.1');  // the new block's derived id

    // ORACLE: the inserted block matches its full-render counterpart.
    const frag = page.render({ target: null, includeDatapath: true });
    assert.equal(frag.querySelector('[id="blk.rX.1"]').outerHTML, batch[0].node.outerHTML);
});

test('row born after the last row, no sibling → append (before null)', () => {
    class LonePage extends HtmlBuilder {
        static components = ['loneRow'];

        loneRow(root, { node_label }) {
            root.div('^.v', { datapath: `.${node_label}`, class_: 'row' });
        }

        setup() { this.setData('rows.r1.v', 1); }

        // the component is the LAST (only) child: nothing anchorable follows.
        main(root) { root.body().loneRow({ iterate: '^rows', id: 'blk' }); }
    }
    const { probe, handler } = mount(LonePage);
    const fresh = new Bag();
    fresh.setItem('v', 9);
    handler.live(() => handler.data.setItem('main.rows.rZ', fresh));   // appended
    const batch = probe.batches.at(-1);
    assert.equal(batch[0].op, 'insert');
    assert.equal(batch[0].before, null);         // nothing anchorable after → append
    assert.equal(batch[0].node.id, 'blk.rZ.1');
});

test('row born after the last row, a plain sibling follows → anchor before it', () => {
    // OrderPage has a trailing <p>: the appended row anchors before it (the
    // first renderable source sibling after the component).
    const { page, probe, handler } = mount(OrderPage);
    const fresh = new Bag();
    fresh.setItem('qty', 9);
    handler.live(() => handler.data.setItem('main.rows.rZ', fresh));   // appended in data
    const batch = probe.batches.at(-1);
    assert.equal(batch[0].op, 'insert');
    assert.equal(batch[0].node.id, 'blk.rZ.1');
    const pNode = page.source.getNode('body_0.p_0');
    assert.equal(batch[0].before, page.targetId(pNode));   // before the trailing <p>
});

test('row dies → one remove by derived id, writeback entries purged', () => {
    const { page, probe, handler } = mount(OrderPage);

    assert.ok(Object.keys(page._writebackMap).some((k) => k.startsWith('blk.r2.')));
    handler.live(() => handler.data.pop('main.rows.r2'));

    const batch = probe.batches.at(-1);
    assert.equal(batch.length, 1);
    assert.deepEqual(batch[0], { id: 'blk.r2.1', op: 'remove' });
    assert.ok(!Object.keys(page._writebackMap).some((k) => k.startsWith('blk.r2.')));
});

test('cell density: more than 4 cells of one row collapse into its replace', () => {
    class WidePage extends HtmlBuilder {
        static components = ['wideRow'];

        wideRow(root, { node_label }) {
            const row = root.div({ datapath: `.${node_label}`, class_: 'row' });
            row.input({ value: '^.a' });
            row.span('^.b');
            row.span('^.c');
            row.span('^.d');
            row.span('^.e');
        }

        setup() {
            for (const f of ['a', 'b', 'c', 'd', 'e']) {
                this.setData(`rows.r1.${f}`, f);
            }
        }

        main(root) { root.body().wideRow({ iterate: '^rows', id: 'blk' }); }
    }
    const { probe, handler } = mount(WidePage);

    handler.live(() => {
        for (const f of ['a', 'b', 'c', 'd', 'e']) {
            handler.data.setItem(`main.rows.r1.${f}`, `${f}2`);   // 5 cells > limit 4
        }
    });

    const batch = probe.batches.at(-1);
    assert.equal(batch.length, 1);
    assert.equal(batch[0].op, 'replace');
    assert.equal(batch[0].id, 'blk.r1.1');       // the whole row block
});

test('row flood: more than 50 touched rows collapse into the container replace', () => {
    class FloodPage extends HtmlBuilder {
        static components = ['fRow'];

        fRow(root, { node_label }) {
            root.div('^.v', { datapath: `.${node_label}`, class_: 'row' });
        }

        setup() { this.setData('rows.seed.v', 0); }

        main(root) { root.div({ node_id: 'wrap' }).fRow({ iterate: '^rows', id: 'blk' }); }
    }
    const { probe, handler } = mount(FloodPage);

    handler.live(() => {
        for (let n = 1; n <= 60; n += 1) {           // 60 row_ins > limit 50
            const b = new Bag();
            b.setItem('v', n);
            handler.data.setItem(`main.rows.r${n}`, b);
        }
    });

    const batch = probe.batches.at(-1);
    assert.equal(batch.length, 1);
    assert.equal(batch[0].op, 'replace');           // the enclosing container
});
