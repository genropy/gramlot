import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromTytx, toTytx} from 'genro-tytx';
import {Application, HtmlBuilder} from '../src/index.js';
import {setupDom} from './dom.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const response = value => new Response(toTytx({ok: true, result: value}, 'json'));
function mount(Page) {
    setupDom();
    const root = document.createElement('div'); document.body.append(root);
    return new Application(root, new Page('main'), {rpc: '/rpc'});
}

test('_delay coalesces multiple reactive inputs for formula, controller and RPC', async t => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
        calls.push(fromTytx(options.body, 'json')); return response(12);
    });
    class Page extends HtmlBuilder {
        main(root) {
            root.dataFormula({destination: 'total', formula: 'a + b', a: '^a', b: '^b', _delay: 10});
            root.dataController({func: 'this.SET("seen", a + b); this.SET("runs", (this.GET("runs") || 0) + 1);',
                a: '^a', b: '^b', _delay: 10});
            root.dataRpc({method: 'sum', destination: 'remote', a: '^a', b: '^b', _delay: 10});
        }
    }
    const app = mount(Page);
    app.data.setItem('main.a', 5); app.data.setItem('main.b', 7);
    assert.equal(calls.length, 0);
    await sleep(35);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {a: 5, b: 7});
    assert.equal(app.data.getItem('main.total'), 12);
    assert.equal(app.data.getItem('main.seen'), 12);
    assert.equal(app.data.getItem('main.runs'), 1);
    assert.equal(app.data.getItem('main.remote'), 12);
    app.dispose();
});

test('busy trigger is rejected even if _delay would expire after the running call', async t => {
    let complete; let calls = 0;
    t.mock.method(globalThis, 'fetch', () => { calls++; return new Promise(resolve => { complete = resolve; }); });
    class Page extends HtmlBuilder {
        main(root) { root.dataRpc({method: 'echo', value: '^value', _delay: 10}); }
    }
    const app = mount(Page);
    const rpc = app.builder.source.getNodes()[0];
    app.data.setItem('main.value', 1); await sleep(20);
    let busy = 0; app.target.root.addEventListener('gramlot:busy', () => busy++);
    app.data.setItem('main.value', 2);
    complete(response(1)); await rpc._rpcPromise; await sleep(25);
    assert.equal(busy, 1); assert.equal(calls, 1);
    app.dispose();
});

test('independent nodes can call together; locks survive until their last owner finishes', async t => {
    const requests = [];
    t.mock.method(globalThis, 'fetch', () => new Promise(resolve => requests.push(resolve)));
    class Page extends HtmlBuilder {
        main(root) {
            root.dataRpc({method: 'one', value: '^one', _lockScreen: true});
            root.dataRpc({method: 'two', value: '^two', _lockScreen: true});
        }
    }
    const app = mount(Page);
    app.data.setItem('main.one', 1); app.data.setItem('main.two', 2);
    const nodes = app.builder.source.getNodes();
    assert.equal(requests.length, 2); assert.equal(app.target.root.inert, true);
    assert.equal(document.querySelectorAll('[data-gramlot-screen-lock]').length, 1);
    requests[0](response(1)); await nodes[0]._rpcPromise;
    assert.equal(app.target.root.inert, true);
    requests[1](response(2)); await nodes[1]._rpcPromise;
    assert.equal(Boolean(app.target.root.inert), false);
    assert.equal(document.querySelector('[data-gramlot-screen-lock]'), null);
    app.dispose();
});

test('hook cancellation and failure release pending state and screen lock', async t => {
    t.mock.method(globalThis, 'fetch', async () => { throw Error('offline'); });
    class Page extends HtmlBuilder {
        main(root) {
            root.dataRpc({method: 'skip', value: '^skip', _onCalling: 'return false;', _lockScreen: true});
            root.dataRpc({method: 'fail', value: '^fail', _lockScreen: true,
                _onError: 'throw Error("hook failure");'});
        }
    }
    const app = mount(Page); const [skip, fail] = app.builder.source.getNodes();
    app.data.setItem('main.skip', 1); await skip._rpcPromise;
    assert.equal(skip.rpcPending, false);
    app.data.setItem('main.fail', 1);
    await assert.rejects(fail._rpcPromise, /hook failure/);
    assert.equal(fail.rpcPending, false);
    assert.equal(app.feedback.locks.size, 0);
    app.dispose();
});

test('four delayed button clicks invoke one action with _counter and the latest event', async () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.button('Count', {_delay: 10, action: 'this.SET("count", _counter); this.SET("shift", event.shiftKey);'});
        }
    }
    const app = mount(Page); const button = app.target.root.querySelector('button');
    for (let i = 0; i < 4; i++) button.dispatchEvent(new window.MouseEvent('click', {
        bubbles: true, shiftKey: i === 3,
    }));
    assert.equal(app.data.getItem('main.count'), null);
    await sleep(25);
    assert.equal(app.data.getItem('main.count'), 4);
    assert.equal(app.data.getItem('main.shift'), true);
    app.dispose();
});

test('button fire carries count; ordinary clicks use a 200ms guard', async () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.button('Fire', {_delay: 10, fire: 'command'});
            root.button('Immediate', {action: 'this.SET("runs", (this.GET("runs") || 0) + 1);'});
        }
    }
    const app = mount(Page); const [fire, immediate] = app.target.root.querySelectorAll('button');
    fire.click(); fire.click(); immediate.click(); immediate.click();
    await sleep(25);
    assert.equal(app.data.getNode('main.command').getAttr('_counter'), 2);
    assert.equal(app.data.getItem('main.runs'), 1);
    await sleep(200); immediate.click();
    assert.equal(app.data.getItem('main.runs'), 2);
    app.dispose();
});

test('removal and disposal cancel owned provider and button timers', async t => {
    let calls = 0; t.mock.method(globalThis, 'fetch', async () => { calls++; return response(1); });
    class Page extends HtmlBuilder {
        main(root) {
            root.dataRpc({method: 'never', value: '^value', _delay: 10});
            root.button('Never', {_delay: 10, action: 'this.SET("clicked", true);'});
        }
    }
    const app = mount(Page);
    app.data.setItem('main.value', 1); app.target.root.querySelector('button').click();
    app.live(() => app.builder.source.popNode(app.builder.source.getNodes()[0].label));
    app.dispose(); await sleep(25);
    assert.equal(calls, 0); assert.equal(app.data.getItem('main.clicked'), null);
});

test('_concurrency is rejected rather than silently ignored', () => {
    class Page extends HtmlBuilder {
        main(root) { root.dataRpc({method: 'echo', _concurrency: 'latest'}); }
    }
    assert.throws(() => mount(Page), /_concurrency is not supported/);
});
