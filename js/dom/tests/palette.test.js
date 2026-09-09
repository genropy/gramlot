import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/palette.js';

test('palette closes through its binding, retains content and supports keyboard geometry', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['palette'];
        setup() { this.setData('open', false); }
        main(root) { root.palette({title: 'Example', value: '^open'}).input({value: 'Retained'}); }
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = new Application(host, new Page('test'));
    let palette = host.querySelector('gnr-palette');
    assert.equal(palette.hidden, true);
    app.live(() => app.builder.data.setItem('open', true));
    palette = host.querySelector('gnr-palette');
    assert.equal(palette.hidden, false);
    const input = palette.querySelector('input');
    input.value = 'Changed';
    palette.shadowRoot.querySelector('.close').click();
    assert.equal(app.builder.data.getItem('open'), false);
    app.live(() => app.builder.data.setItem('open', true));
    palette = host.querySelector('gnr-palette');
    assert.equal(palette.querySelector('input').value, 'Changed');
    palette.adjust({left: 80, top: 90, width: 480, height: 320}, 20, 30, false);
    assert.equal(palette.style.left, '100px');
    assert.equal(palette.style.top, '120px');
    palette.adjust({left: 80, top: 90, width: 480, height: 320}, -1000, -1000, true);
    assert.equal(palette.style.width, '260px');
    assert.equal(palette.bar.tabIndex, -1);
    const left = palette.style.left;
    palette.bar.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    assert.equal(palette.style.left, left);
    palette.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    assert.equal(app.builder.data.getItem('open'), true);
    palette.setAttribute('keyboard', 'true');
    assert.equal(palette.bar.tabIndex, 0);
    palette.bar.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    assert.notEqual(palette.style.left, left);
    palette.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    assert.equal(app.builder.data.getItem('open'), false);
});
