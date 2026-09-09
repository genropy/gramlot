// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {DeveloperTools} from './dev.js';
import {bagXmlView} from './bag-xml-view.js';
import {LabSession, INITIAL_CODE, CHANGE_CODE} from './lab-session.js';

export async function mountPlayground(host, ui) {
    if (ui._disposed || ui.dev?.disposed) return null;
    ui.dev ||= new DeveloperTools();
    ui.dev.playground?.dispose();
    const listeners = [];
    const listen = (element, type, callback) => {
        element.addEventListener(type, callback);
        listeners.push(() => element.removeEventListener(type, callback));
    };
    const builder = ui.builder;
    const node = id => host.querySelector('[data-lab="' + id + '"]');
    // Each mounted Application owns its input events, including nested previews.
    for (const type of ['input', 'change']) {
        listen(host, type, event => event.stopPropagation());
        listen(node('lab-preview'), type, event => event.stopPropagation());
    }
    const set = (path, value) => ui.live(() => builder.data.setItem(path, value));
    set('code', INITIAL_CODE);
    const session = new LabSession(node('lab-preview'), current => {
        ui.live(() => {
            builder.data.setItem('dataXml', bagXmlView(current.app.builder.data, 'data'));
            builder.data.setItem('sourceXml', bagXmlView(current.app.builder.source, 'source'));
        });
    });
    const rebuild = () => {
        try { session.reset(node('lab-code').value); set('status', 'Example rebuilt from code.'); }
        catch (error) { set('status', `${error.name}: ${error.message}`); }
    };
    listen(node('lab-rebuild'), 'click', rebuild);
    listen(node('lab-apply'), 'click', () => {
        try { session.run(node('lab-code').value); set('status', 'Code applied to the current Bags.'); }
        catch (error) { set('status', `${error.name}: ${error.message} (changes already applied are retained)`); }
    });
    listen(node('lab-example'), 'click', () => {
        set('code', CHANGE_CODE);
        set('status', 'Example loaded: click Apply to current example.');
    });
    listen(node('lab-reset'), 'click', () => {
        session.reset();
        set('code', INITIAL_CODE);
        set('status', 'Initial example restored.');
    });
    listen(node('lab-code'), 'focusout', event => {
        if (!builder.data.getItem('auto') || node('lab-code').contains(event.relatedTarget)) { return; }
        if (node('lab-toolbar').contains(event.relatedTarget)) { return; }
        rebuild();
    });
    let disposed = false;
    const tool = {ui, session, dispose() {
        if (disposed) return;
        disposed = true;
        listeners.forEach(remove => remove());
        session.dispose();
    }};
    ui.dev.playground = tool;
    return tool;
}
