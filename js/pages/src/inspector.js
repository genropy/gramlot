// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Mount a Python recipe and attach real page Bags without reparenting/copying. */
import {Application} from 'gramlot-dom';
import {Bag} from 'genro-bag-js';
import {GalleryBuilder} from './gallery.js';
import {DeveloperTools} from './dev.js';
import {Shortcuts} from './shortcuts.js';
import {InspectorEditor} from './inspector-editor.js';

export function mountInspector(host, source, page) {
    if (page._disposed || page.dev?.disposed) return null;
    page.dev ||= new DeveloperTools();
    page.dev.inspector?.dispose();
    const builder = new GalleryBuilder('inspector');
    builder.loadSource(source);
    const mount = document.createElement('div');
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('./inspector.css', import.meta.url).href;
    host.append(mount);
    const app = new Application(mount, builder);
    mount.append(stylesheet);
    const shortcuts = new Shortcuts(host.ownerDocument);
    const toggle = () => app.live(() => builder.data.setItem('opened', !builder.data.getItem('opened')));
    shortcuts.register('inspector.toggle', 'ctrl+shift+d', toggle, {allowEditing: true});
    const button = mount.querySelector('[data-inspector="toggle"]');
    button.addEventListener('click', toggle);
    const subscriptions = [];
    for (const kind of ['data', 'source']) {
        const bag = page.builder[kind];
        const tree = mount.querySelector(`[data-inspector="${kind}"]`);
        tree.storeBag = bag;
        const editor = new InspectorEditor(
            mount.querySelector(`[data-inspector="${kind}-editor"]`), bag, page);
        subscriptions.push(() => editor.dispose());
        const refresh = () => {
            const path = builder.data.getItem(kind + 'Path');
            editor.refresh(path);
            const node = path ? bag.getNode(path) : null;
            const value = node?.getValue();
            const seen = new WeakSet();
            const text = !node ? 'Select a node' : 'Path: ' + path + '\n' + JSON.stringify({
                value: value instanceof Bag ? '[Bag]' : value,
                attributes: node?.attr,
            }, (_key, item) => {
                if (item instanceof Bag) return '[Bag]';
                if (typeof item === 'bigint' || typeof item === 'function') return String(item);
                if (item && typeof item === 'object') {
                    if (seen.has(item)) return '[Circular reference]';
                    seen.add(item);
                }
                return item;
            }, 2);
            if (builder.data.getItem(kind + 'Detail') !== text) {
                app.live(() => builder.data.setItem(kind + 'Detail', text));
            }
        };
        const id = 'inspector-detail-' + kind;
        bag.subscribe(id, {any: refresh});
        subscriptions.push(() => bag.unsubscribe(id, {any: true}));
        refresh();
        builder.data.subscribe(id, {any: refresh});
        subscriptions.push(() => builder.data.unsubscribe(id, {any: true}));
    }
    let disposed = false;
    const tool = {app, shortcuts, dispose() {
        if (disposed) return;
        disposed = true;
        shortcuts.dispose();
        subscriptions.forEach(dispose => dispose());
        button.removeEventListener('click', toggle);
        app.dispose();
        mount.remove();
    }};
    page.dev.inspector = tool;
    return tool;
}
