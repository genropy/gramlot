// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Internal shared null state: native controls cannot represent null themselves. */
export class InputNullState {
    constructor(host, input) {
        this.host = host;
        this.input = input;
        this.isNull = false;
        this.pending = false;
        this.description = input.getAttribute('aria-description');
        const style = host.ownerDocument.createElement('style');
        style.textContent = `
.gnr-null-editor{position:relative}
.gnr-null-editor:has(input.gnr-null-value[type=range])::after{content:'∅';position:absolute;left:3px;top:0;color:#949ca6;background:var(--field-bg,#fff);font:19px sans-serif;pointer-events:none}
input.gnr-null-value{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='5' y='18' fill='%23949ca6' font-size='19'%3E%E2%88%85%3C/text%3E%3C/svg%3E")!important;background-repeat:no-repeat!important;background-position:left center!important}
input.gnr-null-value::placeholder{color:transparent}
input.gnr-null-value[type=checkbox]{appearance:none;width:24px;height:24px;border:1px solid #c8c8c8}
input.gnr-null-value[type=color]::-webkit-color-swatch{opacity:0}
input.gnr-null-value[type=color]::-moz-color-swatch{opacity:0}
input.gnr-null-value[type=range]::-webkit-slider-thumb{opacity:.2}
input.gnr-null-value[type=range]::-moz-range-thumb{opacity:.2}
input.gnr-null-value:is([type=date],[type=time])::-webkit-datetime-edit{opacity:0}
`;
        host.shadowRoot.append(style);
        for (const name of ['click', 'pointerdown']) input.addEventListener(name, event => {
            if (host.hasAttribute('readonly')) event.preventDefault();
        });
        input.addEventListener('keydown', event => {
            if (host.hasAttribute('readonly') && ['checkbox','range','color'].includes(input.type) && event.key !== 'Tab') {
                event.preventDefault();
                return;
            }
            if (event.key !== 'Backspace' || event.repeat || event.isComposing || this.locked) return;
            const scalarControl = ['checkbox', 'range', 'color'].includes(input.type);
            if (!scalarControl && (input.value !== '' || input.validity.badInput)) return;
            event.preventDefault();
            this.clear();
        });
        input.addEventListener('input', () => {
            this.setNull(false);
        });
        input.addEventListener('change', () => {
            if (!this.pending) this.setNull(false);
            this.pending = false;
        });
        input.addEventListener('blur', () => {
            if (!this.pending || this.locked) return;
            this.pending = false;
            host.dispatchEvent(new Event('change', {bubbles:true, composed:true}));
        });
    }
    get locked() {
        return this.host.hasAttribute('disabled') || this.host.hasAttribute('readonly') || this.input.disabled || this.input.readOnly;
    }
    connect() {
        this.input.parentElement?.classList.add('gnr-null-editor');
        this.setNull(this.isNull);
    }
    setNull(value) {
        this.isNull = value;
        this.input.classList.toggle('gnr-null-value', value);
        if (this.input.type === 'checkbox') this.input.indeterminate = value;
        if (value) {
            this.input.setAttribute('aria-description', 'Null value. Enter or select a value to replace it.');
        } else if (this.description != null) this.input.setAttribute('aria-description', this.description);
        else this.input.removeAttribute('aria-description');
    }
    clear() {
        if (this.locked) return;
        if (this.input.type === 'checkbox') this.host.checked = null;
        else this.host.value = null;
        this.pending = true;
        this.host.dispatchEvent(new Event('input', {bubbles:true, composed:true}));
    }
}
