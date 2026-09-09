// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: HTML ids do not replace stable source identities for reactive patches.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/inputs.js';

test('explicit ids support value/style bindings, write-back, id changes and source removal', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs'];
        setup() { this.setData('amount', 12.5); this.setData('caption', 'Amount'); }
        main(root) {
            this.pane = root.div({id: 'pane'});
            this.output = this.pane.div('^amount', {id: 'result'});
            this.input = this.pane.textBox({id: 'editor', value: '^amount', lbl: '^caption'});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const page = new Page('page');
    const app = new Application(host, page);
    app.live(() => page.data.setItem('amount', 1234.56));
    assert.equal(host.querySelector('#result').textContent, '1234.56');
    const editor = host.querySelector('#editor');
    app.live(() => page.data.setItem('caption', 'New amount'));
    assert.equal(host.querySelector('#editor'), editor);
    assert.equal(editor.shadowRoot.querySelector('label').textContent, 'New amount');
    editor.value = '99';
    editor.dispatchEvent(new Event('change', {bubbles:true}));
    assert.equal(page.data.getItem('amount'), '99');
    assert.equal(host.querySelector('#result').textContent, '99');
    app.live(() => page.output.setAttr({id: 'renamed', color: 'red'}));
    assert.equal(host.querySelector('#result'), null);
    assert.equal(host.querySelector('#renamed').style.color, 'red');
    app.live(() => page.data.setItem('amount', 7));
    assert.equal(host.querySelector('#renamed').textContent, '7');
    app.live(() => page.pane.div('Inserted', {id: 'before', node_position: '<'}));
    assert.equal(host.querySelector('#pane').firstElementChild.id, 'before');
    app.live(() => page.pane.value.pop(page.output.label));
    assert.equal(host.querySelector('#renamed'), null);
    app.dispose();
    assert.equal(host.children.length, 0);
});
