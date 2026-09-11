// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Resident Bag adapter for the first grid. Storage and viewport stay separate. */
import {Bag} from 'genro-bag-js';

let sequence = 0;

export class BagRows {
    constructor(bag = null, {identifier = null, datamode = 'bag'} = {}) {
        this._subscriber = `gnr-grid-store-${++sequence}`;
        this._listeners = new Set();
        this._bags = new Map();
        this._bag = null;
        this._rows = [];
        this._nodeSet = new Set();
        this._byKey = new Map();
        this._identifier = identifier || null;
        this._datamode = datamode;
        this._batchDepth = 0;
        this._batchedEvent = null;
        this.replace(bag);
    }

    get bag() { return this._bag; }
    get datamode() { return this._datamode; }
    getData() { return this._bag; }
    getItems() { return this._rows.map(row => row.node); }
    len() { return this.size; }
    itemByIdx(index) { return this.rowAt(index)?.node || null; }
    getKeyFromIdx(index) { return this.rowAt(index)?.key ?? null; }
    getIdxFromPkey(key) { return this._rows.findIndex(row => row.key === key); }
    rowBagNodeByIdentifier(key) { return this.row(key)?.node || null; }
    keyGetter(node) { return this._identifier ? this.getValue(node, this._identifier) : node.label; }
    getValue(node, field) {
        if (this._datamode === 'attr') return node.getAttr(field);
        const value = node.getValue();
        return value.getNode(field) ? value.getItem(field) : node.getAttr(field);
    }
    rowFromItem(node) {
        const record = {...node.getAttr()};
        if (this._datamode === 'bag') for (const field of node.getValue().getNodes()) record[field.label] = field.getValue();
        return record;
    }
    rowByIndex(index) { const node = this.itemByIdx(index); return node ? this.rowFromItem(node) : null; }
    updateRow(index, values) { const node = this.itemByIdx(index); if (node) this.updateRowNode(node, values); }
    updateRowNode(node, values) {
        if (!this._nodeSet.has(node)) throw new Error('Row does not belong to this store');
        if (this._datamode === 'attr') node.setAttr(values, true, true, false);
        else for (const [field, value] of Object.entries(values)) node.getValue().setItem(field, value);
    }
    get identifier() { return this._identifier; }
    set identifier(value) {
        this.configure(this._bag, {identifier:value});
    }
    get size() { return this._rows.length; }
    keys() { return this._rows.map(row => row.key); }
    rowAt(index) { return this._rows[index] || null; }
    row(key) { return this._byKey.get(key) || null; }

    replace(bag) {
        this.configure(bag);
    }
    configure(bag, {identifier = this._identifier, datamode = this._datamode} = {}) {
        if (!['bag','attr'].includes(datamode)) throw new TypeError('datamode must be bag or attr');
        identifier = identifier || null;
        if (bag != null && !(bag instanceof Bag)) throw new TypeError('Grid store must be a Bag');
        if (bag === this._bag && identifier === this._identifier && datamode === this._datamode && this._initialized) return;
        const indexed = this._buildRows(bag, identifier, datamode);
        this._unsubscribeBags();
        this._bag = bag;
        this._identifier = identifier;
        this._datamode = datamode;
        [this._rows,this._byKey] = indexed;
        this._nodeSet = new Set(this._rows.map(row => row.node));
        this.error = null;
        this._initialized = true;
        this._subscribeBags();
        this._notify({type:'reset'});
    }

    _changed(event) {
        if (this._batchDepth) { this._batchedEvent = event; return; }
        this._refresh(event);
    }

    _refresh(event) {
        try {
            [this._rows,this._byKey] = this._buildRows(this._bag, this._identifier);
            this._nodeSet = new Set(this._rows.map(row => row.node));
            this.error = null;
            this._subscribeBags();
            this._notify({type:'change', event});
        } catch (error) {
            this.error = error;
            this._notify({type:'error', event, error});
        }
    }

    batch(callback) {
        this._batchDepth++;
        try { return callback(); }
        finally {
            this._batchDepth--;
            if (!this._batchDepth && this._batchedEvent) {
                const event = this._batchedEvent;
                this._batchedEvent = null;
                this._refresh(event);
            }
        }
    }

    _subscribeBags() {
        this._unsubscribeBags();
        if (!this._bag) return;
        const bags = [this._bag];
        for (const row of this._rows) {
            // Rows inserted after root backrefs are enabled already bubble to root.
            if (this._datamode === 'bag' && row.value._parent !== this._bag) bags.push(row.value);
        }
        bags.forEach((bag, index) => {
            const id = `${this._subscriber}-${index}`;
            bag.subscribe(id, {any:event => this._changed(event)});
            this._bags.set(bag, id);
        });
    }

    _unsubscribeBags() {
        for (const [bag,id] of this._bags) bag.unsubscribe(id, {any:true});
        this._bags.clear();
    }

    subscribe(listener) {
        if (typeof listener !== 'function') throw new TypeError('Grid store subscriber must be a function');
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    dispose() {
        this._unsubscribeBags();
        this._bag = null;
        this._rows = [];
        this._nodeSet = new Set();
        this._byKey = new Map();
        this._listeners.clear();
        this._batchDepth = 0;
        this._batchedEvent = null;
    }

    _buildRows(bag, identifier, datamode = this._datamode) {
        const rows = [];
        const byKey = new Map();
        for (const node of bag?.getNodes() || []) {
            const value = datamode === 'attr' ? node.getAttr() : node.getValue();
            if (datamode === 'bag' && !(value instanceof Bag)) throw new TypeError(`Grid row '${node.label}' must contain a Bag`);
            const key = identifier ? (datamode === 'attr' ? node.getAttr(identifier)
                : value.getNode(identifier) ? value.getItem(identifier) : node.getAttr(identifier)) : node.label;
            if (key == null || key === '') throw new Error(`Grid row '${node.label}' has no '${identifier}' identifier`);
            if (typeof key !== 'string' && (typeof key !== 'number' || !Number.isFinite(key))) {
                throw new TypeError(`Grid row '${node.label}' key must be a string or finite number`);
            }
            if (byKey.has(key)) throw new Error(`Duplicate grid row key: ${String(key)}`);
            const row = Object.freeze({key, node, value});
            rows.push(row);
            byKey.set(key, row);
        }
        return [rows,byKey];
    }

    _notify(change) { for (const listener of this._listeners) listener(change); }
}

export class ValuesBagRows extends BagRows {
    constructor(bag, options = {}) { super(bag, {...options, datamode:'bag'}); }
}
export class AttributesBagRows extends BagRows {
    constructor(bag, options = {}) { super(bag, {...options, datamode:'attr'}); }
}
