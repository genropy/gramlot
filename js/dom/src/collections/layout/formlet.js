// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Standalone field layout, registered through the layout collection. */



export function defineFormletComponent() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-formlet')) return;
    class GnrFormlet extends HTMLElement {
        static get observedAttributes() { return ['columns', 'col_min_width']; }
        constructor() {
            super();
            const shadow = this.attachShadow({mode:'open'});
            const style = document.createElement('style');
            style.textContent = ':host{display:block;min-width:0;box-sizing:border-box;gap:7px 20px;padding:7px}'
                + '.fields{display:grid;min-width:0;gap:inherit;align-items:start}'
                + 'slot{display:contents}::slotted(*){min-width:0}';
            this._fields = document.createElement('div');
            this._fields.className = 'fields';
            this._fields.appendChild(document.createElement('slot'));
            shadow.append(style, this._fields);
        }
        connectedCallback() { this._layout(); }
        attributeChangedCallback() { this._layout(); }
        _layout() {
            const minimum = this.getAttribute('col_min_width');
            const columns = this.getAttribute('columns') || '1';
            this._fields.style.gridTemplateColumns = minimum
                ? `repeat(auto-fit, minmax(min(100%, ${minimum}), 1fr))`
                : /^\d+$/.test(columns) ? `repeat(${columns}, minmax(0, 1fr))` : columns;
        }
    }
    customElements.define('gnr-formlet', GnrFormlet);
}
