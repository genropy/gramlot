// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * colorpicker — a composite web-component widget (JS port of ws-web
 * resources/components/colorpicker). Same native contract as the inputs:
 * a `value` property + composed bubbling `input` events, shadow-DOM
 * <input type=color>. Plugged with `wc_requires = ['colorpicker']`.
 */
import {InputNullState} from '../input-null-state.js';
import {WidgetLabel} from '../widget-label.js';
import { registerCollection, webcomponent } from '../collections.js';

const GRAMMAR = { elements: { colorpicker: webcomponent('colorpicker') } };

function defineComponents() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-colorpicker')) {
        return;
    }

    class GnrColorpicker extends HTMLElement {
        static get observedAttributes() { return ['value', 'disabled', 'readonly']; }

        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = ':host { display: inline-block; }';
            root.appendChild(style);
            this._input = document.createElement('input');
            this._input.type = 'color';
            root.appendChild(this._input);
            this._nullState = new InputNullState(this, this._input);
            this._widgetLabel = new WidgetLabel(this, this._input, [this._input]);
            // `change` is not composed; re-emit it on the host (see inputs.js).
            this._input.addEventListener('change', () => {
                this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            });
        }

        connectedCallback() {
            this._widgetLabel.connect();
            if (this.hasAttribute('value') && !this._nullState.isNull) { this.value = this.getAttribute('value'); }
            this._input.disabled = this.hasAttribute('disabled');
            this._input.readOnly = this.hasAttribute('readonly');
            this._nullState.connect();
        }

        disconnectedCallback() { this._widgetLabel.disconnect(); }

        attributeChangedCallback(name, _old, fresh) {
            if (name === 'value') {
                const focused = this.shadowRoot && this.shadowRoot.activeElement === this._input;
                if (!focused) this.value = fresh;
            } else if (name === 'disabled') this._input.disabled = fresh !== null;
            else if (name === 'readonly') this._input.readOnly = fresh !== null;
        }

        get value() { return this._nullState.isNull ? null : this._input.value; }

        set value(v) { this._input.value = v ?? '#000000'; this._nullState.setNull(v === null); }
    }

    customElements.define('gnr-colorpicker', GnrColorpicker);
}

registerCollection('colorpicker', { grammar: GRAMMAR, defineComponents });
