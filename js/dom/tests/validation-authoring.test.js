// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** .validate() is fluent authoring sugar for the existing validate_* runtime. */
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {Application, HtmlBuilder} from '../src/index.js';
import {setupDom} from './dom.js';
import '../src/collections/inputs.js';

function mount() {
    setupDom();
    const rules = Object.freeze({
        notnull: true,
        email: true,
        email_warning: '^messages.email',
        notnull_error: 'An address is required.',
        email_if: true,
        onAccept: "this.SET('validation.accepted', true);",
        onReject: "this.SET('validation.rejected', true);",
        timeout: 250,
    });
    const prefixed = Object.freeze({
        validate_notnull: true,
        validate_len: '3:8',
        validate_len_error: 'Use 3 to 8 characters.',
    });
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs'];
        setup() {
            this.setData('validation.email', 'wrong');
            this.setData('messages.email', 'Check address');
        }
        main(root) {
            const field = root.textBox({value: '^validation.email', node_id: 'email',
                validate_email_warning: 'Inline'});
            this.returned = field.validate(rules);
            root.textBox({value: 'ABC', node_id: 'direct', ...prefixed});
            this.rules = rules;
            this.prefixed = prefixed;
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const builder = new Page('example');
    const app = new Application(host, builder, {inspector: false});
    return {app, builder, host, node: builder.nodeById('email'), rules, prefixed};
}

test('object rules normalize without mutation and later assignments win', () => {
    const {app, builder, node, rules, prefixed} = mount();
    const original = {...rules};
    assert.deepEqual(rules, original);
    for (const [name, value] of Object.entries(rules)) {
        assert.equal(node.getAttr(`validate_${name}`), value);
    }
    assert.equal(node.getAttr('validate_email_warning'), '^messages.email');
    const direct = builder.nodeById('direct');
    assert.equal(direct.getAttr('validate_notnull'), true);
    assert.equal(direct.getAttr('validate_len'), '3:8');
    assert.deepEqual(prefixed, {
        validate_notnull: true,
        validate_len: '3:8',
        validate_len_error: 'Use 3 to 8 characters.',
    });

    builder.returned.validate({email_warning: 'Second call', email: null});
    assert.equal(node.getAttr('validate_email_warning'), 'Second call');
    assert.equal(node.getAttr('validate_email'), null);
    node.setAttr({validate_email_warning: 'Direct assignment'});
    assert.equal(node.getAttr('validate_email_warning'), 'Direct assignment');
    assert.throws(() => builder.returned.validate({validate_email: true}), /unprefixed/);
    assert.throws(() => builder.returned.validate(null), /expects an object/);
    assert.deepEqual(rules, original);
    app.dispose();
});

test('normalized rules use the existing warning, error and reactive-message runtime', () => {
    const {app, host} = mount();
    const widget = host.querySelector('gnr-textbox');
    const input = widget.shadowRoot.querySelector('input');
    const message = () => widget.shadowRoot.querySelector('[data-validation-message]').textContent;

    assert.equal(input.getAttribute('aria-invalid'), 'false');
    assert.equal(message(), 'Check address');
    app.live(() => app.data.setItem('example.messages.email', 'Use a complete address.'));
    assert.equal(message(), 'Use a complete address.');

    app.mutate(widget.id, '');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(message(), 'An address is required.');
    assert.equal(app.data.getItem('example.validation.email'), 'wrong');

    app.mutate(widget.id, 'person@example.test');
    assert.equal(input.getAttribute('aria-invalid'), 'false');
    assert.equal(app.data.getItem('example.validation.email'), 'person@example.test');
    app.dispose();
});
