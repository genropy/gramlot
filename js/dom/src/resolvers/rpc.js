// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Bag, BagResolver, registerResolver} from 'genro-bag-js';

/** Inert until bound to the receiving application's existing RPC service. */
export class RpcResolver extends BagResolver {
    static classKwargs = {cacheTime:300, readOnly:false, asBag:false, method:null, params:null};

    bind(service, owner) { this.service = service; this.owner = owner; }

    load({method, params}) {
        if (!this.service) throw new Error('RPC resolver has no page service');
        if (!this.pending) {
            this.pending = this.service.call(method, params || {}, {owner:this.owner})
                .finally(() => { this.pending = null; });
        }
        return this.pending;
    }
}

registerResolver(RpcResolver, {
    module:'gramlot.resolvers', name:'RpcResolver',
    encode:resolver => ({kwargs:{method:resolver._kw.method, params:resolver._kw.params,
        cache_time:resolver.cacheTime}}),
    decode:({kwargs}) => new RpcResolver({method:kwargs.method, params:kwargs.params,
        cacheTime:kwargs.cache_time ?? 300}),
});

/** Bind descriptors without accessing lazy values or starting network requests. */
export function bindRpcResolvers(value, service, owner, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    if (value instanceof Bag) {
        for (const node of value.getNodes()) {
            if (node.resolver instanceof RpcResolver) node.resolver.bind(service, owner);
            bindRpcResolvers(node.getValue(true), service, owner, seen);
        }
    } else {
        for (const child of Object.values(value)) bindRpcResolvers(child, service, owner, seen);
    }
    return value;
}
