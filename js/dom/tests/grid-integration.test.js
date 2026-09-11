// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/grid.js';

function rows() {
    const result = new Bag();
    for (let i = 0; i < 50; i++) {
        const row = new Bag();
        row.setItem('name', `Record ${i}`);
        row.setItem('amount', i === 0 ? null : i + .12345);
        result.setItem(`r${i}`, row);
    }
    return result;
}

export function verifyGrid(builder) {
    setupDom();
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, builder, {inspector:false});
    app.live(() => {app.data.setItem('main.rows', rows()); app.data.setItem('main.selected', 'r2');});
    const grid = host.querySelector('gnr-grid');
    assert.ok(grid?.shadowRoot);
    assert.equal(grid.selectedKey, 'r2');
    assert.equal(grid.storeBag.getItem('r0.amount'), null);
    assert.equal(grid.storeBag.getItem('r1.amount'), 1.12345);
    const messages = [];
    const source = app.builder.source.getNodes().find(node => node.nodeTag === 'grid');
    const unsubscribe = source.subscribe('onSelectedRow', message => messages.push(message));
    grid.shadowRoot.querySelector('[data-row-key="r1"]').click();
    assert.equal(app.data.getItem('main.selected'), 'r1');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].key, 'r1');
    const separator = grid.shadowRoot.querySelector('.resize');
    separator.dispatchEvent(new window.KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
    assert.equal(app.data.getItem(source.absDatapath(source.getAttr('structpath'))).getNode('view_0.rows_0.cell_0').attr.width, 170);
    assert.equal(grid.columns[0].width, 170);
    app.live(() => app.data.setItem('main.rows.r1.name', 'Updated'));
    assert.equal(host.querySelector('gnr-grid'), grid, 'row update preserves viewport');
    assert.equal(grid.columns[0].width, 170, 'resized structure survives data updates');
    assert.ok(grid.shadowRoot.textContent.includes('Updated'));
    app.live(() => app.data.setItem('main.selected', 'r3'));
    assert.equal(grid.selectedKey, 'r3');
    const old = grid.storeBag;
    const replacement = rows();
    app.live(() => app.data.setItem('main.rows', replacement));
    assert.equal(host.querySelector('gnr-grid'), grid, 'store replacement preserves viewport');
    assert.equal(grid.storeBag, replacement);
    old.setItem('r1.name', 'Detached mutation');
    assert.ok(!grid.shadowRoot.textContent.includes('Detached mutation'));
    app.live(() => replacement.popNode('r3'));
    assert.equal(grid.selectedKey, null);
    assert.equal(app.data.getItem('main.selected'), null, 'deleted selection reconciles Data');
    unsubscribe();
    app.dispose();
    host.remove();
}

test('quickGrid integrates store replacement, external selection and lifecycle', () => {
    class Page extends HtmlBuilder {
        static wc_requires = ['grid'];
        main(root) {
            const grid = root.quickGrid({value:'^rows', selectedKey:'^selected', height:'220px'});
            grid.column('name', {name:'Name', width:160});
            grid.column('amount', {dtype:'N', places:2});
        }
    }
    verifyGrid(new Page('main'));
});

test('explicit grid structure uses the same renderer and reactive columns', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['grid'];
        main(root) {root.grid({store:'^rows', columns:'^columns', frozenColumns:'^frozen'});}
    }
    const host = document.body.appendChild(document.createElement('div'));
    // Seed bound structure before rendering, as a host would for reusable columns.
    const builder = new Page('main');
    builder.setup = data => {
        data.setItem('rows', rows());
        data.setItem('frozen', 0);
        data.setItem('columns', [{field:'name', name:'Original'}]);
    };
    const app = new Application(host, builder, {inspector:false});
    const grid = host.querySelector('gnr-grid');
    assert.ok(grid.shadowRoot.textContent.includes('Original'));
    app.live(() => app.data.setItem('main.frozen', 1));
    assert.equal(grid.frozenColumns, 1);
    assert.equal(grid.shadowRoot.querySelectorAll('.header .frozen').length, 1);
    const handle = grid.shadowRoot.querySelector('.resize');
    const pointer = (target, type, x) => {
        const event = new window.MouseEvent(type, {clientX:x, button:0, bubbles:true});
        Object.defineProperty(event, 'pointerId', {value:1}); target.dispatchEvent(event);
    };
    pointer(handle, 'pointerdown', 140);
    pointer(document, 'pointermove', 180);
    assert.equal(app.data.getItem('main.columns')[0].width, undefined, 'drag preview does not commit');
    pointer(document, 'pointerup', 180);
    assert.equal(app.data.getItem('main.columns')[0].width, 180);
    assert.equal(grid.columns[0].width, 180);
    pointer(grid.shadowRoot.querySelector('.resize'), 'pointerdown', 180);
    pointer(document, 'pointermove', 220);
    document.dispatchEvent(new window.KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
    assert.equal(grid.columns[0].width, 180, 'Escape cancels resize');
    app.live(() => app.data.setItem('main.columns', [{field:'amount', name:'Amount', places:2}]));
    assert.equal(host.querySelector('gnr-grid'), grid);
    assert.ok(grid.shadowRoot.textContent.includes('Amount'));
    assert.ok(!grid.shadowRoot.textContent.includes('Original'));
    app.dispose(); host.remove();
});

test('attribute grids react to field changes, inserts, deletes and atomic representation replacement', () => {
    setupDom();
    const records = new Bag(); records.setItem('a', null, {id:0, name:'Ada', amount:1.25});
    class Page extends HtmlBuilder {
        static wc_requires = ['grid'];
        setup(data) {data.setItem('rows', records); data.setItem('mode', 'attr'); data.setItem('selected', 0);}
        main(root) {root.quickGrid({value:'^rows', datamode:'^mode', identifier:'id', selectedKey:'^selected'}).column('name').column('amount', {places:2});}
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'), {inspector:false});
    const grid = host.querySelector('gnr-grid');
    assert.equal(grid.datamode, 'attr');
    assert.equal(grid.collectionStore().getValue(records.getNode('a'), 'name'), 'Ada');
    app.live(() => records.getNode('a').setAttr({name:'Updated'}));
    assert.ok(grid.shadowRoot.textContent.includes('Updated'));
    app.live(() => records.setItem('b', null, {id:2, name:'New', amount:0}));
    const events = [];
    grid.addEventListener('grid-selected-row', event => events.push(event.detail));
    grid.shadowRoot.querySelector('[data-row-key="2"]').click();
    assert.equal(app.data.getItem('main.selected'), 2);
    assert.equal(events[0].row.name, 'New');
    app.live(() => records.popNode('b'));
    assert.equal(app.data.getItem('main.selected'), null);
    const replacement = new Bag(); replacement.setItem('c', new Bag({id:3, name:'Bag replacement', amount:2}));
    app.live(() => {app.data.setItem('main.mode', 'bag'); app.data.setItem('main.rows', replacement);});
    assert.equal(host.querySelector('gnr-grid'), grid);
    assert.equal(grid.datamode, 'bag');
    assert.ok(grid.shadowRoot.textContent.includes('Bag replacement'));
    records.getNode('a').setAttr({name:'Detached'});
    assert.ok(!grid.shadowRoot.textContent.includes('Detached'));
    app.dispose(); host.remove();
});

test('legacy structpath reacts to Bag order, attributes, replacement and resize writeback', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['grid'];
        main(root) {root.div({datapath:'panel'}).grid({store:'^rows', structpath:'.structure', selectedKey:'^selected'});}
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'), {inspector:false});
    const struct = new Bag();
    struct.setItem('view_0.rows_0.first', null, {field:'name', name:'Name', width:'160px', custom:'keep'});
    struct.setItem('view_0.rows_0.second', null, {field:'amount', name:'Amount', width:100, places:2});
    app.live(() => {app.data.setItem('main.rows', rows()); app.data.setItem('main.panel.structure', struct); app.data.setItem('main.selected', 'r2');});
    const grid = host.querySelector('gnr-grid');
    const cells = struct.getItem('view_0.rows_0');
    const ids = () => grid.columns.map(column => column.id);
    assert.deepEqual(ids(), ['first','second']);
    app.live(() => cells.move(1,0));
    assert.deepEqual(ids(), ['second','first']);
    app.live(() => cells.getNode('first').setAttr({name:'Renamed', width:190, cellStyles:'color: red'}));
    assert.equal(grid.columns[1].name, 'Renamed');
    assert.equal(grid.columns[1].width, 190);
    assert.equal(grid.shadowRoot.querySelector('.cell[data-column-id="first"]').style.color, 'red');
    grid.shadowRoot.querySelector('.resize').dispatchEvent(new window.KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
    assert.equal(cells.getNode('second').attr.width, 110, 'resize follows label after reorder');
    assert.equal(cells.getNode('first').attr.custom, 'keep');
    app.live(() => cells.getNode('second').setAttr({hidden:true}));
    assert.deepEqual(ids(), ['first']);
    app.live(() => cells.setItem('third', null, {field:'amount', width:80}));
    assert.deepEqual(ids(), ['first','third']);
    app.live(() => cells.popNode('first'));
    assert.deepEqual(ids(), ['third']);
    const replacement = new Bag();
    replacement.setItem('view_0.rows_0.other', null, {field:'name', width:0});
    app.live(() => app.data.setItem('main.panel.structure', replacement));
    assert.deepEqual(ids(), ['other']);
    assert.equal(grid.columns[0].width, 0, 'elastic width remains zero in definition');
    app.live(() => cells.setItem('detached', null, {field:'name'}));
    assert.deepEqual(ids(), ['other']);
    assert.equal(host.querySelector('gnr-grid'), grid);
    assert.equal(grid.selectedKey, 'r2');
    app.live(() => replacement.getNode('view_0.rows_0.other').setAttr({hidden:true}));
    assert.deepEqual(ids(), []);
    assert.equal(grid.shadowRoot.querySelectorAll('.cell').length, 0);
    assert.equal(grid.shadowRoot.querySelector('[role=grid]').getAttribute('aria-colcount'), '0');
    app.dispose(); host.remove();
    replacement.getNode('view_0.rows_0.other').setAttr({hidden:false});
    assert.deepEqual(ids(), [], 'disposed grid releases structure subscriptions');
});

test('legacy view rows cell helpers keep ordinary transportable structure Bags', async () => {
    const {GridStruct} = await import('../src/collections/grid-authoring.js');
    const {toTytx, fromTytx} = await import('genro-tytx');
    const {gridColumnsFromStruct} = await import('../src/collections/grid-structure.js');
    const struct = new GridStruct();
    const row = struct.view().rows({headerClasses:'compact'});
    row.cell('name', {name:'Name', width:'90px'});
    row.cell('name', {name:'Repeated name', width:0});
    const copy = fromTytx(toTytx(struct, 'json'), 'json');
    assert.equal(copy.constructor, Bag);
    assert.equal(copy.getItem('view_0.rows_0.cell_0'), '');
    assert.deepEqual(gridColumnsFromStruct(copy).map(cell => [cell.id, cell.field, cell.width, cell.headerClasses]),
        [['cell_0','name','90px','compact'], ['cell_1','name',0,'compact']]);
});
