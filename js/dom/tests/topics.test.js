// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';
import {Application} from '../src/application.js';
import {wrapSource} from '../src/source-bag.js';
import '../src/collections/layout.js';

function mount() {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['layout'];
        main(root) {
            root.div({nodeId:'owner'}).div('Child', {nodeId:'child'});
            root.dataController({func:"this.SET('received', prefix + pageName); this.SET('reason', _reason); this.SET('topic', _topic);",
                subscribe_changed:true, prefix:'=prefix'});
            const stack = root.stackContainer({nodeId:'pages'});
            stack.contentPane({pageName:'a',title:'A'});
            stack.contentPane({pageName:'b',title:'B'});
        }
    }
    const host = document.createElement('div'); document.body.append(host);
    return new Application(host, new Page('main'));
}

test('topic controllers use body, current bindings, named payload and topic context', () => {
    const app = mount();
    app.live(() => app.data.setItem('main.prefix','Hello '));
    app.publish('changed',{pageName:'A'});
    assert.equal(app.data.getItem('main.received'),'Hello A');
    assert.equal(app.data.getItem('main.reason'),'topic');
    assert.equal(app.data.getItem('main.topic'),'changed');
    const controller = app.builder.source.getNodes().find(n=>n.nodeTag==='dataController');
    app.live(()=>controller.parentBag.popNode(controller.label));
    app.publish('changed',{pageName:'B'});
    assert.equal(app.data.getItem('main.received'),'Hello A');
    app.live(()=>wrapSource(app.builder.source).dataController({func:(node,args)=>node.SET('received',args.payload), subscribe_changed:true}));
    app.publish('changed',42);
    assert.equal(app.data.getItem('main.received'),42);
    app.dispose();
});

test('subscription handles are independent, abortable and source-owned', () => {
    const app = mount(); let count=0;
    const callback = ()=>count++;
    const first = app.subscribe('tick',callback);
    const second = app.subscribe('tick',callback);
    first(); first(); app.publish('tick'); assert.equal(count,1);
    second();
    const owner = app.builder.source.getNodes().find(n=>n.getAttr('nodeId')==='owner'), child=owner.value.getNodes()[0];
    app.subscribe('tick',callback,{sourceNode:child});
    app.live(()=>owner.parentBag.popNode(owner.label));
    app.publish('tick'); assert.equal(count,1);
    assert.equal(app.events._subscriptions.size,0);
    const abort = new AbortController();
    app.subscribe('tick',callback,{signal:abort.signal}); abort.abort();
    app.publish('tick'); assert.equal(count,1);
    app.subscribe('tick',callback); app.dispose(); app.publish('tick');
    assert.equal(count,1);
});

test('one subscriber can cancel a pending callback; unmounted facade accepts topics', () => {
    setupDom(); const app = new Application(document.createElement('div'));
    let count=0, cancel;
    app.subscribe('tick',()=>cancel()); cancel=app.subscribe('tick',()=>count++);
    app.publish('tick'); assert.equal(count,0); app.dispose();
});

test('nodeId switchPage commands reach the existing stack and its topic notifications', async () => {
    const app = mount();
    await new Promise(resolve=>setTimeout(resolve,0));
    const selected=[];
    app.subscribe('pages_showing', p=>selected.push(p.pageName));
    app.publish('pages_switchPage','b');
    assert.equal(app.target.root.querySelector('gnr-stackcontainer').value,'b');
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.deepEqual(selected,['b']);
    app.dispose();
});

test('node publish/subscribe qualify names and share genro with stable anonymous identity', () => {
    const app = mount();
    const owner = app.builder.source.getNodes().find(n=>n.getAttr('nodeId')==='owner');
    let seen;
    app.subscribe('owner_ready', payload=>seen=payload);
    owner.publish('ready',7); assert.equal(seen,7);
    const anonymous = app.builder.source.getNodes().find(n=>n.nodeTag==='dataController');
    let local=0;
    anonymous.subscribe('ready', function (payload) { assert.equal(this,anonymous); local+=payload; });
    anonymous.publish('ready',2); anonymous.publish('ready',3);
    assert.equal(local,5); assert.equal(seen,7);
    app.live(()=>anonymous.parentBag.popNode(anonymous.label));
    assert.equal(app.events._subscriptions.size,1);
    app.dispose();
});

test('replacing a child Bag disposes owned callbacks and removed handlers in the current publication', () => {
    const app=mount();
    const owner=app.builder.source.getNodes().find(n=>n.getAttr('nodeId')==='owner');
    const child=owner.value.getNodes()[0];
    let count=0; child.subscribe('tick',()=>count++);
    app.live(()=>owner.setValue('replacement'));
    assert.equal(app.events._subscriptions.size,0);
    const controller=app.builder.source.getNodes().find(n=>n.nodeTag==='dataController');
    app.subscribe('changed',()=>app.live(()=>controller.parentBag.popNode(controller.label)));
    app.publish('changed',{pageName:'removed'});
    assert.equal(app.data.getItem('main.received'),null);
    assert.equal(count,0); app.dispose();
});


test('function controllers receive trusted runtime context and topics stay application-local', () => {
    const app = mount();
    const other = new Application(document.createElement('div'));
    let received = 0;
    other.subscribe('context', () => received++);
    app.live(() => wrapSource(app.builder.source).dataController({
        subscribe_context: true,
        func: (node, args) => {
            assert.equal(args.sourceNode, node);
            assert.equal(args.genro, app);
            assert.equal(args._reason, 'topic');
            assert.equal(args._topic, 'context');
        },
    }));
    app.publish('context', {sourceNode: 'payload', genro: 'payload', _reason: 'payload', _topic: 'payload'});
    assert.equal(received, 0);
    app.dispose(); other.dispose();
});
