// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Source-owned resident collections. RPC transport remains in ServerCallService. */
import {Bag} from 'genro-bag-js';
import {BagRows} from './bag-rows.js';

export function selectionBag(result, identifier) {
    if (!result || !Array.isArray(result.rows) || result.identifier !== identifier) {
        throw new TypeError('Selection requires rows and the declared identifier');
    }
    if (result.metadata != null && (typeof result.metadata !== 'object' || Array.isArray(result.metadata))) {
        throw new TypeError('Selection metadata must be an object');
    }
    const bag = new Bag();
    result.rows.forEach((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row) || row instanceof Bag) {
            throw new TypeError('Selection rows must be records');
        }
        bag.setItem(`r_${index}`, null, {...row});
    });
    // Validate the entire replacement before publishing any data or metadata.
    const probe = new BagRows(bag, {identifier, datamode:'attr'});
    probe.dispose();
    return bag;
}

export class CollectionStores {
    constructor(application) {
        this.application = application;
        this.entries = new Map();
    }
    get(code) {
        const entry = this.entries.get(code);
        if (!entry) throw new Error(`Unknown collection store: ${code}`);
        return entry.store;
    }
    register(node) {
        const attr = node.getAttr();
        const code = attr.storeCode;
        if (typeof code !== 'string' || !code || typeof attr.storepath !== 'string' || !attr.storepath) {
            throw new TypeError('Collection store requires storeCode and storepath');
        }
        if (this.entries.has(code)) throw new Error(`Duplicate collection store: ${code}`);
        const path = node.absDatapath(attr.storepath);
        if ([...this.entries.values()].some(entry => entry.path === path)) {
            throw new Error(`Collection store path already owned: ${path}`);
        }
        const data = this.application.data;
        const rpc = node.nodeTag === 'rpcStore';
        if (rpc && (typeof attr._identifier !== 'string' || !attr._identifier)) {
            throw new TypeError('rpcStore requires _identifier');
        }
        const store = new BagRows(data.getItem(path) ?? null, {
            identifier:attr._identifier, datamode:rpc ? 'attr' : (attr.datamode || 'bag'),
        });
        store.storeNode = node;
        store.storepath = path;
        store.storeType = rpc ? 'RpcBase' : 'BagRows';
        store.metadata = {};
        store.loadError = null;
        store.loadData = () => {
            if (store.disposed) throw new Error(`Disposed collection store: ${code}`);
            if (rpc) return node.builder._logic.compute(node);
        };
        // Refresh replacements; BagRows already observes mutations of the resident Bag.
        const subscription = `collection:${code}`;
        data.subscribe(subscription, {any:() => {
            const next = data.getItem(path) ?? null;
            if (next !== store.getData()) store.replace(next);
        }});
        this.entries.set(code, {node, store, subscription, path});
        node.store = store;
    }
    accept(node, result) {
        const entry = this.entries.get(node.getAttr('storeCode'));
        if (entry?.node !== node) throw new Error('RPC store is no longer registered');
        const bag = selectionBag(result, entry.store.identifier);
        entry.store.metadata = {...result.metadata};
        entry.store.loadError = null;
        this.application.data.setItem(entry.path, bag);
    }
    unregister(node) {
        const code = node.getAttr('storeCode');
        const entry = this.entries.get(code);
        if (entry?.node !== node) return;
        this.entries.delete(code);
        this.application.data.unsubscribe(entry.subscription, {any:true});
        entry.store.disposed = true;
        entry.store.error = new Error(`Collection store removed: ${code}`);
        entry.store._notify({type:'disposed'});
        entry.store.dispose();
    }
    dispose() {
        for (const {node} of [...this.entries.values()]) this.unregister(node);
    }
}
