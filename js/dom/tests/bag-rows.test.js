import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {AttributesBagRows, ValuesBagRows} from '../src/stores/bag-rows.js';

test('attribute store reads typed fields without allocating record Bags and writes attributes', () => {
    const bag = new Bag(); bag.setItem('a', null, {id:0, name:'Ada', active:false, amount:3});
    const store = new AttributesBagRows(bag, {identifier:'id'});
    assert.equal(store.getData(), bag);
    assert.equal(store.len(), 1);
    assert.equal(store.itemByIdx(0), bag.getNode('a'));
    assert.equal(store.getKeyFromIdx(0), 0);
    assert.equal(store.getIdxFromPkey(0), 0);
    assert.equal(store.rowBagNodeByIdentifier(0), bag.getNode('a'));
    assert.equal(store.itemByIdx(-1), null);
    assert.equal(store.itemByIdx(1), null);
    let changes = 0; store.subscribe(() => changes++);
    store.updateRow(0, {amount:null, name:''});
    assert.equal(changes, 1);
    assert.equal(bag.getNode('a').getValue(), null);
    assert.equal(store.getValue(bag.getNode('a'), 'active'), false);
    assert.deepEqual(store.rowByIndex(0), {id:0, name:'', active:false, amount:null});
    assert.ok(Object.hasOwn(bag.getNode('a').getAttr(), 'amount'));
    const snapshot = store.rowByIndex(0); snapshot.name = 'Detached';
    assert.equal(store.getValue(bag.getNode('a'), 'name'), '');
    store.dispose(); bag.getNode('a').setAttr({name:'After disposal'});
    assert.equal(changes, 1);
});

test('Bag values overlay row attributes and identifiers stay strict in both modes', () => {
    const bag = new Bag(); const record = new Bag(); record.setItem('name', null);
    bag.setItem('a', record, {name:'fallback', id:1});
    const store = new ValuesBagRows(bag, {identifier:'id'});
    assert.equal(store.getValue(bag.getNode('a'), 'name'), null);
    assert.equal(store.getValue(bag.getNode('a'), 'id'), 1);
    store.updateRow(0, {name:'Value'});
    assert.equal(record.getItem('name'), 'Value');
    assert.equal(bag.getNode('a').getAttr('name'), 'fallback');
    const duplicate = new Bag(); duplicate.setItem('a',null,{id:1}); duplicate.setItem('b',null,{id:1});
    assert.throws(() => new AttributesBagRows(duplicate,{identifier:'id'}), /Duplicate/);
    store.dispose();
});

test('batched resident writes refresh identity and notify once', () => {
    const bag = new Bag();
    bag.setItem('a', null, {id:1, amount:2});
    bag.setItem('b', null, {id:2, amount:3});
    const store = new AttributesBagRows(bag, {identifier:'id'});
    let changes = 0;
    store.subscribe(() => changes++);
    store.batch(() => {
        store.updateRowNode(bag.getNode('a'), {id:10, amount:4});
        store.updateRowNode(bag.getNode('b'), {amount:5});
    });
    assert.equal(changes, 1);
    assert.equal(store.getIdxFromPkey(10), 0);
    assert.deepEqual(store.rowByIndex(1), {id:2, amount:5});
    store.dispose();
});
