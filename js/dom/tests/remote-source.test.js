// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toTytx} from 'genro-tytx';
import {Application, HtmlBuilder, SourceBag} from '../src/index.js';
import '../src/collections/layout.js';
import {setupDom} from './dom.js';

const response = (value, status = 200) => new Response(toTytx(value, 'json'), {
    status, headers: {'Content-Type': 'application/vnd.tytx+json'},
});

function fragment(message) {
    const source = new SourceBag();
    source.setItem('seed', null, {
        destination: '.message', value: message, _meta: {data_element: 'setter'},
    });
    source.getNode('seed').nodeTag = 'dataSetter';
    source.setItem('text', '^.message', {id: 'remote-text'});
    source.getNode('text').nodeTag = 'p';
    return source;
}

class RemotePage extends HtmlBuilder {
    static wc_requires = ['layout'];
    main(root) {
        root.dataSetter({destination: 'choice', value: 'one'});
        const pane = root.contentPane({node_id: 'remote', datapath: 'scope'});
        pane.remoteSource({method: 'fragment', choice: '^choice', _on_start: true,
            _onError: 'this.SET(".failure", error.message);'});
    }
}

function mount(fetchImpl) {
    setupDom();
    globalThis.fetch = fetchImpl;
    const host = document.createElement('div');
    const app = new Application(host, new RemotePage('main'), {rpc: '/page/example/rpc'});
    const provider = app.builder.source.getNodes()[1].value.getNode('remoteSource_0');
    return {app, host, provider};
}

test('remote Source replaces its owned branch and keeps container-relative Data scope', async () => {
    const calls = [];
    const {app, host, provider} = mount(async (url, options) => {
        calls.push({url: String(url), signal: options.signal});
        return response({ok: true, result: fragment(calls.length === 1 ? 'first' : 'second')});
    });
    await provider._rpcPromise;
    assert.match(calls[0].url, /\/source\/fragment$/);
    assert.equal(host.querySelector('#remote-text').textContent, 'first');
    assert.equal(app.data.getItem('main.scope.message'), 'first');

    app.data.setItem('main.choice', 'two');
    await provider._rpcPromise;
    assert.equal(host.querySelectorAll('#remote-text').length, 1);
    assert.equal(host.querySelector('#remote-text').textContent, 'second');
    assert.equal(app.data.getItem('main.scope.message'), 'second');
    app.dispose();
});

test('failed replacement preserves working content and late completion is obsolete', async () => {
    const pending = [];
    const {app, host, provider} = mount((_url, options) => new Promise(resolve => {
        pending.push({resolve, signal: options.signal});
    }));
    pending[0].resolve(response({ok: true, result: fragment('working')}));
    await provider._rpcPromise;

    app.data.setItem('main.choice', 'bad');
    pending[1].resolve(response({ok: false, error: {message: 'replacement failed'}}));
    assert.equal((await provider._rpcPromise).status, 'error');
    assert.equal(host.querySelector('#remote-text').textContent, 'working');
    assert.equal(app.data.getItem('main.scope.failure'), 'replacement failed');

    app.data.setItem('main.choice', 'old');
    app.data.setItem('main.choice', 'new');
    assert.equal(pending[2].signal.aborted, true);
    pending[3].resolve(response({ok: true, result: fragment('new')}));
    await provider._rpcPromise;
    pending[2].resolve(response({ok: true, result: fragment('old')}));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(host.querySelector('#remote-text').textContent, 'new');

    app.data.setItem('main.choice', 'dispose');
    assert.equal(pending[4].signal.aborted, false);
    app.dispose();
    assert.equal(pending[4].signal.aborted, true);
    pending[4].resolve(response({ok: true, result: fragment('too late')}));
});

test('remote Source fails explicitly without service capability', () => {
    setupDom();
    assert.throws(
        () => new Application(document.createElement('div'), new RemotePage('main')),
        /standalone pages cannot install Python services/,
    );
});
