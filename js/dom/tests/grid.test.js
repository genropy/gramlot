// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {setupDom} from './dom.js';
import {getCollection} from '../src/collections.js';
import {BagGridStore} from '../src/collections/grid-store.js';
import {normalizeGridColumns, layoutGridColumns} from '../src/collections/grid-structure.js';
import '../src/collections/grid.js';

function records(count=50) {
    const result = new Bag();
    for (let index=0; index<count; index++) {
        const row = new Bag();
        row.setItem('code', `C${index}`);
        row.setItem('name', index === 1 ? null : `Row ${index}`);
        row.setItem('amount', index + 0.5);
        result.setItem(`r_${index}`, row);
    }
    return result;
}

function mount({bag=records(), identifier=null}={}) {
    setupDom();
    getCollection('grid').defineComponents();
    const element = document.createElement('gnr-grid');
    element.columns = [
        {field:'name', name:'Name', width:180},
        {field:'amount', name:'Amount', dtype:'N', places:2, width:100},
    ];
    element.identifier = identifier;
    element.storeBag = bag;
    document.body.append(element);
    return element;
}

test('Bag store uses labels by default and an explicit identifier field when requested', () => {
    const bag = records(3);
    const labels = new BagGridStore(bag);
    assert.deepEqual(labels.keys(), ['r_0','r_1','r_2']);
    labels.dispose();
    const codes = new BagGridStore(bag, {identifier:'code'});
    assert.deepEqual(codes.keys(), ['C0','C1','C2']);
    codes.dispose();
});

test('Bag store rejects duplicate and missing explicit keys', () => {
    const duplicate = records(2);
    duplicate.setItem('r_1.code', 'C0');
    assert.throws(() => new BagGridStore(duplicate, {identifier:'code'}), /Duplicate grid row key: C0/);
    duplicate.popNode('r_1.code');
    assert.throws(() => new BagGridStore(duplicate, {identifier:'code'}), /has no 'code' identifier/);
});

test('column structure has stable ids, shared geometry and duplicate detection', () => {
    const columns = normalizeGridColumns([{field:'name',width:90},{id:'name_again',field:'name'}]);
    assert.deepEqual(columns.map(column => [column.id,column.width]), [['name',90],['name_again',140]]);
    assert.throws(() => normalizeGridColumns([{field:'name'},{field:'name'}]), /Duplicate grid column id/);
});

test('zero widths share available space without changing the structure definition', () => {
    const columns = normalizeGridColumns([{field:'code',width:'90px'}, {field:'name',width:0}, {field:'city',width:0}]);
    assert.deepEqual(layoutGridColumns(columns, 490).map(column => column.width), [90,200,200]);
    assert.deepEqual(layoutGridColumns(columns, 100).map(column => column.width), [90,24,24]);
    assert.deepEqual(columns.map(column => column.width), [90,0,0]);
});

test('renders a bounded viewport and formats typed cells without changing Bag values', () => {
    const bag = records();
    const element = mount({bag});
    const rows = element.shadowRoot.querySelectorAll('.row');
    assert.ok(rows.length > 0 && rows.length < 30, `expected bounded rows, got ${rows.length}`);
    assert.match(rows[0].textContent, /0\.50/);
    assert.equal(bag.getItem('r_0.amount'), 0.5);
    assert.ok(element.shadowRoot.querySelector('[data-row-key="r_1"] .cell').classList.contains('null'));
});

test('insert, nested update and delete react while stable selection survives unrelated changes', () => {
    const bag = records(4); const element = mount({bag});
    let changes=0; element._store.subscribe(()=>changes++);
    element.shadowRoot.querySelector('[data-row-key="r_1"]').click();
    bag.setItem('r_1.name', 'Changed');
    assert.equal(bag.getItem('r_1.name'), 'Changed');
    assert.equal(element._store.row('r_1').value.getItem('name'), 'Changed');
    assert.equal(changes, 1);
    assert.match(element.shadowRoot.querySelector('[data-row-key="r_1"]').textContent, /Changed/);
    assert.equal(element.selectedKey, 'r_1');
    const extra = new Bag({code:'CX',name:'Extra',amount:9}); bag.setItem('extra', extra);
    assert.equal(element.shadowRoot.querySelectorAll('.row').length, 5);
    bag.popNode('r_0');
    assert.equal(element.selectedKey, 'r_1');
    bag.popNode('r_1');
    assert.equal(element.selectedKey, null);
});

test('selection has one external value, one writeback request and one public event', () => {
    const element = mount({bag:records(3)});
    element.setAttribute('data-selectedKey-pointer', 'main.ui.row');
    const writes=[]; const events=[];
    element.addEventListener('gnr-set', event => writes.push(event.detail));
    element.addEventListener('grid-selected-row', event => events.push(event.detail));
    element.selectedKey = 'r_2';
    assert.equal(events.length, 0, 'external selection does not echo an event');
    element.shadowRoot.querySelector('[data-row-key="r_0"]').click();
    assert.deepEqual(writes, [{pointer:'main.ui.row',value:'r_0'}]);
    assert.equal(events.length, 1);
    assert.deepEqual({key:events[0].key,source:events[0].source}, {key:'r_0',source:'pointer'});
    assert.equal(events[0].row.getItem('name'), 'Row 0');
});

test('store replacement unsubscribes the old Bag and disconnect cleanup survives reconnect', () => {
    const oldBag=records(2), nextBag=records(3); nextBag.setItem('r_0.name','Replacement');
    const element=mount({bag:oldBag});
    element.storeBag=nextBag;
    oldBag.setItem('r_0.name','Stale');
    assert.match(element.shadowRoot.textContent,/Replacement/);
    assert.doesNotMatch(element.shadowRoot.textContent,/Stale/);
    element.remove();
    oldBag.setItem('r_0.name','Still stale');
    document.body.append(element);
    assert.match(element.shadowRoot.textContent,/Replacement/);
});

test('disconnected configuration does not subscribe and invalid replacement retains the live store', () => {
    setupDom(); getCollection('grid').defineComponents();
    const element=document.createElement('gnr-grid'), original=records(2);
    element.columns=[{field:'name'}]; element.storeBag=original;
    assert.equal(element._store, undefined);
    document.body.append(element);
    const invalid=records(2); invalid.setItem('r_1.code','C0'); element.identifier='code';
    assert.throws(()=>{ element.storeBag=invalid; }, /Duplicate grid row key/);
    assert.equal(element.storeBag, original);
    original.setItem('r_0.name','Live');
    assert.match(element.shadowRoot.textContent,/Live/);
});

test('an unrelated row update retains keyboard focus', () => {
    const bag=records(4), element=mount({bag});
    const row=element.shadowRoot.querySelector('[data-row-key="r_2"]'); row.focus();
    bag.setItem('r_0.name','Elsewhere');
    assert.equal(element.shadowRoot.activeElement?.dataset.rowKey,'r_2');
});

test('arrows move the selected row and scroll only across visible boundaries', () => {
    const element = mount();
    element.rowHeight = 30;
    Object.defineProperty(element._frame, 'clientHeight', {value:150});
    Object.defineProperty(element._header, 'offsetHeight', {value:30});
    element.selectedKey = 'r_2';
    const press = (key, focusedKey = element.selectedKey) => {
        element.shadowRoot.querySelector(`[data-row-key="${focusedKey}"]`)
            .dispatchEvent(new window.KeyboardEvent('keydown', {key, bubbles:true}));
    };
    press('ArrowDown', 'r_0');
    assert.equal(element.selectedKey, 'r_3', 'navigation starts from selection, not a different focused row');
    assert.equal(element._frame.scrollTop, 0);
    press('ArrowDown');
    assert.equal(element.selectedKey, 'r_4');
    assert.equal(element._frame.scrollTop, 30, 'only the newly hidden row is revealed');
    press('ArrowUp');
    assert.equal(element.selectedKey, 'r_3');
    assert.equal(element._frame.scrollTop, 30);
    press('ArrowUp'); press('ArrowUp');
    assert.equal(element._frame.scrollTop, 30);
    press('ArrowUp');
    assert.equal(element.selectedKey, 'r_0');
    assert.equal(element._frame.scrollTop, 0);
    press('ArrowUp');
    assert.equal(element.selectedKey, 'r_0');
    element.remove();
});

test('frozen columns share offsets across headers, rows and resized structure', () => {
    const element = mount();
    element.frozenColumns = 2;
    const cells = () => [...element.shadowRoot.querySelector('.row').children];
    assert.deepEqual(cells().map(cell => cell.style.left), ['0px','180px']);
    assert.equal(element.shadowRoot.querySelectorAll('.header .frozen').length, 2);
    assert.ok(element.shadowRoot.querySelectorAll('.row')[1].classList.contains('alternate'));
    assert.ok(cells()[1].classList.contains('numeric'));
    element._commitWidth('name', 220);
    assert.equal(cells()[1].style.left, '220px');
    assert.equal(element._header.children[1].style.left, '220px');
    element.frozenColumns = 1;
    assert.ok(!cells()[1].classList.contains('frozen'));
    element.frozenColumns = 0;
    assert.ok(!cells()[0].classList.contains('frozen'));
    assert.throws(() => {element.frozenColumns = -1;}, /nonnegative/);
    element.remove();
});

test('horizontal scrollbar starts after frozen columns and synchronizes the viewport', () => {
    const element = mount();
    Object.defineProperty(element._frame, 'clientWidth', {value:220, configurable:true});
    Object.defineProperty(element._frame, 'offsetWidth', {value:237});
    element.frozenColumns = 1;
    assert.equal(element._horizontal.style.marginLeft, '181px');
    assert.equal(element._horizontalTrack.style.width, '100px');
    assert.equal(element._horizontal.hidden, false);
    element._horizontal.scrollLeft = 40;
    element._horizontal.dispatchEvent(new window.Event('scroll'));
    assert.equal(element._frame.scrollLeft, 40);
    element._frame.scrollLeft = 20;
    element._frame.dispatchEvent(new window.Event('scroll'));
    assert.equal(element._horizontal.scrollLeft, 20);
    element._commitWidth('name', 190);
    assert.equal(element._horizontal.style.marginLeft, '191px');
    element.frozenColumns = 0;
    assert.equal(element._horizontal.style.marginLeft, '1px');
    Object.defineProperty(element._frame, 'clientWidth', {value:400});
    element._syncHorizontal();
    assert.equal(element._horizontal.hidden, true);
    assert.equal(element._frame.scrollLeft, 0);
    element.remove();
});
