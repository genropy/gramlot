import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from './dom.js';
import {richBody,richRegions,serializeRichDocument} from '../src/collections/html-editor.js';
function dom(){const d=setupDom();globalThis.DOMParser=d.window.DOMParser;globalThis.XMLSerializer=d.window.XMLSerializer;}
test('rich editing retains layout, classes, styles, comments and scripts outside the edited block',()=>{
 dom();const doc=richBody('<!doctype html><html lang="it"><head><style>.card{color:red}</style></head><body><main class="card"><!--keep--><h1 id="title">Title</h1><p class="lede">Hello <strong>world</strong></p><script>window.x=1</script></main></body></html>');
 const regions=richRegions(doc);assert.equal(regions.length,2);
 const head=doc.head.outerHTML;regions[1].innerHTML='Changed <em>text</em>';
 const result=serializeRichDocument(doc,true);
 assert.equal(doc.head.outerHTML,head);assert.match(result,/class="card"/);assert.match(result,/class="lede"/);assert.match(result,/<!--keep-->/);assert.match(result,/window.x=1/);assert.match(result,/Changed <em>text<\/em>/);
});
test('unsupported inline markup stays outside editable regions',()=>{
 dom();const doc=richBody('<p>Before <span class="special">special</span></p><p>Plain</p>');
 const regions=richRegions(doc);assert.deepEqual(regions.map(r=>r.textContent),['special','Plain']);
});
