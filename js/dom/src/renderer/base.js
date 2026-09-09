// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * RendererBase — JS port of renderer/base.py.
 *
 * The universal walk: `render(node)` resolves the node's runtime values,
 * dispatches to the renderer of the node's own dialect (`getRender`),
 * resolves the tag/attrs (`_handleMeta` + `adaptAttrs`), recurses into
 * children (`renderChildren`), and hands off to the dialect hook
 * `renderedItem`. `finalize` delivers the result to the target.
 *
 * DIFF-PYTHON: the Python renderer emits markup STRINGS; this one emits
 * DOM nodes. So `renderedItem` returns an `Element`, `renderChildren`
 * returns an array of `Element`, and `finalize` composes them into a
 * `DocumentFragment` for `target.full`. The walk architecture is
 * identical — only the output type of `renderedItem` differs (the
 * "compose_children" universal-renderer decision: append, not join).
 *
 * Not-yet-ported branches (later slices) raise or are skipped
 * explicitly: components, sub-builders, cardinality validation.
 */
import { Bag } from 'genro-bag-js';
import { SourceBag, wrapSource } from '../source-bag.js';

export class RendererBase {
    constructor(builder, handler = null) {
        this._builder = builder;
        this.handler = handler;
        // "renderer instance for builder X" cache (keyed by the builder
        // object). The renderer registers itself for its own builder.
        this.renders = new Map([[builder, this]]);
        this.incomplete = [];
    }

    get builder() {
        return this._builder;
    }

    /** Seed the cache with a renderer for `builder`. */
    addRender(builder, renderer) {
        this.renders.set(builder, renderer);
    }

    /** Return the renderer responsible for nodes of `builder`. */
    getRender(builder) {
        const rn = this.renders.get(builder);
        if (rn !== undefined) {
            return rn;
        }
        const subMode = builder.constructor._defaultRenderMode;
        const prop = builder[`renderer_${subMode}`];
        if (prop === undefined) {
            throw new Error(
                `${builder.constructor.name} does not expose a `
                + `'renderer_${subMode}' property`,
            );
        }
        prop.handler = this.handler;
        this.renders.set(builder, prop);
        return prop;
    }

    /** Walk a node and produce its rendered fragment (a DOM node here). */
    render(node, opts = {}) {
        let [item, ra] = node.builder.runtimeValues(node);
        if (node._getMeta('data_element')) {
            return null;   // transparent: the walk never emits, absence is null
        }
        if (node._getMeta('component')) {
            return this._renderComponent(node, ra, opts);
        }
        // sub-builder / cardinality validation: later slices.
        const renderer = this.getRender(node.builder);
        let tag;
        [tag, ra] = renderer._handleMeta(node, ra);
        if (!node._getMeta('subbuilder')) {
            ra = renderer.adaptAttrs(ra);
        }
        if (node.value instanceof SourceBag) {
            item = this.renderChildren(node.value, opts);
        }
        return renderer.renderedItem(node, item, ra, { tag, ...opts });
    }

    /** Render each child and collect the fragments (drop transparent nulls). */
    renderChildren(nodes, opts = {}) {
        const fragments = [];
        for (const child of nodes.getNodes()) {
            const frag = this.render(child, opts);
            if (frag === null) {
                continue;
            }
            if (Array.isArray(frag)) {
                fragments.push(...frag);   // iterate component: N blocks
            } else {
                fragments.push(frag);
            }
        }
        return fragments;
    }

    // --- @component expansion (render-time) --------------------------

    /** Expand a component node and render the expansion in its place.
     *  The body (kept on the builder) receives a fresh throw-away root and
     *  builds exactly ONE tree. Three forms: params (one block), `store`
     *  (one block anchored to a record), `iterate` (N blocks, one per
     *  child of the collection). */
    _renderComponent(node, runtimeAttrs, opts) {
        const [body, iterable, anchor, bodyKwargs] = this._expansionInputs(node, runtimeAttrs);
        if (node.getAttr('iterate') == null) {
            return this._expandBlock(node, body, anchor, bodyKwargs, [], opts);
        }
        if (iterable == null) {
            return [];   // empty collection → zero blocks (data-driven stop)
        }
        if (!(iterable instanceof Bag)) {
            throw new Error(
                `component '${node.nodeTag}': iterate must resolve to a Bag`,
            );
        }
        // one expansion per child, each getting only the child's label.
        return iterable.getNodes().map(
            (child) => this._expandBlock(
                node, body, anchor, { node_label: child.label }, [child.label], opts,
            ),
        );
    }

    /** The expansion prep: (body, iterable, anchor, bodyKwargs). Reads the
     *  data anchors RAW (store/iterate), drops the machinery kwargs, and
     *  passes reactive-pointer kwargs THROUGH as absolutized pointers
     *  (CMP.4: the address must reach the node the body builds). */
    _expansionInputs(node, runtimeAttrs) {
        const builder = node.builder;
        const body = builder[node.nodeTag];
        const iterable = runtimeAttrs.iterate;
        delete runtimeAttrs.iterate;
        delete runtimeAttrs.store;
        delete runtimeAttrs.id;
        delete runtimeAttrs.lazy;
        let anchor = node.getAttr('iterate') || node.getAttr('store');
        if (anchor != null) {
            if (node.pointerType(anchor)) {
                anchor = anchor.slice(1);
            }
            if (anchor.startsWith('.')) {
                anchor = node._composeRelativeDatapath(anchor, anchor);
            }
        } else {
            anchor = null;
        }
        for (const name of Object.keys(runtimeAttrs)) {
            const raw = node.getAttr(name);
            if (node.pointerType(raw) === '^') {
                const abs = node.absDatapath(raw);
                const dot = abs.indexOf('.');
                const volume = dot === -1 ? abs : abs.slice(0, dot);
                const rest = dot === -1 ? '' : abs.slice(dot + 1);
                runtimeAttrs[name] = `^${volume}:${rest}`;
            }
        }
        return [body, iterable, anchor, runtimeAttrs];
    }

    /** ONE expansion: throw-away root, body call, single-tree check,
     *  derived identity (reactive render only), rendered fragment. A forest
     *  (≠1 root) raises. */
    _expandBlock(node, body, anchor, bodyKwargs, wbLabels, opts) {
        const root = node.builder._expansionRoot(anchor);
        body.call(node.builder, wrapSource(root), bodyKwargs);
        const roots = root.getNodes();
        if (roots.length !== 1) {
            throw new Error(
                `component '${node.nodeTag}' must build a tree, not a forest: `
                + `${roots.length} root nodes`,
            );
        }
        if (opts.includeDatapath) {
            // Derived identity is a REACTIVE-render concern, like the
            // auto-id: the static render stays untouched.
            this._registerExpansionWriteback(node, roots[0], wbLabels);
        }
        return this.render(roots[0], opts);
    }

    /** Render ONE expansion block of a component node — the per-row patch
     *  unit (CMP.7). `label` addresses the row of an iterate component
     *  (null = the single store-anchored block). Same prep, same body, same
     *  registration as the walk: the fragment cannot diverge from a full
     *  render. */
    renderExpansionBlock(node, label = null, opts = {}) {
        const [, runtimeAttrs] = node.builder.runtimeValues(node);
        const [body, , anchor, bodyKwargs] = this._expansionInputs(node, runtimeAttrs);
        let kwargs = bodyKwargs;
        let wbLabels = [];
        if (label !== null) {
            kwargs = { node_label: label };
            wbLabels = [label];
        }
        return this._expandBlock(node, body, anchor, kwargs, wbLabels, opts);
    }

    /** Derived identity for expansion nodes — the virtual-children map,
     *  write-back side (CMP.7). Expansion nodes never get a serial of their
     *  own (they reincarnate); their identity is DERIVED and deterministic:
     *  `<base>[.<label>...].<ordinal>` — base is the component node's id,
     *  labels the row identities crossed, the ordinal the body's build order.
     *  The composite id is stamped as the author-id (the renderer emits it,
     *  the auto-id skips), and the WRITABLE nodes land in the writeback map.
     *  Re-expansion purges its own prefix first, so the map holds no stale
     *  rows. Cataloged data-elements (row rules) are the component-rules
     *  slice; here they are only collected, never rendered. */
    _registerExpansionWriteback(compNode, treeRoot, labels) {
        const builder = compNode.builder;
        const base = compNode.getAttr('id') || builder.targetId(compNode);
        if (base === null || base === undefined) {
            return;
        }
        const prefix = [String(base), ...labels].join('.');
        builder._purgeWritebackPrefix(prefix);
        const handler = builder.handler;
        // The cell catalog rebuilds per expansion and is identical for every
        // row (the body is code): reset, the last row wins.
        if (labels.length === 1) {
            builder._cellMap[base] = {};
        }
        const ruleNodes = [];
        let counter = 0;
        const queue = [treeRoot];
        while (queue.length) {
            const current = queue.shift();
            if (current._getMeta('data_element')) {
                // Row logic: cataloged, never rendered. Seeding is a
                // render-time write — forbidden inside a pure projection.
                if (current.nodeTag === 'dataSetter') {
                    throw new Error(
                        'dataSetter inside an expansion body: seeding is a '
                        + 'render-time write, expansions are pure projections',
                    );
                }
                if (current.getAttr('_on_start')) {
                    throw new Error(
                        '_on_start inside an expansion body: row logic is '
                        + 'mutation-only (loaded data is trusted)',
                    );
                }
                if (handler) {
                    ruleNodes.push(current);
                }
                continue;
            }
            counter += 1;
            const composite = `${prefix}.${counter}`;
            current.setAttr({ id: composite }, false);
            // Only WRITE-BACK nodes enter the map: a pointer on a writable
            // attribute (value/checked). A pure reader re-renders via the
            // pointer_map, it is not a mutation target.
            const writable = current.pointers().some(
                ([name]) => name === 'value' || name === 'checked',
            );
            if (writable) {
                builder._writebackAdd(prefix, composite, current);
            }
            this._registerCell(compNode, current, labels, counter);
            if (current.value instanceof SourceBag) {
                queue.push(...current.value.getNodes());
            }
        }
        // Register the row logic as TEMPLATES (per component): the body is
        // code, so one spec per rule runs on ANY row (CMP.7).
        if (handler) {
            const rawAnchor = compNode.getAttr('iterate') || compNode.getAttr('store');
            const anchorAbs = rawAnchor ? compNode.absDatapath(rawAnchor) : null;
            const rowPrefix = labels.length
                ? `${anchorAbs}.${labels[labels.length - 1]}` : anchorAbs;
            handler.setComponentRules(
                String(base), anchorAbs,
                Boolean(rawAnchor) && labels.length === 0,
                ruleNodes, rowPrefix,
            );
        }
    }

    /** Catalog a patchable CELL: in-row field → (ordinal, op). The body is
     *  code, so the ordinal of "who shows `.field`" is the SAME for every
     *  row: the catalog is per COMPONENT, built once. Two shapes qualify —
     *  a node whose VALUE is one reactive pointer (a text cell) and a
     *  reactive `value` attribute (an input). The field key is the pointer's
     *  residual against the ROW path; a pointer landing outside the row (a
     *  shared header datum) is not a cell. Richer cells (templates, checked)
     *  stay out: those rows fall back to the row replace. */
    _registerCell(compNode, current, labels, ordinal) {
        if (labels.length !== 1) {
            return;
        }
        const builder = compNode.builder;
        const base = compNode.getAttr('id') || builder.targetId(compNode);
        const specs = builder._cellMap[base] || (builder._cellMap[base] = {});
        const anchor = compNode.absDatapath(compNode.getAttr('iterate'));
        const rowPrefix = `${anchor}.${labels[0]}.`;
        const inRowField = (pointer) => {
            const absPath = current.absDatapath(pointer);
            if (!absPath.startsWith(rowPrefix)) {
                return null;
            }
            return absPath.slice(rowPrefix.length);
        };
        const val = current.value;
        if (typeof val === 'string' && current.pointerType(val) === '^') {
            const field = inRowField(val);
            if (field !== null) {
                (specs[field] || (specs[field] = [])).push([ordinal, 'text', null]);
            }
        }
        const rawValue = current.getAttr('value');
        if (typeof rawValue === 'string' && current.pointerType(rawValue) === '^') {
            const field = inRowField(rawValue);
            if (field !== null) {
                (specs[field] || (specs[field] = [])).push([ordinal, 'attr', 'value']);
            }
        }
    }

    /** Normalize the source before the top-level walk. Identity by default. */
    preprocess(source) {
        return source;
    }

    /** Dialect-specific fragment for `node`. Concrete renderers override. */
    renderedItem(_node, _item, _runtimeAttrs, _opts) {
        throw new Error(`${this.constructor.name} does not implement renderedItem`);
    }

    /** Resolve render_tag / render_attributes / ns into a ready tag+attrs. */
    _handleMeta(node, runtimeAttrs) {
        const [renderTag, renderAttributes] = node._getMeta('render_tag,render_attributes');
        let tag = renderTag || node.nodeTag;
        if (tag && tag.endsWith('_')) {
            tag = tag.slice(0, -1);
        }
        if (!tag) {
            throw new Error(
                `node ${node.label} has no tag to render (no render_tag, no node_tag)`,
            );
        }
        const ns = node.getAttr('ns');
        if (ns && !renderTag) {
            const dialectPrefix = `${node.builder.constructor._name}_`;
            if (tag.startsWith(dialectPrefix)) {
                tag = tag.slice(dialectPrefix.length);
            }
            tag = `${ns}:${tag}`;
        }
        if (renderAttributes) {
            runtimeAttrs = { ...runtimeAttrs, ...renderAttributes };
        }
        return [tag, runtimeAttrs];
    }

    /** Dialect adaptation of the attribute dict. Identity by default. */
    adaptAttrs(attrs) {
        return attrs;
    }

    /** Strip this dialect's own `<name>_` prefix from `what`. */
    adapt(what) {
        const prefix = `${this.builder.constructor._name}_`;
        return what.startsWith(prefix) ? what.slice(prefix.length) : what;
    }

    /** Compose the walk result and deliver it to the target.
     *  DIFF-PYTHON: string join → DocumentFragment append. */
    finalize(result, target, _opts = {}) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
            if (node !== null && node !== undefined) {
                fragment.appendChild(node);
            }
        }
        if (target === null || target === undefined) {
            return fragment;
        }
        target.full(fragment);
        return null;
    }
}
