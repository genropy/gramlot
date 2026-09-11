// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

export class GuideGreeting extends HTMLElement {
    static observedAttributes = ['name'];

    constructor() {
        super();
        this.attachShadow({mode: 'open'}).innerHTML = `
            <style>button { color: var(--guide-greeting-color, #243b53); }</style>
            <button type="button"></button>
        `;
        this._onClick = () => this.dispatchEvent(new CustomEvent('greet', {
            bubbles: true,
            composed: true,
            detail: {name: this.name},
        }));
    }

    connectedCallback() {
        this.shadowRoot.querySelector('button').addEventListener('click', this._onClick);
        this.render();
    }

    disconnectedCallback() {
        this.shadowRoot.querySelector('button').removeEventListener('click', this._onClick);
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.querySelector('button').textContent = `Hello, ${this.name}!`;
    }

    get name() {
        return this.getAttribute('name') || 'world';
    }

    set name(value) {
        if (value === null || value === undefined) this.removeAttribute('name');
        else this.setAttribute('name', String(value));
    }
}

export function defineGreeting() {
    if (!customElements.get('gnr-guidegreeting')) {
        customElements.define('gnr-guidegreeting', GuideGreeting);
    }
}
