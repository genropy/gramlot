// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Observable ownership contracts against real DOM, Bag and builder implementations.
import assert from 'node:assert/strict';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {HtmlBuilder, Application} from 'gramlot-dom';

setupDom();
class Page extends HtmlBuilder {
    setup() { this.setData('title', 'initial'); }
    main(root) {
        root.input({value: '^title'});
        root.p('^title');
        root.button('Run', {action: "this.SET('action', 'called');"});
        root.div('', {subscribe_ping: "this.SET('topic', payload);"});
        root.div({id: `${this.name}-child`});
    }
}
class Fixture {
    mount(name = 'main', host = document.createElement('div'), Builder = Page) {
        if (!host.isConnected) document.body.append(host);
        return new Application(host, new Builder(name));
    }
    idempotent() {
        const first = this.mount('first'), peer = this.mount('peer');
        const host = first.target.root;
        const child = this.mount('child', host.querySelector('#first-child'));
        child.dispose();
        first.live(() => first.builder.data.setItem('title', 'parent still alive'));
        assert.equal(host.querySelector('p').textContent, 'parent still alive');
        first.dispose(); first.dispose();
        assert.equal(host.isConnected, true);
        assert.equal(host.childNodes.length, 0);
        peer.live(() => peer.builder.data.setItem('title', 'peer alive'));
        assert.equal(peer.target.root.querySelector('p').textContent, 'peer alive');
        // A replacement uses exactly the same host. Even the first disposal of
        // the old Application must preserve output now owned by the replacement.
        const old = this.mount('old', host);
        const replacement = this.mount('new', host);
        old.dispose(); old.dispose(); first.dispose();
        replacement.live(() => replacement.builder.data.setItem('title', 'replacement alive'));
        assert.equal(host.querySelector('p').textContent, 'replacement alive');
        peer.dispose(); replacement.dispose();
    }
    stale() {
        let controllerCalls = 0;
        class ObservedPage extends Page {
            main(root) {
                super.main(root);
                root.dataController({func: () => controllerCalls++, title: '^title'});
            }
        }
        const app = this.mount('main', undefined, ObservedPage);
        app.live(() => app.builder.data.setItem('title', 'control'));
        assert.equal(controllerCalls, 1);
        assert.equal(app.target.root.querySelector('p').textContent, 'control');
        const host = app.target.root, data = app.builder.data, source = app.builder.source;
        const input = host.querySelector('input'), button = host.querySelector('button');
        const reader = host.querySelector('p');
        let external = 0;
        app.data.subscribe('external', {any: () => external++});
        app.dispose();
        // Reattach retained old controls: verifies listeners were detached from
        // the caller's host, not merely made unreachable by removing its children.
        host.append(input, button, reader);
        input.value = 'stale input';
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
        button.click();
        host.dispatchEvent(new CustomEvent('gnr-set', {detail: {pointer: 'main.title', value: 'stale command'}}));
        host.dispatchEvent(new CustomEvent('gnr-topic', {detail: {topic: 'ping', payload: 'stale topic'}}));
        assert.equal(data.getItem('title'), 'control');
        assert.equal(data.getItem('action'), null);
        assert.equal(data.getItem('topic'), null);
        data.setItem('title', 'retained data');
        const node = source.getNodes().find(node => node.nodeTag === 'p');
        node.setValue('retained source');
        assert.equal(data.getItem('title'), 'retained data');
        assert.equal(node.getValue(), 'retained source');
        assert.equal(reader.textContent, 'control');
        assert.equal(controllerCalls, 1, 'disposed data controller cannot run');
        assert.equal(host.querySelector('p'), reader);
        assert.ok(external > 0, 'unrelated Bag observer remains subscribed');
        app.render(); app.live(() => { throw Error('disposed runtime ran callback'); });
        assert.equal(host.querySelector('p'), reader);
    }
    pending() {
        let formulaRuns = 0;
        class Formulas extends Page {
            main(root) {
                super.main(root);
                root.dataFormula({destination: 'derived', formula: ({title}) => { formulaRuns++; return title.toUpperCase(); }, title: '^title'});
            }
        }
        const app = this.mount('main', undefined, Formulas), peer = this.mount('peer');
        app.live(() => app.builder.data.setItem('title', 'before'));
        assert.equal(formulaRuns, 1, 'positive control: formula is reactive');
        assert.equal(app.builder.data.getItem('derived'), 'BEFORE');
        let calls = 0, peerCalls = 0;
        peer.subscribe('ping', () => peerCalls++);
        const signal = new window.AbortController();
        const removed = app.subscribe('later', () => calls++, {signal: signal.signal});
        app.subscribe('stop', () => app.dispose());
        app.subscribe('stop', () => calls++);
        app.live(() => {
            app.builder.data.setItem('title', 'queued');
            app.publish('stop');
        });
        assert.equal(formulaRuns, 1, 'queued formula never executes');
        assert.equal(app.builder.data.getItem('derived'), 'BEFORE');
        assert.equal(app.target.root.childNodes.length, 0, 'queued rendering cannot remount');
        app.publish('later'); app.publish('ping', 'after disposal');
        app.subscribe('later', () => calls++); app.publish('later');
        assert.equal(app.builder.data.getItem('topic'), null);
        assert.equal(calls, 0, 'remaining snapshot callbacks cannot deliver');
        removed(); signal.abort(); app.dispose();
        peer.publish('ping', 'peer topic');
        assert.equal(peerCalls, 1);
        assert.equal(peer.builder.data.getItem('topic'), 'peer topic');
        peer.dispose();
        let controllerApp, laterControllers = 0, closingControllers = 0;
        class Controllers extends HtmlBuilder {
            static components = ['row'];
            setup() { this.setData('rows.r1.qty', 1); }
            main(root) { root.div().row({iterate: '^rows', id: 'rules'}); }
            row(root, {node_label}) {
                const row = root.div({datapath: `.${node_label}`});
                row.span('^.qty');
                row.dataController({qty: '^.qty', func: () => {
                    closingControllers++;
                    controllerApp.dispose();
                }});
                row.dataController({qty: '^.qty', func: () => laterControllers++});
            }
        }
        controllerApp = this.mount('controllers', undefined, Controllers);
        controllerApp.live(() => controllerApp.builder.data.setItem('rows.r1.qty', 2));
        assert.equal(closingControllers, 1);
        assert.equal(laterControllers, 0, 'remaining component controllers cannot deliver');
        assert.equal(controllerApp.target.root.childNodes.length, 0);
        // Disposal from an author component while a full render is in flight
        // must prevent that render's final DOM delivery.
        let renderingApp, stop = false;
        class RenderingPage extends HtmlBuilder {
            static components = ['row'];
            setup() { this.setData('rows.r1.qty', 1); }
            main(root) { root.div().row({iterate: '^rows', id: 'blk'}); }
            row(root, {node_label}) {
                if (stop) renderingApp.dispose();
                root.div({datapath: `.${node_label}`}).span('^.qty');
            }
        }
        renderingApp = this.mount('rendering', undefined, RenderingPage);
        assert.equal(renderingApp.target.root.textContent, '1');
        stop = true;
        renderingApp.render();
        assert.equal(renderingApp.target.root.childNodes.length, 0, 'in-flight rendering cannot resurrect DOM');
    }
}
new Fixture()[process.argv[2]]();
