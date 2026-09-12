// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Shortcuts} from './shortcuts.js';

// Keyboard ownership only: entries are removed on application disposal.
const documentControllers = new WeakMap();

/** Lightweight page service. The inspector module, recipe and DOM are lazy. */
export class InspectorController {
    constructor(application) {
        this.application = application;
        this.element = null;
        this.disposed = false;
        this.pending = null;
        this.presentation = application.options.inspector?.presentation || 'floating';
        const host = application.target.root;
        this.button = host.ownerDocument.createElement('button');
        this.button.type = 'button';
        this.button.className = 'gramlot-inspector-launcher';
        this.button.textContent = '🔍 Open inspector';
        this.button.title = 'Inspector · Ctrl+Shift+D';
        this.button.setAttribute('aria-label', 'Open inspector');
        this.button.setAttribute('aria-keyshortcuts', 'Control+Shift+D');
        this.button.style.cssText = 'font:300 11px system-ui;color:#9ba3af;background:transparent;border:0;padding:3px 0;cursor:pointer;margin:3px 0;';
        this.launch = () => this.toggle().catch(error => {
            this.button.title = `Inspector: ${error.message}`;
            host.dispatchEvent(new CustomEvent('gramlot-inspector-error', {detail: {error}, bubbles: true, composed: true}));
        });
        this.button.addEventListener('click', this.launch);
        if (application.options.inspector?.launcher !== false) host.append(this.button);
        this.owners = documentControllers.get(host.ownerDocument) || new Set();
        documentControllers.set(host.ownerDocument, this.owners);
        this.owners.add(this);
        this.shortcuts = new Shortcuts(host.ownerDocument);
        this.shortcuts.register('inspector.toggle', 'ctrl+shift+d', this.launch, {
            allowEditing: true,
            when: event => {
                // The innermost application containing the keyboard event wins.
                const path = event.composedPath();
                const owner = path.flatMap(node => [...this.owners].filter(item => item.application.target.root === node))[0];
                return (owner || this.owners.values().next().value) === this;
            },
        });
    }
    get presentation() { return this._presentation; }
    set presentation(value) {
        if (!['floating', 'embedded'].includes(value)) throw new Error('Inspector presentation must be floating or embedded');
        if (this.pending && value !== this._presentation) throw new Error('Set inspector presentation before first opening');
        this._presentation = value;
    }
    get opened() { return this.element?.opened ?? false; }
    async _create() {
        if (this.disposed) return null;
        if (!this.pending) {
            this.pending = import('./inspector-component.js').then(async ({createInspector}) => {
                if (this.disposed) return null;
                const element = createInspector(this.application, this.presentation);
                this.element = element;
                const root = this.application.target.root;
                const selector = this.application.options.inspector?.target;
                const destination = selector ? root.querySelector(selector) : root;
                if (!destination) throw new Error(`Inspector destination not found: ${selector}`);
                destination.append(element);
                try { await element.initialize(); }
                catch (error) { element.remove(); this.element = null; throw error; }
                return this.disposed ? null : element;
            }).catch(error => { this.pending = null; throw error; });
        }
        return this.pending;
    }
    async open() { const element = await this._create(); if (element) element.opened = true; return element; }
    async toggle() {
        // Existing hosts may have explicitly mounted the legacy inspector API.
        if (!this.element && this.application.dev?.inspector) {
            this.application.dev.inspector.shortcuts.execute('inspector.toggle');
            return null;
        }
        const element = await this._create(); if (element) element.opened = !element.opened; return element; }
    close() { if (this.element) this.element.opened = false; }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.shortcuts.dispose();
        this.owners.delete(this);
        this.button.removeEventListener('click', this.launch);
        this.button.remove();
        this.element?.dispose();
        this.element?.remove();
    }
}
