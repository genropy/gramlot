// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Web-component collections: a page declares `wc_requires`; the builder
 * folds the collection grammar and defines the custom elements. The tags
 * project to <gnr-<name>> and carry the resolved value.
 *
 * Runs against jsdom (customElements + shadow DOM). Importing a collection
 * module registers it (side-effect); defineComponents runs at create time.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { Application } from '../src/application.js';
import '../src/collections/inputs.js';        // registers 'inputs'
import '../src/collections/colorpicker.js';   // registers 'colorpicker'

class WidgetsPage extends HtmlBuilder {
    static wc_requires = ['inputs', 'colorpicker'];

    setup() {
        this.setData('form.d', '2026-07-05');
        this.setData('form.c', '#ff0000');
    }

    main(root) {
        const d = root.div({ datapath: 'form', node_id: 'form' });
        d.dateTextBox({ value: '^.d' });
        d.colorpicker({ value: '^.c' });
    }
}

test('wc_requires (A) folds the collection grammar and projects gnr-<name>', () => {
    setupDom();
    const root = document.createElement('div');
    new Application(root, new WidgetsPage('main'));   // eslint-disable-line no-new

    const dt = root.querySelector('gnr-datetextbox');
    assert.ok(dt, 'dateTextBox projected as <gnr-datetextbox>');
    assert.equal(dt.getAttribute('value'), '2026-07-05');   // ^.d resolved
    assert.ok(root.querySelector('gnr-colorpicker'), 'colorpicker projected');
    assert.equal(root.querySelector('gnr-colorpicker').getAttribute('value'), '#ff0000');
});

test('required collections define their custom elements', () => {
    setupDom();
    new Application(document.createElement('div'), new WidgetsPage('main')); // eslint-disable-line no-new
    assert.ok(customElements.get('gnr-datetextbox'), 'gnr-datetextbox defined');
    assert.ok(customElements.get('gnr-colorpicker'), 'gnr-colorpicker defined');
    assert.ok(customElements.get('gnr-numbertextbox'), 'whole inputs family defined');
});

test('checkbox write-back: a change updates the checked datum', () => {
    setupDom();
    class CbPage extends HtmlBuilder {
        static wc_requires = ['inputs'];

        setup() { this.setData('f.flag', true); }

        main(root) { root.div({ datapath: 'f' }).checkbox({ checked: '^.flag', label: 'x' }); }
    }
    const root = document.createElement('div');
    document.body.appendChild(root);   // connect so connectedCallback runs
    const genro = new Application(root, new CbPage('main'));

    const cb = root.querySelector('gnr-checkbox');
    const inner = cb.shadowRoot.querySelector('input');
    inner.checked = false;
    // native change is NOT composed; the widget re-emits it composed so it
    // crosses the shadow and reaches the delegated listener.
    inner.dispatchEvent(new window.Event('change', { bubbles: true }));

    assert.equal(genro.data.getItem('main.f.flag'), false);
});

test('wcRequires() in setup (B) works like static wc_requires', () => {
    setupDom();
    class Page2 extends HtmlBuilder {
        setup() {
            this.wcRequires('inputs');
            this.setData('x.v', '');
        }

        main(root) { root.div({ datapath: 'x' }).numberTextBox({ value: '^.v' }); }
    }
    const root = document.createElement('div');
    new Application(root, new Page2('main'));   // eslint-disable-line no-new
    assert.ok(root.querySelector('gnr-numbertextbox'), 'grammar available via setup requires');
});

test('lbl styles target the label and support updates and removal', async () => {
    setupDom();
    const host = document.createElement('div');
    document.body.appendChild(host);
    class LabelPage extends HtmlBuilder {
        static wc_requires = ['inputs'];
        main(root) {
            root.textBox({lbl: 'Title', color: 'red', lbl_color: 'green',
                lbl_font_size: '20px', lbl_font_weight: 'bold', lbl_side: 'top'});
        }
    }
    new Application(host, new LabelPage('labels'));
    const field = host.querySelector('gnr-textbox');
    const label = field.shadowRoot.querySelector('label');
    assert.equal(field.style.color, 'red');
    assert.equal(label.style.color, 'green');
    assert.equal(label.style.fontSize, '20px');
    assert.equal(label.style.fontWeight, 'bold');
    assert.ok(field.shadowRoot.querySelector('.labledBox_top'));
    field.setAttribute('lbl_color', 'blue');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(label.style.color, 'blue');
    field.removeAttribute('lbl_color');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(label.style.color, '');
    host.remove();
});
