// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Builder-aware Bag and BagNode — JS port of source_bag.py.
 *
 * `SourceBag`/`SourceBagNode` extend the plain `Bag`/`BagNode` of
 * genro-bag-js with grammar dispatch and the data-binding surface
 * (pointer resolution, absolute datapath composition, the reactive
 * SET/GET/PUT/FIRE macros). The fluent API (`root.body().h1('x')`) is
 * served by a `Proxy`, the JS equivalent of Python's `__getattribute__`
 * (bag: schema first) and `__getattr__` (node: real props first).
 *
 * Ported linearly from source_bag.py; the symbolic-datapath branch
 * (`#FORM`/`#ANCHOR`/`#<id>`) is not yet needed and raises explicitly.
 */
import { Bag, BagNode } from 'genro-bag-js';
import { registerClass } from 'genro-tytx';
import {resolverDeclaration} from './resolvers/service.js';

/** Names that collide with a language keyword; the trailing-underscore
 *  form escapes them (`class_` → `class`), parity with fixed_attr_items. */
const RESERVED = new Set([
    'class', 'for', 'del', 'import', 'new', 'var', 'default', 'in', 'do',
    'if', 'case', 'switch', 'delete', 'super', 'this', 'return',
]);

/** Sentinel key for a node's own value in runtimeToEvaluate (Python's None). */
export const VALUE = Symbol('value');

/** Structural attributes that never reach the rendered markup. */
export const META_ATTRS = new Set([
    '_meta', 'datapath', 'node_id', 'ns', 'form', 'formId', '_anchor', 'updateOn', 'live', 'controllerPath',
]);

/** Strip a trailing `_` when the bare name is a reserved word. */
function canonicalName(name) {
    if (name.endsWith('_') && RESERVED.has(name.slice(0, -1))) {
        return name.slice(0, -1);
    }
    return name;
}

/** Node subclass: builder slot, per-document serial, data-binding surface. */
export class SourceBagNode extends BagNode {
    constructor(parentBag, label, value = null, attr = null,
                resolver = null, nodeTag = null, xmlTag = null) {
        super(parentBag, label, value, attr, resolver, nodeTag, xmlTag);
        this._builder = null;
        this._targetId = null;
    }

    /** Node-qualified topics share the owning application's genro coordinator. */
    publish(message, payload) {
        const events = this.builder?.handler?.application?.events;
        if (!events) throw new Error('Source publication requires a mounted application');
        return events.publish(events.nodeTopic(this, message), payload);
    }

    subscribe(message, callback, options = {}) {
        const events = this.builder?.handler?.application?.events;
        if (!events) throw new Error('Source subscription requires a mounted application');
        return events.subscribe(events.nodeTopic(this, message), callback, {...options, sourceNode:this});
    }

    getFormHandler() { return this.builder?.handler?.application?._forms.getForm(this) || null; }

    /** Active builder: own slot, else the closest ancestor's. */
    get builder() {
        if (this._builder) {
            return this._builder;
        }
        const parent = this.parentBag;
        return parent ? parent._builder : null;
    }

    /** The handler that owns this tree (lives on the source root). */
    get handler() {
        return this.parentBag.root._handler;
    }

    /** The document's handler for DATA access (same as handler when attached). */
    get dataHandler() {
        return this.parentBag.root._handler || this.builder.handler;
    }

    /** The page builder mounted on the document (owns the data segment). */
    get rootBuilder() {
        return this.parentBag.root._builder;
    }

    get rootBuilderName() {
        return this.rootBuilder.name;
    }

    /** Read schema `_meta` values carried by this node. */
    _getMeta(keys) {
        const meta = this.getAttr('_meta') || {};
        const names = keys.split(',').map((k) => k.trim());
        if (names.length === 1) {
            return meta[names[0]] !== undefined ? meta[names[0]] : null;
        }
        return names.map((n) => (meta[n] !== undefined ? meta[n] : null));
    }

    /** Return "^" (reactive), "=" (passive) or null. */
    pointerType(v) {
        if (typeof v === 'string' && v.startsWith('==')) return null;
        if (typeof v === 'string' && (v[0] === '^' || v[0] === '=')) {
            return v[0];
        }
        return null;
    }

    /** Reactive pointers carried by this node as [attrname, pointer].
     *  attrname "" for a pointer in node.value. Only `^` (reactive). */
    pointers() {
        const result = [];
        for (const [attrname, v] of Object.entries(this.getAttr() || {})) {
            if (this.pointerType(v) === '^') {
                result.push([attrname, v]);
            }
        }
        if (this.pointerType(this.value) === '^') {
            result.push(['', this.value]);
        }
        return result;
    }

    /** Domain attributes as [name, value] pairs, names canonicalized. */
    fixedAttrItems() {
        const out = [];
        const attrs = this.getAttr() || {};
        for (const [name, v] of Object.entries(attrs)) {
            if (META_ATTRS.has(name)) {
                continue;
            }
            out.push([canonicalName(name), v]);
        }
        return out;
    }

    /** Attributes to resolve plus the node value under the VALUE sentinel. */
    runtimeToEvaluate() {
        const items = new Map(this.fixedAttrItems());
        items.set(VALUE, this.value);
        return items;
    }

    // --- path composition (DAT.2), ported from source_bag.py ---------

    /** Compose the absolute datastore path for `path` relative to this node. */
    absDatapath(path) {
        const raw = path;
        if (this.pointerType(path)) {
            path = path.slice(1);
        }
        let attr = null;
        if (path.includes('?')) {
            [path, attr] = path.split('?', 2);
        }
        let volume = this.rootBuilderName;
        if (path.includes(':') && !path.startsWith('.')) {
            [volume, path] = path.split(':', 2);
            return this._composeAbsPath(volume, path, attr);
        }
        if (path.startsWith('#')) {
            return this._resolveSymbolicDatapath(path, raw);
        }
        if (path.startsWith('.')) {
            path = this._composeRelativeDatapath(path, raw);
        }
        return this._composeAbsPath(volume, path, attr);
    }

    _composeAbsPath(volume, path, attr) {
        path = this._collapseParentDatapath(path, path);
        const base = `${volume}.${path}`;
        return attr ? `${base}?${attr}` : base;
    }

    _composeRelativeDatapath(path, raw) {
        let current = this;
        while (current !== null && path.startsWith('.')) {
            const dp = current.getAttr('datapath');
            if (dp !== null && dp !== undefined) {
                path = path === '.' ? dp : dp + path;
            }
            current = current.parentNode;
        }
        if (path.startsWith('.')) {
            throw new Error(`unresolved relative datapath: ${raw}`);
        }
        return path;
    }

    _collapseParentDatapath(path, raw) {
        const out = [];
        for (const segment of path.split('.')) {
            if (segment === '#parent') {
                if (out.length === 0) {
                    throw new Error(`#parent has no segment to cancel: ${raw}`);
                }
                out.pop();
            } else {
                out.push(segment);
            }
        }
        return out.join('.');
    }

    /** Resolve a `#SYMBOL[.relpath]` path.
     *  #FORM → nearest ancestor with formId set or form=true;
     *  #ANCHOR → nearest ancestor with `_anchor` present;
     *  #<id> → node carrying that node_id. The anchor then resolves
     *  `relpath` relatively (its own datapath chain is consulted). */
    _resolveSymbolicDatapath(path, raw) {
        const s = path.slice(1);
        const idx = s.indexOf('.');
        const symbol = idx === -1 ? s : s.slice(0, idx);
        const relpath = idx === -1 ? '' : s.slice(idx + 1);
        let anchor;
        if (symbol === 'FORM') {
            anchor = this._findMarkedDatapathAncestor(true, false, raw);
        } else if (symbol === 'ANCHOR') {
            anchor = this._findMarkedDatapathAncestor(false, true, raw);
        } else {
            const builder = this.builder;
            if (!builder) {
                throw new Error(`#<id>: cannot resolve ${raw} on a node without builder`);
            }
            anchor = builder.source.getNodeByAttr('node_id', symbol);
            if (anchor === null || anchor === undefined) {
                throw new Error(`#<id>: cannot resolve ${raw}`);
            }
        }
        return anchor.absDatapath(relpath ? `.${relpath}` : '.');
    }

    /** Walk ancestors (from this node) for the requested marker.
     *  form → formId set OR form===true; anchor → `_anchor` present. */
    _findMarkedDatapathAncestor(form, anchor, raw) {
        let current = this;
        while (current !== null && current !== undefined) {
            const attrs = current.getAttr() || {};
            if (form && (attrs.formId != null || attrs.form === true)) {
                return current;
            }
            if (anchor && '_anchor' in attrs) {
                return current;
            }
            current = current.parentNode;
        }
        const marker = form ? 'FORM' : 'ANCHOR';
        throw new Error(`#${marker}: no marked ancestor found for ${raw}`);
    }

    // --- datastore access + reactive macros --------------------------

    /** Read the datastore at `path` resolved relative to this node. */
    getRelativeData(path, defaultValue = null) {
        const data = this.dataHandler.data;
        return data.getItem(this.absDatapath(path), defaultValue);
    }

    /** Write `value` into the datastore at `path`. */
    setRelativeData(path, value, { attributes = null, fired = false, reason = null } = {}) {
        const data = this.dataHandler.data;
        const absPath = this.absDatapath(path);
        // bag-js setItem(path, value, attr, nodePosition, updattr,
        // removeNullAttributes, reason, fired). Omitted reason → true
        // (the write is its own origin), parity with set_relative_data.
        data.setItem(absPath, value, attributes, '>', false, true,
            reason === null ? true : reason, fired);
    }

    fireEvent(path, value = true, { attributes = null, reason = null } = {}) {
        this.setRelativeData(path, value, { attributes, fired: true, reason });
    }

    SET(path, value) { this.setRelativeData(path, value); }

    GET(path) { return this.getRelativeData(path); }

    PUT(path, value) { this.setRelativeData(path, value, { reason: false }); }

    FIRE(path, value = true) { this.setRelativeData(path, value, { fired: true }); }

    /**
     * Attach validation rules to this declaration and keep the fluent source API.
     * `validate({notnull:true})` writes `validate_notnull:true` on this same node;
     * the existing field/Validator path remains the only runtime mechanism.
     */
    validate(rules = {}) {
        if (rules === null || typeof rules !== 'object' || Array.isArray(rules)) {
            throw new TypeError('validate() expects an object of unprefixed rule names');
        }
        const attrs = {};
        for (const [name, value] of Object.entries(rules)) {
            if (!name || name.startsWith('validate_')) {
                throw new TypeError(
                    `validate() expects unprefixed rule names; use ${name || '(empty key)'} as a direct attribute`
                );
            }
            attrs[`validate_${name}`] = value;
        }
        this.setAttr(attrs);
        return wrapSource(this);
    }
}

/** Bag subclass: dispatches tag names to the active builder. */
export class SourceBag extends Bag {
    static tytxSuffix = 'XS';
    constructor(source = null, builder = null, handler = null) {
        super(source);
        this._builder = builder;
        this._handler = handler;
    }

    get nodeClass() {
        return SourceBagNode;
    }
}

registerClass(SourceBag);

/**
 * Split call arguments into `{value, attrs}`: `h1('Hello')` → value;
 * `div('t', {id})` → value + attrs; `svg({width})` → attrs only.
 */
function splitArgs(args) {
    if (args.length === 0) {
        return { value: null, attrs: {} };
    }
    const first = args[0];
    if (first !== null && typeof first === 'object' && !Array.isArray(first)
        && !(first instanceof Bag)) {
        return { value: null, attrs: first };
    }
    return { value: first, attrs: args[1] || {} };
}

const SKIP = new Set(['then', 'toJSON']);

/** Wrap a SourceBag/SourceBagNode in the grammar Proxy so tag names
 *  dispatch to the builder. Returns the input unchanged when detached. */
export function wrapSource(target) {
    if (target === null || target === undefined) {
        return target;
    }
    const builder = target._builder || (target.parentBag && target.parentBag._builder);
    if (!builder) {
        return target;
    }
    const onBag = target instanceof Bag;
    return new Proxy(target, {
        get(obj, prop) {
            if (typeof prop === 'symbol' || prop.startsWith('_') || SKIP.has(prop)) {
                return Reflect.get(obj, prop, obj);
            }
            if (prop === "data" && builder.constructor.data_recipe_alias) {
                const call = elementCall(builder, obj, "dataSetter", onBag);
                return (destination, value, attrs = {}) => call(typeof destination === "string"
                    ? {...attrs, destination, value} : destination);
            }
            if (prop === 'quickGrid' && builder.schemaTag('grid')) {
                return (options = {}) => {
                    const {value = null, ...attrs} = options;
                    if ('store' in attrs) throw new TypeError('quickGrid uses value; use grid for an explicit store');
                    return elementCall(builder, obj, 'grid', onBag)({...attrs, store:value});
                };
            }
            if (prop === 'urlResolver' || prop === 'openApiResolver') {
                return (destination, url, options = {}) => elementCall(builder, obj, 'dataController', onBag)(
                    resolverDeclaration(prop === 'urlResolver' ? 'url' : 'openapi', destination, url, options));
            }
            if (prop === 'column' && !onBag && obj.nodeTag === 'grid') {
                return (field, attrs = {}) => {
                    if (typeof field !== 'string' || !field) throw new TypeError('column() requires a nonempty field');
                    if (!obj._gridStructure) {
                        if (obj.getAttr('structpath') || obj.getAttr('columns')) throw new TypeError('column() cannot extend an external structure');
                        builder._gridStructSerial = (builder._gridStructSerial || 0) + 1;
                        const path = `__grid_structures.grid_${builder._gridStructSerial}`;
                        obj._gridStructure = new Bag();
                        obj._gridStructure.setItem('view_0.rows_0', new Bag());
                        elementCall(builder, builder.source, 'dataSetter', true)({destination:path, value:obj._gridStructure});
                        obj.setAttr({structpath:path});
                    }
                    const cells = obj._gridStructure.getItem('view_0.rows_0');
                    cells.setItem(`cell_${cells.getNodes().length}`, null, {...attrs, field});
                    return wrapSource(obj);
                };
            }
            const tag = builder.schemaTag(prop);
            if (onBag && tag) {
                return elementCall(builder, obj, tag, onBag);
            }
            if (prop in obj) {
                const v = Reflect.get(obj, prop, obj);
                return typeof v === 'function' ? v.bind(obj) : v;
            }
            if (tag) {
                return elementCall(builder, obj, tag, onBag);
            }
            // @container: a body-carrying method that GENERATES source at
            // call time (legacy gnrwebstruct parity). It runs with the
            // target (wrapped, so its body can dispatch tags) as first arg.
            const method = builder.containerMethod(prop);
            if (method) {
                return (...args) => builder[method](wrapSource(obj), ...args);
            }
            return undefined;
        },
    });
}

/** Build the callable that creates and returns a wrapped child node. */
function elementCall(builder, target, tag, onBag) {
    return (...args) => {
        let { value, attrs } = splitArgs(args);
        if (tag === 'dataFormula' && typeof args[0] === 'string') {
            const [destination, formula, bindings = {}] = args;
            if (args.length > 3 || (typeof formula !== 'string' && typeof formula !== 'function')
                || !bindings || typeof bindings !== 'object' || Array.isArray(bindings)
                || 'destination' in bindings || 'formula' in bindings) {
                throw new Error('Use dataFormula(destination, formula, bindings)');
            }
            value = null;
            attrs = {...bindings, destination, formula};
        } else if (tag === 'css' && (typeof args[0] !== 'object' || args[0] === null)) {
            value = null;
            attrs = {rule:args[0], styleRule:typeof args[1] === 'string' ? args[1] : '',
                ...(typeof args[1] === 'object' ? args[1] : args[2])};
        } else if (tag === 'styleSheet' && (typeof args[0] !== 'object' || args[0] === null)) {
            value = null;
            attrs = {cssText:args[0], ...(typeof args[1] === 'object' ? args[1]
                : {cssTitle:args[1], href:args[2]})};
        }
        const node = onBag
            ? builder.bagCall(target, tag, value, attrs)
            : builder.commandOnNode(target, tag, value, attrs);
        return wrapSource(node);
    };
}
