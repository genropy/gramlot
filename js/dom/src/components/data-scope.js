// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Bag} from 'genro-bag-js';

/** Renderer-owned read capability. Components receive values, not Source access. */
export function createDataScopeReader(node) {
    return () => {
        const scope = node.getAttr('datapath');
        if (typeof scope !== 'string' || !scope.trim()) {
            throw new Error('A group data action requires an explicit datapath');
        }
        const datapath = node.absDatapath('.');
        const value = node.dataHandler.data.getItem(datapath);
        if (!(value instanceof Bag)) throw new Error('The associated datapath must identify a Data Bag');
        return {datapath, sourceId:node.builder.targetId(node), value};
    };
}

/** Values-only JSON: Bag labels become keys; node attributes are excluded.
 * Reject lossy/ambiguous cases instead of silently coercing them. */
export function dataScopeJson(value) {
    const ancestors = new Set();
    const convert = item => {
        if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
        if (typeof item === 'number' && Number.isFinite(item)) return item;
        if (item instanceof Date && Number.isFinite(item.getTime())) return item.toISOString();
        if (typeof item !== 'object' || !item) throw new TypeError('Unsupported value in group JSON');
        if (ancestors.has(item)) throw new TypeError('Cyclic values cannot be copied as JSON');
        ancestors.add(item);
        try {
            if (item instanceof Bag) {
                const names = new Set();
                return Object.fromEntries(item.getNodes().map(node => {
                    if (names.has(node.label)) throw new TypeError(`Duplicate Bag label: ${node.label}`);
                    names.add(node.label);
                    return [node.label, convert(node.value)];
                }));
            }
            if (Array.isArray(item)) return Array.from(item,convert);
            if (Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null) {
                if (Object.getOwnPropertySymbols(item).length) throw new TypeError('Symbol keys cannot be copied as JSON');
                return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, convert(child)]));
            }
            throw new TypeError('Unsupported typed object in group JSON');
        } finally { ancestors.delete(item); }
    };
    return JSON.stringify(convert(value), null, 2);
}
