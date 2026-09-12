import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDecimal, toTytx, fromTytx} from 'genro-tytx';
import {Application, HtmlBuilder} from '../src/index.js';
import {selectionBag} from '../src/stores/collection-stores.js';
import {setupDom} from './dom.js';
import '../src/collections/grid.js';

const reply = result => new Response(toTytx({ok:true,result}, 'json'));
const selection = rows => ({rows, identifier:'code', metadata:{totalrows:rows.length}});
function mount() {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['grid'];
        main(root) {
            root.grid({store:'states', columns:[{field:'name'}]});
            root.rpcStore({storeCode:'states',storepath:'rows',method:'states',_identifier:'code',_on_start:true, q:'^q'});
            root.grid({store:'states', columns:[{field:'name'}]});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'), {rpc:'/rpc'});
    return {app, host, node:app.builder.source.getNodes().find(n => n.nodeTag === 'rpcStore')};
}

test('typed selection validates identity and preserves values/order', () => {
    const date = new Date('2026-09-12T00:00:00Z');
    const bag = selectionBag(selection([{code:0,name:null,amount:createDecimal('2.50'),date},{code:'a.b',name:'second'}]),'code');
    assert.equal(bag.getNodes()[0].getAttr('code'),0);
    assert.equal(bag.getNodes()[0].getAttr('name'),null);
    assert.equal(bag.getNodes()[0].getAttr('amount').toString(),'2.5');
    assert.equal(bag.getNodes()[0].getAttr('date'),date);
    assert.equal(bag.getNodes()[1].getAttr('code'),'a.b');
    assert.throws(() => selectionBag(selection([{code:'x'},{code:'x'}]),'code'), /Duplicate/);
    assert.throws(() => selectionBag(selection([{}]),'code'), /identifier/);
});

test('RPC collection shares a store, retains data on error and detaches consumers safely', async t => {
    let result = selection([{code:'NSW',name:'New South Wales'},{code:'VIC',name:'Victoria'}]);
    const calls=[];
    t.mock.method(globalThis,'fetch',async (_url,opts) => {calls.push(fromTytx(opts.body,'json'));return reply(result);});
    const {app,host,node}=mount();
    t.after(() => app.dispose());
    assert.equal((await node._rpcPromise).status,'ready');
    const grids=[...host.querySelectorAll('gnr-grid')];
    const store=app.stores.get('states');
    assert.equal(grids[0].collectionStore(),store);
    assert.equal(grids[1].collectionStore(),store);
    assert.deepEqual(Object.keys(calls[0]),['q']);
    assert.equal(store.len(),2);
    grids[0].selectedKey='VIC';
    result=selection([{code:'VIC',name:'Victoria updated'},{code:'NSW',name:'NSW'}]);
    await store.loadData();
    assert.equal(grids[0].selectedKey,'VIC');
    assert.equal(grids[1].selectedKey,null);
    const prior=store.getData();
    result=selection([{code:'bad'},{code:'bad'}]);
    assert.equal((await store.loadData()).status,'error');
    assert.equal(store.getData(),prior);
    assert.match(store.loadError.message,/Duplicate/);
    grids[0].remove();
    assert.equal(store.len(),2);
    result=selection([{code:'VIC',name:'Still live'}]);
    await store.loadData();
    assert.match(grids[1].shadowRoot.textContent,/Still live/);
});

test('busy refusal and owner removal prevent late collection writes', async t => {
    let resolve;
    let calls=0;
    t.mock.method(globalThis,'fetch',() => {calls++;return new Promise(r => {resolve=r;});});
    const {app,node}=mount();
    t.after(() => app.dispose());
    const store=app.stores.get('states');
    assert.equal((await store.loadData()).status,'busy');
    assert.equal(calls,1);
    const pending=node._rpcPromise;
    app.live(() => app.builder.source.popNode(node.label));
    resolve(reply(selection([{code:'NSW',name:'late'}])));
    assert.equal((await pending).status,'obsolete');
    assert.equal(app.data.getItem('main.rows'),null);
    assert.throws(() => app.stores.get('states'),/Unknown/);
});

test('resident declarations share replacements and reject duplicate codes', t => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['grid'];
        main(root) {
            root.bagStore({storeCode:'local',storepath:'rows',_identifier:'code',datamode:'attr'});
            root.grid({store:'local',columns:[{field:'name'}]});
        }
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('main'));
    t.after(()=>app.dispose());
    const store=app.stores.get('local');
    const bag=selectionBag(selection([{code:'a',name:'Resident'}]),'code');
    app.live(()=>app.data.setItem('main.rows',bag));
    assert.equal(store.getData(),bag);
    assert.match(host.querySelector('gnr-grid').shadowRoot.textContent,/Resident/);
    assert.throws(()=>app.stores.register(store.storeNode),/Duplicate/);
});

test('RPC store delay coalesces parameters and standalone installation fails', async t => {
    setupDom();
    const calls=[];
    t.mock.method(globalThis,'fetch',async (_url,opts)=>{
        calls.push(fromTytx(opts.body,'json'));
        return reply(selection([]));
    });
    class Page extends HtmlBuilder {
        main(root) {
            root.rpcStore({storeCode:'delayed',storepath:'rows',rpcmethod:'states',_identifier:'code',_delay:10,q:'^q'});
        }
    }
    assert.throws(()=>new Application(document.createElement('div'),new Page('main')),/standalone/);
    const app=new Application(document.createElement('div'),new Page('main'),{rpc:'/rpc'});
    t.after(()=>app.dispose());
    app.data.setItem('main.q','first');
    app.data.setItem('main.q','last');
    await new Promise(r=>setTimeout(r,25));
    await app.stores.get('delayed').storeNode._rpcPromise;
    assert.deepEqual(calls,[{q:'last'}]);
});
