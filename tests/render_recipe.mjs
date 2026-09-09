// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Behavioral bridge: input comes from the real ASGI /main response.
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const base = pathToFileURL(`${process.argv[2]}/`);
const {setupDom} = await import(new URL('gramlot-dom/tests/dom.js', base));
const {Application, HtmlBuilder, SourceBagNode} = await import(new URL('gramlot-dom/src/index.js', base));
const {fromTytx} = await import(new URL('genro-tytx/js/src/index.js', base));
setupDom();
const builder = new HtmlBuilder('main');
const transport = process.argv[3] || 'json';
builder.loadSource(fromTytx(transport === 'msgpack' ? readFileSync(0) : readFileSync(0, 'utf8'), transport));
const root = document.createElement('div');
const app = new Application(root, builder);
const node = builder.source.getNode('div_0.h1_0');
const field = root.querySelector('input[placeholder]');
field.value = 'Hello Astra';
field.dispatchEvent(new Event('input', {bubbles: true}));
if (app.data.getItem('main.title') === 'Hello Astra') {
    throw new Error('Default binding wrote before change/focus-out');
}
field.dispatchEvent(new Event('change', {bubbles: true}));
const echoNode = builder.nodeById('title_echo');
const echo = root.querySelector(`#${builder.targetId(echoNode)}`);
if (echo.textContent !== 'Hello Astra' || app.data.getItem('main.title') !== 'Hello Astra') {
    throw new Error('Typing did not update the shared title binding');
}
console.log(JSON.stringify({
    heading: root.querySelector('h1').textContent,
    order: [...root.firstElementChild.children].map(n => n.tagName),
    hidden: root.firstElementChild.hidden,
    readonly: root.querySelector('input').readOnly,
    tabindex: root.querySelector('input').tabIndex,
    sourceNode: node instanceof SourceBagNode,
    ownership: node.builder === builder && node.handler === app.handler,
}));
