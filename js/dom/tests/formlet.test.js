// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Application, HtmlBuilder} from '../src/index.js';
import {setupDom} from './dom.js';
import '../src/collections/layout.js';
import '../src/collections/inputs.js';

function mount(attrs={}) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['layout','inputs'];
        setup() { this.setData('draft.name','Alice');this.setData('columns',2); }
        main(root) {
            const fields=root.formlet({datapath:'draft',columns:'^columns',node_id:'fields',
                item_fld_font_size:'19px',fld_font_size:'17px',item_lbl_color:'red',lbl_color:'blue',
                item_box_c_padding:'3px',...attrs});
            fields.textBox({value:'^.name',lbl:'Name',node_id:'name',font_size:'15px'});
            fields.textBox({value:'^.other',lbl:'Other',node_id:'other'});
        }
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('main'));
    return {app,host};
}

test('formlet outside a form owns relative scope and shared defaults without rewriting fields', () => {
    const {app,host}=mount();
    const field=app.builder.nodeById('name');
    assert.equal(field.absDatapath('^.name'),'main.draft.name');
    assert.equal(field.getFormHandler(),null);
    const widgets=host.querySelectorAll('gnr-textbox');
    assert.equal(widgets[0].style.fontSize,'15px');
    assert.equal(widgets[1].style.fontSize,'17px');
    assert.equal(widgets[0].shadowRoot.querySelector('label').style.color,'blue');
    assert.equal(widgets[0].shadowRoot.querySelector('.labledBox_content').style.padding,'3px');
    assert.equal(Object.hasOwn(field.getAttr(),'lbl_color'),false);
    app.dispose();
});

test('changing columns and responsive width preserves the focused editor and data', () => {
    const {app,host}=mount();
    const container=host.querySelector('gnr-formlet');
    const grid=container.shadowRoot.querySelector('.fields');
    const widget=host.querySelector('gnr-textbox');
    const input=widget.shadowRoot.querySelector('input');
    input.focus();
    assert.equal(grid.style.gridTemplateColumns,'repeat(2, minmax(0, 1fr))');
    app.live(()=>app.data.setItem('main.columns',3));
    assert.equal(grid.style.gridTemplateColumns,'repeat(3, minmax(0, 1fr))');
    app.live(()=>app.builder.nodeById('fields').setAttr({col_min_width:'14em',gap:'8px 12px'}));
    assert.equal(grid.style.gridTemplateColumns,'repeat(auto-fit, minmax(min(100%, 14em), 1fr))');
    assert.equal(host.querySelector('gnr-formlet'),container);
    assert.equal(widget.shadowRoot.activeElement,input);
    assert.equal(input.value,'Alice');
    app.dispose();
});

test('formlet diagnoses unsupported defaults and invalid numeric columns', () => {
    assert.throws(()=>mount({columns:0}),/positive integer/);
    assert.throws(()=>mount({item_value:'^.name'}),/Unsupported formlet default/);
    assert.throws(()=>mount({wrap:true}),/not supported/);
});

test('reactive defaults resolve in the formlet scope and keep explicit child overrides', () => {
    const {app,host}=mount({fld_font_size:'^.size'});
    app.live(()=>app.data.setItem('main.draft.size','20px'));
    let fields=host.querySelectorAll('gnr-textbox');
    assert.equal(fields[0].style.fontSize,'15px');
    assert.equal(fields[1].style.fontSize,'20px');
    const input=fields[1].shadowRoot.querySelector('input');
    input.focus();
    app.live(()=>app.data.setItem('main.draft.size','22px'));
    fields=host.querySelectorAll('gnr-textbox');
    assert.equal(fields[1].style.fontSize,'22px');
    assert.equal(fields[1].shadowRoot.activeElement,input);
    app.dispose();
});

test('formlet position and decoration defaults reach fields and explicit boxes', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['layout','inputs'];
        setup() { this.setData('position','R'); this.setData('labelColor','purple'); }
        main(root) {
            const fields=root.formlet({lbl_position:'^position',lbl_color:'^labelColor',
                box_padding:'5px',node_id:'shared'});
            fields.textBox({lbl:'Inherited',node_id:'inherited'});
            fields.textBox({lbl:'Cleared',lbl_position:'',lbl_color:'',
                box_padding:'',node_id:'cleared'});
            fields.labledBox({label:'Explicit inherited',node_id:'explicit'}).textBox({value:'Draft'});
            const explicitCleared=fields.labledBox({label:'Explicit cleared',label_color:'',
                box_padding:'',node_id:'explicitCleared'});
            explicitCleared.setAttr({label_position:null},false,true,false);
            explicitCleared.div('content');
        }
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('shared-defaults'));
    const formlet=host.querySelector('gnr-formlet');
    const [inherited,cleared,explicit,explicitCleared]=formlet.children;
    const input=inherited.shadowRoot.querySelector('input');
    input.focus(); input.value='Uncommitted';
    assert.equal(inherited.shadowRoot.querySelector('.labledBox').style.flexDirection,'row-reverse');
    assert.equal(inherited.shadowRoot.querySelector('.labledBox').style.padding,'5px');
    assert.equal(inherited.shadowRoot.querySelector('label').style.color,'purple');
    assert.equal(cleared.shadowRoot.querySelector('.labledBox').style.flexDirection,'column');
    assert.equal(cleared.shadowRoot.querySelector('.labledBox').style.padding,'');
    assert.equal(cleared.shadowRoot.querySelector('.labledBox_label').style.color,'');
    assert.equal(explicit.getAttribute('label_position'),'R');
    assert.equal(explicit.shadowRoot.querySelector('.labledBox').style.flexDirection,'row-reverse');
    assert.equal(explicit.shadowRoot.querySelector('.labledBox').style.padding,'5px');
    assert.equal(explicit.shadowRoot.querySelector('.labledBox_label').style.color,'purple');
    assert.equal(explicitCleared.shadowRoot.querySelector('.labledBox').style.flexDirection,'column');
    assert.equal(explicitCleared.shadowRoot.querySelector('.labledBox').style.padding,'');
    assert.equal(explicitCleared.shadowRoot.querySelector('.labledBox_label').style.color,'');

    app.live(()=>{
        app.data.setItem('shared-defaults.position','TC');
        app.data.setItem('shared-defaults.labelColor','blue');
    });
    assert.equal(formlet.children[0],inherited);
    assert.equal(inherited.shadowRoot.activeElement,input);
    assert.equal(input.value,'Uncommitted');
    assert.equal(inherited.shadowRoot.querySelector('.labledBox').style.flexDirection,'column');
    assert.equal(inherited.shadowRoot.querySelector('label').style.textAlign,'center');
    assert.equal(inherited.shadowRoot.querySelector('label').style.color,'blue');
    assert.equal(explicit.getAttribute('label_position'),'TC');
    assert.equal(explicit.shadowRoot.querySelector('.labledBox').style.flexDirection,'column');
    assert.equal(explicit.shadowRoot.querySelector('.labledBox_label').style.textAlign,'center');
    assert.equal(explicit.shadowRoot.querySelector('.labledBox_label').style.color,'blue');
    assert.equal(cleared.shadowRoot.querySelector('.labledBox').style.flexDirection,'column');
    assert.equal(explicitCleared.shadowRoot.querySelector('.labledBox').style.flexDirection,'column');
    app.dispose();
});
