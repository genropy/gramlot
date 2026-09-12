import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDecimal, fromTytx, isDecimal, toTytx} from 'genro-tytx';
import {Application, HtmlBuilder, ServerCallError} from '../src/index.js';
import {setupDom} from './dom.js';

const response = (value, status = 200) => new Response(toTytx(value, 'json'), {
    status, headers: {'Content-Type': 'application/vnd.tytx+json'},
});

function mount(Page, options = {}) {
    setupDom();
    return new Application(document.createElement('div'), new Page('main'), options);
}

test('dataRpc fails at installation without server capability, even without a trigger', () => {
    class Page extends HtmlBuilder {
        main(root) { root.dataRpc({method: 'area', destination: 'result', base: '^base'}); }
    }
    assert.throws(() => mount(Page), /standalone pages cannot install/);
});

test('dataRpc resolves bindings, writes before onResult and ignores its return', async t => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
        const params = fromTytx(options.body, 'json');
        calls.push(params);
        return response({ok: true, result: params.base.times(params.height).div(2)});
    });
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'base', value: createDecimal('3')});
            root.dataSetter({destination: 'height', value: createDecimal('4')});
            root.dataRpc({
                method: 'area', destination: 'remote', base: '^base', height: '=height',
                _on_start: true, _timeout: 1200,
                _fired: '=unusedTrigger',
                _onCalling: 'kwargs.base = base.plus(1);',
                _onResult: 'this.SET("callback", this.GET("remote")); return "ignored";',
            });
        }
    }
    const app = mount(Page, {rpc: '/page/triangle/rpc'});
    const rpc = app.builder.source.getNodes().find(node => node.nodeTag === 'dataRpc');
    await rpc._rpcPromise;
    assert.deepEqual(Object.keys(calls[0]).sort(), ['base', 'height']);
    assert.equal(calls[0].base.toString(), '4');
    assert.equal(calls[0].height.toString(), '4');
    assert.ok(isDecimal(app.data.getItem('main.remote')));
    assert.equal(app.data.getItem('main.remote').toString(), '8');
    assert.equal(app.data.getItem('main.callback').toString(), '8');

    app.data.setItem('main.height', createDecimal('10'));
    await Promise.resolve();
    assert.equal(calls.length, 1, 'passive = does not subscribe');
    app.data.setItem('main.base', createDecimal('5'));
    await rpc._rpcPromise;
    assert.equal(calls[1].height.toString(), '10', 'passive = is read freshly');
    app.dispose();
});

test('occupied SourceNode refuses a second RPC with busy feedback and no replay', async t => {
    const pending = [];
    t.mock.method(globalThis, 'fetch', (_url, options) => new Promise(resolve => {
        pending.push({params: fromTytx(options.body, 'json'), signal: options.signal, resolve});
    }));
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'value', value: 1});
            root.dataRpc({method: 'echo', destination: 'result', value: '^value', _on_start: true});
        }
    }
    const app = mount(Page, {rpc: '/rpc'});
    let busy = 0;
    app.target.root.addEventListener('gramlot:busy', e => { busy++; assert.equal(e.detail.sourceNode, rpc); });
    const rpc = app.builder.source.getNodes().find(node => node.nodeTag === 'dataRpc');
    assert.equal(rpc.rpcPending, true);
    app.data.setItem('main.value', 2);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].signal.aborted, false);
    assert.equal(busy, 1);
    pending[0].resolve(response({ok: true, result: 1}));
    await rpc._rpcPromise;
    assert.equal(rpc.rpcPending, false);
    assert.equal(app.data.getItem('main.result'), 1);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(pending.length, 1, 'refused activation is not replayed');
    app.data.setItem('main.value', 3);
    assert.equal(pending.length, 2);
    app.live(() => app.builder.source.popNode(rpc.label));
    assert.equal(pending[1].signal.aborted, true);
    pending[1].resolve(response({ok: true, result: 3}));
    await rpc._rpcPromise;
    assert.equal(app.data.getItem('main.result'), 1);
    app.dispose();
});

test('failure retains prior Data; direct serverCall separates HTTP and application errors', async t => {
    const failures = [];
    t.mock.method(globalThis, 'fetch', async url => {
        if (String(url).endsWith('/http')) return response({error: {message: 'gateway'}}, 503);
        if (String(url).endsWith('/application')) {
            return response({ok: false, error: {message: 'rejected'}});
        }
        return response({ok: false, error: {message: 'bad input'}});
    });
    class Page extends HtmlBuilder {
        main(root) {
            root.dataSetter({destination: 'result', value: 'last success'});
            root.dataRpc({method: 'fail', destination: 'result', value: '^value',
                _onError: 'this.SET("failure", error.kind);'});
        }
    }
    const app = mount(Page, {rpc: '/rpc'});
    const rpc = app.builder.source.getNodes().find(node => node.nodeTag === 'dataRpc');
    app.data.setItem('main.value', 'go');
    failures.push(await rpc._rpcPromise);
    assert.equal(failures[0].status, 'error');
    assert.equal(app.data.getItem('main.result'), 'last success');
    assert.equal(app.data.getItem('main.failure'), 'application');
    await assert.rejects(app.serverCall('http'), error =>
        error instanceof ServerCallError && error.kind === 'http' && error.status === 503);
    await assert.rejects(app.serverCall('application'), error =>
        error instanceof ServerCallError && error.kind === 'application');
    let callbackThis, callbackResult;
    globalThis.fetch = async () => response({ok: true, result: 'callback value'});
    await app.serverCall('callback', {}, function (result, error) {
        callbackThis = this;
        callbackResult = [result, error];
    });
    assert.equal(callbackThis, app);
    assert.deepEqual(callbackResult, ['callback value', null]);
    assert.throws(() => app.serverCall('bad', {}, {}), /callback must be a function/);
    assert.throws(() => app.serverCall('bad', {}, null, 'bag'), /result modes are not supported/);
    app.dispose();
});

test('onCalling false cancels before transport and direct calls honor pre-aborted signals', async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async (_url, {signal}) => {
        calls += 1;
        if (signal.aborted) throw signal.reason || new DOMException('aborted', 'AbortError');
        return response({ok: true, result: null});
    });
    class Page extends HtmlBuilder {
        main(root) {
            root.dataRpc({method: 'never', value: '^value', _onCalling: 'return false;'});
        }
    }
    const app = mount(Page, {rpc: '/rpc'});
    app.data.setItem('main.value', 1);
    await Promise.resolve();
    assert.equal(calls, 0);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(app.serverCall('never', {}, null, null, null,
        {signal: controller.signal}),
        error => error.kind === 'cancelled');
    app.dispose();
});
