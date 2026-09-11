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
        this.button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M12 8h6M12 12h6M12 16h4"/></svg>';
        this.button.title = 'Inspector · Ctrl+Shift+D';
        this.button.setAttribute('aria-label', 'Open inspector');
        this.button.setAttribute('aria-keyshortcuts', 'Control+Shift+D');
        this.button.style.cssText = 'font:16px system-ui;color:inherit;background:transparent;border:1px solid currentColor;border-radius:5px;padding:4px 8px;cursor:pointer;margin:8px;';
        this.launch = () => this.toggle().catch(error => {
            this.button.title = `Inspector: ${error.message}`;
            host.dispatchEvent(new CustomEvent('gramlot-inspector-error', {detail: {error}, bubbles: true, composed: true}));
        });
        this.button.addEventListener('click', this.launch);
        host.append(this.button);
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
                this.application.target.root.append(element);
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
