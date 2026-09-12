// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {setupDom} from '../js/dom/tests/dom.js';

setupDom();
const manifestPath = process.argv[2];
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const base = new URL('./', pathToFileURL(manifestPath));
const load = specifier => import(new URL(manifest.entryPoints[specifier], base));
const dom = await load('gramlot-dom');
const {GramlotBuilder} = await load('gramlot-builder');
const dateParser = await load('gramlot-dom/date-parser');
const tytx = await load('genro-tytx');

assert.equal(Object.getPrototypeOf(GramlotBuilder.prototype), dom.HtmlBuilder.prototype,
    'public entries must share one HtmlBuilder class identity');
class DistributionBuilder extends GramlotBuilder {
    main(root) {
        root.data('liveMessage', 'Hello');
        root.h1('^liveMessage');
        root.textBox({value: '^liveMessage', lbl: 'Live', live: true});
        root.data('amount', 2);
        root.dataFormula({destination: 'double', formula: 'amount * 2', amount: '^amount',
            _on_start: true});
        root.p('^double');
    }
}
const builder = new DistributionBuilder('distribution');
const host = document.createElement('div');
document.body.append(host);
const application = new dom.Application(host, builder);
assert.equal(host.querySelector('h1').textContent, 'Hello');
assert.equal(host.querySelector('p').textContent, '4');
const input = host.querySelector('gnr-textbox').shadowRoot.querySelector('input');
input.value = 'Bundled';
input.dispatchEvent(new window.Event('input', {bubbles: true, composed: true}));
assert.equal(host.querySelector('h1').textContent, 'Bundled');
application.live(() => application.builder.data.setItem('amount', 3));
assert.equal(host.querySelector('p').textContent, '6');

const parsed = dateParser.parseDateExpression('today+1',
    {locale: 'en', workdate: '2026-09-11'});
assert.deepEqual(parsed, {ok: true, kind: 'date', date: '2026-09-12'});
const typed = tytx.fromTytx(tytx.toTytx(new Date('2026-09-11T00:00:00Z'), 'json'), 'json');
assert.equal(typed.toISOString(), '2026-09-11T00:00:00.000Z');
const {createInspector} = await import(new URL('esm/inspector-component.js', base));
assert.equal(typeof createInspector, 'function');
const originalFetch = globalThis.fetch;
globalThis.fetch = async resource => ({
    ok: true,
    text: async () => readFileSync(new URL(resource), 'utf8'),
});
const inspector = createInspector(application, 'floating');
host.append(inspector);
await inspector.initialize();
const inspectorRoot = inspector.shadowRoot;
assert.equal(inspectorRoot.querySelectorAll('gnr-storetree').length, 2,
    'the packaged recipe must materialize both Data and Source trees');
const [dataTree, sourceTree] = inspectorRoot.querySelectorAll('gnr-storetree');
assert.equal(dataTree.storeBag, application.builder.data);
assert.equal(sourceTree.storeBag, application.builder.source);
assert.ok(dataTree.shadowRoot.querySelector('.leaf'), 'Data tree must render live rows');
assert.ok(sourceTree.shadowRoot.querySelector('.leaf, details'), 'Source tree must render live rows');
assert.ok(inspectorRoot.querySelector('[data-inspector="data-editor"]'));
assert.ok(inspectorRoot.querySelector('[data-inspector="source-editor"]'));
inspector.opened = true;
assert.equal(inspector.opened, true);
assert.equal(dataTree.storeBag, application.builder.data);
assert.equal(sourceTree.storeBag, application.builder.source);
assert.ok(dataTree.shadowRoot.querySelector('.leaf'));
inspector.opened = false;
inspector.opened = true;
assert.ok(sourceTree.shadowRoot.querySelector('.leaf, details'));
inspector.dispose();
globalThis.fetch = originalFetch;
application.dispose();
