// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Component rules — the per-row data-elements of an iterate expansion, as
 * TEMPLATES (CMP.7). JS port of examples/reactive/15 (the row formulas)
 * and builder/data_handler set_component_rules/_run_component_rules. The
 * body is code, so ONE spec per rule runs on ANY row; the event's
 * coordinates (anchor → row → field) pick which rules run and where.
 *
 * - a row trigger (`^.qty`) recomputes that row (row_total, then the
 *   converted formula that depends on it): value-only cell patches;
 * - a shared trigger (`^header.rate`) recomputes EVERY live row (the
 *   broadcast): exactly N tiny value patches, cells never coalesce;
 * - a controller runs synchronously with a RowContext bound to the row;
 * - a circular pair of row formulas is a livelock → explicit error.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';
import { TargetWrapper } from '../src/target-wrapper.js';

class Probe extends TargetWrapper {
    constructor() {
        super();
        this.batches = [];
    }

    get acceptsPartial() {
        return true;
    }

    get renderOpts() {
        return { includeDatapath: true };
    }

    full() {}

    partial(patches) {
        this.batches.push(patches);
    }
}

class OrderPage extends HtmlBuilder {
    static components = ['orderRow'];

    orderRow(root, { node_label }) {
        const row = root.div({ datapath: `.${node_label}`, class_: 'row' });
        row.input({ value: '^.qty' });        // ord 2 (attr cell)
        row.span('^.total');                   // ord 3 (text cell)
        row.span('^.converted');               // ord 4 (text cell)
        row.dataFormula({ destination: '.total', formula: 'rowTotal', qty: '^.qty', price: '^.price' });
        row.dataFormula({
            destination: '.converted', formula: 'convert', total: '^.total', rate: '^header.rate',
        });
    }

    setup() {
        this.setData('header.rate', 0.5);
        for (let n = 1; n <= 3; n += 1) {
            this.setData(`rows.r${n}.qty`, n);
            this.setData(`rows.r${n}.price`, 10);
            this.setData(`rows.r${n}.total`, n * 10);
            this.setData(`rows.r${n}.converted`, n * 5);
        }
    }

    main(root) { root.body().orderRow({ iterate: '^rows', id: 'blk' }); }

    static rowTotal({ qty, price }) {
        return qty == null || price == null ? null : qty * price;
    }

    static convert({ total, rate }) {
        return total == null || rate == null ? null : Math.round(total * rate * 100) / 100;
    }
}

function mount(PageClass) {
    setupDom();
    const page = new PageClass('main');
    const probe = new Probe();
    page.setRenderTarget(probe);
    const handler = new BuilderHandler({});
    handler.addBuilder(page);
    handler.activate();
    return { page, probe, handler };
}

test('row trigger: editing qty recomputes total then converted (cell patches)', () => {
    const { page, probe, handler } = mount(OrderPage);

    handler.live(() => handler.data.setItem('main.rows.r2.qty', 7));

    // qty (attr) + total 70 + converted 35 (70 * 0.5): three value-only cells.
    const batch = probe.batches.at(-1);
    assert.deepEqual(batch.map((p) => p.op).sort(), ['attr', 'text', 'text']);
    const byId = Object.fromEntries(batch.map((p) => [p.id, p]));
    assert.equal(byId['blk.r2.2'].value, '7');    // qty input
    assert.equal(byId['blk.r2.3'].value, '70');   // total = 7 * 10
    assert.equal(byId['blk.r2.4'].value, '35');   // converted = 70 * 0.5

    // The store settled to the computed values.
    assert.equal(handler.data.getItem('main.rows.r2.total'), 70);
    assert.equal(handler.data.getItem('main.rows.r2.converted'), 35);

    // ORACLE: the patched values are exactly the full render's cells.
    const frag = page.render({ target: null, includeDatapath: true });
    assert.equal(frag.querySelector('[id="blk.r2.3"]').textContent, '70');
    assert.equal(frag.querySelector('[id="blk.r2.4"]').textContent, '35');
});

test('shared trigger: a header change broadcasts to every live row', () => {
    const { handler, probe } = mount(OrderPage);

    handler.live(() => handler.data.setItem('main.header.rate', 0.75));

    // Every row's converted recomputes: exactly N value-only text patches,
    // one per row, no coalescing.
    const batch = probe.batches.at(-1);
    assert.equal(batch.length, 3);
    assert.ok(batch.every((p) => p.op === 'text'));
    assert.deepEqual(batch.map((p) => p.id).sort(), ['blk.r1.4', 'blk.r2.4', 'blk.r3.4']);
    const byId = Object.fromEntries(batch.map((p) => [p.id, p]));
    assert.equal(byId['blk.r1.4'].value, '7.5');    // 10 * 0.75
    assert.equal(byId['blk.r2.4'].value, '15');     // 20 * 0.75
    assert.equal(byId['blk.r3.4'].value, '22.5');   // 30 * 0.75
});

test('row controller runs synchronously with a RowContext bound to the row', () => {
    class NotedPage extends HtmlBuilder {
        static components = ['notedRow'];

        notedRow(root, { node_label }) {
            const row = root.div({ datapath: `.${node_label}`, class_: 'row' });
            row.input({ value: '^.qty' });
            row.span('^.note');
            row.dataController({ func: 'onQty', qty: '^.qty' });
        }

        setup() {
            this.setData('rows.r1.qty', 2);
            this.setData('rows.r1.note', 'start');
        }

        main(root) { root.body().notedRow({ iterate: '^rows', id: 'blk' }); }

        static onQty(node, { qty }) {
            node.SET('.note', `qty is ${qty}`);   // RowContext write on the row
        }
    }
    const { handler, probe } = mount(NotedPage);

    handler.live(() => handler.data.setItem('main.rows.r1.qty', 9));

    assert.equal(handler.data.getItem('main.rows.r1.note'), 'qty is 9');
    // The note cell patched (the controller's write cascaded to its reader).
    const patched = probe.batches.at(-1).find((p) => p.id === 'blk.r1.3');
    assert.equal(patched.op, 'text');
    assert.equal(patched.value, 'qty is 9');
});

test('a circular pair of row formulas is a livelock → explicit error', () => {
    class LoopPage extends HtmlBuilder {
        static components = ['loopRow'];

        loopRow(root, { node_label }) {
            const row = root.div({ datapath: `.${node_label}`, class_: 'row' });
            row.span('^.a');
            row.span('^.b');
            row.dataFormula({ destination: '.a', formula: 'fromB', b: '^.b' });
            row.dataFormula({ destination: '.b', formula: 'fromA', a: '^.a' });
        }

        setup() { this.setData('rows.r1.a', 1); this.setData('rows.r1.b', 1); }

        main(root) { root.body().loopRow({ iterate: '^rows', id: 'blk' }); }

        static fromB({ b }) { return b + 1; }

        static fromA({ a }) { return a + 1; }
    }
    const { handler } = mount(LoopPage);

    assert.throws(
        () => handler.live(() => handler.data.setItem('main.rows.r1.a', 2)),
        /livelock/,
    );
});
