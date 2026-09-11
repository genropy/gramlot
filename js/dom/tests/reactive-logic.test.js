// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Data-elements + reactive cascade — JS port of the Python reactive examples
 * (triangle formula, reactive controller, formula queue, livelock).
 *
 * dataSetter seeds, dataFormula computes (recomputes when an input changes),
 * dataController runs side effects. A change cascades: the readers recompute,
 * their writes re-enter and cascade; a livelock trips the backstop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';

/** A partial-aware target that discards output (we assert on data). */
class Probe {
    get acceptsPartial() { return true; }

    get renderOpts() { return { includeDatapath: true }; }

    full() {}

    partial() {}
}

function mount(PageClass) {
    setupDom();
    const page = new PageClass('main');
    page.setRenderTarget(new Probe());
    const handler = new BuilderHandler({ /* application */ });
    handler.addBuilder(page);
    handler.activate();
    return handler;
}

test('dataFormula computes on _on_start and recomputes on input change', () => {
    class TriPage extends HtmlBuilder {
        static calcArea(b) { return (b.base * b.altezza) / 2; }

        main(root) {
            const body = root.div({ datapath: 'tri', node_id: 'tri' });
            body.dataSetter({ destination: '.base', value: 10 });
            body.dataSetter({ destination: '.altezza', value: 6 });
            body.dataFormula({
                destination: '.area', formula: 'calcArea',
                base: '^.base', altezza: '^.altezza', _on_start: true,
            });
            body.span('^.area');
        }
    }
    const handler = mount(TriPage);
    assert.equal(handler.data.getItem('main.tri.area'), 30);   // first calc

    handler.live(() => handler.data.setItem('main.tri.base', 20));
    assert.equal(handler.data.getItem('main.tri.area'), 60);   // recomputed
});

test('dataController runs on _on_start (SET/GET/PUT on the node)', () => {
    class BoxPage extends HtmlBuilder {
        static initBox(node, b) {
            node.SET('.count', b.start);
            node.PUT('.quiet', node.GET('.count') + 1);
        }

        main(root) {
            const box = root.div({ datapath: 'box' });
            box.dataSetter({ destination: '.start', value: 7 });
            box.dataController({ func: 'initBox', start: '^.start', _on_start: true });
            box.span('^.count');
            box.span('^.quiet');
        }
    }
    const handler = mount(BoxPage);
    assert.equal(handler.data.getItem('main.box.count'), 7);
    assert.equal(handler.data.getItem('main.box.quiet'), 8);
});

test('cascade: a change flows through two formula levels', () => {
    class CascadePage extends HtmlBuilder {
        static sum(b) { return (b.a || 0) + (b.b || 0); }

        static dbl(b) { return (b.s || 0) * 2; }

        main(root) {
            const w = root.div({ datapath: 'w' });
            w.dataSetter({ destination: '.a', value: 1 });
            w.dataSetter({ destination: '.b', value: 2 });
            w.dataFormula({ destination: '.sum', formula: 'sum', a: '^.a', b: '^.b', _on_start: true });
            w.dataFormula({ destination: '.dbl', formula: 'dbl', s: '^.sum', _on_start: true });
            w.span('^.sum');
            w.span('^.dbl');
        }
    }
    const handler = mount(CascadePage);
    assert.equal(handler.data.getItem('main.w.sum'), 3);
    assert.equal(handler.data.getItem('main.w.dbl'), 6);

    handler.live(() => handler.data.setItem('main.w.a', 10));
    assert.equal(handler.data.getItem('main.w.sum'), 12);   // sum recomputed
    assert.equal(handler.data.getItem('main.w.dbl'), 24);   // cascaded to dbl
});

test('data_logic: funcs resolved by name from a separate business-logic class', () => {
    class OrderLogic {
        static lineTotal(b) { return (b.qty || 0) * (b.price || 0); }
    }
    class OrderPage extends HtmlBuilder {
        // The logic lives elsewhere; the page declares where to look.
        _buildDataLogic() { return [this, OrderLogic]; }

        main(root) {
            const w = root.div({ datapath: 'o' });
            w.dataSetter({ destination: '.qty', value: 3 });
            w.dataSetter({ destination: '.price', value: 10 });
            w.dataFormula({
                destination: '.total', formula: 'lineTotal',
                qty: '^.qty', price: '^.price', _on_start: true,
            });
            w.span('^.total');
        }
    }
    const handler = mount(OrderPage);
    assert.equal(handler.data.getItem('main.o.total'), 30);   // func from OrderLogic
    handler.live(() => handler.data.setItem('main.o.qty', 5));
    assert.equal(handler.data.getItem('main.o.total'), 50);   // recomputed
});

test('formula can be a callable passed directly (JS extension)', () => {
    class CallablePage extends HtmlBuilder {
        main(root) {
            const w = root.div({ datapath: 'c' });
            w.dataSetter({ destination: '.x', value: 4 });
            w.dataFormula({
                destination: '.sq', formula: (b) => b.x * b.x, x: '^.x', _on_start: true,
            });
            w.span('^.sq');
        }
    }
    const handler = mount(CallablePage);
    assert.equal(handler.data.getItem('main.c.sq'), 16);
    handler.live(() => handler.data.setItem('main.c.x', 5));
    assert.equal(handler.data.getItem('main.c.sq'), 25);
});

test('formula can be a JS code string, compiled to a function (JS extension)', () => {
    class CodePage extends HtmlBuilder {
        main(root) {
            const w = root.div({ datapath: 'd' });
            w.dataSetter({ destination: '.a', value: 3 });
            w.dataSetter({ destination: '.b', value: 7 });
            w.dataFormula({
                destination: '.sum', formula: '({ a, b }) => a + b',
                a: '^.a', b: '^.b', _on_start: true,
            });
            w.span('^.sum');
        }
    }
    const handler = mount(CodePage);
    assert.equal(handler.data.getItem('main.d.sum'), 10);
    handler.live(() => handler.data.setItem('main.d.a', 100));
    assert.equal(handler.data.getItem('main.d.sum'), 107);
});

test('livelock backstop: a → b → a re-queue trips FORMULA_REQUEUE_LIMIT', () => {
    class PingPong extends HtmlBuilder {
        static bump(b) { return (b.v || 0) + 1; }

        main(root) {
            const w = root.div();
            w.dataSetter({ destination: 'ping', value: 0 });
            w.dataSetter({ destination: 'pong', value: 0 });
            w.dataFormula({ destination: 'ping', formula: 'bump', v: '^pong' });
            w.dataFormula({ destination: 'pong', formula: 'bump', v: '^ping' });
            w.span('^ping');
        }
    }
    const handler = mount(PingPong);
    assert.throws(
        () => handler.live(() => handler.data.setItem('main.ping', 1)),
        /livelock/,
    );
});

// Public formula name is exclusive; controllers retain their own func contract.
for (const obsolete of [{func: 'calc'}, {formula: 'calc', func: 'calc'}]) {
    test('dataFormula rejects func even when formula is present: ' + JSON.stringify(obsolete), () => {
        class InvalidFormula extends HtmlBuilder {
            static calc() { return 1; }
            main(root) {
                root.dataFormula({destination: 'result', ...obsolete, _on_start: true});
            }
        }
        assert.throws(() => mount(InvalidFormula), /dataFormula.*formula.*func/);
    });
}
test('formula accepts callable and function text without exposing formula as a binding', () => {
    class FormulaNames extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'value', value: 3});
            root.dataFormula({destination: 'twice', formula: bindings => {
                assert.deepEqual(Object.keys(bindings), ['amount']);
                return bindings.amount * 2;
            }, amount: '^value', _on_start: true});
            root.dataFormula({destination: 'label', formula: '({amount}) => amount + "px"',
                amount: '^twice', _on_start: true});
        }
    }
    const handler = mount(FormulaNames);
    assert.equal(handler.data.getItem('main.label'), '6px');
});


test('positional dataFormula preserves relative bindings and reactive updates', () => {
    class BudgetPage extends HtmlBuilder {
        main(root) {
            const pane = root.div({datapath: 'budget'});
            pane.dataSetter({destination: '.income', value: 2500});
            pane.dataSetter({destination: '.expenses', value: 1580});
            pane.dataFormula('.balance', 'income - expenses', {
                income: '^.income', expenses: '^.expenses', _on_start: true,
            });
            assert.throws(() => pane.dataFormula('.bad', 'x', {formula: 'y'}), /Use dataFormula/);
        }
    }
    const handler = mount(BudgetPage);
    assert.equal(handler.data.getItem('main.budget.balance'), 920);
    handler.live(() => handler.data.setItem('main.budget.income', 1000));
    assert.equal(handler.data.getItem('main.budget.balance'), -580);
});
