// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Write-back (DOM → data): a value-bound input, on change, writes the
 * datum it is bound to; a separate reader of the same path updates.
 *
 * Linear port of the ws-web mutate contract (resolve node by identity →
 * derive destination from the node's own `value` pointer → write in
 * live()). Runs against a real DOM (jsdom). The anti-echo of the input
 * reading itself (focus loss) is out of scope here — a separate reader
 * (span) shows the propagation cleanly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { Application } from '../src/application.js';

class FormPage extends HtmlBuilder {
    setup() { this.setData('form.name', ''); }

    main(root) {
        const d = root.div({ datapath: 'form', node_id: 'form' });
        d.input({ value: '^.name', dtype: 'A' });   // default updateOn: 'blur'
        d.span('^.name');   // a separate reader of the same datum
    }
}

class LiveFormPage extends HtmlBuilder {
    setup() { this.setData('form.name', ''); }

    main(root) {
        const d = root.div({ datapath: 'form', node_id: 'form' });
        d.input({ value: '^.name', dtype: 'A', updateOn: 'input' });   // live
        d.span('^.name');
    }
}

function fire(el, type) {
    el.dispatchEvent(new window.Event(type, { bubbles: true }));
}

test('input renders with value + data-value-pointer hook', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new FormPage('main');
    // eslint-disable-next-line no-new
    new Application(root, page);

    const input = root.querySelector('input');
    assert.ok(input, 'input rendered');
    // the write-back hook carries the absolute datapath to write to
    assert.equal(input.getAttribute('data-value-pointer'), 'main.form.name');
});

test('mutate() writes the datum and updates the other reader', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new FormPage('main');
    const genro = new Application(root, page);

    const input = root.querySelector('input');
    genro.mutate(input.id, 'Mario');

    assert.equal(genro.data.getItem('main.form.name'), 'Mario');
    assert.equal(root.querySelector('span').textContent, 'Mario');
});

test('anti-echo: the originating node is not re-rendered (reason)', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new FormPage('main');
    const genro = new Application(root, page);

    const input = root.querySelector('input');
    genro.mutate(input.id, 'Mario');

    // the other reader updated…
    assert.equal(root.querySelector('span').textContent, 'Mario');
    // …but the input that originated the write is the SAME element,
    // not replaced (legacy `kw.reason != this`): focus/cursor survive.
    assert.strictEqual(root.querySelector('input'), input);
});

test('default updateOn blur: writes on change, NOT on each input event', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new FormPage('main');
    const genro = new Application(root, page);

    const input = root.querySelector('input');
    input.value = 'Anna';
    fire(input, 'input');   // keystroke — must NOT write yet (default blur)
    assert.equal(genro.data.getItem('main.form.name'), '');

    fire(input, 'change');  // focus lost / tab / click-out — writes now
    assert.equal(genro.data.getItem('main.form.name'), 'Anna');
});

test('updateOn "input": writes live on each input event', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new LiveFormPage('main');
    const genro = new Application(root, page);

    const input = root.querySelector('input');
    input.value = 'Ann';
    fire(input, 'input');
    assert.equal(genro.data.getItem('main.form.name'), 'Ann');
    assert.equal(root.querySelector('span').textContent, 'Ann');
});
