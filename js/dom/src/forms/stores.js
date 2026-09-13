// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Persistence adapters. FormController owns dirty/validation/conflict policy. */
import {Bag} from 'genro-bag-js';
import {MemoryStore, ValueSnapshot} from './value-snapshot.js';

export function formStore(form, type) {
    const snapshot = new ValueSnapshot();
    const copy = value => {
        if (!(value instanceof Bag)) throw new TypeError('Form store data must be a Bag');
        return snapshot.copy(value);
    };
    if (type === 'memory') return new MemoryStore(form.baseline);
    const node = form.sourceNode, app = form.application;
    let loadedIdentity;
    const identity = () => type === 'collection' ? form.attrs.storeKey : form.attrs.storepath;
    const guard = () => {
        if (loadedIdentity === undefined || loadedIdentity !== identity()) throw new Error('Load the current record before saving');
    };
    if (type === 'record') {
        return {
            async load({signal}={}) {
                const key = form.attrs.storeKey;
                const result = await app.server.call(form.attrs.loadmethod, {key}, {owner:node, signal});
                const data = copy(result.data);
                loadedIdentity = key;
                return {data};
            },
            async save(data, {signal}={}) {
                if (loadedIdentity === undefined || loadedIdentity !== form.attrs.storeKey) throw new Error('Load the current record before saving');
                return app.server.call(form.attrs.savemethod, {key:loadedIdentity, data:copy(data)}, {owner:node, signal});
            },
        };
    }
    if (!['item', 'collection', 'subform', 'hierarchical'].includes(type)) throw new Error(`Unknown form store type: ${type}`);
    const dataPath = () => node.absDatapath(form.attrs.storepath);
    const collection = () => app.stores.get(form.attrs.storeCode);
    return {
        async load() {
            const key = identity();
            let data;
            if (type === 'collection') {
                const store = collection(), row = store.rowBagNodeByIdentifier(key);
                if (!row) throw new Error('Record not found in the collection');
                data = new Bag();
                for (const [field, value] of Object.entries(store.rowFromItem(row))) data.setItem(field, value);
            } else {
                data = copy(app.data.getItem(dataPath()));
                if (type === 'subform') {
                    const subset = new Bag();
                    for (const field of form.attrs.storeFields || []) subset.setItem(field, data.getItem(field));
                    data = subset;
                }
            }
            loadedIdentity = key;
            return {data:copy(data)};
        },
        async save(data) {
            guard(); data = copy(data);
            if (type === 'collection') {
                const store = collection(), row = store.rowBagNodeByIdentifier(loadedIdentity);
                if (!row) throw new Error('Record was removed from the collection');
                const values = Object.fromEntries(data.getNodes().map(n => [n.label, n.getValue()]));
                if (store.identifier && values[store.identifier] !== loadedIdentity) throw new Error('Cannot change collection identity');
                if (store.datamode === 'attr') row.setAttr(values, true, false, false);
                else row.setValue(data);
            } else if (type === 'subform') {
                const parent = copy(app.data.getItem(dataPath()));
                for (const field of form.attrs.storeFields || []) parent.setItem(field, data.getItem(field));
                app.data.setItem(dataPath(), parent);
            } else app.data.setItem(dataPath(), data);
            return {};
        },
    };
}
