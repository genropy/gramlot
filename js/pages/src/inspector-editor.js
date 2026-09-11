// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {toTytx, fromTytx} from 'genro-tytx';
/** Typed property grid. Leaving a row commits validated edits through Bag APIs. */
export class InspectorEditor {
    constructor(host, bag, page) {
        this.host = host;
        this.bag = bag;
        this.page = page;
        this.dirty = false;
        this.knownTypes = new WeakMap();
        const root = this.getField('rows').attachShadow({mode: 'open'});
        const style = host.ownerDocument.createElement('link');
        style.rel = 'stylesheet';
        style.href = new URL('./inspector.css', import.meta.url).href;
        this.rows = host.ownerDocument.createElement('div');
        this.rows.className = 'inspector-editor inspector-cells';
        root.append(style, this.rows);
        this.onInput = event => {
            const row = event.composedPath()[0].closest?.('[data-property]');
            if (!row) return;
            const control = event.composedPath()[0];
            if (control.dataset.cell === 'type') this.configureInput(row, control.value, null);
            else if (control.dataset.cell === 'value') {
                row.dataset.null = 'false';
                control.classList.remove('gnr-null-value');
                control.indeterminate = false;
            }
            this.dirty = true;
            row.dataset.dirty = 'true';
            this.setStatus('Unsaved changes');
        };
        this.onClick = event => {
            const remove = event.composedPath()[0].closest?.('[data-cell="remove"]');
            if (remove) { this.toggleRemoval(remove.closest('[data-property]')); return; }
            const command = event.target.closest('[data-command]')?.dataset.command;
            if (!command) return;
            try { this[command](); } catch (error) { this.setStatus(error.message, true); }
        };
        this.onFocusOut = event => {
            const row = event.target.closest?.('[data-property]');
            if (!row || !this.dirty || this.applying) return;
            // Name, value and type form one edit; moving within it is not a commit.
            if (event.relatedTarget && row.contains(event.relatedTarget)) return;
            try { this.apply(true); } catch (error) { this.setStatus(error.message, true); }
        };
        this.onKeyDown = event => {
            const input = event.target.closest?.('[data-cell="value"]');
            if (!input || event.key !== 'Backspace' || event.repeat || event.isComposing || input.disabled) return;
            if (input.type !== 'checkbox' && (input.value !== '' || input.validity.badInput)) return;
            event.preventDefault();
            const row = input.closest('[data-property]');
            row.dataset.null = 'true';
            row.dataset.dirty = 'true';
            input.value = '';
            input.indeterminate = input.type === 'checkbox';
            input.classList.add('gnr-null-value');
            this.dirty = true;
        };
        this.rows.addEventListener('keydown', this.onKeyDown);
        this.rows.addEventListener('focusout', this.onFocusOut);
        host.addEventListener('input', this.onInput);
        host.addEventListener('change', this.onInput);
        host.addEventListener('click', this.onClick);
    }
    getField(name) { return this.host.querySelector(`[data-field="${name}"]`) || this.rows?.querySelector(`[data-field="${name}"]`); }
    setStatus(message, error = false) {
        this.getField('status').textContent = message;
        this.getField('status').dataset.error = String(error);
        this.getField('status').hidden = !message;
    }
    getType(value) {
        if (value === null) return null;
        if (value instanceof Date && Number.isFinite(value.getTime())) {
            const wire = toTytx(value, 'json');
            return wire.includes('::D"') ? 'date' : wire.includes('::H"') ? 'time' : 'datetime';
        }
        return ['string', 'number', 'boolean'].includes(typeof value) ? typeof value : null;
    }
    declaredType(dtype) {
        return ({T:'string', A:'string', L:'integer', I:'integer', N:'number', R:'number',
            B:'boolean', D:'date', H:'time', DH:'datetime', DHZ:'datetime',
            string:'string', number:'number', boolean:'boolean', date:'date', time:'time'})[dtype];
    }
    getParsed(type, text) {
        if (type === 'string') return text;
        if (type === 'number' || type === 'integer') {
            const number = Number(text);
            if (text.trim() && Number.isFinite(number) && (type !== 'integer' || Number.isSafeInteger(number))) return number;
        }
        if (['date', 'time', 'datetime'].includes(type) && text) {
            if (type === 'time' && text.length === 5) text += ':00';
            const suffix = type === 'date' ? 'D' : type === 'time' ? 'H' : 'DHZ';
            const date = fromTytx(JSON.stringify(text + (type === 'datetime' ? 'Z' : '') + '::' + suffix), 'json');
            if (date instanceof Date && Number.isFinite(date.getTime())) return date;
        }
        throw new Error(`Invalid ${type}: ${text || '(empty)'}.`);
    }
    configureInput(row, type, value) {
        row.dataset.type = type;
        row.dataset.null = String(value === null);
        const input = row.querySelector('[data-cell="value"]');
        input.type = ({string:'text',number:'number',integer:'number',boolean:'checkbox',
            date:'date',time:'time',datetime:'datetime-local'})[type] || 'text';
        input.step = type === 'integer' ? '1' : type === 'number' ? 'any' : '0.001';
        input.checked = value === true;
        input.indeterminate = type === 'boolean' && value === null;
        const iso = value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
        input.value = iso ? (type === 'date' ? iso.slice(0,10) : type === 'time' ? iso.slice(11,23) : iso.slice(0,23)) : String(value ?? '');
        input.classList.toggle('gnr-null-value', value === null);
        input.setAttribute('aria-description', value === null ? 'Null value. Backspace on an empty field sets null.' : 'Backspace on an empty field sets null.');
    }
    parsedRow(row) {
        if (row.dataset.complex === 'true' || row.dataset.dirty !== 'true') return row._originalValue;
        if (row.dataset.null === 'true') return null;
        const input = row.querySelector('[data-cell="value"]');
        if (row.dataset.type === 'boolean') return input.checked;
        if (!input.validity.valid) throw new Error(`Invalid ${row.dataset.type} value.`);
        return this.getParsed(row.dataset.type, input.value);
    }
    getCurrentNode() { return this.path ? this.bag.getNode(this.path) : null; }
    getUnchanged() {
        const node = this.getCurrentNode();
        if (node !== this.node || !node || !Object.is(node.getValue(), this.value)) return false;
        return Object.keys(node.attr).length === Object.keys(this.attrs).length &&
            Object.entries(this.attrs).every(([key, value]) => Object.is(node.attr[key], value));
    }
    setAvailability(enabled) {
        this.host.disabled = !enabled;
        // The tree shares this container and must remain selectable without a node.
        this.rows.setAttribute('aria-disabled', String(!enabled));
        for (const control of [...this.host.querySelectorAll('input, select, button'), ...this.rows.querySelectorAll('input, select, button')]) {
            const row = control.closest('[data-property]');
            control.disabled = !enabled || row?.dataset.complex === 'true';
        }
    }
    refresh(path) {
        if (this.applying) return;
        if (path !== this.path || this.node === undefined) { this.path = path; this.reload(); }
        else if (!this.getCurrentNode()) {
            this.setAvailability(false);
            this.setStatus(path ? 'Selected node was removed. Select another node.' : 'Select a node.', true);
        } else if (!this.getUnchanged()) {
            this.setAvailability(true);
            if (this.dirty) this.setStatus('Node changed outside this draft. Select another node and return to reload its current value.', true);
            else this.reload();
        }
    }
    reload() {
        this.node = this.getCurrentNode();
        this.dirty = false;
        this.rows.replaceChildren();
        if (this.node) {
            this.value = this.node.getValue();
            this.attrs = {...this.node.attr};
            this.appendRow('value', this.value, true);
            for (const [name, value] of Object.entries(this.attrs)) {
                if (name !== '_meta') this.appendRow(name, value);
            }
        }
        this.setAvailability(Boolean(this.node));
        this.setStatus('');
    }
    appendRow(name, value, primary = false, fresh = false) {
        const row = this.getField('row-template').firstElementChild.cloneNode(true);
        // Template IDs belong to the recipe; clones are internal editor cells.
        for (const el of [row, ...row.querySelectorAll('*')]) {
            el.removeAttribute('id');
            el.removeAttribute('data-gnr-target-id');
        }
        row.dataset.property = primary ? 'value' : 'attribute';
        row.dataset.name = name;
        row.dataset.fresh = String(fresh);
        row._originalValue = value;
        const known = this.knownTypes.get(this.node) || new Map();
        const inferred = this.getType(value);
        const type = (primary && this.declaredType(this.node.attr.dtype)) || inferred || known.get(name) || 'string';
        if (inferred || (primary && this.declaredType(this.node.attr.dtype))) known.set(name, type);
        this.knownTypes.set(this.node, known);
        const complex = value !== null && !inferred;
        row.dataset.complex = String(complex);
        const key = row.querySelector('[data-cell="name"]');
        key.value = name;
        key.readOnly = !fresh;
        const input = row.querySelector('[data-cell="value"]');
        this.configureInput(row, type, value);
        if (complex) input.value = '[Complex value · read-only]';
        input.setAttribute('aria-label', primary ? 'Value' : `${name || 'New attribute'} value`);
        if (primary) input.dataset.field = 'value';
        const select = row.querySelector('[data-cell="type"]');
        if (fresh) { select.value = type; select.setAttribute('aria-label', 'New attribute type'); }
        else select.remove();
        const remove = row.querySelector('[data-cell="remove"]');
        remove.hidden = primary;
        remove.setAttribute('aria-label', `Remove ${name || 'new attribute'}`);
        input.disabled = remove.disabled = complex;
        this.rows.append(row);
        return row;
    }
    add() {
        const row = this.appendRow('', '', false, true);
        this.dirty = true;
        row.dataset.dirty = 'true';
        row.querySelector('[data-cell="name"]').focus();
        this.setStatus('Enter an attribute name and value');
    }
    toggleRemoval(row) {
        if (row.dataset.complex === 'true') return;
        row.dataset.removed = String(row.dataset.removed !== 'true');
        row.querySelector('[data-cell="remove"]').textContent = row.dataset.removed === 'true' ? '↶' : '−';
        this.dirty = true;
        this.setStatus('Unsaved changes');
    }
    apply(preserveRows = false) {
        if (!this.getUnchanged()) throw new Error('Node changed or was removed. Select another node and return to reload its current value.');
        const value = this.parsedRow(this.rows.querySelector('[data-property="value"]'));
        // Hidden schema metadata must survive replacement of editable attributes.
        const attrs = Object.hasOwn(this.attrs, '_meta') ? {_meta: this.attrs._meta} : {};
        for (const row of this.rows.querySelectorAll('[data-property="attribute"]')) {
            if (row.dataset.removed === 'true') continue;
            const key = row.querySelector('[data-cell="name"]').value.trim();
            if (!key) throw new Error('Enter an attribute name.');
            if (['_meta', '__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsupported attribute name.');
            if (Object.hasOwn(attrs, key)) throw new Error(`Duplicate attribute: ${key}`);
            attrs[key] = this.parsedRow(row);
        }
        const write = () => {
            // setAttr replacement notifies deletions too; delAttr does not emit.
            this.node.setAttr(attrs, true, false, false);
            if (!Object.is(value, this.value)) this.node.setValue(value);
        };
        this.applying = true;
        try {
            if (this.page.live) this.page.live(write);
            else write();
        } catch (error) {
            const restore = () => {
                this.node.setAttr(this.attrs, true, false, false);
                if (!Object.is(this.node.getValue(), this.value)) this.node.setValue(this.value);
            };
            try {
                if (this.page.live) this.page.live(restore);
                else restore();
            } catch (restoreError) {
                throw new Error(`${error.message} Restore also failed: ${restoreError.message}`);
            }
            throw new Error(`${error.message} The previous node was restored.`);
        } finally { this.applying = false; }
        if (preserveRows) {
            // Keep controls mounted so the browser can finish the focus transition.
            this.value = this.node.getValue();
            this.attrs = {...this.node.attr};
            this.dirty = false;
            for (const row of this.rows.querySelectorAll('[data-property]')) {
                if (row.dataset.removed === 'true') { row.remove(); continue; }
                row._originalValue = row.dataset.property === 'value' ? this.value : this.attrs[row.querySelector('[data-cell="name"]').value.trim()];
                row.dataset.name = row.querySelector('[data-cell="name"]').value.trim();
                this.knownTypes.get(this.node)?.set(row.dataset.name, row.dataset.type);
                row.querySelector('[data-cell="type"]')?.remove();
                row.dataset.dirty = 'false';
                row.dataset.fresh = 'false';
                row.querySelector('[data-cell="name"]').readOnly = true;
            }
        } else this.reload();
        this.setStatus('');
    }
    dispose() {
        this.rows.removeEventListener('keydown', this.onKeyDown);
        this.rows.removeEventListener('focusout', this.onFocusOut);
        this.host.removeEventListener('input', this.onInput);
        this.host.removeEventListener('change', this.onInput);
        this.host.removeEventListener('click', this.onClick);
    }
}
