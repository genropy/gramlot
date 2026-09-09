// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';

class Page extends HtmlBuilder {
    main(root) {
        root.dataSetter({destination: 'title', value: 'Ready'});
        root.h1('^title');
    }
}

test('runtime exists before mounting and retains its rooted data and services', () => {
    setupDom();
    const host = document.createElement('div');
    const app = new Application(host);
    const data = app.data;
    const events = app.events;
    assert.equal(app.root, null);
    assert.equal(host.childNodes.length, 0);
    app.mountBuilder(new Page('main'));
    assert.equal(app.data, data);
    assert.equal(app.events, events);
    assert.equal(host.querySelector('h1').textContent, 'Ready');
    app.live(() => app.data.setItem('main.title', 'Changed'));
    assert.equal(host.querySelector('h1').textContent, 'Changed');
    assert.throws(() => app.mountBuilder(new Page('other')), /already mounted/);
    app.dispose();
});

test('a disposed runtime rejects a late mount without touching its host', () => {
    setupDom();
    const host = document.createElement('div');
    host.textContent = 'Caller-owned';
    const app = new Application(host);
    app.dispose();
    assert.throws(() => app.mountBuilder(new Page('main')), /disposed/);
    assert.equal(host.textContent, 'Caller-owned');
});

test('failed mounting disposes the partially constructed runtime', () => {
    setupDom();
    class Broken extends HtmlBuilder { main() { throw new Error('bad recipe'); } }
    const app = new Application(document.createElement('div'));
    assert.throws(() => app.mountBuilder(new Broken('main')), /bad recipe/);
    assert.equal(app._disposed, true);
    assert.equal(app.handler._disposed, true);
});
