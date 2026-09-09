// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: local choices separate caption/code and reject invalid commits.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import '../src/collections/inputs.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';
import {Application} from '../src/application.js';
class Page extends HtmlBuilder {
    static wc_requires = ['inputs'];
    setup() { this.setData('country', 'IT'); this.setData('free', ''); }
    main(root) {
        root.filteringSelect({value:'^country', values:'IT:Italia,FR:Francia'});
        root.comboBox({value:'^free', values:'Italia,Francia'});
    }
}
test('choice commits, invalid text, free text and external updates use real bindings', () => {
    setupDom();
    const host = document.createElement('div'); document.body.append(host);
    const app = new Application(host, new Page('main'));
    let field = host.querySelector('gnr-filteringselect');
    const input = field.shadowRoot.querySelector('input');
    assert.equal(input.value, 'Italia');
    field.shadowRoot.querySelector('.choice-toggle').click();
    assert.equal(field.shadowRoot.querySelectorAll('[role=option]').length, 2);
    input.value = 'Francia';
    input.dispatchEvent(new Event('input', {bubbles:true, composed:true}));
    assert.equal(app.data.getItem('main.country'), 'IT');
    input.dispatchEvent(new Event('change'));
    assert.equal(app.data.getItem('main.country'), 'FR');
    input.value = 'Not an option'; input.dispatchEvent(new Event('change'));
    assert.equal(app.data.getItem('main.country'), 'FR');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    input.value = ''; input.dispatchEvent(new Event('change'));
    assert.equal(app.data.getItem('main.country'), '');
    const free = host.querySelector('gnr-combobox').shadowRoot.querySelector('input');
    free.value = 'New place'; free.dispatchEvent(new Event('change'));
    assert.equal(app.data.getItem('main.free'), 'New place');
    app.live(() => app.data.setItem('main.country', 'IT'));
    field = host.querySelector('gnr-filteringselect');
    assert.equal(field.shadowRoot.querySelector('input').value, 'Italia');
    field.setAttribute('values', 'IT:Italy\nFR:France');
    assert.equal(field.shadowRoot.querySelector('input').value, 'Italy');
    field.setAttribute('disabled', '');
    const disabled = field.shadowRoot.querySelector('input');
    disabled.value = 'France'; disabled.dispatchEvent(new Event('change'));
    assert.equal(field.value, 'IT');
});


test('dropdown opens all options, filters, selects and closes', () => {
    setupDom();
    const host = document.createElement('div'); document.body.append(host);
    const app = new Application(host, new Page('main'));
    const field = host.querySelector('gnr-filteringselect');
    const input = field.shadowRoot.querySelector('input');
    field.shadowRoot.querySelector('.choice-toggle').click();
    assert.equal(field.shadowRoot.querySelectorAll('[role=option]').length, 2);
    input.value = 'Fran';
    input.dispatchEvent(new Event('input', {bubbles:true, composed:true}));
    assert.equal(field.shadowRoot.querySelectorAll('[role=option]').length, 1);
    input.dispatchEvent(new window.KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    assert.equal(app.data.getItem('main.country'), 'FR');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    field.shadowRoot.querySelector('.choice-toggle').click();
    field.shadowRoot.querySelector('[role=option]').click();
    assert.equal(app.data.getItem('main.country'), 'IT');
    input.dispatchEvent(new window.KeyboardEvent('keydown', {key:'ArrowDown', bubbles:true}));
    input.dispatchEvent(new window.KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    field.shadowRoot.querySelector('.choice-toggle').click();
    host.remove();
    assert.equal(input.getAttribute('aria-expanded'), 'false');
});
