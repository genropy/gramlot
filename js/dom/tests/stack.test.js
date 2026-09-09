// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: legacy selected/selectedPage and stackButtons share live page selection.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import '../src/collections/layout.js';
import '../src/collections/inputs.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';
import {Application} from '../src/application.js';
import {wrapSource} from '../src/source-bag.js';

for (const tag of ['tabContainer', 'stackContainer']) {
    test(`${tag}: names, indices, buttons and retained child state`, async () => {
        setupDom();
        class Page extends HtmlBuilder {
            static wc_requires = ['layout', 'inputs'];
            setup() { this.setData('name', 'one'); this.setData('index', 0); }
            main(root) {
                root.stackButtons({stackNodeId:'test-stack'});
                const stack = root[tag]({selectedPage:'^name', selected:'^index', nodeId:'test-stack'});
                stack.contentPane({pageName:'one', title:'One'}).textBox({value:''});
                stack.contentPane({pageName:'two', title:'Two'}).div('Second');
            }
        }
        const host = document.createElement('div'); document.body.append(host);
        const app = new Application(host, new Page('main'));
        await new Promise(resolve => setTimeout(resolve, 0));
        const stack = host.querySelector(`gnr-${tag.toLowerCase()}`);
        const first = stack.querySelector('gnr-contentpane');
        const input = first.querySelector('gnr-textbox').shadowRoot.querySelector('input');
        input.value = 'Keep local text';
        app.live(() => app.data.setItem('main.name', 'two'));
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.equal(stack.value, 'two');
        assert.equal(first.style.display, 'none');
        assert.equal(app.data.getItem('main.index'), 1);
        app.live(() => app.data.setItem('main.index', 0));
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.equal(stack.value, 'one');
        assert.equal(app.data.getItem('main.name'), 'one');
        assert.equal(stack.querySelector('gnr-contentpane'), first);
        assert.equal(input.value, 'Keep local text');
        const buttons = host.querySelector('gnr-stackbuttons');
        assert.equal(buttons.shadowRoot.querySelectorAll('button').length, 2);
        buttons.shadowRoot.querySelectorAll('button')[1].click();
        assert.equal(app.data.getItem('main.name'), 'two');
        assert.equal(app.data.getItem('main.index'), 1);
        host.remove();
    });
}

test('source removal clears empty stack and controller; insertion restores selection', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['layout'];
        setup() { this.setData('name', 'one'); }
        main(root) {
            root.stackButtons({stackNodeId:'dynamic'});
            const stack = root.stackContainer({selectedPage:'^name', nodeId:'dynamic'});
            stack.contentPane({pageName:'one', title:'One'}).div('First');
            stack.contentPane({pageName:'two', title:'Two'}).div('Second');
        }
    }
    const host = document.createElement('div'); document.body.append(host);
    const app = new Application(host, new Page('main'));
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    await settle();
    host.querySelector('gnr-stackcontainer').switchPage('*next*');
    assert.equal(app.data.getItem('main.name'), 'two');
    const source = app.builder.source.getNodes().find(node => node.nodeTag === 'stackContainer');
    app.live(() => source.value.popNode(source.value.getNodes()[1].label));
    await settle();
    assert.equal(app.data.getItem('main.name'), 'one');
    app.live(() => source.value.popNode(source.value.getNodes()[0].label));
    await settle();
    assert.equal(app.data.getItem('main.name'), null);
    assert.equal(host.querySelector('gnr-stackbuttons').shadowRoot.querySelectorAll('button').length, 0);
    app.live(() => wrapSource(source).contentPane({pageName:'new', title:'New'}).div('New page'));
    await settle();
    assert.equal(app.data.getItem('main.name'), 'new');
    assert.equal(host.querySelector('gnr-stackbuttons').shadowRoot.querySelectorAll('button').length, 1);
    host.remove();
});

test('hidden, disabled, close veto, source deletion and local topics', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['layout'];
        setup() { this.setData('name','one'); this.setData('hidden',false); this.setData('disabled',false); }
        main(root) {
            root.stackButtons({stackNodeId:'life'});
            const stack = root.tabContainer({nodeId:'life', selectedPage:'^name'});
            stack.contentPane({pageName:'one', title:'One', hidden:'^hidden', closable:true}).div('First');
            stack.contentPane({pageName:'two', title:'Two', disabled:'^disabled', closable:true}).div('Second');
        }
    }
    const host = document.createElement('div'); document.body.append(host);
    const app = new Application(host, new Page('main'));
    const settle = () => new Promise(resolve => setTimeout(resolve,0));
    await settle();
    const messages = [];
    const unsubscribe = app.subscribe('life_hiding', value => messages.push(value.pageName));
    app.live(() => app.data.setItem('main.hidden',true));
    await settle();
    assert.equal(app.data.getItem('main.name'),'two');
    assert.deepEqual(messages,['one']);
    app.live(() => app.data.setItem('main.disabled',true));
    await settle();
    assert.equal(app.data.getItem('main.name'),null);
    app.live(() => app.data.setItem('main.hidden',false));
    await settle();
    assert.equal(app.data.getItem('main.name'),'one');
    const stack = host.querySelector('gnr-tabcontainer');
    const veto = event => event.preventDefault();
    stack.addEventListener('gnr-before-close',veto);
    stack.closePage(0);
    assert.equal(stack.querySelectorAll('gnr-contentpane').length,2);
    stack.removeEventListener('gnr-before-close',veto);
    stack.closePage(0);
    await settle();
    const source = app.builder.source.getNodes().find(node=>node.nodeTag==='tabContainer');
    assert.equal(source.value.getNodes().length,1);
    assert.equal(app.data.getItem('main.name'),null);
    unsubscribe();
    const count = messages.length;
    app.publish('life_hiding',{pageName:'ignored'});
    assert.equal(messages.length,count);
    host.remove();
});
