// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Typed property grid. Leaving a row commits validated edits through Bag APIs. */
export class InspectorEditor {
    constructor(host, bag, page) {
        this.host = host;
        this.bag = bag;
        this.page = page;
        this.dirty = false;
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
            if (event.relatedTarget?.closest?.('[data-command="reload"]')) return;
            try { this.apply(true); } catch (error) { this.setStatus(error.message, true); }
        };
        this.rows.addEventListener('focusout', this.onFocusOut);
        host.addEventListener('input', this.onInput);
        host.addEventListener('change', this.onInput);
        host.addEventListener('click', this.onClick);
    }
    getField(name) { return this.host.querySelector(`[data-field="${name}"]`) || this.rows?.querySelector(`[data-field="${name}"]`); }
    setStatus(message, error = false) {
        this.getField('status').textContent = message;
        this.getField('status').dataset.error = String(error);
    }
    getType(value) {
        if (value === null) return 'null';
        return ['string', 'number', 'boolean'].includes(typeof value) ? typeof value : null;
    }
    getParsed(type, text) {
        if (type === 'string') return text;
        if (type === 'null') return null;
        if (type === 'boolean' && ['true', 'false'].includes(text)) return text === 'true';
        if (type === 'number' && text.trim() && Number.isFinite(Number(text))) return Number(text);
        throw new Error(`Invalid ${type}: ${text}. Use a finite number or true/false.`);
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
            if (this.dirty) this.setStatus('Node changed outside this draft. Reload before applying.', true);
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
            this.appendRow('*value', this.value, true);
            for (const [name, value] of Object.entries(this.attrs)) this.appendRow(name, value);
        }
        this.setAvailability(Boolean(this.node));
        this.setStatus(this.node ? 'Running instance only' : 'Select a node');
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
        const type = this.getType(value);
        row.dataset.complex = String(!type);
        const key = row.querySelector('[data-cell="name"]');
        key.value = name;
        key.readOnly = !fresh;
        const input = row.querySelector('[data-cell="value"]');
        input.value = type ? String(value ?? '') : '[Complex value · read-only]';
        input.setAttribute('aria-label', primary ? 'Value' : `${name || 'New attribute'} value`);
        const select = row.querySelector('[data-cell="type"]');
        select.value = type || 'string';
        select.setAttribute('aria-label', primary ? 'Value type' : `${name || 'New attribute'} type`);
        const remove = row.querySelector('[data-cell="remove"]');
        remove.hidden = primary;
        remove.setAttribute('aria-label', `Remove ${name || 'new attribute'}`);
        if (primary) { input.dataset.field = 'value'; select.dataset.field = 'value-type'; }
        input.disabled = select.disabled = remove.disabled = !type;
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
        if (!this.getUnchanged()) throw new Error('Node changed or was removed. Reload before applying.');
        const value = this.getType(this.value) ? this.getParsed(this.getField('value-type').value,
            this.getField('value').value) : this.value;
        const attrs = {};
        for (const row of this.rows.querySelectorAll('[data-property="attribute"]')) {
            if (row.dataset.removed === 'true') continue;
            const key = row.querySelector('[data-cell="name"]').value.trim();
            if (!key) throw new Error('Enter an attribute name.');
            if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsupported attribute name.');
            if (Object.hasOwn(attrs, key)) throw new Error(`Duplicate attribute: ${key}`);
            attrs[key] = row.dataset.complex === 'true' ? this.attrs[key] :
                this.getParsed(row.querySelector('[data-cell="type"]').value,
                    row.querySelector('[data-cell="value"]').value);
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
                row.dataset.dirty = 'false';
                row.dataset.fresh = 'false';
                row.querySelector('[data-cell="name"]').readOnly = true;
            }
        } else this.reload();
        this.setStatus('Applied to the running instance.');
    }
    dispose() {
        this.rows.removeEventListener('focusout', this.onFocusOut);
        this.host.removeEventListener('input', this.onInput);
        this.host.removeEventListener('change', this.onInput);
        this.host.removeEventListener('click', this.onClick);
    }
}
