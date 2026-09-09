// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * BuilderBase — JS port of builder/base.py + _grammar.py.
 *
 * A builder owns a grammar (`SCHEMA`, in the `builder_grammar` shape)
 * and a `source` SourceBag. The fluent API lands through the source
 * Proxy: `root.body()` → `bagCall`, `node.h1('x')` → `commandOnNode`,
 * both converging on `setChild`.
 *
 * The source lives under the structural `SOURCE_ROOT` segment of a
 * wrapper root (`_sourceroot`): `source` is the payload `main` builds,
 * `_sourceroot` the wrapper carried for the tree-not-forest guarantee
 * and for source reactivity (the subscribe hangs off the wrapper).
 *
 * Data binding: `runtimeValues(node)` resolves `^`/`=` pointers from
 * `handler.data`, registering `^` readers in the pointer_map.
 * Structural reactivity: when reactive, `_sourceroot` is subscribed to
 * `_onSourceEvent`, which keeps the pointer_map coherent (mapkeep) and
 * queues the touched path with its kind (ins/del/upd). `render` does a
 * full render; `renderNodes` turns a live batch into per-node patches
 * (`replace`/`insert`/`remove`).
 *
 * Not-yet-ported (later slices): ${...} templates, _present_value /
 * mask, data-elements, @component expansion + row/cell/page patch ops,
 * cardinality validation, sub-builder.
 */
import {RecipePolicies} from './recipe-policies.js';
import { Bag } from 'genro-bag-js';
import {RecipeDefaults} from './recipe-defaults.js';
import { SourceBag, wrapSource, VALUE } from './source-bag.js';
import { getCollection, injectCollectionCss } from './collections.js';

/** Structural segment that carries the payload source (tree-not-forest). */
export const SOURCE_ROOT = '_root_';

/** Slot in the writeback segment-tree holding a level's key-set (Python's
 *  `None` dict key: a symbol so it can never collide with a path segment). */
const WB_KEYS = Symbol('writebackKeys');

/** Data-elements: transparent @elements (marked `_meta.data_element`) that
 *  drive the reactive cascade — a setter seeds a datum, a formula computes
 *  one from others, a controller runs side effects. Grammar of BuilderBase,
 *  so every dialect inherits them. Called with a kwargs object
 *  (`dataSetter({destination, value})`, `dataFormula({destination, formula, ...bindings})`,
 *  `dataController({func, ...bindings})`) — DIFF-PYTHON: JS has no **kwargs. */
const BASE_GRAMMAR = {
    elements: {
        dataSetter: { sub_tags: '', _meta: { data_element: 'setter' } },
        dataFormula: { sub_tags: '', _meta: { data_element: 'formula' } },
        dataController: { sub_tags: '', _meta: { data_element: 'controller' } },
    },
};

/** Schema fields of a data-element, stripped from the func bindings. */
export const DATA_ELEMENT_FIELDS = new Set(['destination', 'formula', 'func', 'value', '_on_start']);

/** A bare identifier is a func NAME (resolved via data_logic); anything
 *  else is a JS code string, compiled to a function. */
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;

const _funcCache = new Map();

/** Compile a JS code string to a function (memoized). The string must
 *  evaluate to a function: `'(b) => b.base * b.altezza'`,
 *  `'({qty, price}) => qty * price'`, `'(node, b) => node.SET(".x", b.y)'`.
 *  DIFF-PYTHON: a JS-only extension — the recipe can carry inline logic. */
function compileFunc(code) {
    let fn = _funcCache.get(code);
    if (fn === undefined) {
        // eslint-disable-next-line no-new-func
        fn = new Function(`"use strict"; return (${code});`)();
        if (typeof fn !== 'function') {
            throw new Error(`data-element func code did not evaluate to a function: ${code}`);
        }
        _funcCache.set(code, fn);
    }
    return fn;
}

export class BuilderBase {
    constructor(name = null) {
        this._disposed = false;
        this.name = name || this.constructor._name;
        this.handler = null;
        this.data = null;
        this.target = null;
        this._targetSerial = 0;
        // Expansion write-back (CMP.7): flat map (composite id → node) for
        // the mutate, segment-tree index for the O(own-subtree) purge, and
        // the per-component cell catalog (base → field → [(ordinal, op)]).
        this._defaults = new RecipeDefaults(this);
        this._writebackMap = {};
        this._writebackIndex = {};
        this._cellMap = {};
        this._sourceroot = new SourceBag(null, this, null);
        // Backref first, so the SOURCE_ROOT sub-bag inherits it on insert
        // (bag-js propagates backref to children at insert time).
        this._sourceroot.setBackref();
        this._sourceroot.setItem(SOURCE_ROOT, new SourceBag(null, this, null));
        this.source = this._sourceroot.getItem(SOURCE_ROOT);
    }

    // --- grammar -----------------------------------------------------

    /** Build `_classSchema` from a `builder_grammar` doc, merging the
     *  parent's (the mixin/inheritance chain). Called in a subclass
     *  `static {}` block — the JS equivalent of Python `__init_subclass__`.
     *  DIFF-PYTHON: @element/@abstract are data here (the grammar object),
     *  not decorated methods; @component/@container are registered
     *  separately (they carry a body). */
    static defineGrammar(doc) {
        const parent = Object.getPrototypeOf(this);
        this._classSchema = { ...(parent._classSchema || {}), ...doc.elements };
        this._abstracts = { ...(parent._abstracts || {}), ...(doc.abstracts || {}) };
        this._tagNames = null;
    }

    // The data-elements are grammar of the base, inherited by every dialect.
    static { this.defineGrammar(BASE_GRAMMAR); }

    /** Map lowercase → method name for the @containers declared along the
     *  class chain via `static containers = [...]` (subclass wins). */
    get _containers() {
        if (!Object.hasOwn(this.constructor, '_containerMap')) {
            const map = {};
            let cls = this.constructor;
            while (cls && cls !== Function.prototype) {
                if (Object.hasOwn(cls, 'containers') && Array.isArray(cls.containers)) {
                    for (const name of cls.containers) {
                        const key = name.toLowerCase();
                        if (!(key in map)) {
                            map[key] = name;
                        }
                    }
                }
                cls = Object.getPrototypeOf(cls);
            }
            this.constructor._containerMap = map;
        }
        return this.constructor._containerMap;
    }

    /** The method name for the container `name`, or null. */
    containerMethod(name) {
        return this._containers[name.toLowerCase()] || null;
    }

    get schema() {
        return this.constructor._classSchema || {};
    }

    get schemaTagNames() {
        let map = this.constructor._tagNames;
        if (!map) {
            map = {};
            for (const tag of Object.keys(this.schema)) {
                map[tag.toLowerCase()] = tag;
            }
            this.constructor._tagNames = map;
        }
        return map;
    }

    schemaTag(name) {
        const lookup = name.toLowerCase();
        const direct = this.schemaTagNames[lookup];
        if (direct) {
            return direct;
        }
        const prefix = `${this.constructor._name}_`;
        if (lookup.startsWith(prefix)) {
            return this.schemaTagNames[lookup.slice(prefix.length)] || null;
        }
        return null;
    }

    // --- node creation (the fluent API converges here) ---------------

    bagCall(bag, tag, value, attrs) {
        return this.setChild(bag, tag, value, attrs);
    }

    commandOnNode(node, tag, value, attrs) {
        if (!(node.value instanceof SourceBag)) {
            node.value = new SourceBag(null, node.builder || this, this.handler);
        }
        return this.setChild(node.value, tag, value, attrs);
    }

    setChild(bag, tag, value, attrs) {
        const attributes = { ...attrs };
        const info = this.schema[tag] || {};
        if (info._meta && !('_meta' in attributes)) {
            attributes._meta = info._meta;
        }
        if (info.ns && !('ns' in attributes)) {
            attributes.ns = info.ns;
        }
        const nodePosition = attributes.node_position;
        delete attributes.node_position;
        const label = this._autoLabel(bag, tag);
        const node = bag.setItem(label, value, attributes, nodePosition || '>');
        node.nodeTag = tag;
        node._builder = this;
        return node;
    }

    _autoLabel(bag, tag) {
        let n = 0;
        while (bag.node(`${tag}_${n}`) !== null && bag.node(`${tag}_${n}`) !== undefined) {
            n += 1;
        }
        return `${tag}_${n}`;
    }

    /** Source node carrying `nodeId` (per-builder id namespace), wrapped
     *  so the grammar dispatch (`.li(...)`) works, like Python's __getattr__. */
    nodeById(nodeId) {
        const node = this.source.getNodeByAttr('node_id', nodeId);
        if (node === null || node === undefined) {
            throw new Error(`node_id not found: ${nodeId}`);
        }
        return wrapSource(node);
    }

    // --- data binding ------------------------------------------------

    /** Resolve the pointers/values a node carries → [runtimeValue, runtimeAttrs]. */
    runtimeValues(node) {
        const resolved = new Map();
        const policyAttrs = new RecipePolicies().getAttributes(node);
        const entries = new Map(node.runtimeToEvaluate());
        for (const [key,value] of Object.entries(policyAttrs)) {
            if (!entries.has(key) && !["_meta","datapath","node_id","formId","form","controllerPath","store"].includes(key)) entries.set(key,value);
        }
        for (const [k, v] of entries) {
            const ptype = node.pointerType(v);
            if (!ptype) {
                resolved.set(k, v);
                continue;
            }
            const absPath = node.absDatapath(v);
            const value = this.handler.data.getItem(absPath);
            // A data-widget owns its reactivity (it subscribes to the Bag
            // branch itself. Only its independent label/box bindings enter
            // the pointer map; store updates must not reset tree expansion.
            const decoration = typeof k === 'string'
                && (k === 'lbl' || k.startsWith('lbl_') || k.startsWith('box_'));
            const registers = ptype === '^' && node.handler !== null
                && node.handler !== undefined && (!node._getMeta('dataWidget') || decoration);
            if (registers) {
                this.handler._registerPath(node, absPath);
            }
            resolved.set(k, value);
        }
        const runtimeValue = resolved.get(VALUE);
        resolved.delete(VALUE);
        return [runtimeValue, Object.fromEntries(resolved)];
    }

    /** Source node whose serial is `targetId` (the upstream half of the
     *  identity bridge: patches go down by serial, mutations come up the
     *  same way). Walk-based like nodeById. */
    nodeByTargetId(targetId) {
        const queue = [this.source];
        while (queue.length) {
            for (const node of queue.shift().getNodes()) {
                if (node._targetId === targetId) {
                    return node;
                }
                if (node.value instanceof SourceBag) {
                    queue.push(node.value);
                }
            }
        }
        throw new Error(`target_id not found: ${targetId}`);
    }

    /** Per-document serial bridging a source node to its DOM element. */
    targetId(node) {
        if (node._targetId) {
            return node._targetId;
        }
        if (node.handler === null || node.handler === undefined) {
            return null;
        }
        const root = node.rootBuilder;
        root._targetSerial += 1;
        node._targetId = `n${root._targetSerial}`;
        return node._targetId;
    }

    /** Shortcut for `this.data.setItem(path, value)`. */
    setData(path, value) {
        this.data.setItem(path, value);
    }

    // --- source reactivity (structure) -------------------------------

    /** True when mounted on a handler that has an application. */
    get _isReactive() {
        return Boolean(this.handler && this.handler.application);
    }

    /** Dispatcher for events on this builder's `_sourceroot`.
     *  Keeps the pointer_map coherent (mapkeep), then queues the touched
     *  path + kind: ins/del address the CHILD (insert/remove), upd the
     *  node itself (replace). */
    _onSourceEvent(node, evt, pathlist, kw = {}) {
        if (this._disposed) return;
        if (evt === 'ins') this._defaults.initializeNode(node);
        if (evt === 'del') {
            this.handler._unregisterPointer(node);
        } else if (evt !== 'ins') {
            const detail = evt.startsWith('upd_') ? evt.slice(4) : evt;
            if (detail === 'value' || detail === 'value_attr') {
                this._onUpdValue(node, kw.oldvalue);
            }
            if (detail === 'attrs' || detail === 'value_attr') {
                this._onUpdAttrs(node, kw.attrs_diff || {});
            }
        }
        // Queue key = mount name; drop the leading SOURCE_ROOT segment.
        const path = pathlist.slice(1).join('.');
        if ((evt === 'ins' || evt === 'del') && !node._getMeta('component')) {
            const childPath = path ? `${path}.${node.label}` : node.label;
            if (evt === 'del') {
                this.handler.recordRemovedId(this.name, childPath, node._targetId || null);
            }
            this.handler.addRenderPath(this.name, childPath, evt);
        } else {
            this.handler.addRenderPath(this.name, path, 'upd');
        }
    }

    _valueNature(v) {
        if (v instanceof SourceBag) {
            return 'bag';
        }
        if (typeof v === 'string' && v.startsWith('^')) {
            return 'pointer';
        }
        return 'scalar';
    }

    /** De-register the old value's pointers across an upd_value event. */
    _onUpdValue(node, oldvalue) {
        const oldKind = this._valueNature(oldvalue);
        if (oldKind === 'pointer') {
            this.handler._updatePointerMap(node, [['', oldvalue]]);
        } else if (oldKind === 'bag') {
            for (const oldChild of oldvalue.getNodes()) {
                this.handler._unregisterPointer(oldChild);
            }
        }
    }

    /** De-register old attr-pointers across an upd_attrs event. */
    _onUpdAttrs(node, attrsDiff) {
        for (const [attrname, change] of Object.entries(attrsDiff)) {
            const oldV = change.old;
            if (typeof oldV === 'string' && oldV.startsWith('^')) {
                this.handler._updatePointerMap(node, [[attrname, oldV]]);
            }
        }
    }

    // --- lifecycle ---------------------------------------------------

    // --- data-element logic ------------------------------------------

    /** Sources searched (left-to-right) to resolve a data-element func.
     *  Default `[this]`; override `_buildDataLogic` to add more. */
    get dataLogic() {
        if (!this._dataLogic) {
            const built = this._buildDataLogic();
            this._dataLogic = Array.isArray(built) ? built : [built];
        }
        return this._dataLogic;
    }

    _buildDataLogic() { return this; }

    /** Resolve a data-element `func`, which may be:
     *  - a function (a callable passed directly);
     *  - a bare-identifier string → a NAME, resolved as a static method
     *    over the data_logic sources (left-to-right, first wins); a source
     *    is the builder instance (its class holds the funcs) or a dedicated
     *    business-logic class;
     *  - any other string → a JS code string, compiled to a function. */
    _resolveLogicFunc(func) {
        if (typeof func === 'function') {
            return func;
        }
        if (typeof func !== 'string') {
            throw new Error('data-element func must be a name, a function, or a JS code string');
        }
        if (!IDENTIFIER_RE.test(func)) {
            return compileFunc(func);
        }
        for (const source of this.dataLogic) {
            const holder = typeof source === 'function' ? source : source.constructor;
            const fn = holder[func];
            if (typeof fn === 'function') {
                return fn;
            }
        }
        throw new Error(`data-element func '${func}' not found on any data_logic source`);
    }

    /** A data-element node's func bindings: runtimeValues (which resolves
     *  `^`/`=` AND registers the `^` readers → the formula recomputes when
     *  an input changes) minus the element's own schema fields. */
    _bindings(node) {
        const [, resolved] = this.runtimeValues(node);
        const out = {};
        for (const [k, v] of Object.entries(resolved)) {
            if (!DATA_ELEMENT_FIELDS.has(k)) {
                out[k] = v;
            }
        }
        return out;
    }

    /** Resolve the public logic attribute, rejecting the removed formula alias. */
    _resolveNodeLogic(node) {
        const attr = node.getAttr() || {};
        if (node.nodeTag === 'dataFormula') {
            if (Object.hasOwn(attr, 'func')) {
                throw new Error('dataFormula requires formula; func is not supported');
            }
            if (!Object.hasOwn(attr, 'formula')) {
                throw new Error('dataFormula requires formula');
            }
            return this._resolveLogicFunc(attr.formula);
        }
        return this._resolveLogicFunc(attr.func);
    }

    /** Execute a list of data-element nodes. */
    computeLogic(nodes) {
        for (const node of nodes) {
            this._computeNode(node);
        }
    }

    /** Execute one data-element by kind: setter seeds, formula computes
     *  (pure), controller runs side effects (func gets the node). */
    _computeNode(node) {
        if (this._disposed) return;
        const attr = node.getAttr() || {};
        if (node.nodeTag === 'dataSetter') {
            const attrs = {};
            for (const [k, v] of Object.entries(attr)) {
                if (k !== 'destination' && k !== 'value' && !k.startsWith('_')) {
                    attrs[k] = v;
                }
            }
            node.setRelativeData(attr.destination, attr.value, {
                attributes: Object.keys(attrs).length ? attrs : null,
            });
        } else if (node.nodeTag === 'dataFormula') {
            const func = this._resolveNodeLogic(node);
            node.setRelativeData(attr.destination, func(this._bindings(node)));
        } else if (node.nodeTag === 'dataController') {
            const func = this._resolveNodeLogic(node);
            func(node, this._bindings(node));
        }
    }

    /** Source data-elements to run at create(): every setter + anything
     *  flagged `_on_start`, in document order. */
    _onStartDataElements() {
        const result = [];
        const walk = (bag) => {
            for (const node of bag.getNodes()) {
                if (node._getMeta('data_element')
                    && (node.nodeTag === 'dataSetter' || node.getAttr('_on_start'))) {
                    result.push(node);
                }
                if (node.value instanceof SourceBag) {
                    walk(node.value);
                }
            }
        };
        walk(this.source);
        return result;
    }

    // --- lifecycle ---------------------------------------------------

    setup(_data) {}

    main(_root) {
        throw new Error(
            `${this.constructor.name}.main() not implemented: a bare builder `
            + 'is grammar, not a renderable page',
        );
    }

    /** Declare web-component collections this builder needs. Static
     *  `wc_requires = [...]` (A) is seeded in create(); `wcRequires()` in
     *  setup() (B) adds to it. Both resolve before main(). */
    wcRequires(...names) {
        if (!this._requiredCollections) {
            this._requiredCollections = new Set(this.constructor.wc_requires || []);
        }
        for (const name of names) {
            this._requiredCollections.add(name);
        }
    }

    /** Add the @components declared via `static components = [...]` to the
     *  schema, marked `_meta.component`; the body stays a method on the
     *  page (run at render time by the renderer's expansion). */
    _resolveComponents() {
        const names = this.constructor.components;
        if (!Array.isArray(names) || !names.length) {
            return;
        }
        const merged = { ...this.schema };
        for (const name of names) {
            merged[name] = { sub_tags: '', _meta: { component: true } };
        }
        this.constructor._classSchema = merged;
        this.constructor._tagNames = null;
    }

    /** Fresh throw-away root for a component expansion (CMP.2): a payload
     *  under SOURCE_ROOT inside a wrapper; `datapath` (the expansion's data
     *  anchor) is stamped on the structural node so the body's relative
     *  pointers find it through the ancestor climb. Built, rendered, dropped. */
    _expansionRoot(datapath = null) {
        const wrapper = new SourceBag(null, this, null);
        wrapper.setBackref();   // before insert, so SOURCE_ROOT inherits it
        wrapper.setItem(SOURCE_ROOT, new SourceBag(null, this, null),
            datapath ? { datapath } : null);
        return wrapper.getItem(SOURCE_ROOT);
    }

    /** Fold the required collections' grammar into an own per-page schema
     *  (additive over the inherited one) and define their custom elements. */
    _resolveCollections() {
        if (!this._requiredCollections || this._requiredCollections.size === 0) {
            return;
        }
        const merged = { ...this.schema };
        for (const name of this._requiredCollections) {
            const coll = getCollection(name);
            if (!coll) {
                throw new Error(`unknown wc collection: '${name}'`);
            }
            Object.assign(merged, coll.grammar.elements || coll.grammar);
            coll.defineComponents();
            injectCollectionCss(name, coll.css);
        }
        this.constructor._classSchema = merged;
        this.constructor._tagNames = null;
    }

    /** Load a TYTX recipe (or decoded Bag) before mounting this builder.
     * Runtime ownership is reconstructed here; it is never part of the wire.
     * Native JS pages still author their source in main(). Imported recipes
     * use the same create/activation and subsequent mutation pipeline.
     */
    loadSource(source) {
        if (this.handler) {
            throw new Error('loadSource must run before mounting the builder');
        }
        const decoded = source instanceof Bag ? source : Bag.fromTytx(source);
        this._importedSource = decoded;
    }

    _copyImportedSource(source, destination, legacy = !(source instanceof SourceBag)) {
        for (const original of source.getNodes()) {
            const tag = original.nodeTag;
            if (!tag || !this.schema[tag]) {
                throw new Error(`unsupported imported source tag: ${tag}`);
            }
            if (original.resolver) {
                throw new Error('imported source resolvers are not supported yet');
            }
            const originalValue = original.getValue(true);
            const sourceBranch = originalValue instanceof SourceBag
                || (legacy && originalValue instanceof Bag);
            const value = sourceBranch
                ? new SourceBag(null, this, this.handler) : originalValue;
            const attrs = {...original.getAttr()};
            attrs._meta = {...this.schema[tag]._meta, ...attrs._meta};
            const node = destination.setItem(original.label, value, attrs);
            node.nodeTag = tag;
            node.xmlTag = original.xmlTag;
            node._builder = this;
            if (sourceBranch) {
                this._copyImportedSource(originalValue, value, legacy);
            }
        }
    }

    /** setup → resolve collections → main → (if reactive) arm reactivity. */
    create() {
        this._requiredCollections = new Set(this.constructor.wc_requires || []);
        this.setup(this.data);
        this._resolveCollections();
        this._resolveComponents();
        if (this._importedSource) {
            this._copyImportedSource(this._importedSource, this.source);
            this._importedSource = null;
        } else {
            this.main(wrapSource(this.source));
        }
        this._defaults.initializeBag(this.source);
        // First calculation: run every setter + the _on_start formulas/controllers.
        this.computeLogic(this._onStartDataElements());
        if (this._isReactive) {
            this._sourceroot.subscribe('builder_source', {
                insert: (e) => this._onSourceEvent(e.node, e.evt, e.pathlist, e),
                update: (e) => this._onSourceEvent(e.node, e.evt, e.pathlist, e),
                delete: (e) => this._onSourceEvent(e.node, e.evt, e.pathlist, e),
            });
        }
    }

    /** Detach the source observer without destroying the retained recipe. */
    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this._sourceroot.unsubscribe('builder_source', {any: true});
    }

    _renderer() {
        const mode = this.constructor._defaultRenderMode;
        return this[`renderer_${mode}`];
    }

    setRenderTarget(target) {
        this.target = target;
    }

    /** Full render: renderer walks `source`, finalize delivers to target. */
    render(opts = {}) {
        if (this._disposed) return;
        const renderer = this._renderer();
        renderer.handler = this.handler;
        const target = 'target' in opts ? (opts.target || null) : this.target;
        const o = { ...(target && target.renderOpts), ...opts };
        delete o.target;
        const source = renderer.preprocess(this.source);
        const result = renderer.renderChildren(source, o);
        return renderer.finalize(result, target, o);
    }

    /** Turn a live batch (optimized entries) into per-node patches. */
    renderNodes(entries, target = null, opts = {}) {
        if (this._disposed) return;
        const renderer = this._renderer();
        renderer.handler = this.handler;
        const effTarget = target || this.target;
        if (!(effTarget && effTarget.acceptsPartial)) {
            return this.render(opts);
        }
        const o = { ...effTarget.renderOpts, ...opts };

        // Build the plan: [op, path, node, label, field]. node is null for
        // remove; label rides the row/cell ops, field only the cells.
        const plan = [];
        for (const { kind, path, label, field } of entries) {
            if (kind === 'del') {
                plan.push(['remove', path, null, null, null]);
                continue;
            }
            let node = this.source.getNode(path);
            if (node === null || node === undefined) {
                throw new Error(`queued render path ${path} is no longer in the source`);
            }
            if (kind === 'cell_upd') {
                plan.push(['cell', path, node, label, field]);
                continue;
            }
            if (kind === 'row_upd') {
                plan.push(['row_replace', path, node, label, null]);
                continue;
            }
            if (kind === 'row_ins') {
                plan.push(['row_insert', path, node, label, null]);
                continue;
            }
            if (kind === 'row_del') {
                plan.push(['row_remove', path, node, label, null]);
                continue;
            }
            if (kind === 'ins') {
                plan.push(['insert', path, node, null, null]);
                continue;
            }
            if (node._getMeta('component')) {
                // An iterate component renders as N sibling blocks with no
                // bounding element: its whole-replacement unit is the
                // enclosing element (a real DOM node). At the source root
                // there is none — the whole document is the unit.
                const parent = node.parentBag.parentNode;
                const parentPath = parent !== null && parent !== undefined
                    ? this.source.relativePath(parent) : null;
                if (!parentPath) {
                    return this.render(opts);
                }
                node = parent;
                plan.push(['replace', parentPath, node, null, null]);
                continue;
            }
            plan.push(['replace', path, node, null, null]);
        }

        // Dedup + ancestor-cover: a replace at P covers ANY op under it (the
        // component's rows and cells included), the replace itself excluded.
        const seen = new Set();
        const deduped = [];
        for (const entry of plan) {
            const [op, path, , label, field] = entry;
            const key = `${op}|${path}|${label}|${field}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            deduped.push(entry);
        }
        const replacePaths = new Set(
            deduped.filter(([op]) => op === 'replace').map(([, p]) => p),
        );
        const rowOps = new Set(['cell', 'row_replace', 'row_insert', 'row_remove']);
        const covered = deduped.filter(([op, path]) => !(
            [...replacePaths].some((other) => other !== path && path.startsWith(`${other}.`))
            || (rowOps.has(op) && replacePaths.has(path))
        ));

        const patches = [];
        for (let position = 0; position < covered.length; position += 1) {
            const [op, path, node, label, field] = covered[position];
            if (op === 'cell') {
                // Value-only patch: no body, no render, no re-registration.
                const base = node.getAttr('id') || this.targetId(node);
                const specs = (this._cellMap[base] || {})[field];
                if (!specs) {
                    // A cell the catalog does not know (templates, checked,
                    // richer cells): fall back to the row replace.
                    const fragment = renderer.renderExpansionBlock(node, label, o);
                    patches.push({ id: `${base}.${label}.1`, op: 'replace', node: fragment });
                    continue;
                }
                const anchorAbs = node.absDatapath(node.getAttr('iterate'));
                const dataNode = this.handler.data.getNode(`${anchorAbs}.${label}.${field}`);
                const value = dataNode ? dataNode.value : null;
                // DIFF-PYTHON: _present_value / mask is a later slice — raw value.
                const text = value === null || value === undefined ? '' : String(value);
                for (const [ordinal, cellKind, attrName] of specs) {
                    const cellId = `${base}.${label}.${ordinal}`;
                    if (cellKind === 'text') {
                        patches.push({ id: cellId, op: 'text', value: text });
                    } else {
                        patches.push({ id: cellId, op: 'attr', name: attrName, value: text });
                    }
                }
                continue;
            }
            if (op === 'row_remove') {
                // Derived identity needs no capture at the delete event: the
                // address is arithmetic. The dead row's writeback entries die
                // here (no re-expansion will purge them).
                const base = node.getAttr('id') || this.targetId(node);
                patches.push({ id: `${base}.${label}.1`, op: 'remove' });
                this._purgeWritebackPrefix(`${base}.${label}`);
                continue;
            }
            if (op === 'row_replace' || op === 'row_insert') {
                const base = node.getAttr('id') || this.targetId(node);
                const fragment = renderer.renderExpansionBlock(node, label, o);
                if (op === 'row_replace') {
                    patches.push({ id: `${base}.${label}.1`, op: 'replace', node: fragment });
                    continue;
                }
                const [before, fallback] = this._rowInsertAnchor(node, base, label);
                const container = node.parentBag.parentNode;
                if (fallback) {
                    // No anchorable element after the block (a component
                    // sibling follows): the container replace is the unit.
                    if (container === null || container === undefined) {
                        return this.render(opts);
                    }
                    const whole = renderer.render(container, o);
                    patches.push({ id: this.targetId(container), op: 'replace', node: whole });
                    continue;
                }
                const containerId = container !== null && container !== undefined
                    ? this.targetId(container) : null;
                patches.push({ id: containerId, op: 'insert', before, node: fragment });
                continue;
            }
            if (op === 'remove') {
                const targetId = this.handler.removedTargetId(this.name, path);
                if (targetId === null || targetId === undefined) {
                    continue;   // never rendered with identity: nothing in the DOM
                }
                patches.push({ id: targetId, op: 'remove' });
                continue;
            }
            if (op === 'insert') {
                const pending = new Set(
                    covered.slice(position + 1).filter(([o]) => o === 'insert').map(([, p]) => p),
                );
                const [before] = this._insertAnchor(node, pending);
                const fragment = renderer.render(node, o);
                if (fragment === null) {
                    continue;
                }
                const container = node.parentBag.parentNode;
                const containerId = path.includes('.') ? this.targetId(container) : null;
                patches.push({ id: containerId, op: 'insert', before, node: fragment });
                continue;
            }
            const fragment = renderer.render(node, o);
            if (fragment === null) {
                continue;
            }
            patches.push({ id: this.targetId(node), op: 'replace', node: fragment });
        }
        effTarget.partial(patches);
        return null;
    }

    /** Anchor for an insert: [beforeId, componentSibling]. beforeId is the
     *  target_id of the first following sibling present when the patch
     *  applies; null = append. */
    _insertAnchor(node, pending) {
        const siblings = node.parentBag.getNodes();
        const index = siblings.indexOf(node);
        for (const sib of siblings.slice(index + 1)) {
            if (sib._getMeta('data_element')) {
                continue;
            }
            if (sib._getMeta('component')) {
                return [null, true];
            }
            if (pending.has(this.source.relativePath(sib))) {
                continue;
            }
            return [this.targetId(sib), false];
        }
        return [null, false];
    }

    /** Anchor for a row-insert patch: [beforeId, fallback]. The new row
     *  lands before the block of the row that FOLLOWS it in the
     *  collection's bag order (derived id, pure arithmetic). After the LAST
     *  row the anchor is the first renderable source sibling following the
     *  component; a component sibling has no anchorable id — `fallback`
     *  tells the caller to replace the container instead. before=null
     *  appends at the end. */
    _rowInsertAnchor(compNode, base, label) {
        const anchorAbs = compNode.absDatapath(compNode.getAttr('iterate'));
        const collection = this.handler.data.getItem(anchorAbs);
        const labels = collection.keys();
        const index = labels.indexOf(label);
        if (index + 1 < labels.length) {
            return [`${base}.${labels[index + 1]}.1`, false];
        }
        return this._insertAnchor(compNode, new Set());
    }

    // --- expansion write-back index (CMP.7) --------------------------

    /** Register a writable expansion node under its row prefix. Two
     *  structures, one truth: the flat `_writebackMap` answers the mutate
     *  (composite id → node), the segment-tree `_writebackIndex` lets the
     *  purge pay for its OWN subtree only, never a scan of the whole map. */
    _writebackAdd(prefix, key, node) {
        this._writebackMap[key] = node;
        let index = this._writebackIndex;
        for (const segment of prefix.split('.')) {
            if (!index[segment]) {
                index[segment] = {};
            }
            index = index[segment];
        }
        if (!index[WB_KEYS]) {
            index[WB_KEYS] = new Set();
        }
        index[WB_KEYS].add(key);
    }

    /** Drop a prefix's derived ids from the writeback map — indexed.
     *  Re-expansion purges its own prefix before re-registering; a removed
     *  row (never re-expands) is purged at patch time. The segment tree
     *  pops the prefix's subtree (nested rows included) and deletes exactly
     *  those keys: O(own entries). */
    _purgeWritebackPrefix(prefix) {
        const wmap = this._writebackMap;
        const index = this._writebackIndex;
        if (!wmap || !index) {
            return;
        }
        const segments = prefix.split('.');
        let parent = index;
        for (const segment of segments.slice(0, -1)) {
            parent = parent[segment];
            if (parent === undefined) {
                return;
            }
        }
        const last = segments[segments.length - 1];
        const subtree = parent[last];
        if (subtree === undefined) {
            return;
        }
        delete parent[last];
        const stack = [subtree];
        while (stack.length) {
            const level = stack.pop();
            for (const key of Reflect.ownKeys(level)) {
                if (key === WB_KEYS) {
                    for (const k of level[key]) {
                        delete wmap[k];
                    }
                } else {
                    stack.push(level[key]);
                }
            }
        }
    }
}
