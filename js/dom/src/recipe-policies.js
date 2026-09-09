// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Source-level defaults: preserve explicit values and resolve inherited pointers
 * in their declaring scope. Decoration never creates a second source/datapath. */
export class RecipePolicies {
    localAttributes(node) {
        const local = node.getAttr();
        if (node.nodeTag !== 'formlet') return local;
        const aliases = {lbl_side: 'top'};
        for (const [key, value] of Object.entries(local)) {
            if (!key.startsWith('item_')) continue;
            const name = key.slice(5);
            if (!/^(lbl_|fld_|box_)/.test(name)) {
                throw new Error(`Unsupported formlet default: ${key}`);
            }
            aliases[name] = value;
        }
        return {...aliases, ...local};
    }
    getAttributes(node) {
        const attrs = {};
        const parent = node.parentNode;
        if (parent) {
            for (const [key,value] of Object.entries(this.localAttributes(parent))) {
                if (!key.startsWith('fld_') && !(parent.nodeTag === 'formlet' && key.startsWith('box_'))) continue;
                const name=key.startsWith('fld_') ? key.slice(4) : key;
                if (['value','checked','datapath','node_id','id','formId','store','controllerPath'].includes(name)) {
                    throw new Error(`Unsupported field default: ${key}`);
                }
                attrs[name]=this.getValue(parent,value);
            }
        }
        for (const [key,value] of Object.entries(this.localAttributes(node))) {
            if (key.startsWith('fld_') && node._getMeta('webcomponent') && !['labledBox','formlet'].includes(node.nodeTag)) {
                const name=key.slice(4);
                if (['value','checked','datapath','node_id','id','formId','store','controllerPath'].includes(name)) {
                    throw new Error(`Unsupported field default: ${key}`);
                }
                attrs[name]=this.getValue(node,value);
            }
        }
        const inheritedNames=new Set(['blankIsNull','label_side','lbl_side']);
        for(let current=node.parentNode;current;current=current.parentNode) {
            for(const name of Object.keys(this.localAttributes(current))) if(name.startsWith('lbl_'))inheritedNames.add(name);
        }
        for (const name of inheritedNames) {
            if (name==='lbl_side' && node.nodeTag==='labledBox' && Object.hasOwn(node.getAttr(),'side')
                && !Object.hasOwn(node.getAttr(),'lbl_side'))continue;
            for(let current=node;current;current=current.parentNode) {
                if (Object.hasOwn(this.localAttributes(current),name)) {
                    attrs[name]=this.getValue(current,this.localAttributes(current)[name]);break;
                }
            }
        }
        const local = this.localAttributes(node);
        if (node.nodeTag === 'formlet') {
            const columns = this.getValue(node, local.columns);
            if (columns != null && (/^-?\d+(\.\d+)?$/.test(String(columns)))
                && (!Number.isInteger(Number(columns)) || Number(columns) < 1)) {
                throw new Error('formlet columns must be a positive integer or CSS track list');
            }
            if (local.wrap != null && local.wrap !== false) throw new Error('formlet wrap is not supported yet');
        }
        return {...attrs,...local};
    }
    getValue(node,value) {
        return node.pointerType(value) ? node.builder.handler.data.getItem(node.absDatapath(value)) : value;
    }
}
