// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {fromTytx, toTytx} from 'genro-tytx';
import {PageApplication} from '../js/pages/src/application.js';
setupDom().reconfigure({url: 'http://localhost/'});
const payload = JSON.parse(readFileSync(0, 'utf8'));
document.open(); document.write(payload.html); document.close();
const startup = fromTytx(document.getElementById('page-startup').textContent, 'json');
const calls = [], sockets = [];
let deferred;
class Socket extends window.EventTarget {
    static OPEN = 1;
    constructor() {
        super(); this.readyState = 0; sockets.push(this);
        queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); });
    }
    send(text) {
        assert.ok(window.genro);
        const call = JSON.parse(text.slice(6));
        const params = fromTytx(call.data, 'json');
        calls.push(call);
        const answer = () => this.dispatchEvent(new window.MessageEvent('message', {data: 'WSX://' + JSON.stringify({
            id: call.id, status: 200, data: call.path === '/main' ? payload.main
                : call.path === '/inspector' ? payload.inspector : toTytx({}, 'json')})}));
        if (call.path === '/main') {
            assert.equal(window.genro.builder, null);
            assert.equal(calls[0].path, '/_wsx/openchannel');
            assert.equal(params.page, startup.getItem('page'));
            if (payload.scenario === 'dispose') {
                deferred = answer;
                queueMicrotask(() => window.genro.dispose());
                return;
            }
        }
        if (call.path === '/inspector') {
            // The source has already been mounted when tools are requested.
            assert.ok(window.genro.builder);
        }
        queueMicrotask(answer);
    }
    close() { this.readyState = 3; }
}
globalThis.WebSocket = Socket;
const errors = [];
console.error = error => errors.push(error);
await import('../js/pages/src/bootstrap.js');
if (payload.scenario === 'mount-error') {
    assert.equal(window.genro._disposed, true);
    assert.equal(document.getElementById('error').hidden, false);
    assert.match(document.getElementById('error').textContent, /unsupported imported source tag/);
    assert.equal(document.getElementById('root').childNodes.length, 0);
} else if (payload.scenario === 'dispose') {
    deferred();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(window.genro._disposed, true);
    assert.equal(window.genro.rpc.pending.size, 0);
    assert.equal(sockets[0].readyState, 3);
    assert.equal(window.genro.builder, null);
    assert.equal(document.getElementById('root').childNodes.length, 0);
    assert.equal(document.getElementById('developer-tools').childNodes.length, 0);
} else {
    assert.equal(errors.length, 0, errors.map(String).join('\n'));
    assert.ok(document.querySelector('#root h1'));
    assert.ok(window.genro.dev.inspector);
    assert.deepEqual(calls.map(call => call.path), ['/_wsx/openchannel', '/main', '/inspector']);
    window.genro.dispose();
}
assert.equal(sockets.length, 1);
// App configuration and a per-call override choose HTTP without silently
// changing the meaning of `method` or sending it through the socket.
startup.setItem('rpc.httpMethod', 'POST');
const app = new PageApplication(document.createElement('div'), startup);
const http = [];
globalThis.fetch = async (url, options) => {
    http.push({url, options});
    return {ok: true, text: async () => toTytx({ok: true}, 'json')};
};
assert.deepEqual(await app.rpc.remoteCall('probe', {count: 42}), {ok: true});
assert.equal(http[0].options.method, 'POST');
assert.equal(fromTytx(http[0].options.body, 'json').count, 42);
assert.equal(fromTytx(http[0].options.body, 'json').page_id, app.pageId);
await app.rpc.remoteCall('probe', {count: 3}, {httpMethod: 'GET'});
assert.equal(http[1].options.method, 'GET');
assert.match(http[1].url, /count=3/);
assert.equal(sockets.length, 1);
app.dispose();
