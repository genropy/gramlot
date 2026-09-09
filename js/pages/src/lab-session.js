// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Application} from 'gramlot-dom';
import {Bag} from 'genro-bag-js';
import {GalleryBuilder} from './gallery.js';

export const INITIAL_CODE = `data.setItem('demo.title', 'Hello Genro');
const pane = root.div({datapath: 'demo'});
pane.h2('^.title');
pane.textBox({value: '^.title', lbl: 'Title'});
pane.p('Edit the field and move focus: the title updates.');`;

export const CHANGE_CODE = `data.setItem('demo.title', 'Hello Astra');
root.p('This node was added to the SourceBag by JavaScript.');`;

class EmptyPage extends GalleryBuilder {
    main(root) {}
}

export class LabSession {
    constructor(host, onChange) {
        this.disposed = false;
        this.host = host;
        this.onChange = onChange;
        this.reset();
    }
    reset(code = INITIAL_CODE) {
        if (this.disposed) return;
        if (this.app) {
            this.app.builder.data.unsubscribe('lab-inspector', {any: true});
            this.app.builder.source.unsubscribe('lab-inspector', {any: true});
            this.app.dispose();
        }
        const target = document.createElement('div');
        this.host.replaceChildren(target);
        this.app = new Application(target, new EmptyPage('experiment'));
        this.app.builder.data.subscribe('lab-inspector', {any: () => this.onChange(this)});
        this.app.builder.source.subscribe('lab-inspector', {any: () => this.onChange(this)});
        this.run(code);
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.app.builder.data.unsubscribe('lab-inspector', {any: true});
        this.app.builder.source.unsubscribe('lab-inspector', {any: true});
        this.app.dispose();
    }
    run(code) {
        if (this.disposed) return;
        // Deliberate local developer console: code has normal browser privileges.
        const execute = new Function('root', 'data', 'source', 'builder', 'app', 'Bag', '"use strict";\n' + code);
        try {
            this.app.live(() => execute(this.app.root, this.app.builder.data,
                this.app.builder.source, this.app.builder, this.app, Bag));
        } finally {
            if (!this.disposed) this.onChange(this);
        }
    }
}
