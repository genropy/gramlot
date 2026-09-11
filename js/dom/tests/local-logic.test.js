// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';

function mount(Page) {
    setupDom();
    const host = document.createElement('div');
    const app = new Application(host, new Page('main'));
    return {app, host};
}

test('branch preparation runs all setters before defaults and widgets', () => {
    class Page extends HtmlBuilder {
        main(root) {
            const pane = root.div({datapath: 'sample'});
            pane.span('^.value', {default: 'fallback'});
            pane.dataSetter({destination: '.value', value: null});
        }
    }
    const {app, host} = mount(Page);
    assert.ok(app.data.getNode('main.sample.value'));
    assert.equal(app.data.getItem('main.sample.value'), null);
    assert.equal(host.querySelector('span').textContent, '');
    app.data.setItem('main.sample.value', 'edited');
    app.render();
    assert.equal(app.data.getItem('main.sample.value'), 'edited');
});

test('an inserted branch is prepared once before its first patch', () => {
    class Page extends HtmlBuilder { main(root) { root.div({node_id: 'host', datapath: 'inserted'}); } }
    const {app, host} = mount(Page);
    app.live(() => {
        const branch = app.builder.nodeById('host');
        branch.span('^.late', {default: 'fallback'});
        branch.dataSetter({destination: '.late', value: 'prepared'});
    });
    assert.equal(host.querySelector('span').textContent, 'prepared');
    app.live(() => app.data.setItem('main.inserted.late', 'edited'));
    app.render();
    assert.equal(app.data.getItem('main.inserted.late'), 'edited');
});

test('formula expressions and controller scripts share fresh named bindings', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'qty', value: 2});
            root.dataSetter({destination: 'price', value: 5});
            root.dataFormula({destination: 'total', formula: 'qty * price', qty: '^qty', price: '=price', _on_start: true});
            root.dataController({func: 'sourceNode.SET("seen", total)', total: '^total'});
        }
    }
    const {app} = mount(Page);
    assert.equal(app.data.getItem('main.total'), 10);
    assert.equal(app.data.getItem('main.seen'), null);
    app.live(() => {
        app.data.setItem('main.price', 7);
        app.data.setItem('main.qty', 3);
    });
    assert.equal(app.data.getItem('main.total'), 21);
    assert.equal(app.data.getItem('main.seen'), 21);
});

test('inline == attributes update from reactive peers and read passive peers freshly', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'qty', value: 2});
            root.dataSetter({destination: 'price', value: 5});
            root.span('==qty * price', {qty: '^qty', price: '=price'});
        }
    }
    const {app, host} = mount(Page);
    assert.equal(host.querySelector('span').textContent, '10');
    app.live(() => {
        app.data.setItem('main.price', 7);
        app.data.setItem('main.qty', 3);
    });
    assert.equal(host.querySelector('span').textContent, '21');
});

test('startup formulas are dependency ordered and cycles fail explicitly', () => {
    class Ordered extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'value', value: 3});
            root.dataFormula({destination: 'result', formula: 'middle + 1', middle: '^middle', _on_start: true});
            root.dataFormula({destination: 'middle', formula: 'value * 2', value: '^value', _on_start: true});
        }
    }
    assert.equal(mount(Ordered).app.data.getItem('main.result'), 7);
    class Cyclic extends HtmlBuilder {
        main(root) {
            root.dataFormula({destination: 'a', formula: 'b', b: '^b', _on_start: true});
            root.dataFormula({destination: 'b', formula: 'a', a: '^a', _on_start: true});
        }
    }
    assert.throws(() => mount(Cyclic), /startup dependency cycle/);
});

test('removing a provider unregisters it from the existing reactive graph', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'source', value: 1});
            root.dataFormula({destination: 'derived', formula: 'source + 1', source: '^source'});
        }
    }
    const {app} = mount(Page);
    const formula = app.builder.source.getNodes().find(node => node.nodeTag === 'dataFormula');
    app.live(() => app.builder.source.pop(formula.label));
    app.live(() => app.data.setItem('main.source', 4));
    assert.equal(app.data.getItem('main.derived'), null);
});

test('inline expression cycles and evaluation failures name their attribute', () => {
    class Cyclic extends HtmlBuilder { main(root) { root.div({a: '==b', b: '==a'}); } }
    assert.throws(() => mount(Cyclic), /inline expression cycle/);
    class Broken extends HtmlBuilder { main(root) { root.div({answer: '==missing + 1'}); } }
    assert.throws(() => mount(Broken), /inline expression 'answer' failed/);
});

test('removing a queued formula cancels execution and creates no DOM patch', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'source', value: 1});
            root.dataFormula({destination: 'derived', formula: 'source + 1', source: '^source'});
        }
    }
    const {app} = mount(Page);
    const formula = app.builder.source.getNodes().find(node => node.nodeTag === 'dataFormula');
    app.live(() => {
        app.data.setItem('main.source', 4);
        app.builder.source.pop(formula.label);
    });
    assert.equal(app.data.getItem('main.derived'), null);
    app.dispose();
});

test('controllers receive the triggering Bag event and relationship, including startup', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.dataController({func: `this.SET('seen', {
                label: _triggerpars?.kw.node.label ?? null,
                event: _triggerpars?.kw.evt ?? null,
                reason: _reason,
                value: count
            })`, contacts: '^contacts', count: '^count', passive: '=passive', _on_start: true});
        }
    }
    const {app} = mount(Page);
    assert.deepEqual(app.data.getItem('main.seen'), {label: null, event: null, reason: null, value: null});
    app.data.setItem('main.count', 3);
    assert.deepEqual(app.data.getItem('main.seen'), {label: 'count', event: 'ins', reason: 'node', value: 3});
    app.data.setItem('main.contacts.c1.name', 'Anna');
    assert.equal(app.data.getItem('main.seen').label, 'name');
    assert.equal(app.data.getItem('main.seen').reason, 'child');
    const last = app.data.getItem('main.seen');
    app.data.setItem('main.passive', 2);
    assert.strictEqual(app.data.getItem('main.seen'), last);
    app.dispose();
});
