// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {registerCollection, webcomponent} from '../collections.js';
import {WidgetLabel} from '../widget-label.js';

function defineComponents() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-copybutton')) return;
    class CopyButton extends HTMLElement {
        static observedAttributes = ['disabled', 'value'];
        constructor() {
            super();
            this.attachShadow({mode:'open'}).innerHTML = `<style>
                :host{display:inline-flex;align-items:center;gap:6px;font:inherit}
                :host([hidden]){display:none}
                button{font:inherit;width:28px;height:26px;border:1px solid #b8bec6;
                    border-radius:3px;background:#f5f6f8;color:#465261;cursor:pointer;padding:4px}
                button:disabled{opacity:.55;cursor:default}
                button:focus-visible{outline:2px solid #3977ad;outline-offset:2px}
                svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7}
                [role=status]{font-size:12px;color:#52606d}
            </style><button type="button"></button><span role="status" aria-live="polite"></span>`;
            this._button = this.shadowRoot.querySelector('button');
            this._status = this.shadowRoot.querySelector('[role=status]');
            this._widgetLabel = new WidgetLabel(this, this._button, [this._button, this._status], null,
                {contentStyle: {display:'flex', alignItems:'center', gap:'6px'}});
            this._button.addEventListener('click', () => this.copy());
        }
        connectedCallback() { this._widgetLabel.connect(); this._show('Copy to clipboard'); }
        disconnectedCallback() { this._widgetLabel.disconnect(); clearTimeout(this._timer); this._generation = (this._generation || 0) + 1; this._busy = false; }
        attributeChangedCallback() { if (this._button) this._button.disabled = this.hasAttribute('disabled') || this._busy; }
        _show(label, copied = false) {
            this._button.title = label;
            this._button.setAttribute('aria-label', label);
            this._button.innerHTML = copied
                ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 10 4 4 10-10"/></svg>'
                : '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="6" width="10" height="12" rx="1"/><path d="M4 14H2V2h10v2"/></svg>';
            this._button.disabled = this.hasAttribute('disabled') || this._busy;
        }
        async copy() {
            if (this.hasAttribute('disabled') || this._busy) return;
            const generation = this._generation = (this._generation || 0) + 1;
            clearTimeout(this._timer);
            this._busy = true; this._show('Copying'); this._status.textContent = '';
            try {
                const clipboard = this.ownerDocument.defaultView.navigator.clipboard;
                if (!clipboard?.writeText) throw new Error('Clipboard API unavailable');
                await clipboard.writeText(this.getAttribute('value') ?? '');
                if (!this.isConnected || generation !== this._generation) return;
                this._busy = false; this._show('Copied', true); this._status.textContent = 'Copied';
                this.dispatchEvent(new CustomEvent('gnr-copied', {bubbles:true, composed:true}));
                this._timer = setTimeout(() => { this._status.textContent = ''; this._show('Copy to clipboard'); }, 1600);
            } catch (error) {
                if (!this.isConnected || generation !== this._generation) return;
                this._busy = false; this._show('Retry copy'); this._status.textContent = 'Copy failed. Try again.';
                this.dispatchEvent(new CustomEvent('gnr-copy-error', {detail:{error}, bubbles:true, composed:true}));
            }
        }
    }
    customElements.define('gnr-copybutton', CopyButton);
}
registerCollection('clipboard', {grammar:{elements:{copyButton:webcomponent('copybutton')}}, defineComponents});
