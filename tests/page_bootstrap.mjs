// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import 'genro-bag-js';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
setupDom();
const payload = JSON.parse(readFileSync(0, 'utf8'));
document.open(); document.write(payload.html); document.close();
const {fromTytx} = await import('genro-tytx');
const config = fromTytx(document.getElementById('page-startup').textContent, 'json');
assert.equal(document.querySelectorAll('#page-startup').length, 1);
assert.equal(document.querySelectorAll('script').length, 3);
assert.equal(document.querySelector('[data-injected]'), null);
assert.equal(document.querySelectorAll('html').length, 1);
assert.equal(document.querySelectorAll('head').length, 1);
assert.equal(document.querySelectorAll('body').length, 1);
assert.equal(document.doctype.name, 'html');
assert.equal(document.getElementById('root').childNodes.length, 0);
const before = {
    page: config.getItem('page'), transport: config.getItem('transport'),
    builder: config.getItem('client_builder.export'),
    setup: config.getItem('client_setup')?.getItem('export') ?? null,
    links: [...document.querySelectorAll('#page-menu a')].map(a => ({href: a.getAttribute('href'), text: a.textContent})),
    probe: config.getItem('probe')?.getItem('text') ?? null,
};
if (payload.probe) {
    assert.equal(before.probe, payload.probe);
    assert.equal(config.getItem('probe.count'), 42);
    assert.equal(config.getItem('probe.enabled'), false);
    assert.equal(config.getItem('probe.empty'), null);
    assert.equal(config.getItem('probe.date').toISOString().slice(0, 10), '2026-09-06');
    JSON.parse(document.querySelector('script[type="importmap"]').textContent);
}
if (payload.main) {
    const errors = [];
    console.error = error => errors.push(String(error));
    const calls = [];
    globalThis.fetch = async url => {
        calls.push(url);
        const isMain = url.startsWith('/main?');
        if (isMain) {
            const query = new URL(url, 'http://localhost').searchParams;
            assert.equal(fromTytx(query.get('page')), payload.route);
            assert.equal(fromTytx(query.get('transport')), payload.transport);
        }
        return {ok: true, text: async () => isMain ? payload.main : payload.inspector,
            arrayBuffer: async () => Uint8Array.from(Buffer.from(payload.main, 'base64')).buffer};
    };
    await import('../js/pages/src/bootstrap.js');
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(window.page.constructor.name, before.builder);
    assert.ok(document.querySelector('#root h1'));
    assert.ok(window.genro.dev.inspector);
    assert.equal(!!window.genro.dev.playground, before.setup === 'mountPlayground');
    assert.equal(calls.filter(url => url.startsWith('/main?')).length, 1);
    assert.equal(document.getElementById('error').hidden, true);
    window.genro.dispose();
}
process.stdout.write(JSON.stringify(before));
