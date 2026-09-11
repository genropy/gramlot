// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Explicit labeled composition, registered through the layout collection. */
import {WidgetLabel} from './widget-label.js';



export function defineLabledBoxComponent() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-labledbox')) return;
    class GnrLabledBox extends HTMLElement {
        static get observedAttributes() { return ['label', 'label_position']; }

        constructor() {
            super();
            const root=this.attachShadow({mode:'open'});
            const style=document.createElement('style');
            style.textContent=':host{display:block;min-width:0}';
            const content=document.createElement('div');
            content.appendChild(document.createElement('slot'));
            root.append(style,content);
            this._widgetLabel=new WidgetLabel(this,null,content,null,{explicit:true});
        }
        connectedCallback() { this._widgetLabel.connect(); }
        disconnectedCallback() { this._widgetLabel.disconnect(); }
        attributeChangedCallback() { if (this.isConnected) this._widgetLabel.apply(); }
    }
    customElements.define('gnr-labledbox',GnrLabledBox);
}
