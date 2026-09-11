import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application} from '../src/application.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';

test('CSS declarations update and disappear with their source branch', () => {
    class Page extends HtmlBuilder {
        main(root) {
            root.div({node_id:'resources'}).styleSheet({cssText:'^sheet', cssTitle:'page'});
            root.css('.sample', 'color: red');
            root.css('.complete {padding: 2px}');
            root.styleSheet({href:'^url'});
        }
    }
    verifyResources(new Page('main'));
});

export function verifyResources(builder) {
    setupDom();
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, builder);
    app.live(() => {app.data.setItem('main.sheet','.sample {color: blue}');app.data.setItem('main.url','/one.css');});
    assert.equal(host.querySelector('[data-css-title="page"]').textContent,'.sample {color: blue}');
    assert.ok([...host.querySelectorAll('style')].some(n=>n.textContent==='.sample {color: red}'));
    assert.equal(host.querySelector('link').getAttribute('href'),'/one.css');
    app.live(()=>app.data.setItem('main.sheet','.sample {color: green}'));
    assert.equal(host.querySelectorAll('[data-css-title="page"]').length,1);
    assert.equal(host.querySelector('[data-css-title="page"]').textContent,'.sample {color: green}');
    app.live(()=>app.data.setItem('main.url',null));
    assert.equal(host.querySelector('link'),null);
    const owner=app.builder.nodeById('resources');
    app.live(()=>owner.parentBag.popNode(owner.label));
    assert.equal(host.querySelector('[data-css-title="page"]'),null);
    app.dispose();
}
