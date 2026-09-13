import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {toTytx} from 'genro-tytx';
import {RpcResolver} from '../src/resolvers/rpc.js';
import {ServerCallService} from '../src/services/server-call.js';

test('RPC response binds inert resolvers and child calls use the same service', async () => {
    const root = new Bag();
    root.setItem('relation', new RpcResolver({method:'expand', params:{path:['relation']}}), {caption:'Relation'});
    const child = new Bag(); child.setItem('id', null, {dtype:'L'});
    const original = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, init) => {
        requests.push({url, body:init.body});
        return new Response(toTytx({ok:true, result:requests.length === 1 ? root : child}, 'json'));
    };
    try {
        const service = new ServerCallService({}, '/page/demo/rpc');
        const owner = {};
        const result = await service.call('root', {}, {owner});
        const node = result.getNode('relation');
        assert.ok(node.resolver instanceof RpcResolver);
        assert.equal(requests.length, 1, 'decoding must not expand nodes');
        const [a, b] = await Promise.all([node.getValue(), node.getValue()]);
        assert.ok(a instanceof Bag); assert.equal(a,b);
        assert.equal(requests.length, 2);
        assert.equal(requests[1].url, '/page/demo/rpc/data/expand');
        assert.equal(node.resolver.owner, owner);
        assert.equal(node.getValue().getNode('id').getAttr('dtype'), 'L');
        assert.equal(requests.length, 2);
        service.dispose();
    } finally { globalThis.fetch = original; }
});
