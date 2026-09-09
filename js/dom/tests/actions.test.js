// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';
import {Application} from '../src/application.js';

test('actions resolve current parameters, guard disabled, and publish to live recipes', () => {
    setupDom();
    class Page extends HtmlBuilder {
        setup() { this.setData('message', 'old'); this.setData('disabled', false); }
        main(root) {
            root.button('Copy', {id:'copy', message:'=message', disabled:'^disabled',
                action:"this.SET('result', message);", publish:'ignored'});
            root.button('Publish', {id:'publish', publish:'return'});
            root.div('', {id:'listener', subscribe_return:"this.SET('result', payload);"});
        }
    }
    const host = document.createElement('div'); document.body.append(host);
    const app = new Application(host, new Page('main'));
    app.live(() => app.data.setItem('main.message', 'new'));
    host.querySelector('#copy').click();
    assert.equal(app.data.getItem('main.result'), 'new');
    app.live(() => app.data.setItem('main.disabled', true));
    app.live(() => app.data.setItem('main.message', 'blocked'));
    host.querySelector('#copy').dispatchEvent(new Event('click', {bubbles:true}));
    assert.equal(app.data.getItem('main.result'), 'new');
    host.querySelector('#publish').click();
    assert.equal(app.data.getItem('main.result'), true);
    const listener = app.builder.source.getNodes().find(node => node.getAttr('id') === 'listener');
    app.live(() => listener.parentBag.popNode(listener.label));
    app.publish('return', 'removed');
    assert.equal(app.data.getItem('main.result'), true);
});

test('genro event service isolates page instances and preserves source-node action scope', () => {
    setupDom();
    class Page extends HtmlBuilder {
        main(root) {
            root.div({datapath:'local'}).button('Run', {
                action:"this.SET('.result', sourceNode === this); genro.publish('done', this);"
            });
        }
    }
    const mount = () => {
        const host = document.createElement('div'); document.body.append(host);
        return new Application(host, new Page('main'));
    };
    const first = mount(), second = mount();
    let received, other = false;
    first.events.subscribe('done', node => {received = node;});
    second.subscribe('done', () => {other = true;});
    first.target.root.querySelector('button').click();
    assert.equal(first.data.getItem('main.local.result'), true);
    assert.equal(second.data.getItem('main.local.result'), null);
    assert.equal(received.nodeTag, 'button');
    assert.equal(other, false);
});
