// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Test helper: install a real DOM (jsdom) as globals, so the renderer
// and DomTarget run against a genuine DOM in Node — no hand-written stub.
import { JSDOM } from 'jsdom';

export function setupDom() {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    // Web-component collections define custom elements: expose the DOM
    // globals their classes and registration need.
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.customElements = dom.window.customElements;
    globalThis.Event = dom.window.Event;
    globalThis.CustomEvent = dom.window.CustomEvent;
    globalThis.CSS = dom.window.CSS || {};
    if (!globalThis.CSS.escape) {
        // jsdom does not implement CSS.escape; ids are simple (n1, n2…).
        globalThis.CSS.escape = (s) => String(s);
    }
    return dom;
}
