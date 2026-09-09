import assert from 'node:assert/strict';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
setupDom();
const {Application} = await import('gramlot-dom');
const {GalleryBuilder} = await import('../js/pages/src/gallery.js');
class Page extends GalleryBuilder {
    main(root) {
        root.data('title', 'Hello');
        const pane = root.div({datapath:'nested'});
        pane.data('.title', 'Astra');
        pane.span('^.title');
    }
}
const host = document.createElement('div'); document.body.append(host);
const app = new Application(host, new Page('main'));
assert.equal(app.builder.data.getItem('title'), 'Hello');
assert.equal(host.querySelector('span').textContent, 'Astra');
assert.equal(host.querySelector('data'), null);
