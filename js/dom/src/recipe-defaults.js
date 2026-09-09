// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Seed pointer defaults once per source node through the normal datastore API.
 * Existing nodes (including null, empty, zero and false) are preserved.
 * Unlike legacy's truthy fallback, explicit zero/false defaults are meaningful.
 */
import {fromTytx} from 'genro-tytx';
import {SourceBag, VALUE} from './source-bag.js';

export class RecipeDefaults {
    constructor(builder) { this.builder = builder; this.initialized = new WeakSet(); }
    initializeBag(bag) {
        for (const node of bag.getNodes()) this.initializeNode(node);
    }
    initializeNode(node) {
        if (this.initialized.has(node)) return;
        this.initialized.add(node);
        if (!node._getMeta('data_element')) {
            const attrs = node.getAttr();
            for (const [key, pointer] of node.runtimeToEvaluate()) {
                const name = key === VALUE ? 'innerHTML' : key;
                if (typeof name !== 'string' || name.startsWith('default') || !node.pointerType(pointer)) continue;
                const fallback = name === 'value' && Object.hasOwn(attrs, 'default')
                    ? attrs.default : attrs[`default_${name}`];
                if (fallback === undefined) continue;
                const path = node.absDatapath(pointer);
                const [nodePath, attribute] = path.split('?');
                const data = this.builder.handler?.data || this.builder.data;
                const current = data.getNode(nodePath);
                if (attribute ? current && Object.hasOwn(current.getAttr(), attribute) : current) continue;
                let value = fallback;
                if (typeof value === 'string' && attrs.dtype && !['A', 'T'].includes(attrs.dtype)) {
                    const encoded = `${value}::${attrs.dtype}`;
                    value = fromTytx(encoded);
                    if (value === encoded || (typeof value === 'number' && !Number.isFinite(value))) {
                        throw new Error(`Invalid default for dtype ${attrs.dtype}`);
                    }
                }
                if (attribute) {
                    const target = current || data.setItem(nodePath, null);
                    target.setAttr({[attribute]: value}, true, true, false);
                } else data.setItem(nodePath, value);
            }
        }
        if (node.getValue() instanceof SourceBag) this.initializeBag(node.getValue());
    }
}
