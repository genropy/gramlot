// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {registerComponentCollection, getCollection} from 'gramlot-dom';
import {fromTytx} from 'genro-tytx';
import {mountInspector} from './inspector.js';

/** Inspector owns its UI, while application owns the inspected live Bags. */
export class GramlotInspector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.application = null;
        this.tool = null;
        this.disposed = false;
    }
    async initialize() {
        const embedded = this.getAttribute('presentation') === 'embedded';
        this.hidden = embedded;
        const filename = embedded ? './inspector-embedded.tytx' : './inspector.tytx';
        const response = await fetch(new URL(filename, import.meta.url));
        if (!response.ok) throw new Error(`Inspector recipe unavailable (${response.status})`);
        const recipe = await response.text();
        if (this.disposed || this.application._disposed) return;
        this.tool = mountInspector(this.shadowRoot, fromTytx(recipe, 'json'), this.application, {shortcuts: false});
        if (!this.tool) return;
        this.shadowRoot.querySelector('[data-inspector="toggle"]').hidden = true;
        const style = this.ownerDocument.createElement('link');
        style.rel = 'stylesheet';
        style.href = new URL('./inspector-theme.css', import.meta.url).href;
        this.shadowRoot.append(style);
        let lastOpened = this.opened;
        this.onState = () => {
            if (this.opened === lastOpened) return;
            lastOpened = this.opened;
            if (embedded) this.hidden = !lastOpened;
            this.dispatchEvent(new CustomEvent('gramlot-inspector-change', {
                detail: {opened: lastOpened}, bubbles: true, composed: true,
            }));
        };
        this.tool.app.builder.data.subscribe('inspector-component-state', {any: this.onState});
    }
    get opened() { return Boolean(this.tool?.app.builder.data.getItem('opened')); }
    set opened(value) {
        if (this.tool && !this.disposed) this.tool.app.live(() => this.tool.app.builder.data.setItem('opened', Boolean(value)));
    }
    disconnectedCallback() { this.dispose(); }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.tool?.app.builder.data.unsubscribe('inspector-component-state', {any: true});
        this.tool?.dispose();
    }
}
registerComponentCollection('inspector', {
    components:[{name:'inspector', tag:'gramlot-inspector', capabilities:['application-tool']}],
    defineComponents() {
        if (!customElements.get('gramlot-inspector')) customElements.define('gramlot-inspector', GramlotInspector);
    },
});
// The tool host explicitly imports this module; preserve its immediate activation.
getCollection('inspector').defineComponents();
export function createInspector(application, presentation = 'floating') {
    const component = application.target.root.ownerDocument.createElement('gramlot-inspector');
    component.application = application;
    component.setAttribute('presentation', presentation);
    if (presentation === 'embedded') {
        component.hidden = true;
        component.setAttribute('role', 'region');
        component.setAttribute('aria-label', 'Inspector');
    }
    return component;
}
