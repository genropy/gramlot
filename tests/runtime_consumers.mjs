// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
setupDom();
const {fromTytx} = await import('genro-tytx');
const {Application} = await import('gramlot-dom');
const {PlaygroundBuilder} = await import('../js/pages/src/playground-page.js');
const {mountPlayground} = await import('../js/pages/src/playground.js');
const {mountInspector} = await import('../js/pages/src/inspector.js');
const payload = JSON.parse(readFileSync(0, 'utf8'));
const decode = value => fromTytx(payload.transport === 'msgpack'
    ? new Uint8Array(Buffer.from(value, 'base64')) : value, payload.transport);
class Checks {
    mount(host = document.createElement('div')) {
        if (!host.isConnected) document.body.append(host);
        const builder = new PlaygroundBuilder('main'); builder.loadSource(decode(payload.page));
        return new Application(host, builder);
    }
    async rebuild() {
        const page = this.mount();
        const tool = await mountPlayground(page.target.root, page);
        assert.equal(page.dev.playground, tool);
        for (let i = 0; i < 3; i++) {
            const old = tool.session.app;
            let calls = 0;
            old.subscribe('probe', () => calls++);
            tool.session.reset();
            old.publish('probe');
            assert.equal(calls, 0);
            const before = page.builder.data.getItem('dataXml');
            old.builder.data.setItem('demo.title', 'stale');
            assert.equal(page.builder.data.getItem('dataXml'), before);
            tool.session.run("data.setItem('demo.title', 'Current');");
            assert.match(page.builder.data.getItem('dataXml'), /Current/);
            assert.equal(page.target.root.querySelector('[data-lab="lab-preview"] h2').textContent, 'Current');
            page.live(() => page.builder.data.setItem('status', 'Alive'));
            assert.match(page.target.root.textContent, /Alive/);
        }
        const experiment = tool.session.app;
        page.dispose(); page.dispose();
        assert.equal(experiment._disposed, true);
        tool.session.reset();
        assert.equal(tool.session.app, experiment);
        assert.equal(page.target.root.childNodes.length, 0);
        // Cleanup must use original controls even when recipe output disappeared.
        const removed = this.mount();
        const removedTool = await mountPlayground(removed.target.root, removed);
        removed.target.root.replaceChildren();
        assert.doesNotThrow(() => removed.dispose());
        assert.equal(removedTool.session.app._disposed, true);
        assert.equal(removed.handler._disposed, true);
        // The old owner must not disconnect a new page using the same host.
        const oldPage = this.mount();
        const oldTool = await mountPlayground(oldPage.target.root, oldPage);
        const next = this.mount(oldPage.target.root);
        const nextTool = await mountPlayground(next.target.root, next);
        const priorExperiment = nextTool.session.app;
        oldPage.dispose(); oldPage.dispose();
        assert.equal(oldTool.session.app._disposed, true);
        next.target.root.querySelector('[data-lab="lab-rebuild"]').click();
        assert.equal(priorExperiment._disposed, true);
        assert.notEqual(nextTool.session.app, priorExperiment);
        assert.equal(nextTool.session.app._disposed, false);
        assert.equal(next.builder.data.getItem('status'), 'Example rebuilt from code.');
        next.dispose();
    }
    inspector() {
        const page = this.mount(), peer = this.mount();
        const host = document.createElement('div'); document.body.append(host);
        const old = mountInspector(host, decode(payload.inspector), page);
        assert.equal(page.dev.inspector, old);
        const replacement = mountInspector(host, decode(payload.inspector), page);
        old.dispose();
        assert.equal(host.querySelectorAll('[data-inspector="toggle"]').length, 1);
        document.dispatchEvent(new window.KeyboardEvent('keydown', {
            key: 'D', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true}));
        assert.equal(replacement.app.builder.data.getItem('opened'), true);
        assert.equal(old.app.builder.data.getItem('opened'), false);
        page.dispose();
        const retained = replacement.app.data.toXml();
        document.dispatchEvent(new window.KeyboardEvent('keydown', {
            key: 'D', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true}));
        page.builder.data.setItem('status', 'after disposal');
        assert.equal(replacement.app.data.toXml(), retained);
        assert.equal(host.childNodes.length, 0);
        peer.live(() => peer.builder.data.setItem('status', 'Peer alive'));
        assert.match(peer.target.root.textContent, /Peer alive/);
        assert.equal(mountInspector(host, decode(payload.inspector), page), null);
        peer.dispose();
    }
    async bootstrap() {
        document.open(); document.write(payload.html); document.close();
        // Bootstrap's inspector endpoint is JSON, independently of page transport.
        const response = value => ({ok: true, text: async () => value,
            arrayBuffer: async () => Uint8Array.from(Buffer.from(value, 'base64')).buffer});
        let pendingTools = null, delayTools = false;
        globalThis.fetch = async url => {
            if (url.startsWith('/main')) return response(payload.page);
            if (url.startsWith('/menu')) return {status: 404};
            if (delayTools) return new Promise(resolve => { pendingTools = resolve; });
            return response(payload.inspectorJson);
        };
        const {renderPage} = await import('../js/pages/src/bootstrap.js');
        const initial = window.genro;
        delayTools = true;
        const stale = renderPage(payload.transport);
        // Wait on observable arrival of the deferred tool request, not a timeout.
        while (!pendingTools) await new Promise(resolve => setImmediate(resolve));
        const abandoned = window.genro;
        assert.equal(initial._disposed, true);
        const finishStale = pendingTools;
        delayTools = false;
        await renderPage(payload.transport);
        const current = window.genro;
        assert.equal(abandoned._disposed, true);
        finishStale(response(payload.inspectorJson));
        await stale;
        assert.equal(window.genro, current);
        assert.equal(document.querySelectorAll('[data-inspector="toggle"]').length, 1);
        assert.equal(abandoned.dev, undefined);
        assert.equal(current.dev.playground.session.app._disposed, false);
        // Explicit disposal while waiting must also suppress late tool setup.
        delayTools = true; pendingTools = null;
        const closing = renderPage(payload.transport);
        while (!pendingTools) await new Promise(resolve => setImmediate(resolve));
        window.genro.dispose();
        pendingTools(response(payload.inspectorJson));
        await closing;
        assert.equal(document.getElementById('developer-tools').childNodes.length, 0);
        assert.equal(document.getElementById('root').childNodes.length, 0);
    }
}
await new Checks()[process.argv[2]]();
