// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {PageApplication} from './application.js';
import {fromTytx} from 'genro-tytx';
import {highlightRecipes} from './recipe-highlight.js';
import {mountInspector} from './inspector.js';
const startup = fromTytx(document.getElementById('page-startup').textContent, 'json');
const hosts = startup.getItem('hosts');
let generation = 0;

export async function renderPage(transport) {
    const ticket = ++generation;
    let app;
    const current = () => ticket === generation && !app?._disposed;
    try {
        const selected = startup.getItem('page');
        document.getElementById(hosts.getItem('inspection')).hidden = !startup.getItem('source_inspection');
        const root = document.getElementById(hosts.getItem('root'));
        const freshRoot = root.cloneNode(false);
        window.genro?.dispose();
        root.replaceWith(freshRoot);
        window.page = null;
        app = new PageApplication(freshRoot, startup);
        window.genro = app;
        document.getElementById(hosts.getItem('error')).hidden = true;
        if (app.pageId) await app.rpc.openChannel();
        if (!current()) return;
        const parameters = {transport};
        if (selected !== null) parameters.page = selected;
        // The unregistered standalone demo remains a direct HTTP consumer.
        const options = app.pageId ? {} : {httpMethod: 'GET'};
        const source = await app.rpc.remoteCall(startup.getItem('endpoints.main'), parameters, options);
        if (!current()) return;
        const client = startup.getItem('client_builder');
        const Builder = (await import(client.getItem('module')))[client.getItem('export')];
        if (!current()) return;
        const builder = new Builder('main');
        builder.loadSource(source);
        app.mountBuilder(builder);
        window.page = builder;
        const inspectorSource = await app.rpc.remoteCall(startup.getItem('endpoints.inspector'), {}, options);
        if (!current()) return;
        mountInspector(document.getElementById(hosts.getItem('tools')), inspectorSource, app);
        const setup = startup.getItem('client_setup');
        if (setup) {
            const mount = (await import(setup.getItem('module')))[setup.getItem('export')];
            if (!current()) return;
            await mount(freshRoot, app);
        }
        if (!current()) return;
        void highlightRecipes(freshRoot);
        document.getElementById(hosts.getItem('source')).textContent = builder.source.toXml({pretty: true});
    } catch (error) {
        // A failed mount also disposes the runtime; it is still a visible error.
        if (ticket !== generation || (app?._disposed && error.name === 'AbortError')) return;
        app?.dispose();
        const message = document.getElementById(hosts.getItem('error'));
        message.hidden = false;
        message.textContent = `Unable to load the page: ${error.message}`;
        console.error(error);
    }

}
await renderPage(startup.getItem('transport'));
for (const button of document.querySelectorAll('[data-transport]')) {
    button.addEventListener('click', async () => {
        await renderPage(button.dataset.transport);
        for (const link of document.querySelectorAll('#page-menu a')) {
            const url = new URL(link.href);
            url.searchParams.set('transport', button.dataset.transport);
            link.href = url.href;
        }
    });
}

document.getElementById(hosts.getItem('inspection')).addEventListener('toggle', () => {
    if (window.page) {
        document.getElementById(hosts.getItem('source')).textContent = window.page.source.toXml({pretty: true});
    }
});
