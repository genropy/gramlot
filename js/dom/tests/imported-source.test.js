// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: a transported recipe uses the same DOM and mutation machinery.
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder, SourceBag, SourceBagNode, wrapSource} from '../src/index.js';
import {Bag} from 'genro-bag-js';
import {toTytx, fromTytx} from 'genro-tytx';

const recipe = readFileSync(new URL('./fixtures/python-source.tytx', import.meta.url), 'utf8');

for (const transport of ['json', 'msgpack']) {
    test(`typed source preserves embedded data at mount (${transport})`, () => {
        setupDom();
        const source = new SourceBag();
        const data = new Bag();
        data.setItem('phone', '0123', {_loadedValue: '0123'});
        source.setItem('seed', data, {destination: 'record', value: data});
        source.getNode('seed').nodeTag = 'dataSetter';
        source.setItem('heading', 'Typed source');
        source.getNode('heading').nodeTag = 'h1';
        const decoded = fromTytx(toTytx({source}, transport), transport).source;
        assert.equal(decoded.constructor, SourceBag);
        assert.equal(decoded._builder, null);
        assert.equal(decoded.getItem('seed').constructor, Bag);
        const builder = new HtmlBuilder('main');
        builder.loadSource(decoded);
        const root = document.createElement('div');
        new Application(root, builder);
        assert.equal(root.querySelector('h1').textContent, 'Typed source');
        assert.equal(builder.source.getItem('seed').constructor, Bag);
        assert.equal(builder.source.getItem('seed').getItem('phone'), '0123');
        assert.equal(builder.source.getNode('seed').builder, builder);
    });
}

test('imported recipe retains ownership, bindings and structural reactivity', () => {
    setupDom();
    const root = document.createElement('div');
    const builder = new HtmlBuilder('main');
    builder.loadSource(recipe);
    const app = new Application(root, builder);
    assert.equal(root.querySelector('h1').textContent, 'Hello world');
    assert.equal(root.querySelector('div').hasAttribute('hidden'), false);
    const branch = builder.source.getItem('div_0');
    assert.ok(branch instanceof SourceBag);
    const heading = branch.getNode('h1_0');
    assert.ok(heading instanceof SourceBagNode);
    assert.equal(heading.builder, builder);
    assert.equal(heading.handler, app.handler);
    assert.equal(heading.parentBag, branch);
    app.live(() => app.data.setItem('main.form.name', 'Ada'));
    assert.equal(root.querySelector('span').textContent, 'Ada');
    const input = root.querySelector('input');
    input.value = 'Grace';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    assert.equal(root.querySelector('span').textContent, 'Grace');
    app.live(() => wrapSource(branch).p('Inserted'));
    assert.equal(root.querySelector('p').textContent, 'Inserted');
    app.live(() => branch.pop('span_0'));
    app.live(() => app.data.setItem('main.form.name', 'Later'));
    assert.equal(root.querySelector('span'), null);
    assert.throws(() => builder.loadSource(recipe), /before mounting/);
});

test('unknown imported grammar is refused instead of rendering a fallback', () => {
    setupDom();
    const builder = new HtmlBuilder('main');
    builder.loadSource(JSON.stringify({rows: [['', 'n', 'unknownWidget', '::NN', {}]]}));
    assert.throws(() => new Application(document.createElement('div'), builder),
        /unsupported imported source tag/);
});
