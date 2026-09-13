import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {checkboxOptions,checkboxCaption,selectionCodes} from '../src/collections/checkbox-text.js';
import {setupDom} from './dom.js';
import {Application,HtmlBuilder} from '../src/index.js';
import '../src/collections/inputs.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('checkBoxText option projection and unknown codes',()=>{
    const options=checkboxOptions('01:Lamp: warm,revenue:Revenue');
    assert.equal(checkboxCaption('01,revenue',options),'Lamp: warm,Revenue');
    assert.equal(checkboxCaption('missing,01',options),'missing,Lamp: warm');
    assert.equal(checkboxCaption(null,options),null);
    assert.deepEqual(selectionCodes('01,01, revenue'),['01','revenue']);
    assert.throws(()=>checkboxOptions('a:A,a:B'),/Duplicate/);
    const bag=new Bag(),row=new Bag();row.setItem('id','01');row.setItem('text','Lamp');bag.setItem('r',row);
    assert.deepEqual(checkboxOptions(bag,'id','text'),[{code:'01',label:'Lamp'}]);
});
function fixture() {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['inputs'];
        main(root) {
            root.checkBoxText({value:'^selection',values:'^options',identifier:'code',labelAttribute:'caption',popup:true});
            root.checkBoxText({value:'^selection',values:'^options',identifier:'code',labelAttribute:'caption'});
        }
    }
    const builder=new Page('main');
    builder.setup=data=>{
        const options=new Bag();options.setItem('a',null,{code:'cost',caption:'Cost'});options.setItem('b',null,{code:'revenue',caption:'Revenue'});
        data.setItem('options',options);data.setItem('selection',null);
    };
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,builder,{inspector:false});
    return {app,host,widget:host.querySelector('gnr-checkboxtext')};
}
test('bound controls share accepted value and caption; Bag replacement and cleanup',async()=>{
    const {app,host,widget}=fixture();await tick();
    const box=widget.shadowRoot.querySelector('[data-code=cost]');
    box.checked=true;box.dispatchEvent(new window.Event('change',{bubbles:true}));await tick();
    assert.equal(app.data.getItem('main.selection'),'cost');
    assert.equal(app.data.getNode('main.selection').attr._displayedValue,'Cost');
    assert.equal(host.querySelectorAll('gnr-checkboxtext')[1].shadowRoot.querySelector('[data-code=cost]').checked,true);
    app.live(()=>app.data.setItem('main.selection','cost,revenue'));await tick();
    assert.equal(widget.value,'cost,revenue');
    const old=app.data.getItem('main.options');
    old.getNode('a').setAttr({caption:'New cost'});await tick();
    assert.equal(app.data.getNode('main.selection').attr._displayedValue,'New cost,Revenue');
    const fresh=new Bag();fresh.setItem('b',null,{code:'revenue',caption:'Sales'});
    app.live(()=>app.data.setItem('main.options',fresh));await tick();
    assert.equal(host.querySelector('gnr-checkboxtext'),widget);
    assert.equal(app.data.getItem('main.selection'),'cost,revenue');
    assert.equal(widget._input.value,'cost,Sales');
    old.getNode('a').setAttr({caption:'Detached'});await tick();
    assert.equal(widget._input.value,'cost,Sales');
    app.dispose();assert.equal(widget._subscriptions.length,0);assert.equal(widget._controlTools.connected,false);
});

test('nested Bag option edits remain reactive and validation keeps committed metadata',async()=>{
    const {app,widget}=fixture();
    const options=new Bag(),row=new Bag();row.setItem('code','cost');row.setItem('caption','Nested cost');options.setItem('a',row);
    app.live(()=>{app.data.setItem('main.options',options);app.data.setItem('main.selection','cost');});await tick();
    row.setItem('caption','Updated nested cost');await tick();
    assert.equal(widget._input.value,'Updated nested cost');
    app.live(()=>widget.sourceNode.setAttr({validate_notnull:true}));await tick();
    const box=widget.shadowRoot.querySelector('input[type=checkbox]');
    box.checked=false;box.dispatchEvent(new window.Event('change',{bubbles:true}));await tick();
    assert.equal(app.data.getItem('main.selection'),'cost');
    assert.equal(app.data.getNode('main.selection').attr._displayedValue,'Updated nested cost');
    assert.equal(widget._formField.issues[0].severity,'error');
    app.dispose();
});
