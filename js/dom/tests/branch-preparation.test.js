// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder, SourceBag, wrapSource} from '../src/index.js';

function mount(Page) {
    setupDom();
    const host = document.createElement('div');
    const app = new Application(host, new Page('main'));
    return {app, host};
}

test('a late branch runs every setter before its startup formulas', () => {
    class Page extends HtmlBuilder {
        main(root) { root.div({node_id: 'host', datapath: 'part'}); }
    }
    const {app} = mount(Page);
    app.live(() => {
        const branch = app.builder.nodeById('host');
        branch.dataFormula({destination: '.answer', formula: 'x * 2', x: '=.x', _on_start: true});
        branch.dataSetter({destination: '.x', value: 3});
    });
    assert.equal(app.data.getItem('main.part.answer'), 6);
});

test('an inserted SourceBag is prepared as one complete branch', () => {
    class Page extends HtmlBuilder {
        main(root) { root.div({node_id: 'host', datapath: 'part'}); }
    }
    const {app, host} = mount(Page);
    app.live(() => {
        const detached = new SourceBag(null, app.builder, app.handler);
        const branch = wrapSource(detached);
        branch.span('^.answer');
        branch.dataFormula({destination: '.answer', formula: 'x * 2', x: '=.x', _on_start: true});
        branch.dataSetter({destination: '.x', value: 4});
        app.builder.nodeById('host').div(detached);
    });
    assert.equal(app.data.getItem('main.part.answer'), 8);
    assert.equal(host.querySelector('div div span').textContent, '8');
});

test('a custom element first connects after branch initialization', async () => {
    setupDom();
    const observed = [];
    customElements.define('x-branch-probe', class extends HTMLElement {
        connectedCallback() { observed.push(this.getAttribute('value')); }
    });
    class Page extends HtmlBuilder {
        static { this.defineGrammar({elements: {
            branchProbe: {sub_tags: '', _meta: {render_tag: 'x-branch-probe'}},
        }}); }
        main(root) { root.div({node_id: 'host', datapath: 'part'}); }
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = new Application(host, new Page('main'));
    app.live(() => {
        const branch = app.builder.nodeById('host');
        branch.branchProbe({value: '^.ready'});
        branch.dataSetter({destination: '.ready', value: 'yes'});
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(observed, ['yes']);
});

test('prepared setters do not reseed data on a later render', () => {
    class Page extends HtmlBuilder {
        main(root) { root.div({node_id: 'host', datapath: 'part'}); }
    }
    const {app} = mount(Page);
    app.live(() => app.builder.nodeById('host').dataSetter({destination: '.x', value: 3}));
    app.data.setItem('main.part.x', 9);
    app.render();
    assert.equal(app.data.getItem('main.part.x'), 9);
});

test('a branch removed in its insertion batch is never prepared', () => {
    class Page extends HtmlBuilder {
        main(root) { root.div({node_id: 'host', datapath: 'part'}); }
    }
    const {app} = mount(Page);
    app.live(() => {
        const host = app.builder.nodeById('host');
        const doomed = host.div();
        doomed.dataSetter({destination: '.ghost', value: 'ran'});
        host.value.pop(doomed.label);
    });
    assert.equal(app.data.getNode('main.part.ghost'), null);
});

test('failed startup remains retryable without replaying successful setters', () => {
    let attempts = 0;
    class Page extends HtmlBuilder {
        static flaky({x}) {
            attempts += 1;
            if (attempts === 1) throw new Error('first startup failed');
            return x * 2;
        }
        main(root) { root.div({node_id: 'host', datapath: 'part'}); }
    }
    const {app} = mount(Page);
    assert.throws(() => app.live(() => {
        const branch = app.builder.nodeById('host');
        branch.dataSetter({destination: '.x', value: 3});
        branch.dataFormula({destination: '.answer', formula: 'flaky', x: '=.x', _on_start: true});
    }), /first startup failed/);
    app.data.setItem('main.part.x', 7);
    app.render();
    assert.equal(attempts, 2);
    assert.equal(app.data.getItem('main.part.answer'), 14);
});

test('a controller that writes its own dependency fails with a bounded diagnostic', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'x', value: 1});
            root.dataController({func: 'sourceNode.SET("x", x + 1)', x: '^x'});
        }
    }
    const {app} = mount(Page);
    assert.throws(() => app.live(() => app.data.setItem('main.x', 2)),
        /dataController reactive execution cycle/);
});
