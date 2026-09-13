// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {wrapSource} from '../source-bag.js';
import {ValueSnapshot} from '../forms/value-snapshot.js';

let serial = 0;
/** Resident-cell experiment: ordinary Source controls in a stable slotted host. */
export class GridEditor {
    constructor(grid) {
        this.grid = grid;
        this.snapshot = new ValueSnapshot();
        this.path = `__grid_editors.e${++serial}`;
        this.layer = grid.ownerDocument.createElement('div');
        this.layer.className = 'cell-editor';
        this.layer.hidden = true;
        const slot = grid.ownerDocument.createElement('slot');
        slot.name = 'cell-editor';
        this.layer.append(slot);
        grid.shadowRoot.append(this.layer);
        this.keydown = event => {
            if (!this.active || event.isComposing) return;
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation(); this.close();
            } else if (event.key === 'Tab' || event.key === 'Enter') {
                const control = this.widget?.fieldControl || this.widget?._input;
                // Multiline editors keep Enter; Ctrl/Cmd+Enter confirms the cell.
                if (event.key === 'Enter' && control?.tagName === 'TEXTAREA' && !event.ctrlKey && !event.metaKey) return;
                // Select popups own Enter while choosing an option.
                if (event.defaultPrevented && event.key === 'Enter' && this.widget?.options) return;
                event.preventDefault(); event.stopPropagation();
                this.confirm(event.key === 'Tab' ? (event.shiftKey ? -1 : 1) : 0);
            }
        };
        this.arrowKeydown = event => {
            if (!this.active || event.isComposing || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
            const control = this.widget?.fieldControl || this.widget?._input;
            // Choices own Down to open their menu, then both arrows to navigate it.
            if (event.key === 'ArrowDown' && control?.getAttribute('role') === 'combobox') return;
            if (control?.getAttribute('aria-expanded') === 'true') return;
            if (control?.tagName === 'TEXTAREA' || ['range', 'time', 'date', 'datetime-local'].includes(control?.type)) return;
            event.preventDefault(); event.stopPropagation();
            this.confirm({row:event.key === 'ArrowUp' ? -1 : 1});
        };
        this.fieldState = event => {
            if (!this.active || event.target !== this.widget || !event.detail.invalid) return;
            // Validation belongs to the cell session, not to a recycled DOM node.
            // Retain the failure through blur/reconciliation until confirm or Escape.
            this.active.issues = event.detail.issues.filter(issue => issue.severity === 'error');
            this.layer.classList.add('invalidCell');
            this.refreshValidation();
        };
        grid.addEventListener('gnr-field-state', this.fieldState);
        grid.addEventListener('keydown', this.arrowKeydown, true);
        grid.addEventListener('keydown', this.keydown);
    }
    get app() { return this.grid.sourceNode?.handler?.application; }
    async open(key, columnId, selectText = false) {
        if (this.active?.key === key && this.active?.columnId === columnId) return;
        if (this.active && !await this.confirm()) return;
        const grid = this.grid, column = grid.columns.find(c => c.id === columnId);
        const row = grid.collectionStore()?.row(key);
        if (!this.app || !row || !column?.edit || column.formula || column.hidden || column.editDisabled || row.node.attr._is_readonly_row) return;
        const config = column.edit === true ? {} : {...column.edit};
        if (config.disabled || config.readonly) return;
        const tag = config.tag || ({L:'numberTextBox', I:'numberTextBox', N:'numberTextBox', R:'numberTextBox', D:'dateTextBox', B:'checkBox'}[column.dtype] || 'textBox');
        delete config.tag;
        // Row-relative providers and selected_* need a row scope, outside this first slice.
        const original = this.snapshot.copy(grid.collectionStore().getValue(row.node, column.field));
        this.active = {key, columnId, rowNode:row.node, column, original, store:grid.collectionStore()};
        this.app.live(() => {
            this.app.data.setItem(grid.sourceNode.absDatapath(this.path), original);
            this.source = wrapSource(grid.sourceNode).div({slot:'cell-editor'});
            this.controlSource = this.source[tag]({dtype:column.dtype, places:column.places,
                locale:column.locale || grid.locale, ...config, blankIsNull:false, validationPresentation:'tooltip',
                [tag.toLowerCase() === 'checkbox' ? 'checked' : 'value']:`^${this.path}`, width:'100%'});
        });
        const index = grid.collectionStore().keys().indexOf(key);
        const top = index * grid._rowHeight;
        const height = grid._frame.clientHeight - grid._header.offsetHeight;
        if (top < grid._frame.scrollTop) grid._frame.scrollTop = top;
        else if (height > 0 && top + grid._rowHeight > grid._frame.scrollTop + height) grid._frame.scrollTop = top + grid._rowHeight - height;
        const columnIndex = grid.columns.findIndex(c => c.id === columnId);
        if (columnIndex >= grid.frozenColumns) {
            const left = grid.columns.slice(0, columnIndex).reduce((sum,c) => sum+c.width, 0);
            const frozen = grid.columns.slice(0, grid.frozenColumns).reduce((sum,c) => sum+c.width, 0);
            let scroll = grid._frame.scrollLeft;
            if (left < scroll + frozen) scroll = left - frozen;
            else if (grid._frame.clientWidth && left + column.width > scroll + grid._frame.clientWidth) scroll = left + column.width - grid._frame.clientWidth;
            grid._horizontal.scrollLeft = grid._frame.scrollLeft = scroll;
        }
        grid._renderRows();
        this.layer.hidden = false;
        this.position();
        this.focus(selectText);
    }
    get widget() { return this.controlSource && this.app?.target._byId(this.app.builder.targetId(this.controlSource)); }
    focus(selectText = false) {
        const widget = this.widget;
        const control = widget?.fieldControl || widget?._input || widget;
        control?.focus({preventScroll:true});
        if (selectText) {
            control?.select?.();
            const active = this.active;
            widget?._resolvePromise?.then(() => {
                if (this.active === active && !widget._formField?.editorDirty && widget.shadowRoot?.activeElement === control) control.select?.();
            });
        }
    }
    async confirm(direction = null) {
        const active = this.active;
        if (!active || this.confirming) return false;
        if (typeof direction === 'object' && direction?.row) {
            const keys = active.store.keys();
            let next = keys.indexOf(active.key) + direction.row;
            while (next >= 0 && next < keys.length && active.store.row(keys[next])?.node.attr._is_readonly_row) next += direction.row;
            if (next < 0 || next >= keys.length) return false;
        }
        this.confirming = true;
        try {
            const field = this.widget?._formField;
            if (!field) return false;
            field.commit(null, true);
            while (field.pending && this.active === active) await new Promise(resolve => setTimeout(resolve, 20));
            if (this.active !== active) return false;
            if (field.parseError || field.issues.some(issue => issue.severity === 'error')) { this.focus(); return false; }
            const store = active.store;
            if (store !== this.grid.collectionStore() || store.row(active.key)?.node !== active.rowNode) { this.close(); return false; }
            if (!this.snapshot.equal(store.getValue(active.rowNode, active.column.field), active.original)) {
                this.layer.title = 'The cell changed externally. Escape and reopen it.';
                this.focus(); return false;
            }
            const value = this.app.data.getItem(this.grid.sourceNode.absDatapath(this.path));
            this.app.live(() => store.updateRowNode(active.rowNode, {[active.column.field]:value}));
            this.close();
            if (direction) {
                const columns = this.grid.columns.filter(c => c.edit && !c.formula && !c.editDisabled);
                const keys = store.keys();
                const rowIndex = keys.indexOf(active.key);
                const columnIndex = columns.findIndex(c => c.id === active.columnId);
                let index = rowIndex * columns.length + columnIndex;
                const step = typeof direction === 'object' ? direction.row * columns.length : direction;
                index += step;
                while (index >= 0 && index < keys.length * columns.length) {
                    const key = keys[Math.floor(index / columns.length)];
                    const column = columns[index % columns.length];
                    const edit = column.edit;
                    if (!store.row(key)?.node.attr._is_readonly_row && !edit.disabled && !edit.readonly) {
                        this.confirming = false;
                        await this.open(key, column.id, true);
                        break;
                    }
                    index += step;
                }
            }
            return true;
        } finally { this.confirming = false; }
    }
    decorateCell(cell, key, columnId) {
        const active = this.active;
        const invalid = active?.key === key && active.columnId === columnId && active.issues?.length > 0;
        cell.classList.toggle('invalidCell', Boolean(invalid));
        if (invalid) {
            cell.setAttribute('aria-invalid', 'true');
            cell.title = active.issues.map(issue => issue.message).join(' ');
        } else {
            cell.removeAttribute('aria-invalid');
            cell.removeAttribute('title');
        }
    }
    refreshValidation() {
        for (const row of this.grid._body.children) {
            for (const cell of row.children) this.decorateCell(cell, row._gridKey, cell.dataset.columnId);
        }
    }
    position() {
        if (!this.active) return;
        const row = [...this.grid._body.children].find(row => row._gridKey === this.active.key);
        const cell = row && [...row.children].find(cell => cell.dataset.columnId === this.active.columnId);
        if (!cell) { this.layer.hidden = true; return; }
        const rect = cell.getBoundingClientRect(), host = this.grid.getBoundingClientRect();
        const frame = this.grid._frame.getBoundingClientRect();
        this.layer.hidden = rect.top < this.grid._header.getBoundingClientRect().bottom || rect.bottom > frame.bottom || rect.right <= frame.left || rect.left >= frame.right;
        Object.assign(this.layer.style, {left:`${rect.left-host.left}px`, top:`${rect.top-host.top}px`, width:`${rect.width}px`, minHeight:`${rect.height}px`});
    }
    close() {
        this.active = null;
        this.layer.classList.remove('invalidCell');
        this.refreshValidation();
        const source = this.source;
        this.source = this.controlSource = null;
        this.layer.hidden = true; this.layer.title = '';
        if (source && this.app && !this.app._disposed) this.app.live(() => {
            source.parentBag.popNode(source.label);
            this.app.data.popNode(this.grid.sourceNode.absDatapath(this.path));
        });
    }
    dispose() { this.close(); this.grid.removeEventListener('gnr-field-state', this.fieldState); this.grid.removeEventListener('keydown', this.arrowKeydown, true); this.grid.removeEventListener('keydown', this.keydown); this.layer.remove(); }
}
