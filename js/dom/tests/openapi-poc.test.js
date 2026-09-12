import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fromTytx} from 'genro-tytx';
import {HtmlBuilder} from '../src/index.js';
import '../src/collections/layout.js';
import '../src/collections/inputs.js';
import '../src/collections/storetree.js';
import '../src/collections/grid.js';
import {setupDom} from './dom.js';
import {Application} from '../src/application.js';
const folder=new URL('../../../docs/examples/gramlot-api-poc/',import.meta.url);
async function explorer() {
 const localPython=new URL('../../../.venv/bin/python',import.meta.url).pathname;
 execFileSync(process.env.GRAMLOT_PYTHON || (existsSync(localPython)?localPython:'python3'),[new URL('build.py',folder).pathname]);
 let editor=await readFile(new URL('../../../js/pages/src/codemirror-component.js',import.meta.url),'utf8');
 editor=editor.replace("'gramlot-dom'",JSON.stringify(new URL('../src/index.js',import.meta.url).href)).replace("'/_assets/dom/widget-label.js'",JSON.stringify(new URL('../src/collections/decoration/widget-label.js',import.meta.url).href));
 await import(`data:text/javascript;base64,${Buffer.from(editor).toString('base64')}`);
 class PythonBuilder extends HtmlBuilder {static wc_requires=['layout','inputs','storeTree','grid','labEditors'];}
 const builder=new PythonBuilder('api');
 builder.loadSource(fromTytx(await readFile(new URL('page.tytx',folder),'utf8'),'json'));
 return builder;
}
const tick=()=>new Promise(r=>setTimeout(r,10));
test('PoC uses Gramlot controllers, Bags, form bindings and resolver execution',async t=>{
 t.mock.method(console,'warn',()=>{});
 setupDom();const base=document.createElement('base');base.href='https://example.test/';document.head.append(base);
 const previousLocation=globalThis.location;globalThis.location={href:'https://example.test/'};t.after(()=>{globalThis.location=previousLocation;});
 const spec=await readFile(new URL('openapi.json',folder),'utf8');const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push({url:String(url),options});
  return new Response(String(url).includes('openapi')?spec:String(url).endsWith('.py')?'# Python source':JSON.stringify({total:98}),{headers:{'Content-Type':'application/json'}});
 });
 const builder=await explorer();const app=new Application(document.body,builder);t.after(()=>app.dispose());await tick();
 assert.equal(app.data.getItem('api.schemaState.state'),'ready');
 assert.ok(document.querySelector('gnr-storetree'));assert.ok(document.querySelector('gnr-bordercontainer'));
 const tree=app.data.getItem('api.navigation');let quote;
 for(const tag of tree.getNodes())for(const op of tag.getValue().getNodes())if(op.attr.path==='/api/quote')quote=`${tag.label}.${op.label}`;
 app.live(()=>app.data.setItem('api.selection',quote));await tick();
 assert.equal(app.data.getItem('api.fields').length,3);
 assert.ok(document.querySelector('gnr-numbertextbox'),'number input is a Gramlot widget');
 app.live(()=>app.data.setItem('api.send',1));await tick();
 assert.equal(app.data.getItem('api.formError'),'');
 const request=calls.find(c=>c.url.endsWith('/api/quote'));assert.ok(request);
 assert.deepEqual(JSON.parse(request.options.body),{productId:1,quantity:2});
 assert.equal(app.data.getItem('api.response.body.total'),98);
 assert.match(app.data.getItem('api.responseText'),/98/);
});
test('application contains no imperative UI or HTTP bypasses',async()=>{
 const code=await readFile(new URL('page.py',folder),'utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|addEventListener\s*\(|querySelector|createElement|innerHTML|FormData|replaceChildren/);
 assert.doesNotMatch(code,/document\./);
 assert.match(code,/root.openApiClient\(\)/);
 assert.match(code,/content.openApiForm\(/);
});
