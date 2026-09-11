// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {createDecimal, isDecimal} from 'genro-tytx';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/grid.js';

function structure(cells) {
    const result = new Bag();
    cells.forEach((attributes, index) => result.setItem(`view_0.rows_0.cell_${index}`, '', attributes));
    return result;
}

function bagRows(records) {
    const rows = new Bag();
    records.forEach((record, index) => {
        const row = new Bag();
        for (const [field, value] of Object.entries(record)) row.setItem(field, value);
        rows.setItem(`r${index + 1}`, row);
    });
    return rows;
}

function mount(rows, struct, {datamode = 'bag', rate = createDecimal('10'), offset = 1} = {}) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['grid'];
        setup(data) { data.setItem('rows', rows); data.setItem('struct', struct); data.setItem('rate', rate); data.setItem('offset', offset); }
        main(root) { root.grid({store:'^rows', structpath:'struct', datamode, height:'140px'}); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'), {inspector:false});
    return {app, host, grid:host.querySelector('gnr-grid')};
}

test('calculated formulas initialize, chain and preserve Decimal precision in Bag rows', () => {
    const rows = bagRows([
        {quantity:createDecimal('9007199254740993'), price:createDecimal('1.1')},
        {quantity:createDecimal('0.1'), price:createDecimal('0.2')},
        {quantity:null, price:createDecimal('0.2')},
    ]);
    // Deliberately declare grand before its dependencies: evaluation follows the field graph.
    const struct = structure([
        {field:'grand', formula:'total + tax', calculated:true, dtype:'N'},
        {field:'quantity'}, {field:'price'},
        {field:'tax', formula:'total * rate / 100', formula_rate:'^rate', calculated:true, hidden:true},
        {field:'total', formula:'quantity * price', calculated:true, dtype:'N'},
    ]);
    const {app, host, grid} = mount(rows, struct);
    for (const path of ['r1.total','r1.tax','r1.grand','r2.total']) assert.ok(isDecimal(rows.getItem(path)), path);
    assert.equal(rows.getItem('r1.total').toString(), '9907919180215092.3');
    assert.equal(rows.getItem('r1.tax').toString(), '990791918021509.23');
    assert.equal(rows.getItem('r1.grand').toString(), '10898711098236601.53');
    assert.equal(rows.getItem('r2.total').toString(), '0.02');
    assert.equal(rows.getItem('r3.total'), null);
    assert.equal(rows.getItem('r3.grand'), null);
    assert.deepEqual(grid.columns.map(column => column.field), ['grand','quantity','price','total'], 'hidden formulas still calculate');

    app.live(() => rows.getItem('r2').setItem('quantity', createDecimal('0.3')));
    assert.equal(rows.getItem('r2.total').toString(), '0.06');
    assert.equal(rows.getItem('r2.grand').toString(), '0.066');
    app.live(() => app.data.setItem('main.rate', createDecimal('12.5')));
    assert.equal(rows.getItem('r2.tax').toString(), '0.0075');
    assert.equal(rows.getItem('r2.grand').toString(), '0.0675');
    assert.equal(grid.changeManager.errors.size, 0,
        [...grid.changeManager.errors].map(([field, error]) => `${field}: ${error.message}`).join('; '));
    app.dispose(); host.remove();
});

test('calculated false skips initialization but reacts later; failures store null and unchanged results do not write', () => {
    const rows = bagRows([{quantity:2, price:3, deferred:99, broken:12}]);
    const struct = structure([
        {field:'quantity'}, {field:'price'},
        {field:'deferred', formula:'quantity * price', calculated:false},
        {field:'broken', formula:'quantity + missing', calculated:true},
        {field:'passive', formula:'quantity + offset', formula_offset:'=offset', calculated:true},
    ]);
    const {app, host, grid} = mount(rows, struct, {rate:10});
    assert.equal(rows.getItem('r1.deferred'), 99);
    assert.equal(rows.getItem('r1.broken'), null);
    assert.equal(rows.getItem('r1.passive'), 3);
    assert.match(grid.changeManager.errors.get('broken').message, /missing/);

    app.live(() => app.data.setItem('main.offset', 5));
    assert.equal(rows.getItem('r1.passive'), 3, 'a passive formula parameter does not trigger recalculation');
    app.live(() => rows.getItem('r1').setItem('quantity', 4));
    assert.equal(rows.getItem('r1.deferred'), 12);
    assert.equal(rows.getItem('r1.passive'), 9, 'a row dependency reads the fresh passive parameter');
    let writes = 0;
    rows.getItem('r1').subscribe('formula-writes', {any:event => {if (event.node?.label === 'deferred') writes++;}});
    app.live(() => rows.getItem('r1').setItem('price', 3));
    assert.equal(writes, 0, 'an equal calculated result is not written back');
    app.live(() => rows.getItem('r1').popNode('quantity'));
    assert.equal(rows.getItem('r1.deferred'), null);
    app.live(() => rows.getItem('r1').setItem('quantity', 5));
    assert.equal(rows.getItem('r1.deferred'), 15, 'field insertion triggers a non-initial formula');
    app.dispose(); host.remove();
});

test('attribute rows maintain resident index, running sum and percentage formulas across order changes', () => {
    const rows = new Bag();
    rows.setItem('a', null, {amount:createDecimal('0.1')});
    rows.setItem('b', null, {amount:createDecimal('0.2')});
    rows.setItem('c', null, {amount:createDecimal('0.7')});
    const struct = structure([
        {field:'position', formula:'#', calculated:true, hidden:true},
        {field:'amount'},
        {field:'running', formula:'+=amount', calculated:true},
        {field:'share', formula:'%=amount', calculated:true},
    ]);
    const {app, host} = mount(rows, struct, {datamode:'attr', rate:10});
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('position')), [0,1,2]);
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('running').toString()), ['0.1','0.3','1']);
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('share').toString()), ['10','20','70']);

    app.live(() => rows.getNode('a').setAttr({amount:createDecimal('0.3')}));
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('running').toString()), ['0.3','0.5','1.2']);
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('share').toString()), ['25','16.666666666666666667','58.333333333333333333']);
    app.live(() => rows.move(2, 0));
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('position')), [0,1,2]);
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('running').toString()), ['0.7','1','1.2']);
    app.live(() => rows.popNode('a'));
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('share').toString()), ['77.777777777777777778','22.222222222222222222']);
    app.live(() => rows.setItem('d', null, {amount:createDecimal('0.1')}));
    assert.deepEqual(rows.getNodes().map(node => node.getAttr('position')), [0,1,2]);
    assert.equal(rows.getNode('d').getAttr('running').toString(), '1');
    app.dispose(); host.remove();
});

test('formula structure and store replacement release stale subscriptions and reject cycles', () => {
    const rows = bagRows([{quantity:2, price:3}]);
    const struct = structure([
        {field:'quantity'}, {field:'price'}, {field:'total', formula:'quantity * price', calculated:true},
    ]);
    const {app, host, grid} = mount(rows, struct, {rate:10});
    assert.equal(rows.getItem('r1.total'), 6);

    const noFormula = structure([{field:'quantity'}, {field:'price'}, {field:'total'}]);
    app.live(() => app.data.setItem('main.struct', noFormula));
    app.live(() => rows.getItem('r1').setItem('quantity', 4));
    assert.equal(rows.getItem('r1.total'), 6, 'removed formula no longer reacts');
    app.live(() => struct.getNode('view_0.rows_0.cell_2').setAttr({formula:'quantity + price'}));
    assert.equal(rows.getItem('r1.total'), 6, 'detached structure no longer reacts');

    const active = structure([
        {field:'quantity'}, {field:'price'}, {field:'total', formula:'quantity * price', calculated:true},
    ]);
    app.live(() => app.data.setItem('main.struct', active));
    const replacement = bagRows([{quantity:5, price:7}]);
    app.live(() => app.data.setItem('main.rows', replacement));
    assert.equal(replacement.getItem('r1.total'), 35);

    const cycle = structure([
        {field:'a', formula:'b + 1', calculated:true}, {field:'b', formula:'a + 1', calculated:true},
    ]);
    assert.throws(() => { grid.structBag = cycle; }, /dependency cycle/);
    cycle.getNode('view_0.rows_0.cell_1').setAttr({formula:'2'});
    assert.equal(replacement.getItem('r1.a'), 3, 'editing a rejected cyclic structure can recover it');
    assert.equal(replacement.getItem('r1.b'), 2);
    grid.structBag = active;
    app.dispose(); host.remove();
    replacement.getItem('r1').setItem('quantity', 8);
    assert.equal(replacement.getItem('r1.total'), 35, 'disposed manager releases store subscriptions');
});

test('unsupported Decimal expressions fail explicitly instead of using native operators', () => {
    const rows = bagRows([{amount:createDecimal('9007199254740993.25')}]);
    const struct = structure([
        {field:'amount'}, {field:'rounded', formula:'Math.round(amount)', calculated:true},
    ]);
    const {app, host, grid} = mount(rows, struct);
    assert.equal(rows.getItem('r1.rounded'), null);
    assert.match(grid.changeManager.errors.get('rounded').message, /Decimal grid formulas support arithmetic expressions only/);
    app.dispose(); host.remove();
});
