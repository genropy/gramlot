// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {ControlTools} from './control-tools.js';
import {setFieldState} from './field-state.js';
import {InputNullState} from '../input-null-state.js';
import {WidgetLabel, WIDGET_LABEL_CSS} from '../collections/decoration/widget-label.js';

/** Narrow decoration capability. Requires a lifecycle base and explicit installation.
 * Existing WidgetLabel owns markup, attribute routing and observation. */
export const Decorated = Base => class extends Base {
    installDecoration(control, content, existing = {}, options = {}) {
        if (this._widgetLabel) throw new Error('Decoration already installed');
        this._widgetLabel = new WidgetLabel(this, control, content, existing, options);
    }
    get decoration() { return this._widgetLabel; }
    connectedCallback() { super.connectedCallback(); this.decoration?.connect(); }
    disconnectedCallback() { this.decoration?.disconnect(); super.disconnectedCallback(); }
};

/** Adds a public presentation adapter, without validation policy or Data writes. */
export const FieldState = Base => class extends Base {
    setFieldState(state) { setFieldState(this, state); }
};

const realms = new WeakMap();
/** Call after the DOM exists; importing this module is safe on the server.
 * Bases are cached per HTMLElement constructor, including independent DOM realms. */
export function getComponentBases(Element = globalThis.HTMLElement) {
    if (!Element) throw new Error('A DOM HTMLElement constructor is required');
    if (realms.has(Element)) return realms.get(Element);
    class GramlotElement extends Element {
        constructor() { super(); this._connectionDisposers = []; }
        connectedCallback() {
            if (this._componentConnected) return;
            this._componentConnected = true;
            this.onConnect();
        }
        disconnectedCallback() {
            if (!this._componentConnected) return;
            this._componentConnected = false;
            try { this.onDisconnect(); }
            finally { for (const dispose of this._connectionDisposers.splice(0).reverse()) dispose(); }
        }
        onConnect() {}
        onDisconnect() {}
        ownConnection(dispose) {
            if (typeof dispose !== 'function') throw new TypeError('Expected a disposer');
            this._connectionDisposers.push(dispose);
            return dispose;
        }
    }
    class ControlElement extends FieldState(Decorated(GramlotElement)) {
        static get observedAttributes() {
            return ['value', 'placeholder', 'lbl', 'disabled', 'readonly'];
        }

        get inputType() { return 'text'; }
        get permanentDecoration() { return true; }
        get controlCss() { return CSS; }

        _createControl() { return this.ownerDocument.createElement('input'); }

        _configure(_input) {}

        _buildContent(content) { content.appendChild(this._controlTools?.element || this._input); }

        installTools(options) {
            if(this._controlTools) throw new Error('Control tools already installed');
            this._controlTools = new ControlTools(this, this._input, options);
            if(this._componentConnected) this._controlTools.connect();
            return this._controlTools;
        }

        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = this.ownerDocument.createElement('style');
            style.textContent = this.controlCss;
            root.appendChild(style);

            this._box = this.ownerDocument.createElement('div');
            this._box.className = 'labledBox labledBox_left';
            this._label = this.ownerDocument.createElement('label');
            this._label.className = 'labledBox_label';
            this._label.htmlFor = 'f';
            this._content = this.ownerDocument.createElement('div');
            this._content.className = 'labledBox_content';
            this._input = this._createControl();
            this._input.id = 'f';
            if (this.inputType) this._input.type = this.inputType;
            this._configure(this._input);
            this._buildContent(this._content);
            this._nullState = new InputNullState(this, this._input);

            // `input` is composed and crosses the shadow on its own; `change`
            // is NOT composed, so re-emit it on the host so `updateOn:'blur'`
            // and the checkbox reach the kernel's delegated listener.
            this._input.addEventListener('change', () => {
                this.dispatchEvent(new this.ownerDocument.defaultView.Event('change', { bubbles: true, composed: true }));
            });

            this._box.appendChild(this._label);
            this._box.appendChild(this._content);
            if (this.permanentDecoration) {
                root.appendChild(this._box);
                this.installDecoration(this._input, this._content, {box: this._box, label: this._label});
            } else {
                root.appendChild(this._input);
                this.installDecoration(this._input, [this._input]);
            }
        }

        connectedCallback() {
            if (this._componentConnected) return;
            super.connectedCallback();
            // observedAttributes already applies markup values. Replaying the
            // attribute here would overwrite a typed property set before mount.
            if (this.hasAttribute('placeholder')) {
                this._input.placeholder = this.getAttribute('placeholder');
            }
            this._applyLbl();
            this._input.disabled = this.hasAttribute('disabled');
            this._input.readOnly = this.hasAttribute('readonly');
            this._nullState.connect();
            this._controlTools?.connect();
        }

        attributeChangedCallback(name, _old, fresh) {
            if (name === 'value') {
                // Focused inner input is sovereign: never overwrite typing.
                const focused = this.shadowRoot && this.shadowRoot.activeElement === this._input;
                if (!focused && this._input.value !== fresh) {
                    this.value = fresh;
                }
            } else if (name === 'placeholder') {
                this._input.placeholder = fresh == null ? '' : fresh;
            } else if (name === 'lbl') {
                this._applyLbl();
            } else if (name === 'disabled') {
                this._input.disabled = fresh !== null;
            } else if (name === 'readonly') {
                this._input.readOnly = fresh !== null;
            }
            this._controlTools?.sync();
        }

        disconnectedCallback() { this._controlTools?.disconnect(); super.disconnectedCallback(); }

        _applyLabelAttributes() { this._widgetLabel?.apply(); }

        _applyLbl() { this._widgetLabel?.apply(); }

        get fieldControl() { return this._input; }

        get isNullValue() { return this._nullState.isNull; }

        get value() { return this._nullState.isNull ? null : this._input.value; }

        set value(v) { this._input.value = v == null ? '' : v; this._nullState.setNull(v === null); }
    }

    const bases = {GramlotElement, ControlElement};
    realms.set(Element, bases);
    return bases;
}

const CSS =
    ':host { display: inline-block; }'
    + WIDGET_LABEL_CSS
    + 'input,textarea { font: inherit; color: inherit; box-sizing: border-box; width: 100%;'
    + '  background: var(--field-bg, #fff); border: 1px solid var(--field-border, #c8c8c8);'
    + '  border-radius: var(--form-field-radius, 3px); padding: 3px 6px; min-height: 25px; }'
    + 'input:focus,textarea:focus { outline: none; border-color: var(--field-focus-border, #4a90d9); }'
    + 'textarea { resize: vertical; }'
    + ':host(gnr-numbertextbox) input { text-align: right; }'
    + '.gnr-checkbox-content { display: flex; align-items: center; gap: 6px; }'
    + '.gnr-checkbox-content input { width: auto; flex: none; min-height: 0; accent-color: var(--accent-color, #356f9f); }';
