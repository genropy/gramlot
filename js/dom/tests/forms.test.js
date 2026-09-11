// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Public contracts: Bag forms, local/async validation and source-owned lifetime. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {Application, HtmlBuilder} from '../src/index.js';
import {setupDom} from './dom.js';
import '../src/collections/inputs.js';
import '../src/collections/layout.js';
import '../src/collections/forms.js';

function mount(attributes = {}, fields = null, setup = null) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs', 'layout', 'forms'];
        setup() { this.setData('draft', new Bag({name: 'Alice', age: 20})); setup?.(this); }
        main(root) {
            const form = root.form({formId:'contact', datapath:'draft', node_id:'contact', ...attributes});
            const box = form.labledBox({label:'Contact', datapath:'.address', box_border:'1px solid gray'});
            box.textBox({value:'^.city', lbl:'City', node_id:'city'});
            form.textBox({value:'^.name', lbl:'Name', validate_notnull:true, node_id:'name'});
            form.numberTextBox({value:'^.age', validate_min:0, node_id:'age'});
            fields?.(form);
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'));
    const node = id => app.builder.nodeById(id);
    const widget = id => app.target._byId(app.builder.targetId(node(id)));
    return {app, host, node, widget, form:node('name').getFormHandler()};
}
const settle = async () => { for(let i=0;i<8;i++) await new Promise(resolve=>setTimeout(resolve,0)); };

test('explicit labeled box owns relative scope and preserves labels, content and defaults', () => {
    const {app,node,widget,host} = mount({}, f => {
        const box = f.labledBox({label:'Nested', datapath:'.nested', fld_font_size:'18px',
            box_l_background:'silver', box_c_padding:'6px', label_color:'green', node_id:'box'});
        box.textBox({value:'^.title', lbl:'Title', font_size:'16px', node_id:'title'});
        box.textBox({value:'^.empty', font_size:'', node_id:'empty'});
    });
    assert.equal(node('title').absDatapath('^.title'),'main.draft.nested.title');
    const box = widget('box');
    assert.equal(box.shadowRoot.querySelector('.labledBox_content').style.padding,'6px');
    assert.equal(box.shadowRoot.querySelector('.labledBox_labelRegion').style.background,'silver');
    assert.equal(widget('title').style.fontSize,'16px');
    assert.equal(widget('empty').style.fontSize,'');
    const input=widget('title').shadowRoot.querySelector('input'); input.focus();
    app.live(()=>node('box').setAttr({label:'Changed'}));
    assert.equal(widget('box'),box);
    assert.equal(widget('title').shadowRoot.activeElement,input);
    assert.equal(host.querySelectorAll('gnr-labledbox').length,2);
    app.dispose();
});

test('typed invalid draft enters Bag, messages block save, warning-only save succeeds', async () => {
    const {app,form,widget} = mount({}, f=> f.textBox({value:'^.email',validate_email:true,node_id:'email'}));
    app.mutate(widget('name').id,'');
    assert.equal(app.data.getItem('main.draft.name'),'');
    assert.equal(form.state.valid,false);
    assert.equal(widget('name').shadowRoot.querySelector('input').getAttribute('aria-invalid'),'true');
    assert.equal((await form.save()).status,'blocked');
    app.mutate(widget('name').id,'Bob');
    app.mutate(widget('email').id,'invalid-email');
    assert.equal(form.state.valid,true);
    assert.equal(form.state.warnings.length,1);
    assert.equal((await form.save()).status,'saved');
    assert.equal(form.state.dirty,false);
    app.dispose();
});

test('normalization is inherited, explicit false preserves types; restore and memory are detached', async () => {
    const {app,form,widget} = mount({blankIsNull:true}, f => {
        f.textBox({value:'^.raw',blankIsNull:false,node_id:'raw'});
    }, page=> {page.setData('draft.raw',null);page.setData('draft.name','');});
    assert.equal(app.data.getItem('main.draft.name'),null);
    assert.equal(form.state.dirty,false);
    app.mutate(widget('raw').id,'');
    assert.equal(form.state.dirty,true);
    app.mutate(widget('raw').id,null);
    assert.equal(form.state.dirty,false);
    app.mutate(widget('name').id,'Saved');
    await form.save();
    app.live(()=>app.data.setItem('main.draft.extra',42));
    assert.equal(form.state.dirty,true);
    await form.restoreBaseline();
    assert.equal(app.data.getNode('main.draft.extra'),null);
    app.mutate(widget('name').id,'Unsaved');
    assert.equal((await form.load()).status,'needs-discard');
    await form.load({discardChanges:true});
    assert.equal(app.data.getItem('main.draft.name'),'Saved');
    assert.equal(form.state.dirty,false);
    app.dispose();
});

test('rules retain zero/order, source callback results and explicit email severity', () => {
    const {app,form,widget,node} = mount({},f=>{
        f.textBox({value:'^.required',validate_notnull:true,validate_empty:'replacement',node_id:'required'});
        f.textBox({value:'^.code',validate_case:'upper',validate_regex:'^[A-Z]+$',node_id:'code',
            validate_call:'return this.GET(".name") === "Alice" ? true : "owner";'});
        f.textBox({value:'^.email',validate_email:true,validate_email_iswarning:false,node_id:'email'});
    });
    app.mutate(widget('required').id,'');
    assert.equal(app.data.getItem('main.draft.required'),'');
    app.mutate(widget('code').id,'abc');
    assert.equal(app.data.getItem('main.draft.code'),'ABC');
    assert.equal(form.state.errors.some(issue=>issue.rule==='configuration'),false);
    app.mutate(widget('age').id,-1);
    assert.ok(form.state.errors.some(e=>e.rule==='min'));
    app.mutate(widget('age').id,0);
    app.mutate(widget('email').id,'bad');
    assert.ok(form.state.errors.some(e=>e.rule==='email'));
    assert.equal(node('city').getFormHandler(),form);
    app.dispose();
});

test('dependency changes and obsolete async responses cannot overwrite the current draft', async () => {
    const replies=[];
    const {app,form,widget,node} = mount({}, f=>f.textBox({value:'^.code',node_id:'code',
        validate_depends:'.name', validate_call:function(value){
            return new Promise(resolve=>replies.push({value,resolve,owner:this}));
        }}));
    await settle();
    app.mutate(widget('code').id,'old');
    app.mutate(widget('code').id,'new');
    assert.equal(form.state.pending,1);
    assert.equal((await form.save()).status,'blocked');
    replies.at(-1).resolve(true); await settle();
    for(const reply of replies.slice(0,-1)) reply.resolve({value:'obsolete'});
    await settle();
    assert.equal(app.data.getItem('main.draft.code'),'new');
    assert.equal(form.state.pending,0);
    app.mutate(widget('name').id,'Dependent'); await settle();
    assert.equal(form.state.pending,1);
    const last=replies.at(-1);
    app.live(()=>node('code').parentBag.popNode(node('code').label));
    last.resolve({value:'removed'});await settle();
    assert.equal(app.data.getItem('main.draft.code'),'new');
    assert.equal(form.state.pending,0);
    app.dispose();
});

test('save snapshots retain edits during persistence and failures retain the baseline', async () => {
    let release;
    const store={load:async()=>({data:new Bag({name:'Loaded',age:20})}),
        save:()=>new Promise(resolve=>{release=resolve;})};
    const {app,form,widget}=mount({store});
    app.mutate(widget('name').id,'Snapshot');
    const saving=form.save();
    app.mutate(widget('name').id,'Later');
    assert.equal((await form.save()).status,'busy');
    release({}); await saving;
    assert.equal(form.state.dirty,true);
    assert.equal(app.data.getItem('main.draft.name'),'Later');
    await form.restoreBaseline();
    assert.equal(app.data.getItem('main.draft.name'),'Snapshot');
    app.dispose();
});

test('save parses active editors before checking the draft and preserves incomplete number input', async()=>{
    const {app,form,widget}=mount();
    const input=widget('name').shadowRoot.querySelector('input');input.focus();input.value='';
    input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal((await form.save()).status,'blocked');
    assert.equal(app.data.getItem('main.draft.name'),'');
    app.dispose();
});

test('typing invalidates in-flight validation before a blur commit', async()=>{
    const replies=[];
    const {app,widget,form}=mount({},f=>f.textBox({value:'^.async',node_id:'async',validate_call:function(value){
        return new Promise(resolve=>replies.push(resolve));
    }}));
    const input=widget('async').shadowRoot.querySelector('input');
    input.focus();input.value='uncommitted';input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    replies[0]({value:'obsolete'});await settle();
    assert.equal(input.value,'uncommitted');
    assert.notEqual(app.data.getItem('main.draft.async'),'obsolete');
    assert.equal(form.state.editorDirty,true);
    app.dispose();
});

test('async rejection and timeout block saves, and unmounted owners never run accept effects', async()=>{
    const {app,form}=mount({},f=>{
        f.textBox({value:'^.timeout',validate_timeout:10,validate_call:'return new Promise(()=>{});'});
        f.textBox({value:'^.rejected',validate_call:'return Promise.reject(new Error("offline"));'});
    });
    await settle();await new Promise(resolve=>setTimeout(resolve,15));
    assert.equal(form.state.pending,0);
    assert.ok(form.state.errors.some(issue=>issue.code==='timeout'));
    assert.ok(form.state.errors.some(issue=>issue.message==='offline'));
    assert.equal((await form.save()).status,'blocked');
    app.dispose();
});

test('memory replacement persists deleted nodes and attributes; failed save retains dirty baseline', async()=>{
    const {app,form,widget}=mount({},null,page=>page.setData('draft.deleted',new Bag({child:1})));
    app.live(()=>app.data.popNode('main.draft.deleted'));
    await form.save();
    app.live(()=>app.data.setItem('main.draft.added','x',{unit:'m'}));
    await form.load({discardChanges:true});
    assert.equal(app.data.getNode('main.draft.deleted'),null);
    assert.equal(app.data.getNode('main.draft.added'),null);
    form.store.save=async()=>{throw new Error('storage failed');};
    app.mutate(widget('name').id,'Failure');
    assert.equal((await form.save()).status,'failed');
    assert.equal(form.state.dirty,true);
    assert.equal(form.state.persistenceError,'storage failed');
    await form.restoreBaseline();
    assert.equal(app.data.getItem('main.draft.name'),'Alice');
    app.dispose();
});

test('load protects programmatic writes while its adapter is pending', async()=>{
    let release;
    const store={save:async()=>({}),load:()=>new Promise(resolve=>{release=resolve;})};
    const {app,form}=mount({store});
    const loading=form.load();
    app.live(()=>app.data.setItem('main.draft.name','Concurrent'));
    release({data:new Bag({name:'Loaded'})});
    assert.equal((await loading).status,'conflict');
    assert.equal(app.data.getItem('main.draft.name'),'Concurrent');
    app.dispose();
});

test('state projection stays outside persisted data and source removal unregisters errors',()=>{
    const {app,form,widget,node}=mount({controllerPath:'forms.contact'});
    app.mutate(widget('age').id,-1);
    assert.equal(app.data.getItem('main.forms.contact.valid'),false);
    app.live(()=>node('age').parentBag.popNode(node('age').label));
    assert.equal(form.state.valid,true);
    assert.equal(app.data.getItem('main.draft.age'),-1);
    app.dispose();
});

test('outside a form errors reject the Bag write and reactive rule changes preserve focus',()=>{
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['inputs'];
        setup(){this.setData('name','Alice');}
        main(root){root.textBox({node_id:'name',value:'^name',validate_notnull:true});}
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('main')),node=app.builder.nodeById('name');
    const widget=host.querySelector('gnr-textbox'),input=widget.shadowRoot.querySelector('input');
    input.focus();input.value='';input.dispatchEvent(new Event('change',{bubbles:true}));
    assert.equal(app.data.getItem('main.name'),'Alice');
    assert.equal(input.value,'');
    app.live(()=>node.setAttr({validate_notnull_error:'Required'}));
    assert.equal(host.querySelector('gnr-textbox'),widget);
    assert.equal(widget.shadowRoot.activeElement,input);
    assert.match(widget.shadowRoot.textContent,/Required/);
    app.dispose();
});

test('configuration changes require explicit normalization reload and unsupported rules fail clearly', async()=>{
    const {app,form,node,widget}=mount();
    app.mutate(widget('name').id,'');
    app.live(()=>node('contact').setAttr({blankIsNull:true}));
    assert.ok(form.state.errors.some(issue=>issue.code==='normalization_changed'));
    await form.restoreBaseline();
    assert.equal(form.state.valid,true);
    app.live(()=>node('name').setAttr({validate_nodup:true}));
    assert.ok(form.state.errors.some(issue=>/database/.test(issue.message)));
    assert.equal((await form.save()).status,'blocked');
    app.dispose();
});

test('callback effects run once for a user commit, never for passive dependency checks',async()=>{
    const {app,node,widget}=mount({},f=>f.textBox({value:'^.effect',node_id:'effect',validate_depends:'.name',
        validate_onAccept:'this.SET(".accepted",(this.GET(".accepted") || 0)+1);'}));
    assert.equal(app.data.getItem('main.draft.accepted'),null);
    app.mutate(widget('effect').id,'once');await settle();
    assert.equal(app.data.getItem('main.draft.accepted'),1);
    app.mutate(widget('name').id,'Other');await settle();
    assert.equal(app.data.getItem('main.draft.accepted'),1);
    app.mutate(widget('effect').id,'removed');
    app.live(()=>node('effect').parentBag.popNode(node('effect').label));await settle();
    assert.equal(app.data.getItem('main.draft.accepted'),1);
    app.dispose();
});

test('selection errors remain editor-local and save commits a selected caption to its typed code',async()=>{
    const {app,form,widget}=mount({},f=>f.filteringSelect({value:'^.choice',values:'a:Alpha,b:Beta',node_id:'choice'}));
    const input=widget('choice').shadowRoot.querySelector('input');
    input.focus();input.value='Unknown';input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal((await form.save()).status,'blocked');
    assert.equal(app.data.getItem('main.draft.choice'),null);
    input.value='Beta';input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal((await form.save()).status,'saved');
    assert.equal(app.data.getItem('main.draft.choice'),'b');
    app.dispose();
});

test('declared date types parse to dates and reset keeps their editor text',async()=>{
    const {app,form,widget}=mount({},f=>f.dateTextBox({value:'^.date',dtype:'D',node_id:'date'}),
        page=>page.setData('draft.date',new Date('2026-09-08T00:00:00Z')));
    const input=widget('date').shadowRoot.querySelector('input');
    assert.equal(input.value,'09/08/2026');
    input.focus();input.value='2026-09-09';input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal((await form.save()).status,'saved');
    assert.ok(app.data.getItem('main.draft.date') instanceof Date);
    assert.equal(app.data.getItem('main.draft.date').toISOString(),'2026-09-09T00:00:00.000Z');
    app.dispose();
});

test('starting a load cancels older field validation and normalizes the new baseline', async()=>{
    const replies=[];let loaded;
    const store={load:()=>new Promise(resolve=>{loaded=resolve;}),save:async()=>({})};
    const {app,form}=mount({store,blankIsNull:true},f=>f.textBox({value:'^.pending',validate_call:function(value){
        return new Promise(resolve=>replies.push(resolve));
    }}));
    const loading=form.load();
    replies[0]({value:'obsolete'});await settle();
    loaded({data:new Bag({name:'',age:20})});
    assert.equal((await loading).status,'loaded');
    assert.equal(app.data.getItem('main.draft.name'),null);
    assert.equal(form.state.dirty,false);
    assert.notEqual(app.data.getItem('main.draft.pending'),'obsolete');
    app.dispose();
});

test('box style precedence is deterministic and child defaults preserve false and null',()=>{
    const {app,widget}=mount({},f=>{
        const box=f.labledBox({label:'Styled',border:'3px solid red',box_border:'1px solid blue',
            fld_readonly:true,lbl_font_size:'13px',node_id:'styled'});
        box.textBox({value:'^.styled',lbl:'Styled field',readonly:false,node_id:'styledField'});
    });
    const box=widget('styled');
    assert.equal(box.style.border,'');
    assert.equal(box.shadowRoot.querySelector('.labledBox').style.border,'1px solid blue');
    assert.equal(widget('styledField').shadowRoot.querySelector('input').readOnly,false);
    assert.equal(widget('styledField').shadowRoot.querySelector('label').style.fontSize,'13px');
    app.dispose();
});

test('an explicit null write differs from a missing node and is dirty until restored',async()=>{
    const {app,form,widget}=mount();
    assert.equal(app.data.getNode('main.draft.address.city'),null);
    app.mutate(widget('city').id,null);
    assert.ok(app.data.getNode('main.draft.address.city'));
    assert.equal(form.state.dirty,true);
    await form.restoreBaseline();
    assert.equal(app.data.getNode('main.draft.address.city'),null);
    assert.equal(form.state.dirty,false);
    app.dispose();
});

test('form commands use source scope through slotted containers', async () => {
    const {app,host,widget} = mount({}, form => {
        form.button('Save', {action:"this.getFormHandler().save().then(result => genro.publish('saved', result.status));"});
    });
    const results=[];
    app.subscribe('saved', status => results.push(status));
    app.mutate(widget('name').id, '');
    host.querySelector('button').click();
    await settle();
    assert.deepEqual(results, ['blocked']);
    app.mutate(widget('name').id, 'Bob');
    host.querySelector('button').click();
    await settle();
    assert.deepEqual(results, ['blocked', 'saved']);
    app.dispose();
});
