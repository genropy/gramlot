// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Python/TYTX and JavaScript teaching recipes must build the same live Source. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {Application, SourceBag} from 'gramlot-dom';
import {Bag} from 'genro-bag-js';
import {fromTytx} from 'genro-tytx';

setupDom();
const {GramlotBuilder} = await import('../js/pages/src/builder.js');
const specs = JSON.parse(readFileSync(0, 'utf8'));

function clean(value) {
    if (value instanceof SourceBag || value instanceof Bag) {
        return value.getNodes().map(node => ({
            label: node.label,
            tag: node.nodeTag || null,
            value: clean(node.getValue(true)),
            attrs: clean(node.getAttr()),
        }));
    }
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).filter(([key]) => key !== '_meta')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => [key, clean(item)]));
    }
    return value;
}

const settle = (delay = 0) => new Promise(resolve => setTimeout(resolve, delay));

async function mountPair(spec) {
    const pythonBuilder = new GramlotBuilder('example');
    pythonBuilder.loadSource(fromTytx(spec.python, 'json'));
    const pythonHost = document.body.appendChild(document.createElement('div'));
    const pythonApp = new Application(pythonHost, pythonBuilder, {inspector: false});

    const {build} = await import(`${pathToFileURL(spec.javascript).href}?test=${spec.slug}`);
    class JavaScriptExample extends GramlotBuilder {
        main(root) { build(root); }
    }
    const javascriptBuilder = new JavaScriptExample('example');
    const javascriptHost = document.body.appendChild(document.createElement('div'));
    const javascriptApp = new Application(javascriptHost, javascriptBuilder, {inspector: false});

    assert.deepEqual(clean(javascriptBuilder.source), clean(pythonBuilder.source), spec.slug);
    assert.ok(pythonHost.children.length, `${spec.slug}: Python did not render`);
    assert.ok(javascriptHost.children.length, `${spec.slug}: JavaScript did not render`);
    return [
        {app: pythonApp, builder: pythonBuilder, host: pythonHost},
        {app: javascriptApp, builder: javascriptBuilder, host: javascriptHost},
    ];
}

for (const spec of specs) {
    const mounted = await mountPair(spec);
    if (spec.slug === '03-explicit-labled-box') {
        for (const {host} of mounted) {
            const box = host.querySelector('gnr-labledbox');
            assert.equal(box.shadowRoot.querySelector('.labledBox_label').textContent, 'Name');
            assert.equal(box.shadowRoot.querySelector('.labledBox').style.flexDirection, 'column');
            assert.ok(box.querySelector('gnr-textbox'));
        }
    }
    if (spec.slug === '05-formlet') {
        for (const {host} of mounted) {
            const fields = host.querySelector('gnr-formlet');
            assert.equal(fields.children.length, 5);
            const first = fields.firstElementChild.shadowRoot;
            assert.equal(first.querySelector('.labledBox').style.padding, '4px');
            assert.equal(first.querySelector('.labledBox').style.flexDirection, 'row');
            assert.equal(first.querySelector('.labledBox_label').style.color, 'rgb(52, 69, 99)');
            const override = fields.lastElementChild.shadowRoot;
            assert.equal(override.querySelector('.labledBox').style.flexDirection, 'row-reverse');
            assert.equal(override.querySelector('.labledBox_label').style.color, 'rgb(138, 63, 104)');
        }
    }
    if (spec.slug === '06-validation') {
        for (const {app, host} of mounted) {
            const widget = host.querySelector('gnr-textbox');
            app.mutate(widget.id, 'A');
            assert.equal(widget.shadowRoot.querySelector('input').getAttribute('aria-invalid'), 'true');
            assert.match(widget.shadowRoot.querySelector('[data-validation-message]').textContent,
                /too short/);
            assert.equal(app.data.getItem('example.validation.code'), 'ABC');
        }
    }
    if (spec.slug === '07-memory-form') {
        for (const {app, builder, host} of mounted) {
            assert.equal(builder.schema.form._meta.render_tag, 'gnr-form');
            assert.ok(host.querySelector('gnr-form'));
            const field = builder.nodeById('name');
            const widget = host.querySelector('gnr-form gnr-textbox');
            const form = field.getFormHandler();
            await settle(380);
            assert.equal(form.state.pending, 0);
            assert.equal(form.state.dirty, false);
            app.mutate(widget.id, 'Bob');
            assert.equal(form.state.pending, 1);
            await settle(380);
            assert.equal(form.state.valid, true);
            assert.equal(form.state.dirty, true);
            host.querySelectorAll('button')[0].click();
            await settle();
            assert.equal(form.state.dirty, false);
            app.mutate(widget.id, 'Carol');
            await settle(380);
            assert.equal(form.state.dirty, true);
            host.querySelectorAll('button')[1].click();
            await settle();
            assert.equal(app.data.getItem('example.contact.name'), 'Bob');
            assert.equal(form.state.dirty, false);
            await settle(380);
            assert.deepEqual([...host.querySelectorAll('strong')].map(node => node.textContent),
                ['false', 'true', '0']);
        }
    }
    if (spec.slug === '08-textbox-area') {
        for (const {app, host} of mounted) {
            const widget = host.querySelector('gnr-textboxarea');
            const textarea = widget.shadowRoot.querySelector('textarea');
            assert.ok(textarea);
            assert.equal(textarea.value, 'First line\nSecond line');
            assert.equal(textarea.getAttribute('rows'), '5');
            assert.equal(widget.shadowRoot.querySelector('.labledBox').style.padding, '4px');
            textarea.value = 'Changed\non blur';
            textarea.dispatchEvent(new window.Event('input', {bubbles: true}));
            assert.equal(app.data.getItem('example.draft.notes'), 'First line\nSecond line');
            textarea.dispatchEvent(new window.Event('change', {bubbles: true}));
            assert.equal(app.data.getItem('example.draft.notes'), 'Changed\non blur');
        }
    }
    if (spec.slug === '09-shared-validation') {
        for (const {app, host} of mounted) {
            const widgets = host.querySelectorAll('gnr-textbox');
            assert.equal(widgets.length, 2);
            const primary = widgets[0];
            assert.equal(primary.shadowRoot.querySelector('[data-validation-message]').textContent,
                'Check address');
            app.mutate(primary.id, 'primary@example.test');
            assert.equal(app.data.getItem('example.contacts.primary'), 'primary@example.test');
        }
    }
    if (spec.slug.startsWith('10-local-logic')) {
        for (const {app, host} of mounted) {
            const widgets = [...host.querySelectorAll('gnr-numbertextbox, gnr-textbox')];
            const enter = async (index, value) => {
                app.mutate(widgets[index].id, spec.slug.endsWith('/controller') ? value : Number(value));
                await settle();
            };
            const output = () => host.querySelector('p').textContent;
            if (spec.slug.endsWith('/controller')) {
                await enter(0, 'Ada');
                assert.equal(app.data.getItem('example.message'), 'Hello Ada');
                assert.equal(output(), 'Hello Ada');
                await enter(0, 'Bob');
                assert.equal(output(), 'Hello Bob');
            } else {
                await enter(1, '5');
                await enter(0, '2');
                assert.equal(output(), '10');
                await enter(1, '7');
                assert.equal(output(), spec.slug.endsWith('/passive') ? '10' : '14');
                await enter(0, '3');
                assert.equal(output(), '21');
                if (!spec.slug.endsWith('/inline')) {
                    assert.equal(app.data.getItem('example.total'), 21);
                }
            }
        }
    }
    for (const {app, host} of mounted) {
        app.dispose();
        host.remove();
    }
}

console.log(`Teaching examples: ${specs.length} Python/JavaScript pairs passed.`);
