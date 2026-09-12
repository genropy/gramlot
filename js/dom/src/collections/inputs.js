// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * inputs — text-like input widgets as web components (JS port of ws-web
 * resources/components/inputs). One shared base `GnrInput` (shadow-DOM
 * <input>) + one type per tag; checkbox is the special citizen (`checked`).
 *
 * Contract: a `value` property + composed bubbling `input` events. Shadow
 * retargeting makes the HOST the event target, so the kernel's delegated
 * listener (Application._enableInput) sees one element with id + value.
 * Anti-echo at the widget too: a focused inner input is sovereign — an
 * incoming value never overwrites what the user is typing.
 *
 * A page plugs this family with `wc_requires = ['inputs']`. The custom
 * elements are defined lazily (in defineComponents), so importing this
 * module needs no DOM.
 */
import {defineDbSelect} from './db-select.js';
import {getComponentBases} from '../components/bases.js';
import {defineDateCalendar} from './date-calendar.js';
import {NumberEditor} from './number-editor.js';
import {SymbolicDateEditor} from './symbolic-date-editor.js';
import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';



function defineComponents() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-textbox')) {
        return;
    }

    const {ControlElement: GnrInput} = getComponentBases();
    defineDateCalendar();

    class GnrTextBox extends GnrInput { get inputType() { return 'text'; } }

    class GnrTextBoxArea extends GnrInput {
        static get observedAttributes() {
            return [...super.observedAttributes, 'rows', 'cols', 'maxlength', 'minlength',
                'wrap', 'autocomplete', 'remaininghint'];
        }

        static get forwardedAttributes() {
            return new Set(['rows', 'cols', 'maxlength', 'minlength', 'wrap', 'autocomplete']);
        }

        get inputType() { return null; }

        _createControl() { return document.createElement('textarea'); }

        static remainingThreshold(hint, maximum) {
            if (maximum === null || maximum === undefined || maximum === '') return null;
            const limit = Number(maximum);
            if (!Number.isInteger(limit) || limit < 0 || hint === null || hint === undefined) {
                return null;
            }
            const source = String(hint).trim();
            const percentage = source.match(/^(\d+(?:\.\d+)?)%$/);
            if (percentage) {
                const amount = Number(percentage[1]);
                if (amount > 100) throw new Error(`Invalid remainingHint percentage: ${hint}`);
                return limit * amount / 100;
            }
            if (/^\d+$/.test(source)) {
                const threshold = Number(source);
                if (Number.isSafeInteger(threshold)) return threshold;
                throw new Error(`Invalid remainingHint integer: ${hint}`);
            }
            throw new Error(`Invalid remainingHint: ${hint}`);
        }

        _validateAttributes(attrs) {
            this.constructor.remainingThreshold(attrs.remainingHint, attrs.maxlength);
        }

        _buildContent(content) {
            super._buildContent(content);
            this._remaining = document.createElement('small');
            this._remaining.id = 'remaining';
            this._remaining.hidden = true;
            this._remaining.style.cssText = 'display:block;margin-top:2px;text-align:right;'
                + 'color:var(--field-hint-color,#626770);font-size:var(--field-hint-font-size,11px)';
            content.appendChild(this._remaining);
            this._input.addEventListener('input', () => this._updateRemaining());
        }

        connectedCallback() {
            super.connectedCallback();
            for (const name of this.constructor.forwardedAttributes) {
                this._forwardAttribute(name, this.getAttribute(name));
            }
            this._updateRemaining();
        }

        attributeChangedCallback(name, oldValue, fresh) {
            if (this.constructor.forwardedAttributes.has(name)) {
                this._forwardAttribute(name, fresh);
                this._updateRemaining();
                return;
            }
            super.attributeChangedCallback(name, oldValue, fresh);
            this._updateRemaining();
        }

        _forwardAttribute(name, value) {
            if (!this._input) return;
            if (value === null) this._input.removeAttribute(name);
            else this._input.setAttribute(name, value);
        }

        _updateRemaining() {
            if (!this._remaining || !this._input) return;
            const raw = this.getAttribute('maxlength');
            const maximum = raw === null ? NaN : Number(raw);
            const hasLimit = Number.isInteger(maximum) && maximum >= 0;
            const hint = this.getAttribute('remaininghint');
            const threshold = this.constructor.remainingThreshold(hint, raw);
            const remaining = hasLimit ? maximum - this._input.value.length : null;
            const enabled = threshold !== null && remaining <= threshold;
            this._remaining.hidden = !enabled;
            const described = new Set((this._input.getAttribute('aria-describedby') || '')
                .split(/\s+/).filter(Boolean));
            if (!enabled) {
                described.delete(this._remaining.id);
                this._remaining.textContent = '';
            } else {
                described.add(this._remaining.id);
                this._remaining.textContent = remaining >= 0
                    ? `${remaining} character${remaining === 1 ? '' : 's'} remaining`
                    : `${-remaining} character${remaining === -1 ? '' : 's'} over limit`;
            }
            if (described.size) this._input.setAttribute('aria-describedby', [...described].join(' '));
            else this._input.removeAttribute('aria-describedby');
        }

        get value() { return super.value; }

        set value(value) { super.value = value; this._updateRemaining(); }
    }

    /** Local legacy values syntax: code:caption pairs separated by comma/newline.
     * A themed listbox supplies suggestions; filteringSelect commits only known
     * choices (code stored, caption displayed), comboBox commits free text.
     * Storepath, remote search and legacy validation hooks are not implemented.
     */
    class GnrComboBox extends GnrInput {
        static get observedAttributes() { return [...super.observedAttributes, 'values']; }
        get constrained() { return false; }
        getSelectionValidity(value) {
            if (!this.constrained || value==null || value==='') return true;
            return this.options.some(option=>option.id===value);
        }
        _configure(input) {
            this._committed = '';
            input.setAttribute('role', 'combobox');
            input.setAttribute('aria-autocomplete', 'list');
            input.setAttribute('aria-controls', 'choices');
            input.setAttribute('aria-expanded', 'false');
            input.setAttribute('autocomplete', 'off');
            input.addEventListener('input', event => {
                // Do not send an unvalidated caption down the value binding.
                event.stopPropagation();
                input.setCustomValidity('');
                input.removeAttribute('aria-invalid');
                this._error.textContent = '';
                if (!event.isComposing) this._open(input.value);
            });
            input.addEventListener('keydown', event => {
                if (event.isComposing || input.disabled || input.readOnly) return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault(); event.stopPropagation();
                    if (!this._opened) this._open('');
                    else this._activate(this._active + (event.key === 'ArrowDown' ? 1 : -1));
                } else if (event.key === 'Enter' && this._opened) {
                    event.preventDefault(); event.stopPropagation();
                    if (this._filtered[this._active]) this._choose(this._filtered[this._active]);
                } else if (event.key === 'Escape' && this._opened) {
                    event.preventDefault(); event.stopPropagation(); this._close();
                } else if (event.key === 'Tab') this._close();
            });
            input.addEventListener('blur', () => this._close());
            input.addEventListener('change', event => {
                event.stopImmediatePropagation();
                if (input.disabled || input.readOnly) return;
                const text = input.value;
                if (text !== '') this._nullState.setNull(false);
                const matches = this._picked ? [this._picked] : this.options.filter(option => option.caption === text);
                this._picked = null;
                if (this.constrained && text && matches.length !== 1) {
                    input.setCustomValidity('Scegli una voce dell’elenco.');
                    input.setAttribute('aria-invalid', 'true');
                    this._error.textContent = 'Scegli una voce dell’elenco.';
                    return;
                }
                this._committed = this._nullState.isNull ? null : (this.constrained ? (matches[0]?.id ?? '') : text);
                input.setCustomValidity('');
                input.removeAttribute('aria-invalid');
                this._error.textContent = '';
                this.dispatchEvent(new Event('change', {bubbles:true, composed:true}));
            });
        }
        _buildContent(content) {
            super._buildContent(content);
            const style = document.createElement('style');
            style.textContent = `
                .labledBox_content{position:relative}input{padding-right:25px}
                .choice-toggle{position:absolute;right:1px;top:1px;width:23px;height:23px;
                    border:0;border-left:1px solid var(--field-border,#c8c8c8);border-radius:0 2px 2px 0;
                    background:var(--choice-button-bg,#f1f2f4);color:var(--choice-arrow,#626770);cursor:pointer}
                .choice-toggle:after{content:'';display:block;width:5px;height:5px;
                    border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;
                    transform:rotate(45deg);margin:0 auto 3px}
                .choice-toggle:hover{background:var(--choice-hover,#e7edf4)}
                .choices{position:fixed;inset:auto;margin:0;padding:3px 0;box-sizing:border-box;
                    background:var(--choice-bg,#fff);color:var(--choice-color,#30343b);
                    border:1px solid var(--field-border,#b8bec6);border-radius:3px;
                    box-shadow:0 3px 9px #0002;font:inherit;font-size:13px;overflow:auto;z-index:10000}
                .choices[hidden]{display:none!important}
                .choice{padding:4px 9px;line-height:18px;cursor:pointer;white-space:nowrap}
                .choice:hover,.choice[aria-selected=true]{background:var(--choice-selected-bg,#e3edf8);color:var(--choice-selected-color,#203e60)}
                .choice-empty{padding:5px 9px;color:#777}
            `;
            content.append(style);
            this._toggle = document.createElement('button');
            this._toggle.type = 'button';
            this._toggle.className = 'choice-toggle';
            this._toggle.tabIndex = -1;
            this._toggle.setAttribute('aria-label', 'Show options');
            this._toggle.addEventListener('mousedown', event => event.preventDefault());
            this._toggle.addEventListener('click', () => {
                if (this._input.disabled || this._input.readOnly) return;
                this._input.focus();
                if (this._opened) this._close(); else this._open('');
            });
            this._choices = document.createElement('div');
            this._choices.id = 'choices';
            this._choices.className = 'choices';
            this._choices.setAttribute('role', 'listbox');
            this._choices.setAttribute('aria-label', 'Opzioni');
            this._choices.setAttribute('popover', 'manual');
            this._choices.hidden = true;
            this._choices.addEventListener('mousedown', event => event.preventDefault());
            this._error = document.createElement('span');
            this._error.id = 'choice-error';
            this._error.setAttribute('role', 'status');
            this._error.style.cssText = 'display:block;color:var(--color-error,#a02020);font-size:12px';
            this._input.setAttribute('aria-describedby', 'choice-error');
            content.append(this._toggle, this._choices, this._error);
        }
        get options() {
            const values = this.getAttribute('values') || '';
            return values.split(values.includes('\n') ? '\n' : ',').filter(Boolean).map(entry => {
                const colon = entry.indexOf(':');
                return colon > 0 ? {id:entry.slice(0, colon), caption:entry.slice(colon + 1)}
                    : {id:entry, caption:entry};
            });
        }
        _renderChoices() {
            this._close();
            this.value = this._committed;
        }
        _open(query) {
            if (this._input.disabled || this._input.readOnly || !this.isConnected) return;
            this._close();
            this._filtered = this.options.filter(item => item.caption.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
            this._choices.replaceChildren(...this._filtered.map((item, index) => {
                const row = document.createElement('div');
                row.className = 'choice'; row.id = `choice-${index}`;
                row.setAttribute('role', 'option'); row.textContent = item.caption;
                row.addEventListener('click', () => this._choose(item));
                return row;
            }));
            if (!this._filtered.length) {
                const empty = document.createElement('div'); empty.className = 'choice-empty';
                empty.textContent = 'No results'; this._choices.append(empty);
            }
            const rect = this._input.getBoundingClientRect();
            const view = this.ownerDocument.defaultView;
            const below = view.innerHeight - rect.bottom - 6;
            const above = rect.top - 6;
            const up = below < 120 && above > below;
            const height = Math.max(30, Math.min(210, up ? above : below));
            Object.assign(this._choices.style, {left: `${Math.max(4, Math.min(rect.left, view.innerWidth - rect.width - 4))}px`,
                top: up ? 'auto' : `${rect.bottom + 2}px`, bottom: up ? `${view.innerHeight - rect.top + 2}px` : 'auto',
                width: `${rect.width}px`, maxHeight: `${height}px`});
            this._choices.hidden = false;
            this._choices.showPopover?.();
            this._opened = true;
            this._input.setAttribute('aria-expanded', 'true');
            this._activate(this._filtered.findIndex(item => item.caption === this._input.value));
            const outside = event => { if (!event.composedPath().includes(this)) this._close(); };
            const scroll = event => { if (!event.composedPath().includes(this._choices)) this._close(); };
            const close = () => this._close();
            this.ownerDocument.addEventListener('pointerdown', outside, true);
            this.ownerDocument.addEventListener('scroll', scroll, true);
            view.addEventListener('resize', close);
            this._cleanupPopup = () => {
                this.ownerDocument.removeEventListener('pointerdown', outside, true);
                this.ownerDocument.removeEventListener('scroll', scroll, true);
                view.removeEventListener('resize', close);
            };
        }
        _activate(index) {
            this._active = this._filtered.length ? Math.max(0, Math.min(index, this._filtered.length - 1)) : -1;
            [...this._choices.querySelectorAll('[role=option]')].forEach((row, i) => {
                row.setAttribute('aria-selected', String(i === this._active));
                if (i === this._active) row.scrollIntoView?.({block:'nearest'});
            });
            if (this._active >= 0) this._input.setAttribute('aria-activedescendant', `choice-${this._active}`);
            else this._input.removeAttribute('aria-activedescendant');
        }
        _choose(item) {
            this._nullState.setNull(false);
            this._picked = item;
            this._input.value = item.caption;
            this._close();
            this._input.dispatchEvent(new Event('change'));
        }
        _close() {
            this._cleanupPopup?.(); this._cleanupPopup = null;
            if (this._opened) this._choices.hidePopover?.();
            this._opened = false;
            if (this._choices) this._choices.hidden = true;
            this._input.setAttribute('aria-expanded', 'false');
            this._input.removeAttribute('aria-activedescendant');
        }
        disconnectedCallback() { this._close(); super.disconnectedCallback(); }
        connectedCallback() {
            super.connectedCallback();
            if (!this._nullState.isNull) this._committed = this.getAttribute('value') || '';
            this._renderChoices();
        }
        attributeChangedCallback(name, old, fresh) {
            if (name === 'values') this._renderChoices();
            else if (name === 'value') this.value = fresh;
            else super.attributeChangedCallback(name, old, fresh);
            if ((name === 'disabled' || name === 'readonly') && fresh !== null) this._close();
        }
        get value() { return this._committed; }
        set value(value) {
            this._nullState?.setNull(value === null);
            this._committed = value === null ? null : String(value ?? '');
            this._input.value = this.constrained
                ? (this.options.find(option => option.id === this._committed)?.caption ?? this._committed)
                : this._committed;
            const valid = !this.constrained || !this._committed || this.options.some(option => option.id === this._committed);
            this._input.setCustomValidity(valid ? '' : 'Value is not in the list.');
            this._input.setAttribute('aria-invalid', String(!valid));
            this._error.textContent = valid ? '' : 'Value is not in the list.';
        }
    }
    class GnrFilteringSelect extends GnrComboBox { get constrained() { return true; } }
    class GnrPasswordbox extends GnrInput { get inputType() { return 'password'; } }
    class GnrNumberTextBox extends GnrInput {
        static get observedAttributes() { return [...super.observedAttributes, 'format', 'places', 'locale', 'dtype', 'min', 'max', 'step']; }
        _configure(input) { this._number = new NumberEditor(this, input); }
        _buildContent(content) { super._buildContent(content); content.append(this._number.message); }
        connectedCallback() { super.connectedCallback(); this._number.sync(); }
        attributeChangedCallback(name, old, fresh) { super.attributeChangedCallback(name, old, fresh); this._number?.sync(); }
        get editorPresentationAttributes() { return ['format', 'places', 'locale']; }
        get commitOnChange() { return true; }
        readEditorCandidate() { return this._number.accept(); }
        get value() { return this._number.committed; }
        set value(value) { this._number.setValue(value); }
    }
    class GnrDateTextBox extends GnrInput {
        static get observedAttributes() { return [...super.observedAttributes, 'symbolic', 'locale', 'workdate']; }
        _configure(input) { this._symbolic = new SymbolicDateEditor(this, input); }
        _buildContent(content) {
            super._buildContent(content);
            content.append(this._symbolic.message);
        }
        connectedCallback() { super.connectedCallback(); this._symbolic.sync(); }
        disconnectedCallback() { this._symbolic.close(); super.disconnectedCallback(); }
        attributeChangedCallback(name, old, fresh) {
            super.attributeChangedCallback(name, old, fresh);
            this._symbolic?.sync();
        }
        get symbolicEditing() { return this._symbolic.editing; }
        get commitOnChange() { return true; }
        readEditorCandidate() { return this._symbolic.accept(); }
        get value() { return this._symbolic.committed; }
        set value(value) { this._symbolic.setValue(value); }
    }
    class GnrTimeTextBox extends GnrInput { get inputType() { return 'time'; } }
    /** Legacy bounds and discreteValues expressed through a native range control. */
    class GnrHorizontalSlider extends GnrInput {
        static get observedAttributes() {
            return [...super.observedAttributes, 'minimum', 'maximum', 'min', 'max', 'step', 'discretevalues'];
        }
        get inputType() { return 'range'; }
        get vertical() { return false; }
        get value() { return this._nullState.isNull ? null : this._input.valueAsNumber; }
        set value(value) { this._input.value = value == null ? this._input.min : String(value); this._nullState.setNull(value === null); }
        _configure(input) {
            input.addEventListener('keydown', event => {
                if (this.hasAttribute('readonly')) event.preventDefault();
            });
            input.addEventListener('pointerdown', event => {
                if (this.hasAttribute('readonly')) event.preventDefault();
            });
        }
        connectedCallback() {
            super.connectedCallback();
            this._applyRange();
        }
        attributeChangedCallback(name, old, fresh) {
            if (['minimum', 'maximum', 'min', 'max', 'step', 'discretevalues'].includes(name)) {
                // The renderer validates a complete attribute batch synchronously.
                if (this.isConnected && !this._rangeQueued) {
                    this._rangeQueued = true;
                    queueMicrotask(() => { this._rangeQueued = false; if (this.isConnected) this._applyRange(); });
                }
            } else super.attributeChangedCallback(name, old, fresh);
        }
        _applyRange() {
            const minimum = Number(this.getAttribute('minimum') ?? this.getAttribute('min') ?? 0);
            const maximum = Number(this.getAttribute('maximum') ?? this.getAttribute('max') ?? 100);
            if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum < minimum) {
                throw new Error('Slider requires finite minimum <= maximum');
            }
            const discrete = Number(this.getAttribute('discreteValues') ?? Infinity);
            if (discrete !== Infinity && (!Number.isInteger(discrete) || discrete < 2)) {
                throw new Error('Slider discreteValues must be an integer >= 2 or Infinity');
            }
            const spacing = discrete === Infinity ? null : (maximum - minimum) / (discrete - 1);
            const explicit = this.getAttribute('step');
            const step = explicit ?? (spacing === null || spacing === 0 ? 'any' : String(spacing));
            if (step !== 'any' && (!Number.isFinite(Number(step)) || Number(step) <= 0)) {
                throw new Error('Slider step must be positive or any');
            }
            if (explicit !== null && spacing !== null && maximum !== minimum
                && (explicit === 'any' || Math.abs(Number(explicit) - spacing) > 1e-10 * Math.max(1, spacing))) {
                throw new Error('Slider step and discreteValues describe different spacing');
            }
            const input = this._input;
            const value = this._rangeReady ? input.value : (this.getAttribute('value') ?? '0');
            input.min = String(minimum); input.max = String(maximum); input.step = step;
            input.value = value;
            this._rangeReady = true;
            input.setAttribute('aria-orientation', this.vertical ? 'vertical' : 'horizontal');
            input.setAttribute('aria-readonly', String(this.hasAttribute('readonly')));
            if (this.vertical && !this._verticalStyle) {
                this._verticalStyle = document.createElement('style');
                this._verticalStyle.textContent = ':host{height:150px}.labledBox{height:100%}.labledBox_content{min-height:0}input{writing-mode:vertical-lr;direction:rtl;width:25px;height:100%;min-height:0;padding:0}';
                this.shadowRoot.append(this._verticalStyle);
            }
        }
    }
    class GnrVerticalSlider extends GnrHorizontalSlider { get vertical() { return true; } }

    class GnrCheckbox extends GnrInput {
        static get observedAttributes() {
            return ['checked', 'value', 'lbl', 'disabled', 'readonly', 'label'];
        }

        get inputType() { return 'checkbox'; }

        get type() { return 'checkbox'; }   // kernel reads el.checked

        _buildContent(content) {
            content.classList.add('gnr-checkbox-content');
            content.appendChild(this._input);
            this._caption = document.createElement('label');
            this._caption.htmlFor = 'f';
            this._caption.className = 'gnr-checkbox-caption';
            content.appendChild(this._caption);
        }

        connectedCallback() {
            super.connectedCallback();
            this._input.disabled = this.hasAttribute('disabled');
            if (!this._nullState.isNull && this.hasAttribute('checked')) {
                this._input.checked = GnrCheckbox.truthy(this.getAttribute('checked'));
            }
            this._caption.textContent = this.getAttribute('label') || '';
            this._input.readOnly = this.hasAttribute('readonly');
            this._nullState.connect();
        }

        attributeChangedCallback(name, _old, fresh) {
            if (name === 'checked') {
                const focused = this.shadowRoot && this.shadowRoot.activeElement === this._input;
                if (!focused) { this.checked = fresh === null ? null : GnrCheckbox.truthy(fresh); }
            } else if (name === 'label') {
                if (this._caption) { this._caption.textContent = fresh || ''; }
            } else {
                super.attributeChangedCallback(name, _old, fresh);
            }
        }

        static truthy(v) {
            return v != null && v !== 'false' && v !== 'False' && v !== '0' && v !== 'None';
        }

        get checked() { return this._nullState.isNull ? null : this._input.checked; }

        set checked(v) { this._input.checked = !!v; this._nullState.setNull(v === null); }
        get value() { return this.checked; }
        set value(v) { this.checked = v === null ? null : (typeof v === 'boolean' ? v : GnrCheckbox.truthy(v)); }
    }

    customElements.define('gnr-textbox', GnrTextBox);
    customElements.define('gnr-textboxarea', GnrTextBoxArea);
    customElements.define('gnr-filteringselect', GnrFilteringSelect);
    customElements.define('gnr-dbselect', defineDbSelect(GnrFilteringSelect));
    customElements.define('gnr-combobox', GnrComboBox);
    customElements.define('gnr-passwordbox', GnrPasswordbox);
    customElements.define('gnr-numbertextbox', GnrNumberTextBox);
    customElements.define('gnr-datetextbox', GnrDateTextBox);
    customElements.define('gnr-timetextbox', GnrTimeTextBox);
    customElements.define('gnr-horizontalslider', GnrHorizontalSlider);
    customElements.define('gnr-verticalslider', GnrVerticalSlider);
    customElements.define('gnr-checkbox', GnrCheckbox);
}

registerComponentCollection('inputs', { components: builtinComponents('inputs'), defineComponents });
