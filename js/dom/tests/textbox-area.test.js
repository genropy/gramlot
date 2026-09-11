// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Dedicated multiline input keeps the shared input, decoration and form contracts. */
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {Application, HtmlBuilder} from '../src/index.js';
import {setupDom} from './dom.js';
import '../src/collections/inputs.js';
import '../src/collections/layout.js';
import '../src/collections/forms.js';

function mount(value = null, overrides = {}) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs', 'layout', 'forms'];
        setup() { this.setData('draft.notes', value); }
        main(root) {
            const form = root.form({formId: 'notes', datapath: 'draft'});
            const fields = form.formlet({lbl_position: 'R', lbl_color: 'purple', box_padding: '5px'});
            fields.textBoxArea({value: '^.notes', node_id: 'notes', lbl: 'Notes', rows: 0,
                cols: 40, placeholder: '', maxlength: 120, minlength: 3, wrap: 'soft',
                autocomplete: 'off', validate_len: '3:120', ...overrides});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('area'));
    const widget = host.querySelector('gnr-textboxarea');
    return {app, host, widget, area: widget.shadowRoot.querySelector('textarea')};
}

test('textBoxArea renders a native textarea and forwards its native parameters exactly', () => {
    const {app, widget, area} = mount(null);
    assert.equal(widget.value, null);
    assert.equal(area.classList.contains('gnr-null-value'), true);
    for (const [name, value] of Object.entries({
        rows: '0', cols: '40', placeholder: '', maxlength: '120', minlength: '3',
        wrap: 'soft', autocomplete: 'off',
    })) assert.equal(area.getAttribute(name), value, name);
    assert.equal(widget.shadowRoot.querySelector('.labledBox').style.flexDirection, 'row-reverse');
    assert.equal(widget.shadowRoot.querySelector('.labledBox').style.padding, '5px');
    assert.equal(widget.shadowRoot.querySelector('label').style.color, 'purple');
    assert.equal(widget.shadowRoot.querySelector('#remaining').hidden, true);
    assert.equal(area.getAttribute('aria-describedby')?.includes('remaining') || false, false);
    app.dispose();
});

test('absolute remainingHint is inclusive, live, UTF-16 based and reactive', () => {
    const {app, widget, area} = mount('A😀', {remainingHint: 2, maxlength: 5,
        validate_len: null});
    const remaining = widget.shadowRoot.querySelector('#remaining');
    assert.equal(remaining.hidden, false);
    assert.equal(remaining.textContent, '2 characters remaining');
    assert.match(area.getAttribute('aria-describedby'), /remaining/);
    assert.equal(remaining.hasAttribute('aria-live'), false);

    area.value = '😀😀😀';
    area.dispatchEvent(new window.Event('input', {bubbles: true}));
    assert.equal(remaining.textContent, '1 character over limit');
    assert.equal(app.data.getItem('area.draft.notes'), 'A😀');

    // End the uncommitted edit before testing passive source updates.
    area.dispatchEvent(new window.Event('change', {bubbles: true}));
    app.live(() => app.data.setItem('area.draft.notes', 'x'));
    assert.equal(remaining.hidden, true);
    app.live(() => app.builder.nodeById('notes').setAttr({remainingHint: '4'}));
    assert.equal(remaining.textContent, '4 characters remaining');
    app.live(() => app.builder.nodeById('notes').setAttr({maxlength: 1}));
    assert.equal(remaining.textContent, '0 characters remaining');
    app.live(() => app.data.setItem('area.draft.notes', null));
    assert.equal(remaining.textContent, '1 character remaining');
    app.live(() => app.builder.nodeById('notes').setAttr({maxlength: null}));
    assert.equal(remaining.hidden, true);
    assert.equal(area.getAttribute('aria-describedby')?.includes('remaining') || false, false);
    app.dispose();
});

test('percentage remainingHint supports equality, 100%, over-limit and no-limit hiding', () => {
    const mounted = mount('123456789', {remainingHint: '10%', maxlength: 10,
        validate_len: null});
    const {app, widget, area} = mounted;
    const remaining = widget.shadowRoot.querySelector('#remaining');
    assert.equal(remaining.textContent, '1 character remaining');
    area.value = '12345678';
    area.dispatchEvent(new window.Event('input', {bubbles: true}));
    assert.equal(remaining.hidden, true);
    area.dispatchEvent(new window.Event('change', {bubbles: true}));
    app.live(() => app.builder.nodeById('notes').setAttr({remainingHint: '100%'}));
    assert.equal(remaining.textContent, '2 characters remaining');
    app.live(() => app.data.setItem('area.draft.notes', '12345678901'));
    assert.equal(remaining.textContent, '1 character over limit');
    app.live(() => app.builder.nodeById('notes').setAttr({maxlength: null,
        remainingHint: 'not parsed without a limit'}));
    assert.equal(remaining.hidden, true);
    app.dispose();
});

test('remainingHint and maxlength thresholds react through normal data bindings', () => {
    const {app, widget} = mount('1234', {remainingHint: '^.hint', maxlength: '^.limit',
        validate_len: null});
    const remaining = widget.shadowRoot.querySelector('#remaining');
    assert.equal(remaining.hidden, true);
    app.live(() => {
        app.data.setItem('area.draft.hint', 2);
        app.data.setItem('area.draft.limit', 5);
    });
    assert.equal(remaining.textContent, '1 character remaining');
    app.live(() => app.data.setItem('area.draft.hint', 0));
    assert.equal(remaining.hidden, true);
    app.live(() => app.data.setItem('area.draft.limit', 4));
    assert.equal(remaining.textContent, '0 characters remaining');
    app.dispose();
});

test('remainingHint rejects malformed and out-of-range thresholds', () => {
    for (const hint of ['always', '-1', '101%', '-2.5%', 'NaN']) {
        assert.throws(() => mount('', {remainingHint: hint, maxlength: 10}),
            /Invalid remainingHint/);
    }
});

test('multiline focus-out writes back, validates and preserves empty versus null', () => {
    const {app, widget, area} = mount('');
    const form = app.builder.nodeById('notes').getFormHandler();
    assert.equal(widget.value, '');
    area.value = 'first\nsecond';
    area.dispatchEvent(new window.Event('input', {bubbles: true}));
    assert.equal(app.data.getItem('area.draft.notes'), '');
    area.dispatchEvent(new window.Event('change', {bubbles: true}));
    assert.equal(app.data.getItem('area.draft.notes'), 'first\nsecond');
    assert.equal(form.state.dirty, true);
    assert.equal(form.state.valid, true);

    area.value = '';
    area.dispatchEvent(new window.Event('input', {bubbles: true}));
    area.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Backspace', bubbles: true, composed: true, cancelable: true,
    }));
    assert.equal(widget.value, null);
    area.dispatchEvent(new window.Event('blur', {bubbles: true}));
    assert.equal(app.data.getItem('area.draft.notes'), null);
    app.dispose();
});

test('focused textBoxArea keeps draft and selection across reactive label and value updates', () => {
    const {app, host, widget, area} = mount('stored');
    area.focus();
    area.value = 'draft\ntext';
    area.dispatchEvent(new window.Event('input', {bubbles: true}));
    area.setSelectionRange(2, 7);
    app.live(() => {
        app.data.setItem('area.draft.notes', 'server');
        app.builder.nodeById('notes').setAttr({lbl: 'Updated'});
    });
    const current = host.querySelector('gnr-textboxarea');
    assert.equal(current, widget);
    assert.equal(current.shadowRoot.activeElement, area);
    assert.equal(area.value, 'draft\ntext');
    assert.equal(area.selectionStart, 2);
    assert.equal(area.selectionEnd, 7);
    assert.equal(current.shadowRoot.querySelector('label').textContent, 'Updated');
    app.dispose();
});
