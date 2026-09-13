// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * storeTree — the legacy tree widget as a data-widget (model B), the linear
 * port of `gnr.widgets.Tree` (dijit.Tree + GnrStoreBag).
 *
 * Unlike the projective `tree` (model A, one source node per row), a
 * storeTree is a SINGLE node marked `dataWidget`: the renderer hands it the
 * resolved Bag branch as the `.storeBag` property (see html-builder
 * renderedItem), and the widget owns everything — it draws the hierarchy
 * from the Bag, keeps its own expand/collapse state, and subscribes to the
 * Bag to redraw on change (the GnrStoreBag model). Store-pointer replacement
 * is reconciled onto the same mounted widget, preserving expansion state.
 *
 * Authoring:
 *   pane.storeTree({ store: '^data.folders', labelAttribute: 'caption' })
 *
 * A node whose value is a Bag is a BRANCH (expandable, <details>); otherwise
 * a LEAF. The row caption is `node.getAttr(labelAttribute)` (default
 * 'caption'), falling back to the node label.
 *
 * v1 boundary (later strata, all in the legacy widget): selection write-back,
 * checkbox tri-state, search/filter, drag & drop.
 */
import { Bag } from 'genro-bag-js';

import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';
import {WidgetLabel} from './decoration/widget-label.js';



const CSS = `
:host { display:block; font:inherit; color:inherit; }
ul { list-style:none; margin:0; padding-left:17px; }
.tree-root > ul { padding-left:2px; }
details.field-group > ul { padding-left:0; }
li { line-height:var(--tree-line-height,1.7); }
summary { display:flex; align-items:center; gap:7px; padding:var(--tree-row-padding,2px) 5px; cursor:pointer; user-select:none; list-style:none; }
summary::-webkit-details-marker { display:none; }
summary::before { content:''; width:5px; height:5px; border-right:1.5px solid #78818a; border-bottom:1.5px solid #78818a; transform:rotate(-45deg); flex:none; margin:0 3px; }
details[open] > summary::before { transform:rotate(45deg); }
.leaf { padding:var(--tree-row-padding,2px) 5px var(--tree-row-padding,2px) 23px; cursor:pointer; }
summary:hover,.leaf:hover { background:#f0f3f6; }
.selected,.selected:hover { background:var(--tree-selected-bg,#e4edf6); color:var(--tree-selected-color,inherit); font-weight:var(--tree-selected-weight,inherit); border-radius:2px; }
.leaf { display:flex; align-items:center; gap:7px; }
.caption { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.caption.virtual-column { font-style:italic; }
.caption.virtual-column[data-column-kind="formula"] { color:var(--tree-formula-color,#c46b16); }
.caption.group-caption { font-weight:400; color:var(--tree-group-color,#92979e); text-align:left; }
.group-icon { display:inline-flex; align-items:center; justify-content:center; flex:0 0 18px; height:14px; color:#78818c; font:14px/1 sans-serif; }
.python-logo { display:inline-block; width:10px; height:10px; margin-left:4px; vertical-align:baseline; }
.python-logo svg { display:block; width:100%; height:100%; fill:none; stroke:currentColor; stroke-width:7; stroke-linejoin:round; }
.python-logo { color:#78818a; opacity:.65; }
.column-kind { font:11px/1 sans-serif; color:#78818a; }
.subquery-hint,.composite-hint { display:inline-block; margin-left:4px; width:14px; height:11px; vertical-align:-1px; color:#78818a; opacity:.65; }
.subquery-hint svg,.composite-hint svg { display:block; width:100%; height:100%; }
.node-info { flex:none; width:14px; height:14px; border:1px solid #929aa3; border-radius:50%; padding:0; background:transparent; color:#68727e; font:11px/12px serif; opacity:0; cursor:help; }
summary:hover .node-info,.leaf:hover .node-info,summary:focus-within .node-info,.leaf:focus-within .node-info { opacity:.8; }
@media(hover:none) { .node-info { opacity:.8; } }
.tree-toolbar { display:flex; justify-content:flex-end; padding:3px 5px; color:#78818a; font-size:12px; }
.tree-toolbar label { display:flex; align-items:center; gap:4px; }
.favorite-button { border:0; background:none; padding:0 2px; color:#92979e; font:12px/1 sans-serif; cursor:pointer; opacity:0; }
.favorite-button.favorite-remove { font-size:10px; min-width:19px; min-height:15px; }
.favorite-remove svg { display:block; width:12px; height:12px; margin:auto; }
summary:hover > .favorite-button,.leaf:hover > .favorite-button,.favorite-button:focus-visible { opacity:.8; }
.favorite-button[aria-pressed="true"] { color:#8c6570; opacity:.7; }
@media(hover:none) { .favorite-button { opacity:.8; } }
.node-attributes { position:fixed; z-index:10000; margin:0; padding:10px; border:1px solid #cbd2da; border-radius:5px; background:#fff; color:#38414b; box-shadow:0 3px 12px #0002; max-width:min(460px,calc(100vw - 20px)); max-height:55vh; overflow:auto; font:12px/1.4 sans-serif; }
.node-attributes table { border-collapse:collapse; width:100%; }
.node-attributes th,.node-attributes td { padding:3px 6px; vertical-align:top; text-align:left; border-bottom:1px solid #e8ebee; }
.node-attributes th { font-weight:500; }
.node-attributes td { white-space:pre-wrap; overflow-wrap:anywhere; }
.type-badge { display:inline-flex; align-items:center; justify-content:center; flex:0 0 18px; height:14px; padding:0; border-radius:2px; background:var(--tree-type-bg,#eef0f2); color:var(--tree-type-color,#59616b); font:500 10px/1 sans-serif; }
.type-badge[data-direction="ascending"] { background:var(--tree-ascending-bg,#218544); color:var(--tree-relation-color,#fff); }
.type-badge[data-direction="descending"] { background:var(--tree-descending-bg,#246ed4); color:var(--tree-relation-color,#fff); }
[data-relation-direction="ascending"] > .caption { color:var(--tree-ascending-bg,#218544); }
[data-relation-direction="descending"] > .caption { color:var(--tree-descending-bg,#246ed4); }
.actions { display:inline-flex; gap:2px; margin-left:auto; opacity:0; pointer-events:none; }
summary:hover > .actions, .leaf:hover > .actions, summary:focus-within > .actions, .leaf:focus-within > .actions { opacity:1; pointer-events:auto; }
.actions button { border:0; background:transparent; color:var(--tree-action-color,#7b8490); font:inherit; font-size:12px; line-height:18px; padding:0 3px; cursor:pointer; border-radius:3px; }
.actions button:hover { background:#e4e9ef; color:#34445c; }
.actions button:focus-visible { outline:2px solid #356f9f; }
@media (hover:none) { .actions { opacity:1; pointer-events:auto; } }
summary:focus-visible { outline:2px solid var(--accent-color,#356f9f); outline-offset:-2px; }
`;

function defineComponents() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-storetree')) {
        return;
    }

    let seq = 0;

    class GnrStoreTree extends HTMLElement {
        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = CSS;
            root.appendChild(style);
            this._root = document.createElement('div');
            this._root.className = 'tree-root';
            root.appendChild(this._root);
            this._widgetLabel = new WidgetLabel(this, null, this._root);
            this._expanded = new Set();
            this._pendingLoads = new WeakMap();
            this._selectedPath = null;
            this._selectedEl = null;
            seq += 1;
            this._subId = `gnr-storetree-${seq}`;
            this._tooltip = document.createElement('div');
            this._tooltip.className = 'node-attributes';
            this._tooltip.id = `${this._subId}-attributes`;
            this._tooltip.hidden = true;
            this._tooltip.setAttribute('popover', 'manual');
            this._tooltip.setAttribute('role', 'tooltip');
            root.append(this._tooltip);
            this._tooltip.addEventListener('mouseenter', () => clearTimeout(this._infoTimer));
            this._tooltip.addEventListener('mouseleave', () => this._hideInfo());
        }

        /** Optional [{id, icon, label}]. Actions emit tree-action; the consumer owns behavior. */
        get rowActions() { return this._rowActions || []; }
        set rowActions(actions) {
            if (!Array.isArray(actions) || actions.some(a => !a || typeof a.id !== 'string' || !a.id || typeof a.label !== 'string' || !a.label)) {
                throw new TypeError('rowActions requires actions with id and label');
            }
            this._rowActions = actions.map(a => ({...a}));
            if (this.isConnected) this._render();
        }

        _caption(row, caption, path, node) {
            const typeAttribute = this.getAttribute('typeAttribute');
            if (typeAttribute && node?.getAttr('node_kind') === 'group') {
                const icon = document.createElement('span');
                icon.className = 'group-icon';
                icon.textContent = '◇';
                icon.setAttribute('aria-hidden', 'true');
                row.append(icon);
            }
            if (typeAttribute && node && node.getAttr('node_kind') !== 'group') {
                const dtype = String(node.getAttr(typeAttribute) || '?');
                const typeNames = {A:'Text', C:'Character', T:'Text', I:'Integer', L:'Integer',
                    R:'Float', F:'Float', N:'Decimal', M:'Money', B:'Boolean', D:'Date',
                    H:'Time', HZ:'Time with timezone', DH:'Datetime', DHZ:'Datetime with timezone',
                    X:'Bag', JS:'JSON', O:'Object'};
                const direction = node.getAttr(this.getAttribute('relationAttribute') || 'relation_direction');
                const badge = document.createElement('span');
                badge.className = 'type-badge';
                badge.textContent = dtype;
                badge.dataset.direction = direction || '';
                row.dataset.relationDirection = direction || '';
                badge.title = `${dtype}${typeNames[dtype] ? ` — ${typeNames[dtype]}` : ''}${direction ? ` · ${direction} relation` : ''}`;
                badge.setAttribute('aria-label', badge.title);
                row.append(badge);
            }
            const text = document.createElement('span');
            text.className = 'caption'; text.textContent = caption; row.append(text);
            const subqueries = node?.getAttr('subquery_paths');
            if (typeAttribute && Array.isArray(subqueries) && subqueries.length) {
                const hint = document.createElement('span');
                hint.className = 'subquery-hint';
                hint.innerHTML = '<svg viewBox="0 0 20 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10C3 3 13 2 14 9L14 10Z M6 10l1-4h3l2 4M7 6 6 4M10 6l1-2M3 9 1 8M5 10l-1 2M11 10l1 2M14 8l2-2c3-1 4 3 1 3h-3"/></svg>';
                hint.title = `Potential subquery cost (not measured): ${subqueries.join('; ')}`;
                hint.setAttribute('aria-label', hint.title);
                text.append(hint);
            }
            if (typeAttribute && node?.getAttr('node_kind') === 'group') {
                text.classList.add('group-caption');
            }
            const kind = node?.getAttr('column_kind');
            if (typeAttribute && kind) {
                text.classList.add('virtual-column');
                text.dataset.columnKind = kind;
            }
            if (typeAttribute && kind && kind !== 'alias' && kind !== 'formula') {
                const marker = document.createElement('span');
                marker.className = 'column-kind';
                marker.textContent = {composite:'🔗', virtual:'v'}[kind] || 'v';
                marker.title = `${kind} column`;
                marker.setAttribute('aria-label', marker.title);
                if (kind === 'python') {
                    // Python logo: Python Software Foundation, python.org/community/logos/
                    marker.innerHTML = "<svg viewBox=\"0 0 125 125\" aria-hidden=\"true\"><path fill=\"none\" d=\"M 60.510156,6.3979729 C 55.926503,6.4192712 51.549217,6.8101906 47.697656,7.4917229 C 36.35144,9.4962267 34.291407,13.691825 34.291406,21.429223 L 34.291406,31.647973 L 61.103906,31.647973 L 61.103906,35.054223 L 34.291406,35.054223 L 24.228906,35.054223 C 16.436447,35.054223 9.6131468,39.73794 7.4789058,48.647973 C 5.0170858,58.860939 4.9078907,65.233996 7.4789058,75.897973 C 9.3848341,83.835825 13.936449,89.491721 21.728906,89.491723 L 30.947656,89.491723 L 30.947656,77.241723 C 30.947656,68.391821 38.6048,60.585475 47.697656,60.585473 L 74.478906,60.585473 C 81.933857,60.585473 87.885159,54.447309 87.885156,46.960473 L 87.885156,21.429223 C 87.885156,14.162884 81.755176,8.7044455 74.478906,7.4917229 C 69.872919,6.7249976 65.093809,6.3766746 60.510156,6.3979729 z M 46.010156,14.616723 C 48.779703,14.616723 51.041406,16.915369 51.041406,19.741723 C 51.041404,22.558059 48.779703,24.835473 46.010156,24.835473 C 43.23068,24.835472 40.978906,22.558058 40.978906,19.741723 C 40.978905,16.91537 43.23068,14.616723 46.010156,14.616723 z \"/><path fill=\"none\" d=\"M 91.228906,35.054223 L 91.228906,46.960473 C 91.228906,56.191228 83.403011,63.960472 74.478906,63.960473 L 47.697656,63.960473 C 40.361823,63.960473 34.291407,70.238956 34.291406,77.585473 L 34.291406,103.11672 C 34.291406,110.38306 40.609994,114.65704 47.697656,116.74172 C 56.184987,119.23733 64.323893,119.68835 74.478906,116.74172 C 81.229061,114.78733 87.885159,110.85411 87.885156,103.11672 L 87.885156,92.897973 L 61.103906,92.897973 L 61.103906,89.491723 L 87.885156,89.491723 L 101.29141,89.491723 C 109.08387,89.491723 111.98766,84.056315 114.69765,75.897973 C 117.49698,67.499087 117.37787,59.422197 114.69765,48.647973 C 112.77187,40.890532 109.09378,35.054223 101.29141,35.054223 L 91.228906,35.054223 z M 76.166406,99.710473 C 78.945884,99.710476 81.197656,101.98789 81.197656,104.80422 C 81.197654,107.63057 78.945881,109.92922 76.166406,109.92922 C 73.396856,109.92922 71.135156,107.63057 71.135156,104.80422 C 71.135158,101.98789 73.396853,99.710473 76.166406,99.710473 z \"/></svg>";
                    marker.classList.add('python-logo');
                    text.append(marker);
                } else if (kind === 'composite') {
                    marker.classList.add('composite-hint');
                    marker.innerHTML = '<svg viewBox="0 0 20 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M8 9 6 11a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0M12 5l2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0M7 8l6-3"/></svg>';
                    text.append(marker);
                } else {
                    row.append(marker);
                }
            }
            if (node && this.hasAttribute('showAttributes')) {
                const info = document.createElement('button');
                info.type = 'button'; info.className = 'node-info'; info.textContent = 'i';
                info.setAttribute('aria-label', `Attributes of ${caption}`);
                info.setAttribute('aria-describedby', this._tooltip.id);
                const show = () => this._showInfo(info, node);
                info.addEventListener('mouseenter', show);
                info.addEventListener('focus', show);
                info.addEventListener('mouseleave', () => { this._infoTimer = setTimeout(() => this._hideInfo(), 150); });
                info.addEventListener('blur', () => this._hideInfo());
                info.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); show(); });
                info.addEventListener('keydown', event => { if (event.key === 'Escape') this._hideInfo(); });
                row.append(info);
            }
            if (!this.rowActions.length) return;
            const actions = document.createElement('span'); actions.className = 'actions';
            for (const action of this.rowActions) {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = action.icon || action.label;
                button.title = action.label; button.setAttribute('aria-label', action.label);
                button.dataset.action = action.id;
                button.addEventListener('click', event => {
                    event.preventDefault(); event.stopPropagation();
                    this.dispatchEvent(new CustomEvent('tree-action', {
                        bubbles:true, composed:true,
                        detail:{action:action.id, path, node:this._store.getNode(path)},
                    }));
                });
                button.addEventListener('dragstart', event => event.preventDefault());
                actions.append(button);
            }
            row.append(actions);
        }

        get storeBag() { return this._store; }

        _hideInfo() {
            clearTimeout(this._infoTimer);
            if (this._tooltip.matches(':popover-open')) this._tooltip.hidePopover();
            this._tooltip.hidden = true;
        }

        _showInfo(button, node) {
            clearTimeout(this._infoTimer);
            const table = document.createElement('table');
            for (const [key, value] of Object.entries(node.attr)) {
                const row = table.insertRow();
                const name = document.createElement('th'); name.scope = 'row'; name.textContent = key;
                const cell = document.createElement('td');
                try { cell.textContent = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value); }
                catch { cell.textContent = '[Complex attribute]'; }
                row.append(name, cell);
            }
            this._tooltip.replaceChildren(table);
            this._tooltip.hidden = false;
            this._tooltip.showPopover?.();
            const rect = button.getBoundingClientRect();
            const box = this._tooltip.getBoundingClientRect();
            this._tooltip.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - box.width - 10))}px`;
            this._tooltip.style.top = `${Math.max(10, Math.min(rect.bottom, window.innerHeight - box.height - 10))}px`;
        }

        set storeBag(bag) {
            if (this.isConnected) this._resubscribe(bag);
            this._store = bag;
            if (this.isConnected) { this._render(); }
        }

        connectedCallback() {
            this._widgetLabel.connect();
            if (this._store) { this._resubscribe(this._store); }
            this._render();
        }

        disconnectedCallback() {
            this._hideInfo();
            this._widgetLabel.disconnect();
            if (this._store) { this._store.unsubscribe(this._subId); }
        }

        /** Move the redraw subscription from the old branch to the new one. */
        _resubscribe(bag) {
            if (this._store) { this._store.unsubscribe(this._subId); }
            if (bag) {
                bag.subscribe(this._subId, { any: () => this._render() });
            }
        }

        get _labelAttribute() { return this.getAttribute('labelAttribute') || 'caption'; }

        _render() {
            this._hideInfo();
            this._root.textContent = '';
            if (this._store) {
                this._root.appendChild(this._buildLevel(this._store, ''));
            }
        }

        /** One <ul> level: a <li> per node, branch (<details>) or leaf. */
        _buildLevel(bag, prefix) {
            const ul = document.createElement('ul');
            for (const node of bag.getNodes()) {
                const path = prefix ? `${prefix}.${node.label}` : node.label;
                const caption = node.getAttr(this._labelAttribute) || node.label;
                const value = node.getValue(true);
                ul.appendChild(
                    node.resolver
                        ? this._lazyBranch(node, path, caption)
                        : value instanceof Bag
                        ? this._branch(value, path, caption, node)
                        : this._leaf(caption, path, node),
                );
            }
            return ul;
        }

        /** A collapsed resolver is never read. Failed loads retry on reopening. */
        _lazyBranch(node, path, caption) {
            const li = document.createElement('li');
            const details = document.createElement('details');
            details.open = this._expanded.has(path);
            const summary = document.createElement('summary');
            this._caption(summary, caption, path, node);
            if (path === this._selectedPath) summary.classList.add('selected');
            summary.addEventListener('click', () => this._select(path, summary));
            details.append(summary);
            const body = document.createElement('div');
            details.append(body);
            let loaded = false;
            const expand = async () => {
                if (!details.open || loaded) return;
                loaded = true;
                body.removeAttribute('role');
                body.textContent = 'Loading…';
                details.setAttribute('aria-busy', 'true');
                try {
                    let pending = this._pendingLoads.get(node);
                    if (!pending) {
                        pending = Promise.resolve().then(() => node.getValue());
                        this._pendingLoads.set(node, pending);
                        pending.finally(() => {
                            if (this._pendingLoads.get(node) === pending) this._pendingLoads.delete(node);
                        }).catch(() => {});
                    }
                    const children = await pending;
                    if (!details.isConnected) return;
                    if (!(children instanceof Bag)) throw new TypeError('Tree resolver must return a Bag');
                    body.replaceChildren(this._buildLevel(children, path));
                } catch (error) {
                    if (!details.isConnected) return;
                    body.textContent = `Unable to load: ${error.message}. Close and reopen to retry.`;
                    body.setAttribute('role', 'alert');
                } finally {
                    details.removeAttribute('aria-busy');
                }
            };
            details.addEventListener('toggle', () => {
                if (details.open) { this._expanded.add(path); expand(); }
                else { this._expanded.delete(path); loaded = false; }
            });
            li.append(details);
            if (details.open) queueMicrotask(expand);
            return li;
        }

        _branch(childBag, path, caption, node) {
            const li = document.createElement('li');
            const details = document.createElement('details');
            if (this.hasAttribute('typeAttribute') && node?.getAttr('node_kind') === 'group') {
                details.classList.add('field-group');
            }
            details.open = this._expanded.has(path);
            details.addEventListener('toggle', () => {
                if (details.open) { this._expanded.add(path); } else { this._expanded.delete(path); }
            });
            const summary = document.createElement('summary');
            this._caption(summary, caption, path, node);
            if (path === this._selectedPath) { summary.classList.add('selected'); }
            summary.addEventListener('click', () => this._select(path, summary));
            details.appendChild(summary);
            details.appendChild(this._buildLevel(childBag, path));
            li.appendChild(details);
            return li;
        }

        _leaf(caption, path, node) {
            const li = document.createElement('li');
            li.className = 'leaf';
            this._caption(li, caption, path, node);
            if (path === this._selectedPath) { li.classList.add('selected'); }
            li.addEventListener('click', () => this._select(path, li));
            return li;
        }

        /** Select a row: mark it, remember it (survives redraws), and write
         *  its path into the `selectedPath` datum via the `gnr-set` command
         *  (the destination is the resolved data-selectedPath-pointer). The
         *  path is relative to the store branch (legacy itemFullPath parity). */
        _select(path, el) {
            if (this._selectedEl) { this._selectedEl.classList.remove('selected'); }
            this._selectedEl = el;
            el.classList.add('selected');
            this._selectedPath = path;
            const pointer = this.getAttribute('data-selectedPath-pointer');
            if (pointer) {
                this.dispatchEvent(new CustomEvent('gnr-set', {
                    bubbles: true, composed: true, detail: { pointer, value: path },
                }));
            }
        }
    }

    customElements.define('gnr-storetree', GnrStoreTree);
    class GnrRelationTree extends GnrStoreTree {
        _favoriteState() {
            const table = this.getAttribute('table');
            if (!table) return null;
            const key = `gramlot.relationTree.favorites.v1:${table}`;
            if (this._favoritesKey !== key) {
                this._favoritesKey = key;
                this._favorites = [];
                try {
                    const saved = JSON.parse(window.localStorage.getItem(key) || '[]');
                    if (Array.isArray(saved)) this._favorites = saved.filter(item =>
                        item && typeof item.fieldpath === 'string' && typeof item.path === 'string'
                        && typeof item.caption === 'string' && item.attrs && typeof item.attrs === 'object');
                } catch { /* Unavailable storage or invalid saved preferences: use memory. */ }
            }
            return this._favorites;
        }

        _caption(row, caption, path, node) {
            if (node?.getAttr('root_table_caption')) this._tableCaption = node.getAttr('root_table_caption');
            if (!node?.favoriteEntry && node?.getAttr('fieldpath')) {
                const saved = this._favoriteState()?.find(item => item.fieldpath === node.getAttr('fieldpath'));
                if (saved && node.getAttr('fullcaption')) {
                    saved.attrs = {...node.attr};
                    saved.path = path;
                    try { window.localStorage.setItem(this._favoritesKey, JSON.stringify(this._favorites)); } catch {}
                }
                if (this._internalNames) caption = node.label;
            }
            super._caption(row, caption, path, node);
            const favorites = this._favoriteState();
            const fieldpath = node?.getAttr('fieldpath');
            if (!favorites || !fieldpath || node.resolver || node.getAttr('node_kind') === 'group') return;
            const button = document.createElement('button');
            const active = favorites.some(item => item.fieldpath === fieldpath);
            button.type = 'button'; button.className = 'favorite-button';
            if (node.favoriteEntry) button.classList.add('favorite-remove');
            button.textContent = node.favoriteEntry ? '🗑' : active ? '♥' : '♡';
            if (node.favoriteEntry) {
                button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"/></svg>';
            }
            if (!node.favoriteEntry) button.setAttribute('aria-pressed', String(active));
            button.title = `${active ? 'Remove from' : 'Add to'} favorites: ${caption}`;
            button.setAttribute('aria-label', button.title);
            button.addEventListener('click', event => {
                event.preventDefault(); event.stopPropagation();
                const index = this._favorites.findIndex(item => item.fieldpath === fieldpath);
                if (index >= 0) this._favorites.splice(index, 1);
                else this._favorites.push({fieldpath, path, caption, attrs: {...node.attr}});
                try { window.localStorage.setItem(this._favoritesKey, JSON.stringify(this._favorites)); }
                catch { /* Keep the preference usable in memory if storage is blocked. */ }
                this._render();
            });
            row.insertBefore(button, row.querySelector('.node-info'));
        }

        _render() {
            super._render();
            const table = this.getAttribute('table');
            const model = this._root.firstElementChild;
            if (table && model) {
                const ul = document.createElement('ul');
                const li = document.createElement('li');
                const details = document.createElement('details');
                details.className = 'table-root';
                details.open = this._tableOpen !== false;
                details.addEventListener('toggle', () => {
                    if (details.isConnected) this._tableOpen = details.open;
                });
                const summary = document.createElement('summary');
                const label = document.createElement('span');
                label.className = 'caption'; label.textContent = this._internalNames ? table : this._tableCaption || table;
                summary.append(label);
                details.append(summary, model); li.append(details); ul.append(li);
                this._root.append(ul);
            }
            const favorites = this._favoriteState();
            this._renderToolbar();
            if (!favorites?.length) return;
            const ul = document.createElement('ul');
            const li = document.createElement('li');
            const details = document.createElement('details');
            details.className = 'favorites';
            details.open = this._favoritesOpen === true;
            details.addEventListener('toggle', () => {
                if (details.isConnected) this._favoritesOpen = details.open;
            });
            const summary = document.createElement('summary');
            const heart = document.createElement('span');
            heart.className = 'group-icon'; heart.textContent = '♡'; heart.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.className = 'caption group-caption'; label.textContent = 'Preferiti';
            summary.append(heart, label);
            const children = document.createElement('ul');
            for (const item of favorites) {
                const node = {favoriteEntry: true, attr: item.attrs, getAttr: name => item.attrs[name]};
                const caption = this._internalNames ? item.fieldpath : item.attrs.fullcaption || item.fieldpath;
                const row = this._leaf(caption, item.path, node);
                row.title = item.fieldpath;
                children.append(row);
            }
            details.append(summary, children); li.append(details); ul.append(li);
            this._root.insertBefore(ul, this._root.querySelector('.table-root')?.parentElement.parentElement || null);
        }

        _renderToolbar() {
            const toolbar = document.createElement('div'); toolbar.className = 'tree-toolbar';
            const label = document.createElement('label');
            const input = document.createElement('input'); input.type = 'checkbox';
            input.checked = !!this._internalNames;
            input.addEventListener('change', () => { this._internalNames = input.checked; this._render(); });
            label.append(input, document.createTextNode('Internal names'));
            toolbar.append(label); this._root.prepend(toolbar);
        }

        connectedCallback() {
            if (!this.hasAttribute('showAttributes')) this.setAttribute('showAttributes', '');
            if (!this.hasAttribute('typeAttribute')) this.setAttribute('typeAttribute', 'dtype');
            if (!this.hasAttribute('relationAttribute')) this.setAttribute('relationAttribute', 'relation_direction');
            if (!this.style.getPropertyValue('--tree-line-height')) this.style.setProperty('--tree-line-height', '20px');
            if (!this.style.getPropertyValue('--tree-row-padding')) this.style.setProperty('--tree-row-padding', '0px');
            super.connectedCallback();
        }
    }
    customElements.define('gnr-relationtree', GnrRelationTree);
}

registerComponentCollection('storeTree', { components: builtinComponents('storeTree'), defineComponents });
