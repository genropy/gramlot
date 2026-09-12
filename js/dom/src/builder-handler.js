// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * BuilderHandler — JS port of builder/data_handler.py (reactive).
 *
 * Mounts builders, owns the segmented datastore `_dataroot`
 * (`{_: shared, <name>: ...}`) and drives create/render.
 *
 * Reactivity has two sources of events:
 * - DATA: `activate` subscribes `_onDataEvent` to `_dataroot`; a data
 *   change → `_relevantNodes` (pointer_map lookup) → `addRenderPath`.
 * - STRUCTURE: each builder subscribes its own `_sourceroot` (in
 *   `create`) to `_onSourceEvent`, which does mapkeep and calls
 *   `addRenderPath` with kind ins/del/upd.
 * The outermost `live()` exit runs `_optimizeRender` (netting +
 *  ancestor-cover + density coalescing) then flushes each touched
 *  builder via `renderNodes`.
 *
 * Row logic of the expansions is here too (CMP.7): `setComponentRules`
 * compiles the per-row data-elements into TEMPLATES, `_runComponentRules`
 * dispatches them by coordinates in the cascade. Not-yet-ported: lazy
 * iterate.
 */
import { Bag } from 'genro-bag-js';

import { META_ATTRS } from './source-bag.js';
import { DATA_ELEMENT_FIELDS } from './builder-base.js';

/** A formula re-queued more than this many times in one flush is a
 *  livelock (a → b → a): the drain raises, naming the func. */
const FORMULA_REQUEUE_LIMIT = 50;

/** The `node` a row-rule controller receives. Template rules execute
 *  against ANY row, so the controller cannot get a retained source node
 *  (its relative paths would resolve against the registration row). This
 *  context carries the reactive vocabulary bound to the EVENT's row
 *  coordinates: `.x`/`?a` resolve on the row, plain paths on the segment. */
class RowContext {
    constructor(data, segment, rowPath, builder = null) {
        this._data = data;
        this._segment = segment;
        this._rowPath = rowPath;
        this._builder = builder;
    }

    get builder() {
        return this._builder;
    }

    _abs(path) {
        if (path.startsWith('.') || path.startsWith('?')) {
            if (this._rowPath === null || this._rowPath === undefined) {
                throw new Error(`row-relative path ${path} in a rule with no row`);
            }
            return this._rowPath + path;
        }
        return `${this._segment}.${path}`;
    }

    // setItem(path, value, attr, nodePosition, updattr, removeNullAttributes,
    // reason, fired): SET/FIRE carry reason=true, PUT reason=false.
    GET(path) { return this._data.getItem(this._abs(path)); }

    SET(path, value) { this._data.setItem(this._abs(path), value, null, '>', false, true, true, false); }

    PUT(path, value) { this._data.setItem(this._abs(path), value, null, '>', false, true, false, false); }

    FIRE(path, value = true) { this._data.setItem(this._abs(path), value, null, '>', false, true, true, true); }
}

/** Above this many touched rows of ONE component in a single flush, the
 *  per-row patches coalesce into the enclosing-container replace (the
 *  structural flood case). Cell patches never coalesce: value-only ops
 *  are what a shared-binding broadcast wants to ship. */
const ROW_COALESCE_LIMIT = 50;

/** Above this many touched CELLS of one row in a single flush, the cell
 *  patches collapse into that row's replace (one fragment beats
 *  re-reading and shipping most of the row field by field). */
const CELLS_PER_ROW_LIMIT = 4;

export class BuilderHandler {
    constructor(application = null) {
        this._disposed = false;
        this.builders = {};
        this.defaultBuilderName = null;
        this.application = application;
        this._dataroot = new Bag();
        this._dataroot.setItem('_', new Bag());   // shared/common segment
        this._dataroot.setBackref();
        this.pointerMap = new Map();
        this._liveEnabled = false;
        this._liveDepth = 0;
        this._nodesToRender = {};
        this._liveTarget = null;
        // Deleted nodes' target_ids captured at the delete event.
        this._removedTargetIds = new Map();
        // Formula cascade: FIFO queue drained at the live() flush.
        this._formulaQueue = [];
        this._pendingFormulas = new Set();
        // Row logic of the expansions (CMP.7), per-COMPONENT templates: the
        // body is code, so the rule of row 45 IS the rule of row 46 — ONE
        // spec per rule per component. The event's coordinates (anchor →
        // row label → field) resolve which rules run and on which row.
        // Shared bindings (a header rate) are the absolute entries: one
        // event runs the spec over every live row.
        this.componentRules = new Map();       // anchor → {storeMode, specs, byField}
        this.sharedRules = new Map();          // trigger → [[owner, anchor, spec]]
        this._specSerial = 0;                  // stable id for the formula dedup key
    }

    /** Stop only handler-owned subscriptions and queued work; keep the Bag tree. */
    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this._liveEnabled = false;
        this._dataroot.unsubscribe('builder_data', {any: true});
        for (const builder of Object.values(this.builders)) builder.dispose();
        this._nodesToRender = {};
        this._removedTargetIds.clear();
        this._formulaQueue = [];
        this._pendingFormulas.clear();
        this._liveTarget = null;
        this.pointerMap.clear();
        this.componentRules.clear();
        this.sharedRules.clear();
    }

    get data() {
        return this._dataroot;
    }

    /** Mount builders under their own `name` and create each. */
    addBuilder(...builders) {
        for (const instance of builders) {
            const name = instance.name;
            if (!name) {
                throw new Error('builder has no name');
            }
            if (name === '_') {
                throw new Error("'_' is reserved for the shared segment");
            }
            if (name in this.builders) {
                throw new Error(`duplicate builder name '${name}'`);
            }
            if (this.defaultBuilderName === null) {
                this.defaultBuilderName = name;
            }
            this.builders[name] = instance;
            this._dataroot.setItem(name, new Bag());
            instance.handler = this;
            instance.data = this._dataroot.getItem(name);
            instance._sourceroot._handler = this;   // handler set before create()
            instance.create();
        }
    }

    source(name = null) {
        return this.builders[name || this.defaultBuilderName].source;
    }

    /** Finish startup: render every builder (populates pointer_map), then
     *  arm DATA reactivity (source reactivity is armed per-builder in create). */
    activate() {
        if (this._disposed) return;
        for (const instance of Object.values(this.builders)) {
            instance.render();
        }
        if (this.application) {
            this._dataroot.subscribe('builder_data', {
                insert: (e) => this._onDataEvent(e),
                update: (e) => this._onDataEvent(e),
                delete: (e) => this._onDataEvent(e),
            });
            this._liveEnabled = true;
        }
    }

    render() {
        if (this._disposed) return;
        for (const instance of Object.values(this.builders)) {
            instance.render();
        }
    }

    // --- pointer_map maintenance -------------------------------------

    _registerPath(node, absPath) {
        if (!this.application) {
            return;
        }
        if (!this.pointerMap.has(absPath)) {
            this.pointerMap.set(absPath, new Set());
        }
        this.pointerMap.get(absPath).add(node);
    }

    /** Drop `node` (and its subtree) from the pointer_map. */
    _unregisterPointer(node) {
        node.cancelDelayedCalls?.();
        this.application?.feedback?.releaseOwner(node);
        this.application?.resolvers?.cancel(node);
        this.application?.server?.cancel(node);
        this.application?.stores?.unregister(node);
        // A removed provider may already be queued by an earlier write in the
        // same live batch. Teardown must remove that pending execution too.
        this._pendingFormulas.delete(node);
        this._formulaQueue = this._formulaQueue.filter(entry => entry.key !== node);
        this._updatePointerMap(node, node.pointers());
        if (node.value instanceof Bag) {
            for (const child of node.value.getNodes()) {
                this._unregisterPointer(child);
            }
        }
    }

    /** Remove `pointers` of `node` from the pointer_map. */
    _updatePointerMap(node, pointers) {
        for (const [, pointer] of pointers) {
            const path = node.absDatapath(pointer);
            const inner = this.pointerMap.get(path);
            if (inner) {
                inner.delete(node);
                if (inner.size === 0) {
                    this.pointerMap.delete(path);
                }
            }
        }
    }

    // --- removed-id capture ------------------------------------------

    /** Capture a deleted node's target_id for the flush (first delete wins). */
    recordRemovedId(builderName, path, targetId) {
        if (!this._liveDepth) {
            return;
        }
        const key = `${builderName}|${path}`;
        if (!this._removedTargetIds.has(key)) {
            this._removedTargetIds.set(key, targetId);
        }
    }

    removedTargetId(builderName, path) {
        return this._removedTargetIds.get(`${builderName}|${path}`);
    }

    // --- data reactivity ---------------------------------------------

    _relevantNodes(path) {
        const grouped = new Map();
        const seen = new Set();
        for (const [key, inner] of this.pointerMap) {
            const kp = key.split('?')[0];
            let kind;
            if (kp === path) {
                kind = 'node';
            } else if (kp.startsWith(`${path}.`)) {
                kind = 'container';
            } else if (path.startsWith(`${kp}.`)) {
                kind = 'child';
            } else {
                continue;
            }
            for (const node of inner) {
                if (seen.has(node)) {
                    continue;
                }
                seen.add(node);
                const builder = node.builder;
                if (!grouped.has(builder)) {
                    grouped.set(builder, []);
                }
                grouped.get(builder).push([kind, node]);
            }
        }
        return grouped;
    }

    // --- formula cascade ---------------------------------------------

    /** Recompute the data-element readers, delegating to each builder.
     *  Inside a live section formulas do NOT compute: they queue (dedup
     *  on the node) for the flush drain; controllers/setters stay
     *  synchronous. Plain view readers are skipped (they only re-render). */
    executeLogic(relevant, event = null) {
        if (this._disposed) return;
        for (const [builder, items] of relevant) {
            for (const [kind, node] of items) {
                if (this._disposed) return;
                if (!node._getMeta('data_element')) {
                    continue;
                }
                if (node.nodeTag === 'dataFormula' && this._liveDepth) {
                    this._enqueueFormula(node, 'node', builder, node);
                } else {
                    builder.computeLogic([node], event ? {kw: event, trigger_reason: kind} : null);
                }
            }
        }
    }

    /** Queue one formula execution, deduped on `key` (a page data-element
     *  node, or a `${specId}|${rowPath}` for a row rule). A pending key does
     *  not queue twice; it will read the settled inputs when it drains. */
    _enqueueFormula(key, kind, owner, payload) {
        if (this._disposed) return;
        if (this._pendingFormulas.has(key)) {
            return;
        }
        this._pendingFormulas.add(key);
        this._formulaQueue.push({ key, kind, owner, payload });
    }

    /** Drain the queued formulas FIFO until dry. Their writes re-enter the
     *  cascade (formulas re-queue, controllers run at once). A rule whose
     *  row DIED while queued runs nothing (the existence check is the
     *  resurrection guard). A key draining more than FORMULA_REQUEUE_LIMIT
     *  times is a livelock → explicit error. */
    _drainFormulas() {
        const counts = new Map();
        while (!this._disposed && this._formulaQueue.length) {
            const { key, kind, owner, payload } = this._formulaQueue.shift();
            this._pendingFormulas.delete(key);
            const n = (counts.get(key) || 0) + 1;
            counts.set(key, n);
            if (n > FORMULA_REQUEUE_LIMIT) {
                const name = kind === 'rule'
                    ? `rule '${owner.func.name}' on ${payload}`
                    : `data-element '${payload.getAttr('func')}'`;
                throw new Error(
                    `formula livelock: ${name} re-queued more than `
                    + `${FORMULA_REQUEUE_LIMIT} times in one flush`,
                );
            }
            if (kind === 'rule') {
                if (payload !== null && !this._dataroot.getNode(payload)) {
                    continue;          // the row died while queued
                }
                this._executeRule(owner, payload);
            } else {
                owner.computeLogic([payload]);
            }
        }
    }

    // --- component rules (per-row data-elements, CMP.7) --------------

    /** Register a component's rules as TEMPLATES. Idempotent: every
     *  expansion rebuilds its component's entry (the body is code, every
     *  row builds the same rules — the last wins; the owner's stale shared
     *  entries prune first). `anchor` keys the coordinate dispatch (null =
     *  an unanchored component); `rowPrefix` is the registration row's
     *  absolute path, the residualization base. */
    setComponentRules(owner, anchor, storeMode, ruleNodes, rowPrefix) {
        const specs = ruleNodes.map((node) => this._ruleSpec(node, rowPrefix));
        const byField = new Map();
        for (const spec of specs) {
            for (const suffix of spec.rowTriggers) {
                if (!byField.has(suffix)) {
                    byField.set(suffix, []);
                }
                byField.get(suffix).push(spec);
            }
        }
        for (const [trigger, entries] of [...this.sharedRules]) {
            const kept = entries.filter((e) => e[0] !== owner);
            if (kept.length) {
                this.sharedRules.set(trigger, kept);
            } else {
                this.sharedRules.delete(trigger);
            }
        }
        for (const spec of specs) {
            for (const trigger of spec.sharedTriggers) {
                if (!this.sharedRules.has(trigger)) {
                    this.sharedRules.set(trigger, []);
                }
                this.sharedRules.get(trigger).push([owner, anchor, spec]);
            }
        }
        if (anchor !== null && anchor !== undefined) {
            this.componentRules.set(anchor, { storeMode, specs, byField });
        }
    }

    /** Compile a data-element node into a template spec. Bindings
     *  residualize against the registration row: a pointer under `rowPrefix`
     *  becomes a ROW suffix (the same for every row — the body is code),
     *  anything else stays absolute; non-pointer attributes ride as
     *  constants. Reactive (`^`) bindings are the triggers; passive (`=`)
     *  ones read at execution only. The func resolves NOW. */
    _ruleSpec(node, rowPrefix) {
        const builder = node.builder;
        const kind = node.nodeTag.replace(/^data/, '').toLowerCase();   // formula | controller
        const func = builder._resolveNodeLogic(node);
        const classify = (path) => {
            const absPath = node.absDatapath(path);
            if (rowPrefix && absPath.startsWith(rowPrefix)) {
                const suffix = absPath.slice(rowPrefix.length);
                if (suffix.startsWith('.') || suffix.startsWith('?')) {
                    return ['row', suffix];
                }
            }
            return ['abs', absPath];
        };
        const bindings = [];
        const rowTriggers = [];
        const sharedTriggers = [];
        for (const [name, raw] of Object.entries(node.getAttr() || {})) {
            if (DATA_ELEMENT_FIELDS.has(name) || META_ATTRS.has(name)) {
                continue;
            }
            const pointerKind = node.pointerType(raw);
            if (pointerKind === null) {
                bindings.push([name, 'const', raw]);
                continue;
            }
            const [mode, payload] = classify(raw);
            bindings.push([name, mode, payload]);
            if (pointerKind === '^') {
                if (mode === 'row') {
                    // the by-field index key: the event field arrives without
                    // the leading dot
                    rowTriggers.push(payload.replace(/^\./, ''));
                } else {
                    sharedTriggers.push(payload);
                }
            }
        }
        let destination = null;
        if (kind === 'formula') {
            destination = classify(node.getAttr('destination'));
        }
        this._specSerial += 1;
        return {
            _id: this._specSerial, kind, func, bindings, destination,
            rowTriggers, sharedTriggers, segment: node.rootBuilderName,
        };
    }

    /** Coordinate dispatch (CMP.7): the event path DECOMPOSES. Walk the
     *  path's prefixes for the deepest registered anchor; the next segment
     *  is the row, the rest the field. A DEAD row runs nothing (existence
     *  check = resurrection guard). Shared triggers resolve from their own
     *  registry, each spec running over every live row of its component. */
    _runComponentRules(path) {
        const segments = path.split('.');
        for (let cut = segments.length - 1; cut > 0; cut -= 1) {
            const anchor = segments.slice(0, cut).join('.');
            const component = this.componentRules.get(anchor);
            if (!component) {
                continue;
            }
            const residual = segments.slice(cut);
            let rowPath;
            let field;
            if (component.storeMode) {
                rowPath = anchor;
                field = residual.join('.');
            } else {
                rowPath = `${anchor}.${residual[0]}`;
                field = residual.slice(1).join('.');
            }
            if (this._dataroot.getNode(rowPath)) {
                for (const spec of this._rulesFor(component, field)) {
                    this._dispatchRule(spec, rowPath);
                }
            }
            break;
        }
        const matched = [];
        for (const [trigger, entries] of this.sharedRules) {
            const stripped = trigger.split('?')[0];
            if (stripped === path || stripped.startsWith(`${path}.`)) {
                matched.push(...entries);
            }
        }
        const seen = new Set();
        for (const [, anchor, spec] of matched) {
            if (seen.has(spec)) {
                continue;
            }
            seen.add(spec);
            this._runSharedRule(spec, anchor);
        }
    }

    /** The specs the mutated `field` triggers, deduped in order: exact hit
     *  on the by-field index, plus bindings sitting UNDER the mutated field
     *  (a container replaced wholesale). No field → every spec of the
     *  component (a wholesale row replace / upd_attrs). */
    _rulesFor(component, field) {
        if (!field) {
            return [...new Set(component.specs)];
        }
        const hits = [...(component.byField.get(field) || [])];
        for (const [suffix, specs] of component.byField) {
            if (suffix === field) {
                continue;
            }
            const stripped = suffix.split('?')[0];
            if (stripped === field || stripped.startsWith(`${field}.`)) {
                hits.push(...specs);
            }
        }
        return [...new Set(hits)];
    }

    /** Run a controller now, queue a formula (inside a live section). A
     *  command is not a function of the state (controllers stay
     *  synchronous); a formula IS (it defers to the flush drain). */
    _dispatchRule(spec, rowPath) {
        if (this._disposed) return;
        if (spec.kind === 'formula' && this._liveDepth) {
            this._enqueueFormula(`${spec._id}|${rowPath}`, 'rule', spec, rowPath);
        } else {
            this._executeRule(spec, rowPath);
        }
    }

    /** A shared trigger fired: run the spec over its component. An iterate
     *  component runs it once per LIVE row; a store component on the store;
     *  an unanchored one once with no row. */
    _runSharedRule(spec, anchor) {
        if (anchor === null || anchor === undefined) {
            this._dispatchRule(spec, null);
            return;
        }
        const component = this.componentRules.get(anchor);
        if (!component || component.storeMode) {
            this._dispatchRule(spec, anchor);
            return;
        }
        const collection = this._dataroot.getItem(anchor);
        if (collection === null || collection === undefined) {
            return;
        }
        for (const label of collection.keys()) {
            this._dispatchRule(spec, `${anchor}.${label}`);
        }
    }

    /** Run one template spec on one row: read, compute, write. Everything
     *  resolves by coordinates — row suffixes on `rowPath`, absolutes as
     *  they are, constants as themselves. A controller's `node` is a
     *  RowContext bound to the same coordinates. The writes re-enter the
     *  cascade as any canonical data-element write. */
    _executeRule(spec, rowPath) {
        const kwargs = {};
        for (const [name, mode, payload] of spec.bindings) {
            if (mode === 'const') {
                kwargs[name] = payload;
            } else if (mode === 'row') {
                kwargs[name] = this._dataroot.getItem(rowPath + payload);
            } else {
                kwargs[name] = this._dataroot.getItem(payload);
            }
        }
        if (spec.kind === 'formula') {
            const [mode, payload] = spec.destination;
            const dest = mode === 'row' ? rowPath + payload : payload;
            this._dataroot.setItem(dest, spec.func(kwargs), null, '>', false, true, true, false);
        } else {
            const context = new RowContext(
                this._dataroot, spec.segment, rowPath, this.builders[spec.segment],
            );
            spec.func(context, kwargs);
        }
    }

    _onDataEvent(e) {
        if (this._disposed) return;
        const { node, evt, pathlist, reason } = e;
        if (reason === 'autocreate') {
            return;
        }
        const path = (evt === 'ins' || evt === 'del')
            ? [...pathlist, node.label].join('.')
            : pathlist.join('.');
        const relevant = this._relevantNodes(path);
        // Row rules first (they run ahead of the wide page readers that
        // depend on their writes), then the page data-element readers
        // (their writes re-enter here and cascade), then the view readers.
        this._runComponentRules(path);
        this.executeLogic(relevant, e);
        for (const [, items] of relevant) {
            for (const [, viewNode] of items) {
                if (viewNode._getMeta('data_element')) continue;
                // Anti-echo (legacy gnrdomsource `if (kw.reason != this)`):
                // the node that originated the write does not re-render.
                if (viewNode === reason) {
                    continue;
                }
                const name = viewNode.rootBuilderName;
                const rel = viewNode.rootBuilder.source.relativePath(viewNode);
                // An iterate-component reader classifies PER ROW (path
                // arithmetic); every other reader re-renders whole (upd).
                const row = this._expansionRow(viewNode, path, evt);
                if (row !== null) {
                    const [rowKind, label, field] = row;
                    this.addRenderPath(name, rel, rowKind, label, field);
                } else {
                    this.addRenderPath(name, rel);
                }
            }
        }
    }

    /** Classify a data event against an iterate component (CMP.7).
     *
     *  When the reader is an iterate component and the mutated path falls
     *  under its anchor, the path arithmetic names the row: the residual's
     *  first segment is the row label. The kind says what happened — the
     *  row born (`row_ins`), dead (`row_del`), replaced wholesale
     *  (`row_upd`), or ONE of its leaves changed (`cell_upd`, the residual
     *  rest as `field`). Returns null for every other reader (including
     *  the collection node itself replaced wholesale: the whole block
     *  re-renders). */
    _expansionRow(viewNode, path, evt) {
        if (!viewNode._getMeta('component')) {
            return null;
        }
        const iterate = viewNode.getAttr('iterate');
        if (iterate === null || iterate === undefined) {
            return null;
        }
        const anchor = viewNode.absDatapath(iterate);
        if (!path.startsWith(`${anchor}.`)) {
            return null;
        }
        const residual = path.slice(anchor.length + 1);
        const dot = residual.indexOf('.');
        const label = dot === -1 ? residual : residual.slice(0, dot);
        const rest = dot === -1 ? '' : residual.slice(dot + 1);
        if (rest) {
            return ['cell_upd', label, rest];
        }
        if (evt === 'ins') {
            return ['row_ins', label, null];
        }
        if (evt === 'del') {
            return ['row_del', label, null];
        }
        return ['row_upd', label, null];
    }

    // --- render queue + optimizer + flush ----------------------------

    /** Record a touched path + kind for the end-of-live render. */
    addRenderPath(builderName, path, kind = 'upd', label = null, field = null) {
        if (this._disposed) return;
        if (!this._liveDepth) {
            return;
        }
        if (!this._nodesToRender[builderName]) {
            this._nodesToRender[builderName] = [];
        }
        this._nodesToRender[builderName].push({ kind, path, label, field });
    }

    /** Reduce the queued entries to the minimal set.
     *
     *  Per-key netting first (key = path|label|field — a plain node or ONE
     *  row/cell of an iterate component): the section's history collapses
     *  to its net effect (the flush renders the FINAL source state).
     *
     *  Then the reductions: exact dedup (the netting map), ancestor covers
     *  descendant (a whole-node entry covers its rows and cells, a row
     *  entry covers its cells), and density coalescing — too many cells of
     *  ONE row collapse into that row's replace, then a structural flood
     *  of rows collapses into the enclosing-container replace. Cell entries
     *  never count in the row flood: value-only ops are what a broadcast
     *  wants to ship. */
    _optimizeRender(entries) {
        const state = new Map();   // key `${path}|${label}|${field}` → base kind
        const meta = new Map();    // key → {path, label, field}
        for (const { kind, path, label, field } of entries) {
            const key = `${path}|${label}|${field}`;
            meta.set(key, { path, label, field });
            const base = kind.replace(/^row_/, '').replace(/^cell_/, '');
            const prev = state.get(key);
            if (prev === undefined) {
                state.set(key, base);
            } else if (base === 'upd') {
                if (prev === 'del') {
                    throw new Error(`update queued for ${key} after its delete`);
                }
                // upd / ins / del+ins all render fresh at flush: absorbed.
            } else if (base === 'ins') {
                if (prev !== 'del') {
                    throw new Error(`insert queued for ${key} over a live node`);
                }
                state.set(key, 'del+ins');
            } else if (base === 'del') {
                if (prev === 'ins') {
                    state.delete(key);          // ephemeral: net nothing
                } else if (prev === 'del') {
                    throw new Error(`delete queued for ${key} after its delete`);
                } else {
                    state.set(key, 'del');
                }
            }
        }
        const wholePaths = new Set();
        const rowKeys = new Set();
        for (const key of state.keys()) {
            const { path, label, field } = meta.get(key);
            if (label === null) {
                wholePaths.add(path);
            } else if (field === null) {
                rowKeys.add(`${path}|${label}`);
            }
        }
        let kept = [];
        for (const [key, kind] of state) {
            const { path, label, field } = meta.get(key);
            // an ancestor whole-node entry renders its final subtree
            if ([...wholePaths].some((other) => other !== path && path.startsWith(`${other}.`))) {
                continue;
            }
            // the component's own entry covers its rows and cells
            if (label !== null && wholePaths.has(path)) {
                continue;
            }
            // the row's own entry covers its cells
            if (field !== null && rowKeys.has(`${path}|${label}`)) {
                continue;
            }
            kept.push({ kind, path, label, field });
        }
        // Density, cells first: too many cells of ONE row collapse into
        // that row's replace.
        const cellLoad = new Map();
        for (const { path, label, field } of kept) {
            if (field !== null) {
                const k = `${path}|${label}`;
                cellLoad.set(k, (cellLoad.get(k) || 0) + 1);
            }
        }
        const fullRows = new Set(
            [...cellLoad].filter(([, c]) => c > CELLS_PER_ROW_LIMIT).map(([k]) => k),
        );
        if (fullRows.size) {
            kept = kept.filter(
                ({ path, label, field }) => !(field !== null && fullRows.has(`${path}|${label}`)),
            );
            for (const k of fullRows) {
                const [path, label] = k.split('|');
                kept.push({ kind: 'upd', path, label, field: null });
            }
        }
        // ...then rows: a structural flood coalesces into the container
        // replace. CELL entries never count here.
        const rowLoad = new Map();
        for (const { kind, path, label, field } of kept) {
            if (label !== null && field === null && kind !== 'page') {
                rowLoad.set(path, (rowLoad.get(path) || 0) + 1);
            }
        }
        const coalesced = new Set(
            [...rowLoad].filter(([, c]) => c > ROW_COALESCE_LIMIT).map(([p]) => p),
        );
        const out = [];
        for (const path of coalesced) {
            out.push({ kind: 'upd', path, label: null, field: null });
        }
        for (const { kind, path, label, field } of kept) {
            if (label !== null && coalesced.has(path)) {
                continue;          // the container replace covers them all
            }
            if (kind === 'del+ins') {
                const row = label !== null ? 'row_' : '';
                out.push({ kind: `${row}del`, path, label, field: null });
                out.push({ kind: `${row}ins`, path, label, field: null });
            } else if (kind === 'page') {
                out.push({ kind: 'page', path, label, field: null });
            } else if (field !== null) {
                out.push({ kind: 'cell_upd', path, label, field });
            } else if (label !== null) {
                out.push({ kind: `row_${kind}`, path, label, field: null });
            } else {
                out.push({ kind, path, label: null, field: null });
            }
        }
        return out;
    }

    /** The mutation critical section: batch, optimize, flush per-node patches. */
    live(fn, target = null) {
        if (this._disposed) return;
        if (!this._liveEnabled) {
            throw new Error(
                'live() requires an activated handler with an application: '
                + 'without them nothing is subscribed, nothing would react',
            );
        }
        if (this._liveDepth && target !== null) {
            throw new Error('a nested live() section cannot set a target');
        }
        this._liveDepth += 1;
        if (this._liveDepth === 1) {
            this._nodesToRender = {};
            this._removedTargetIds = new Map();
            this._formulaQueue = [];
            this._pendingFormulas = new Set();
            this._liveTarget = target;
        }
        try {
            fn();
        } finally {
            if (this._liveDepth === 1) {
                let flushReady = false;
                try {
                    // Source insertions are complete now. Prepare every
                    // surviving branch as one batch while writes can still
                    // participate in this live flush.
                    for (const builder of Object.values(this.builders)) {
                        builder._preparePendingBranches();
                    }
                    // Drain with depth still 1, so the formulas' writes queue
                    // their render paths and re-queue further formulas.
                    this._drainFormulas();
                    flushReady = true;
                } finally {
                    this._liveDepth -= 1;
                    try {
                        if (flushReady) {
                            for (const [name, entries] of Object.entries(this._nodesToRender)) {
                                if (!this._disposed && entries.length) {
                                    this.builders[name].renderNodes(
                                        this._optimizeRender(entries), this._liveTarget,
                                    );
                                }
                            }
                        }
                    } finally {
                        this._nodesToRender = {};
                        this._removedTargetIds = new Map();
                        this._formulaQueue = [];
                        this._pendingFormulas = new Set();
                        this._liveTarget = null;
                        this.application?._forms?.sync();
                    }
                }
            } else {
                this._liveDepth -= 1;
            }
        }
    }
}
