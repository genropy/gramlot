// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Generated descriptor -> Builders grammar -> collection -> real custom element. */
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {Application, HtmlBuilder} from '../src/index.js';
import {setupDom} from './dom.js';
import {guideTextBoxContract} from '../../../docs/examples/components/textbox/generated/textbox-contract.js';
import {guideTextBoxAreaContract} from '../../../docs/examples/components/textbox/generated/textbox-area-contract.js';

test('generated component contract links its isolated recipe to the real textBox', () => {
    setupDom();
    const identity = guideTextBoxContract.identity;
    class GuidePage extends HtmlBuilder {
        static wc_requires = [identity.collection];
        setup() { this.setData('record.name', 'Ada'); }
        main(root) {
            root.guideTextBox({value: '^record.name', placeholder: '', disabled: false,
                dtype: 'CUSTOM', default: false, default_value: '', lbl: 'Name'});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new GuidePage('guide'));
    const widget = host.querySelector('gnr-textbox');
    assert.ok(widget);
    assert.equal(widget.value, 'Ada');
    assert.equal(app.builder.schema.guideTextBox,
        guideTextBoxContract.builder_grammar.elements.guideTextBox);
    assert.equal(app.builder.schema.guideTextBox._meta.render_tag, identity.custom_tag);
    assert.equal(guideTextBoxContract.builder_grammar.elements.guideTextBox.attributes, null);
    assert.ok(guideTextBoxContract.parameters.some(parameter => parameter.name === 'dtype'));

    const input = widget.shadowRoot.querySelector('input');
    input.value = 'Grace';
    input.dispatchEvent(new window.Event('change', {bubbles: true}));
    assert.equal(app.data.getItem('guide.record.name'), 'Grace');
    app.dispose();
});

test('generated textBoxArea contract carries remainingHint to the production component', () => {
    setupDom();
    const identity = guideTextBoxAreaContract.identity;
    class GuideAreaPage extends HtmlBuilder {
        static wc_requires = [identity.collection];
        setup() { this.setData('record.notes', '123456789'); }
        main(root) {
            root.guideTextBoxArea({value: '^record.notes', maxlength: 10,
                remainingHint: '10%', rows: 4, lbl: 'Notes'});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new GuideAreaPage('area-guide'));
    const widget = host.querySelector('gnr-textboxarea');
    assert.ok(widget);
    assert.equal(widget.shadowRoot.querySelector('textarea').getAttribute('rows'), '4');
    assert.equal(widget.shadowRoot.querySelector('#remaining').textContent,
        '1 character remaining');
    assert.ok(guideTextBoxAreaContract.parameters.some(
        parameter => parameter.name === 'remainingHint'));
    assert.equal(app.builder.schema.guideTextBoxArea._meta.render_tag,
        identity.custom_tag);
    app.dispose();
});
