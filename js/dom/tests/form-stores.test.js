import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {formStore} from '../src/forms/stores.js';
import {BagRows} from '../src/stores/bag-rows.js';

function bag(values) { const b=new Bag();for (const [k,v] of Object.entries(values)) b.setItem(k,v);return b; }
function fixture(attrs) {
    const data=bag({original:bag({name:'Alpha',other:4})});
    return {attrs, application:{data}, sourceNode:{absDatapath:p=>p}, baseline:bag({})};
}
for (const type of ['item','hierarchical','subform']) test(`${type} form store copies, saves and guards location changes`,async()=>{
    const form=fixture({storepath:'original',storeFields:['name']});
    const store=formStore(form,type);
    const loaded=await store.load();
    loaded.data.setItem('name','Beta');
    assert.equal(form.application.data.getItem('original.name'),'Alpha');
    await store.save(loaded.data);
    assert.equal(form.application.data.getItem('original.name'),'Beta');
    assert.equal(form.application.data.getItem('original.other'),4);
    form.attrs.storepath='elsewhere';
    await assert.rejects(store.save(loaded.data),/Load the current/);
});
test('collection form store loads by stable key and updates the shared row',async()=>{
    const form=fixture({storeCode:'rows',storeKey:'a'});
    const rows=new Bag();rows.setItem('r',null,{id:'a',name:'Alpha'});
    const collection=new BagRows(rows,{identifier:'id',datamode:'attr'});
    form.application.stores={get:()=>collection};
    const store=formStore(form,'collection');
    const {data}=await store.load();data.setItem('name','Beta');await store.save(data);
    assert.equal(collection.rowFromItem(collection.itemByIdx(0)).name,'Beta');
    data.setItem('id','b');await assert.rejects(store.save(data),/identity/);
    collection.dispose();
});
test('record form store forwards typed Bags and cancellation to shared RPC',async()=>{
    const calls=[];const form=fixture({storeKey:'a',loadmethod:'load',savemethod:'save'});
    form.application.server={call:async(method,kw,options)=>{calls.push({method,kw,options});return {data:bag({name:'Alpha'})};}};
    const store=formStore(form,'record');const signal=new AbortController().signal;
    const {data}=await store.load({signal});await store.save(data,{signal});
    assert.deepEqual(calls.map(c=>c.method),['load','save']);
    assert.equal(calls[1].options.signal,signal);
    assert.ok(calls[1].kw.data instanceof Bag);
});
