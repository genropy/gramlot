// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RpcService} from '../src/rpc.js';
import {toTytx} from 'genro-tytx';

class Socket extends EventTarget {
    static OPEN = 1;
    constructor() {
        super(); this.readyState = 0; this.calls = [];
        queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); });
    }
    send(text) {
        const call = JSON.parse(text.slice(6));
        this.calls.push(call);
        if (call.path === '/_wsx/openchannel') queueMicrotask(() => this.answer(call, {}));
    }
    answer(call, value, status = 200) {
        this.dispatchEvent(new MessageEvent('message', {data: 'WSX://' + JSON.stringify({
            id: call.id, status, data: toTytx(value, 'json')})}));
    }
    close() { this.readyState = 3; }
}

test('out-of-order replies retain call identity; timeouts ignore late results', async () => {
    globalThis.window = {location: {href: 'http://localhost/'}};
    globalThis.WebSocket = Socket;
    const rpc = new RpcService({pageId: 'registered'});
    await rpc.openChannel();
    const first = rpc.remoteCall('/first');
    const second = rpc.remoteCall('/second');
    await new Promise(resolve => setImmediate(resolve));
    const [, a, b] = rpc.socket.calls;
    rpc.socket.answer(b, {answer: 2});
    rpc.socket.answer(a, {answer: 1});
    assert.deepEqual(await first, {answer: 1});
    assert.deepEqual(await second, {answer: 2});
    const timed = rpc.remoteCall('/slow', {}, {timeout: 10});
    await assert.rejects(timed, /timed out/);
    rpc.socket.answer(rpc.socket.calls.at(-1), 'too late');
    assert.equal(rpc.pending.size, 0);
    const refused = rpc.remoteCall('/forbidden');
    await new Promise(resolve => setImmediate(resolve));
    rpc.socket.answer(rpc.socket.calls.at(-1), {reason: 'denied'}, 403);
    await assert.rejects(refused, error => error.status === 403 && error.data.reason === 'denied');
    rpc.dispose();
});

test('socket closure rejects every outstanding call without replay', async () => {
    globalThis.window = {location: {href: 'http://localhost/'}};
    globalThis.WebSocket = Socket;
    const rpc = new RpcService({pageId: 'registered'});
    await rpc.openChannel();
    const first = rpc.remoteCall('/save');
    const second = rpc.remoteCall('/other');
    const checks = Promise.all([assert.rejects(first, /closed/), assert.rejects(second, /closed/)]);
    await new Promise(resolve => setImmediate(resolve));
    rpc.socket.dispatchEvent(new Event('close'));
    await checks;
    assert.equal(rpc.pending.size, 0);
    assert.equal(rpc.socket.calls.length, 3);
    await assert.rejects(rpc.remoteCall('/save'), /disposed/);
});

test('disposal rejects channel opening and aborts HTTP work', async () => {
    globalThis.window = {location: {href: 'http://localhost/'}};
    class Connecting extends Socket { constructor() { super(); } }
    globalThis.WebSocket = Connecting;
    const rpc = new RpcService({pageId: 'registered'});
    const opening = rpc.openChannel();
    rpc.dispose();
    await assert.rejects(opening, /disposed/);
    const http = new RpcService({pageId: 'registered'});
    globalThis.fetch = (_path, {signal}) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {once: true});
    });
    const request = http.remoteCall('/save', {}, {httpMethod: 'POST'});
    http.dispose();
    await assert.rejects(request, /disposed/);
    assert.equal(http.controllers.size, 0);
});
