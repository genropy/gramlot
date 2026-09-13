import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Bag} from 'genro-bag-js';
import {defineGramlotIde} from '../src/collections/gramlot-ide.js';

test('each document has a border layout and independent editing controls',()=>{
 setupDom();defineGramlotIde();
 const ide=document.createElement('gnr-gramlotide');
 ide.sourceNode={absDatapath:()=> 'ide',handler:{application:{data:new Bag(),server:{cancel(){}},feedback:{busy(){}}}}};
 ide.setAttribute('content','original');document.body.append(ide);
 const tab=ide.parts.tabs.children[0],c=tab.controls;
 assert.ok(tab.querySelector('gnr-bordercontainer'));
 assert.equal(c.editor.hasAttribute('readonly'),true);assert.equal(c.save.hidden,true);
 c.toggle.click();assert.equal(c.editor.hasAttribute('readonly'),false);assert.equal(c.save.hidden,false);
 const first=ide.model.active;ide.model.document().setItem('content','changed');
 const second=ide.model.add('second.py','second');
 assert.equal(tab.controls.editor,c.editor);
 assert.equal(ide.parts.tabs.children[1].controls.editor.hasAttribute('readonly'),true);
 c.revert.click();assert.equal(ide.model.document(first).getItem('content'),'original');
 assert.equal(ide.model.document(second).getItem('content'),'second');
 ide.remove();
});

test('HTML documents expose a stack with sandboxed preview and shared rich-text content',()=>{
 setupDom();defineGramlotIde();
 const ide=document.createElement('gnr-gramlotide');
 ide.sourceNode={absDatapath:()=> 'ide',handler:{application:{data:new Bag(),server:{cancel(){}},feedback:{busy(){}}}}};
 document.body.append(ide);
 ide.model.add('page.html','<p>Hello</p>','html');
 const tab=ide.parts.tabs.children[0];
 assert.ok(tab.querySelector('gnr-stackcontainer'));
 assert.equal(tab.htmlViews.preview.getAttribute('sandbox'),'');
 const buttons=[...tab.querySelectorAll('button')];
 buttons.find(b=>b.textContent==='Preview').click();
 assert.equal(tab.htmlViews.preview.srcdoc,'<p>Hello</p>');
 tab.controls.toggle.click();
 tab.htmlViews.prose._value='<p>Changed</p>';
 tab.htmlViews.prose.dispatchEvent(new Event('change'));
 assert.equal(ide.model.document().getItem('content'),'<p>Changed</p>');
 tab.controls.revert.click();
 assert.equal(ide.model.document().getItem('content'),'<p>Hello</p>');
 ide.remove();
});
