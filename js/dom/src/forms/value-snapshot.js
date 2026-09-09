// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Detached typed Bag snapshots. Compare persisted structure, never loose scalar
 * equality. Runtime validation metadata does not participate in persistence. */
import {Bag} from 'genro-bag-js';

const TRANSIENT = new Set(['_validationError','_validationWarnings','_displayedValue','_formattedValue','_loadedValue']);
export class ValueSnapshot {
    copy(value, seen=new Set()) {
        if (value == null || typeof value !== 'object') return value;
        if (seen.has(value)) throw new Error('Cyclic form data is unsupported');
        seen.add(value);
        try {
            if (value instanceof Date) {
                const result=new Date(value.getTime());
                for(const key of Object.keys(value)) result[key]=this.copy(value[key],seen);
                return result;
            }
            if (value instanceof Bag) {
                const result=new Bag();
                for (const node of value.getNodes()) {
                    if (node.resolver) throw new Error('Materialize resolver values before using a form');
                    const attrs=Object.fromEntries(Object.entries(node.getAttr()).filter(([key])=>!TRANSIENT.has(key)));
                    result.setItem(node.label,this.copy(node.getValue(),seen),this.copy(attrs,seen));
                }
                return result;
            }
            if (Array.isArray(value)) return value.map(item=>this.copy(item,seen));
            if (Object.getPrototypeOf(value)!==Object.prototype && Object.getPrototypeOf(value)!==null) {
                throw new Error(`Unsupported form value: ${value.constructor?.name}`);
            }
            return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,this.copy(item,seen)]));
        } finally { seen.delete(value); }
    }
    equal(a,b) {
        if (Object.is(a,b)) return true;
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
        if (a instanceof Date || b instanceof Date) {
            return a instanceof Date && b instanceof Date && a.getTime()===b.getTime()
                && this.equal({...a},{...b});
        }
        if (a instanceof Bag || b instanceof Bag) {
            if (!(a instanceof Bag && b instanceof Bag)) return false;
            const left=a.getNodes(), right=b.getNodes();
            return left.length===right.length && left.every((n,i)=>n.label===right[i].label
                && this.equal(n.getValue(),right[i].getValue()) && this.equal(n.getAttr(),right[i].getAttr()));
        }
        if (Array.isArray(a)!==Array.isArray(b)) return false;
        const keys=Object.keys(a);
        return keys.length===Object.keys(b).length && keys.every(key=>Object.hasOwn(b,key) && this.equal(a[key],b[key]));
    }
}

/** Default adapter: detached snapshots, replacement saves include deletions. */
export class MemoryStore {
    constructor(data) { this.snapshot=new ValueSnapshot(); this.data=this.snapshot.copy(data); }
    async load() { return {data:this.snapshot.copy(this.data)}; }
    async save(data) { this.data=this.snapshot.copy(data); return {}; }
}
