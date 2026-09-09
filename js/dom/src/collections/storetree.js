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
 * Bag to redraw on change (the GnrStoreBag model). The engine does NOT
 * re-render it (it is kept out of the pointer_map, see builder-base
 * runtimeValues).
 *
 * Authoring:
 *   pane.storeTree({ store: '^data.folders', labelAttribute: 'caption' })
 *
 * A node whose value is a Bag is a BRANCH (expandable, <details>); otherwise
 * a LEAF. The row caption is `node.getAttr(labelAttribute)` (default
 * 'caption'), falling back to the node label.
 *
 * v1 boundary (later strata, all in the legacy widget): selection write-back,
 * checkbox tri-state, search/filter, lazy-on-expand, drag & drop.
 */
import { Bag } from 'genro-bag-js';

import { registerCollection, webcomponent } from '../collections.js';
import {WidgetLabel} from '../widget-label.js';

const GRAMMAR = {
    elements: {
        storeTree: webcomponent('storeTree', { dataWidget: true }),
    },
};

const CSS = `
:host { display:block; font:inherit; color:inherit; }
ul { list-style:none; margin:0; padding-left:17px; }
div > ul { padding-left:2px; }
li { line-height:1.7; }
summary { display:flex; align-items:center; gap:7px; padding:2px 5px; cursor:pointer; user-select:none; list-style:none; }
summary::-webkit-details-marker { display:none; }
summary::before { content:''; width:5px; height:5px; border-right:1.5px solid #78818a; border-bottom:1.5px solid #78818a; transform:rotate(-45deg); flex:none; margin:0 3px; }
details[open] > summary::before { transform:rotate(45deg); }
.leaf { padding:2px 5px 2px 23px; cursor:pointer; }
summary:hover,.leaf:hover { background:#f0f3f6; }
.selected { background:var(--tree-selected-bg,#e4edf6); border-radius:2px; }
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
            root.appendChild(this._root);
            this._widgetLabel = new WidgetLabel(this, null, this._root);
            this._expanded = new Set();
            this._selectedPath = null;
            this._selectedEl = null;
            seq += 1;
            this._subId = `gnr-storetree-${seq}`;
        }

        get storeBag() { return this._store; }

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
                const value = node.getValue();
                ul.appendChild(
                    value instanceof Bag
                        ? this._branch(value, path, caption)
                        : this._leaf(caption, path),
                );
            }
            return ul;
        }

        _branch(childBag, path, caption) {
            const li = document.createElement('li');
            const details = document.createElement('details');
            details.open = this._expanded.has(path);
            details.addEventListener('toggle', () => {
                if (details.open) { this._expanded.add(path); } else { this._expanded.delete(path); }
            });
            const summary = document.createElement('summary');
            summary.textContent = caption;
            if (path === this._selectedPath) { summary.classList.add('selected'); }
            summary.addEventListener('click', () => this._select(path, summary));
            details.appendChild(summary);
            details.appendChild(this._buildLevel(childBag, path));
            li.appendChild(details);
            return li;
        }

        _leaf(caption, path) {
            const li = document.createElement('li');
            li.className = 'leaf';
            li.textContent = caption;
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
}

registerCollection('storeTree', { grammar: GRAMMAR, defineComponents });
