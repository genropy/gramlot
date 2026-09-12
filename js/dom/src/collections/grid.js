// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Fixed-row-height, bounded-viewport grid over a resident Bag store. */
import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';
import {formatDisplay} from '../display-format.js';
import {BagGridStore} from './grid-store.js';
import {GridChangeManager} from './grid-formulas.js';
import {gridCellValue, gridTemplate, normalizeGridColumns, layoutGridColumns, gridColumnsFromStruct, gridColumnDefinitionsFromStruct} from './grid-structure.js';
let structureSerial = 0;

const CSS = `
:host{display:flex;flex-direction:column;contain:content;font:var(--grid-font,13px/1.35 system-ui,sans-serif);color:var(--grid-color,#283340);height:var(--grid-height,260px);--grid-row-height:26px}
.frame{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;border:1px solid #c9d1d9;background:#fff;position:relative;box-sizing:border-box}
.horizontal-scroll{flex:none;height:16px;overflow-x:scroll;overflow-y:hidden;background:#f5f7f9}
.horizontal-scroll[hidden]{display:none}.horizontal-track{height:1px}
.header{position:sticky;top:0;z-index:3;display:grid;width:max-content;min-width:100%;background:var(--grid-header-bg,#eef1f4);border-bottom:1px solid #c3ccd5;font-weight:600;text-align:center}
.header [role=columnheader],.cell{box-sizing:border-box;padding:3px 7px;border-right:1px solid #e1e6eb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.body{position:relative;width:max-content;min-width:100%}.row{position:absolute;left:0;display:grid;width:max-content;min-width:100%;height:var(--grid-row-height);border-bottom:1px solid #edf0f2;box-sizing:border-box}
.row{--row-bg:var(--grid-row-bg,#fff);background:var(--row-bg)}
.row.alternate{--row-bg:var(--grid-stripe-bg,#f5f7f9)}
.row:hover{--row-bg:var(--grid-hover-bg,#edf3f8)}.row.selected{--row-bg:var(--grid-selected-bg,#dcebf7)}.row:focus-visible{outline:2px solid #527fa2;outline-offset:-2px}
.cell.numeric{text-align:right;font-variant-numeric:tabular-nums}.cell.boolean{text-align:center}
.cell.frozen{position:sticky;z-index:1;background:var(--row-bg)}
.header [role=columnheader].frozen{position:sticky;z-index:2;background:var(--grid-header-bg,#eef1f4)}
.header [role=columnheader].frozen-edge,.cell.frozen-edge{border-right-color:#bdc8d2}
.cell.null{color:#88929c}.error{padding:12px;color:#9b2929}.empty{padding:12px;color:#68737d}
.header [role=columnheader]{position:relative;padding:4px 7px}
.resize{position:absolute;right:0;top:0;bottom:0;width:8px;cursor:col-resize;touch-action:none;user-select:none}
.resize:hover::after,.resize:focus-visible::after{content:'';position:absolute;right:0;top:0;bottom:0;width:2px;background:#527fa2}
`;

function defineComponents() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-grid')) return;
    class GnrGrid extends HTMLElement {
        constructor() {
            super();
            const shadow = this.attachShadow({mode:'open'});
            const style = document.createElement('style'); style.textContent = CSS; shadow.append(style);
            this._frame = document.createElement('div'); this._frame.className = 'frame'; this._frame.setAttribute('role','grid');
            this._header = document.createElement('div'); this._header.className = 'header'; this._header.setAttribute('role','row');
            this._body = document.createElement('div'); this._body.className = 'body';
            this._frame.append(this._header, this._body); shadow.append(this._frame);
            this._horizontal = document.createElement('div'); this._horizontal.className = 'horizontal-scroll';
            this._horizontal.tabIndex = 0; this._horizontal.setAttribute('aria-label', 'Scroll unfrozen columns');
            this._horizontalTrack = document.createElement('div'); this._horizontalTrack.className = 'horizontal-track';
            this._horizontal.append(this._horizontalTrack); shadow.append(this._horizontal);
            this._horizontal.addEventListener('scroll', () => {this._frame.scrollLeft = this._horizontal.scrollLeft;});
            this._frame.addEventListener('wheel', event => {
                const delta = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
                if (!delta || this._horizontal.hidden) return;
                this._horizontal.scrollLeft += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this._horizontal.clientWidth : 1);
                if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.preventDefault();
            }, {passive:false});
            this._columns = [];
            this._columnDefinitions = [];
            this._structureSubscriptions = [];
            this._structureId = `grid-structure-${++structureSerial}`;
            this._selectedKey = null;
            this._rowHeight = 26;
            this._frozenColumns = 0;
            this._overscan = 3;
            this._frame.addEventListener('scroll', () => this._renderRows());
        }

        get storeBag() { return this._store?.getData() || this._storeBag || null; }
        get structBag() { return this._structBag || null; }
        structbag() { return this.structBag; }
        set structBag(value) {
            if (value === this._structBag) return;
            this._structBag = value;
            this._structureChanged();
        }
        _clearStructureSubscriptions() {
            for (const bag of this._structureSubscriptions) bag.unsubscribe(this._structureId, {any:true});
            this._structureSubscriptions = [];
        }
        _structureChanged() {
            this._clearStructureSubscriptions();
            this.columns = gridColumnsFromStruct(this.structBag);
            if (this.isConnected && this.structBag) {
                const visit = bag => {
                    if (!bag?.getNodes || this._structureSubscriptions.includes(bag)) return;
                    this._structureSubscriptions.push(bag);
                    bag.subscribe(this._structureId, {any:() => this._structureChanged()});
                    for (const node of bag.getNodes()) visit(node.getValue());
                };
                visit(this.structBag);
            }
            this.changeManager?.configure(gridColumnDefinitionsFromStruct(this.structBag));
        }
        get datamode() { return this._datamode || 'bag'; }
        set datamode(value) { this.configureStore(this._storeBag, {identifier:this.identifier, datamode:value}); }
        collectionStore() { return this._store || null; }
        useCollectionStore(store) {
            if (store === this._sharedStore) return;
            this.changeManager?.dispose();
            this._unsubscribe?.();
            if (this._store && !this._sharedStore) this._store.dispose();
            this._sharedStore = store;
            this._store = store;
            this._storeBag = store?.getData() || null;
            this._identifier = store?.identifier || null;
            this._datamode = store?.datamode || 'bag';
            this._unsubscribe = this.isConnected && store ? store.subscribe(() => this._storeChanged()) : null;
            if (this.isConnected) {
                this.changeManager = new GridChangeManager(this);
                this.changeManager.configure(this.structBag ? gridColumnDefinitionsFromStruct(this.structBag) : this._columnDefinitions);
                this._storeChanged();
            }
        }
        configureStore(bag, {identifier = null, datamode = 'bag'} = {}) {
            if (this._sharedStore) this.useCollectionStore(null);
            if (!['bag','attr'].includes(datamode)) throw new TypeError('datamode must be bag or attr');
            if (this._store) this._store.configure(bag, {identifier, datamode});
            else if (this.isConnected) {
                this._store = new BagGridStore(bag, {identifier, datamode});
                this._unsubscribe = this._store.subscribe(() => this._storeChanged());
            }
            this._storeBag = bag; this._identifier = identifier; this._datamode = datamode;
        }
        _syncHorizontal(columns = this._columns) {
            const frozenWidth = columns.slice(0, this._frozenColumns).reduce((sum, column) => sum + column.width, 0);
            const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
            const viewport = this._frame.clientWidth;
            this._horizontal.style.marginLeft = `${frozenWidth + 1}px`;
            this._horizontal.style.marginRight = `${Math.max(1, this._frame.offsetWidth - viewport - 1)}px`;
            this._horizontalTrack.style.width = `${Math.max(0, totalWidth - frozenWidth)}px`;
            this._horizontal.hidden = totalWidth <= viewport || frozenWidth >= viewport;
            if (totalWidth <= viewport) this._frame.scrollLeft = 0;
            if (this._horizontal.scrollLeft !== this._frame.scrollLeft) this._horizontal.scrollLeft = this._frame.scrollLeft;
        }
        set storeBag(bag) {
            if (bag === this._storeBag) return;
            if (this._store) this._store.replace(bag);
            this._storeBag = bag;
            if (this.isConnected) this._storeChanged();
        }
        get columns() { return this._columnDefinitions; }
        set columns(value) {
            const next = normalizeGridColumns(value);
            if (JSON.stringify(next) === JSON.stringify(this._columnDefinitions)) return;
            this._cancelResize?.();
            this._columnDefinitions = next;
            this._columns = layoutGridColumns(next, this._frame.clientWidth);
            if (this.isConnected) this._render();
        }
        get identifier() { return this._identifier || null; }
        get frozenColumns() { return this._frozenColumns; }
        set frozenColumns(value) {
            const count = Number(value);
            if (!Number.isInteger(count) || count < 0) throw new RangeError('frozenColumns must be a nonnegative integer');
            if (count === this._frozenColumns) return;
            this._cancelResize?.();
            this._frozenColumns = count;
            if (this.isConnected) this._render();
        }
        _pinCells(container, columns = this._columns) {
            let left = 0;
            Array.from(container.children).forEach((cell, index) => {
                const frozen = index < this._frozenColumns;
                cell.classList.toggle('frozen', frozen);
                cell.classList.toggle('frozen-edge', frozen && index === Math.min(this._frozenColumns, columns.length) - 1);
                cell.style.left = frozen ? `${left}px` : '';
                left += columns[index].width;
            });
        }
        set identifier(value) {
            const next=value || null;
            if (next === this._identifier) return;
            if (this._store) this._store.identifier = next;
            this._identifier = next;
        }
        get selectedKey() { return this._selectedKey; }
        set selectedKey(value) {
            let next = value == null || value === '' ? null : value;
            if (next != null && this._store && !this._store.row(next)) next = null;
            if (next === this._selectedKey) return;
            this._selectedKey = next;
            if (this.isConnected) this._renderRows();
        }
        get rowHeight() { return this._rowHeight; }
        set rowHeight(value) {
            const height = Number(value);
            if (!Number.isFinite(height) || height < 18) throw new RangeError('Grid rowHeight must be at least 18');
            if (height === this._rowHeight) return;
            this._rowHeight = height; this.style.setProperty('--grid-row-height', `${height}px`);
            if (this.isConnected) this._renderRows();
        }
        set height(value) { this.style.setProperty('--grid-height', typeof value === 'number' ? `${value}px` : String(value)); }

        connectedCallback() {
            if (!this._store) {
                this._store = new BagGridStore(this._storeBag, {identifier:this._identifier, datamode:this.datamode});
                this._unsubscribe = this._store.subscribe(() => this._storeChanged());
            }
            if (!this._unsubscribe) this._unsubscribe = this._store.subscribe(() => this._storeChanged());
            this.changeManager = new GridChangeManager(this);
            if (this.structBag) this._structureChanged();
            else this.changeManager.configure(this._columnDefinitions);
            this._render();
            const ResizeObserver = this.ownerDocument.defaultView.ResizeObserver;
            if (ResizeObserver) {
                this._resizeObserver = new ResizeObserver(() => this._render());
                this._resizeObserver.observe(this._frame);
            }
        }
        disconnectedCallback() { this._clearStructureSubscriptions(); this._cancelResize?.(); this._resizeObserver?.disconnect(); this.changeManager?.dispose(); this.changeManager = null; this._unsubscribe?.(); this._unsubscribe = null; if (!this._sharedStore) this._store?.dispose(); this._store = this._sharedStore || null; }

        _storeChanged() {
            this._storeBag = this._store?.getData() || null;
            if (!this._store) return;
            if (this._formulaMutationDepth) { this._formulaRenderPending = true; return; }
            if (this._store.error) { this._renderError(this._store.error); return; }
            if (this._selectedKey != null && !this._store.row(this._selectedKey)) this._choose(null, 'reconcile');
            this._renderRows();
        }
        _renderError(error) {
            this._body.textContent = '';
            this._body.style.height = '0px';
            const message=document.createElement('div'); message.className='error'; message.textContent=error.message;
            this._body.append(message);
        }
        _render() {
            this._columns = layoutGridColumns(this._columnDefinitions, this._frame.clientWidth);
            this._renderHeader();
            this._renderRows();
        }
        _renderHeader() {
            this._header.textContent = '';
            if (!this._columns.length) return;
            this._header.style.gridTemplateColumns = gridTemplate(this._columns);
            for (const column of this._columns) {
                const cell = document.createElement('div'); cell.setAttribute('role','columnheader');
                cell.dataset.columnId = column.id; cell.textContent = column.name; this._header.append(cell);
                if (column.headerClasses) cell.classList.add(...column.headerClasses.split(/\s+/).filter(Boolean));
                if (column.headerStyles) cell.style.cssText = column.headerStyles;
                const handle = document.createElement('span'); handle.className = 'resize'; handle.tabIndex = 0;
                handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical');
                handle.setAttribute('aria-label', `Resize ${column.name}`);
                handle.setAttribute('aria-valuemin', '24'); handle.setAttribute('aria-valuenow', String(column.width));
                handle.setAttribute('aria-valuemax', String(Math.max(10000, column.width)));
                handle.addEventListener('pointerdown', event => this._startResize(event, column, handle));
                handle.addEventListener('keydown', event => {
                    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
                    event.preventDefault();
                    this._commitWidth(column.id, Math.max(24, column.width + (event.key === 'ArrowRight' ? 10 : -10)));
                    Array.from(this._header.querySelectorAll('[role=columnheader]')).find(cell => cell.dataset.columnId === column.id)?.querySelector('.resize').focus();
                });
                cell.append(handle);
            }
            this._pinCells(this._header);
        }
        _commitWidth(id, width) {
            const column = this._columns.find(column => column.id === id);
            if (!column || column.width === width) return;
            this.columns = this._columnDefinitions.map(column => column.id === id ? {...column, width} : column);
            this.dispatchEvent(new CustomEvent('grid-column-resize', {bubbles:true, composed:true, detail:{id, width}}));
        }
        _startResize(event, column, handle) {
            if (event.button !== 0) return;
            event.preventDefault(); event.stopPropagation();
            this._cancelResize?.();
            const start = event.clientX;
            let width = column.width;
            const abort = new this.ownerDocument.defaultView.AbortController();
            const options = {signal:abort.signal};
            const finish = commit => {
                abort.abort(); this._cancelResize = null;
                if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
                this._header.style.gridTemplateColumns = gridTemplate(this._columns);
                this._pinCells(this._header);
                handle.setAttribute('aria-valuenow', String(column.width));
                this._renderRows();
                if (commit) this._commitWidth(column.id, width);
            };
            this._cancelResize = () => finish(false);
            handle.setPointerCapture?.(event.pointerId);
            this.ownerDocument.addEventListener('pointermove', move => {
                if (move.pointerId !== event.pointerId) return;
                width = Math.max(24, Math.round(column.width + move.clientX - start));
                const preview = this._columns.map(item => item.id === column.id ? {...item, width} : item);
                const template = gridTemplate(preview);
                this._header.style.gridTemplateColumns = template;
                this._pinCells(this._header, preview);
                for (const row of this._body.querySelectorAll('.row')) {row.style.gridTemplateColumns = template; this._pinCells(row, preview);}
                this._syncHorizontal(preview);
                handle.setAttribute('aria-valuenow', String(width));
                handle.setAttribute('aria-valuemax', String(Math.max(10000, width)));
            }, options);
            this.ownerDocument.addEventListener('pointerup', up => {if (up.pointerId === event.pointerId) finish(true);}, options);
            this.ownerDocument.addEventListener('pointercancel', cancel => {if (cancel.pointerId === event.pointerId) finish(false);}, options);
            handle.addEventListener('lostpointercapture', () => finish(false), options);
            this.ownerDocument.addEventListener('keydown', key => {if (key.key === 'Escape') {key.preventDefault(); finish(false);}}, options);
        }
        _renderRows() {
            this._syncHorizontal();
            if (this._store?.error) { this._renderError(this._store.error); return; }
            const focusedKey = this.shadowRoot.activeElement?._gridKey;
            this._body.textContent = '';
            this._body.style.height = '0px';
            this._frame.setAttribute('aria-colcount', String(this._columns.length));
            if (!this._store || !this._columns.length) return;
            const count = this._store.size;
            this._frame.setAttribute('aria-rowcount', String(count + 1));
            this._frame.setAttribute('aria-colcount', String(this._columns.length));
            if (!count) { const empty=document.createElement('div'); empty.className='empty'; empty.textContent='No rows'; this._body.append(empty); return; }
            this._body.style.height = `${count * this._rowHeight}px`;
            const maximumScroll = Math.max(0, count * this._rowHeight + this._header.offsetHeight - (this._frame.clientHeight || 260));
            if (this._frame.scrollTop > maximumScroll) this._frame.scrollTop = maximumScroll;
            const viewport = this._frame.clientHeight || parseFloat(this.ownerDocument.defaultView.getComputedStyle(this._frame).height) || 260;
            const first = Math.max(0, Math.floor(this._frame.scrollTop / this._rowHeight) - this._overscan);
            const last = Math.min(count, Math.ceil((this._frame.scrollTop + viewport) / this._rowHeight) + this._overscan);
            for (let index=first; index<last; index++) this._body.append(this._row(this._store.rowAt(index), index));
            if (focusedKey != null) Array.from(this._body.querySelectorAll('.row')).find(row => row._gridKey === focusedKey)?.focus({preventScroll:true});
        }
        _row(row, index) {
            const element = document.createElement('div'); element.className = 'row'; element.setAttribute('role','row');
            element.classList.toggle('alternate', index % 2 === 1);
            element.tabIndex = 0; element.dataset.rowKey = String(row.key); element.style.top = `${index * this._rowHeight}px`;
            element._gridKey = row.key;
            element.style.gridTemplateColumns = gridTemplate(this._columns); element.setAttribute('aria-rowindex', String(index + 2));
            if (Object.is(row.key, this._selectedKey) || row.key === this._selectedKey) { element.classList.add('selected'); element.setAttribute('aria-selected','true'); }
            element.addEventListener('click', event => {
                this.focusCell = {rowKey:row.key, columnId:event.target.closest('.cell')?.dataset.columnId || this._columns[0].id};
                this._choose(row.key, 'pointer');
            });
            element.addEventListener('keydown', event => {
                if (!['ArrowDown','ArrowUp'].includes(event.key)) return;
                event.preventDefault();
                const selectedIndex = this._store.keys().indexOf(this._selectedKey);
                const current = selectedIndex < 0 ? index : selectedIndex;
                const target = Math.max(0, Math.min(this._store.size - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
                this.focusCell = {rowKey:this._store.rowAt(target).key, columnId:this.focusCell?.columnId || this._columns[0].id};
                this._choose(this._store.rowAt(target).key, 'keyboard');
                const top = target * this._rowHeight;
                const bottom = (target + 1) * this._rowHeight + this._header.offsetHeight;
                const viewport = this._frame.clientHeight || 260;
                if (top < this._frame.scrollTop) this._frame.scrollTop = top;
                else if (bottom > this._frame.scrollTop + viewport) this._frame.scrollTop = bottom - viewport;
                this._renderRows();
                Array.from(this._body.querySelectorAll('.row')).find(rowElement => rowElement._gridKey === this._selectedKey)?.focus({preventScroll:true});
            });
            for (const column of this._columns) {
                const value = gridCellValue(row, column, this._store); const cell = document.createElement('div'); cell.className = 'cell';
                cell.setAttribute('role','gridcell'); cell.dataset.columnId = column.id;
                cell.classList.toggle('numeric', ['N','L','I','R','F'].includes(column.dtype) || typeof value === 'number');
                cell.classList.toggle('boolean', column.dtype === 'B' || typeof value === 'boolean');
                if (column.cellClasses) cell.classList.add(...column.cellClasses.split(/\s+/).filter(Boolean));
                if (column.cellStyles) cell.style.cssText = column.cellStyles;
                if (value == null || value === '') cell.classList.add('null');
                cell.textContent = formatDisplay(value, {...column, locale:column.locale || this.locale}); element.append(cell);
            }
            this._pinCells(element);
            return element;
        }
        _choose(key, source) {
            if (key === this._selectedKey) return;
            this._selectedKey = key;
            this._renderRows();
            const row = key == null ? null : this._store.row(key);
            const detail = {key, rowNode:row?.node || null,
                row:row ? (this._store.datamode === 'attr' ? this._store.rowFromItem(row.node) : row.value) : null, source};
            const pointer = this.getAttribute('data-selectedKey-pointer');
            if (pointer) this.dispatchEvent(new CustomEvent('gnr-set', {bubbles:true, composed:true, detail:{pointer,value:key}}));
            this.dispatchEvent(new CustomEvent('grid-selected-row', {bubbles:true, composed:true, detail}));
        }
    }
    customElements.define('gnr-grid', GnrGrid);
}

registerComponentCollection('grid', {components:builtinComponents('grid'), defineComponents});

export {defineComponents};
